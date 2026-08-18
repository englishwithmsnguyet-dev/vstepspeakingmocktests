import os
import re

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    js_path = f"test {t}/app.js"
    
    # Update HTML
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Remove prep-tips-box completely
        # regex to remove <div class="prep-tips-box"> ... </div>
        html = re.sub(r'<div class="prep-tips-box">[\s\S]*?</div>', '', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
            
    # Update JS
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            js = f.read()
            
        # 1. Change text "ĐANG CHUẨN BỊ (PREPARATION)"
        js = js.replace('ĐANG CHUẨN BỊ (PREPARATION)', 'Thời gian chuẩn bị. Hệ thống sẽ không ghi âm.')
        
        # 2. Remove references to TipText and hiding Next buttons
        js = re.sub(r'elements\.p2TipText\.innerText = .*?;', '', js)
        js = re.sub(r"elements\.btnP2Next\.style\.display = 'none';", "elements.btnP2Next.style.display = 'inline-flex';", js)
        
        js = re.sub(r'elements\.p3TipText\.innerText = .*?;', '', js)
        js = re.sub(r"elements\.btnP3Next\.style\.display = 'none';", "elements.btnP3Next.style.display = 'inline-flex';", js)
        
        # 3. Update btnP2Next click handler
        old_btnP2Next_logic = """    elements.btnP2Next.addEventListener('click', () => {
        if (currentScreen === 'part2_speak') {
            // Stop speaking, proceed to Part 3 prep
            if (timerInterval) clearInterval(timerInterval);
            stopRecording(2);
            enterPart3Prep();
        }
    });"""
        new_btnP2Next_logic = """    elements.btnP2Next.addEventListener('click', () => {
        if (currentScreen === 'part2_prep') {
            if (timerInterval) clearInterval(timerInterval);
            enterPart2Speaking();
        } else if (currentScreen === 'part2_speak') {
            if (timerInterval) clearInterval(timerInterval);
            stopRecording(2);
            enterPart3Prep();
        }
    });"""
        js = js.replace(old_btnP2Next_logic, new_btnP2Next_logic)
        
        # 4. Update btnP3Next click handler
        old_btnP3Next_logic = """    elements.btnP3Next.addEventListener('click', () => {
        if (currentScreen === 'part3_speak') {
            // Complete exam, proceed to review dashboard
            if (timerInterval) clearInterval(timerInterval);
            stopRecording(3);
            enterReview();
        }
    });"""
        new_btnP3Next_logic = """    elements.btnP3Next.addEventListener('click', () => {
        if (currentScreen === 'part3_prep') {
            if (timerInterval) clearInterval(timerInterval);
            enterPart3Speaking();
        } else if (currentScreen === 'part3_speak') {
            if (timerInterval) clearInterval(timerInterval);
            stopRecording(3);
            enterReview();
        }
    });"""
        js = js.replace(old_btnP3Next_logic, new_btnP3Next_logic)
        
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js)

print("Preparation UI updated.")
