// ============================================================================
// VSTEP SPEAKING MOCK TESTS — FRONTEND AI GRADING MODULE (PART 1, 2, 3)
// Tự động hoạt động trên cả:
//   1. Trang đề thi (`test 1/test01-index.html` .. `test 17/test17-index.html`):
//      Gắn khung "Nộp bài thi (3 Part) để chấm điểm AI" ngay trong #view-review
//   2. Trang chủ (`index.html`):
//      Gắn chuông thông báo 🔔, nút Trang Giáo viên (khi đăng nhập GV) và khu vực
//      "Bài thi đã nộp & Kết quả sửa bài AI" ngay trên LỊCH SỬ THI THỬ.
// ============================================================================

(function () {
  const CFG = window.VSTEP_SPEAKING_GRADER_CONFIG || {};
  const RELEASE_HOURS = Number(CFG.releaseDelayHours) || 6;
  const EDGE_FN = String(CFG.edgeFunctionName || "grade-mock-speaking").trim();

  function getBaseUrl() {
    return String(CFG.url || "").trim().replace(/\/+$/, "");
  }

  function getAnonKey() {
    return String(CFG.anonKey || "").trim();
  }

  function isConfigured() {
    const u = getBaseUrl();
    const k = getAnonKey();
    return Boolean(u && k && !u.includes("THAY-BANG") && !k.includes("THAY-BANG"));
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    const pad = n => (n < 10 ? "0" + n : "" + n);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatRemainingTime(isoReleaseAt) {
    if (!isoReleaseAt) return "";
    const targetMs = new Date(isoReleaseAt).getTime();
    if (isNaN(targetMs)) return "";
    const diffMs = targetMs - Date.now();
    if (diffMs <= 0) return "";
    const totalMins = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`;
    if (hours > 0) return `${hours} giờ`;
    return `${Math.max(1, mins)} phút`;
  }

  // ==========================================================================
  // NATURAL NEURAL TEXT-TO-SPEECH (GEMINI STUDIO TTS + CACHE + SMART FALLBACK)
  // ==========================================================================
  const ttsBlobUrlCache = {};
  let activeTtsAudio = null;
  let activeTtsBtn = null;
  let activeTtsOrigHtml = "";
  let ttsReqSeq = 0;

  function stopActiveTts() {
    ttsReqSeq++;
    if (activeTtsAudio) {
      try {
        activeTtsAudio.pause();
        activeTtsAudio.currentTime = 0;
      } catch (e) {}
      activeTtsAudio = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (activeTtsBtn) {
      activeTtsBtn.innerHTML = activeTtsOrigHtml;
      activeTtsBtn.disabled = false;
      activeTtsBtn = null;
      activeTtsOrigHtml = "";
    }
  }

  function pcmBase64ToWavUrl(base64Str, mimeType) {
    const m = String(mimeType || "").toLowerCase();
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Nếu đã là WAV/MP3/OGG sẵn thì phát trực tiếp
    if (m.includes("wav") || m.includes("mpeg") || m.includes("mp3") || m.includes("ogg")) {
      return URL.createObjectURL(new Blob([bytes], { type: m.split(";")[0] || "audio/wav" }));
    }

    // Gắn header WAV chuẩn cho PCM 16-bit mono từ Gemini TTS (mặc định 24000Hz)
    const rateMatch = m.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const dataSize = bytes.byteLength;
    const wavBuf = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuf);
    const writeStr = (off, s) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);
    new Uint8Array(wavBuf, 44).set(bytes);
    return URL.createObjectURL(new Blob([wavBuf], { type: "audio/wav" }));
  }

  function pickBestNaturalBrowserVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const enVoices = voices.filter(v => /^en[-_](US|GB|AU)/i.test(v.lang || ""));
    if (enVoices.length === 0) return null;

    const preferredPatterns = [
      /Microsoft\s+(Aria|Jenny|Guy|Ana|Sonia|Libby).*Online.*Natural/i,
      /Google\s+US\s+English/i,
      /Google\s+UK\s+English\s+Female/i,
      /\b(Ava|Zoe|Samantha|Nicky|Allison|Susan|Daniel)\b.*(Premium|Enhanced|Neural)/i,
      /Samantha/i
    ];
    for (const re of preferredPatterns) {
      const hit = enVoices.find(v => re.test(v.name || ""));
      if (hit) return hit;
    }
    return enVoices.find(v => /^en[-_]US/i.test(v.lang || "")) || enVoices[0];
  }

  function playBrowserFallbackTts(cleanText, triggerBtn, origHtml, seqId) {
    if (!("speechSynthesis" in window)) {
      if (triggerBtn && activeTtsBtn === triggerBtn) stopActiveTts();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleanText);
      u.lang = "en-US";
      u.rate = 0.94;
      u.pitch = 1.0;
      const bestVoice = pickBestNaturalBrowserVoice();
      if (bestVoice) u.voice = bestVoice;
      if (triggerBtn && seqId === ttsReqSeq) {
        triggerBtn.innerHTML = "⏹ Dừng";
      }
      u.onend = () => {
        if (seqId === ttsReqSeq) stopActiveTts();
      };
      u.onerror = () => {
        if (seqId === ttsReqSeq) stopActiveTts();
      };
      window.speechSynthesis.speak(u);
    } catch (e) {
      if (seqId === ttsReqSeq) stopActiveTts();
    }
  }

  async function speakEnglishText(rawText, triggerBtn) {
    const clean = String(rawText || "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
    if (!clean) return;

    // Bấm lại đúng nút đang phát -> dừng ngay
    if (triggerBtn && activeTtsBtn === triggerBtn) {
      stopActiveTts();
      return;
    }

    stopActiveTts();
    const mySeq = ++ttsReqSeq;
    const origHtml = triggerBtn ? triggerBtn.innerHTML : "";
    if (triggerBtn) {
      activeTtsBtn = triggerBtn;
      activeTtsOrigHtml = origHtml;
    }

    const playWavUrl = url => {
      if (mySeq !== ttsReqSeq) return;
      const audio = new Audio(url);
      activeTtsAudio = audio;
      if (triggerBtn) triggerBtn.innerHTML = "⏹ Dừng";
      audio.onended = () => {
        if (mySeq === ttsReqSeq) stopActiveTts();
      };
      audio.onerror = () => {
        if (mySeq === ttsReqSeq) playBrowserFallbackTts(clean, triggerBtn, origHtml, mySeq);
      };
      audio.play().catch(() => {
        if (mySeq === ttsReqSeq) playBrowserFallbackTts(clean, triggerBtn, origHtml, mySeq);
      });
    };

    // 1. Nếu đã có sẵn trong bộ nhớ đệm -> phát tức thì
    if (ttsBlobUrlCache[clean]) {
      playWavUrl(ttsBlobUrlCache[clean]);
      return;
    }

    // 2. Gọi Gemini Studio TTS (giọng người thật tự nhiên) qua Edge Function
    if (isConfigured()) {
      if (triggerBtn) triggerBtn.innerHTML = "⏳ Đang tạo giọng...";
      const res = await callEdgeFunction({
        action: "tts",
        text: clean,
        voice: "Aoede"
      });
      if (mySeq !== ttsReqSeq) return;

      if (res.ok && res.audio_base64) {
        try {
          const wavUrl = pcmBase64ToWavUrl(res.audio_base64, res.mime_type);
          ttsBlobUrlCache[clean] = wavUrl;
          playWavUrl(wavUrl);
          return;
        } catch (e) {}
      }
    }

    // 3. Dự phòng thông minh bằng giọng Neural tốt nhất trên trình duyệt
    playBrowserFallbackTts(clean, triggerBtn, origHtml, mySeq);
  }

  function getStudentIdentity() {
    if (typeof window.VstepAuth !== "undefined" && typeof window.VstepAuth.getStudentInfo === "function") {
      const info = window.VstepAuth.getStudentInfo() || {};
      const name = String(info.name || "").trim();
      const classCode = String(info.classCode || "").trim().toUpperCase();
      if (name && name !== "Học viên") {
        return { name, classCode };
      }
    }
    const name =
      (localStorage.getItem("vstep_student_name") || sessionStorage.getItem("vstep_student_name") || "").trim();
    const classCode = (
      localStorage.getItem("vstep_student_class") ||
      sessionStorage.getItem("vstep_student_class") ||
      ""
    )
      .trim()
      .toUpperCase();
    return { name, classCode };
  }

  function isCurrentUserTeacherInWeb() {
    try {
      if (typeof window.VstepAuth !== "undefined" && typeof window.VstepAuth.isTeacher === "function") {
        const id = getStudentIdentity();
        return Boolean(window.VstepAuth.isTeacher(id.name, id.classCode));
      }
    } catch (e) {}
    return getStudentIdentity().classCode === "GV";
  }

  async function callEdgeFunction(payload, bearerToken, signal) {
    if (!isConfigured()) {
      return {
        ok: false,
        error: "Chưa điền Supabase URL & Anon Key trong file speaking-grader-config.js."
      };
    }
    const headers = {
      "Content-Type": "application/json",
      apikey: getAnonKey()
    };
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }
    try {
      const fetchOpts = {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      };
      if (signal) fetchOpts.signal = signal;
      const res = await fetch(`${getBaseUrl()}/functions/v1/${EDGE_FN}`, fetchOpts);
      const raw = await res.text().catch(() => "");
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (e) {}
      if (!res.ok || !parsed || parsed.ok !== true) {
        const msg = (parsed && (parsed.error || parsed.message)) || raw.slice(0, 200) || `HTTP ${res.status}`;
        return { ok: false, error: msg };
      }
      return parsed;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return { ok: false, aborted: true, error: "Đã dừng chấm theo yêu cầu." };
      }
      return { ok: false, error: err && err.message ? err.message : "Lỗi kết nối máy chủ chấm bài." };
    }
  }

  // ==========================================================================
  // SHARED REVIEW HTML RENDERER (DÙNG CHUNG CHO HỌC VIÊN & TRANG GIÁO VIÊN)
  // ==========================================================================
  function getBandToneClass(band) {
    const low = String(band || "").toLowerCase();
    if (low.includes("chưa đạt")) return "band-below";
    if (low.includes("xấp xỉ")) return "band-approx";
    return "band-achieved";
  }

  function getCategoryClass(cat) {
    const low = String(cat || "").toLowerCase();
    if (low.includes("vietlish") || low.includes("việt")) return "vietlish";
    if (low.includes("từ vựng") || low.includes("tự nhiên") || low.includes("vocab")) return "vocab";
    return "grammar";
  }

  function buildInlineHighlightedTranscript(text, corrections) {
    const clean = String(text || "").trim();
    const list = Array.isArray(corrections) ? corrections : [];
    if (!clean) {
      return `<span style="color:#b91c1c;font-style:italic;font-weight:600;">(Bài nói quá nhỏ và hệ thống không nhận diện được lời nói rõ ràng trong bản ghi âm này)</span>`;
    }
    if (list.length === 0) return `“${escapeHtml(clean)}”`;

    const lower = clean.toLowerCase();
    const occupied = [];
    const matches = [];
    const overlaps = (s, e) => occupied.some(r => s < r.end && e > r.start);

    list.forEach((c, idx) => {
      const needle = String(c.original || "").trim();
      if (!needle) return;
      const num = c.id || idx + 1;
      let from = 0;
      while (from < clean.length) {
        let pos = clean.indexOf(needle, from);
        if (pos === -1) pos = lower.indexOf(needle.toLowerCase(), from);
        if (pos === -1) break;
        const end = pos + needle.length;
        if (!overlaps(pos, end)) {
          occupied.push({ start: pos, end });
          matches.push({
            start: pos,
            end,
            num,
            original: clean.slice(pos, end),
            corrected: String(c.corrected || ""),
            explanation: String(c.explanation_vi || "")
          });
          break;
        }
        from = pos + 1;
      }
    });

    if (matches.length === 0) return `“${escapeHtml(clean)}”`;
    matches.sort((a, b) => a.start - b.start);

    let out = "“";
    let cursor = 0;
    matches.forEach(m => {
      if (m.start > cursor) out += escapeHtml(clean.slice(cursor, m.start));
      out += `<span title="${escapeHtml(`#${m.num}: ${m.explanation}`)}"><del class="sg-del">${escapeHtml(m.original)}</del><ins class="sg-ins">${escapeHtml(m.corrected)}</ins><sup class="sg-sup">[${m.num}]</sup></span>`;
      cursor = m.end;
    });
    if (cursor < clean.length) out += escapeHtml(clean.slice(cursor));
    out += "”";
    return out;
  }

  function renderSpeakMiniBtn(text, label) {
    const clean = String(text || "").trim();
    if (!clean) return "";
    return `<button type="button" class="sg-speak-btn" data-sg-speak="${escapeHtml(clean)}">🔊 ${escapeHtml(label || "Nghe")}</button>`;
  }

  function renderSinglePartPanelHtml(partObj, partLabel, targetLevel, isTeacherView) {
    if (!partObj || partObj.skipped) {
      return `<div class="sg-alert info">⚠️ ${escapeHtml((partObj && partObj.overall_comment) || `Chưa có bản ghi âm cho ${partLabel}.`)}</div>`;
    }
    const band = String(partObj.estimated_band || "");
    const score =
      isTeacherView && partObj.internal_score !== undefined && partObj.internal_score !== null
        ? Number(partObj.internal_score)
        : null;
    const crit = partObj.criteria || {};
    const pronFixes = Array.isArray(partObj.pronunciation_fixes) ? partObj.pronunciation_fixes : [];
    const corrections = Array.isArray(partObj.language_corrections) ? partObj.language_corrections : [];
    const ideas = Array.isArray(partObj.idea_expansions) ? partObj.idea_expansions : [];
    const revised = String(partObj.natural_spoken_version || "").trim();

    const critList = [
      { k: "pronunciation_intonation", label: "🎙️ Phát âm & Ngữ điệu" },
      { k: "grammar", label: "📐 Ngữ pháp & Chia thì" },
      { k: "vocabulary_vietlish", label: "💬 Dùng từ tự nhiên & Vietlish" },
      { k: "coherence_logic", label: "🧭 Bố cục & Mạch logic" }
    ].filter(c => crit[c.k]);

    return `
      <div class="sg-badges-row">
        <span class="sg-badge">${escapeHtml(partLabel)} · Mục tiêu ${escapeHtml(targetLevel)}</span>
        ${band ? `<span class="sg-badge ${getBandToneClass(band)}">Đánh giá: ${escapeHtml(band)}</span>` : ""}
        ${score !== null && Number.isFinite(score) ? `<span class="sg-badge teacher-score">Điểm phần này (GV): ${score.toFixed(2)}/10</span>` : ""}
      </div>
      ${partObj.overall_comment ? `<p class="sg-overall-comment">${escapeHtml(partObj.overall_comment)}</p>` : ""}

      ${
        critList.length > 0
          ? `<div class="sg-criteria-grid">${critList
              .map(
                c => `
            <div class="sg-criteria-card">
              <div class="sg-criteria-label">${escapeHtml(c.label)}</div>
              <div class="sg-criteria-text">${escapeHtml(crit[c.k])}</div>
            </div>`
              )
              .join("")}</div>`
          : ""
      }

      <div class="sg-block">
        <div class="sg-block-title">1. Lời nói nhận diện từ bản ghi âm &amp; đánh dấu chỗ cần chỉnh</div>
        <div class="sg-inline-transcript">${buildInlineHighlightedTranscript(partObj.recognized_transcript, corrections)}</div>
        ${
          isTeacherView && partObj._meta
            ? `<div style="margin-top:6px;font-size:11px;color:#71717a;font-family:'JetBrains Mono',monospace;">
                🎧 Chẩn đoán (GV): ${escapeHtml(partObj._meta.mime_type || "?")} · ${
                  partObj._meta.file_bytes ? (Number(partObj._meta.file_bytes) / 1024).toFixed(0) + " KB" : "?"
                } · Chép lời: ${escapeHtml(partObj._meta.model_step1 || "?")}${
                  partObj._meta.model_step2 ? ` · Chấm bài: ${escapeHtml(partObj._meta.model_step2)}` : ""
                }
              </div>`
            : ""
        }
      </div>

      <div class="sg-block">
        <div class="sg-block-title">2. Chỉnh phát âm &amp; trọng âm từ cụ thể (${pronFixes.length} từ)</div>
        ${
          pronFixes.length === 0
            ? `<p style="font-size:13px;color:#166534;margin:0;">✓ Các từ trong phần nói này nghe rõ chữ, không có lỗi phát âm gây khó hiểu.</p>`
            : `<div class="sg-pron-grid">${pronFixes
                .map(
                  p => `
              <div class="sg-pron-card">
                <div class="sg-pron-top">
                  ${renderSpeakMiniBtn(p.word, p.word)}
                  ${p.ipa ? `<span class="sg-ipa">${escapeHtml(p.ipa)}</span>` : ""}
                </div>
                <div style="font-size:12.5px;color:#3f3f46;line-height:1.45;">${escapeHtml(p.issue_vi)}</div>
              </div>`
                )
                .join("")}</div>`
        }
      </div>

      <div class="sg-block">
        <div class="sg-block-title">3. Sửa Ngữ pháp, Dùng từ tự nhiên &amp; Lỗi "Vietlish" (${corrections.length} mục)</div>
        ${
          corrections.length === 0
            ? `<p style="font-size:13px;color:#166534;margin:0;">✓ Cách diễn đạt tự nhiên, không có lỗi ngữ pháp hoặc Vietlish đáng kể.</p>`
            : `<div class="sg-table-wrap">
                <table class="sg-table">
                  <thead>
                    <tr>
                      <th style="width:34px;">#</th>
                      <th style="width:36%;">Cách nói cũ → Tự nhiên hơn</th>
                      <th style="width:120px;">Nhóm lỗi</th>
                      <th>Giải thích</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${corrections
                      .map(
                        (c, idx) => `
                      <tr>
                        <td><strong>${c.id || idx + 1}</strong></td>
                        <td>
                          <div style="color:#b91c1c;text-decoration:line-through;margin-bottom:4px;">${escapeHtml(c.original)}</div>
                          <div style="color:#15803d;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <span>→ ${escapeHtml(c.corrected)}</span>
                            ${renderSpeakMiniBtn(c.corrected, "Nghe")}
                          </div>
                        </td>
                        <td><span class="sg-cat-pill ${getCategoryClass(c.category)}">${escapeHtml(c.category || "Ngữ pháp")}</span></td>
                        <td style="line-height:1.5;">${escapeHtml(c.explanation_vi || "")}</td>
                      </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
        }
      </div>

      ${
        ideas.length > 0
          ? `<div class="sg-block">
              <div class="sg-block-title">4. Gợi ý mở rộng những ý còn "cụt" (chuẩn Level ${escapeHtml(targetLevel)})</div>
              ${ideas
                .map(
                  it => `
                <div class="sg-idea-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                    <strong style="font-size:13px;color:#1e3a8a;">${escapeHtml(it.where_vi || "Gợi ý mở rộng")}</strong>
                    ${it.suggested_en ? renderSpeakMiniBtn(it.suggested_en, "Nghe câu gợi ý") : ""}
                  </div>
                  ${it.issue_vi ? `<div style="font-size:12.5px;color:#334155;margin-bottom:6px;">${escapeHtml(it.issue_vi)}</div>` : ""}
                  ${it.suggested_en ? `<div style="font-size:13.5px;font-weight:700;color:#0f172a;margin-bottom:4px;">“${escapeHtml(it.suggested_en)}”</div>` : ""}
                  ${it.meaning_vi ? `<div style="font-size:12.5px;color:#475569;font-style:italic;">${escapeHtml(it.meaning_vi)}</div>` : ""}
                </div>`
                )
                .join("")}
            </div>`
          : ""
      }

      ${
        revised
          ? `<div class="sg-block">
              <div class="sg-block-title">✨ Bài nói hoàn chỉnh tự nhiên (giữ nguyên ý của bạn · Level ${escapeHtml(targetLevel)})</div>
              <div class="sg-revised-box">
                <div style="margin-bottom:8px;">“${escapeHtml(revised)}”</div>
                <div>${renderSpeakMiniBtn(revised, "Nghe mẫu toàn phần để luyện ngữ điệu")}</div>
              </div>
            </div>`
          : ""
      }
    `;
  }

  let reviewUidSeq = 0;

  function renderTeacherOverrideHtml(tOv, isTeacherView) {
    if (!tOv || typeof tOv !== "object") return "";
    const decision = String(tOv.decision || "");
    const parts = tOv.parts && typeof tOv.parts === "object" ? tOv.parts : {};
    const partCards = [
      { key: "part1", label: "Part 1 · Social Interaction" },
      { key: "part2", label: "Part 2 · Solution Discussion" },
      { key: "part3", label: "Part 3 · Topic Development" }
    ]
      .map(p => {
        const d = parts[p.key] || {};
        const band = String(d.band || "").trim();
        const comment = String(d.comment || "").trim();
        const sc =
          isTeacherView && d.score !== undefined && d.score !== null && d.score !== ""
            ? Number(d.score)
            : null;
        if (!band && !comment && sc === null) return "";
        return `
          <div style="background:#fff;border:1.5px solid #e4e4e7;border-radius:10px;padding:10px 12px;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;">
              <strong style="font-size:12.5px;color:#18181b;">${escapeHtml(p.label)}</strong>
              ${band ? `<span class="sg-badge ${getBandToneClass(band)}">${escapeHtml(band)}</span>` : ""}
              ${sc !== null && Number.isFinite(sc) ? `<span class="sg-badge teacher-score">${sc.toFixed(2)}/10</span>` : ""}
            </div>
            ${comment ? `<div style="font-size:13px;color:#27272a;line-height:1.55;white-space:pre-line;">${escapeHtml(comment)}</div>` : ""}
          </div>
        `;
      })
      .filter(Boolean);

    let html = "";
    const approvedNote = String(tOv.approved_comment || "").trim();
    if (decision === "approved") {
      html += `
        <div class="sg-alert success" style="margin-bottom:10px;">
          <div>✅ <strong>${isTeacherView ? "Giáo viên đã xác nhận ĐỒNG Ý với bài chấm AI này." : "Cô Nguyệt đã kiểm tra và duyệt bài sửa này."}</strong></div>
          ${
            approvedNote
              ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #86efac;color:#14532d;line-height:1.6;white-space:pre-line;">👩‍🏫 <strong>Nhận xét của Cô Nguyệt:</strong> ${escapeHtml(approvedNote)}</div>`
              : ""
          }
        </div>
      `;
    } else if (decision === "rejected" && isTeacherView) {
      html += `
        <div class="sg-alert error" style="margin-bottom:10px;">
          ❌ <strong>Giáo viên đã chọn KHÔNG ĐỒNG Ý với bài chấm AI</strong>${tOv.hide_ai_review ? " (bài chấm AI đang được ẩn với học viên)." : "."}
        </div>
      `;
    }

    const overallBand = String(tOv.overall_band || "").trim();
    const overallComment = String(tOv.overall_comment || "").trim();
    const overallScore =
      isTeacherView && tOv.overall_score !== undefined && tOv.overall_score !== null && tOv.overall_score !== ""
        ? Number(tOv.overall_score)
        : null;

    if (decision === "manual" || overallBand || overallComment || partCards.length > 0 || overallScore !== null) {
      html += `
        <div style="background:#f5f3ff;border:2px solid #7c3aed;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <strong style="font-size:14.5px;color:#4c1d95;">👩‍🏫 Bài chấm trực tiếp từ Cô Nguyệt</strong>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${overallBand ? `<span class="sg-badge ${getBandToneClass(overallBand)}">Đánh giá: ${escapeHtml(overallBand)}</span>` : ""}
              ${overallScore !== null && Number.isFinite(overallScore) ? `<span class="sg-badge teacher-score">Điểm GV: ${overallScore.toFixed(2)}/10</span>` : ""}
            </div>
          </div>
          ${overallComment ? `<div style="font-size:13.5px;color:#1f2937;line-height:1.6;white-space:pre-line;margin-bottom:${partCards.length ? "10px" : "0"};">${escapeHtml(overallComment)}</div>` : ""}
          ${partCards.length > 0 ? `<div style="display:grid;gap:8px;">${partCards.join("")}</div>` : ""}
        </div>
      `;
    }
    return html;
  }

  function renderMockReviewHtml(reviewJson, opts) {
    if (!reviewJson || typeof reviewJson !== "object") return "";
    const options = opts || {};
    const isTeacherView = Boolean(options.isTeacherView);
    const targetLevel = String(options.targetLevel || reviewJson.target_level || "B1").toUpperCase();
    const uid = `sg_rev_${++reviewUidSeq}`;
    const tOvHtml = renderTeacherOverrideHtml(reviewJson.teacher_override, isTeacherView);
    const parts = reviewJson.parts || {};
    const p1 = parts.part1 || null;
    const p2 = parts.part2 || null;
    const p3 = parts.part3 || null;
    const hasAnyAiParts = Boolean(p1 || p2 || p3);

    // Nếu giáo viên đã ẩn bài sửa AI (chỉ hiện bài giáo viên tự chấm)
    if (!isTeacherView && (reviewJson.ai_hidden_by_teacher || !hasAnyAiParts)) {
      return `<div class="sg-review-wrap">${tOvHtml || `<div class="sg-alert info">Cô Nguyệt đang cập nhật nhận xét chi tiết cho bài thi của bạn.</div>`}</div>`;
    }
    if (isTeacherView && !hasAnyAiParts && tOvHtml) {
      return `<div class="sg-review-wrap">${tOvHtml}</div>`;
    }

    const overallBand = String(reviewJson.estimated_band || "");
    const overallScore =
      isTeacherView && reviewJson.overall_score !== undefined && reviewJson.overall_score !== null
        ? Number(reviewJson.overall_score)
        : null;

    const summaryCards = [
      { key: "p1", title: "Part 1 · Social Interaction", data: p1 },
      { key: "p2", title: "Part 2 · Solution Discussion", data: p2 },
      { key: "p3", title: "Part 3 · Topic Development", data: p3 }
    ]
      .map(item => {
        const d = item.data;
        const b = d && !d.skipped ? d.estimated_band || "—" : "Chưa nộp";
        const tone = d && !d.skipped ? getBandToneClass(b) : "band-below";
        const sc =
          isTeacherView && d && !d.skipped && d.internal_score !== undefined && d.internal_score !== null
            ? ` · ${Number(d.internal_score).toFixed(2)}/10`
            : "";
        return `
          <div class="sg-part-summary-card" data-sg-tab-target="${uid}__${item.key}" style="cursor:pointer;" title="Bấm để xem chi tiết ${escapeHtml(item.title)}">
            <div style="font-size:13px;font-weight:800;margin-bottom:6px;">${escapeHtml(item.title)}</div>
            <div style="margin-bottom:6px;">
              <span class="sg-badge ${tone}">${escapeHtml(b)}${escapeHtml(sc)}</span>
            </div>
            <div style="font-size:12.5px;color:#52525b;line-height:1.45;">
              ${escapeHtml((d && d.overall_comment) || "Chưa có dữ liệu.")}
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="sg-review-wrap" data-sg-review-root="${uid}">
        ${tOvHtml}
        <div class="sg-review-tabs">
          <button type="button" class="sg-tab-btn active" data-sg-tab-target="${uid}__overview">📊 Tổng quan</button>
          <button type="button" class="sg-tab-btn" data-sg-tab-target="${uid}__p1">🎙️ Part 1 ${p1 && !p1.skipped ? `(${escapeHtml(p1.estimated_band || "")})` : "(Trống)"}</button>
          <button type="button" class="sg-tab-btn" data-sg-tab-target="${uid}__p2">💡 Part 2 ${p2 && !p2.skipped ? `(${escapeHtml(p2.estimated_band || "")})` : "(Trống)"}</button>
          <button type="button" class="sg-tab-btn" data-sg-tab-target="${uid}__p3">🧭 Part 3 ${p3 && !p3.skipped ? `(${escapeHtml(p3.estimated_band || "")})` : "(Trống)"}</button>
        </div>

        <div class="sg-tab-panel active" id="${uid}__overview">
          <div class="sg-badges-row">
            <span class="sg-badge">Mục tiêu Level ${escapeHtml(targetLevel)}</span>
            ${overallBand ? `<span class="sg-badge ${getBandToneClass(overallBand)}">Đánh giá tổng: ${escapeHtml(overallBand)}</span>` : ""}
            ${overallScore !== null && Number.isFinite(overallScore) ? `<span class="sg-badge teacher-score">Điểm tổng quy đổi (GV): ${overallScore.toFixed(2)}/10</span>` : ""}
          </div>
          ${reviewJson.overall_comment ? `<p class="sg-overall-comment">${escapeHtml(reviewJson.overall_comment)}</p>` : ""}
          <div class="sg-part-summary-grid">${summaryCards}</div>
        </div>

        <div class="sg-tab-panel" id="${uid}__p1">
          ${renderSinglePartPanelHtml(p1, "Part 1", targetLevel, isTeacherView)}
        </div>
        <div class="sg-tab-panel" id="${uid}__p2">
          ${renderSinglePartPanelHtml(p2, "Part 2", targetLevel, isTeacherView)}
        </div>
        <div class="sg-tab-panel" id="${uid}__p3">
          ${renderSinglePartPanelHtml(p3, "Part 3", targetLevel, isTeacherView)}
        </div>
      </div>
    `;
  }

  // Global delegation for review tabs & TTS speak buttons
  document.addEventListener("click", e => {
    const speakBtn = e.target.closest("[data-sg-speak]");
    if (speakBtn) {
      e.stopPropagation();
      speakEnglishText(speakBtn.getAttribute("data-sg-speak"), speakBtn);
      return;
    }
    const tabBtn = e.target.closest("[data-sg-tab-target]");
    if (tabBtn) {
      const targetId = tabBtn.getAttribute("data-sg-tab-target");
      const root = tabBtn.closest("[data-sg-review-root]");
      if (!root || !targetId) return;
      root.querySelectorAll(".sg-tab-btn").forEach(b =>
        b.classList.toggle("active", b.getAttribute("data-sg-tab-target") === targetId)
      );
      root.querySelectorAll(".sg-tab-panel").forEach(p => p.classList.toggle("active", p.id === targetId));
    }
  });

  // ==========================================================================
  // MODE A: TRANG LÀM BÀI THI THỬ (`test 1/test01-index.html` .. `test 17`)
  // ==========================================================================
  function detectCurrentTestId() {
    try {
      if (typeof testId !== "undefined" && Number(testId) > 0) return Number(testId);
    } catch (e) {}
    const m = window.location.pathname.match(/test[\s%20_-]*(\d+)/i);
    return m ? parseInt(m[1], 10) : 1;
  }

  function extractExamPromptsFromDom() {
    // Part 1
    const p1Topics = [];
    document.querySelectorAll("#view-part1 .part1-topics .topic-box").forEach(box => {
      const titleEl = box.querySelector(".topic-title");
      const title = titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "";
      const qs = Array.from(box.querySelectorAll(".question-list li")).map(li =>
        li.textContent.replace(/\s+/g, " ").trim()
      );
      if (title || qs.length) {
        p1Topics.push(`${title}\n${qs.map((q, i) => `- Q${i + 1}: ${q}`).join("\n")}`);
      }
    });

    // Part 2
    const p2El = document.querySelector("#view-part2 .situation-box .situation-desc");
    const p2Text = p2El ? p2El.textContent.replace(/\s+/g, " ").trim() : "";

    // Part 3
    const p3Header = document.querySelector("#view-part3 .topic-header .topic-desc");
    const p3Center = document.querySelector("#view-part3 .mindmap-node.node-center span");
    const p3Branches = Array.from(document.querySelectorAll("#view-part3 .mindmap-node.node-branch span"))
      .map(el => el.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const p3Followups = Array.from(document.querySelectorAll("#view-part3 .follow-up-box .question-list li"))
      .map(li => li.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const p3Parts = [];
    if (p3Header) p3Parts.push(`Topic: ${p3Header.textContent.replace(/\s+/g, " ").trim()}`);
    if (p3Center) p3Parts.push(`Mindmap center: ${p3Center.textContent.replace(/\s+/g, " ").trim()}`);
    if (p3Branches.length) p3Parts.push(`Mindmap ideas: ${p3Branches.join(" | ")}`);
    if (p3Followups.length) p3Parts.push(`Follow-up questions:\n${p3Followups.map((q, i) => `- ${i + 1}. ${q}`).join("\n")}`);

    return {
      part1: p1Topics.join("\n\n"),
      part2: p2Text,
      part3: p3Parts.join("\n")
    };
  }

  async function resolveCurrentTestRecordings(currentTestId) {
    const out = { 1: null, 2: null, 3: null };
    try {
      if (typeof recordings !== "undefined" && recordings) {
        if (recordings[1] instanceof Blob && recordings[1].size > 0) out[1] = recordings[1];
        if (recordings[2] instanceof Blob && recordings[2].size > 0) out[2] = recordings[2];
        if (recordings[3] instanceof Blob && recordings[3].size > 0) out[3] = recordings[3];
      }
    } catch (e) {}

    if (out[1] || out[2] || out[3]) return out;

    // Fallback: lấy từ VstepDB.getAllHistory() mới nhất của đề hiện tại
    try {
      if (typeof window.VstepDB !== "undefined" && typeof window.VstepDB.getAllHistory === "function") {
        const list = await window.VstepDB.getAllHistory();
        const found = (list || []).find(item => Number(item.testId) === Number(currentTestId));
        if (found && found.recordings) {
          if (found.recordings[1] instanceof Blob && found.recordings[1].size > 0) out[1] = found.recordings[1];
          if (found.recordings[2] instanceof Blob && found.recordings[2].size > 0) out[2] = found.recordings[2];
          if (found.recordings[3] instanceof Blob && found.recordings[3].size > 0) out[3] = found.recordings[3];
        }
      }
    } catch (e) {}
    return out;
  }

  function getAudioElementDuration(elId) {
    const el = document.getElementById(elId);
    if (el && Number.isFinite(el.duration) && el.duration > 0) {
      return Math.round(el.duration);
    }
    return 0;
  }

  // Chuyển file ghi âm sang WAV 16kHz mono chuẩn PCM trước khi upload
  // -> Phát được 100% trên mọi trình duyệt (Chrome/Safari/iOS) và Gemini nhận dạng chính xác tuyệt đối
  async function convertBlobToCleanWav16k(blob) {
    if (!blob || !(blob instanceof Blob) || blob.size < 200) return blob;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioCtx || !OfflineCtx) return blob;
    try {
      const ab = await blob.arrayBuffer();
      const ctx = new AudioCtx();
      const decoded = await ctx.decodeAudioData(ab.slice(0));
      await ctx.close().catch(() => {});
      if (!decoded || !decoded.duration || decoded.duration <= 0) return blob;

      const targetRate = 16000;
      const frameCount = Math.max(1, Math.ceil(decoded.duration * targetRate));
      const offline = new OfflineCtx(1, frameCount, targetRate);
      const src = offline.createBufferSource();
      src.buffer = decoded;
      // Lọc thông cao 80Hz để cắt tiếng ù quạt, điều hoà, rung bàn & nhiễu DC
      const highPass = offline.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.value = 80;
      highPass.Q.value = 0.707;

      // Bộ nén dải động (DynamicsCompressor) cân bằng đều giọng nói nhỏ vs giọng to
      // -> Giúp các câu nói nhỏ, cuối câu hoặc sau tiếng hít thở KHÔNG bị AI nghe sót chữ!
      const compressor = offline.createDynamicsCompressor();
      compressor.threshold.value = -28;
      compressor.knee.value = 24;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.15;

      src.connect(highPass);
      highPass.connect(compressor);
      compressor.connect(offline.destination);
      src.start(0);
      const rendered = await offline.startRendering();

      const samples = rendered.getChannelData(0);
      // Đo âm lượng giọng nói thực theo khung 50ms (bách phân vị 65% để không bị tiếng ho/chạm mic lấn át giọng nói nhỏ)
      const frameLen = 800; // 50ms ở 16kHz
      const activeRms = [];
      for (let start = 0; start < samples.length; start += frameLen) {
        const end = Math.min(samples.length, start + frameLen);
        let sumSq = 0;
        for (let i = start; i < end; i++) sumSq += samples[i] * samples[i];
        const rms = Math.sqrt(sumSq / Math.max(1, end - start));
        if (rms > 0.003) activeRms.push(rms);
      }

      let gain = 1.0;
      if (activeRms.length > 0) {
        activeRms.sort((a, b) => a - b);
        const refRms = activeRms[Math.min(activeRms.length - 1, Math.floor(activeRms.length * 0.65))];
        if (refRms > 0.003 && refRms < 0.18) {
          gain = Math.min(14.0, 0.18 / refRms);
        }
      }

      const dataSize = samples.length * 2;
      const wavBuf = new ArrayBuffer(44 + dataSize);
      const view = new DataView(wavBuf);
      const writeStr = (off, s) => {
        for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
      };
      writeStr(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, targetRate, true);
      view.setUint32(28, targetRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, "data");
      view.setUint32(40, dataSize, true);

      // Soft Limiter (tanh) trên 0.85 để tăng âm giọng nhỏ mà KHÔNG bị rè/vỡ tiếng ở các tiếng click
      let offset = 44;
      for (let i = 0; i < samples.length; i++) {
        const x = samples[i] * gain;
        const absX = Math.abs(x);
        const limited = absX <= 0.85 ? x : Math.sign(x) * (0.85 + 0.15 * Math.tanh((absX - 0.85) / 0.15));
        const s = Math.max(-1, Math.min(1, limited));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
      return new Blob([wavBuf], { type: "audio/wav" });
    } catch (e) {
      return blob;
    }
  }

  function initTestPageGrader() {
    const reviewSection = document.getElementById("view-review");
    if (!reviewSection) return;

    const currentTestId = detectCurrentTestId();
    const testNumStr = String(currentTestId).padStart(2, "0");
    const testTitle = `VSTEP Speaking Mock Test ${testNumStr}`;

    const uiState = {
      targetLevel: "B1",
      submitting: false,
      progressText: "",
      errorMsg: "",
      successMsg: "",
      latestCloudItem: null,
      recordings: { 1: null, 2: null, 3: null }
    };

    let hostEl = document.getElementById("sg-review-panel");
    if (!hostEl) {
      hostEl = document.createElement("div");
      hostEl.id = "sg-review-panel";
      const reviewCard = reviewSection.querySelector(".review-card") || reviewSection;
      const actionsEl = reviewCard.querySelector(".review-actions");
      if (actionsEl) {
        reviewCard.insertBefore(hostEl, actionsEl);
      } else {
        reviewCard.appendChild(hostEl);
      }
    }

    function renderPanel() {
      const has1 = Boolean(uiState.recordings[1]);
      const has2 = Boolean(uiState.recordings[2]);
      const has3 = Boolean(uiState.recordings[3]);
      const anyRec = has1 || has2 || has3;
      const item = uiState.latestCloudItem;

      let statusAreaHtml = "";
      if (uiState.errorMsg) {
        statusAreaHtml += `<div class="sg-alert error">⚠️ ${escapeHtml(uiState.errorMsg)}</div>`;
      }
      if (uiState.successMsg) {
        statusAreaHtml += `<div class="sg-alert success">✅ ${escapeHtml(uiState.successMsg)}</div>`;
      }

      if (item) {
        if (item.teacher_feedback || item.teacher_score) {
          statusAreaHtml += `
            <div class="sg-alert success">
              <div><strong>👨‍🏫 Nhận xét từ Giáo viên${item.teacher_score ? ` · ${escapeHtml(item.teacher_score)}` : ""}:</strong></div>
              ${item.teacher_feedback ? `<div style="margin-top:4px;">${escapeHtml(item.teacher_feedback)}</div>` : ""}
            </div>
          `;
        }

        if (item.state === "ready" && item.review_json) {
          statusAreaHtml += `
            <div class="sg-alert success" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
              <span>✅ Bài chấm &amp; sửa Speaking chi tiết (Part 1–3) đã sẵn sàng</span>
              <span>Trả lúc ${escapeHtml(formatDateTime(item.release_at))}</span>
            </div>
            ${renderMockReviewHtml(item.review_json, {
              targetLevel: item.target_level || uiState.targetLevel,
              isTeacherView: false
            })}
          `;
        } else if (item.state === "waiting") {
          const remain = formatRemainingTime(item.release_at);
          statusAreaHtml += `
            <div class="sg-alert info">
              ⏳ Bạn đã nộp bài lúc <strong>${escapeHtml(formatDateTime(item.submitted_at))}</strong>.
              Dự kiến trả bài sửa chi tiết (Part 1–3) lúc <strong>${escapeHtml(formatDateTime(item.release_at))}</strong>${remain ? ` (còn ${escapeHtml(remain)})` : ""}.
              Kết quả cũng sẽ hiển thị tại mục chuông thông báo 🔔 trên Trang chủ.
            </div>
          `;
        } else if (item.state === "no_audio") {
          statusAreaHtml += `
            <div class="sg-alert error">
              ⚠️ Bài nộp gần nhất chưa có dữ liệu âm thanh hợp lệ. Hãy kiểm tra Micro và làm lại bài thi nhé.
            </div>
          `;
        }
      }

      hostEl.innerHTML = `
        <div class="sg-box">
          <div class="sg-box-head">
            <div>
              <span class="sg-eyebrow">TRỢ LÝ MISS NGUYỆT · CHẤM SPEAKING PART 1–3</span>
              <h3 class="sg-title">Gửi bài ghi âm cho Trợ lý Miss Nguyệt sửa chi tiết</h3>
              <p class="sg-sub">
                Trợ lý Miss Nguyệt sẽ nghe trực tiếp 3 file ghi âm của bạn (Phát âm, Ngữ điệu, Ngữ pháp, Lỗi Vietlish &amp; Mở rộng ý) và gửi bài sửa chi tiết sau <strong>${RELEASE_HOURS} tiếng</strong>.
              </p>
            </div>
          </div>

          <div class="sg-parts-status">
            <span class="sg-part-chip ${has1 ? "ready" : "missing"}">${has1 ? "✓" : "✕"} Part 1 · Social Interaction</span>
            <span class="sg-part-chip ${has2 ? "ready" : "missing"}">${has2 ? "✓" : "✕"} Part 2 · Solution Discussion</span>
            <span class="sg-part-chip ${has3 ? "ready" : "missing"}">${has3 ? "✓" : "✕"} Part 3 · Topic Development</span>
          </div>

          <div class="sg-submit-controls">
            <div class="sg-level-group">
              <span class="sg-level-label">Mục tiêu chấm:</span>
              <button type="button" class="sg-level-btn ${uiState.targetLevel === "B1" ? "active" : ""}" data-sg-level="B1">Level B1</button>
              <button type="button" class="sg-level-btn ${uiState.targetLevel === "B2" ? "active" : ""}" data-sg-level="B2">Level B2</button>
            </div>

            <button
              type="button"
              class="sg-submit-btn"
              id="sg-btn-submit-mock"
              ${uiState.submitting || !anyRec ? "disabled" : ""}
            >
              ${
                uiState.submitting
                  ? `⏳ ${escapeHtml(uiState.progressText || "Đang tải bài nộp...")}`
                  : `📤 Nộp bài thi (Test ${testNumStr}) để chấm điểm →`
              }
            </button>
          </div>

          ${!anyRec ? `<div class="sg-alert info">Chưa tìm thấy file ghi âm cho bài thi này. Hãy hoàn thành ghi âm rồi quay lại đây bấm nộp nhé.</div>` : ""}
          ${statusAreaHtml}
        </div>
      `;

      hostEl.querySelectorAll("[data-sg-level]").forEach(btn => {
        btn.onclick = () => {
          uiState.targetLevel = btn.getAttribute("data-sg-level") || "B1";
          renderPanel();
        };
      });

      const submitBtn = document.getElementById("sg-btn-submit-mock");
      if (submitBtn) {
        submitBtn.onclick = handleSubmitMockTest;
      }
    }

    async function refreshTestCloudStatus() {
      if (!isConfigured()) return;
      const id = getStudentIdentity();
      if (!id.name) return;
      const res = await callEdgeFunction({
        action: "list_student_reviews",
        student_name: id.name,
        class_code: id.classCode,
        test_id: currentTestId
      });
      if (res.ok && Array.isArray(res.items) && res.items.length > 0) {
        uiState.latestCloudItem = res.items[0];
        if (uiState.latestCloudItem.state === "ready" && !uiState.latestCloudItem.student_seen_at) {
          callEdgeFunction({
            action: "mark_seen",
            submission_id: uiState.latestCloudItem.submission_id,
            student_name: id.name,
            class_code: id.classCode
          });
        }
        renderPanel();
      }
    }

    async function handleSubmitMockTest() {
      if (uiState.submitting) return;
      const id = getStudentIdentity();
      if (!id.name) {
        uiState.errorMsg = "Không xác định được tên học viên. Vui lòng đăng nhập lại trên Trang chủ.";
        renderPanel();
        return;
      }

      uiState.recordings = await resolveCurrentTestRecordings(currentTestId);
      const presentParts = [1, 2, 3].filter(n => uiState.recordings[n] instanceof Blob && uiState.recordings[n].size >= 200);
      if (presentParts.length === 0) {
        uiState.errorMsg = "Chưa có file ghi âm hợp lệ (Part 1, 2 hoặc 3) để nộp bài.";
        renderPanel();
        return;
      }

      uiState.submitting = true;
      uiState.errorMsg = "";
      uiState.successMsg = "";
      uiState.progressText = "Đang khởi tạo phiên nộp bài...";
      renderPanel();

      // Chuẩn hoá sang WAV 16kHz mono PCM (+ cân bằng âm lượng micro nhỏ) ngay trên trình duyệt
      // -> Khắc phục triệt để lỗi Gemini API nhận diện sai trên file WebM ghi từ trình duyệt
      // -> Edge Function dùng Zero-Copy Streaming nên WAV vẫn tốn 0 MB RAM!
      const preparedBlobs = {};
      const partsMeta = {};
      for (const n of presentParts) {
        uiState.progressText = `Đang chuẩn hoá âm thanh Part ${n}...`;
        renderPanel();
        const cleanBlob = await convertBlobToCleanWav16k(uiState.recordings[n]);
        preparedBlobs[n] = cleanBlob;
        partsMeta[String(n)] = {
          present: true,
          mimeType: (cleanBlob.type || "audio/wav").split(";")[0].trim()
        };
      }

      const createRes = await callEdgeFunction({
        action: "create_upload_urls",
        student_name: id.name,
        class_code: id.classCode,
        test_id: currentTestId,
        test_title: testTitle,
        target_level: uiState.targetLevel,
        parts: partsMeta,
        prompts: extractExamPromptsFromDom()
      });

      if (!createRes.ok) {
        uiState.submitting = false;
        uiState.errorMsg = createRes.error || "Không tạo được phiên tải âm thanh.";
        renderPanel();
        return;
      }

      const submissionId = createRes.submission_id;
      const uploads = createRes.uploads || {};
      const uploadedPaths = {};
      const durations = {
        1: getAudioElementDuration("p1-audio"),
        2: getAudioElementDuration("p2-audio"),
        3: getAudioElementDuration("p3-audio")
      };

      for (let i = 0; i < presentParts.length; i++) {
        const pNum = presentParts[i];
        const info = uploads[String(pNum)];
        const blob = preparedBlobs[pNum] || uiState.recordings[pNum];
        if (!info || !info.signedUrl) continue;

        uiState.progressText = `Đang tải file ghi âm Part ${pNum} (${i + 1}/${presentParts.length})...`;
        renderPanel();

        try {
          const cleanMime = (blob.type || "audio/webm").split(";")[0].trim() || "audio/webm";
          const putRes = await fetch(info.signedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": cleanMime,
              "x-upsert": "true"
            },
            body: blob
          });
          if (!putRes.ok) {
            throw new Error(`Upload Part ${pNum} thất bại (HTTP ${putRes.status})`);
          }
          uploadedPaths[String(pNum)] = info.path;
        } catch (upErr) {
          uiState.submitting = false;
          uiState.errorMsg = upErr && upErr.message ? upErr.message : `Lỗi tải file ghi âm Part ${pNum}.`;
          renderPanel();
          return;
        }
      }

      uiState.progressText = "Đang gửi bài cho Trợ lý Miss Nguyệt...";
      renderPanel();

      const submitRes = await callEdgeFunction({
        action: "submit_and_grade",
        submission_id: submissionId,
        student_name: id.name,
        class_code: id.classCode,
        target_level: uiState.targetLevel,
        audio_paths: uploadedPaths,
        durations
      });

      uiState.submitting = false;
      if (!submitRes.ok) {
        uiState.errorMsg = submitRes.error || "Không xác nhận được bài nộp.";
        renderPanel();
        return;
      }

      uiState.successMsg = `Đã nộp trọn bộ bài thi thành công! Kết quả bài sửa dự kiến có lúc ${formatDateTime(submitRes.release_at)}.`;
      uiState.latestCloudItem = {
        submission_id: submissionId,
        test_id: currentTestId,
        test_title: testTitle,
        target_level: uiState.targetLevel,
        submitted_at: submitRes.submitted_at,
        release_at: submitRes.release_at,
        state: "waiting",
        review_json: null
      };
      renderPanel();

      // Kích hoạt chấm ngầm lần lượt từng Part (mỗi lần 1 Part -> cực nhẹ RAM/CPU trên Supabase)
      (async () => {
        for (const pNum of [1, 2, 3]) {
          await callEdgeFunction({
            action: "grade_student_part",
            submission_id: submissionId,
            student_name: id.name,
            class_code: id.classCode,
            part_num: pNum
          }).catch(() => {});
        }
      })();
    }

    async function syncPanelNow() {
      uiState.recordings = await resolveCurrentTestRecordings(currentTestId);
      renderPanel();
      await refreshTestCloudStatus();
    }

    // Gắn hook an toàn vào window.enterReview của test N/app.js
    if (typeof window.enterReview === "function" && !window.enterReview.__sgHooked) {
      const origEnterReview = window.enterReview;
      window.enterReview = function () {
        const ret = origEnterReview.apply(this, arguments);
        setTimeout(() => {
          syncPanelNow();
        }, 250);
        return ret;
      };
      window.enterReview.__sgHooked = true;
    }

    syncPanelNow();
  }

  // ==========================================================================
  // MODE B: TRANG CHỦ (`index.html`) — CHUÔNG THÔNG BÁO + BÀI SỬA AI + MODAL
  // ==========================================================================
  function initHomePageGrader() {
    const historyContainer = document.getElementById("history-list-container");
    if (!historyContainer) return;

    const homeState = {
      items: [],
      notifOpen: false,
      modalItem: null,
      loading: false
    };

    // 1. Tạo thanh nổi góc trên phải (Chuông thông báo + Nút Trang Giáo viên)
    const floatingBar = document.createElement("div");
    floatingBar.className = "sg-floating-bar";
    floatingBar.id = "sg-floating-bar";
    document.body.appendChild(floatingBar);

    const dropdownWrap = document.createElement("div");
    dropdownWrap.id = "sg-notif-dropdown-root";
    document.body.appendChild(dropdownWrap);

    const modalRoot = document.createElement("div");
    modalRoot.id = "sg-modal-root";
    document.body.appendChild(modalRoot);

    // 2. Tạo khu vực "Bài thi đã nộp chấm AI" ngay trên #history-list-container
    const cloudWrap = document.createElement("div");
    cloudWrap.id = "sg-home-cloud-submissions";
    historyContainer.parentNode.insertBefore(cloudWrap, historyContainer);

    function openReviewModal(item) {
      homeState.modalItem = item;
      homeState.notifOpen = false;
      if (item && item.state === "ready" && !item.student_seen_at) {
        item.student_seen_at = new Date().toISOString();
        const id = getStudentIdentity();
        callEdgeFunction({
          action: "mark_seen",
          submission_id: item.submission_id,
          student_name: id.name,
          class_code: id.classCode
        });
      }
      renderHomeWidgets();
    }

    function renderHomeWidgets() {
      const id = getStudentIdentity();
      const teacherUrl = CFG.teacherPageUrl || "teacher-grading.html";
      const showTeacherLink = isCurrentUserTeacherInWeb();

      const readyItems = homeState.items.filter(it => it.state === "ready" && it.review_json);
      const waitingItems = homeState.items.filter(it => it.state === "waiting");
      const unreadCount = readyItems.filter(it => !it.student_seen_at).length;

      floatingBar.innerHTML = `
        ${
          showTeacherLink
            ? `<a href="${escapeHtml(teacherUrl)}" class="sg-pill-btn teacher" title="Mở trang chấm & quản lý bài nói học viên">👨‍🏫 Trang Giáo viên</a>`
            : ""
        }
        ${
          id.name
            ? `<button type="button" class="sg-pill-btn" id="sg-btn-notif-bell" title="Thông báo bài sửa từ Trợ lý Miss Nguyệt">
                <span>🔔 Trợ lý Miss Nguyệt</span>
                ${unreadCount > 0 ? `<span class="sg-bell-badge">${unreadCount > 9 ? "9+" : unreadCount}</span>` : ""}
              </button>`
            : ""
        }
      `;

      // Gắn thêm nút Trang Giáo viên nổi bật ở thanh sidebar trái (ngay dưới thẻ Cô Nguyệt)
      const sidebarUserCard = document.getElementById("vstep-sidebar-user-card");
      let sbTeacherBtn = document.getElementById("sg-sidebar-teacher-link");
      if (showTeacherLink && sidebarUserCard) {
        if (!sbTeacherBtn) {
          sbTeacherBtn = document.createElement("a");
          sbTeacherBtn.id = "sg-sidebar-teacher-link";
          sbTeacherBtn.className = "sg-sidebar-teacher-btn";
          sidebarUserCard.insertAdjacentElement("afterend", sbTeacherBtn);
        }
        sbTeacherBtn.href = teacherUrl;
        sbTeacherBtn.textContent = "👨‍🏫 Trang Giáo viên (Trợ lý Miss Nguyệt)";
      } else if (sbTeacherBtn) {
        sbTeacherBtn.remove();
      }

      const bellBtn = document.getElementById("sg-btn-notif-bell");
      if (bellBtn) {
        bellBtn.onclick = e => {
          e.stopPropagation();
          homeState.notifOpen = !homeState.notifOpen;
          renderHomeWidgets();
          if (homeState.notifOpen) refreshHomeReviews();
        };
      }

      if (homeState.notifOpen) {
        const listHtml =
          homeState.items.length === 0
            ? `<div style="padding:18px 12px;text-align:center;font-size:13px;color:#71717a;">Chưa có bài nộp nào. Hoàn thành 1 đề thi thử và bấm <strong>Nộp bài để chấm điểm</strong> để nhận bài sửa sau ${RELEASE_HOURS} tiếng nhé!</div>`
            : homeState.items
                .map(it => {
                  const isReady = it.state === "ready" && it.review_json;
                  const isUnread = isReady && !it.student_seen_at;
                  const band = isReady ? it.review_json.estimated_band || "" : "";
                  const remain = it.state === "waiting" ? formatRemainingTime(it.release_at) : "";
                  return `
                    <button type="button" class="sg-notif-item ${isUnread ? "unread" : ""}" data-sg-open-sub="${escapeHtml(it.submission_id)}">
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;">
                        ${
                          isReady
                            ? `<span class="sg-status-pill ${isUnread ? "unread" : "ready"}">${isUnread ? "Mới · Đã có bài sửa" : "✓ Đã trả bài sửa"}</span>`
                            : it.state === "no_audio"
                              ? `<span class="sg-status-pill error">Thiếu audio</span>`
                              : `<span class="sg-status-pill waiting">⏳ Chờ trả ${remain ? `(${escapeHtml(remain)})` : ""}</span>`
                        }
                        <span style="font-size:11.5px;color:#71717a;">${escapeHtml(formatDateTime(it.submitted_at))}</span>
                      </div>
                      <div style="font-size:13.5px;font-weight:800;color:#18181b;">${escapeHtml(it.test_title)}</div>
                      <div style="font-size:12px;color:#52525b;margin-top:2px;">
                        Level ${escapeHtml(it.target_level)}${band ? ` · Đánh giá: <strong>${escapeHtml(band)}</strong>` : ""}${isReady ? " · Bấm xem chi tiết →" : ""}
                      </div>
                    </button>
                  `;
                })
                .join("");

        dropdownWrap.innerHTML = `
          <div class="sg-notif-dropdown" id="sg-notif-dropdown">
            <div class="sg-notif-head">
              <span>🔔 Bài sửa từ Trợ lý Miss Nguyệt</span>
              <span style="font-size:11.5px;color:#71717a;">Trả sau ${RELEASE_HOURS} tiếng</span>
            </div>
            <div class="sg-notif-list">${listHtml}</div>
          </div>
        `;
      } else {
        dropdownWrap.innerHTML = "";
      }

      // Render section trên Lịch sử thi thử
      if (homeState.items.length > 0) {
        cloudWrap.innerHTML = `
          <div class="sg-cloud-list">
            <div style="font-size:13px;font-weight:800;color:#18181b;display:flex;justify-content:space-between;align-items:center;">
              <span>📬 Bài thi đã gửi Trợ lý Miss Nguyệt (${homeState.items.length})</span>
              <span style="font-size:12px;color:#71717a;font-weight:600;">${readyItems.length} đã trả · ${waitingItems.length} đang chờ</span>
            </div>
            ${homeState.items
              .slice(0, 6)
              .map(it => {
                const isReady = it.state === "ready" && it.review_json;
                const band = isReady ? it.review_json.estimated_band || "" : "";
                const remain = it.state === "waiting" ? formatRemainingTime(it.release_at) : "";
                return `
                  <div class="sg-cloud-card ${isReady ? "ready" : ""}">
                    <div>
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                        <strong style="font-size:14px;">${escapeHtml(it.test_title)}</strong>
                        <span class="sg-badge" style="padding:2px 7px;font-size:11px;">Level ${escapeHtml(it.target_level)}</span>
                        ${
                          isReady
                            ? `<span class="sg-status-pill ${!it.student_seen_at ? "unread" : "ready"}">${!it.student_seen_at ? "Mới · " : "✓ "}${escapeHtml(band || "Đã có bài sửa")}</span>`
                            : it.state === "no_audio"
                              ? `<span class="sg-status-pill error">Thiếu file âm thanh</span>`
                              : `<span class="sg-status-pill waiting">⏳ Trả bài lúc ${escapeHtml(formatDateTime(it.release_at))}${remain ? ` (còn ${escapeHtml(remain)})` : ""}</span>`
                        }
                      </div>
                      <div style="font-size:12px;color:#52525b;">Nộp lúc ${escapeHtml(formatDateTime(it.submitted_at))}</div>
                    </div>
                    ${
                      isReady
                        ? `<button type="button" class="sg-submit-btn" style="height:34px;font-size:12.5px;padding:0 12px;" data-sg-open-sub="${escapeHtml(it.submission_id)}">Xem bài sửa →</button>`
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        `;
      } else {
        cloudWrap.innerHTML = "";
      }

      // Bind open buttons
      document.querySelectorAll("[data-sg-open-sub]").forEach(btn => {
        btn.onclick = () => {
          const sid = btn.getAttribute("data-sg-open-sub");
          const found = homeState.items.find(x => x.submission_id === sid);
          if (found && found.state === "ready" && found.review_json) {
            openReviewModal(found);
          }
        };
      });

      // Render Modal
      if (homeState.modalItem && homeState.modalItem.review_json) {
        const it = homeState.modalItem;
        modalRoot.innerHTML = `
          <div class="sg-modal-backdrop" id="sg-modal-backdrop">
            <div class="sg-modal-panel">
              <div class="sg-modal-header">
                <div>
                  <div style="font-size:16px;font-weight:900;color:#18181b;">📝 Trợ lý Miss Nguyệt sửa bài · ${escapeHtml(it.test_title)}</div>
                  <div style="font-size:12.5px;color:#52525b;">Nộp lúc ${escapeHtml(formatDateTime(it.submitted_at))} · Trả lúc ${escapeHtml(formatDateTime(it.release_at))}</div>
                </div>
                <button type="button" class="sg-modal-close" id="sg-btn-close-modal">✕</button>
              </div>
              <div class="sg-modal-body">
                ${
                  it.teacher_feedback || it.teacher_score
                    ? `<div class="sg-alert success" style="margin-top:0;margin-bottom:12px;">
                        <strong>👨‍🏫 Nhận xét thêm của Giáo viên${it.teacher_score ? ` · ${escapeHtml(it.teacher_score)}` : ""}:</strong>
                        ${it.teacher_feedback ? `<div style="margin-top:4px;">${escapeHtml(it.teacher_feedback)}</div>` : ""}
                      </div>`
                    : ""
                }
                ${renderMockReviewHtml(it.review_json, {
                  targetLevel: it.target_level,
                  isTeacherView: false
                })}
              </div>
            </div>
          </div>
        `;
        const closeFn = () => {
          stopActiveTts();
          homeState.modalItem = null;
          renderHomeWidgets();
        };
        const bd = document.getElementById("sg-modal-backdrop");
        const cb = document.getElementById("sg-btn-close-modal");
        if (bd) bd.onclick = e => { if (e.target === bd) closeFn(); };
        if (cb) cb.onclick = closeFn;
      } else {
        modalRoot.innerHTML = "";
      }
    }

    async function refreshHomeReviews() {
      if (!isConfigured() || homeState.loading) return;
      const id = getStudentIdentity();
      if (!id.name) return;
      homeState.loading = true;
      try {
        const res = await callEdgeFunction({
          action: "list_student_reviews",
          student_name: id.name,
          class_code: id.classCode
        });
        if (res.ok && Array.isArray(res.items)) {
          homeState.items = res.items;
          renderHomeWidgets();
        }
      } finally {
        homeState.loading = false;
      }
    }

    document.addEventListener("click", e => {
      if (
        homeState.notifOpen &&
        !e.target.closest("#sg-notif-dropdown") &&
        !e.target.closest("#sg-btn-notif-bell")
      ) {
        homeState.notifOpen = false;
        renderHomeWidgets();
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && (homeState.notifOpen || homeState.modalItem)) {
        homeState.notifOpen = false;
        homeState.modalItem = null;
        renderHomeWidgets();
      }
    });

    window.addEventListener("focus", () => refreshHomeReviews());

    renderHomeWidgets();
    refreshHomeReviews();

    // Đợi học viên nhập xong modal VstepAuth lần đầu trên Trang chủ
    let lastKnownIdentity = "";
    setInterval(() => {
      const id = getStudentIdentity();
      const key = `${id.name}__${id.classCode}`;
      if (id.name && key !== lastKnownIdentity) {
        lastKnownIdentity = key;
        renderHomeWidgets();
        refreshHomeReviews();
      }
    }, 2000);

    // Tự động kiểm tra bài sửa mỗi 60 giây
    setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshHomeReviews();
      }
    }, 60000);
  }

  window.VstepSpeakingGrader = {
    escapeHtml,
    formatDateTime,
    formatRemainingTime,
    speakEnglishText,
    convertBlobToCleanWav16k,
    callEdgeFunction,
    renderMockReviewHtml,
    isConfigured,
    getBaseUrl,
    getAnonKey
  };

  function boot() {
    if (document.getElementById("view-review")) {
      initTestPageGrader();
    } else if (document.getElementById("history-list-container")) {
      initHomePageGrader();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
