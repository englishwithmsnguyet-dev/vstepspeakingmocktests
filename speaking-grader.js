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

  function speakEnglishText(rawText) {
    const clean = String(rawText || "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
    if (!clean) return;
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = "en-US";
        u.rate = 0.92;
        window.speechSynthesis.speak(u);
        return;
      } catch (e) {}
    }
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

  async function callEdgeFunction(payload, bearerToken) {
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
      const res = await fetch(`${getBaseUrl()}/functions/v1/${EDGE_FN}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
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
      return `<span style="color:#71717a;font-style:italic;">(Không nhận diện được lời nói tiếng Anh rõ ràng trong bản ghi âm này)</span>`;
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

  function renderMockReviewHtml(reviewJson, opts) {
    if (!reviewJson || typeof reviewJson !== "object") return "";
    const options = opts || {};
    const isTeacherView = Boolean(options.isTeacherView);
    const targetLevel = String(options.targetLevel || reviewJson.target_level || "B1").toUpperCase();
    const uid = `sg_rev_${++reviewUidSeq}`;
    const parts = reviewJson.parts || {};
    const p1 = parts.part1 || null;
    const p2 = parts.part2 || null;
    const p3 = parts.part3 || null;

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
          <div class="sg-part-summary-card">
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
      speakEnglishText(speakBtn.getAttribute("data-sg-speak"));
      return;
    }
    const tabBtn = e.target.closest("[data-sg-tab-target]");
    if (tabBtn) {
      const targetId = tabBtn.getAttribute("data-sg-tab-target");
      const root = tabBtn.closest("[data-sg-review-root]");
      if (!root || !targetId) return;
      root.querySelectorAll(".sg-tab-btn").forEach(b => b.classList.toggle("active", b === tabBtn));
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
              <span class="sg-eyebrow">VSTEP AI SPEAKING GRADING · PART 1–3</span>
              <h3 class="sg-title">Nộp bài ghi âm để chấm điểm &amp; sửa chi tiết</h3>
              <p class="sg-sub">
                Hệ thống sẽ nghe trực tiếp 3 file ghi âm của bạn (Phát âm, Ngữ điệu, Ngữ pháp, Lỗi Vietlish &amp; Mở rộng ý) và trả bài sửa chi tiết sau <strong>${RELEASE_HOURS} tiếng</strong>.
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

      const partsMeta = {};
      presentParts.forEach(n => {
        const blob = uiState.recordings[n];
        partsMeta[String(n)] = {
          present: true,
          mimeType: (blob.type || "audio/webm").split(";")[0].trim()
        };
      });

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
        const blob = uiState.recordings[pNum];
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

      uiState.progressText = "Đang xác nhận nộp bài & xếp lịch chấm AI...";
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
            ? `<button type="button" class="sg-pill-btn" id="sg-btn-notif-bell" title="Thông báo bài sửa Speaking">
                <span>🔔 Bài sửa AI</span>
                ${unreadCount > 0 ? `<span class="sg-bell-badge">${unreadCount > 9 ? "9+" : unreadCount}</span>` : ""}
              </button>`
            : ""
        }
      `;

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
              <span>🔔 Thông báo bài sửa Speaking</span>
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
              <span>📬 Bài thi Speaking đã nộp chấm AI (${homeState.items.length})</span>
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
            <div class="sg-modal-panel" onclick="event.stopPropagation()">
              <div class="sg-modal-header">
                <div>
                  <div style="font-size:16px;font-weight:900;color:#18181b;">📝 Bài sửa chi tiết · ${escapeHtml(it.test_title)}</div>
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
          homeState.modalItem = null;
          renderHomeWidgets();
        };
        const bd = document.getElementById("sg-modal-backdrop");
        const cb = document.getElementById("sg-btn-close-modal");
        if (bd) bd.onclick = closeFn;
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
