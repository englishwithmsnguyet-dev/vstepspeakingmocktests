/* ==========================================================================
   VSTEP SPEAKING MOCK TEST 01 - CORE SCRIPT
   Logic: Audio Recording, Dynamic Timers, Synthesized Alerts, Visualizer
   ========================================================================== */

// 1. Application State Variables
let currentScreen = 'welcome'; // 'welcome', 'part1', 'part2_prep', 'part2_speak', 'part3_prep', 'part3_speak', 'review'
let studentName = 'Học viên';
let isTestCompleted = false;
let micStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let currentRecordingPart = null;

// Audio Blobs for recordings
const recordings = {
    1: null,
    2: null,
    3: null
};

// Timer Variables
let timerInterval = null;
let totalTime = 0;
let timeRemaining = 0;

// Web Audio API Context for Chimes & Visualizer
let audioCtx = null;
let analyser = null;
let dataArray = null;
let visualizerId = null;

// Cached visualizer elements to prevent lag
let waveBars = {};
let visualizerContainers = {};

// Timings configuration (in seconds)
const TIMINGS = {
    part1: 180,       // 3 minutes speaking (no prep)
    part2_prep: 60,   // 1 minute preparation
    part2_speak: 180, // 3 minutes speaking (total 4 minutes)
    part3_prep: 60,   // 1 minute preparation
    part3_speak: 240  // 4 minutes speaking (total 5 minutes)
};

// 2. DOM Elements Selection
const elements = {
    // Navigation / Screen containers
    stepWelcome: document.getElementById('step-welcome'),
    stepPart1: document.getElementById('step-part1'),
    stepPart2: document.getElementById('step-part2'),
    stepPart3: document.getElementById('step-part3'),
    stepReview: document.getElementById('step-review'),
    
    viewWelcome: document.getElementById('view-welcome'),
    viewPart1: document.getElementById('view-part1'),
    viewPart2: document.getElementById('view-part2'),
    viewPart3: document.getElementById('view-part3'),
    viewReview: document.getElementById('view-review'),
    
    // Welcome Screen
    studentNameInput: document.getElementById('student-name'),
    btnStartTest: document.getElementById('btn-start-test'),
    micStatus: document.getElementById('mic-status'),
    
    // Part 1 Screen
    p1Status: document.getElementById('p1-status'),
    p1TimeVal: document.getElementById('p1-time-val'),
    p1TimerRing: document.getElementById('p1-timer-ring'),
    btnP1Next: document.getElementById('btn-p1-next'),
    
    // Part 2 Screen
    p2Status: document.getElementById('p2-status'),
    p2StatusText: document.getElementById('p2-status-text'),
    p2TimeVal: document.getElementById('p2-time-val'),
    p2TimeLabel: document.getElementById('p2-time-label'),
    p2TimerRing: document.getElementById('p2-timer-ring'),
    p2TipText: document.getElementById('p2-tip-text'),
    btnP2Next: document.getElementById('btn-p2-next'),
    
    // Part 3 Screen
    p3Status: document.getElementById('p3-status'),
    p3StatusText: document.getElementById('p3-status-text'),
    p3TimeVal: document.getElementById('p3-time-val'),
    p3TimeLabel: document.getElementById('p3-time-label'),
    p3TimerRing: document.getElementById('p3-timer-ring'),
    btnP3Next: document.getElementById('btn-p3-next'),
    p3OwnIdeaInput: document.getElementById('p3-own-idea-input'),
    
    // Review Screen
    reviewStudentInfo: document.getElementById('review-student-info'),
    teacherFeedback: document.getElementById('teacher-feedback'),
    btnRestartTest: document.getElementById('btn-restart-test'),
    btnViewSolution: document.getElementById('btn-view-solution')
};

// ==========================================================================
// 3. Audio Notification Engine (Web Audio API)
// ==========================================================================
function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Generate pure synthesized tones
function playTone(frequency, duration, volume = 0.3) {
    initAudioContext();
    if (!audioCtx) return;
    
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        // Prevent clicking noise by fading gain in and out
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.03);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Failed to play synthesized sound:", e);
    }
}

// Sound 1: Short warning beep (Start preparation)
function playStartPrepBeep() {
    playTone(600, 0.2);
}

// Sound 2: Double high beep (End preparation / Start speaking)
function playStartSpeakDoubleBeep() {
    playTone(880, 0.15);
    setTimeout(() => {
        playTone(880, 0.15);
    }, 200);
}

// Sound 3: Time's up chime
function playTimeUpChime() {
    playTone(523.25, 0.15); // C5
    setTimeout(() => {
        playTone(659.25, 0.15); // E5
        setTimeout(() => {
            playTone(783.99, 0.35); // G5
        }, 120);
    }, 120);
}

// ==========================================================================
// 4. Audio Recorder & Mic Visualizer
// ==========================================================================
async function requestMicrophone() {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        elements.micStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã cấp quyền Microphone thành công.';
        elements.micStatus.className = 'mic-status-msg success';
        
        // Hook up analyser for visualizer
        initAudioContext();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        sourceNode = audioCtx.createMediaStreamSource(micStream);
        sourceNode.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        return true;
    } catch (err) {
        console.error("Microphone access error:", err);
        elements.micStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Không thể truy cập Microphone. Bạn vẫn có thể thi thử, nhưng bài nói sẽ không được ghi âm.';
        elements.micStatus.className = 'mic-status-msg error';
        micStream = null;
        return false;
    }
}

function startRecording(partNum) {
    if (!micStream) {
        fallbackVisualizer();
        return;
    }
    
    try {
        currentRecordingPart = partNum;
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(micStream);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            recordings[partNum] = blob;
            saveActiveSession();
            updateAudioPlayer(partNum, blob);
        };
        
        mediaRecorder.start();
        
        // Start animation frame visualizer
        if (visualizerId) cancelAnimationFrame(visualizerId);
        runVisualizerLoop();
    } catch (e) {
        console.error(`Error starting recording for Part ${partNum}:`, e);
        fallbackVisualizer();
    }
}

function stopRecording(partNum) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive' && currentRecordingPart === partNum) {
        mediaRecorder.stop();
        currentRecordingPart = null;
    }
    // Stop visualizer bars
    const activeWaveform = document.querySelector('.screen-view.active .waveform-container');
    if (activeWaveform) {
        activeWaveform.classList.remove('active');
    }
    if (visualizerId) cancelAnimationFrame(visualizerId);
}

function updateAudioPlayer(partNum, blob) {
    const audioEl = document.getElementById(`p${partNum}-audio`);
    const downloadEl = document.getElementById(`p${partNum}-download`);
    if (audioEl && downloadEl) {
        const audioURL = URL.createObjectURL(blob);
        audioEl.src = audioURL;
        downloadEl.href = audioURL;
        downloadEl.download = `VSTEP_Speaking_Part${partNum}_${studentName.replace(/\s+/g, '_')}.webm`;
        
        // Visual indicator
        audioEl.closest('.recording-item').style.opacity = '1';
    }
}

// Waveform visualizer loop
function runVisualizerLoop() {
    visualizerId = requestAnimationFrame(runVisualizerLoop);
    if (!analyser || !dataArray) return;
    
    analyser.getByteFrequencyData(dataArray);
    
    const activeWaveform = visualizerContainers[currentScreen];
    if (!activeWaveform) return;
    
    activeWaveform.classList.add('active');
    activeWaveform.classList.remove('simulated');
    
    let partNum = 1;
    if (currentScreen === 'part2_speak') partNum = 2;
    if (currentScreen === 'part3_speak') partNum = 3;
    
    const bars = waveBars[partNum];
    if (!bars) return;
    
    const step = Math.floor(dataArray.length / bars.length) || 1;
    
    bars.forEach((bar, index) => {
        const value = dataArray[index * step] || 0;
        const normalized = value / 255;
        const height = 4 + (normalized * 36); // min 4px, max 40px
        bar.style.height = `${height}px`;
    });
}

function fallbackVisualizer() {
    let screenKey = currentScreen;
    if (currentScreen === 'part2_prep') screenKey = 'part2_speak';
    if (currentScreen === 'part3_prep') screenKey = 'part3_speak';
    const activeWaveform = visualizerContainers[screenKey];
    if (activeWaveform) {
        activeWaveform.classList.add('active', 'simulated');
    }
}

