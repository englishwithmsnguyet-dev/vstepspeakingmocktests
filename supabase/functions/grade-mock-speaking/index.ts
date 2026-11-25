// ============================================================================
// SUPABASE EDGE FUNCTION: grade-mock-speaking
// Chấm trọn bộ bài thi thử VSTEP Speaking Mock Test (Part 1, Part 2, Part 3)
// bằng Gemini Multimodal (nghe trực tiếp 3 file ghi âm thật từ Storage):
// - Học viên giữ nguyên đăng nhập VstepAuth của web -> mọi thao tác học viên
//   đi qua Edge Function này (server khoá 6 tiếng & ẩn điểm số tuyệt đối).
// - Giáo viên xác thực qua Supabase Auth JWT + bảng public.teachers.
// - Hỗ trợ hàng đợi tự chấm lại qua pg_cron (action: "process_queue").
//
// Triển khai trên Supabase Dashboard:
// 1. Edge Functions -> Secrets:
//    - GEMINI_API_KEY = <API key từ https://aistudio.google.com/apikey>
//    - CRON_SECRET    = <chuỗi bí mật tự đặt dùng cho pg_cron>
// 2. Tạo Edge Function tên: grade-mock-speaking -> dán file này -> Deploy.
// 3. Trong Settings / Details của Function: TẮT "Verify JWT with legacy secret".
// ============================================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const AUDIO_BUCKET = "mock-speaking-recordings";
const RELEASE_DELAY_HOURS = 6;
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ============================================================================
// AUDIO REPAIR UTILITIES (SỬA FILE WEBM LỖI HEADER / INTERLEAVED TỪ TRÌNH DUYỆT)
// ============================================================================
function repairInterleavedWebmBytes(u8: Uint8Array, ebmlOff: number): Uint8Array | null {
  if (!u8 || ebmlOff < 0 || ebmlOff >= u8.length - 16) return null;
  const clusterOffsets: number[] = [];
  for (let i = ebmlOff; i <= u8.length - 12; i++) {
    if (u8[i] === 0x1f && u8[i + 1] === 0x43 && u8[i + 2] === 0xb6 && u8[i + 3] === 0x75) {
      clusterOffsets.push(i);
    }
  }
  if (clusterOffsets.length < 2) {
    return ebmlOff > 0 ? u8.slice(ebmlOff) : null;
  }

  const parseCluster = (start: number, end: number) => {
    let p = start + 4;
    const sb = u8[p];
    let sLen = 1;
    for (let bit = 0x80; bit > 0 && !(sb & bit); bit >>= 1) sLen++;
    p += sLen;
    if (p >= end || u8[p] !== 0xe7) return null;
    const tcLen = u8[p + 1] & 0x7f;
    if (tcLen === 0 || tcLen > 6 || p + 2 + tcLen > end) return null;
    let tc = 0;
    for (let k = 0; k < tcLen; k++) tc = tc * 256 + u8[p + 2 + k];
    const headerEnd = p + 2 + tcLen;
    const headerBytes = u8.slice(start, headerEnd);
    const blocks: Array<{ relTc: number; bytes: Uint8Array }> = [];
    let q = headerEnd;
    while (q < end) {
      if (u8[q] !== 0xa3) break;
      const b0 = u8[q + 1];
      let vLen = 1;
      let bSize = 0;
      if (b0 & 0x80) {
        vLen = 1;
        bSize = b0 & 0x7f;
      } else if (b0 & 0x40) {
        vLen = 2;
        bSize = ((b0 & 0x3f) << 8) | u8[q + 2];
      } else if (b0 & 0x20) {
        vLen = 3;
        bSize = ((b0 & 0x1f) << 16) | (u8[q + 2] << 8) | u8[q + 3];
      } else {
        break;
      }
      const dataStart = q + 1 + vLen;
      const blockEnd = dataStart + bSize;
      if (blockEnd > end || bSize < 4) break;
      const relTcRaw = (u8[dataStart + 1] << 8) | u8[dataStart + 2];
      const relTc = relTcRaw >= 0x8000 ? relTcRaw - 0x10000 : relTcRaw;
      blocks.push({ relTc, bytes: u8.slice(q, blockEnd) });
      q = blockEnd;
    }
    return { tc, headerBytes, blocks };
  };

  const clusters: Array<{ tc: number; headerBytes: Uint8Array; blocks: Array<{ relTc: number; bytes: Uint8Array }> }> = [];
  for (let i = 0; i < clusterOffsets.length; i++) {
    const end = i + 1 < clusterOffsets.length ? clusterOffsets[i + 1] : u8.length;
    const c = parseCluster(clusterOffsets[i], end);
    if (c) clusters.push(c);
  }
  if (clusters.length < 2) {
    return ebmlOff > 0 ? u8.slice(ebmlOff) : null;
  }

  let hasInterleaving = false;
  for (let i = 1; i < clusters.length; i++) {
    const diff = clusters[i].tc - clusters[i - 1].tc;
    if (diff < 0 || diff > 10000) {
      hasInterleaving = true;
      break;
    }
  }
  if (!hasInterleaving) {
    return ebmlOff > 0 ? u8.slice(ebmlOff) : null;
  }

  const outParts: Uint8Array[] = [u8.slice(ebmlOff, clusterOffsets[0])];
  let expectedTc = clusters[0].tc;
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    if (c.tc >= expectedTc && c.tc - expectedTc <= 5000) {
      outParts.push(c.headerBytes);
      let lastRel = -1;
      for (const blk of c.blocks) {
        if (blk.relTc > lastRel) {
          outParts.push(blk.bytes);
          lastRel = blk.relTc;
        } else {
          break;
        }
      }
      if (i + 1 < clusters.length) {
        const nextC = clusters[i + 1];
        const nextIsForeign = nextC.tc < c.tc || nextC.tc - c.tc > 10000;
        if (nextIsForeign && nextC.blocks.length > 0) {
          for (const fBlk of nextC.blocks) {
            if (fBlk.relTc >= lastRel + 40 && fBlk.relTc <= lastRel + 90) {
              outParts.push(fBlk.bytes);
              lastRel = fBlk.relTc;
            }
          }
        }
      }
      expectedTc = c.tc + 1;
    }
  }

  const totalLen = outParts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of outParts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

