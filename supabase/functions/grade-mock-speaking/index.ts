// ============================================================================
// SUPABASE EDGE FUNCTION: grade-mock-speaking (LOW-MEMORY STREAMING EDITION)
// Tối ưu RAM & CPU tuyệt đối cho Supabase Free Tier (256MB RAM / 2s CPU):
// - Upload file ghi âm trực tiếp lên Gemini Files API (dạng binary, KHÔNG encode
//   Base64 hàng chục MB trong RAM và KHÔNG quét cắt từng byte toàn file).
// - Chấm TỪNG PART độc lập (part_num: 1 | 2 | 3) và lưu dần vào review_json,
//   tự động tổng hợp điểm & mức đạt ngay khi đủ các Part có audio.
// - Giữ trọn bộ quy tắc sư phạm VSTEP (bỏ đuôi -s/-es/-ed chia động từ, bắt kỹ
//   final sound gốc, tính theo dạng lỗi, làm tròn 0.25, khoá 6 tiếng phía server).
// ============================================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const AUDIO_BUCKET = "mock-speaking-recordings";
const RELEASE_DELAY_HOURS = 8;
const MAX_SUBMISSIONS_PER_TEST_24H = 5;
const MAX_AUTO_RETRIES = 20;
const RETRY_COOLDOWN_MS = 90 * 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
  });
}

function normalizeStudentKey(name: string, classCode: string): string {
  const cleanName = String(name || "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const cleanClass = String(classCode || "")
    .normalize("NFC")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  return `${cleanName}__${cleanClass}`;
}

function toAsciiSlug(input: string, fallback = "student"): string {
  const slug = String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function pickAudioExtension(mimeType: string): string {
  const m = String(mimeType || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a")) return "mp4";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "webm";
}

function resolveAudioMimeFromMeta(contentType: string | null, audioPath: string): string {
  const lowerType = String(contentType || "").toLowerCase().split(";")[0].trim();
  const lowerPath = String(audioPath || "").toLowerCase();
  if (lowerPath.endsWith(".wav") || lowerType.includes("wav")) return "audio/wav";
  if (lowerPath.endsWith(".mp4") || lowerPath.endsWith(".m4a") || lowerType.includes("mp4") || lowerType.includes("m4a")) {
    return "audio/mp4";
  }
  if (lowerPath.endsWith(".ogg") || lowerType.includes("ogg")) return "audio/ogg";
  if (lowerPath.endsWith(".mp3") || lowerType.includes("mpeg") || lowerType.includes("mp3")) return "audio/mp3";
  if (lowerPath.endsWith(".flac") || lowerType.includes("flac")) return "audio/flac";
  return "audio/webm";
}

function sniffAudioMimeFromMagicBytes(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < 4) return null;
  // EBML / WebM / Matroska: 1A 45 DF A3
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "audio/webm";
  }
  // ISO BMFF / MP4 / M4A (Safari/iOS MediaRecorder thường xuất MP4 dù đặt đuôi .webm): "ftyp" ở byte 4..7
  if (
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "audio/mp4";
  }
  // Ogg / Ogg Opus: "OggS"
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return "audio/ogg";
  }
  // WAV: "RIFF" ... "WAVE"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return "audio/wav";
  }
  // FLAC: "fLaC"
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return "audio/flac";
  }
  // MP3: "ID3" hoặc frame sync 0xFF 0xE0
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  ) {
    return "audio/mp3";
  }
  return null;
}

function parseTotalSizeFromContentRange(contentRange: string | null): number | null {
  if (!contentRange) return null;
  const match = String(contentRange).match(/\/(\d+)\s*$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ============================================================================
// SCORING & GUARDRAILS (BƯỚC 0.25, LỌC LỖI CẤM, KHỬ TRÙNG LẶP)
// ============================================================================
function roundQuarterStep(score: number): number {
  if (!Number.isFinite(score)) return 0;
  const clamped = Math.max(0, Math.min(10, score));
  return Math.round(clamped * 4) / 4;
}

function scoreToBandLabel(score: number): string {
  const r = roundQuarterStep(score);
  if (r >= 9.0) return "Đạt C1";
  if (r >= 8.75) return "Xấp xỉ C1";
  if (r >= 6.0) return "Đạt B2";
  if (r >= 5.75) return "Xấp xỉ B2";
  if (r >= 4.0) return "Đạt B1";
  if (r >= 3.75) return "Xấp xỉ B1";
  return "Chưa đạt B1";
}

function stripNumericScores(text: string): string {
  return String(text || "")
    .replace(/[·\-–—]?\s*\(?\s*\d+([.,]\d+)?\s*\/\s*10\s*\)?/gi, "")
    .replace(/\(\s*\d+([.,]\d+)?\s*(?:điểm|đ|pts?)\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeLevelBandLabel(rawBand: string, rawAssess: string): string {
  const combined = `${rawBand || ""} ${rawAssess || ""}`.toLowerCase();
  if (/xấp xỉ\s*c1|gần\s*(đạt\s*)?(mức\s*)?c1|c1-/.test(combined)) return "Xấp xỉ C1";
  if (/đạt\s*(mức\s*)?c1|\bc1\b/.test(combined)) return "Đạt C1";
  if (/xấp xỉ\s*b2|gần\s*(đạt\s*)?(mức\s*)?b2|b1\+|b2-/.test(combined)) return "Xấp xỉ B2";
  if (/đạt\s*(mức\s*)?b2|\bb2\b/.test(combined)) return "Đạt B2";
  if (/chưa\s*đạt\s*(mức\s*)?b1|dưới\s*b1|\ba1\b|\ba2\b/.test(combined)) return "Chưa đạt B1";
  if (/xấp xỉ\s*b1|gần\s*(đạt\s*)?(mức\s*)?b1|b1-/.test(combined)) return "Xấp xỉ B1";
  if (/đạt\s*(mức\s*)?b1|\bb1\b/.test(combined)) return "Đạt B1";
  return "Xấp xỉ B1";
}

const PLURAL_DETERMINERS = new Set([
  "many", "two", "three", "four", "five", "some", "several", "few", "both",
  "these", "those", "all", "other", "different", "various", "lots", "lot"
]);

function isIgnoredVerbInflectionPronFix(word: string, issueVi: string): boolean {
  const wLower = String(word || "").trim().toLowerCase().replace(/[^a-z']/g, "");
  const issueLower = String(issueVi || "").toLowerCase();
  const mentionsVerbInflection =
    /(?:đuôi|âm cuối|phát âm thiếu|nuốt âm|quên)\s*(?:chữ\s*)?["']?-?(?:ed|es|s)["']?/.test(issueLower) &&
    /(?:chia động từ|động từ|quá khứ|ngôi thứ 3|chủ ngữ số ít|đuôi\s*["']?-?ed["']?|âm\s*["']?-?ed["']?)/.test(issueLower);
  if (mentionsVerbInflection) return true;
  if (
    wLower.endsWith("ed") &&
    /(?:đuôi\s*["']?-?ed["']?|thiếu\s*["']?-?ed["']?|âm\s*\/?[tdɪd]+\/?\s*cuối|chia\s*quá\s*khứ)/.test(issueLower)
  ) {
    return true;
  }
  return false;
}

function isIgnoredVerbInflectionFix(original: string, corrected: string, category: string, explanation: string): boolean {
  const expLower = String(explanation || "").toLowerCase();
  if (
    (expLower.includes("chia động từ") || expLower.includes("ngôi thứ 3") || expLower.includes("chủ ngữ số ít")) &&
    /(?:thêm|thiếu|quên|đuôi)\s*["']?-?(?:s|es|ed)["']?/.test(expLower)
  ) {
    return true;
  }
  if (!String(category || "").toLowerCase().includes("ngữ pháp")) return false;

  const cleanTokens = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);

  const origWords = cleanTokens(original);
  const corrWords = cleanTokens(corrected);
  if (origWords.length === 0 || origWords.length !== corrWords.length) return false;

  let diffIdx = -1;
  for (let i = 0; i < origWords.length; i++) {
    if (origWords[i] !== corrWords[i]) {
      if (diffIdx !== -1) return false;
      diffIdx = i;
    }
  }
  if (diffIdx === -1) return false;

  const wOrig = origWords[diffIdx];
  const wCorr = corrWords[diffIdx];
  const isAddingVerbS =
    wCorr === wOrig + "s" ||
    wCorr === wOrig + "es" ||
    (wOrig.endsWith("y") && wCorr === wOrig.slice(0, -1) + "ies");
  const isAddingVerbEd =
    wCorr === wOrig + "ed" ||
    wCorr === wOrig + "d" ||
    (wOrig.endsWith("y") && wCorr === wOrig.slice(0, -1) + "ied");

  if (isAddingVerbEd && /(?:phát âm|đuôi\s*["']?-?ed["']?|chia động từ)/.test(expLower)) return true;
  if (!isAddingVerbS) return false;

  const prevWord = diffIdx > 0 ? origWords[diffIdx - 1] : "";
  if (PLURAL_DETERMINERS.has(prevWord)) return false;

  const singularSubjects = new Set([
    "he", "she", "it", "this", "that", "which", "who", "everyone", "everybody",
    "someone", "somebody", "nobody", "nothing", "everything", "weather", "mother",
    "father", "mom", "dad", "friend", "brother", "sister", "teacher", "music", "travel", "travelling"
  ]);
  return singularSubjects.has(prevWord);
}

function escapeRawControlCharsInJsonStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else {
        out += ch;
      }
    } else {
      out += ch;
      if (ch === '"') inString = true;
    }
  }
  return out;
}

function stripTrailingCommasOutsideStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else if (ch === '"') {
      out += ch;
      inString = true;
    } else if (ch === ",") {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j++;
      if (j < input.length && (input[j] === "}" || input[j] === "]")) {
        continue; // Drop trailing comma before } or ]
      }
      out += ch;
    } else {
      out += ch;
    }
  }
  return out;
}

function extractOutermostJsonObject(text: string): string {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return text.slice(first, last + 1);
  }
  return text;
}

function parseModelJson(rawText: string) {
  const trimmed = String(rawText || "").trim();
  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!unfenced) {
    throw new Error("AI trả về phản hồi rỗng.");
  }

  // Lượt 1: Parse trực tiếp
  try {
    return JSON.parse(unfenced);
  } catch (_e1) {}

  // Lượt 2: Cắt đúng khối { ... } ngoài cùng + bỏ dấu phẩy thừa + escape ký tự xuống dòng thô trong chuỗi
  const extracted = extractOutermostJsonObject(unfenced);
  const repaired = stripTrailingCommasOutsideStrings(escapeRawControlCharsInJsonStrings(extracted));
  try {
    return JSON.parse(repaired);
  } catch (e2) {
    // Lượt 3: Sửa trường hợp thiếu ngoặc kép quanh key đơn giản (ví dụ: { word: "..." })
    const quotedKeys = repaired.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
    try {
      return JSON.parse(quotedKeys);
    } catch (_e3) {
      throw e2;
    }
  }
}

const PART_REVIEW_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    recognized_transcript: { type: "STRING" },
    internal_score: { type: "NUMBER" },
    level_assessment: { type: "STRING" },
    estimated_band: { type: "STRING" },
    overall_comment: { type: "STRING" },
    criteria: {
      type: "OBJECT",
      properties: {
        pronunciation_intonation: { type: "STRING" },
        grammar: { type: "STRING" },
        vocabulary_vietlish: { type: "STRING" },
        coherence_logic: { type: "STRING" }
      },
      required: ["pronunciation_intonation", "grammar", "vocabulary_vietlish", "coherence_logic"]
    },
    pronunciation_fixes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          ipa: { type: "STRING" },
          issue_vi: { type: "STRING" }
        },
        required: ["word", "ipa", "issue_vi"]
      }
    },
    language_corrections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "INTEGER" },
          original: { type: "STRING" },
          corrected: { type: "STRING" },
          category: { type: "STRING" },
          explanation_vi: { type: "STRING" }
        },
        required: ["original", "corrected", "category", "explanation_vi"]
      }
    },
    idea_expansions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          where_vi: { type: "STRING" },
          issue_vi: { type: "STRING" },
          suggested_en: { type: "STRING" },
          meaning_vi: { type: "STRING" }
        },
        required: ["where_vi", "issue_vi", "suggested_en", "meaning_vi"]
      }
    },
    natural_spoken_version: { type: "STRING" }
  },
  required: [
    "recognized_transcript",
    "internal_score",
    "level_assessment",
    "estimated_band",
    "overall_comment",
    "criteria",
    "pronunciation_fixes",
    "language_corrections",
    "idea_expansions",
    "natural_spoken_version"
  ]
};