// ==========================================================================
// 5. Timer & Countdown Engine
// ==========================================================================
function startTimer(durationSeconds, displayValEl, timerRingBarEl, onComplete) {
    // Clear previous timer
    if (timerInterval) clearInterval(timerInterval);
    
    totalTime = durationSeconds;
    timeRemaining = durationSeconds;
    
    // Initialize display immediately
    updateTimerUI(displayValEl, timerRingBarEl);
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerUI(displayValEl, timerRingBarEl);
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            onComplete();
        }
    }, 1000);
}

function updateTimerUI(displayValEl, timerRingBarEl) {
    // Format minutes:seconds
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    displayValEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Update Ring Dashboard stroke
    // Circumference of r=85 is 534
    if (timerRingBarEl) {
        const offset = 534 * (1 - timeRemaining / totalTime);
        timerRingBarEl.style.strokeDashoffset = offset;
    }
}

// ==========================================================================
// 6. Navigation & Screen Flow State Machine
// ==========================================================================
function showScreen(screenId) {
    // Update view containers visibility
    document.querySelectorAll('.screen-view').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(`view-${screenId}`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Update Top Timeline bar
    document.querySelectorAll('.timeline-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const activeStep = document.getElementById(`step-${screenId}`);
    if (activeStep) {
        activeStep.classList.add('active');
    }
    
    // Mark completed steps
    if (isTestCompleted) {
        elements.stepWelcome.classList.add('completed');
        elements.stepPart1.classList.add('completed');
        elements.stepPart2.classList.add('completed');
        elements.stepPart3.classList.add('completed');
        elements.stepReview.classList.add('completed');
        const stepSol = document.getElementById('step-solution');
        if (stepSol) stepSol.classList.add('completed');
        
        const timeline = document.querySelector('.progress-timeline');
        if (timeline) timeline.classList.add('completed-mode');
    } else {
        const timeline = document.querySelector('.progress-timeline');
        if (timeline) timeline.classList.remove('completed-mode');
        
        if (screenId === 'part1') {
            elements.stepWelcome.classList.add('completed');
        } else if (screenId === 'part2') {
            elements.stepWelcome.classList.add('completed');
            elements.stepPart1.classList.add('completed');
        } else if (screenId === 'part3') {
            elements.stepWelcome.classList.add('completed');
            elements.stepPart1.classList.add('completed');
            elements.stepPart2.classList.add('completed');
        } else if (screenId === 'review') {
            elements.stepWelcome.classList.add('completed');
            elements.stepPart1.classList.add('completed');
            elements.stepPart2.classList.add('completed');
            elements.stepPart3.classList.add('completed');
        }
    }
    
    // Scroll body to top on change
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// PART 1 FLOW
function enterPart1() {
    saveActiveSession();
    currentScreen = 'part1';
    showScreen('part1');
    
    // Start speaking immediately
    elements.p1Status.className = 'status-indicator recording';
    elements.p1Status.innerHTML = '<span class="status-dot"></span><span class="status-text">Hệ thống đang ghi âm bài nói của bạn</span>';
    
    elements.p1TimerRing.className.baseVal = 'timer-ring-bar speaking-timer';
    
    startRecording(1);
    startTimer(TIMINGS.part1, elements.p1TimeVal, elements.p1TimerRing, () => {
        playTimeUpChime();
        stopRecording(1);
        enterPart2Prep();
    });
}

// PART 2 FLOW
function enterPart2Prep() {
    saveActiveSession();
    currentScreen = 'part2_prep';
    showScreen('part2');
    
    // Play prep tone
    playStartPrepBeep();
    
    // UI state preparation
    elements.p2Status.className = 'status-indicator prep';
    elements.p2StatusText.innerHTML = 'Thời gian chuẩn bị.<br>Hệ thống sẽ không ghi âm.';
    elements.p2StatusText.style.textAlign = 'center';
    elements.p2TimeLabel.innerText = 'THỜI GIAN CHUẨN BỊ';
    elements.p2TimerRing.className.baseVal = 'timer-ring-bar prep-timer';
    
    
    // Hide Next button during preparation
    elements.btnP2Next.style.display = 'inline-flex';
    
    startTimer(TIMINGS.part2_prep, elements.p2TimeVal, elements.p2TimerRing, () => {
        enterPart2Speaking();
    });
}

function enterPart2Speaking() {
    saveActiveSession();
    currentScreen = 'part2_speak';
    
    // Play double beep to signal speaking start
    playStartSpeakDoubleBeep();
    
    // UI state recording
    elements.p2Status.className = 'status-indicator recording';
    elements.p2StatusText.innerText = 'Hệ thống đang ghi âm bài nói của bạn';
    elements.p2TimeLabel.innerText = 'THỜI GIAN NÓI';
    elements.p2TimerRing.className.baseVal = 'timer-ring-bar speaking-timer';
    
    elements.btnP2Next.innerHTML = '<span>TIẾP TỤC</span> <i class="fa-solid fa-arrow-right"></i>';
    
    // Show Next button when speaking starts
    elements.btnP2Next.style.display = 'inline-flex';
    
    startRecording(2);
    startTimer(TIMINGS.part2_speak, elements.p2TimeVal, elements.p2TimerRing, () => {
        playTimeUpChime();
        stopRecording(2);
        enterPart3Prep();
    });
}

// PART 3 FLOW
function enterPart3Prep() {
    saveActiveSession();
    currentScreen = 'part3_prep';
    showScreen('part3');
    
    // Play prep tone
    playStartPrepBeep();
    
    // UI state preparation
    elements.p3Status.className = 'status-indicator prep';
    elements.p3StatusText.innerHTML = 'Thời gian chuẩn bị.<br>Hệ thống sẽ không ghi âm.';
    elements.p3StatusText.style.textAlign = 'center';
    elements.p3TimeLabel.innerText = 'THỜI GIAN CHUẨN BỊ';
    elements.p3TimerRing.className.baseVal = 'timer-ring-bar prep-timer';
    
    // Hide Next button during preparation
    elements.btnP3Next.style.display = 'inline-flex';
    elements.btnP3Next.innerHTML = '<span>TIẾP TỤC</span> <i class="fa-solid fa-arrow-right"></i>';
    elements.btnP3Next.className = 'btn btn-secondary';
    
    startTimer(TIMINGS.part3_prep, elements.p3TimeVal, elements.p3TimerRing, () => {
        enterPart3Speaking();
    });
}

function enterPart3Speaking() {
    saveActiveSession();
    currentScreen = 'part3_speak';
    
    // Play double beep to signal speaking start
    playStartSpeakDoubleBeep();
    
    // UI state recording
    elements.p3Status.className = 'status-indicator recording';
    elements.p3StatusText.innerText = 'Hệ thống đang ghi âm bài nói của bạn';
    elements.p3TimeLabel.innerText = 'THỜI GIAN NÓI';
    elements.p3TimerRing.className.baseVal = 'timer-ring-bar speaking-timer';
    elements.btnP3Next.innerHTML = '<span>Hoàn thành bài thi</span> <i class="fa-solid fa-circle-check"></i>';
    elements.btnP3Next.className = 'btn btn-success';
    
    // Show Next button when speaking starts
    elements.btnP3Next.style.display = 'inline-flex';
    elements.btnP3Next.innerHTML = '<span>TIẾP TỤC</span> <i class="fa-solid fa-arrow-right"></i>';
    elements.btnP3Next.className = 'btn btn-secondary';
    
    startRecording(3);
    startTimer(TIMINGS.part3_speak, elements.p3TimeVal, elements.p3TimerRing, () => {
        playTimeUpChime();
        stopRecording(3);
        enterReview();
    });
}

// REVIEW SCREEN FLOW
function enterReview() {
    isTestCompleted = true;
    currentScreen = 'review';
    showScreen('review');
    
    // Save to completed history and clear active session
    if (typeof VstepDB !== 'undefined') {
        VstepDB.saveHistory(testId, studentName, recordings)
            .then(() => VstepDB.deleteSession(testId))
            .catch(err => console.error("History saving error:", err));
    }
    
    // Display student summary
    const dateStr = new Date().toLocaleDateString('vi-VN', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    elements.reviewStudentInfo.innerText = `Học viên: ${studentName} | Ngày làm bài: ${dateStr}`;
    
    // Clean up mic streams
    if (micStream && recordings[1] && recordings[2] && recordings[3]) {
        // We keep the stream active only if they want to repeat
    }
}

// RESTART TEST STATE
function restartTest() {
    isTestCompleted = false;
    if (typeof VstepDB !== 'undefined') { VstepDB.deleteSession(testId).catch(err => console.error(err)); }
    
    // Remove completed classes from steps on restart
    document.querySelectorAll('.timeline-step').forEach(step => {
        step.classList.remove('completed');
    });
    
    if (timerInterval) clearInterval(timerInterval);
    
    // Reset blobs
    recordings[1] = null;
    recordings[2] = null;
    recordings[3] = null;
    
    // Reset file elements
    document.querySelectorAll('.recording-item').forEach(item => {
        item.style.opacity = '0.5';
    });
    
    document.getElementById('p1-audio').src = '';
    document.getElementById('p2-audio').src = '';
    document.getElementById('p3-audio').src = '';
    
    // Clear inputs
    if (elements.p3OwnIdeaInput) {
        elements.p3OwnIdeaInput.value = '';
        elements.p3OwnIdeaInput.closest('.mindmap-node').classList.remove('has-value');
    }
    elements.teacherFeedback.value = '';
    
    // Reset steps indicators
    elements.stepWelcome.classList.remove('completed');
    elements.stepPart1.classList.remove('completed');
    elements.stepPart2.classList.remove('completed');
    elements.stepPart3.classList.remove('completed');
    
    // Back to welcome screen
    currentScreen = 'welcome';
    showScreen('welcome');
}

// ==========================================================================
// 7. Interactive Features & Listeners Binding
// ==========================================================================
function initAppListeners() {
    // 7.0 Timeline navigation for completed test
    document.querySelectorAll('.timeline-step').forEach(step => {
        step.addEventListener('click', () => {
            if (isTestCompleted) {
                const screenId = step.id.replace('step-', '');
                if (screenId === 'welcome') {
                    showScreen('welcome');
                } else if (screenId === 'part1') {
                    showScreen('part1');
                    elements.p1Status.className = 'status-indicator completed';
                    elements.p1Status.innerHTML = '<i class="fa-solid fa-check"></i><span class="status-text" style="margin-left: 4px;">Đã hoàn thành</span>';
                } else if (screenId === 'part2') {
                    showScreen('part2');
                    elements.p2Status.className = 'status-indicator completed';
                    elements.p2StatusText.innerHTML = '<i class="fa-solid fa-check"></i><span class="status-text" style="margin-left: 4px;">Đã hoàn thành</span>';
                    elements.p2StatusText.style.textAlign = 'center';
                } else if (screenId === 'part3') {
                    showScreen('part3');
                    elements.p3Status.className = 'status-indicator completed';
                    elements.p3StatusText.innerHTML = '<i class="fa-solid fa-check"></i><span class="status-text" style="margin-left: 4px;">Đã hoàn thành</span>';
                    elements.p3StatusText.style.textAlign = 'center';
                } else if (screenId === 'review') {
                    enterReview();
                } else if (screenId === 'solution') {
                    showScreen('solution');
                }
            }
        });
    });

    // 7.1 Start Test Button
    elements.btnStartTest.addEventListener('click', async () => {
        if (typeof VstepAuth !== 'undefined' && !VstepAuth.isLoggedIn()) {
            VstepAuth.showLoginModal(true, async (info) => {
                studentName = info.displayName;
                if (elements.studentNameInput) elements.studentNameInput.value = studentName;
                initAudioContext();
                await requestMicrophone();
                enterPart1();
            });
            return;
        }

        studentName = (elements.studentNameInput ? elements.studentNameInput.value.trim() : '') || 
                      (typeof VstepAuth !== 'undefined' && VstepAuth.isLoggedIn() ? VstepAuth.getStudentInfo().displayName : 'Học viên ẩn danh');
        
        // Start audio context and microphone permission check
        initAudioContext();
        await requestMicrophone();
        
        // Enter Part 1
        enterPart1();
    });
    
    // 7.2 Part 1 Next Button
    elements.btnP1Next.addEventListener('click', () => {
        if (timerInterval) clearInterval(timerInterval);
        stopRecording(1);
        enterPart2Prep();
    });
    
    // 7.3 Part 2 Next Button
    elements.btnP2Next.addEventListener('click', () => {
        if (currentScreen === 'part2_prep') {
            if (timerInterval) clearInterval(timerInterval);
            enterPart2Speaking();
        } else if (currentScreen === 'part2_speak') {
            if (timerInterval) clearInterval(timerInterval);
            stopRecording(2);
            enterPart3Prep();
        }
    });
    
    // 7.4 Part 3 Next Button
    elements.btnP3Next.addEventListener('click', () => {
        if (currentScreen === 'part3_prep') {
            if (timerInterval) clearInterval(timerInterval);
            enterPart3Speaking();
        } else if (currentScreen === 'part3_speak') {
            if (timerInterval) clearInterval(timerInterval);
            stopRecording(3);
            enterReview();
        }
    });
    
    // 7.5 Mindmap Node placeholder sync
    if (elements.p3OwnIdeaInput) {
        elements.p3OwnIdeaInput.addEventListener('input', () => {
            const parent = elements.p3OwnIdeaInput.closest('.mindmap-node');
            if (elements.p3OwnIdeaInput.value.trim() !== '') {
                parent.classList.add('has-value');
            } else {
                parent.classList.remove('has-value');
            }
        });
    }
    
    // 7.7 Restart Test button
    if (elements.btnViewSolution) {
        elements.btnViewSolution.addEventListener('click', () => {
            showScreen('solution');
        });
    }

    elements.btnRestartTest.addEventListener('click', () => {
        restartTest();
    });

    // 7.8 Solution tab switching listeners
    const solTabBtns = document.querySelectorAll('.sol-tab-btn');
    solTabBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            switchSolTab(index + 1);
        });
    });
}