function trimCorruptedAudioPrefix(buffer: ArrayBuffer, fallbackMime: string): { buffer: ArrayBuffer; mimeType: string } {
  const u8 = new Uint8Array(buffer);
  if (u8.length < 16) return { buffer, mimeType: fallbackMime };
  if (u8[0] === 0x1a && u8[1] === 0x45 && u8[2] === 0xdf && u8[3] === 0xa3) {
    const deinterleaved = repairInterleavedWebmBytes(u8, 0);
    return { buffer: deinterleaved ? deinterleaved.buffer : buffer, mimeType: "audio/webm" };
  }
  if (u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) {
    return { buffer, mimeType: "audio/mp4" };
  }
  const scanMax = Math.min(u8.length - 8, 262144);
  for (let i = 1; i <= scanMax; i++) {
    if (u8[i] === 0x1a && u8[i + 1] === 0x45 && u8[i + 2] === 0xdf && u8[i + 3] === 0xa3) {
      const deinterleaved = repairInterleavedWebmBytes(u8, i);
      return { buffer: deinterleaved ? deinterleaved.buffer : buffer.slice(i), mimeType: "audio/webm" };
    }
  }
  for (let i = 4; i <= scanMax; i++) {
    if (
      u8[i] === 0x66 &&
      u8[i + 1] === 0x74 &&
      u8[i + 2] === 0x79 &&
      u8[i + 3] === 0x70 &&
      u8[i - 4] === 0x00 &&
      u8[i - 3] === 0x00
    ) {
      return { buffer: buffer.slice(i - 4), mimeType: "audio/mp4" };
    }
  }
  return { buffer, mimeType: fallbackMime };
}