// ============================================================================
// PROMPT BUILDER CHUYÊN BIỆT CHO TỪNG PART (PART 1 / PART 2 / PART 3)
// ============================================================================
function buildPartGradingPrompt(params: {
  partNum: 1 | 2 | 3;
  testTitle: string;
  promptText: string;
  verifiedTranscript: string;
  durationSec: number;
  targetLevel: string;
}) {
  const level = String(params.targetLevel || "B1").toUpperCase() === "B2" ? "B2" : "B1";
  const partNum = params.partNum;

  let partLabel = "";
  let structureGuide = "";
  let levelGuidance = "";

  if (partNum === 1) {
    partLabel = "VSTEP Speaking Part 1 (Social Interaction — 2 chủ đề, thường 6 câu hỏi ngắn trong tối đa 3 phút)";
    structureGuide =
      "Mỗi câu hỏi nên trả lời trực tiếp, rõ ý trong 2–3 câu theo mạch A-R-E (Answer + Reason → Example → Feeling/Result), tránh trả lời cộc lốc hoặc bỏ sót câu hỏi trong 2 chủ đề.";
    levelGuidance =
      level === "B2"
        ? `Mục tiêu Level B2 (Part 1): Trả lời trọn vẹn các câu hỏi trong 2 chủ đề tự nhiên, có từ nối văn nói (Honestly, Actually, I'd say, I tend to...), collocations tự nhiên và mệnh đề quan hệ (which/who/where). KHÔNG ép dùng từ C1/C2 học thuật cứng nhắc.`
        : `Mục tiêu Level B1 (Part 1): Chỉ cần trả lời rõ ý các câu hỏi bằng tiếng Anh giao tiếp đời thường, đúng ngữ pháp cơ bản, phát âm dễ nghe. KHÔNG ép dùng từ vựng phức tạp mức B2/C1.`;
  } else if (partNum === 2) {
    partLabel = "VSTEP Speaking Part 2 (Solution Discussion — chọn 1 trong 3 lựa chọn, tối đa 3 phút nói)";
    structureGuide =
      "Bố cục 3 phần: Mở bài (dẫn nhập tình huống & chọn 1 phương án) → Thân bài (nêu 2 lý do chọn có ví dụ + giải thích tại sao KHÔNG chọn 2 phương án còn lại) → Kết bài (khẳng định lại lựa chọn).";
    levelGuidance =
      level === "B2"
        ? `Mục tiêu Level B2 (Part 2): Trình bày mạch lạc đủ 3 phần (~170–220 từ), lập luận thuyết phục cả lý do chọn lẫn phản biện 2 lựa chọn còn lại, dùng collocations tự nhiên.`
        : `Mục tiêu Level B1 (Part 2): Trình bày đủ 3 phần (~120–165 từ) với 2 lý do chọn dễ hiểu và lý do bỏ 2 phương án còn lại. Nếu diễn đạt đơn giản nhưng rõ ý, đúng bố cục thì khen ngợi và giữ nguyên ý.`;
  } else {
    partLabel = "VSTEP Speaking Part 3 (Topic Development — phát triển chủ đề theo sơ đồ 3 ý gợi ý + ý riêng + trả lời câu hỏi mở rộng, tối đa 4 phút nói)";
    structureGuide =
      "Bố cục chuẩn Part 3: Mở bài (giới thiệu chủ đề & quan điểm) → Thân bài (triển khai 3 ý gợi ý trên sơ đồ có giải thích/ví dụ + bổ sung ít nhất 1 ý riêng [your own idea]) → Kết bài → Trả lời câu hỏi mở rộng (Follow-up questions).";
    levelGuidance =
      level === "B2"
        ? `Mục tiêu Level B2 (Part 3): Phát triển đầy đủ các nhánh sơ đồ và ý riêng (~200–280 từ) với dẫn chứng thuyết phục, chuyển ý tự nhiên và trả lời rõ các câu hỏi mở rộng.`
        : `Mục tiêu Level B1 (Part 3): Triển khai được các ý gợi ý chính trên sơ đồ (mỗi ý 1–2 câu giải thích/ví dụ đơn giản) kèm ý riêng và kết luận rõ ràng (~140–190 từ). Không ép từ vựng hàn lâm C1.`;
  }

  return `Bạn là giám khảo và giáo viên luyện thi VSTEP Speaking tận tâm, giàu kinh nghiệm dạy học viên Việt Nam.

THÔNG TIN BÀI THI THỬ:
- Đề thi: ${params.testTitle}
- Phần thi đang chấm: ${partLabel}
- Đề bài / Câu hỏi của phần này:
"""
${params.promptText || "(Không có văn bản đề bài — hãy nghe trực tiếp bài nói của thí sinh để chấm)"}
"""
- Trình độ mục tiêu học viên chọn: Level ${level}
- Thời lượng file ghi âm: ~${params.durationSec || 0} giây

BẢN CHÉP NGUYÊN VĂN LỜI NÓI THỰC TẾ ĐÃ NGHE TỪ FILE GHI ÂM (BẮT BUỘC BÁM SÁT 100%):
"""
${params.verifiedTranscript || "(Không nghe thấy lời nói tiếng Anh rõ ràng)"}
"""

ĐÃ ĐÍNH KÈM FILE GHI ÂM THẬT CỦA THÍ SINH:
- BẢN CHÉP NHÁP Ở TRÊN CÓ THỂ CÒN SÓT MỘT SỐ TỪ ở những đoạn học viên nói nhỏ, nói nhanh hoặc nghỉ lấy hơi. Hãy NGHE LẠI TOÀN BỘ FILE GHI ÂM từ 0:00 đến giây cuối cùng để kiểm tra và BỔ SUNG ĐẦY ĐỦ mọi từ/câu thực tế học viên đã nói (đặc biệt thay các chỗ "[...]" bằng đúng từ nghe được) vào trường "recognized_transcript" (chỉ thêm dấu chấm/phẩy tối thiểu cho dễ đọc, TUYỆT ĐỐI KHÔNG sửa lỗi ngữ pháp hay tự bịa thêm câu mà học viên không nói).
- TUYỆT ĐỐI KHÔNG tự bịa thêm câu nói hay ý tưởng mà thí sinh không nói! Mọi nhận xét, cụm trích dẫn "original" trong "language_corrections", và từ cần chỉnh trong "pronunciation_fixes" PHẢI xuất phát 100% từ bài nói thực tế của thí sinh trong file ghi âm.
- Nếu thí sinh nói lạc đề, nói tiếng Việt, nói quá ngắn hoặc chỉ nói vài câu rời rạc, hãy chấm THẲNG THẮN đúng thực tế.
- Nếu trong audio có vài chỗ quá nhỏ/nghẹt mic, hãy chấm bình thường dựa trên toàn bộ phần nghe được và nhắc nhẹ thí sinh nói to, rõ hơn trong mục Phát âm & Ngữ điệu (không tự đánh 0 điểm oan).
- Nghe kỹ file ghi âm để chấm trực tiếp PHÁT ÂM (độ rõ chữ, trọng âm từ, đặc biệt bắt lỗi mất final sound gốc /s/, /z/ như nice, house, place, office, because, always, relax, stress, bus, class, famous...) và NGỮ ĐIỆU (lên xuống giọng tự nhiên, nhấn content words, ngắt nghỉ hợp lý hay nói đều đều/ngập ngừng).

QUY TẮC ĐẶC BIỆT BẮT BUỘC PHẢI TUÂN THỦ:
- QUY TẮC 1 (BỎ QUA ĐUÔI CHIA ĐỘNG TỪ "-s", "-es", "-ed" — CHỈ BẮT FINAL SOUND CỐ HỮU CỦA TỪ):
  + BỎ QUA HOÀN TOÀN lỗi thiếu hoặc phát âm thiếu đuôi "-s", "-es", "-ed" khi chia động từ (như "it help", "he like", "worked", "visited", "makes"...). TUYỆT ĐỐI không trừ điểm, không đưa vào "language_corrections" hay "pronunciation_fixes".
  + VẪN BẮT KỸ lỗi nuốt âm cuối /s/, /z/ cố hữu của từ gốc (nice, house, place, because, always, relax, stress, class, famous, delicious...) hoặc danh từ số nhiều cần thiết.
- QUY TẮC 2 (TÍNH THEO DẠNG LỖI — KHÔNG CỘNG DỒN LẶP LỖI):
  + Nếu thí sinh sai cùng 1 từ phát âm 3 lần hoặc lặp cùng 1 dạng lỗi ngữ pháp/Vietlish nhiều lần, CHỈ TÍNH 1 LỖI DUY NHẤT và chỉ liệt kê 1 lần.
- QUY TẮC 3 (ĐIỂM NỘI BỘ BƯỚC 0.25 & QUY ĐỔI MỨC — KHÔNG VIẾT SỐ ĐIỂM TRONG NHẬN XÉT):
  + Tính điểm nội bộ thang 10 làm tròn bước 0.25 vào trường "internal_score":
    * 0.00 – 3.50 : "Chưa đạt B1"
    * 3.75        : "Xấp xỉ B1"
    * 4.00 – 5.50 : "Đạt B1"
    * 5.75        : "Xấp xỉ B2"
    * 6.00 – 8.50 : "Đạt B2"
    * 8.75        : "Xấp xỉ C1"
    * 9.00 – 10.00: "Đạt C1"
  + TUYỆT ĐỐI KHÔNG viết con số điểm (ví dụ 5.5/10, 6.25 điểm...) trong "overall_comment", "level_assessment" hay "criteria".

YÊU CẦU CHẤM CHI TIẾT CHO PART ${partNum}:
1. Bố cục & Độ hoàn thành yêu cầu đề: ${structureGuide}
2. Định hướng trình độ: ${levelGuidance}
3. "pronunciation_fixes": tối đa 4 TỪ KHÁC NHAU phát âm chưa chuẩn hoặc mất final sound gốc (mỗi từ chỉ 1 lần, kèm US IPA & mẹo đọc; không liệt kê đuôi chia động từ -s/-es/-ed). Nếu phát âm tốt trả về [].
4. "language_corrections": tối đa 6 mục sửa tiêu biểu. "original" trích NGUYÊN VĂN cụm 2–10 từ trong "recognized_transcript"; "category" chỉ nhận đúng 1 trong 3 nhãn: "Vietlish", "Từ vựng tự nhiên", hoặc "Ngữ pháp".
5. "idea_expansions": tối đa 3 mục chỉ rõ chỗ ý tưởng còn "cụt", thiếu phần nào kèm 1–2 câu tiếng Anh mẫu chuẩn Level ${level} và nghĩa tiếng Việt.
6. "natural_spoken_version": viết lại 1 bài nói mẫu hoàn chỉnh, tự nhiên ở chuẩn Level ${level} dựa trên CHÍNH Ý TƯỞNG GỐC của thí sinh.
7. Nếu file ghi âm im lặng / chỉ có tiếng ồn / không có tiếng Anh: đặt "internal_score": 0, "estimated_band": "Chưa đạt B1", nhắc nhẹ thí sinh kiểm tra micro và gợi ý cách trả lời.

TRẢ VỀ DUY NHẤT MỘT JSON HỢP LỆ (không bọc markdown):
{
  "recognized_transcript": "Lời nói tiếng Anh thực tế nghe được từ file âm thanh",
  "internal_score": 5.5,
  "level_assessment": "Nhận xét ngắn gọn 1 cụm về mức độ đáp ứng (không ghi điểm số)",
  "estimated_band": "Đạt B1",
  "overall_comment": "2-3 câu nhận xét tổng quan tiếng Việt (khen điểm tốt trước, chỉ rõ trọng tâm cần cải thiện; tuyệt đối không ghi điểm số).",
  "criteria": {
    "pronunciation_intonation": "Nhận xét độ dễ nghe, final sound gốc và ngữ điệu/nhịp nói",
    "grammar": "Nhận xét ngữ pháp & chia thì (bỏ qua lỗi quên -s/-es/-ed chia động từ)",
    "vocabulary_vietlish": "Nhận xét cách dùng từ tự nhiên và lỗi Vietlish nếu có",
    "coherence_logic": "Nhận xét bố cục, độ hoàn thành yêu cầu Part ${partNum} và mạch logic"
  },
  "pronunciation_fixes": [
    {
      "word": "từ cần chỉnh",
      "ipa": "/phiên âm US IPA/",
      "issue_vi": "Mô tả lỗi và mẹo đọc chuẩn"
    }
  ],
  "language_corrections": [
    {
      "id": 1,
      "original": "cụm nguyên văn trong transcript",
      "corrected": "cách nói tự nhiên chuẩn Level ${level}",
      "category": "Vietlish",
      "explanation_vi": "Giải thích ngắn gọn dễ hiểu"
    }
  ],
  "idea_expansions": [
    {
      "where_vi": "Vị trí ý tưởng còn cụt / thiếu",
      "issue_vi": "Hướng mở rộng sao cho logic & đủ ý",
      "suggested_en": "1-2 câu tiếng Anh mẫu chuẩn Level ${level}",
      "meaning_vi": "Nghĩa tiếng Việt"
    }
  ],
  "natural_spoken_version": "Phiên bản bài nói hoàn chỉnh tự nhiên giữ nguyên ý thí sinh ở Level ${level}"
}`;
}

