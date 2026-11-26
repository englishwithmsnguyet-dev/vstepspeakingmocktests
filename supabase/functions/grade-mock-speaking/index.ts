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

function resolveAudioMimeFromMeta(contentType: string | null, audioPath: string): string {
  const lowerType = String(contentType || "").toLowerCase().split(";")[0].trim();
  const lowerPath = String(audioPath || "").toLowerCase();
  if (lowerPath.endsWith(".wav") || lowerType.includes("wav")) return "audio/wav";
  if (lowerPath.endsWith(".mp4") || lowerPath.endsWith(".m4a") || lowerType.includes("mp4") || lowerType.includes("m4a")) {
    return "audio/mp4";
  }
  if (lowerPath.endsWith(".ogg") || lowerType.includes("ogg")) return "audio/ogg";
  if (lowerPath.endsWith(".mp3") || lowerType.includes("mpeg") || lowerType.includes("mp3")) return "audio/mp3";
  return "audio/webm";
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
- TUYỆT ĐỐI KHÔNG tự bịa thêm câu nói hay ý tưởng mà thí sinh không nói! Mọi nhận xét, cụm trích dẫn "original" trong "language_corrections", và từ cần chỉnh trong "pronunciation_fixes" PHẢI xuất phát 100% từ bài nói thực tế của thí sinh trong file ghi âm và bản chép nguyên văn ở trên.
- Nếu thí sinh nói lạc đề, nói tiếng Việt, nói quá ngắn hoặc chỉ nói vài câu rời rạc, hãy chấm THẲNG THẮN đúng thực tế.
- Nếu trong bản chép có vài chỗ "[...]" do giọng học viên hơi nhỏ hoặc nghẹt mic, hãy chấm bình thường dựa trên toàn bộ phần nghe được và nhắc nhẹ thí sinh nói to, rõ hơn trong mục Phát âm & Ngữ điệu (không tự đánh 0 điểm oan).
- Giữ nguyên bản chép thực tế vào "recognized_transcript" (chỉ thêm dấu chấm/phẩy tối thiểu cho dễ đọc, KHÔNG thay từ hay sửa lỗi trong "recognized_transcript").
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

// ============================================================================
// ZERO-COPY STREAMING: PIPE TRỰC TIẾP TỪ SUPABASE STORAGE SANG GEMINI FILES API
// Hầu như 0 MB RAM & 0 ms CPU dù file ghi âm dài 4 phút (WAV 7-8 MB hay WebM)
// ============================================================================
async function streamStorageUrlToGeminiFilesApi(
  geminiApiKey: string,
  signedAudioUrl: string,
  audioPath: string
): Promise<{ ok: true; fileUri: string; fileName: string; mimeType: string } | { ok: false; status: number; error: string }> {
  const dlRes = await fetch(signedAudioUrl, { signal: AbortSignal.timeout(25000) });
  if (!dlRes.ok || !dlRes.body) {
    return {
      ok: false,
      status: dlRes.status || 404,
      error: `Không tải được file ghi âm từ Storage (HTTP ${dlRes.status}).`
    };
  }

  const contentLength = dlRes.headers.get("content-length");
  if (contentLength && Number(contentLength) < 200) {
    try {
      await dlRes.body.cancel();
    } catch (_e) {}
    return { ok: false, status: 400, error: "File ghi âm rỗng hoặc quá ngắn (< 200 bytes)." };
  }

  const mimeType = resolveAudioMimeFromMeta(dlRes.headers.get("content-type"), audioPath);
  const uploadHeaders: Record<string, string> = { "Content-Type": mimeType };
  if (contentLength) uploadHeaders["Content-Length"] = contentLength;

  const uploadEndpoint = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key=${encodeURIComponent(geminiApiKey)}`;
  const upRes = await fetch(uploadEndpoint, {
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
  let state = String(fileObj.state || "ACTIVE").toUpperCase();

  if (!fileUri) {
    return { ok: false, status: 500, error: "Gemini Files API không trả về fileUri." };
  }

  if (state !== "ACTIVE" && fileName) {
    for (let i = 0; i < 6; i++) {
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

  return { ok: true, fileUri, fileName, mimeType };
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

async function callGeminiAudioGradeWithSingleKey(params: {
  geminiApiKey: string;
  geminiModel: string;
  signedAudioUrl: string;
  audioPath: string;
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
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ]);
  // Dùng alias chính thức mới nhất (tương thích cả API key mới tạo lẫn key cũ)
  const fallbackModels = Array.from(
    new Set([params.geminiModel, "gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"])
  )
    .filter(m => Boolean(m) && !RETIRED_MODELS.has(m))
    .slice(0, 3);

  const callModel = async (
    parts: Array<Record<string, unknown>>,
    temperature: number,
    expectJson: boolean
  ) => {
    const errors: Array<{ model: string; status: number; detail: string }> = [];
    for (const modelName of fallbackModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(params.geminiApiKey)}`;
      const genCfg: Record<string, unknown> = { temperature };
      if (expectJson) genCfg.responseMimeType = "application/json";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: genCfg
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (res.ok) {
        const geminiJson = await res.json();
        const rawCandidate = String(geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
        return { ok: true as const, rawText: rawCandidate };
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
    // BƯỚC 1: CHÉP NGUYÊN VĂN ĐỘC LẬP (CỐ GẮNG NGHE KỸ CẢ GIỌNG NHỎ / GIỌNG VIỆT, CHỈ BÁO TOO_QUIET KHI HOÀN TOÀN IM LẶNG)
    const blindTranscribePrompt =
      "Listen VERY carefully to the attached audio recording of a Vietnamese student speaking English. " +
      "The microphone volume may be quiet/soft and the speaker may have a Vietnamese accent — listen closely and transcribe EVERY spoken word you can hear.\n" +
      "Rules:\n" +
      "1. Do NOT give up just because the voice is soft, quiet, or accented. Strain to hear and transcribe all audible speech accurately.\n" +
      "2. Transcribe ONLY what is actually spoken in the audio; never invent answers. If a specific word or brief segment is truly muffled, write [...] for that brief part and keep transcribing the rest.\n" +
      "3. Keep the speaker's exact words, grammar mistakes, and hesitations without fixing them.\n" +
      "4. Output ONLY the plain transcript text (no labels, no markdown, no commentary).\n" +
      "5. ONLY output [TOO_QUIET] if the ENTIRE recording contains literally ZERO audible human speech (100% silence or pure static/noise from start to finish).";

    const step1 = await callModel(
      [
        { fileData: { mimeType: uploaded.mimeType, fileUri: uploaded.fileUri } },
        { text: blindTranscribePrompt }
      ],
      0.0,
      false
    );

    if (!step1.ok) return step1;

    const rawVerbatim = step1.rawText.replace(/^["'“]+|["'”]+$/g, "").trim();
    const meaningfulWords = rawVerbatim
      .replace(/\[\.\.\.\]/g, " ")
      .replace(/[^a-zA-ZÀ-ỹ0-9'\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const isUnintelligible =
      !rawVerbatim ||
      /^\[?(?:SILENT|TOO_QUIET|UNINTELLIGIBLE|NO_SPEECH)\]?$/i.test(rawVerbatim) ||
      meaningfulWords.length < 2;

    // Chỉ báo "quá nhỏ / không nhận diện được" khi gần như không nghe được bất kỳ lời nói nào
    if (isUnintelligible) {
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
          natural_spoken_version: ""
        }
      };
    }

    const verifiedTranscript = rawVerbatim;

    // BƯỚC 2: CHẤM MULTIMODAL (GỬI CÙNG FILE AUDIO + BẢN CHÉP NGUYÊN VĂN BƯỚC 1 + ĐỀ BÀI)
    const gradingPrompt = params.buildGradingPrompt(verifiedTranscript);
    const step2 = await callModel(
      [
        { fileData: { mimeType: uploaded.mimeType, fileUri: uploaded.fileUri } },
        { text: gradingPrompt }
      ],
      0.2,
      true
    );

    if (!step2.ok) return step2;

    const parsed = parseModelJson(step2.rawText);
    parsed.recognized_transcript = verifiedTranscript || "";
    return { ok: true as const, parsed };
  } finally {
    await deleteGeminiFileBestEffort(params.geminiApiKey, uploaded.fileName);
  }
}

async function callGeminiAudioGradeStreaming(params: {
  geminiApiKeys: string[];
  geminiModel: string;
  signedAudioUrl: string;
  audioPath: string;
  buildGradingPrompt: (verifiedTranscript: string) => string;
}) {
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
      const gemRes = await callGeminiAudioGradeStreaming({
        geminiApiKeys,
        geminiModel,
        signedAudioUrl: signedData.signedUrl,
        audioPath: targetAudioPath,
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
            const inlineAudio = ttsJson?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
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