function resolveCleanAudioMimeType(audioPath: string, blobType?: string): string {
  const lowerType = String(blobType || "").toLowerCase().split(";")[0].trim();
  const lowerPath = String(audioPath || "").toLowerCase();
  if (lowerType.includes("mp4") || lowerType.includes("m4a") || lowerPath.endsWith(".mp4") || lowerPath.endsWith(".m4a")) {
    return "audio/mp4";
  }
  if (lowerType.includes("ogg") || lowerPath.endsWith(".ogg")) return "audio/ogg";
  if (lowerType.includes("wav") || lowerPath.endsWith(".wav")) return "audio/wav";
  if (lowerType.includes("mpeg") || lowerType.includes("mp3") || lowerPath.endsWith(".mp3")) return "audio/mp3";
  return "audio/webm";
}

// ============================================================================
// SCORING & GUARDRAILS (QUY ĐỔI BƯỚC 0.25, LỌC LỖI CẤM, KHỬ TRÙNG LẶP)
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

function parseModelJson(rawText: string) {
  const trimmed = String(rawText || "").trim();
  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(unfenced);
}

// ============================================================================
// PROMPT BUILDER CHUYÊN BIỆT CHO TỪNG PART (PART 1 / PART 2 / PART 3)
// ============================================================================
function buildPartGradingPrompt(params: {
  partNum: 1 | 2 | 3;
  testTitle: string;
  promptText: string;
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
      "Mỗi câu hỏi nên trả lời trực tiếp, rõ ý trong 2–3 câu theo mạch A-R-E (Answer + Reason → Example → Feeling/Result), tránh trả lời cộc lốc 1 cụm từ hoặc bỏ sót câu hỏi trong 2 chủ đề.";
    levelGuidance =
      level === "B2"
        ? `Mục tiêu Level B2 (Part 1): Trả lời trọn vẹn các câu hỏi trong 2 chủ đề một cách tự nhiên, có từ nối văn nói (Honestly, Actually, I'd say, I tend to...), collocations tự nhiên và câu phức/mệnh đề quan hệ (which/who/where). KHÔNG ép dùng từ C1/C2 học thuật cứng nhắc.`
        : `Mục tiêu Level B1 (Part 1): Chỉ cần trả lời rõ ý các câu hỏi bằng tiếng Anh giao tiếp đời thường, đúng ngữ pháp cơ bản, phát âm dễ nghe. KHÔNG ép dùng từ vựng phức tạp mức B2/C1.`;
  } else if (partNum === 2) {
    partLabel = "VSTEP Speaking Part 2 (Solution Discussion — chọn 1 trong 3 lựa chọn, tối đa 3 phút nói)";
    structureGuide =
      "Bố cục 3 phần: Mở bài (dẫn nhập tình huống & chọn 1 phương án) → Thân bài (nêu 2 lý do chọn có ví dụ + giải thích tại sao KHÔNG chọn 2 phương án còn lại) → Kết bài (khẳng định lại lựa chọn).";
    levelGuidance =
      level === "B2"
        ? `Mục tiêu Level B2 (Part 2): Trình bày mạch lạc đủ 3 phần (~170–220 từ), lập luận thuyết phục cả lý do chọn lẫn phản biện 2 lựa chọn còn lại, dùng collocations tự nhiên và liên kết ý mượt mà.`
        : `Mục tiêu Level B1 (Part 2): Trình bày đủ 3 phần (~120–165 từ) với 2 lý do chọn dễ hiểu và lý do bỏ 2 phương án còn lại. Nếu học viên diễn đạt đơn giản nhưng rõ ý, đúng bố cục thì khen ngợi và giữ nguyên ý.`;
  } else {
    partLabel = "VSTEP Speaking Part 3 (Topic Development — phát triển chủ đề theo sơ đồ 3 ý gợi ý + ý riêng + trả lời câu hỏi mở rộng, tối đa 4 phút nói)";
    structureGuide =
      "Bố cục chuẩn Part 3: Mở bài (giới thiệu chủ đề & quan điểm) → Thân bài (lần lượt triển khai 3 ý gợi ý trên sơ đồ có giải thích/ví dụ + bổ sung ít nhất 1 ý riêng [your own idea]) → Kết bài (tóm tắt ngắn) → Trả lời câu hỏi mở rộng (Follow-up questions) nếu thí sinh có nói.";
    levelGuidance =
      level === "B2"
        ? `Mục tiêu Level B2 (Part 3): Phát triển đầy đủ các nhánh sơ đồ và ý riêng (~200–280 từ) với dẫn chứng thuyết phục, chuyển ý tự nhiên (Firstly, In addition, From my perspective, Another point worth mentioning is...) và trả lời rõ các câu hỏi mở rộng.`
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

ĐÃ ĐÍNH KÈM FILE GHI ÂM THẬT CỦA THÍ SINH:
- Hãy NGHE KỸ toàn bộ file ghi âm làm nguồn chính để:
  1) Phiên âm ĐẦY ĐỦ, trung thực lời nói tiếng Anh của thí sinh vào trường "recognized_transcript".
  2) Chấm trực tiếp PHÁT ÂM (độ rõ chữ, dễ nghe, trọng âm từ, đặc biệt bắt lỗi mất final sound gốc /s/, /z/ như nice, house, place, office, because, always, relax, stress, bus, class, famous...) và NGỮ ĐIỆU (lên xuống giọng tự nhiên, nhấn content words, ngắt nghỉ hợp lý hay nói đều đều/ngập ngừng).

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
4. "language_corrections": tối đa 6 mục sửa tiêu biểu. "original" phải trích NGUYÊN VĂN cụm 2–10 từ trong "recognized_transcript" để hệ thống gạch chân trực tiếp; "category" chỉ nhận đúng 1 trong 3 nhãn: "Vietlish", "Từ vựng tự nhiên", hoặc "Ngữ pháp".
5. "idea_expansions": tối đa 3 mục chỉ rõ chỗ ý tưởng còn "cụt", thiếu phần nào (VD: quên bỏ 2 phương án ở Part 2, quên ý riêng / câu hỏi mở rộng ở Part 3, hoặc trả lời quá ngắn ở Part 1) kèm 1–2 câu tiếng Anh mẫu chuẩn Level ${level} và nghĩa tiếng Việt.
6. "natural_spoken_version": viết lại 1 bài nói mẫu hoàn chỉnh, tự nhiên ở chuẩn Level ${level} dựa trên CHÍNH Ý TƯỞNG GỐC của thí sinh (ngắn gọn dễ luyện đọc lại).
7. Nếu file ghi âm im lặng / chỉ có tiếng ồn / không có tiếng Anh: đặt "internal_score": 0, "estimated_band": "Chưa đạt B1", nhắc nhẹ thí sinh kiểm tra micro và gợi ý cách trả lời trong "idea_expansions" & "natural_spoken_version".

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
    natural_spoken_version: String(raw?.natural_spoken_version || "").trim()
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