interface SubmissionRow {
  id: string;
  student_key: string;
  student_name: string;
  class_code: string;
  test_id: number;
  test_title?: string;
  target_level?: string;
  prompt_part1?: string;
  prompt_part2?: string;
  prompt_part3?: string;
  audio_path_p1?: string;
  audio_path_p2?: string;
  audio_path_p3?: string;
  duration_p1?: number;
  duration_p2?: number;
  duration_p3?: number;
  status?: string;
  submitted_at?: string;
  release_at?: string;
  teacher_score?: string;
  teacher_feedback?: string;
  created_at?: string;
  updated_at?: string;
}

interface ReviewRow {
  id: string;
  submission_id: string;
  status?: string;
  release_at?: string;
  review_json?: Record<string, unknown> | null;
  error_message?: string;
  retry_count?: number;
  student_seen_at?: string | null;
  updated_at?: string;
}

function normalizePartReview(raw: Record<string, unknown>, partNum: 1 | 2 | 3) {
  const rawScore = Number(raw?.internal_score);
  const hasValidScore =
    Number.isFinite(rawScore) && raw?.internal_score !== "" && raw?.internal_score !== null && raw?.internal_score !== undefined;
  const roundedScore = hasValidScore ? roundQuarterStep(rawScore) : 0;
  const cleanBand = hasValidScore
    ? scoreToBandLabel(roundedScore)
    : normalizeLevelBandLabel(String(raw?.estimated_band || ""), String(raw?.level_assessment || ""));

  const seenPronWords = new Set<string>();
  const pronFixes = Array.isArray(raw?.pronunciation_fixes)
    ? raw.pronunciation_fixes
        .map((p: Record<string, unknown>) => ({
          word: String(p?.word || "").trim(),
          ipa: String(p?.ipa || "").trim(),
          issue_vi: String(p?.issue_vi || "").trim()
        }))
        .filter((p: { word: string; issue_vi: string }) => {
          if (!p.word || !p.issue_vi) return false;
          if (isIgnoredVerbInflectionPronFix(p.word, p.issue_vi)) return false;
          const k = p.word.toLowerCase().replace(/[^a-z0-9']/g, "");
          if (!k || seenPronWords.has(k)) return false;
          seenPronWords.add(k);
          return true;
        })
        .slice(0, 4)
    : [];

  const seenLangKeys = new Set<string>();
  const langCorrections = Array.isArray(raw?.language_corrections)
    ? raw.language_corrections
        .map((c: Record<string, unknown>) => ({
          original: String(c?.original || "").trim(),
          corrected: String(c?.corrected || "").trim(),
          category: String(c?.category || "Từ vựng tự nhiên").trim(),
          explanation_vi: String(c?.explanation_vi || "").trim()
        }))
        .filter((c: { original: string; corrected: string; category: string; explanation_vi: string }) => {
          if (!c.original || !c.corrected) return false;
          if (c.original.toLowerCase() === c.corrected.toLowerCase()) return false;
          if (isIgnoredVerbInflectionFix(c.original, c.corrected, c.category, c.explanation_vi)) return false;
          const k = `${c.category.toLowerCase()}__${c.original.toLowerCase().replace(/[^a-z0-9\s']/g, "").trim()}`;
          if (seenLangKeys.has(k)) return false;
          seenLangKeys.add(k);
          return true;
        })
        .slice(0, 6)
        .map((c: { original: string; corrected: string; category: string; explanation_vi: string }, idx: number) => ({
          id: idx + 1,
          ...c
        }))
    : [];

  const ideaExpansions = Array.isArray(raw?.idea_expansions)
    ? raw.idea_expansions
        .map((it: Record<string, unknown>) => ({
          where_vi: String(it?.where_vi || "").trim(),
          issue_vi: String(it?.issue_vi || "").trim(),
          suggested_en: String(it?.suggested_en || "").trim(),
          meaning_vi: String(it?.meaning_vi || "").trim()
        }))
        .filter((it: { suggested_en: string; issue_vi: string }) => it.suggested_en || it.issue_vi)
        .slice(0, 3)
    : [];

  const critObj = (raw?.criteria && typeof raw.criteria === "object" ? raw.criteria : {}) as Record<string, unknown>;

  return {
    part: partNum,
    skipped: false,
    recognized_transcript: String(raw?.recognized_transcript || "").trim(),
    internal_score: roundedScore,
    level_assessment: stripNumericScores(String(raw?.level_assessment || "")),
    estimated_band: cleanBand,
    overall_comment: stripNumericScores(String(raw?.overall_comment || "")),
    criteria: {
      pronunciation_intonation: stripNumericScores(String(critObj?.pronunciation_intonation || "")),
      grammar: stripNumericScores(String(critObj?.grammar || "")),
      vocabulary_vietlish: stripNumericScores(String(critObj?.vocabulary_vietlish || "")),
      coherence_logic: stripNumericScores(String(critObj?.coherence_logic || ""))
    },
    pronunciation_fixes: pronFixes,
    language_corrections: langCorrections,
    idea_expansions: ideaExpansions,
    natural_spoken_version: String(raw?.natural_spoken_version || "").trim(),
    ...(raw?._meta && typeof raw._meta === "object" ? { _meta: raw._meta } : {})
  };
}

function buildSkippedPartReview(partNum: 1 | 2 | 3) {
  return {
    part: partNum,
    skipped: true,
    recognized_transcript: "",
    internal_score: 0,
    level_assessment: "Chưa có bản ghi âm",
    estimated_band: "Chưa đạt B1",
    overall_comment: `Bạn chưa ghi âm hoặc chưa nộp tệp âm thanh cho Part ${partNum}. Hãy kiểm tra Micro và thu đủ cả 3 phần để đạt điểm tối ưu.`,
    criteria: {
      pronunciation_intonation: "Chưa có dữ liệu âm thanh để đánh giá.",
      grammar: "Chưa có dữ liệu bài nói.",
      vocabulary_vietlish: "Chưa có dữ liệu bài nói.",
      coherence_logic: `Bỏ trống Part ${partNum} sẽ làm giảm đáng kể điểm tổng VSTEP Speaking.`
    },
    pronunciation_fixes: [],
    language_corrections: [],
    idea_expansions: [],
    natural_spoken_version: ""
  };
}

// ============================================================================
// ZERO-COPY RESUMABLE STREAMING: NHẬN DIỆN MAGIC BYTES (32B) + UPLOAD CHUẨN
// RESUMABLE PROTOCOL SANG GEMINI FILES API (0 MB RAM BUFFER)
// Khắc phục triệt để lỗi Safari/iPhone xuất MP4 gắn đuôi .webm và tương thích
// chuẩn 100% với giao thức Resumable Upload chính thức của Google Gemini API.
// ============================================================================
async function probeAudioMimeAndSize(
  signedAudioUrl: string,
  audioPath: string
): Promise<{ ok: true; mimeType: string; totalBytes: number | null } | { ok: false; status: number; error: string }> {
  try {
    const probeRes = await fetch(signedAudioUrl, {
      headers: { Range: "bytes=0-31" },
      signal: AbortSignal.timeout(12000)
    });

    if (!probeRes.ok && probeRes.status !== 206) {
      return {
        ok: false,
        status: probeRes.status || 404,
        error: `Không tải được file ghi âm từ Storage (HTTP ${probeRes.status}).`
      };
    }

    const totalFromRange = parseTotalSizeFromContentRange(probeRes.headers.get("content-range"));
    const lenHdr = probeRes.headers.get("content-length");
    const totalBytes =
      totalFromRange ||
      (probeRes.status === 200 && lenHdr && Number(lenHdr) > 0 ? Number(lenHdr) : null);

    let headBytes = new Uint8Array(0);
    if (probeRes.body) {
      const reader = probeRes.body.getReader();
      const collected: number[] = [];
      try {
        while (collected.length < 32) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          for (let i = 0; i < value.length && collected.length < 32; i++) {
            collected.push(value[i]);
          }
        }
      } finally {
        try {
          await reader.cancel();
        } catch (_e) {}
      }
      headBytes = new Uint8Array(collected);
    }

    if (totalBytes !== null && totalBytes < 200) {
      return { ok: false, status: 400, error: "File ghi âm rỗng hoặc quá ngắn (< 200 bytes)." };
    }

    const sniffed = sniffAudioMimeFromMagicBytes(headBytes);
    const mimeType = sniffed || resolveAudioMimeFromMeta(probeRes.headers.get("content-type"), audioPath);
    return { ok: true, mimeType, totalBytes };
  } catch (err) {
    // Nếu probe Range gặp sự cố mạng tạm thời, vẫn cho phép fallback ở bước download chính
    return {
      ok: true,
      mimeType: resolveAudioMimeFromMeta(null, audioPath),
      totalBytes: null
    };
  }
}

async function streamStorageUrlToGeminiFilesApi(
  geminiApiKey: string,
  signedAudioUrl: string,
  audioPath: string
): Promise<
  | { ok: true; fileUri: string; fileName: string; mimeType: string; sizeBytes: number }
  | { ok: false; status: number; error: string }
> {
  // Bước 0: Đọc đúng 32 byte đầu để nhận diện đúng định dạng thật (MP4/WebM/OGG/WAV/MP3)
  const probe = await probeAudioMimeAndSize(signedAudioUrl, audioPath);
  if (!probe.ok) return probe;

  const detectedMime = probe.mimeType;

  // Bước A: Khởi tạo phiên Resumable Upload chính thức của Gemini Files API trước khi mở stream tải
  const displayName = String(audioPath.split("/").pop() || "speaking_audio").slice(0, 80);
  const startHeaders: Record<string, string> = {
    "X-Goog-Upload-Protocol": "resumable",
    "X-Goog-Upload-Command": "start",
    "X-Goog-Upload-Header-Content-Type": detectedMime,
    "Content-Type": "application/json"
  };
  if (probe.totalBytes && probe.totalBytes > 0) {
    startHeaders["X-Goog-Upload-Header-Content-Length"] = String(probe.totalBytes);
  }

  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: "POST",
      headers: startHeaders,
      body: JSON.stringify({ file: { display_name: displayName } }),
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => "");
    return {
      ok: false,
      status: startRes.status,
      error: `Gemini Files Start lỗi (${startRes.status}): ${errText.slice(0, 180)}`
    };
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url") || "";
  if (!uploadUrl) {
    return { ok: false, status: 500, error: "Gemini Files API không trả về x-goog-upload-url." };
  }

  // Bước B: Mở stream tải từ Supabase Storage và pipe thẳng (zero-copy, 0 MB RAM) lên uploadUrl
  const dlRes = await fetch(signedAudioUrl, { signal: AbortSignal.timeout(25000) });
  if (!dlRes.ok || !dlRes.body) {
    return {
      ok: false,
      status: dlRes.status || 404,
      error: `Không tải được file ghi âm từ Storage (HTTP ${dlRes.status}).`
    };
  }

  const contentLengthHdr = dlRes.headers.get("content-length");
  const totalBytes =
    (contentLengthHdr && Number(contentLengthHdr) > 0 ? Number(contentLengthHdr) : null) || probe.totalBytes;

  if (totalBytes !== null && totalBytes < 200) {
    try {
      await dlRes.body.cancel();
    } catch (_e) {}
    return { ok: false, status: 400, error: "File ghi âm rỗng hoặc quá ngắn (< 200 bytes)." };
  }

  const uploadHeaders: Record<string, string> = {
    "X-Goog-Upload-Offset": "0",
    "X-Goog-Upload-Command": "upload, finalize"
  };
  if (totalBytes && totalBytes > 0) {
    uploadHeaders["Content-Length"] = String(totalBytes);
  }

  const upRes = await fetch(uploadUrl, {
    method: "POST",
    headers: uploadHeaders,
    body: dlRes.body,
    signal: AbortSignal.timeout(35000)
  });

  if (!upRes.ok) {
    const errText = await upRes.text().catch(() => "");
    return {
      ok: false,
      status: upRes.status,
      error: `Gemini Files Upload lỗi (${upRes.status}): ${errText.slice(0, 180)}`
    };
  }

  const upJson = await upRes.json().catch(() => ({}));
  const fileObj = upJson?.file || upJson || {};
  const fileUri = String(fileObj.uri || "");
  const fileName = String(fileObj.name || "");
  const storedMime = String(fileObj.mimeType || detectedMime);
  const storedBytes = Number(fileObj.sizeBytes || totalBytes || 0);
  let state = String(fileObj.state || "ACTIVE").toUpperCase();

  if (!fileUri) {
    return { ok: false, status: 500, error: "Gemini Files API không trả về fileUri." };
  }

  if (state !== "ACTIVE" && fileName) {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const checkRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(geminiApiKey)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (checkRes.ok) {
        const checkJson = await checkRes.json().catch(() => ({}));
        state = String(checkJson?.state || "").toUpperCase();
        if (state === "ACTIVE") break;
        if (state === "FAILED") {
          return { ok: false, status: 400, error: "Gemini không giải mã được tệp âm thanh này." };
        }
      }
    }
  }

  return { ok: true, fileUri, fileName, mimeType: storedMime, sizeBytes: storedBytes };
}