function initVisualizerCache() {
    waveBars = {
        1: document.querySelectorAll('#view-part1 .wave-bar'),
        2: document.querySelectorAll('#view-part2 .wave-bar'),
        3: document.querySelectorAll('#view-part3 .wave-bar')
    };
    visualizerContainers = {
        'part1': document.querySelector('#view-part1 .waveform-container'),
        'part2_speak': document.querySelector('#view-part2 .waveform-container'),
        'part3_speak': document.querySelector('#view-part3 .waveform-container')
    };
}

// 8. Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Check student login & auto-populate name
    if (typeof VstepAuth !== 'undefined') {
        VstepAuth.updatePageUserInfo();
        if (!VstepAuth.isLoggedIn()) {
            setTimeout(() => {
                VstepAuth.showLoginModal(false, (info) => {
                    studentName = info.displayName;
                    if (elements.studentNameInput) elements.studentNameInput.value = studentName;
                });
            }, 300);
        } else {
            const info = VstepAuth.getStudentInfo();
            studentName = info.displayName;
            if (elements.studentNameInput) elements.studentNameInput.value = studentName;
        }
    }

    checkPageLock();
    initSidebarProtection();
    initVisualizerCache();
    initAppListeners();
});

// ==========================================================================
// 9. Premium Password Protection & Sidebar Logic
// ==========================================================================
const TEST_PASSWORDS = {};

const EXISTING_TESTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function checkPageLock() {
    const pathMatch = window.location.pathname.match(/test\s*(\d+)/i);
    const testId = pathMatch ? parseInt(pathMatch[1]) : 1;
    
    // Check if the current page requires unlock
    if (TEST_PASSWORDS[testId] && sessionStorage.getItem('unlocked_test_' + testId) !== 'true') {
        injectLockUI(testId);
    } else {
        sessionStorage.removeItem('unlocked_test_' + testId);
        // Ensure page is shown if unlocked or doesn't require a password
        document.documentElement.style.display = '';
        if (typeof checkAndPromptResume === 'function') {
            checkAndPromptResume();
        }
    }
}

