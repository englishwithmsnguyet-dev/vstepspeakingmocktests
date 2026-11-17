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
    ALLOWED_CLASSES: ['CB210', 'CB211', 'CB213', 'ONB103', 'B212', 'B2', 'GV'],
    BANNED_CLASSES: ['CB196', 'CB201', 'CB202', 'CB206', 'CB219', 'CB220', 'B209'],
    REQUIRED_PASSWORD: 'VSTEPSEPTEMBER',
    VALID_PASSWORDS: ['VSTEPSEPTEMBER', 'STUDYHARD', 'B2', 'GIATUE', 'PTMN2896', 'PTMN2412', 'PTMN2805'],
    TEACHER_UNLOCK_PASSWORDS: ['PTMN2896', 'PTMN2412', 'PTMN2805', 'PTMN', 'VSTEPSEPTEMBER', 'STUDYHARD'],
    FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSc7PpUuIwfXofYNKtZ2L_YqhJTlh-Xc7SoBqAgjXxtUla6XZw/formResponse',
    ENTRY_ID: 'entry.1205151935',
    BACKUP_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSe4MK1HLBYtsZ-SkwVmaO_hV_o4C094a7x-17il2H6kqGtuHw/formResponse',
    BACKUP_ENTRY_ID: 'entry.388968236',

    VALID_STUDENTS: {
        "CB210": [
            "Nguyễn Võ Thành Đạt", "Lê Huỳnh Thanh Duy", "Nguyễn Cao Kỳ Duyên", "Đào Ngọc Hân", 
            "Trần Văn Hữu", "Trần Văn Kim Khoa", "Nguyễn Thanh Nâng", "Huỳnh Kỳ Nguyên", 
            "Võ Thị Kim Nguyên", "Võ Hùng Sanh", "Tiền Thị Thanh Thảo", "Trần Thị Thanh Thảo", 
            "Đặng Thị Kim Thoa", "Trần Thị Tiên Tiên", "Lê Kim Tuyền"
        ],
        "CB211": [
            "Hồ Anh Quân", "Lê Thành Nghiệp", "Lê Khánh Lâm", "Huỳnh Thị Ngọc Thắm", 
            "Mai Trần Xuân Mai", "Lê Thị Uyển Nhi", "Nguyễn Thụy Thanh Trúc"
        ],
        "CB213": [
            "Nguyễn Quốc Anh", "Hoàng Hợp Minh Châu", "Đặng Châu Gia Huy", "Trần Minh Tuệ Mẩn", 
            "Trần Minh Tuệẫn", "Đặng Thị Trúc Măng", "Trương Thị Kha My", "Ngô Diễm My", 
            "Chiêm Chúc Ngân", "Huỳnh Thị Yến Nhi", "Phạm Nguyễn Tâm Như", "Phạm Nhựt Tiến", 
            "Phạm Nhật Tiến", "Lê Thị Tú Trinh", "Trần Ngọc Vinh"
        ],
        "ONB103": [
            "Nguyễn Thị Duy", "Phạm Trần Mỹ Hân", "Trịnh Thị Thu Hiền", "Nguyễn Hoàng Kha", 
            "Phạm Thị Út Lụa", "Phạm Thị Út Lua", "Lê Huỳnh Diễm My", "Nguyễn Thị Ngọc Mỹ", 
            "Huỳnh Thị Kim Ngân", "Trần Thị Kim Ngân", "Nguyễn Thị Tiểu Phụng", "Trần Yến Phụng", 
            "Phạm Ngọc Thạch", "Cao Thị Thu Trang", "Nguyễn Thị Thanh Tuyền", "Trần Phạm Phương Uyên", 
            "Trần Ngô Mỹ Vy"
        ],
        "B212": [
            "Nguyễn Duy Hồng Anh", "Nguyễn Ngọc Minh Anh", "Nguyễn Lê Mỹ Hân", "Nguyễn Hồng Minh Huy", 
            "Nguyễn Quốc Khải", "Đoàn Nguyễn Đình Khang", "Lê Nguyễn Gia Khánh", "Nguyễn Hữu Khánh", 
            "Hồ Thị Ngọc Lan", "Trần Thị Hồng Lỉnh", "Trần Thị Hồng Lĩnh", "Võ Thị Triệu Minh", 
            "Hứa Đình Nghi", "Võ Thị Bảo Ngọc", "Lê Tiến Phát", "Nguyễn Hoàng Thông", 
            "Trần Hoàng Thông", "Nguyễn Kim Tiền", "Lê Thị Bảo Trân", "Võ Thị Diễm Trinh", 
            "Nguyễn Tấn Trung", "Nguyễn Tiến Trung", "Trần Thị Ánh Tuyết", "Đặng Nguyễn Khánh Uyên", 
            "Nguyễn Thị Chúc Yến"
        ],
        "B2": [
            "Gia Tuệ", "Trương Gia Tuệ", "Gia Tuê", "Nguyễn Gia Tuệ", "Trần Gia Tuệ", "Lê Gia Tuệ"
        ]
    },

    removeVietnameseTones(str) {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D');
    },

    normalizeVietnameseName(str) {
        if (!str) return '';
        return str
            .normalize('NFC')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    },

    checkIsGiaTue(nameInput) {
        if (!nameInput) return false;
        const norm = this.removeVietnameseTones(this.normalizeVietnameseName(nameInput));
        return norm.includes('gia tue') || norm.replace(/\s+/g, '').includes('giatue');
    },

    getStudentLockKey(name) {
        if (!name) return 'vstep_locked_generic';
        return 'vstep_locked_' + this.removeVietnameseTones(this.normalizeVietnameseName(name)).replace(/[^a-z0-9]/g, '');
    },

    isStudentLocked(name, className) {
        if (!name) return false;
        const cleanClass = className || sessionStorage.getItem('vstep_student_class') || localStorage.getItem('vstep_student_class') || '';
        if (this.isTeacher(name, cleanClass)) return false;
        const key = this.getStudentLockKey(name);
        return localStorage.getItem(key) === 'true' || localStorage.getItem('vstep_current_user_locked') === 'true';
    },

    lockStudentAccount(name, className, reason) {
        if (this.isTeacher(name, className)) return;
        const key = this.getStudentLockKey(name);
        localStorage.setItem(key, 'true');
        localStorage.setItem('vstep_current_user_locked', 'true');
        localStorage.setItem('vstep_locked_student_name', name);
        localStorage.setItem('vstep_locked_student_class', className);
        localStorage.setItem('vstep_locked_reason', reason || 'Vi phạm quy chế thi 3 lần (chuyển tab hoặc sao chép/dán)');
        localStorage.setItem('vstep_locked_time', new Date().toLocaleString('vi-VN'));
    },

    unlockStudentAccount(passwordInput) {
        const pass = (passwordInput || '').trim().toUpperCase();
        if (!this.TEACHER_UNLOCK_PASSWORDS.includes(pass)) {
            return { ok: false, error: 'Mật khẩu Giáo viên không chính xác!' };
        }
        const studentName = localStorage.getItem('vstep_locked_student_name') || localStorage.getItem('vstep_student_name') || '';
        if (studentName) {
            localStorage.removeItem(this.getStudentLockKey(studentName));
        }
        localStorage.removeItem('vstep_current_user_locked');
        localStorage.removeItem('vstep_locked_student_name');
        localStorage.removeItem('vstep_locked_student_class');
        localStorage.removeItem('vstep_locked_reason');
        localStorage.removeItem('vstep_locked_time');
        sessionStorage.removeItem('vstep_cheat_violations');
        return { ok: true };
    },

    promptTeacherUnlock() {
        const pass = prompt("Nhập mật khẩu Giáo viên để mở khóa cho học viên:");
        if (!pass) return;
        const res = this.unlockStudentAccount(pass);
        if (res.ok) {
            alert("✅ ĐÃ MỞ KHÓA THÀNH CÔNG! Tài khoản học viên đã được mở khóa.");
            location.reload();
        } else {
            alert("❌ " + res.error);
        }
    },

    validateStudentIdentity(fullName, className) {
        const cleanName = (fullName || '').trim();
        let cleanClass = (className || '').replace(/^(LỚP|LOP|CLASS)\s*/i, '').trim().toUpperCase();

        if (this.isTeacher(cleanName, cleanClass)) {
            return { ok: true, matchedName: 'Cô Nguyệt (PTMN)', className: 'GV' };
        }

        if (this.checkIsGiaTue(cleanName) && (!cleanClass || cleanClass === 'B2' || cleanClass === 'CB206')) {
            cleanClass = 'B2';
        }

        if (!this.ALLOWED_CLASSES.includes(cleanClass)) {
            return { 
                ok: false, 
                error: `Lớp "${className}" không hợp lệ hoặc đã kết thúc! Hệ thống hiện chỉ nhận các lớp: CB210, CB211, CB213, ONB103, B212 và học viên Gia Tuệ (B2).` 
            };
        }

        if (cleanClass === 'B2') {
            if (!this.checkIsGiaTue(cleanName)) {
                return { 
                    ok: false, 
                    error: 'Mã lớp B2 hiện chỉ dành riêng cho học viên Gia Tuệ (B2)! Vui lòng kiểm tra lại Họ tên hoặc Mã lớp.' 
                };
            }
            return { ok: true, matchedName: 'Gia Tuệ', className: 'B2' };
        }

        if (cleanClass === 'GV') {
            return { 
                ok: false, 
                error: 'Mã lớp GV chỉ dành riêng cho tài khoản Giáo viên (PTMN)!' 
            };
        }

        const roster = this.VALID_STUDENTS[cleanClass] || [];
        const normInput = this.normalizeVietnameseName(cleanName);
        const noToneInput = this.removeVietnameseTones(normInput);

        const found = roster.find(st => {
            const normSt = this.normalizeVietnameseName(st);
            const noToneSt = this.removeVietnameseTones(normSt);
            return normSt === normInput || noToneSt === noToneInput;
        });

        if (!found) {
            if (this.checkIsGiaTue(cleanName)) {
                return { ok: true, matchedName: 'Gia Tuệ', className: 'B2' };
            }
            return { 
                ok: false, 
                error: `Họ và tên "${cleanName}" không có trong danh sách lớp ${cleanClass}. Vui lòng kiểm tra lại chính xác họ tên và mã lớp!` 
            };
        }

        return { ok: true, matchedName: found, className: cleanClass };
    },

    isTeacher(name = '', classCode = '') {
        const n = String(name || '').trim().toLowerCase();
        const c = String(classCode || '').trim().toUpperCase();
        if (c === 'GV') return true;
        if (/^(ptmn|gv|cô nguyệt|co nguyet|phạm thị minh nguyệt|pham thi minh nguyet|giáo viên|giao vien|teacher|miss nguyet)$/i.test(n)) return true;
        if (n.includes('ptmn') || n.includes('cô nguyệt') || n.includes('co nguyet') || n.includes('giáo viên') || n.includes('giao vien') || n.includes('teacher')) return true;
        return false;
    },

    isGiaTue(name = '', classCode = '') {
        const n = String(name || '').trim().toLowerCase();
        const c = String(classCode || '').trim().toUpperCase();
        return this.checkIsGiaTue(n) || (c === 'B2' && (n.includes('gia tue') || n.includes('gia tuệ')));
    },

    isLoggedIn() {
        const loggedIn = (sessionStorage.getItem('vstep_user_logged_in') === 'true' || 
                          localStorage.getItem('vstep_user_logged_in') === 'true' ||
                          sessionStorage.getItem('vstep_student_logged_in') === 'true' ||
                          localStorage.getItem('vstep_student_logged_in') === 'true');
        const name = (sessionStorage.getItem('vstep_student_name') || localStorage.getItem('vstep_student_name') || '').trim();
        const classCode = (sessionStorage.getItem('vstep_student_class') || localStorage.getItem('vstep_student_class') || '').trim().toUpperCase();
        if (this.isStudentLocked(name, classCode)) return false;
        if (this.isTeacher(name, classCode)) {
            sessionStorage.setItem('vstep_user_logged_in', 'true');
            sessionStorage.setItem('vstep_student_name', 'Cô Nguyệt (PTMN)');
            sessionStorage.setItem('vstep_student_class', 'GV');
            localStorage.setItem('vstep_user_logged_in', 'true');
            localStorage.setItem('vstep_student_name', 'Cô Nguyệt (PTMN)');
            localStorage.setItem('vstep_student_class', 'GV');
            return true;
        }
        if (this.BANNED_CLASSES.includes(classCode)) return false;
        const validation = this.validateStudentIdentity(name, classCode);
        if (loggedIn && name.length > 0 && validation.ok) {
            sessionStorage.setItem('vstep_user_logged_in', 'true');
            sessionStorage.setItem('vstep_student_name', validation.matchedName);
            sessionStorage.setItem('vstep_student_class', validation.className);
            localStorage.setItem('vstep_user_logged_in', 'true');
            localStorage.setItem('vstep_student_name', validation.matchedName);
            localStorage.setItem('vstep_student_class', validation.className);
            return true;
        }
        return false;
    },

    getStudentInfo() {
        const name = (sessionStorage.getItem('vstep_student_name') || localStorage.getItem('vstep_student_name') || '').trim();
        const classCode = (sessionStorage.getItem('vstep_student_class') || localStorage.getItem('vstep_student_class') || '').trim().toUpperCase();
        return {
            name,
            classCode,
            displayName: (name || 'Học viên') + (classCode ? ` - ${classCode}` : '')
        };
    },

    logout() {
        localStorage.removeItem('vstep_user_logged_in');
        localStorage.removeItem('vstep_student_name');
        localStorage.removeItem('vstep_student_class');
        sessionStorage.removeItem('vstep_user_logged_in');
        sessionStorage.removeItem('vstep_student_name');
        sessionStorage.removeItem('vstep_student_class');
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
                padding: 34px 28px 24px 28px;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(99, 102, 241, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.04);
                box-sizing: border-box;
                transform: scale(0.92);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 1.5px solid rgba(226, 232, 240, 0.95);
                position: relative;
            }
            body.dark-theme .vstep-auth-card {
                background: #111827;
                border-color: rgba(255, 255, 255, 0.12);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            }
            .login-teacher-avatar-wrap {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 1.15rem;
                position: relative;
            }
            .login-teacher-halo {
                position: relative;
                width: 126px;
                height: 126px;
                border-radius: 50%;
                padding: 4px;
                background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #38bdf8 100%);
                box-shadow: 0 0 28px rgba(99, 102, 241, 0.45), 0 0 50px rgba(236, 72, 153, 0.25);
                animation: haloPulse 3.5s ease-in-out infinite alternate;
            }
            @keyframes haloPulse {
                0% {
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.35), 0 0 35px rgba(236, 72, 153, 0.2);
                    transform: scale(1);
                }
                100% {
                    box-shadow: 0 0 32px rgba(99, 102, 241, 0.6), 0 0 55px rgba(236, 72, 153, 0.4);
                    transform: scale(1.025);
                }
            }
            .login-teacher-avatar {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
                object-position: center 20%;
                border: 3.5px solid #ffffff;
                display: block;
                box-sizing: border-box;
            }
            body.dark-theme .login-teacher-avatar {
                border-color: #1e293b;
            }
            .login-teacher-badge {
                margin-top: 0.65rem;
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                font-size: 0.72rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding: 0.25rem 0.8rem;
                border-radius: 9999px;
                background: rgba(99, 102, 241, 0.12);
                border: 1.5px solid rgba(99, 102, 241, 0.35);
                color: #6366f1;
            }
            body.dark-theme .login-teacher-badge {
                background: rgba(99, 102, 241, 0.25);
                color: #a5b4fc;
                border-color: rgba(99, 102, 241, 0.5);
            }
            .login-brand-tag {
                font-size: 0.95rem;
                font-weight: 700;
                color: #7c3aed;
                margin-bottom: 0.35rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.45rem;
            }
            body.dark-theme .login-brand-tag {
                color: #c084fc;
            }
            .login-course-title {
                font-size: 1.05rem;
                font-weight: 800;
                color: #4f46e5;
                letter-spacing: 0.02em;
                margin-bottom: 0.6rem;
                text-transform: uppercase;
            }
            body.dark-theme .login-course-title {
                color: #818cf8;
            }
            .login-title-custom {
                font-size: 1.45rem;
                font-weight: 900;
                color: #0f172a;
                line-height: 1.25;
                margin: 0 0 1.25rem 0;
                letter-spacing: -0.01em;
            }
            body.dark-theme .login-title-custom {
                color: #f8fafc;
            }
            .vstep-auth-form {
                display: flex;
                flex-direction: column;
                gap: 0.9rem;
                margin-bottom: 1rem;
            }
            .input-group-custom {
                display: flex;
                flex-direction: column;
                gap: 0.35rem;
                text-align: left;
                width: 100%;
                box-sizing: border-box;
            }
            .input-group-custom label {
                font-size: 0.78rem;
                font-weight: 800;
                color: #334155;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                display: flex;
                align-items: center;
                gap: 0.45rem;
            }
            body.dark-theme .input-group-custom label {
                color: #cbd5e1;
            }
            .input-group-custom .vstep-auth-input {
                width: 100%;
                background: #f8fafc;
                border: 1.5px solid #e2e8f0;
                border-radius: 12px;
                padding: 0.8rem 1rem;
                font-size: 0.95rem;
                font-weight: 600;
                color: #0f172a;
                outline: none;
                transition: all 0.2s ease;
                box-sizing: border-box;
                font-family: inherit;
            }
            body.dark-theme .input-group-custom .vstep-auth-input {
                background: #1e293b;
                border-color: #334155;
                color: #f8fafc;
            }
            .input-group-custom .vstep-auth-input::placeholder {
                color: #94a3b8;
                font-weight: 500;
                font-size: 0.9rem;
            }
            .input-group-custom .vstep-auth-input:focus {
                background: #ffffff;
                border-color: #6366f1;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
            }
            body.dark-theme .input-group-custom .vstep-auth-input:focus {
                background: #0f172a;
                border-color: #818cf8;
                box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.25);
            }
            .pwd-wrapper {
                position: relative;
                width: 100%;
            }
            .btn-toggle-pwd {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                color: #94a3b8;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
            }
            .btn-toggle-pwd:hover {
                color: #4f46e5;
            }
            .vstep-auth-btn {
                background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
                color: #ffffff;
                border: none;
                border-radius: 14px;
                padding: 0.95rem 1.25rem;
                font-size: 1rem;
                font-weight: 800;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                cursor: pointer;
                width: 100%;
                box-shadow: 0 10px 24px -4px rgba(99, 102, 241, 0.45);
                transition: all 0.25s ease;
                font-family: inherit;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                box-sizing: border-box;
            }
            .vstep-auth-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 14px 28px -4px rgba(99, 102, 241, 0.55);
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
                border-radius: 12px;
                padding: 10px 14px;
                font-size: 13.5px;
                font-weight: 600;
                margin-bottom: 1rem;
                text-align: left;
                line-height: 1.4;
            }
            body.dark-theme .vstep-auth-error {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.3);
                color: #fca5a5;
            }
            .login-footer-signature {
                margin-top: 1.15rem;
                font-size: 0.8rem;
                font-weight: 800;
                letter-spacing: 0.06em;
                text-align: center;
            }
            .login-footer-signature a {
                color: #64748b;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.45rem;
                transition: color 0.2s;
            }
            .login-footer-signature a:hover {
                color: #1877f2;
            }
            body.dark-theme .login-footer-signature a {
                color: #94a3b8;
            }
            body.dark-theme .login-footer-signature a:hover {
                color: #38bdf8;
            }
            .vstep-auth-card.shake {
                animation: authShake 0.4s ease;
            }
            @keyframes authShake {
                0%, 100% { transform: scale(1) translateX(0); }
                20%, 60% { transform: scale(1) translateX(-8px); }
                40%, 80% { transform: scale(1) translateX(8px); }
            }
        `;
        document.head.appendChild(style);
    },

    showLoginModal(force =  false, onComplete = null) {
        if (!force && this.isLoggedIn()) {
            if (typeof onComplete === 'function') onComplete(this.getStudentInfo());
            return;
        }

        this.injectStyles();

        // Remove existing modal if any
        const existing = document.getElementById('vstep-auth-modal');
        if (existing) existing.remove();

        const current = this.getStudentInfo();

        const isSub = window.location.pathname.includes('/test ') || window.location.pathname.includes('/test%20') || window.location.pathname.includes('test0') || window.location.pathname.includes('test1');
        const avatarSrc = isSub ? '../miss_nguyet.jpg' : 'miss_nguyet.jpg';

        const overlay = document.createElement('div');
        overlay.id = 'vstep-auth-modal';
        overlay.className = 'vstep-auth-overlay';
        overlay.innerHTML = `
            <div class="vstep-auth-card login-card-custom" id="vstep-auth-card">
                <!-- Miss Nguyet Avatar Brand Ring -->
                <div class="login-teacher-avatar-wrap">
                    <div class="login-teacher-halo">
                        <img src="${avatarSrc}" alt="Miss Nguyet" class="login-teacher-avatar" onerror="if(this.src!=='miss_nguyet.jpg') this.src='miss_nguyet.jpg';">
                    </div>
                    <span class="login-teacher-badge">
                        <i class="fa-solid fa-certificate"></i> LEAD INSTRUCTOR
                    </span>
                </div>

                <div class="login-brand-tag">
                    <i class="fa-solid fa-graduation-cap"></i> Welcome to Miss Nguyet's Class!
                </div>
                <div class="login-course-title">VSTEP SPEAKING MOCK TESTS</div>
                <h2 class="login-title-custom">NHẬP THÔNG TIN<br/>ĐỂ BẮT ĐẦU THI 🚀</h2>
                
                <div class="vstep-auth-error" id="vstep-auth-error"></div>

                <div class="vstep-auth-form">
                    <div class="input-group-custom">
                        <label for="vstep-auth-name">
                            <i class="fa-solid fa-user-pen" style="color: #6366f1;"></i> HỌ VÀ TÊN HỌC VIÊN:
                        </label>
                        <input type="text" id="vstep-auth-name" class="vstep-auth-input" placeholder="Nhập họ và tên học viên..." value="${current.name || ''}" autocomplete="name" spellcheck="false">
                    </div>

                    <div class="input-group-custom">
                        <label for="vstep-auth-class">
                            <i class="fa-solid fa-chalkboard-user" style="color: #06b6d4;"></i> MÃ LỚP HỌC:
                        </label>
                        <input type="text" id="vstep-auth-class" class="vstep-auth-input" placeholder="Nhập mã lớp học (VD: B2, CB210, CB211...)" value="${current.classCode || ''}" autocomplete="off" spellcheck="false">
                    </div>

                    <div class="input-group-custom">
                        <label for="vstep-auth-password">
                            <i class="fa-solid fa-key" style="color: #f59e0b;"></i> MẬT KHẨU TRUY CẬP:
                        </label>
                        <div class="pwd-wrapper">
                            <input type="password" id="vstep-auth-password" class="vstep-auth-input" placeholder="Nhập mật khẩu..." value="" autocomplete="current-password" spellcheck="false" style="padding-right: 2.8rem;">
                            <button type="button" id="btn-toggle-pwd" class="btn-toggle-pwd" title="Hiện/Ẩn mật khẩu">
                                <i class="fa-solid fa-eye" id="icon-pwd-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <button type="button" id="vstep-auth-submit" class="vstep-auth-btn">
                    <span>VÀO PHÒNG THI</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>

                <div class="login-footer-signature">
                    <a href="https://www.facebook.com/nguyetpham28" target="_blank" rel="noopener noreferrer">
                        <i class="fa-brands fa-facebook" style="color: #1877f2;"></i>
                        <span>ENGLISH WITH MISS NGUYET</span>
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        void overlay.offsetHeight;
        overlay.style.opacity = '1';
        overlay.querySelector('.vstep-auth-card').style.transform = 'scale(1)';

        const nameInput = overlay.querySelector('#vstep-auth-name');
        const classInput = overlay.querySelector('#vstep-auth-class');
        const passwordInput = overlay.querySelector('#vstep-auth-password');
        const toggleBtn = overlay.querySelector('#btn-toggle-pwd');
        const eyeIcon = overlay.querySelector('#icon-pwd-eye');
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isPwd = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPwd ? 'text' : 'password');
                if (eyeIcon) {
                    eyeIcon.className = isPwd ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                }
            });
        }
        const submitBtn = overlay.querySelector('#vstep-auth-submit');
        const errorDiv = overlay.querySelector('#vstep-auth-error');
        const card = overlay.querySelector('#vstep-auth-card');

        const updateAuthHints = () => {
            const nVal = (nameInput.value || '').trim();
            const cVal = (classInput.value || '').trim().toUpperCase();
            const isT = this.isTeacher(nVal, cVal);
            const isGT = this.isGiaTue(nVal, cVal);
            const pwdLabel = overlay.querySelector('label[for="vstep-auth-password"]');
            if (pwdLabel) {
                if (isT) {
                    pwdLabel.innerHTML = `<i class="fa-solid fa-key" style="color: #10b981;"></i> MẬT KHẨU TRUY CẬP: <span style="color: #10b981; font-size: 12px; font-weight: 700; text-transform: none;">(Giáo viên: Không cần mật khẩu)</span>`;
                    passwordInput.placeholder = "Tài khoản Giáo viên không cần mật khẩu";
                } else if (isGT) {
                    pwdLabel.innerHTML = `<i class="fa-solid fa-key" style="color: #6366f1;"></i> MẬT KHẨU TRUY CẬP: <span style="color: #6366f1; font-size: 12px; font-weight: 700; text-transform: none;">(Học viên B2)</span>`;
                    passwordInput.placeholder = "Nhập mật khẩu (nếu có)...";
                } else {
                    pwdLabel.innerHTML = `<i class="fa-solid fa-key" style="color: #f59e0b;"></i> MẬT KHẨU TRUY CẬP:`;
                    passwordInput.placeholder = "Nhập mật khẩu...";
                }
            }
        };

        nameInput.addEventListener('input', updateAuthHints);
        classInput.addEventListener('input', updateAuthHints);
        updateAuthHints();

        setTimeout(() => {
            if (nameInput) nameInput.focus();
        }, 150);

        const handleSubmit = async () => {
            let name = nameInput.value.trim();
            let classCode = classInput.value.trim().toUpperCase();
            const password = (passwordInput.value || '').trim();

            if (classCode === 'LỚP B2' || classCode === 'LOP B2' || classCode === 'B 2') {
                classCode = 'B2';
            }

            // Check if locked
            if (this.isStudentLocked(name)) {
                errorDiv.innerHTML = `⚠️ Tài khoản <strong>${name}</strong> hiện đang bị KHÓA do vi phạm quy chế thi 3 lần!<br><br><span style="font-size:13px; color:#475569;">Vui lòng liên hệ Giáo viên (Cô Nguyệt) để mở khóa.</span><br><br><button type="button" onclick="VstepAuth.promptTeacherUnlock()" style="background:#10b981; color:#fff; border:none; padding:7px 15px; border-radius:8px; font-weight:700; cursor:pointer;"><i class="fa-solid fa-key"></i> Giáo viên mở khóa</button>`;
                errorDiv.style.display = "block";
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
                return;
            }

            const isTeacher = this.isTeacher(name, classCode);
            const isGiaTue = this.isGiaTue(name, classCode);

            if (isTeacher && !classCode) {
                classCode = 'GV';
                classInput.value = 'GV';
            }

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

            if (!classCode || classCode.length < 2) {
                errorDiv.innerText = `⚠️ Vui lòng nhập mã lớp học của bạn (VD: B2, CB210, CB211...).`;
                errorDiv.style.display = "block";
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
                classInput.focus();
                return;
            }

            const validation = this.validateStudentIdentity(name, classCode);
            if (!validation.ok) {
                errorDiv.innerText = `⚠️ ${validation.error}`;
                errorDiv.style.display = "block";
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
                return;
            }

            name = validation.matchedName;
            classCode = validation.className;

            // Password check:
            // 1. Teacher account does NOT require a password!
            // 2. Student Gia Tuệ with class B2 can log in without password or with any password
            // 3. Other students require a valid password
            if (!isTeacher && !isGiaTue) {
                if (!password) {
                    errorDiv.innerText = "⚠️ Vui lòng nhập Mật khẩu.";
                    errorDiv.style.display = "block";
                    card.classList.remove('shake');
                    void card.offsetWidth;
                    card.classList.add('shake');
                    passwordInput.focus();
                    return;
                }

                const upperPass = password.toUpperCase();
                if (!this.VALID_PASSWORDS.includes(upperPass)) {
                    errorDiv.innerText = "⚠️ Mật khẩu không chính xác. Vui lòng thử lại!";
                    errorDiv.style.display = "block";
                    card.classList.remove('shake');
                    void card.offsetWidth;
                    card.classList.add('shake');
                    passwordInput.value = '';
                    passwordInput.focus();
                    return;
                }
            }

            errorDiv.style.display = "none";
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>ĐANG XÁC THỰC...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

            // Save to sessionStorage (active session) and localStorage (display)
            localStorage.setItem('vstep_student_name', name);
            localStorage.setItem('vstep_student_class', classCode);
            localStorage.setItem('vstep_user_logged_in', 'true');
            localStorage.setItem('vstep_student_logged_in', 'true');
            localStorage.setItem('vstep_login_time', Date.now().toString());
            sessionStorage.setItem('vstep_student_name', name);
            sessionStorage.setItem('vstep_student_class', classCode);
            sessionStorage.setItem('vstep_user_logged_in', 'true');
            sessionStorage.setItem('vstep_student_logged_in', 'true');

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
            if (e.key === 'Enter') {
                const cVal = classInput.value.trim().toUpperCase();
                const nVal = nameInput.value.trim();
                if (this.isTeacher(nVal, cVal) || this.isGiaTue(nVal, cVal)) {
                    handleSubmit();
                } else {
                    passwordInput.focus();
                }
            }
        });
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });
    },

    sendToGoogleForm(name, classCode) {
        try {
            const entryText = `${name} - ${classCode} - [SPEAKING MOCK TESTS]`;

            // 1. Send to primary Google Form (dxQSTJbMVHfdFgGL8)
            const formData1 = new FormData();
            formData1.append(this.ENTRY_ID, entryText);
            fetch(this.FORM_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData1
            }).catch(() => {});

            // Hidden iframe fallback 1
            const iframe1 = document.createElement('iframe');
            iframe1.name = 'vstep_hidden_form_iframe1';
            iframe1.style.display = 'none';
            document.body.appendChild(iframe1);

            const form1 = document.createElement('form');
            form1.action = this.FORM_URL;
            form1.method = 'POST';
            form1.target = 'vstep_hidden_form_iframe1';
            form1.style.display = 'none';

            const input1 = document.createElement('input');
            input1.type = 'hidden';
            input1.name = this.ENTRY_ID;
            input1.value = entryText;
            form1.appendChild(input1);
            document.body.appendChild(form1);
            form1.submit();

            // 2. Send to backup Google Form if configured
            if (this.BACKUP_FORM_URL && this.BACKUP_ENTRY_ID) {
                const formData2 = new FormData();
                formData2.append(this.BACKUP_ENTRY_ID, entryText);
                fetch(this.BACKUP_FORM_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: formData2
                }).catch(() => {});
            }

            setTimeout(() => {
                try {
                    form1.remove();
                    iframe1.remove();
                } catch(e) {}
            }, 3000);
        } catch (err) {
            console.error("Form submit helper error:", err);
        }
    },

    updatePageUserInfo() {
        const info = this.getStudentInfo();
        const isTeacher = this.isTeacher(info.name, info.classCode);
        if (!info.name || !info.classCode || (!this.ALLOWED_CLASSES.includes(info.classCode.toUpperCase()) && !isTeacher)) return;

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
            if (isTeacher) {
                badgeContainer.innerHTML = `
                    <div class="user-logged-badge" style="display: flex; align-items: center; gap: 10px; background: rgba(234, 179, 8, 0.15); border: 1.5px solid rgba(234, 179, 8, 0.4); padding: 7px 16px; border-radius: 999px; font-size: 13.5px; color: #1e293b; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                        <i class="fa-solid fa-chalkboard-user" style="color: #eab308; font-size: 16px;"></i>
                        <span>Giáo viên: <strong style="color: #0f172a;">${info.name}</strong> (<strong style="color: #ca8a04;">${info.classCode}</strong>)</span>
                        <button type="button" onclick="VstepAuth.showLoginModal(true)" style="background: #fef08a; border: none; color: #854d0e; font-size: 12px; font-weight: 700; cursor: pointer; padding: 4px 10px; border-radius: 8px; margin-left: 6px; transition: all 0.2s ease;" title="Đổi thông tin"><i class="fa-solid fa-user-pen"></i> Đổi</button>
                    </div>
                `;
            } else {
                badgeContainer.innerHTML = `
                    <div class="user-logged-badge" style="display: flex; align-items: center; gap: 10px; background: rgba(37, 99, 235, 0.08); border: 1.5px solid rgba(37, 99, 235, 0.25); padding: 7px 16px; border-radius: 999px; font-size: 13.5px; color: #1e293b; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                        <i class="fa-solid fa-circle-user" style="color: #2563eb; font-size: 16px;"></i>
                        <span>Học viên: <strong style="color: #0f172a;">${info.name}</strong> (<strong style="color: #2563eb;">${info.classCode}</strong>)</span>
                        <button type="button" onclick="VstepAuth.showLoginModal(true)" style="background: #f1f5f9; border: none; color: #475569; font-size: 12px; font-weight: 700; cursor: pointer; padding: 4px 10px; border-radius: 8px; margin-left: 6px; transition: all 0.2s ease;" title="Đổi thông tin học viên"><i class="fa-solid fa-user-pen"></i> Đổi</button>
                    </div>
                `;
            }
        }
    },

    setupAntiCheat() {
        const isTestPage = window.location.pathname.includes('/test ') || 
                           window.location.pathname.includes('/test%20') || 
                           window.location.pathname.includes('test0') || 
                           window.location.pathname.includes('test1');
        if (!isTestPage) return;

        let lastCheatWarningTime = 0;
        const triggerCheat = (reason) => {
            const info = this.getStudentInfo();
            if (this.isTeacher(info.name, info.classCode)) return; // Giáo viên không bị hạn chế

            const now = Date.now();
            if (now - lastCheatWarningTime < 2000) return;
            lastCheatWarningTime = now;

            let count = parseInt(sessionStorage.getItem('vstep_cheat_violations') || '0', 10) + 1;
            sessionStorage.setItem('vstep_cheat_violations', count.toString());

            if (count >= 3) {
                this.lockStudentAccount(info.name, info.classCode, reason);
                alert(`🚫 TÀI KHOẢN ĐÃ BỊ KHÓA!\n\nThí sinh: ${info.name} (${info.classCode})\nLý do: ${reason} (Vi phạm 3 lần).\n\nVui lòng liên hệ Giáo viên (Cô Nguyệt) để được mở khóa!`);
                location.reload();
            } else {
                alert(`⚠️ CẢNH BÁO GIAN LẬN THI (LẦN ${count}/3)!\n\nLý do: ${reason}\n\nQuy chế thi: Nghiêm cấm sao chép, dán hoặc chuyển tab trình duyệt!\nNếu vi phạm đủ 3 lần, tài khoản sẽ bị KHÓA NGAY LẬP TỨC!`);
            }
        };

        // 1. Prevent copy/cut/paste
        ['copy', 'cut', 'paste'].forEach(evt => {
            document.addEventListener(evt, (e) => {
                const info = this.getStudentInfo();
                if (this.isTeacher(info.name, info.classCode)) return;
                e.preventDefault();
                const act = evt === 'paste' ? 'Dán (Paste)' : (evt === 'copy' ? 'Sao chép (Copy)' : 'Cắt (Cut)');
                triggerCheat(`Hành vi ${act} nội dung bị cấm trong bài thi!`);
            }, true);
        });

        // 2. Prevent shortcuts
        document.addEventListener('keydown', (e) => {
            const info = this.getStudentInfo();
            if (this.isTeacher(info.name, info.classCode)) return;
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            const k = (e.key || '').toLowerCase();
            if (isCtrlOrCmd && (k === 'c' || k === 'v' || k === 'x')) {
                e.preventDefault();
                triggerCheat('Phím tắt sao chép/dán bị cấm trong bài thi!');
            }
        }, true);

        // 3. Tab switching detection
        let tabHiddenTime = 0;
        document.addEventListener('visibilitychange', () => {
            const info = this.getStudentInfo();
            if (this.isTeacher(info.name, info.classCode)) return;
            if (document.hidden) {
                tabHiddenTime = Date.now();
            } else {
                if (tabHiddenTime > 0) {
                    tabHiddenTime = 0;
                    triggerCheat('Hành vi rời khỏi bài thi hoặc chuyển tab trình duyệt bị cấm!');
                }
            }
        });
    },
};

// Auto-check on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // If on homepage or test page, update info
    if (typeof VstepAuth !== 'undefined') {
        VstepAuth.updatePageUserInfo();
        if (!VstepAuth.isLoggedIn()) {
            VstepAuth.showLoginModal(false);
        }
        VstepAuth.setupAntiCheat();
    }
});