async function deleteGeminiFileBestEffort(geminiApiKey: string, fileName: string) {
  if (!fileName) return;
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(geminiApiKey)}`,
      { method: "DELETE" }
    );
  } catch (_e) {}
}

function parseGeminiApiKeys(): string[] {
  const rawSources = [
    Deno.env.get("GEMINI_API_KEY") || "",
    Deno.env.get("GEMINI_API_KEYS") || "",
    Deno.env.get("GEMINI_API_KEY_2") || "",
    Deno.env.get("GEMINI_API_KEY_3") || "",
    Deno.env.get("GEMINI_API_KEY_4") || "",
    Deno.env.get("GEMINI_API_KEY_5") || ""
  ];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const src of rawSources) {
    src
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(k => {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      });
  }
  if (keys.length <= 1) return keys;
  // Xoay điểm bắt đầu ngẫu nhiên để phân bổ đều hạn mức giữa các key miễn phí
  const offset = Math.floor(Math.random() * keys.length);
  return [...keys.slice(offset), ...keys.slice(0, offset)];
}

function parseGroqApiKeys(): string[] {
  const rawSources = [
    Deno.env.get("GROQ_API_KEY") || "",
    Deno.env.get("GROQ_API_KEYS") || "",
    Deno.env.get("GROQ_API_KEY_2") || "",
    Deno.env.get("GROQ_API_KEY_3") || ""
  ];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const src of rawSources) {
    src
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(k => {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      });
  }
  if (keys.length <= 1) return keys;
  const offset = Math.floor(Math.random() * keys.length);
  return [...keys.slice(offset), ...keys.slice(0, offset)];
}

function extractEnglishPromptHints(promptText: string): string {
  // Bỏ phần dịch tiếng Việt trong ngoặc (...) và lọc ký tự có dấu tiếng Việt để tránh làm nhiễu bộ giải mã tiếng Anh
  const withoutViParens = String(promptText || "").replace(/\([^)]*[À-ỹ][^)]*\)/g, " ");
  const asciiOnly = withoutViParens
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return asciiOnly.slice(0, 700);
}

function buildWhisperTopicHint(promptText: string): string {
  const clean = extractEnglishPromptHints(promptText);
  if (!clean) {
    return "VSTEP English speaking test by a Vietnamese student. Natural spoken English with hesitations.";
  }
  return `VSTEP English speaking exam. Topic: ${clean}`;
}

function countRealWords(text: string): number {
  return String(text || "")
    .replace(/\[\.\.\.\]/g, " ")
    .replace(/[^a-zA-ZÀ-ỹ0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function isRepetitionLoopHallucination(text: string): boolean {
  const tokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < 24) return false;
  // Phát hiện lỗi lặp vô hạn cùng 1 cụm 3-gram quá nhiều lần
  const counts = new Map<string, number>();
  let maxFreq = 0;
  for (let i = 0; i <= tokens.length - 3; i++) {
    const gram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    const c = (counts.get(gram) || 0) + 1;
    counts.set(gram, c);
    if (c > maxFreq) maxFreq = c;
  }
  return maxFreq >= Math.max(7, Math.floor(tokens.length / 8));
}

const WHISPER_SILENCE_HALLUCINATIONS = [
  /^thank you(?: very much)?(?: for watching| for listening)?[.!?\s]*$/i,
  /^thanks for watching[.!?\s]*$/i,
  /^please subscribe[.!?\s]*$/i,
  /support us on (?:twitter|facebook|instagram|youtube|patreon)/i,
  /(?:twitter|facebook|instagram).*(?:twitter|facebook|instagram)/i,
  /please (?:like|share|subscribe|follow)/i,
  /\bas an egb\b|\bhaving an egb\b/i,
  /^subtitles? by.*$/i,
  /^amara\.org.*$/i,
  /^mbc\b.*$/i,
  /^you[.!?\s]*$/i,
  /^bye[.!?\s]*$/i
];

function formatSecMmSs(sec: number): string {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

async function transcribeWithGroqWhisper(params: {
  groqApiKeys: string[];
  signedAudioUrl: string;
}): Promise<
  | { ok: true; transcript: string; timestampedDraft: string; isSilent: boolean; modelUsed: string }
  | { ok: false; error: string }
> {
  if (!params.groqApiKeys || params.groqApiKeys.length === 0) {
    return { ok: false, error: "Chưa cấu hình GROQ_API_KEY." };
  }

  const whisperModels = ["whisper-large-v3", "whisper-large-v3-turbo"];
  let lastErr = "Groq Whisper không phản hồi.";

  for (const apiKey of params.groqApiKeys.slice(0, 3)) {
    for (const modelName of whisperModels) {
      try {
        // KHÔNG truyền `prompt` chứa nội dung đề bài sang Whisper vì Whisper rất hay bịa lại
        // nguyên văn prompt (vd: "Three options are suggested A... B... C...") trong các khoảng lặng!
        const form = new FormData();
        form.append("model", modelName);
        form.append("url", params.signedAudioUrl);
        form.append("language", "en");
        form.append("response_format", "verbose_json");
        form.append("temperature", "0");

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: AbortSignal.timeout(35000)
        });

        if (!res.ok) {
          const errTxt = (await res.text().catch(() => "")).slice(0, 160);
          lastErr = `Groq ${modelName} (${res.status}): ${errTxt}`;
          if (res.status === 401 || res.status === 403) break;
          continue;
        }

        const data = await res.json().catch(() => ({}));
        const segments = Array.isArray(data?.segments) ? data.segments : [];
        let cleanText = "";
        let timestampedDraft = "";

        if (segments.length > 0) {
          const kept: string[] = [];
          const keptTimed: string[] = [];
          for (const seg of segments) {
            const segText = String(seg?.text || "").trim();
            if (!segText) continue;
            const noSpeech = Number(seg?.no_speech_prob ?? 0);
            const avgLogProb = Number(seg?.avg_logprob ?? 0);
            const compRatio = Number(seg?.compression_ratio ?? 1);
            const isKnownPhantom = WHISPER_SILENCE_HALLUCINATIONS.some(rx => rx.test(segText));
            if (isKnownPhantom) continue;
            // Loại các đoạn Whisper bịa chữ trong khoảng im lặng / tiếng ồn lớp học / lặp vô hạn
            if (noSpeech > 0.58) continue;
            if (compRatio > 2.2) continue;
            if (avgLogProb < -1.2 && noSpeech > 0.35) continue;
            kept.push(segText);
            const tStart = formatSecMmSs(Number(seg?.start ?? 0));
            const tEnd = formatSecMmSs(Number(seg?.end ?? 0));
            keptTimed.push(`[${tStart}-${tEnd}] ${segText}`);
          }
          cleanText = kept.join(" ").replace(/\s{2,}/g, " ").trim();
          timestampedDraft = keptTimed.join("\n").trim();
        } else {
          const raw = String(data?.text || "").replace(/\s{2,}/g, " ").trim();
          cleanText = WHISPER_SILENCE_HALLUCINATIONS.some(rx => rx.test(raw)) ? "" : raw;
          timestampedDraft = cleanText;
        }

        const wordCount = countRealWords(cleanText);
        const isSilent = wordCount < 2 || WHISPER_SILENCE_HALLUCINATIONS.some(rx => rx.test(cleanText));

        return {
          ok: true,
          transcript: isSilent ? "" : cleanText,
          timestampedDraft: isSilent ? "" : timestampedDraft,
          isSilent,
          modelUsed: `groq:${modelName}`
        };
      } catch (err) {
        lastErr = err instanceof Error ? err.message : "Lỗi kết nối Groq Whisper.";
      }
    }
  }

  return { ok: false, error: lastErr };
}

async function callGeminiAudioGradeWithSingleKey(params: {
  geminiApiKey: string;
  geminiModel: string;
  signedAudioUrl: string;
  audioPath: string;
  promptText: string;
  durationSec?: number;
  preTranscribed?: { transcript: string; timestampedDraft?: string; isSilent: boolean; modelUsed: string } | null;
  buildGradingPrompt: (verifiedTranscript: string) => string;
}) {
  const uploaded = await streamStorageUrlToGeminiFilesApi(
    params.geminiApiKey,
    params.signedAudioUrl,
    params.audioPath
  );
  if (!uploaded.ok) {
    return uploaded;
  }

  const RETIRED_MODELS = new Set([
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ]);
  // Ưu tiên bản Flash ĐẦY ĐỦ (3.5 Flash / 3 Flash / flash-latest / 2.5 Flash) trước khi rơi xuống bản lite!
  const fallbackModels = Array.from(
    new Set([
      "gemini-3.5-flash",
      "gemini-3-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash",
      params.geminiModel,
      "gemini-3.5-flash-lite"
    ])
  )
    .filter(m => Boolean(m) && !RETIRED_MODELS.has(m))
    .slice(0, 6);

  const callModel = async (
    parts: Array<Record<string, unknown>>,
    temperature: number,
    expectJson: boolean,
    useSchema = true,
    disableThinking = false
  ) => {
    const errors: Array<{ model: string; status: number; detail: string }> = [];
    for (const modelName of fallbackModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(params.geminiApiKey)}`;
      const genCfg: Record<string, unknown> = {
        temperature,
        maxOutputTokens: 8192
      };
      if (disableThinking) {
        genCfg.thinkingConfig = { thinkingBudget: 0 };
      }
      if (expectJson) {
        genCfg.responseMimeType = "application/json";
        if (useSchema) {
          genCfg.responseSchema = PART_REVIEW_RESPONSE_SCHEMA;
        }
      }

      let res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: genCfg
        }),
        signal: AbortSignal.timeout(45000)
      });

      // Nếu model từ chối responseSchema hoặc thinkingConfig (HTTP 400), tự động gọi lại với config cơ bản
      if (!res.ok && res.status === 400 && (useSchema || disableThinking)) {
        const retryCfg: Record<string, unknown> = { temperature, maxOutputTokens: 8192 };
        if (expectJson) retryCfg.responseMimeType = "application/json";
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: retryCfg
          }),
          signal: AbortSignal.timeout(45000)
        });
      }

      if (res.ok) {
        const geminiJson = await res.json();
        const partsArr = Array.isArray(geminiJson?.candidates?.[0]?.content?.parts)
          ? geminiJson.candidates[0].content.parts
          : [];
        const rawCandidate = partsArr
          .filter((p: Record<string, unknown>) => !p?.thought && typeof p?.text === "string")
          .map((p: Record<string, unknown>) => String(p.text))
          .join("")
          .trim();
        return { ok: true as const, rawText: rawCandidate, modelUsed: modelName };
      }

      const modelStatus = res.status;
      const modelErrText = await res.text().catch(() => "");
      errors.push({ model: modelName, status: modelStatus, detail: modelErrText.slice(0, 140) });
      if (modelStatus === 400 || modelStatus === 401 || modelStatus === 403) break;
    }

    const primary = errors.find(e => e.status !== 404) || errors[0] || { model: params.geminiModel, status: 500, detail: "" };
    const summary = errors.map(e => `${e.model}:${e.status}`).join(", ");
    return {
      ok: false as const,
      status: primary.status,
      error: `Gemini API lỗi (${primary.status}): ${primary.detail || summary}`
    };
  };

  try {
    const checkTranscriptMeaningful = (raw: string) => {
      const cleaned = raw.replace(/^["'“]+|["'”]+$/g, "").trim();
      const wordCount = countRealWords(cleaned);
      const unintelligible =
        !cleaned ||
        /^\[?(?:SILENT|TOO_QUIET|UNINTELLIGIBLE|NO_SPEECH|NO_AUDIBLE_SPEECH)\]?$/i.test(cleaned) ||
        wordCount < 2;
      return { cleaned, unintelligible, wordCount };
    };

    const estDurationSec = Math.max(
      Number(params.durationSec || 0),
      uploaded.mimeType.includes("wav") ? Math.round(uploaded.sizeBytes / 32000) : 0
    );
    const isSuspiciouslySparse = (wc: number) => {
      if (estDurationSec >= 45 && wc < 25) return true;
      if (uploaded.sizeBytes > 250000 && wc < 18) return true;
      return false;
    };

    const topicHintEn = extractEnglishPromptHints(params.promptText);
    const whisperDraft =
      params.preTranscribed && !params.preTranscribed.isSilent && params.preTranscribed.transcript
        ? (params.preTranscribed.timestampedDraft || params.preTranscribed.transcript).trim()
        : "";
    const whisperClean =
      params.preTranscribed && !params.preTranscribed.isSilent && params.preTranscribed.transcript
        ? params.preTranscribed.transcript.trim()
        : "";

    let step1Model = "";
    let transcriptCheck = { cleaned: "", unintelligible: true, wordCount: 0 };

    // BƯỚC 1 (DUAL-ENGINE FUSION: GROQ WHISPER LARGE V3 + GEMINI MULTIMODAL AUDIO VERIFICATION + EXAM CONTEXT):
    // - Whisper Large v3 (không truyền prompt, lọc chặt no_speech_prob > 0.58) bắt cực sắc các âm giọng Việt
    //   mà model nhỏ hay nghe nhầm (vd: "by bus" vs "papers", "very cheap" vs "very straight").
    // - Gemini nghe trực tiếp toàn bộ file WAV cùng ngữ cảnh đề thi tiếng Anh + bản nháp Whisper để:
    //   (a) Xoá sạch mọi chữ Whisper bịa trong khoảng lặng/tiếng ồn lớp học,
    //   (b) Khôi phục đúng từ tiếng Anh bị nói nặng giọng Việt dựa vào âm thanh thật + chủ đề câu hỏi,
    //   (c) Giữ nguyên 100% lỗi ngữ pháp thật của thí sinh (KHÔNG sửa lỗi, KHÔNG bịa thêm câu!).
    const contextSection = topicHintEn
      ? `EXAM QUESTIONS / TOPIC CONTEXT (use ONLY to disambiguate Vietnamese-accented pronunciation of topic words — NEVER invent answers the student did not say):\n"""\n${topicHintEn}\n"""\n\n`
      : "";
    const whisperSection = whisperDraft
      ? `ROUGH WHISPER ACOUSTIC DRAFT (helpful for accented words, BUT may contain hallucinations during silences/classroom noise — verify EVERY phrase against the actual audio and DELETE anything not truly spoken by the student):\n"""\n${whisperDraft.slice(0, 2600)}\n"""\n\n`
      : "";

    const fusionTranscribePrompt =
      "You are an expert verbatim English speech-to-text transcriber specialized in Vietnamese students taking VSTEP Speaking exams in a classroom.\n\n" +
      contextSection +
      whisperSection +
      "STRICT TRANSCRIPTION RULES:\n" +
      "1. Listen carefully to the ENTIRE attached audio recording from 0:00 to the VERY LAST SECOND.\n" +
      "2. COMPLETELY IGNORE background classroom noises, chair scraping, breathing, silent thinking pauses (5–30 seconds), and any Vietnamese chatter from the student or people nearby.\n" +
      "3. Transcribe ONLY the main student's ACTUAL SPOKEN ENGLISH WORDS in chronological order.\n" +
      "4. Use the audio + exam topic context to accurately recognize Vietnamese-accented English words (for example: dropped final consonants like 'cheap', 'bus', 'ticket', 'relax', 'stress', 'game show', 'watch alone', 'comedy', 'action', 'fuel', 'parking', 'company president') instead of writing nonsensical phonetic guesses (like 'papers', 'straight', 'manageable').\n" +
      "5. PRESERVE the student's real grammar mistakes, missing articles/endings, hesitations, and exact phrasing verbatim. Pay close attention to negatives ('wouldn't' vs 'would', 'don't' vs 'do', 'not'). NEVER rewrite their sentences into polished English and NEVER invent sentences that are not spoken in the audio.\n" +
      "6. Output ONLY the clean plain English transcript text (no timestamps, no labels, no markdown, no commentary). Omit filler 'uh/um' when they break words unnecessarily.\n" +
      "7. ONLY output NO_AUDIBLE_SPEECH if the entire audio has zero spoken English from start to finish.";

    // KHÔNG tắt thinking ở Bước 1 vì suy luận ngắn giúp Gemini giải mã giọng Việt chính xác gấp nhiều lần!
    const step1 = await callModel(
      [
        { fileData: { mimeType: uploaded.mimeType, fileUri: uploaded.fileUri } },
        { text: fusionTranscribePrompt }
      ],
      0.0,
      false,
      false,
      false
    );

    if (step1.ok) {
      const gemCheck = checkTranscriptMeaningful(step1.rawText);
      if (
        !gemCheck.unintelligible &&
        !isRepetitionLoopHallucination(gemCheck.cleaned) &&
        !WHISPER_SILENCE_HALLUCINATIONS.some(rx => rx.test(gemCheck.cleaned))
      ) {
        step1Model = whisperClean
          ? `${params.preTranscribed?.modelUsed}+${step1.modelUsed}`
          : step1.modelUsed;
        transcriptCheck = gemCheck;
      }
    }

    // DỰ PHÒNG 1: Nếu Gemini lượt 1 trả về rỗng/quá thưa trên file lớn -> nghe lại 1 lượt nữa với Gemini
    if (
      (transcriptCheck.unintelligible && uploaded.sizeBytes > 20000) ||
      isSuspiciouslySparse(transcriptCheck.wordCount)
    ) {
      const retryPrompt =
        contextSection +
        "Listen again carefully to the ENTIRE attached audio file from 0:00 to the very end. Ignore all Vietnamese background talk, classroom noise, and long silent pauses. Transcribe EVERY spoken English word by the main student verbatim using the exam topic context only to recognize accented pronunciation accurately. Output ONLY the plain English transcript text.";
      const retryRes = await callModel(
        [
          { fileData: { mimeType: uploaded.mimeType, fileUri: uploaded.fileUri } },
          { text: retryPrompt }
        ],
        0.1,
        false,
        false,
        false
      );
      if (retryRes.ok) {
        const retryCheck = checkTranscriptMeaningful(retryRes.rawText);
        if (
          !retryCheck.unintelligible &&
          !isRepetitionLoopHallucination(retryCheck.cleaned) &&
          retryCheck.wordCount > transcriptCheck.wordCount
        ) {
          step1Model = `${retryRes.modelUsed}:retry`;
          transcriptCheck = retryCheck;
        }
      }
    }

    // DỰ PHÒNG 2: Nếu Gemini Step 1 vẫn không chép được nhưng Groq Whisper (đã lọc sạch) có bản chép -> dùng bản sạch của Whisper
    if (transcriptCheck.unintelligible && whisperClean) {
      const wCheck = checkTranscriptMeaningful(whisperClean);
      if (!wCheck.unintelligible && !isRepetitionLoopHallucination(wCheck.cleaned)) {
        step1Model = params.preTranscribed?.modelUsed || "groq:whisper";
        transcriptCheck = wCheck;
      }
    }

    if (!step1.ok && transcriptCheck.unintelligible) return step1;

    // Chỉ báo "quá nhỏ / không nhận diện được" khi gần như không nghe được bất kỳ lời nói nào trong cả file
    if (transcriptCheck.unintelligible) {
      return {
        ok: true as const,
        parsed: {
          recognized_transcript: "",
          internal_score: 0,
          level_assessment: "Bài nói quá nhỏ và hệ thống không nhận diện được",
          estimated_band: "Chưa đạt B1",
          overall_comment:
            "Bài nói quá nhỏ hoặc hầu như không có tiếng nói nên hệ thống không nhận diện được nội dung trong phần này. Bạn hãy kiểm tra lại micro, đặt micro gần miệng hơn, nói to và rõ hơn rồi ghi âm nộp lại nhé!",
          criteria: {
            pronunciation_intonation:
              "Bài nói quá nhỏ và hệ thống không nhận diện được giọng nói để đánh giá phát âm và ngữ điệu.",
            grammar: "Hệ thống không nhận diện được lời nói nên chưa thể đánh giá ngữ pháp.",
            vocabulary_vietlish: "Hệ thống không nhận diện được lời nói nên chưa thể đánh giá từ vựng.",
            coherence_logic: "Cần thu lại phần này rõ tiếng hơn để Trợ lý Miss Nguyệt có thể chấm đầy đủ."
          },
          pronunciation_fixes: [],
          language_corrections: [],
          idea_expansions: [],
          natural_spoken_version: "",
          _meta: {
            mime_type: uploaded.mimeType,
            file_bytes: uploaded.sizeBytes,
            model_step1: step1Model
          }
        }
      };
    }

    const verifiedTranscript = transcriptCheck.cleaned;
    const step1WordCount = transcriptCheck.wordCount;

    // BƯỚC 2: CHẤM MULTIMODAL (GỬI CÙNG FILE AUDIO + BẢN CHÉP NHÁP BƯỚC 1 + ĐỀ BÀI)
    // Có tự động thử lại 1 lần ở temperature=0 nếu JSON trả về bị lỗi cú pháp/cắt ngang
    const gradingPrompt = params.buildGradingPrompt(verifiedTranscript);
    let parsed: Record<string, unknown> | null = null;
    let step2Model = "";
    let lastParseErr = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      const promptForAttempt =
        attempt === 0
          ? gradingPrompt
          : `${gradingPrompt}\n\nLƯU Ý BẮT BUỘC: Trả về ĐÚNG 1 đối tượng JSON chuẩn RFC 8259, không có dấu phẩy thừa trước } hoặc ], mọi chuỗi phải escape dấu ngoặc kép đúng chuẩn.`;
      const step2 = await callModel(
        [
          { fileData: { mimeType: uploaded.mimeType, fileUri: uploaded.fileUri } },
          { text: promptForAttempt }
        ],
        attempt === 0 ? 0.2 : 0.0,
        true,
        true,
        false
      );

      if (!step2.ok) return step2;

      try {
        const candidate = parseModelJson(step2.rawText);
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          parsed = candidate as Record<string, unknown>;
          step2Model = step2.modelUsed;
          break;
        }
        lastParseErr = "AI trả về dữ liệu JSON không đúng định dạng đối tượng.";
      } catch (parseErr) {
        lastParseErr = parseErr instanceof Error ? parseErr.message : String(parseErr);
      }
    }

    if (!parsed) {
      return {
        ok: false as const,
        status: 502,
        error: `AI trả về JSON chưa hợp lệ (${lastParseErr}). Vui lòng bấm chấm lại.`
      };
    }

    // Giữ bản chép ĐẦY ĐỦ HƠN giữa Bước 1 và Bước 2 (tránh ghi đè mất các từ Bước 2 vừa nghe bổ sung được!)
    const step2Transcript = String(parsed.recognized_transcript || "").trim();
    const step2WordCount = countRealWords(step2Transcript);
    const step1Gaps = (verifiedTranscript.match(/\[\.\.\.\]/g) || []).length;
    const step2Gaps = (step2Transcript.match(/\[\.\.\.\]/g) || []).length;
    const step2LooksValid =
      step2WordCount >= Math.max(2, Math.floor(step1WordCount * 0.9)) &&
      step2WordCount <= Math.max(step1WordCount * 2.5, step1WordCount + 120) &&
      !isRepetitionLoopHallucination(step2Transcript);

    const finalTranscript =
      step2LooksValid && (step2WordCount > step1WordCount || step2Gaps < step1Gaps)
        ? step2Transcript
        : verifiedTranscript;

    parsed.recognized_transcript = finalTranscript || "";
    parsed._meta = {
      mime_type: uploaded.mimeType,
      file_bytes: uploaded.sizeBytes,
      model_step1: step1Model,
      model_step2: step2Model,
      words_step1: step1WordCount,
      words_step2: step2WordCount,
      words_final: countRealWords(finalTranscript)
    };
    return { ok: true as const, parsed };
  } finally {
    await deleteGeminiFileBestEffort(params.geminiApiKey, uploaded.fileName);
  }
}

