// db.js - Shared IndexedDB Manager for VSTEP Speaking Mock Tests
const VstepDB = {
    dbName: "VstepMockDB",
    dbVersion: 1,
    db: null,

    // Initialize Database
    init() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("sessions")) {
                    db.createObjectStore("sessions", { keyPath: "testId" });
                }
                if (!db.objectStoreNames.contains("history")) {
                    db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    // --- Active Sessions Operations ---
    async saveSession(testId, sessionData) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("sessions", "readwrite");
            const store = transaction.objectStore("sessions");
            const data = {
                testId: parseInt(testId),
                ...sessionData,
                lastUpdated: Date.now()
            };
            const request = store.put(data);

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getSession(testId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("sessions", "readonly");
            const store = transaction.objectStore("sessions");
            const request = store.get(parseInt(testId));

            request.onsuccess = (e) => resolve(e.target.result || null);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async deleteSession(testId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("sessions", "readwrite");
            const store = transaction.objectStore("sessions");
            const request = store.delete(parseInt(testId));

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // --- Completed History Operations ---
    async saveHistory(testId, studentName, recordings) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("history", "readwrite");
            const store = transaction.objectStore("history");
            
            // Format date string: HH:MM DD/MM/YYYY
            const now = new Date();
            const dateStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

            const data = {
                id: Date.now(),
                testId: parseInt(testId),
                studentName: studentName || "Học viên",
                dateStr: dateStr,
                recordings: {
                    1: recordings[1] || null,
                    2: recordings[2] || null,
                    3: recordings[3] || null
                }
            };
            const request = store.add(data);

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getAllHistory() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("history", "readonly");
            const store = transaction.objectStore("history");
            const request = store.getAll();

            request.onsuccess = (e) => {
                // Sort history in reverse chronological order (newest first)
                const results = e.target.result || [];
                results.sort((a, b) => b.id - a.id);
                resolve(results);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async deleteHistoryItem(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("history", "readwrite");
            const store = transaction.objectStore("history");
            const request = store.delete(parseInt(id));

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

// ==========================================================================
// Student Authentication & Class Verification Module
// Allowed Classes: CB201, CB202, CB196, B209
// Form Recording: https://forms.gle/pGY7Ci8T1aHv15Ud6
// ==========================================================================
const VstepAuth = {
    ALLOWED_CLASSES: ['CB201', 'CB202', 'CB196', 'B209'],
    FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSe4MK1HLBYtsZ-SkwVmaO_hV_o4C094a7x-17il2H6kqGtuHw/formResponse',
    ENTRY_ID: 'entry.388968236',

    isLoggedIn() {
        const loggedIn = localStorage.getItem('vstep_user_logged_in') === 'true';
        const name = (localStorage.getItem('vstep_student_name') || '').trim();
        const classCode = (localStorage.getItem('vstep_student_class') || '').trim().toUpperCase();
        return loggedIn && name.length > 0 && this.ALLOWED_CLASSES.includes(classCode);
    },

    getStudentInfo() {
        return {
            name: localStorage.getItem('vstep_student_name') || '',
            classCode: (localStorage.getItem('vstep_student_class') || '').toUpperCase(),
            displayName: (localStorage.getItem('vstep_student_name') || 'Học viên') + 
                         (localStorage.getItem('vstep_student_class') ? ` - ${localStorage.getItem('vstep_student_class').toUpperCase()}` : '')
        };
    },

    logout() {
        localStorage.removeItem('vstep_user_logged_in');
        localStorage.removeItem('vstep_student_name');
        localStorage.removeItem('vstep_student_class');
        this.showLoginModal(true);
    },

    injectStyles() {
        if (document.getElementById('vstep-auth-styles')) return;
        const style = document.createElement('style');
        style.id = 'vstep-auth-styles';
        style.textContent = `
            .vstep-auth-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.72);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
                opacity: 0;
                transition: opacity 0.3s ease;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .vstep-auth-card {
                background: #ffffff;
                width: 100%;
                max-width: 440px;
                border-radius: 28px;
                padding: 40px 32px 36px;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2);
                box-sizing: border-box;
                transform: scale(0.92);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .vstep-auth-icon {
                width: 72px;
                height: 72px;
                border-radius: 50%;
                background: #2563eb;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                margin: 0 auto 24px;
                box-shadow: 0 12px 24px -6px rgba(37, 99, 235, 0.45);
            }
            .vstep-auth-title {
                font-size: 21px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.35;
                margin: 0 0 14px 0;
                text-transform: uppercase;
                letter-spacing: -0.01em;
            }
            .vstep-auth-desc {
                font-size: 14.5px;
                color: #64748b;
                line-height: 1.55;
                margin: 0 0 26px 0;
                font-weight: 400;
            }
            .vstep-auth-form {
                display: flex;
                flex-direction: column;
                gap: 14px;
                margin-bottom: 22px;
            }
            .vstep-auth-input {
                width: 100%;
                background: #f1f5f9;
                border: 2px solid transparent;
                border-radius: 14px;
                padding: 16px 18px;
                font-size: 15px;
                font-weight: 600;
                color: #0f172a;
                outline: none;
                transition: all 0.2s ease;
                box-sizing: border-box;
                font-family: inherit;
            }
            .vstep-auth-input::placeholder {
                color: #94a3b8;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-size: 13.5px;
            }
            .vstep-auth-input:focus {
                background: #ffffff;
                border-color: #3b82f6;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
            }
            .vstep-auth-btn {
                background: #4f61f7;
                color: #ffffff;
                border: none;
                border-radius: 14px;
                padding: 17px 20px;
                font-size: 15.5px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                cursor: pointer;
                width: 100%;
                box-shadow: 0 10px 24px -4px rgba(79, 97, 247, 0.45);
                transition: all 0.25s ease;
                font-family: inherit;
            }
            .vstep-auth-btn:hover:not(:disabled) {
                background: #3f51e8;
                transform: translateY(-2px);
                box-shadow: 0 14px 28px -4px rgba(79, 97, 247, 0.55);
            }
            .vstep-auth-btn:active:not(:disabled) {
                transform: translateY(0);
            }
            .vstep-auth-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
            .vstep-auth-error {
                display: none;
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
                border-radius: 10px;
                padding: 10px 14px;
                font-size: 13px;
                font-weight: 600;
                text-align: left;
                line-height: 1.4;
                margin-bottom: 14px;
                animation: fadeIn 0.2s ease;
            }
            .vstep-auth-card.shake {
                animation: authShake 0.4s ease;
            }
            @keyframes authShake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-8px); }
                40%, 80% { transform: translateX(8px); }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    },

    showLoginModal(force = false, onComplete = null) {
        if (!force && this.isLoggedIn()) {
            if (typeof onComplete === 'function') onComplete(this.getStudentInfo());
            return;
        }

        this.injectStyles();

        // Remove existing modal if any
        const existing = document.getElementById('vstep-auth-modal');
        if (existing) existing.remove();

        const current = this.getStudentInfo();

        const overlay = document.createElement('div');
        overlay.id = 'vstep-auth-modal';
        overlay.className = 'vstep-auth-overlay';
        overlay.innerHTML = `
            <div class="vstep-auth-card" id="vstep-auth-card">
                <div class="vstep-auth-icon">
                    <i class="fa-solid fa-pen"></i>
                </div>
                <h2 class="vstep-auth-title">CHÀO MỪNG BẠN ĐẾN VỚI LỚP HỌC CỦA MISS NGUYET</h2>
                <p class="vstep-auth-desc">Vui lòng điền Họ tên và Lớp học của bạn để bắt đầu học. Kết quả luyện tập sẽ được ghi nhận và gửi báo cáo cho giáo viên.</p>
                
                <div class="vstep-auth-error" id="vstep-auth-error"></div>

                <div class="vstep-auth-form">
                    <input type="text" id="vstep-auth-name" class="vstep-auth-input" placeholder="HỌ VÀ TÊN" value="${current.name ? current.name.replace(/"/g, '&quot;') : ''}" autocomplete="off" spellcheck="false">
                    <input type="text" id="vstep-auth-class" class="vstep-auth-input" placeholder="LỚP HỌC" value="${current.classCode ? current.classCode.replace(/"/g, '&quot;') : ''}" autocomplete="off" spellcheck="false">
                </div>

                <button type="button" id="vstep-auth-submit" class="vstep-auth-btn">BẮT ĐẦU HỌC NGAY</button>
            </div>
        `;

        document.body.appendChild(overlay);
        void overlay.offsetHeight;
        overlay.style.opacity = '1';
        overlay.querySelector('.vstep-auth-card').style.transform = 'scale(1)';

        const nameInput = overlay.querySelector('#vstep-auth-name');
        const classInput = overlay.querySelector('#vstep-auth-class');
        const submitBtn = overlay.querySelector('#vstep-auth-submit');
        const errorDiv = overlay.querySelector('#vstep-auth-error');
        const card = overlay.querySelector('#vstep-auth-card');

        setTimeout(() => {
            if (!nameInput.value.trim()) nameInput.focus();
            else classInput.focus();
        }, 150);

        const handleSubmit = async () => {
            const name = nameInput.value.trim();
            const classCode = classInput.value.trim().toUpperCase();

            // Validation
            if (!name) {
                errorDiv.innerText = "⚠️ Vui lòng nhập đầy đủ Họ và tên của bạn.";
                errorDiv.style.display = "block";
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
                nameInput.focus();
                return;
            }

            if (!classCode || !this.ALLOWED_CLASSES.includes(classCode)) {
                errorDiv.innerText = `⚠️ Lớp học không hợp lệ. Vui lòng nhập đúng lớp học của bạn (${this.ALLOWED_CLASSES.join(', ')}).`;
                errorDiv.style.display = "block";
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
                classInput.focus();
                return;
            }

            errorDiv.style.display = "none";
            submitBtn.disabled = true;
            submitBtn.innerText = "ĐANG XÁC THỰC...";

            // Save to localStorage
            localStorage.setItem('vstep_student_name', name);
            localStorage.setItem('vstep_student_class', classCode);
            localStorage.setItem('vstep_user_logged_in', 'true');
            localStorage.setItem('vstep_login_time', Date.now().toString());

            // Record to Google Form in background
            this.sendToGoogleForm(name, classCode);

            // Update UI elements across page if present
            this.updatePageUserInfo();

            // Fade out modal
            setTimeout(() => {
                overlay.style.opacity = '0';
                overlay.querySelector('.vstep-auth-card').style.transform = 'scale(0.92)';
                setTimeout(() => {
                    overlay.remove();
                    if (typeof onComplete === 'function') {
                        onComplete({ name, classCode, displayName: `${name} - ${classCode}` });
                    }
                }, 300);
            }, 300);
        };

        submitBtn.addEventListener('click', handleSubmit);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') classInput.focus();
        });
        classInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });
    },

    sendToGoogleForm(name, classCode) {
        try {
            const entryText = `${name} - Lớp: ${classCode}`;
            const formData = new FormData();
            formData.append(this.ENTRY_ID, entryText);

            // Fetch with no-cors
            fetch(this.FORM_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            }).catch(e => console.log("Google Form background sync:", e));

            // Hidden iframe fallback
            const iframe = document.createElement('iframe');
            iframe.name = 'vstep_hidden_form_iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.action = this.FORM_URL;
            form.method = 'POST';
            form.target = 'vstep_hidden_form_iframe';
            form.style.display = 'none';

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = this.ENTRY_ID;
            input.value = entryText;
            form.appendChild(input);

            document.body.appendChild(form);
            form.submit();

            setTimeout(() => {
                try {
                    form.remove();
                    iframe.remove();
                } catch(e) {}
            }, 3000);
        } catch (err) {
            console.error("Form submit helper error:", err);
        }
    },

    updatePageUserInfo() {
        const info = this.getStudentInfo();
        if (!info.name || !info.classCode) return;

        // 1. If on test page: update #student-name input
        const nameInput = document.getElementById('student-name');
        if (nameInput) {
            nameInput.value = `${info.name} - ${info.classCode}`;
        }
        if (typeof studentName !== 'undefined') {
            studentName = `${info.name} - ${info.classCode}`;
        }

        // 2. If on homepage: update header student badge
        const badgeContainer = document.getElementById('vstep-user-badge-container');
        if (badgeContainer) {
            badgeContainer.innerHTML = `
                <div class="user-logged-badge" style="display: flex; align-items: center; gap: 10px; background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.2); padding: 8px 16px; border-radius: 999px; font-size: 13.5px; color: #1e293b;">
                    <i class="fa-solid fa-circle-user" style="color: #2563eb; font-size: 16px;"></i>
                    <span>Học viên: <strong style="color: #0f172a;">${info.name}</strong> (<strong style="color: #2563eb;">${info.classCode}</strong>)</span>
                    <button type="button" onclick="VstepAuth.showLoginModal(true)" style="background: none; border: none; color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0 0 0 4px;" title="Đổi thông tin học viên"><i class="fa-solid fa-pen-to-square"></i> Đổi</button>
                </div>
            `;
        }
    }
};

// Auto-check on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // If on homepage or test page, update info
    VstepAuth.updatePageUserInfo();
});