function injectLockUI(testId) {
    // Inject custom lock styles dynamically
    const style = document.createElement('style');
    style.id = 'lock-styles';
    style.textContent = `
        .lock-screen-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(241, 245, 249, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            opacity: 1;
            transition: opacity 0.4s ease;
        }
        .lock-card {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02);
            border-radius: 24px;
            padding: 40px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            animation: lockCardAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes lockCardAppear {
            from {
                opacity: 0;
                transform: scale(0.92) translateY(20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        .lock-icon-container {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.2) 100%);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #7c3aed;
            font-size: 32px;
            border: 1px solid rgba(124, 58, 237, 0.15);
            box-shadow: 0 8px 16px rgba(124, 58, 237, 0.08);
        }
        .lock-icon-container i {
            animation: lockPulse 2s infinite ease-in-out;
        }
        @keyframes lockPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
        }
        .lock-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .lock-subtitle {
            font-size: 14px;
            color: #64748b;
            line-height: 1.5;
        }
        .lock-input-group {
            width: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: left;
        }
        .lock-input-wrapper {
            position: relative;
            width: 100%;
        }
        .lock-input {
            width: 100%;
            padding: 14px 16px;
            padding-right: 48px;
            border-radius: 12px;
            border: 1.5px solid #e2e8f0;
            background: #ffffff;
            font-family: inherit;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            transition: all 0.2s ease;
        }
        .lock-input:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
        }
        .lock-input-toggle {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s ease;
        }
        .lock-input-toggle:hover {
            color: #7c3aed;
        }
        .lock-btn {
            width: 100%;
            padding: 14px;
            border-radius: 12px;
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            border: none;
            color: #ffffff;
            font-family: inherit;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.24);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
        }
        .lock-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.32);
        }
        .lock-btn:active {
            transform: translateY(1px);
        }
        .lock-error {
            font-size: 13px;
            font-weight: 600;
            color: #dc2626;
            background: rgba(220, 38, 38, 0.1);
            padding: 10px 14px;
            border-radius: 8px;
            border: 1px solid rgba(220, 38, 38, 0.15);
            width: 100%;
            text-align: left;
            display: none;
            align-items: center;
            gap: 8px;
        }
        .lock-error.shake {
            display: flex;
            animation: lockErrorShake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes lockErrorShake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .lock-back-link {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            margin-top: -4px;
        }
        .lock-back-link:hover {
            color: #7c3aed;
        }
    `;
    document.head.appendChild(style);

    // Create Lock Overlay DOM elements
    const overlay = document.createElement('div');
    overlay.className = 'lock-screen-overlay';
    overlay.innerHTML = `
        <div class="lock-card">
            <div class="lock-icon-container">
                <i class="fa-solid fa-lock"></i>
            </div>
            <div>
                <h2 class="lock-title">SPEAKING MOCK TEST ${testId.toString().padStart(2, '0')}</h2>
                <p class="lock-subtitle">Đề thi này đã được khóa bảo mật. Vui lòng nhập mật khẩu được cấp để mở khóa.</p>
            </div>
            <div class="lock-input-group">
                <div class="lock-input-wrapper">
                    <input type="password" class="lock-input" placeholder="Mật khẩu đề thi" autofocus>
                    <button class="lock-input-toggle" type="button" title="Hiển thị mật khẩu">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="lock-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Mật khẩu không chính xác. Vui lòng thử lại.</span>
                </div>
            </div>
            <button class="lock-btn">
                <span>MỞ KHÓA ĐỀ THI</span>
                <i class="fa-solid fa-unlock"></i>
            </button>
            <a href="../index.html" class="lock-back-link">
                <i class="fa-solid fa-arrow-left"></i>
                <span>TRỞ VỀ TRANG CHỦ</span>
            </a>
        </div>
    `;

    document.body.appendChild(overlay);
    document.documentElement.style.display = ''; // Show html wrapper now that lock screen is displayed

    const input = overlay.querySelector('.lock-input');
    const btn = overlay.querySelector('.lock-btn');
    const toggleBtn = overlay.querySelector('.lock-input-toggle');
    const errorEl = overlay.querySelector('.lock-error');

    // Show/Hide password toggle
    toggleBtn.addEventListener('click', () => {
        const icon = toggleBtn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    });

    const handleUnlock = () => {
        const value = input.value.trim();
        if (value === TEST_PASSWORDS[testId]) {
            // sessionStorage.setItem('unlocked_test_' + testId, 'true'); // Removed to lock on refresh
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                style.remove();
                if (typeof checkAndPromptResume === 'function') {
                    checkAndPromptResume();
                }
            }, 400);
            
            // Re-initialize sidebar to reflect unlock status
            initSidebarProtection();
        } else {
            errorEl.classList.remove('shake');
            void errorEl.offsetWidth; // Trigger reflow to restart animation
            errorEl.classList.add('shake');
            input.value = '';
            input.focus();
        }
    };

    btn.addEventListener('click', handleUnlock);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleUnlock();
    });
}

function initSidebarProtection() {
    const sidebarAnchors = document.querySelectorAll('.test-sidebar a[data-test-id]');
    
    sidebarAnchors.forEach(anchor => {
        const testId = parseInt(anchor.getAttribute('data-test-id'));
        if (isNaN(testId)) return;

        // Check if unlocked (either default unlocked, or saved in localStorage)
        const isUnlockedByDefault = !TEST_PASSWORDS[testId];
        const isUnlockedByStorage = sessionStorage.getItem('unlocked_test_' + testId) === 'true';
        const isUnlocked = isUnlockedByDefault || isUnlockedByStorage;

        if (isUnlocked) {
            // Update UI to show unlocked state
            anchor.classList.remove('locked');
            anchor.href = `../test ${testId}/test${testId.toString().padStart(2, '0')}-index.html`;
            
            const icon = anchor.querySelector('.test-icon i');
            if (icon) {
                icon.className = 'fa-solid fa-microphone-lines';
            }
            
            // Intercept if not logged in
            anchor.onclick = (e) => {
                if (typeof VstepAuth !== 'undefined' && !VstepAuth.isLoggedIn()) {
                    e.preventDefault();
                    VstepAuth.showLoginModal(false, () => {
                        window.location.href = `../test ${testId}/test${testId.toString().padStart(2, '0')}-index.html`;
                    });
                }
            };
        } else {
            // Ensure locked class, lock icon, and correct href
            anchor.classList.add('locked');
            anchor.href = 'javascript:void(0)';
            const icon = anchor.querySelector('.test-icon i');
            if (icon) {
                icon.className = 'fa-solid fa-lock';
            }
            
            // Intercept clicks
            anchor.onclick = (e) => {
                e.preventDefault();
                showSidebarPasswordPrompt(testId);
            };
        }
    });
}