async function callGeminiAudioGradeStreaming(params: {
  geminiApiKeys: string[];
  groqApiKeys: string[];
  geminiModel: string;
  signedAudioUrl: string;
  audioPath: string;
  promptText: string;
  durationSec?: number;
  buildGradingPrompt: (verifiedTranscript: string) => string;
}) {
  // Chạy Groq Whisper Large v3 (KHÔNG truyền prompt, lọc chặt no_speech_prob > 0.58) lấy bản nháp âm học có mốc thời gian
  // rồi gửi cùng file WAV thật + câu hỏi đề thi cho Gemini nghe đối chiếu & lọc sạch 100% ảo giác khoảng lặng!
  let preTranscribed: { transcript: string; timestampedDraft?: string; isSilent: boolean; modelUsed: string } | null = null;
  if (params.groqApiKeys && params.groqApiKeys.length > 0) {
    const groqRes = await transcribeWithGroqWhisper({
      groqApiKeys: params.groqApiKeys,
      signedAudioUrl: params.signedAudioUrl
    });
    if (groqRes.ok && !groqRes.isSilent) {
      preTranscribed = {
        transcript: groqRes.transcript,
        timestampedDraft: groqRes.timestampedDraft,
        isSilent: groqRes.isSilent,
        modelUsed: groqRes.modelUsed
      };
    }
  }

  let lastErr: { ok: false; status: number; error: string } = {
    ok: false,
    status: 500,
    error: "Chưa cấu hình GEMINI_API_KEY."
  };

  // Thử tối đa 3 key mỗi lượt gọi để đảm bảo thời gian thực thi gọn nhẹ
  const keysToTry = params.geminiApiKeys.slice(0, 3);
  for (let idx = 0; idx < keysToTry.length; idx++) {
    const key = keysToTry[idx];
    const res = await callGeminiAudioGradeWithSingleKey({
      geminiApiKey: key,
      geminiModel: params.geminiModel,
      signedAudioUrl: params.signedAudioUrl,
      audioPath: params.audioPath,
      promptText: params.promptText,
      durationSec: params.durationSec,
      preTranscribed,
      buildGradingPrompt: params.buildGradingPrompt
    });
    if (res.ok) return res;
    lastErr = res;
    if (res.status === 400) break;
  }

  return {
    ok: false as const,
    status: lastErr.status,
    error:
      keysToTry.length > 1
        ? `${lastErr.error} (đã thử xoay vòng ${keysToTry.length} API key)`
        : lastErr.error
  };
}

