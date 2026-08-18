import os
import time

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Update text labels
        html = html.replace('<div class="step-label">Chuẩn bị</div>', '<div class="step-label">CHUẨN BỊ</div>')
        html = html.replace('<div class="step-label">Part 1</div>', '<div class="step-label">PART 01</div>')
        html = html.replace('<div class="step-label">Part 2</div>', '<div class="step-label">PART 02</div>')
        html = html.replace('<div class="step-label">Part 3</div>', '<div class="step-label">PART 03</div>')
        html = html.replace('<div class="step-label">Kết quả</div>', '<div class="step-label">KẾT QUẢ</div>')
        
        # Add BÀI GIẢI step
        target_block = """            <div class="timeline-step" id="step-review">
                <div class="step-num">4</div>
                <div class="step-label">KẾT QUẢ</div>
            </div>
        </div>"""
        
        new_block = """            <div class="timeline-step" id="step-review">
                <div class="step-num">4</div>
                <div class="step-label">KẾT QUẢ</div>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-step" id="step-solution">
                <div class="step-num">5</div>
                <div class="step-label">BÀI GIẢI</div>
            </div>
        </div>"""
        
        if target_block in html and 'BÀI GIẢI' not in html:
            html = html.replace(target_block, new_block)
            
        # Cache buster
        import re
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print(f"Timeline updated with v={v}")