async function callGeminiAudioGrade(params: {
  geminiApiKey: string;
  geminiModel: string;
  audioBase64: string;
  audioMimeType: string;
  promptText: string;
}) {
  const RETIRED_MODELS = new Set(["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-exp"]);
  const fallbackModels = Array.from(
    new Set([
      params.geminiModel,
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash"
    ])
  ).filter(m => Boolean(m) && !RETIRED_MODELS.has(m));

  const parts: Array<Record<string, unknown>> = [
    {
      inlineData: {
        mimeType: params.audioMimeType,
        data: params.audioBase64
      }
    },
    { text: params.promptText }
  ];

  const errors: Array<{ model: string; status: number; detail: string }> = [];

  for (const modelName of fallbackModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(params.geminiApiKey)}`;
    let modelStatus = 500;
    let modelErrText = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json"
          }
        })
      });

      if (res.ok) {
        const geminiJson = await res.json();
        const rawCandidate = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = parseModelJson(rawCandidate);
        return { ok: true as const, parsed };
      }

      modelStatus = res.status;
      modelErrText = await res.text().catch(() => "");
      if ((res.status === 503 || res.status === 429 || res.status === 500) && attempt === 0) {
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      break;
    }

    errors.push({ model: modelName, status: modelStatus, detail: modelErrText.slice(0, 160) });
    if (modelStatus === 400 || modelStatus === 401 || modelStatus === 403) break;
  }

  const primary = errors.find(e => e.status !== 404) || errors[0] || { model: params.geminiModel, status: 500, detail: "" };
  const summary = errors.map(e => `${e.model}:${e.status}`).join(", ");
  return {
    ok: false as const,
    status: primary.status,
    error: `Gemini API lỗi (${primary.status}): ${primary.detail || summary}`
  };
}

async function gradeFullSubmission(
  admin: SupabaseClient,
  geminiApiKey: string,
  geminiModel: string,
  sub: SubmissionRow,
  existingReview: ReviewRow | null,
  options: { releaseNow?: boolean }
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

  const partSpecs: Array<{
    partNum: 1 | 2 | 3;
    audioPath: string;
    durationSec: number;
    promptText: string;
    weight: number;
  }> = [
    {
      partNum: 1,
      audioPath: String(sub.audio_path_p1 || "").trim(),
      durationSec: Number(sub.duration_p1) || 0,
      promptText: String(sub.prompt_part1 || "").trim(),
      weight: 0.25
    },
    {
      partNum: 2,
      audioPath: String(sub.audio_path_p2 || "").trim(),
      durationSec: Number(sub.duration_p2) || 0,
      promptText: String(sub.prompt_part2 || "").trim(),
      weight: 0.35
    },
    {
      partNum: 3,
      audioPath: String(sub.audio_path_p3 || "").trim(),
      durationSec: Number(sub.duration_p3) || 0,
      promptText: String(sub.prompt_part3 || "").trim(),
      weight: 0.4
    }
  ];

  const hasAnyAudioPath = partSpecs.some(p => Boolean(p.audioPath));
  if (!hasAnyAudioPath) {
    const noAudioMsg = "Bài nộp không có tệp ghi âm nào ở cả 3 Part. Học viên cần kiểm tra Micro và làm lại bài thi.";
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

  await admin
    .from("mock_speaking_submissions")
    .update({ status: "grading", release_at: releaseAtIso, updated_at: nowIso })
    .eq("id", sub.id);

  const partResults: Record<string, ReturnType<typeof normalizePartReview>> = {};
  let gradedAudioCount = 0;

  for (const spec of partSpecs) {
    const partKey = `part${spec.partNum}`;
    if (!spec.audioPath) {
      partResults[partKey] = buildSkippedPartReview(spec.partNum);
      continue;
    }

    let audioBase64 = "";
    let audioMimeType = "audio/webm";
    try {
      const { data: audioBlob, error: dlErr } = await admin.storage.from(AUDIO_BUCKET).download(spec.audioPath);
      if (!dlErr && audioBlob && audioBlob.size >= 200) {
        const rawAb = await audioBlob.arrayBuffer();
        const rawMime = resolveCleanAudioMimeType(spec.audioPath, audioBlob.type);
        const cleaned = trimCorruptedAudioPrefix(rawAb, rawMime);
        audioBase64 = arrayBufferToBase64(cleaned.buffer);
        audioMimeType = cleaned.mimeType;
      }
    } catch (_e) {
      // handled below
    }

    if (!audioBase64) {
      partResults[partKey] = buildSkippedPartReview(spec.partNum);
      continue;
    }

    const promptText = buildPartGradingPrompt({
      partNum: spec.partNum,
      testTitle,
      promptText: spec.promptText,
      durationSec: spec.durationSec,
      targetLevel
    });

    const gemRes = await callGeminiAudioGrade({
      geminiApiKey,
      geminiModel,
      audioBase64,
      audioMimeType,
      promptText
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
          error_message: `[Part ${spec.partNum}] ${gemRes.error.slice(0, 220)}`,
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
        error: `AI tạm quá tải ở Part ${spec.partNum} — đã xếp hàng đợi tự chấm lại (lần ${nextRetry}/${MAX_AUTO_RETRIES}).`
      };
    }

    gradedAudioCount++;
    partResults[partKey] = normalizePartReview(gemRes.parsed || {}, spec.partNum);
    // Nhịp nghỉ ngắn 500ms giữa các Part để tránh vượt rate-limit burst của Gemini
    if (spec.partNum < 3) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (gradedAudioCount === 0) {
    const noAudioMsg = "Không tải được dữ liệu âm thanh hợp lệ từ các file ghi âm đã nộp.";
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
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );
    await admin.from("mock_speaking_submissions").update({ status: "no_audio", updated_at: new Date().toISOString() }).eq("id", sub.id);
    return { ok: false, status: 400, error: noAudioMsg };
  }

  // Tính điểm tổng nội bộ VSTEP Speaking (P1: 25%, P2: 35%, P3: 40%) làm tròn 0.25
  const p1 = partResults.part1;
  const p2 = partResults.part2;
  const p3 = partResults.part3;
  const rawWeighted = p1.internal_score * 0.25 + p2.internal_score * 0.35 + p3.internal_score * 0.4;
  const overallScore = roundQuarterStep(rawWeighted);
  const overallBand = scoreToBandLabel(overallScore);

  const completedPartsText = [1, 2, 3]
    .filter(n => !partResults[`part${n}`].skipped)
    .map(n => `Part ${n} (${partResults[`part${n}`].estimated_band})`)
    .join(", ");
  const skippedParts = [1, 2, 3].filter(n => partResults[`part${n}`].skipped);

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
  const doneIso = new Date().toISOString();

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
    ai_status: isAlreadyReleased ? "ready" : "scheduled",
    release_at: releaseAtIso,
    review_json: fullReviewJson
  };
}

// Ẩn tuyệt đối mọi điểm số nội bộ khi trả bài sửa về cho học viên
function sanitizeReviewForStudent(reviewJson: Record<string, unknown> | null) {
  if (!reviewJson || typeof reviewJson !== "object") return null;
  const clone = JSON.parse(JSON.stringify(reviewJson));
  delete clone.overall_score;
  delete clone.internal_score;
  if (clone.parts && typeof clone.parts === "object") {
    ["part1", "part2", "part3"].forEach(k => {
      if (clone.parts[k] && typeof clone.parts[k] === "object") {
        delete clone.parts[k].internal_score;
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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
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

      // Chống spam: giới hạn tối đa 5 lượt nộp / 1 đề / 24 giờ cho mỗi học viên
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

      return jsonResponse({
        ok: true,
        submission_id: submissionId,
        uploads
      });
    }

    // ========================================================================
    // ACTION 2: XÁC NHẬN ĐÃ UPLOAD XONG 3 PART -> HẸN 6 TIẾNG & CHẤM NGẦM
    // ========================================================================
    if (action === "submit_and_grade") {
      if (!geminiApiKey) {
        return jsonResponse({ ok: false, error: "Chưa cấu hình GEMINI_API_KEY trong Edge Functions Secrets." }, 500);
      }
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

      const updatedSub: SubmissionRow = {
        ...sub,
        target_level: targetLevel,
        audio_path_p1: p1Path,
        audio_path_p2: p2Path,
        audio_path_p3: p3Path,
        duration_p1: Math.max(0, Math.round(Number(durations["1"] || durations[1] || 0))),
        duration_p2: Math.max(0, Math.round(Number(durations["2"] || durations[2] || 0))),
        duration_p3: Math.max(0, Math.round(Number(durations["3"] || durations[3] || 0))),
        status: "submitted",
        submitted_at: nowIso,
        release_at: releaseAtIso
      };

      const { error: updErr } = await admin
        .from("mock_speaking_submissions")
        .update({
          target_level: updatedSub.target_level,
          audio_path_p1: updatedSub.audio_path_p1,
          audio_path_p2: updatedSub.audio_path_p2,
          audio_path_p3: updatedSub.audio_path_p3,
          duration_p1: updatedSub.duration_p1,
          duration_p2: updatedSub.duration_p2,
          duration_p3: updatedSub.duration_p3,
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

      // Chấm ngầm ngay bằng EdgeRuntime.waitUntil để học viên nhận phản hồi tức thì,
      // không lo timeout trình duyệt; nếu lỗi/quá tải thì pg_cron sẽ tự chấm lại sau 5 phút.
      const bgTask = gradeFullSubmission(admin, geminiApiKey, geminiModel, updatedSub, null, {
        releaseNow: false
      }).catch(() => {});

      const edgeRt = (globalThis as Record<string, unknown>).EdgeRuntime as
        | { waitUntil?: (p: Promise<unknown>) => void }
        | undefined;
      if (edgeRt && typeof edgeRt.waitUntil === "function") {
        edgeRt.waitUntil(bgTask);
      } else {
        await bgTask;
      }

      return jsonResponse({
        ok: true,
        submission_id: submissionId,
        status: "scheduled",
        submitted_at: nowIso,
        release_at: releaseAtIso
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

      if (filterTestId > 0) {
        subQuery = subQuery.eq("test_id", filterTestId);
      }

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
        const isReadyAndReleased = Boolean(
          rev && rev.status === "ready" && rev.review_json && relMs > 0 && relMs <= nowMs
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
          review_json: isReadyAndReleased && rev ? sanitizeReviewForStudent(rev.review_json || null) : null
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
    // ACTION 5: HÀNG ĐỢI TỰ ĐỘNG CHẤM LẠI (pg_cron MỖI 5 PHÚT HOẶC GIÁO VIÊN)
    // ========================================================================
    if (action === "process_queue") {
      if (!geminiApiKey) {
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

      const batchSize = Math.max(1, Math.min(3, Number(body?.batch_size) || 2));
      const [{ data: subs, error: subErr }, { data: revs }] = await Promise.all([
        admin
          .from("mock_speaking_submissions")
          .select("*")
          .neq("status", "uploading")
          .order("submitted_at", { ascending: false })
          .limit(100),
        admin.from("mock_speaking_ai_reviews").select("id, submission_id, status, retry_count, release_at, updated_at")
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
          // Nếu đang kẹt trạng thái grading quá 3 phút thì cho chấm lại
          if (s.status === "grading" && !isTeacher) {
            const updMs = new Date(s.updated_at || s.submitted_at || 0).getTime();
            if (!isNaN(updMs) && nowMs - updMs < 3 * 60 * 1000) return false;
          }
          return true;
        });

      const slice = pendingList.slice(0, batchSize);
      const results: Array<{ id: string; ok: boolean; error?: string }> = [];

      for (const s of slice) {
        const res = await gradeFullSubmission(admin, geminiApiKey, geminiModel, s, revById[s.id] || null, {
          releaseNow: false
        });
        results.push({ id: s.id, ok: res.ok, error: res.ok ? undefined : res.error });
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
    // ACTION 6: GIÁO VIÊN CHẤM / CHẤM LẠI TRỰC TIẾP 1 BÀI THI THỬ
    // ========================================================================
    if (action === "grade_now") {
      if (!geminiApiKey) {
        return jsonResponse({ ok: false, error: "Chưa cấu hình GEMINI_API_KEY." }, 500);
      }
      const authCheck = await verifyTeacherFromRequest(admin, req);
      if (!authCheck.isTeacher) {
        return jsonResponse({ ok: false, error: "Chỉ Giáo viên được thực hiện thao tác này." }, 403);
      }

      const submissionId = String(body?.submission_id || "").trim();
      const releaseNow = Boolean(body?.release_now);
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

      const res = await gradeFullSubmission(admin, geminiApiKey, geminiModel, sub, existingRev || null, {
        releaseNow
      });

      if (!res.ok) {
        return jsonResponse({ ok: false, error: res.error }, res.status || 500);
      }

      return jsonResponse({
        ok: true,
        status: res.ai_status,
        release_at: res.release_at,
        review_json: res.review_json
      });
    }

    return jsonResponse({ ok: false, error: `Action không hợp lệ: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định trên hệ thống chấm bài.";
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