// ============================================================================
// CHẤM 1 PART CỤ THỂ VÀ LƯU DẦN (KHÔNG BAO GIỜ QUÁ TẢI RAM/CPU)
// ============================================================================
async function gradeOnePartOfSubmission(
  admin: SupabaseClient,
  geminiApiKeys: string[],
  geminiModel: string,
  sub: SubmissionRow,
  existingReview: ReviewRow | null,
  partNum: 1 | 2 | 3,
  options: { releaseNow?: boolean; resetExisting?: boolean }
) {
  const nowIso = new Date().toISOString();
  const prevRetry = existingReview?.retry_count || 0;
  const targetLevel = String(sub.target_level || "B1").toUpperCase() === "B2" ? "B2" : "B1";
  const testTitle = sub.test_title || `VSTEP Speaking Mock Test ${String(sub.test_id).padStart(2, "0")}`;

  const submittedMs = new Date(sub.submitted_at || sub.created_at || Date.now()).getTime();
  const baseMs = isNaN(submittedMs) ? Date.now() : submittedMs;
  let releaseAtIso = new Date(baseMs + RELEASE_DELAY_HOURS * 3600 * 1000).toISOString();
  if (options.releaseNow) {
    releaseAtIso = nowIso;
  } else if (existingReview?.release_at) {
    releaseAtIso = existingReview.release_at;
  } else if (sub.release_at) {
    releaseAtIso = sub.release_at;
  }

  const audioPaths: Record<1 | 2 | 3, string> = {
    1: String(sub.audio_path_p1 || "").trim(),
    2: String(sub.audio_path_p2 || "").trim(),
    3: String(sub.audio_path_p3 || "").trim()
  };

  if (!audioPaths[1] && !audioPaths[2] && !audioPaths[3]) {
    const noAudioMsg = "Bài nộp không có tệp ghi âm nào ở cả 3 Part.";
    await admin.from("mock_speaking_ai_reviews").upsert(
      {
        id: sub.id,
        submission_id: sub.id,
        student_key: sub.student_key,
        student_name: sub.student_name,
        class_code: sub.class_code || "",
        test_id: sub.test_id,
        target_level: targetLevel,
        status: "no_audio",
        release_at: releaseAtIso,
        error_message: noAudioMsg,
        retry_count: MAX_AUTO_RETRIES,
        updated_at: nowIso
      },
      { onConflict: "id" }
    );
    await admin.from("mock_speaking_submissions").update({ status: "no_audio", updated_at: nowIso }).eq("id", sub.id);
    return { ok: false, status: 400, error: noAudioMsg };
  }

  const promptsMap: Record<1 | 2 | 3, string> = {
    1: String(sub.prompt_part1 || "").trim(),
    2: String(sub.prompt_part2 || "").trim(),
    3: String(sub.prompt_part3 || "").trim()
  };
  const durationsMap: Record<1 | 2 | 3, number> = {
    1: Number(sub.duration_p1) || 0,
    2: Number(sub.duration_p2) || 0,
    3: Number(sub.duration_p3) || 0
  };

  const existingJson =
    !options.resetExisting && existingReview?.review_json && typeof existingReview.review_json === "object"
      ? JSON.parse(JSON.stringify(existingReview.review_json))
      : {};
  const partsObj: Record<string, ReturnType<typeof normalizePartReview>> =
    existingJson.parts && typeof existingJson.parts === "object" ? existingJson.parts : {};

  const targetAudioPath = audioPaths[partNum];
  const partKey = `part${partNum}`;

  if (!targetAudioPath) {
    partsObj[partKey] = buildSkippedPartReview(partNum);
  } else {
    const { data: signedData, error: signErr } = await admin.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(targetAudioPath, 180);

    if (signErr || !signedData?.signedUrl) {
      partsObj[partKey] = buildSkippedPartReview(partNum);
    } else {
      const groqApiKeys = parseGroqApiKeys();
      const gemRes = await callGeminiAudioGradeStreaming({
        geminiApiKeys,
        groqApiKeys,
        geminiModel,
        signedAudioUrl: signedData.signedUrl,
        audioPath: targetAudioPath,
        promptText: promptsMap[partNum],
        durationSec: durationsMap[partNum],
        buildGradingPrompt: (verifiedTranscript: string) =>
          buildPartGradingPrompt({
            partNum,
            testTitle,
            promptText: promptsMap[partNum],
            verifiedTranscript,
            durationSec: durationsMap[partNum],
            targetLevel
          })
      });

      if (!gemRes.ok) {
        const nextRetry = prevRetry + 1;
        await admin.from("mock_speaking_ai_reviews").upsert(
          {
            id: sub.id,
            submission_id: sub.id,
            student_key: sub.student_key,
            student_name: sub.student_name,
            class_code: sub.class_code || "",
            test_id: sub.test_id,
            target_level: targetLevel,
            status: "error",
            release_at: releaseAtIso,
            review_json: Object.keys(partsObj).length > 0 ? { ...existingJson, parts: partsObj } : existingReview?.review_json || null,
            error_message: `[Part ${partNum}] ${gemRes.error.slice(0, 220)}`,
            retry_count: nextRetry,
            updated_at: new Date().toISOString()
          },
          { onConflict: "id" }
        );
        await admin
          .from("mock_speaking_submissions")
          .update({ status: "pending_retry", release_at: releaseAtIso, updated_at: new Date().toISOString() })
          .eq("id", sub.id);

        return {
          ok: false,
          status: 502,
          error: `[Part ${partNum}] ${gemRes.error}`
        };
      }

      partsObj[partKey] = normalizePartReview(gemRes.parsed || {}, partNum);
    }
  }

  // Đánh dấu tự động các Part không có file audio là skipped để không phải chờ thêm
  for (const n of [1, 2, 3] as Array<1 | 2 | 3>) {
    if (!audioPaths[n] && !partsObj[`part${n}`]) {
      partsObj[`part${n}`] = buildSkippedPartReview(n);
    }
  }

  const allThreeDone = Boolean(partsObj.part1 && partsObj.part2 && partsObj.part3);
  const doneIso = new Date().toISOString();

  if (!allThreeDone) {
    // Lưu tạm kết quả từng Part đã xong
    await admin.from("mock_speaking_ai_reviews").upsert(
      {
        id: sub.id,
        submission_id: sub.id,
        student_key: sub.student_key,
        student_name: sub.student_name,
        class_code: sub.class_code || "",
        test_id: sub.test_id,
        target_level: targetLevel,
        status: "grading",
        release_at: releaseAtIso,
        review_json: {
          target_level: targetLevel,
          parts: partsObj
        },
        error_message: "",
        retry_count: 0,
        updated_at: doneIso
      },
      { onConflict: "id" }
    );
    await admin
      .from("mock_speaking_submissions")
      .update({ status: "grading", release_at: releaseAtIso, updated_at: doneIso })
      .eq("id", sub.id);

    return {
      ok: true,
      status: 200,
      part_done: partNum,
      all_done: false,
      ai_status: "grading",
      release_at: releaseAtIso
    };
  }

  // Đủ cả 3 Part -> tổng hợp điểm tổng VSTEP Speaking (P1: 25%, P2: 35%, P3: 40%)
  const p1 = partsObj.part1;
  const p2 = partsObj.part2;
  const p3 = partsObj.part3;
  const gradedAudioCount = [p1, p2, p3].filter(p => !p.skipped).length;
  const rawWeighted = p1.internal_score * 0.25 + p2.internal_score * 0.35 + p3.internal_score * 0.4;
  const overallScore = roundQuarterStep(rawWeighted);
  const overallBand = scoreToBandLabel(overallScore);

  const completedPartsText = [1, 2, 3]
    .filter(n => !partsObj[`part${n}`].skipped)
    .map(n => `Part ${n} (${partsObj[`part${n}`].estimated_band})`)
    .join(", ");
  const skippedParts = [1, 2, 3].filter(n => partsObj[`part${n}`].skipped);

  const overallComment = [
    `Tổng thể bài thi thử đạt mức ${overallBand} theo mục tiêu Level ${targetLevel}. Kết quả chi tiết từng phần: ${completedPartsText}.`,
    skippedParts.length > 0
      ? `Lưu ý: bạn còn thiếu bản ghi âm ở Part ${skippedParts.join(", ")} nên điểm tổng bị ảnh hưởng.`
      : `Bạn đã hoàn thành đủ cả 3 phần thi; hãy xem kỹ từng tab Part 1, Part 2, Part 3 bên dưới để luyện sửa phát âm, chữa cụm Vietlish và nâng cấp ý tưởng.`
  ].join(" ");

  const fullReviewJson = {
    overall_score: overallScore,
    estimated_band: overallBand,
    target_level: targetLevel,
    overall_comment: stripNumericScores(overallComment),
    completed_parts_count: gradedAudioCount,
    parts: {
      part1: p1,
      part2: p2,
      part3: p3
    }
  };

  const isAlreadyReleased = new Date(releaseAtIso).getTime() <= Date.now();

  const { error: revErr } = await admin.from("mock_speaking_ai_reviews").upsert(
    {
      id: sub.id,
      submission_id: sub.id,
      student_key: sub.student_key,
      student_name: sub.student_name,
      class_code: sub.class_code || "",
      test_id: sub.test_id,
      target_level: targetLevel,
      status: "ready",
      release_at: releaseAtIso,
      review_json: fullReviewJson,
      error_message: "",
      retry_count: 0,
      student_seen_at: null,
      updated_at: doneIso
    },
    { onConflict: "id" }
  );

  if (revErr) {
    return { ok: false, status: 500, error: `Lỗi lưu bài sửa: ${revErr.message}` };
  }

  await admin
    .from("mock_speaking_submissions")
    .update({
      status: isAlreadyReleased ? "ready" : "scheduled",
      release_at: releaseAtIso,
      updated_at: doneIso
    })
    .eq("id", sub.id);

  return {
    ok: true,
    status: 200,
    part_done: partNum,
    all_done: true,
    ai_status: isAlreadyReleased ? "ready" : "scheduled",
    release_at: releaseAtIso,
    review_json: fullReviewJson
  };
}

function findNextPendingPart(sub: SubmissionRow, rev: ReviewRow | null): (1 | 2 | 3) | null {
  const rj = rev?.review_json && typeof rev.review_json === "object" ? (rev.review_json as Record<string, unknown>) : null;
  const parts = rj?.parts && typeof rj.parts === "object" ? (rj.parts as Record<string, unknown>) : {};
  const paths: Record<1 | 2 | 3, string> = {
    1: String(sub.audio_path_p1 || "").trim(),
    2: String(sub.audio_path_p2 || "").trim(),
    3: String(sub.audio_path_p3 || "").trim()
  };
  for (const n of [1, 2, 3] as Array<1 | 2 | 3>) {
    if (!parts[`part${n}`] && paths[n]) return n;
  }
  for (const n of [1, 2, 3] as Array<1 | 2 | 3>) {
    if (!parts[`part${n}`]) return n;
  }
  return null;
}

function sanitizeReviewForStudent(reviewJson: Record<string, unknown> | null) {
  if (!reviewJson || typeof reviewJson !== "object") return null;
  const clone = JSON.parse(JSON.stringify(reviewJson));
  delete clone.overall_score;
  delete clone.internal_score;

  const tOv = clone.teacher_override && typeof clone.teacher_override === "object" ? clone.teacher_override : null;
  if (tOv) {
    delete tOv.overall_score;
    delete tOv.reviewed_by;
    if (tOv.parts && typeof tOv.parts === "object") {
      ["part1", "part2", "part3"].forEach(k => {
        if (tOv.parts[k] && typeof tOv.parts[k] === "object") {
          delete tOv.parts[k].score;
        }
      });
    }
    // Nếu GV chọn ẩn bài chấm AI (do không đồng ý hoặc tự chấm hoàn toàn) -> gỡ sạch dữ liệu AI ở server
    if (tOv.hide_ai_review) {
      delete clone.parts;
      clone.ai_hidden_by_teacher = true;
      clone.estimated_band = String(tOv.overall_band || "").trim();
      clone.overall_comment = String(tOv.overall_comment || "").trim();
      return clone;
    }
  }

  if (clone.parts && typeof clone.parts === "object") {
    ["part1", "part2", "part3"].forEach(k => {
      if (clone.parts[k] && typeof clone.parts[k] === "object") {
        delete clone.parts[k].internal_score;
        delete clone.parts[k]._meta;
      }
    });
  }
  return clone;
}