function showSidebarPasswordPrompt(testId) {
    // Check if the styles already exist in head, if not add them
    if (!document.getElementById('lock-styles')) {
        const style = document.createElement('style');
        style.id = 'lock-styles';
        style.textContent = `
            .lock-screen-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(241, 245, 249, 0.85);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
                font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
                opacity: 0;
                transition: opacity 0.4s ease;
            }
            .lock-card {
                background: rgba(255, 255, 255, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.5);
                box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02);
                border-radius: 24px;
                padding: 40px;
                width: 90%;
                max-width: 440px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 24px;
                animation: lockCardAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes lockCardAppear {
                from {
                    opacity: 0;
                    transform: scale(0.92) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            .lock-icon-container {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.2) 100%);
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                color: #7c3aed;
                font-size: 32px;
                border: 1px solid rgba(124, 58, 237, 0.15);
                box-shadow: 0 8px 16px rgba(124, 58, 237, 0.08);
            }
            .lock-icon-container i {
                animation: lockPulse 2s infinite ease-in-out;
            }
            @keyframes lockPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
            }
            .lock-title {
                font-size: 22px;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .lock-subtitle {
                font-size: 14px;
                color: #64748b;
                line-height: 1.5;
            }
            .lock-input-group {
                width: 100%;
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 8px;
                text-align: left;
            }
            .lock-input-wrapper {
                position: relative;
                width: 100%;
            }
            .lock-input {
                width: 100%;
                padding: 14px 16px;
                padding-right: 48px;
                border-radius: 12px;
                border: 1.5px solid #e2e8f0;
                background: #ffffff;
                font-family: inherit;
                font-size: 16px;
                font-weight: 600;
                color: #0f172a;
                transition: all 0.2s ease;
            }
            .lock-input:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
            }
            .lock-input-toggle {
                position: absolute;
                right: 16px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #64748b;
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s ease;
            }
            .lock-input-toggle:hover {
                color: #7c3aed;
            }
            .lock-btn-group {
                width: 100%;
                display: flex;
                gap: 12px;
            }
            .lock-btn {
                flex: 1;
                padding: 14px;
                border-radius: 12px;
                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                border: none;
                color: #ffffff;
                font-family: inherit;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.24);
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
            }
            .lock-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(124, 58, 237, 0.32);
            }
            .lock-btn:active {
                transform: translateY(1px);
            }
            .lock-btn-cancel {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #cbd5e1;
                box-shadow: none;
            }
            .lock-btn-cancel:hover {
                background: #e2e8f0;
                box-shadow: none;
            }
            .lock-error {
                font-size: 13px;
                font-weight: 600;
                color: #dc2626;
                background: rgba(220, 38, 38, 0.1);
                padding: 10px 14px;
                border-radius: 8px;
                border: 1px solid rgba(220, 38, 38, 0.15);
                width: 100%;
                text-align: left;
                display: none;
                align-items: center;
                gap: 8px;
            }
            .lock-error.shake {
                display: flex;
                animation: lockErrorShake 0.4s cubic-bezier(.36,.07,.19,.97) both;
            }
            @keyframes lockErrorShake {
                10%, 90% { transform: translate3d(-1px, 0, 0); }
                20%, 80% { transform: translate3d(2px, 0, 0); }
                30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                40%, 60% { transform: translate3d(4px, 0, 0); }
            }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'lock-screen-overlay';
    overlay.innerHTML = `
        <div class="lock-card">
            <div class="lock-icon-container">
                <i class="fa-solid fa-lock"></i>
            </div>
            <div>
                <h2 class="lock-title">SPEAKING MOCK TEST ${testId.toString().padStart(2, '0')}</h2>
                <p class="lock-subtitle">Nhập mật khẩu để mở khóa đề thi này.</p>
            </div>
            <div class="lock-input-group">
                <div class="lock-input-wrapper">
                    <input type="password" class="lock-input" placeholder="Mật khẩu đề thi" autofocus>
                    <button class="lock-input-toggle" type="button" title="Hiển thị mật khẩu">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="lock-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Mật khẩu không chính xác. Vui lòng thử lại.</span>
                </div>
            </div>
            <div class="lock-btn-group">
                <button class="lock-btn lock-btn-cancel">HỦY BỎ</button>
                <button class="lock-btn lock-btn-confirm">
                    <span>MỞ KHÓA</span>
                    <i class="fa-solid fa-unlock"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Trigger transition opacity fade in
    void overlay.offsetHeight;
    overlay.style.opacity = '1';

    const input = overlay.querySelector('.lock-input');
    const confirmBtn = overlay.querySelector('.lock-btn-confirm');
    const cancelBtn = overlay.querySelector('.lock-btn-cancel');
    const toggleBtn = overlay.querySelector('.lock-input-toggle');
    const errorEl = overlay.querySelector('.lock-error');

    input.focus();

    toggleBtn.addEventListener('click', () => {
        const icon = toggleBtn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    });

    const handleUnlock = () => {
        const value = input.value.trim();
        if (value === TEST_PASSWORDS[testId]) {
            sessionStorage.setItem('unlocked_test_' + testId, 'true');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                initSidebarProtection();
                
                // If the test folder exists, redirect. Otherwise, notify user.
                if (EXISTING_TESTS.includes(testId)) {
                    window.location.href = `../test ${testId}/test${testId.toString().padStart(2, '0')}-index.html`;
                } else {
                    showNotificationModal("ĐỀ THI ĐANG CẬP NHẬT", `Đề SPEAKING MOCK TEST ${testId.toString().padStart(2, '0')} đã được mở khóa thành công, tuy nhiên dữ liệu đề thi này đang được cập nhật. Vui lòng quay lại sau!`);
                }
            }, 400);
        } else {
            errorEl.classList.remove('shake');
            void errorEl.offsetWidth;
            errorEl.classList.add('shake');
            input.value = '';
            input.focus();
        }
    };

    confirmBtn.addEventListener('click', handleUnlock);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleUnlock();
    });

    cancelBtn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 400);
    });
}

function showNotificationModal(title, message) {
    const overlay = document.createElement('div');
    overlay.className = 'lock-screen-overlay';
    overlay.style.opacity = '0';
    overlay.innerHTML = `
        <div class="lock-card">
            <div class="lock-icon-container" style="background: linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(217, 119, 6, 0.2) 100%); color: #d97706; border-color: rgba(217, 119, 6, 0.15);">
                <i class="fa-solid fa-circle-info"></i>
            </div>
            <div>
                <h2 class="lock-title">${title}</h2>
                <p class="lock-subtitle" style="margin-top: 8px;">${message}</p>
            </div>
            <button class="lock-btn" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); box-shadow: 0 4px 12px rgba(217, 119, 6, 0.24);">ĐỒNG Ý</button>
        </div>
    `;
    document.body.appendChild(overlay);
    void overlay.offsetHeight;
    overlay.style.opacity = '1';
    
    const btn = overlay.querySelector('.lock-btn');
    btn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 400);
    });
}


// ==========================================================================
// 10. Suggested Solutions Tab Switching Logic
// ==========================================================================
function switchSolTab(tabNum) {
    // Remove active class from all tab buttons
    document.querySelectorAll('.sol-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Remove active class from all panels
    document.querySelectorAll('.sol-tab-content').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Add active class to clicked button and panel
    const buttons = document.querySelectorAll('.sol-tab-btn');
    if (buttons[tabNum - 1]) {
        buttons[tabNum - 1].classList.add('active');
    }
    
    const targetPanel = document.getElementById(`sol-panel-${tabNum}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}
window.switchSolTab = switchSolTab;


// --- Speaking Test Session Autosave & Resume JS ---
const testId = (function() {
    const pathMatch = window.location.pathname.match(/test\s*(\d+)/i);
    return pathMatch ? parseInt(pathMatch[1]) : 1;
})();

function saveActiveSession() {
    if (typeof VstepDB === 'undefined') return;
    const sessionData = {
        studentName: studentName,
        currentScreen: currentScreen,
        recordings: {
            1: recordings[1],
            2: recordings[2],
            3: recordings[3]
        },
        timeRemaining: timeRemaining
    };
    VstepDB.saveSession(testId, sessionData).catch(err => console.error("Autosave error:", err));
}

async function checkAndPromptResume() {
    if (typeof VstepDB === 'undefined') return;
    try {
        const session = await VstepDB.getSession(testId);
        if (session && session.studentName) {
            // Check if there are actual recordings or if they progressed beyond welcome
            const hasRecordings = session.recordings && (session.recordings[1] || session.recordings[2] || session.recordings[3]);
            const notWelcome = session.currentScreen !== 'welcome';
            if (hasRecordings || notWelcome) {
                showResumePrompt(session);
            }
        }
    } catch (e) {
        console.error("Error checking active session:", e);
    }
}

function showResumePrompt(session) {
    if (!document.getElementById('lock-styles')) {
        const style = document.createElement('style');
        style.id = 'lock-styles';
        style.textContent = `
            .lock-screen-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(241, 245, 249, 0.85);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.4s ease;
            }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'lock-screen-overlay';
    overlay.style.opacity = '0';
    
    // Map screen key to readable name
    const screenNames = {
        'part1': 'Part 1: Social Interaction (Đang nói)',
        'part2_prep': 'Part 2: Solution Discussion (Chuẩn bị)',
        'part2_speak': 'Part 2: Solution Discussion (Đang nói)',
        'part3_prep': 'Part 3: Topic Development (Chuẩn bị)',
        'part3_speak': 'Part 3: Topic Development (Đang nói)'
    };
    const readableScreen = screenNames[session.currentScreen] || "Bài thi cũ";

    overlay.innerHTML = `
        <div class="lock-card" style="max-width: 450px; padding: 35px; text-align: center; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;">
            <div class="lock-icon-container" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.2) 100%); color: var(--color-violet, #7c3aed); border-color: rgba(124, 58, 237, 0.15); font-size: 28px; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin: 0 auto 20px;">
                <i class="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
                <h2 class="lock-title" style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">Khôi phục bài thi</h2>
                <p class="lock-subtitle" style="font-size: 14.5px; color: var(--text-primary); line-height: 1.5; margin: 0 0 8px;">Hệ thống phát hiện bài thi này chưa hoàn thành dưới tên học viên <strong>${session.studentName}</strong>.</p>
                <p class="lock-subtitle" style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5; margin: 0 0 20px;">Phần dở dang: <strong>${readableScreen}</strong>. Bạn có muốn tiếp tục không?</p>
            </div>
            <div style="display: flex; gap: 12px; justify-content: center; width: 100%;">
                <button class="lock-btn btn-cancel" style="background: #e2e8f0; color: var(--text-primary); box-shadow: none; flex: 1; padding: 12px 18px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer;">BẮT ĐẦU MỚI</button>
                <button class="lock-btn btn-confirm" style="background: linear-gradient(135deg, var(--color-violet, #7c3aed) 0%, #6d28d9 100%); color: white; flex: 1; padding: 12px 18px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.24);">TIẾP TỤC</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    void overlay.offsetHeight;
    overlay.style.opacity = '1';

    const confirmBtn = overlay.querySelector('.btn-confirm');
    const cancelBtn = overlay.querySelector('.btn-cancel');

    confirmBtn.onclick = async () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 400);

        // Restore name
        studentName = session.studentName;
        if (elements.studentNameInput) elements.studentNameInput.value = studentName;
        
        // Restore recordings and player UI
        if (session.recordings) {
            for (let part = 1; part <= 3; part++) {
                const blob = session.recordings[part];
                if (blob) {
                    recordings[part] = blob;
                    updateAudioPlayer(part, blob);
                }
            }
        }

        // Initialize audio context & micro stream
        initAudioContext();
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            console.error("Mic access error on resume:", e);
        }

        // Jump to target screen and start
        if (session.currentScreen === 'part1') enterPart1();
        else if (session.currentScreen === 'part2_prep') enterPart2Prep();
        else if (session.currentScreen === 'part2_speak') enterPart2Speaking();
        else if (session.currentScreen === 'part3_prep') enterPart3Prep();
        else if (session.currentScreen === 'part3_speak') enterPart3Speaking();
        else enterPart1(); // Fallback
    };

    cancelBtn.onclick = async () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 400);

        // Delete active session
        await VstepDB.deleteSession(testId);
    };
}

// TTS Functionality
let currentUtterance = null;
let currentTtsButton = null;

function getBestVoice() {
    const voices = window.speechSynthesis.getVoices();
    // Preferred male voices in order: Edge (Guy), Mac (Alex/Daniel), Chrome (Google Male)
    const preferredNames = [
        "Microsoft Guy",
        "Google UK English Male",
        "Google US English Male",
        "Alex",
        "Daniel",
        "Google US English", // Chrome default fallback
        "Samantha" // Mac fallback
    ];
    
    for (let name of preferredNames) {
        const voice = voices.find(v => v.name.includes(name));
        if (voice) return voice;
    }
    
    // Fallback to any English US/UK male voice if possible
    let fallback = voices.find(v => (v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")) && v.name.includes("Male"));
    if (!fallback) {
        fallback = voices.find(v => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB"));
    }
    return fallback || voices[0];
}

function playTTS(btn) {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (currentTtsButton) {
            currentTtsButton.innerHTML = `<i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu`;
            currentTtsButton.classList.remove("playing");
        }
        
        // If clicking the same button, just stop
        if (currentTtsButton === btn) {
            currentTtsButton = null;
            return;
        }
    }
    
    // Find the closest level-content
    const levelBox = btn.closest(".sol-level-box");
    if (!levelBox) return;
    
    const contentDiv = levelBox.querySelector(".level-content");
    if (!contentDiv) return;
    
    // Extract text but ignore the translation toggle and translation text
    let textToRead = "";
    Array.from(contentDiv.childNodes).forEach(node => {
        // Skip the translation toggle and translation text divs
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains("translation-toggle") || node.classList.contains("translation-text")) {
                return;
            }
        }
        // Append text content
        if (node.textContent) {
            textToRead += node.textContent;
        }
    });
    
    textToRead = textToRead.trim();
    if (!textToRead) return;
    
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    
    // Wait for voices to be loaded if not already
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            currentUtterance.voice = getBestVoice();
            currentUtterance.rate = 1.0; // Normal speed
            currentUtterance.pitch = 1.25; // Slightly higher pitch for energetic Gen-Z vibe
            window.speechSynthesis.speak(currentUtterance);
        };
    } else {
        currentUtterance.voice = getBestVoice();
        currentUtterance.rate = 1.0; // Normal speed
        currentUtterance.pitch = 1.25; // Slightly higher pitch for energetic Gen-Z vibe
        window.speechSynthesis.speak(currentUtterance);
    }
    
    // Update button UI
    currentTtsButton = btn;
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Dừng đọc`;
    btn.classList.add("playing");
    
    currentUtterance.onend = function() {
        if (currentTtsButton === btn) {
            btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu`;
            btn.classList.remove("playing");
            currentTtsButton = null;
        }
    };
    
    currentUtterance.onerror = function(e) {
        if (currentTtsButton === btn) {
            btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu`;
            btn.classList.remove("playing");
            currentTtsButton = null;
        }
        console.error("TTS Error:", e);
    };
}




/* ==========================================================================
   SOLUTION LEVEL FILTERING & EXPORT (B1 / B2 / ALL)
   ========================================================================== */

let currentSolutionLevel = 'all'; // 'all', 'b1', 'b2'

function filterSolutionLevel(level) {
    currentSolutionLevel = level;
    
    // Update filter buttons UI
    document.querySelectorAll('.level-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`filter-btn-${level}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Toggle visibility of level boxes across all solution panels
    const b1Boxes = document.querySelectorAll('.sol-level-box.level-b1');
    const b2Boxes = document.querySelectorAll('.sol-level-box.level-b2');

    if (level === 'b1') {
        b1Boxes.forEach(el => el.style.display = 'block');
        b2Boxes.forEach(el => el.style.display = 'none');
    } else if (level === 'b2') {
        b1Boxes.forEach(el => el.style.display = 'none');
        b2Boxes.forEach(el => el.style.display = 'block');
    } else {
        b1Boxes.forEach(el => el.style.display = 'block');
        b2Boxes.forEach(el => el.style.display = 'block');
    }

    // Update download buttons label to reflect active filter
    updateDownloadButtonsLabel();
}

function updateDownloadButtonsLabel() {
    const docBtns = document.querySelectorAll('.btn-download-doc span');
    const pdfBtns = document.querySelectorAll('.btn-download-pdf span');
    
    let labelSuffix = '';
    if (currentSolutionLevel === 'b1') labelSuffix = ' (B1)';
    else if (currentSolutionLevel === 'b2') labelSuffix = ' (B2)';

    docBtns.forEach(span => {
        span.innerText = `Tải Word${labelSuffix} (.doc)`;
    });
    pdfBtns.forEach(span => {
        span.innerText = `In / Lưu PDF${labelSuffix}`;
    });
}

function getSampleAnswersHTML(targetLevel) {
    const level = targetLevel || currentSolutionLevel || 'all';
    const pathMatch = window.location.pathname.match(/test\s*(\d+)/i);
    const testNum = pathMatch ? parseInt(pathMatch[1]) : 1;
    const testTitle = `SPEAKING MOCK TEST ${testNum.toString().padStart(2, '0')}`;
    const student = (document.getElementById('student-name') && document.getElementById('student-name').value.trim()) || (typeof studentName !== 'undefined' && studentName !== 'Học viên' ? studentName : '') || 'Học viên';
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    const p1 = document.getElementById('sol-panel-1');
    const p2 = document.getElementById('sol-panel-2');
    const p3 = document.getElementById('sol-panel-3');

    if (!p1 || !p2 || !p3) {
        alert('Không tìm thấy nội dung bài giải mẫu!');
        return null;
    }

    let levelTitleBadge = 'CHI TIẾT (B1 & B2)';
    let levelMetaDesc = 'Chuẩn định dạng: VSTEP Speaking B1 & B2';
    let fileSuffix = 'B1_B2';

    if (level === 'b1') {
        levelTitleBadge = 'BẬC B1 (TIÊU CHUẨN)';
        levelMetaDesc = 'Mục tiêu: Đạt chuẩn VSTEP Bậc 3 (B1 Speaking)';
        fileSuffix = 'B1';
    } else if (level === 'b2') {
        levelTitleBadge = 'BẬC B2 (NÂNG CAO)';
        levelMetaDesc = 'Mục tiêu: Đạt chuẩn VSTEP Bậc 4 - Bậc 5 (B2 / C1 Speaking)';
        fileSuffix = 'B2';
    }

    // Helper to format level boxes (B1 or B2)
    function formatLevelBox(boxEl, levelClass, levelName, colorHex) {
        if (!boxEl) return '';
        // If target level is B1 and box is B2, skip
        if (level === 'b1' && levelClass === 'b2') return '';
        // If target level is B2 and box is B1, skip
        if (level === 'b2' && levelClass === 'b1') return '';

        const contentEl = boxEl.querySelector('.level-content');
        const transEl = boxEl.querySelector('.translation-text');
        
        let engHtml = '';
        if (contentEl) {
            const clone = contentEl.cloneNode(true);
            clone.querySelectorAll('.translation-toggle, .translation-text, .tts-play-btn').forEach(el => el.remove());
            engHtml = clone.innerHTML.trim();
        }
        
        let transHtml = '';
        if (transEl) {
            transHtml = transEl.innerHTML.trim();
        }

        return `
            <div style="margin: 10px 0 14px 0; padding: 12px 14px; background: ${levelClass === 'b1' ? '#f0f9ff' : '#f4fbf0'}; border: 1px solid ${levelClass === 'b1' ? '#bae6fd' : '#d9f99d'}; border-left: 5px solid ${colorHex}; border-radius: 6px; page-break-inside: avoid;">
                <div style="margin-bottom: 6px;">
                    <span style="display: inline-block; background: ${colorHex}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
                        ${levelName}
                    </span>
                </div>
                <div style="font-size: 14.5px; line-height: 1.65; color: #1e293b; margin-bottom: 8px; white-space: pre-line;">
                    ${engHtml}
                </div>
                ${transHtml ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed ${levelClass === 'b1' ? '#bae6fd' : '#d9f99d'}; font-size: 13.5px; color: #475569; line-height: 1.6; white-space: pre-line;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 3px; text-transform: uppercase;">
                        👉 Dịch nghĩa tiếng Việt:
                    </div>
                    <div>${transHtml}</div>
                </div>
                ` : ''}
            </div>
        `;
    }

    // 1. PART 1
    let part1Html = '';
    const p1Topics = p1.querySelectorAll('.sol-topic-section');
    p1Topics.forEach((topicEl) => {
        const headerEl = topicEl.querySelector('.sol-topic-header');
        const headerText = headerEl ? headerEl.innerText.replace(/[\n\r]+/g, ' ').trim() : '';
        part1Html += `
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 9px 12px; font-size: 14.5px; font-weight: 700; color: #991b1b; margin: 20px 0 12px 0; border-radius: 0 4px 4px 0;">
                ${headerText}
            </div>
        `;
        const qItems = topicEl.querySelectorAll('.sol-question-item');
        qItems.forEach((qEl) => {
            const qTextEl = qEl.querySelector('.sol-question-text');
            const qText = qTextEl ? qTextEl.innerHTML.trim() : '';
            const b1Box = qEl.querySelector('.sol-level-box.level-b1');
            const b2Box = qEl.querySelector('.sol-level-box.level-b2');

            const b1Html = formatLevelBox(b1Box, 'b1', 'B1 LEVEL', '#00b0f0');
            const b2Html = formatLevelBox(b2Box, 'b2', 'B2 LEVEL', '#70ad47');

            if (b1Html || b2Html) {
                part1Html += `
                    <div style="margin-bottom: 18px; page-break-inside: avoid;">
                        <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
                            ${qText}
                        </div>
                        ${b1Html}
                        ${b2Html}
                    </div>
                `;
            }
        });
    });

    // 2. PART 2
    let part2Html = '';
    const p2Situation = p2.querySelector('.sol-situation-box');
    const p2SitText = p2Situation ? p2Situation.innerHTML.trim() : '';
    const p2B1 = p2.querySelector('.sol-level-box.level-b1');
    const p2B2 = p2.querySelector('.sol-level-box.level-b2');

    const p2B1Html = formatLevelBox(p2B1, 'b1', 'B1 LEVEL', '#00b0f0');
    const p2B2Html = formatLevelBox(p2B2, 'b2', 'B2 LEVEL', '#70ad47');

    part2Html += `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin: 12px 0 16px 0; font-size: 14px; line-height: 1.6; color: #1e293b; page-break-inside: avoid;">
            <div style="font-weight: 700; color: #dc2626; margin-bottom: 4px;">SITUATION (TÌNH HUỐNG):</div>
            ${p2SitText}
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
            Gợi ý bài mẫu thảo luận giải pháp:
        </div>
        ${p2B1Html}
        ${p2B2Html}
    `;

    // 3. PART 3
    let part3Html = '';
    const p3TopicBox = p3.querySelector('.sol-situation-box');
    const p3TopicText = p3TopicBox ? p3TopicBox.innerHTML.trim() : '';
    
    const p3AllB1 = p3.querySelectorAll('.sol-level-box.level-b1');
    const p3AllB2 = p3.querySelectorAll('.sol-level-box.level-b2');
    const p3MainB1 = p3AllB1[0];
    const p3MainB2 = p3AllB2[0];

    const p3MainB1Html = formatLevelBox(p3MainB1, 'b1', 'B1 LEVEL', '#00b0f0');
    const p3MainB2Html = formatLevelBox(p3MainB2, 'b2', 'B2 LEVEL', '#70ad47');

    part3Html += `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin: 12px 0 16px 0; font-size: 14px; line-height: 1.6; color: #1e293b; page-break-inside: avoid;">
            <div style="font-weight: 700; color: #dc2626; margin-bottom: 4px;">TOPIC OUTLINE (SƠ ĐỒ PHÁT TRIỂN CHỦ ĐỀ):</div>
            ${p3TopicText}
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
            Bài phát triển chủ đề mẫu:
        </div>
        ${p3MainB1Html}
        ${p3MainB2Html}
    `;

    const followUpItems = p3.querySelectorAll('.sol-question-item');
    if (followUpItems.length > 0) {
        let followUpsHtml = '';
        followUpItems.forEach((fEl) => {
            const fTextEl = fEl.querySelector('.sol-question-text');
            const fText = fTextEl ? fTextEl.innerHTML.trim() : '';
            const fB1 = fEl.querySelector('.sol-level-box.level-b1');
            const fB2 = fEl.querySelector('.sol-level-box.level-b2');

            const fB1Html = formatLevelBox(fB1, 'b1', 'B1 LEVEL', '#00b0f0');
            const fB2Html = formatLevelBox(fB2, 'b2', 'B2 LEVEL', '#70ad47');

            if (fB1Html || fB2Html) {
                followUpsHtml += `
                    <div style="margin-bottom: 18px; page-break-inside: avoid;">
                        <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
                            ${fText}
                        </div>
                        ${fB1Html}
                        ${fB2Html}
                    </div>
                `;
            }
        });

        if (followUpsHtml) {
            part3Html += `
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 9px 12px; font-size: 14.5px; font-weight: 700; color: #991b1b; margin: 24px 0 12px 0; border-radius: 0 4px 4px 0;">
                    FOLLOW-UP QUESTIONS (CÂU HỎI MỞ RỘNG)
                </div>
                ${followUpsHtml}
            `;
        }
    }

    const fullHtml = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
    <meta charset="utf-8">
    <title>BÀI GIẢI MẪU VSTEP SPEAKING - ${testTitle} (${level.toUpperCase()})</title>
    <style>
        @page {
            size: A4;
            margin: 1.8cm 1.5cm 1.8cm 1.5cm;
        }
        body {
            font-family: 'Segoe UI', Calibri, Arial, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            line-height: 1.6;
            font-size: 11pt;
            margin: 0;
            padding: 20px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .part-banner {
            background: #dc2626;
            color: #ffffff;
            font-size: 13pt;
            font-weight: 800;
            padding: 9px 14px;
            border-radius: 4px;
            margin: 26px 0 14px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    </style>
    </head>
    <body>
        <div style="text-align: center; border-bottom: 2.5px solid #dc2626; padding-bottom: 14px; margin-bottom: 22px;">
            <div style="color: #dc2626; font-size: 20pt; font-weight: 800; letter-spacing: 0.5px; margin: 0 0 4px 0;">ENGLISH WITH MISS NGUYET</div>
            <div style="color: #0f172a; font-size: 14pt; font-weight: 700; margin: 0 0 8px 0;">BÀI GIẢI MẪU ${levelTitleBadge} - ${testTitle}</div>
            <div style="font-size: 10pt; color: #64748b;">
                <span><strong>Học viên:</strong> ${student}</span> &nbsp;|&nbsp;
                <span><strong>Ngày xuất:</strong> ${dateStr}</span> &nbsp;|&nbsp;
                <span><strong>${levelMetaDesc}</strong></span>
            </div>
        </div>

        <!-- PART 1 -->
        <div class="part-banner">PART 01: SOCIAL INTERACTION (GIAO TIẾP XÃ HỘI)</div>
        ${part1Html}

        <!-- PART 2 -->
        <div class="part-banner" style="page-break-before: always;">PART 02: SOLUTION DISCUSSION (THẢO LUẬN GIẢI PHÁP)</div>
        ${part2Html}

        <!-- PART 3 -->
        <div class="part-banner" style="page-break-before: always;">PART 03: TOPIC DEVELOPMENT (PHÁT TRIỂN CHỦ ĐỀ)</div>
        ${part3Html}

        <!-- FOOTER -->
        <div style="margin-top: 40px; padding-top: 14px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 9.5pt; color: #64748b; page-break-inside: avoid;">
            <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">TÀI LIỆU ÔN THI VSTEP SPEAKING ĐỘC QUYỀN - ENGLISH WITH MISS NGUYET</p>
            <p style="margin: 0 0 4px 0;">Giảng viên: Ms. Nguyet Pham &bull; Hỗ trợ học tập: <a href="https://www.facebook.com/nguyetpham28" style="color: #dc2626; text-decoration: none;">facebook.com/nguyetpham28</a></p>
            <p style="margin: 0; font-style: italic;">Chúc các bạn học viên ôn tập hiệu quả và tự tin đạt điểm cao trong kỳ thi VSTEP!</p>
        </div>
    </body>
    </html>
    `;

    return {
        html: fullHtml,
        filename: `VSTEP_Speaking_Test${testNum.toString().padStart(2, '0')}_Bai_Giai_Mau_${fileSuffix}`
    };
}

function downloadSampleAnswersDoc(level) {
    const targetLevel = level || currentSolutionLevel || 'all';
    const data = getSampleAnswersHTML(targetLevel);
    if (!data) return;

    try {
        const blob = new Blob(['\ufeff' + data.html], {
            type: 'application/msword;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.filename}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const levelLabel = targetLevel === 'b1' ? 'Bậc B1' : (targetLevel === 'b2' ? 'Bậc B2' : 'B1 & B2');
        if (typeof showNotificationModal === 'function') {
            showNotificationModal('TẢI BÀI MẪU THÀNH CÔNG', `Đã tải về máy file Word (.doc) bài giải mẫu <strong>${levelLabel}</strong> của <strong>${data.filename}</strong>! Bạn có thể mở bằng Microsoft Word, Google Docs hoặc WPS Office để ôn tập.`);
        }
    } catch (err) {
        console.error('Download error:', err);
        alert('Có lỗi khi tải file. Vui lòng thử lại!');
    }
}

function printSampleAnswersPDF(level) {
    const targetLevel = level || currentSolutionLevel || 'all';
    const data = getSampleAnswersHTML(targetLevel);
    if (!data) return;

    try {
        let printFrame = document.getElementById('print-solution-frame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'print-solution-frame';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            document.body.appendChild(printFrame);
        }

        const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
        const doc = frameDoc.document || frameDoc;
        doc.open();
        doc.write(data.html);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        }, 500);
    } catch (err) {
        console.error('Print error:', err);
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(data.html);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); }, 500);
        } else {
            alert('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup hoặc sử dụng nút tải file Word (.doc)!');
        }
    }
}

function showDownloadOptionsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'lock-screen-overlay';
    overlay.style.opacity = '0';
    
    const pathMatch = window.location.pathname.match(/test\s*(\d+)/i);
    const testNum = pathMatch ? parseInt(pathMatch[1]) : 1;
    const testTitle = `SPEAKING TEST ${testNum.toString().padStart(2, '0')}`;

    overlay.innerHTML = `
        <div class="lock-card" style="max-width: 500px; padding: 24px;">
            <div class="lock-icon-container" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%); color: #10b981; border-color: rgba(16, 185, 129, 0.15);">
                <i class="fa-solid fa-file-arrow-down"></i>
            </div>
            <div>
                <h2 class="lock-title">TẢI BÀI MẪU THEO BẬC</h2>
                <p class="lock-subtitle" style="margin-top: 6px;">Chọn bậc thi VSTEP bạn muốn tải về máy của <strong>${testTitle}</strong>:</p>
            </div>
            
            <!-- Bậc B1 -->
            <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 10px; padding: 12px 14px; margin-top: 15px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 800; color: #0284c7; font-size: 14px;">
                        <i class="fa-solid fa-bookmark" style="color: #00b0f0;"></i> BÀI MẪU BẬC B1
                    </span>
                    <span style="font-size: 11px; color: #0369a1; background: #e0f2fe; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Dành cho mục tiêu B1</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-sm" id="modal-dl-b1-doc" style="flex: 1; background: #00b0f0; color: #fff; font-weight: 700; border-radius: 6px; padding: 8px 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fa-solid fa-file-word"></i> Tải bản Word (.doc)
                    </button>
                    <button type="button" class="btn btn-sm" id="modal-dl-b1-pdf" style="flex: 1; background: #0284c7; color: #fff; font-weight: 700; border-radius: 6px; padding: 8px 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fa-solid fa-file-pdf"></i> In / Lưu PDF
                    </button>
                </div>
            </div>

            <!-- Bậc B2 -->
            <div style="background: #f4fbf0; border: 1.5px solid #d9f99d; border-radius: 10px; padding: 12px 14px; margin-top: 10px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 800; color: #4d7c0f; font-size: 14px;">
                        <i class="fa-solid fa-bookmark" style="color: #70ad47;"></i> BÀI MẪU BẬC B2
                    </span>
                    <span style="font-size: 11px; color: #3f6212; background: #ecfccb; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Dành cho mục tiêu B2 / C1</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-sm" id="modal-dl-b2-doc" style="flex: 1; background: #70ad47; color: #fff; font-weight: 700; border-radius: 6px; padding: 8px 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fa-solid fa-file-word"></i> Tải bản Word (.doc)
                    </button>
                    <button type="button" class="btn btn-sm" id="modal-dl-b2-pdf" style="flex: 1; background: #4d7c0f; color: #fff; font-weight: 700; border-radius: 6px; padding: 8px 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fa-solid fa-file-pdf"></i> In / Lưu PDF
                    </button>
                </div>
            </div>

            <!-- Cả 2 bậc -->
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <span style="font-size: 12.5px; color: #64748b; font-weight: 600;">Tải cả 2 bậc (B1 & B2):</span>
                <div style="display: flex; gap: 6px;">
                    <button type="button" id="modal-dl-all-doc" style="background: #64748b; color: #fff; font-size: 11.5px; font-weight: 700; padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer;">
                        <i class="fa-solid fa-file-word"></i> Word
                    </button>
                    <button type="button" id="modal-dl-all-pdf" style="background: #475569; color: #fff; font-size: 11.5px; font-weight: 700; padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer;">
                        <i class="fa-solid fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>

            <button type="button" class="btn btn-secondary" id="modal-btn-close" style="margin-top: 14px; width: 100%; padding: 10px; border-radius: 8px;">
                Đóng
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = '1'; }, 10);

    const close = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('#modal-dl-b1-doc').addEventListener('click', () => {
        close();
        downloadSampleAnswersDoc('b1');
    });
    overlay.querySelector('#modal-dl-b1-pdf').addEventListener('click', () => {
        close();
        printSampleAnswersPDF('b1');
    });

    overlay.querySelector('#modal-dl-b2-doc').addEventListener('click', () => {
        close();
        downloadSampleAnswersDoc('b2');
    });
    overlay.querySelector('#modal-dl-b2-pdf').addEventListener('click', () => {
        close();
        printSampleAnswersPDF('b2');
    });

    overlay.querySelector('#modal-dl-all-doc').addEventListener('click', () => {
        close();
        downloadSampleAnswersDoc('all');
    });
    overlay.querySelector('#modal-dl-all-pdf').addEventListener('click', () => {
        close();
        printSampleAnswersPDF('all');
    });

    overlay.querySelector('#modal-btn-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
}

function downloadSampleAnswers() {
    showDownloadOptionsModal();
}