async function verifyTeacherFromRequest(admin: SupabaseClient, req: Request): Promise<{ isTeacher: boolean; email: string }> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return { isTeacher: false, email: "" };
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: authData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !authData?.user) return { isTeacher: false, email: "" };
  const email = String(authData.user.email || "").trim().toLowerCase();
  const { data: teacherRow } = await admin.from("teachers").select("email").ilike("email", email).maybeSingle();
  return { isTeacher: Boolean(teacherRow), email };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKeys = parseGeminiApiKeys();
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
    const cronSecretEnv = Deno.env.get("CRON_SECRET") || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ ok: false, error: "Thiếu cấu hình Supabase trên Edge Function." }, 500);
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || body?.mode || "").trim();

    const incomingCronSecret = req.headers.get("x-cron-secret") || "";
    const isCronCall = Boolean(cronSecretEnv && incomingCronSecret && incomingCronSecret === cronSecretEnv);

    // ========================================================================
    // ACTION 1: TẠO SIGNED UPLOAD URL CHO 3 FILE AUDIO (HỌC VIÊN)
    // ========================================================================
    if (action === "create_upload_urls") {
      const studentName = String(body?.student_name || "").trim();
      const classCode = String(body?.class_code || "").trim().toUpperCase();
      const testId = parseInt(String(body?.test_id || "0"), 10);
      const targetLevel = String(body?.target_level || "B1").toUpperCase() === "B2" ? "B2" : "B1";
      const partsMeta = body?.parts && typeof body.parts === "object" ? body.parts : {};

      if (!studentName || studentName.length < 2) {
        return jsonResponse({ ok: false, error: "Thiếu họ tên học viên." }, 400);
      }
      if (!Number.isFinite(testId) || testId < 1 || testId > 50) {
        return jsonResponse({ ok: false, error: "Mã đề thi (test_id) không hợp lệ." }, 400);
      }

      const studentKey = normalizeStudentKey(studentName, classCode);
      const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count: recentCount } = await admin
        .from("mock_speaking_submissions")
        .select("id", { count: "exact", head: true })
        .eq("student_key", studentKey)
        .eq("test_id", testId)
        .neq("status", "uploading")
        .gte("created_at", sinceIso);

      if ((recentCount || 0) >= MAX_SUBMISSIONS_PER_TEST_24H) {
        return jsonResponse(
          { ok: false, error: `Bạn đã nộp tối đa ${MAX_SUBMISSIONS_PER_TEST_24H} lần cho Đề ${testId} trong 24 giờ qua.` },
          429
        );
      }

      const submissionId = `mock_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const folderSlug = `${toAsciiSlug(classCode || "lop", "lop")}_${toAsciiSlug(studentName, "hv")}`;
      const uploads: Record<string, { path: string; token: string; signedUrl: string }> = {};

      for (const pNum of [1, 2, 3]) {
        const meta = partsMeta[String(pNum)] || partsMeta[pNum];
        if (!meta || !meta.present) continue;
        const ext = pickAudioExtension(String(meta.mimeType || "audio/webm"));
        const objectPath = `${folderSlug}/test_${String(testId).padStart(2, "0")}/${submissionId}/part${pNum}.${ext}`;
        const { data: signedData, error: signErr } = await admin.storage
          .from(AUDIO_BUCKET)
          .createSignedUploadUrl(objectPath);

        if (signErr || !signedData) {
          return jsonResponse(
            { ok: false, error: `Không tạo được link upload Part ${pNum}: ${signErr?.message || "Storage error"}` },
            500
          );
        }
        uploads[String(pNum)] = {
          path: objectPath,
          token: signedData.token,
          signedUrl: signedData.signedUrl
        };
      }

      if (Object.keys(uploads).length === 0) {
        return jsonResponse({ ok: false, error: "Chưa có bản ghi âm nào ở Part 1, Part 2 hoặc Part 3 để nộp." }, 400);
      }

      const nowIso = new Date().toISOString();
      const { error: insErr } = await admin.from("mock_speaking_submissions").insert({
        id: submissionId,
        student_key: studentKey,
        student_name: studentName,
        class_code: classCode,
        test_id: testId,
        test_title: String(body?.test_title || `Speaking Mock Test ${String(testId).padStart(2, "0")}`).trim(),
        target_level: targetLevel,
        prompt_part1: String(body?.prompts?.part1 || "").slice(0, 4000),
        prompt_part2: String(body?.prompts?.part2 || "").slice(0, 4000),
        prompt_part3: String(body?.prompts?.part3 || "").slice(0, 4000),
        status: "uploading",
        created_at: nowIso,
        updated_at: nowIso
      });

      if (insErr) {
        return jsonResponse({ ok: false, error: `Lỗi tạo bản ghi nộp bài: ${insErr.message}` }, 500);
      }

      return jsonResponse({ ok: true, submission_id: submissionId, uploads });
    }

    // ========================================================================
    // ACTION 2: XÁC NHẬN NỘP BÀI (HẸN 6 TIẾNG, TRẢ VỀ NGAY — KHÔNG TỐN RAM)
    // ========================================================================
    if (action === "submit_and_grade") {
      const submissionId = String(body?.submission_id || "").trim();
      const studentName = String(body?.student_name || "").trim();
      const classCode = String(body?.class_code || "").trim().toUpperCase();
      if (!submissionId || !studentName) {
        return jsonResponse({ ok: false, error: "Thiếu submission_id hoặc tên học viên." }, 400);
      }

      const expectedKey = normalizeStudentKey(studentName, classCode);
      const { data: sub, error: subErr } = await admin
        .from("mock_speaking_submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();

      if (subErr || !sub) {
        return jsonResponse({ ok: false, error: "Không tìm thấy bài nộp trên hệ thống." }, 404);
      }
      if (sub.student_key !== expectedKey) {
        return jsonResponse({ ok: false, error: "Thông tin học viên không khớp với bài nộp." }, 403);
      }

      const audioPaths = body?.audio_paths && typeof body.audio_paths === "object" ? body.audio_paths : {};
      const durations = body?.durations && typeof body.durations === "object" ? body.durations : {};
      const targetLevel = String(body?.target_level || sub.target_level || "B1").toUpperCase() === "B2" ? "B2" : "B1";

      const p1Path = String(audioPaths["1"] || audioPaths[1] || sub.audio_path_p1 || "").trim();
      const p2Path = String(audioPaths["2"] || audioPaths[2] || sub.audio_path_p2 || "").trim();
      const p3Path = String(audioPaths["3"] || audioPaths[3] || sub.audio_path_p3 || "").trim();

      if (!p1Path && !p2Path && !p3Path) {
        return jsonResponse({ ok: false, error: "Chưa tải được file ghi âm nào lên hệ thống." }, 400);
      }

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const releaseAtIso = new Date(nowMs + RELEASE_DELAY_HOURS * 3600 * 1000).toISOString();

      const { error: updErr } = await admin
        .from("mock_speaking_submissions")
        .update({
          target_level: targetLevel,
          audio_path_p1: p1Path,
          audio_path_p2: p2Path,
          audio_path_p3: p3Path,
          duration_p1: Math.max(0, Math.round(Number(durations["1"] || durations[1] || 0))),
          duration_p2: Math.max(0, Math.round(Number(durations["2"] || durations[2] || 0))),
          duration_p3: Math.max(0, Math.round(Number(durations["3"] || durations[3] || 0))),
          status: "submitted",
          submitted_at: nowIso,
          release_at: releaseAtIso,
          updated_at: nowIso
        })
        .eq("id", submissionId);

      if (updErr) {
        return jsonResponse({ ok: false, error: `Lỗi xác nhận nộp bài: ${updErr.message}` }, 500);
      }

      await admin.from("mock_speaking_ai_reviews").upsert(
        {
          id: submissionId,
          submission_id: submissionId,
          student_key: sub.student_key,
          student_name: sub.student_name,
          class_code: sub.class_code || "",
          test_id: sub.test_id,
          target_level: targetLevel,
          status: "pending",
          release_at: releaseAtIso,
          retry_count: 0,
          error_message: "",
          updated_at: nowIso
        },
        { onConflict: "id" }
      );

      return jsonResponse({
        ok: true,
        submission_id: submissionId,
        status: "scheduled",
        submitted_at: nowIso,
        release_at: releaseAtIso
      });
    }

    // ========================================================================
    // ACTION 2B: CHẤM NGẦM TỪNG PART SAU KHI HỌC VIÊN NỘP (KHÔNG TRẢ REVIEW_JSON)
    // ========================================================================
    if (action === "grade_student_part") {
      if (geminiApiKeys.length === 0) {
        return jsonResponse({ ok: false, error: "Chưa cấu hình GEMINI_API_KEY." }, 500);
      }
      const submissionId = String(body?.submission_id || "").trim();
      const studentName = String(body?.student_name || "").trim();
      const classCode = String(body?.class_code || "").trim().toUpperCase();
      const partNum = parseInt(String(body?.part_num || "0"), 10) as 1 | 2 | 3;

      if (!submissionId || !studentName || ![1, 2, 3].includes(partNum)) {
        return jsonResponse({ ok: false, error: "Thiếu submission_id, tên học viên hoặc part_num (1-3)." }, 400);
      }

      const expectedKey = normalizeStudentKey(studentName, classCode);
      const { data: sub } = await admin.from("mock_speaking_submissions").select("*").eq("id", submissionId).maybeSingle();
      if (!sub || sub.student_key !== expectedKey) {
        return jsonResponse({ ok: false, error: "Không có quyền chấm bài nộp này." }, 403);
      }

      const { data: existingRev } = await admin
        .from("mock_speaking_ai_reviews")
        .select("*")
        .eq("submission_id", submissionId)
        .maybeSingle();

      if (existingRev && existingRev.status === "ready") {
        return jsonResponse({ ok: true, part_done: partNum, all_done: true, status: "scheduled" });
      }

      const res = await gradeOnePartOfSubmission(admin, geminiApiKeys, geminiModel, sub, existingRev || null, partNum, {
        releaseNow: false,
        resetExisting: false
      });

      if (!res.ok) {
        return jsonResponse({ ok: false, error: res.error }, res.status || 500);
      }
      // Tuyệt đối KHÔNG trả review_json về trình duyệt học viên
      return jsonResponse({
        ok: true,
        part_done: partNum,
        all_done: res.all_done,
        status: res.ai_status,
        release_at: res.release_at
      });
    }

    // ========================================================================
    // ACTION 3: HỌC VIÊN LẤY DANH SÁCH BÀI ĐÃ NỘP & BÀI SỬA (SERVER KHOÁ 6H)
    // ========================================================================
    if (action === "list_student_reviews") {
      const studentName = String(body?.student_name || "").trim();
      const classCode = String(body?.class_code || "").trim().toUpperCase();
      const filterTestId = body?.test_id ? parseInt(String(body.test_id), 10) : 0;

      if (!studentName) {
        return jsonResponse({ ok: true, items: [] });
      }

      const studentKey = normalizeStudentKey(studentName, classCode);
      let subQuery = admin
        .from("mock_speaking_submissions")
        .select("*")
        .eq("student_key", studentKey)
        .neq("status", "uploading")
        .order("submitted_at", { ascending: false })
        .limit(40);

      if (filterTestId > 0) subQuery = subQuery.eq("test_id", filterTestId);

      const [{ data: subs, error: subErr }, { data: revs }] = await Promise.all([
        subQuery,
        admin.from("mock_speaking_ai_reviews").select("*").eq("student_key", studentKey)
      ]);

      if (subErr) {
        return jsonResponse({ ok: false, error: `Lỗi đọc bài nộp: ${subErr.message}` }, 500);
      }

      const revById: Record<string, ReviewRow> = {};
      (revs || []).forEach((r: ReviewRow) => {
        if (r && r.submission_id) revById[r.submission_id] = r;
      });

      const nowMs = Date.now();
      const items = (subs || []).map((s: SubmissionRow) => {
        const rev = revById[s.id] || null;
        const relIso = (rev && rev.release_at) || s.release_at || "";
        const relMs = relIso ? new Date(relIso).getTime() : 0;
        const rjObj =
          rev && rev.review_json && typeof rev.review_json === "object"
            ? (rev.review_json as Record<string, unknown>)
            : null;
        const tOv =
          rjObj && rjObj.teacher_override && typeof rjObj.teacher_override === "object"
            ? (rjObj.teacher_override as Record<string, unknown>)
            : null;
        const tOvParts =
          tOv && tOv.parts && typeof tOv.parts === "object" ? (tOv.parts as Record<string, Record<string, unknown>>) : {};
        const hasManualContent = Boolean(
          tOv &&
            (String(tOv.overall_band || "").trim() ||
              String(tOv.overall_comment || "").trim() ||
              ["part1", "part2", "part3"].some(
                k => String(tOvParts?.[k]?.band || "").trim() || String(tOvParts?.[k]?.comment || "").trim()
              ))
        );
        // Nếu GV chọn "Không đồng ý AI" và chưa viết bài tự chấm thay thế -> khoá tuyệt đối không trả bản AI lỗi cho học viên
        const isBlockedByTeacherReject = Boolean(
          tOv && tOv.hide_ai_review === true && !hasManualContent
        );
        const isReadyAndReleased = Boolean(
          rev &&
            rev.status === "ready" &&
            rjObj &&
            !isBlockedByTeacherReject &&
            relMs > 0 &&
            relMs <= nowMs
        );
        const isNoAudio = s.status === "no_audio" || (rev && rev.status === "no_audio");

        return {
          submission_id: s.id,
          test_id: s.test_id,
          test_title: s.test_title || `Speaking Mock Test ${String(s.test_id).padStart(2, "0")}`,
          target_level: s.target_level || "B1",
          submitted_at: s.submitted_at || s.created_at || "",
          release_at: relIso,
          state: isNoAudio ? "no_audio" : isReadyAndReleased ? "ready" : "waiting",
          student_seen_at: isReadyAndReleased && rev ? rev.student_seen_at || null : null,
          teacher_score: s.teacher_score || "",
          teacher_feedback: s.teacher_feedback || "",
          has_p1: Boolean(s.audio_path_p1),
          has_p2: Boolean(s.audio_path_p2),
          has_p3: Boolean(s.audio_path_p3),
          review_json: isReadyAndReleased && rev ? sanitizeReviewForStudent(rjObj) : null
        };
      });

      return jsonResponse({ ok: true, server_time: new Date(nowMs).toISOString(), items });
    }

    // ========================================================================
    // ACTION 4: HỌC VIÊN ĐÁNH DẤU ĐÃ ĐỌC BÀI SỬA (CHỈ KHI ĐÃ TỚI HẠN 6 TIẾNG)
    // ========================================================================
    if (action === "mark_seen") {
      const submissionId = String(body?.submission_id || "").trim();
      const studentName = String(body?.student_name || "").trim();
      const classCode = String(body?.class_code || "").trim().toUpperCase();
      if (!submissionId || !studentName) {
        return jsonResponse({ ok: false, error: "Thiếu thông tin đánh dấu đã xem." }, 400);
      }
      const studentKey = normalizeStudentKey(studentName, classCode);
      const nowIso = new Date().toISOString();

      await admin
        .from("mock_speaking_ai_reviews")
        .update({ student_seen_at: nowIso })
        .eq("submission_id", submissionId)
        .eq("student_key", studentKey)
        .eq("status", "ready")
        .lte("release_at", nowIso)
        .is("student_seen_at", null);

      return jsonResponse({ ok: true });
    }

    // ========================================================================
    // ACTION 5: HÀNG ĐỢI TỰ ĐỘNG CHẤM LẠI (MỖI LẦN CHẤM 1 PART ĐỂ AN TOÀN RAM)
    // ========================================================================
    if (action === "process_queue") {
      if (geminiApiKeys.length === 0) {
        return jsonResponse({ ok: false, error: "Chưa cấu hình GEMINI_API_KEY." }, 500);
      }
      let isTeacher = false;
      if (!isCronCall) {
        const authCheck = await verifyTeacherFromRequest(admin, req);
        isTeacher = authCheck.isTeacher;
      }
      if (!isCronCall && !isTeacher) {
        return jsonResponse({ ok: false, error: "Chỉ hệ thống hoặc Giáo viên được chạy hàng đợi chấm bài." }, 403);
      }

      const [{ data: subs, error: subErr }, { data: revs }] = await Promise.all([
        admin
          .from("mock_speaking_submissions")
          .select("*")
          .neq("status", "uploading")
          .order("submitted_at", { ascending: false })
          .limit(80),
        admin.from("mock_speaking_ai_reviews").select("*")
      ]);

      if (subErr) {
        return jsonResponse({ ok: false, error: `Lỗi đọc hàng đợi: ${subErr.message}` }, 500);
      }

      const revById: Record<string, ReviewRow> = {};
      (revs || []).forEach((r: ReviewRow) => {
        if (r && r.submission_id) revById[r.submission_id] = r;
      });

      const nowMs = Date.now();
      const pendingList = (subs || [])
        .sort((a: SubmissionRow, b: SubmissionRow) => {
          return new Date(a.submitted_at || a.created_at || 0).getTime() - new Date(b.submitted_at || b.created_at || 0).getTime();
        })
        .filter((s: SubmissionRow) => {
          if (s.status === "no_audio") return false;
          const rev = revById[s.id];
          if (rev && (rev.status === "ready" || rev.status === "no_audio")) return false;
          if (!isTeacher && rev && (rev.retry_count || 0) >= MAX_AUTO_RETRIES) return false;
          if (!isTeacher && rev && rev.updated_at && rev.status === "error") {
            const lastMs = new Date(rev.updated_at).getTime();
            if (!isNaN(lastMs) && nowMs - lastMs < RETRY_COOLDOWN_MS) return false;
          }
          return true;
        });

      const results: Array<{ id: string; part: number; ok: boolean; all_done?: boolean; error?: string }> = [];
      // Xử lý tối đa 1 Part / 1 lượt gọi để tuyệt đối không chạm trần RAM/CPU Free Tier
      if (pendingList.length > 0) {
        const s = pendingList[0];
        const rev = revById[s.id] || null;
        const nextPart = findNextPendingPart(s, rev) || 1;
        const res = await gradeOnePartOfSubmission(admin, geminiApiKeys, geminiModel, s, rev, nextPart, {
          releaseNow: false,
          resetExisting: false
        });
        results.push({
          id: s.id,
          part: nextPart,
          ok: res.ok,
          all_done: res.ok ? res.all_done : false,
          error: res.ok ? undefined : res.error
        });
      }

      return jsonResponse({
        ok: true,
        action: "process_queue",
        pending_total: pendingList.length,
        processed: results.length,
        succeeded: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        results
      });
    }

    // ========================================================================
    // ACTION 5B: GIÁO VIÊN TẠO SIGNED UPLOAD URL ĐỂ CHUẨN HOÁ FILE CŨ SANG WAV 16KHZ
    // ========================================================================
    if (action === "teacher_prepare_wav_upgrade") {
      const authCheck = await verifyTeacherFromRequest(admin, req);
      if (!authCheck.isTeacher) {
        return jsonResponse({ ok: false, error: "Chỉ Giáo viên được thực hiện thao tác này." }, 403);
      }

      const submissionId = String(body?.submission_id || "").trim();
      const partNum = parseInt(String(body?.part_num || "0"), 10) as 1 | 2 | 3;
      if (!submissionId || ![1, 2, 3].includes(partNum)) {
        return jsonResponse({ ok: false, error: "Thiếu submission_id hoặc part_num (1-3)." }, 400);
      }

      const { data: sub, error: subErr } = await admin
        .from("mock_speaking_submissions")
        .select("id, audio_path_p1, audio_path_p2, audio_path_p3")
        .eq("id", submissionId)
        .maybeSingle();

      if (subErr || !sub) {
        return jsonResponse({ ok: false, error: "Không tìm thấy bài nộp." }, 404);
      }

      const oldPath = String(
        partNum === 1 ? sub.audio_path_p1 : partNum === 2 ? sub.audio_path_p2 : sub.audio_path_p3 || ""
      ).trim();
      if (!oldPath) {
        return jsonResponse({ ok: false, error: `Part ${partNum} không có file ghi âm.` }, 400);
      }

      const baseDir = oldPath.includes("/") ? oldPath.slice(0, oldPath.lastIndexOf("/")) : submissionId;
      const wavPath = `${baseDir}/part${partNum}_studio16k.wav`;
      const { data: signedData, error: signErr } = await admin.storage
        .from(AUDIO_BUCKET)
        .createSignedUploadUrl(wavPath, { upsert: true });

      if (signErr || !signedData?.signedUrl) {
        return jsonResponse(
          { ok: false, error: `Không tạo được link nâng cấp WAV: ${signErr?.message || "Storage error"}` },
          500
        );
      }

      return jsonResponse({
        ok: true,
        wav_path: wavPath,
        signedUrl: signedData.signedUrl,
        token: signedData.token
      });
    }

    // ========================================================================
    // ACTION 6: GIÁO VIÊN CHẤM TỪNG PART TRỰC TIẾP (AN TOÀN RAM/CPU)
    // ========================================================================
    if (action === "grade_now") {
      if (geminiApiKeys.length === 0) {
        return jsonResponse({ ok: false, error: "Chưa cấu hình GEMINI_API_KEY." }, 500);
      }
      const authCheck = await verifyTeacherFromRequest(admin, req);
      if (!authCheck.isTeacher) {
        return jsonResponse({ ok: false, error: "Chỉ Giáo viên được thực hiện thao tác này." }, 403);
      }

      const submissionId = String(body?.submission_id || "").trim();
      const releaseNow = Boolean(body?.release_now);
      const resetExisting = Boolean(body?.reset_existing);
      const requestedPart = parseInt(String(body?.part_num || "0"), 10);
      const upgradedAudioPath = String(body?.upgraded_audio_path || "").trim();

      if (!submissionId) {
        return jsonResponse({ ok: false, error: "Thiếu submission_id." }, 400);
      }

      const { data: sub, error: subErr } = await admin
        .from("mock_speaking_submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();

      if (subErr || !sub) {
        return jsonResponse({ ok: false, error: "Không tìm thấy bài nộp." }, 404);
      }

      const { data: existingRev } = await admin
        .from("mock_speaking_ai_reviews")
        .select("*")
        .eq("submission_id", submissionId)
        .maybeSingle();

      const partNum = ([1, 2, 3].includes(requestedPart)
        ? requestedPart
        : findNextPendingPart(sub, resetExisting ? null : existingRev || null) || 1) as 1 | 2 | 3;

      if (
        upgradedAudioPath &&
        upgradedAudioPath.endsWith(".wav") &&
        upgradedAudioPath.includes(submissionId)
      ) {
        const col = partNum === 1 ? "audio_path_p1" : partNum === 2 ? "audio_path_p2" : "audio_path_p3";
        await admin
          .from("mock_speaking_submissions")
          .update({ [col]: upgradedAudioPath, updated_at: new Date().toISOString() })
          .eq("id", submissionId);
        (sub as Record<string, unknown>)[col] = upgradedAudioPath;
      }

      const res = await gradeOnePartOfSubmission(admin, geminiApiKeys, geminiModel, sub, existingRev || null, partNum, {
        releaseNow,
        resetExisting
      });

      if (!res.ok) {
        return jsonResponse({ ok: false, error: res.error }, res.status || 500);
      }

      return jsonResponse({
        ok: true,
        part_done: partNum,
        all_done: res.all_done,
        status: res.ai_status,
        release_at: res.release_at,
        review_json: res.review_json || null
      });
    }

    // ========================================================================
    // ACTION 7: TẠO GIỌNG ĐỌC MẪU TỰ NHIÊN BẰNG GEMINI STUDIO TTS
    // ========================================================================
    if (action === "tts") {
      if (geminiApiKeys.length === 0) {
        return jsonResponse({ ok: false, error: "Chưa cấu hình GEMINI_API_KEY." }, 500);
      }
      const rawText = String(body?.text || "")
        .replace(/<[^>]*>?/gm, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1400);

      if (!rawText) {
        return jsonResponse({ ok: false, error: "Thiếu nội dung văn bản cần đọc." }, 400);
      }

      const ALLOWED_VOICES = new Set(["Aoede", "Kore", "Puck", "Leda", "Zephyr", "Fenrir", "Charon"]);
      const requestedVoice = String(body?.voice || "Aoede").trim();
      const voiceName = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : "Aoede";
      const wordCount = rawText.split(/\s+/).filter(Boolean).length;

      const ttsPrompt =
        wordCount <= 4
          ? `Pronounce the following English word or short phrase clearly and naturally with standard American pronunciation. Speak ONLY the exact text once without adding anything else:\n\n${rawText}`
          : `Read the following English speaking response aloud in a warm, natural, expressive human conversational tone with clear phrasing and natural pauses, as a friendly native English speaker in a VSTEP interview. Speak ONLY the exact text below without adding any introduction or commentary:\n\n${rawText}`;

      const ttsModels = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"];
      let lastStatus = 502;
      let lastErr = "";
      for (const apiKey of geminiApiKeys.slice(0, 3)) {
        for (const ttsModel of ttsModels) {
          const ttsEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ttsModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const ttsRes = await fetch(ttsEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: ttsPrompt }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName }
                  }
                }
              }
            }),
            signal: AbortSignal.timeout(25000)
          });

          if (ttsRes.ok) {
            const ttsJson = await ttsRes.json().catch(() => ({}));
            const ttsParts = Array.isArray(ttsJson?.candidates?.[0]?.content?.parts)
              ? ttsJson.candidates[0].content.parts
              : [];
            const inlineAudio = ttsParts.find((p: Record<string, unknown>) => p?.inlineData)?.inlineData;
            if (inlineAudio && inlineAudio.data) {
              return jsonResponse({
                ok: true,
                audio_base64: inlineAudio.data,
                mime_type: inlineAudio.mimeType || "audio/L16;codec=pcm;rate=24000"
              });
            }
          }
          lastStatus = ttsRes.status;
          lastErr = (await ttsRes.text().catch(() => "")).slice(0, 160);
          if (ttsRes.status === 400 || ttsRes.status === 401 || ttsRes.status === 403) break;
        }
        if (lastStatus === 400) break;
      }

      return jsonResponse({ ok: false, error: `Gemini TTS lỗi (${lastStatus}): ${lastErr}` }, 502);
    }

    return jsonResponse({ ok: false, error: `Action không hợp lệ: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định trên hệ thống chấm bài.";
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
