import os
import time
import re

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    js_path = f"test {t}/app.js"
    
    # 1. Update HTML
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Update text
        html = html.replace('<h3><i class="fa-solid fa-comment-medical"></i> Nhận xét & Đánh giá</h3>', '<h3><i class="fa-solid fa-comment-medical"></i> ĐÁNH GIÁ CHUNG</h3>')
        html = html.replace('<label for="teacher-feedback">Nhận xét tự đánh giá hoặc của giáo viên:</label>', '<label for="teacher-feedback">Học viên tự đánh giá mức độ hoàn thành bài nói:</label>')
        html = html.replace('placeholder="Học viên tự đánh giá hoặc giáo viên ghi nhận xét tại đây..."', 'placeholder="Học viên đánh giá mức độ hoàn thành bài nói hoặc giáo viên ghi nhận xét tại đây..."')
        
        # Add button to review-actions
        if 'id="btn-view-solution"' not in html:
            target_btn = '<button class="btn btn-secondary" id="btn-restart-test">'
            new_btn = """<button class="btn btn-primary" id="btn-view-solution" style="background: var(--color-red);">
                            <i class="fa-solid fa-book-open"></i> Xem bài giải chi tiết
                        </button>
                        <button class="btn btn-secondary" id="btn-restart-test">"""
            html = html.replace(target_btn, new_btn)
            
        # Add view-solution screen
        if 'id="view-solution"' not in html:
            target_section = '            </section>\n\n        </main>'
            solution_section = """            </section>

            <!-- SCREEN 6: SOLUTION SCREEN -->
            <section class="screen-view" id="view-solution">
                <div class="glass-card instruction-card">
                    <h2 style="color: var(--color-red); margin-bottom: 20px;"><i class="fa-solid fa-book-open"></i> BÀI GIẢI CHI TIẾT</h2>
                    <div class="instruction-content">
                        <p>Dưới đây là phần gợi ý bài giải chi tiết cho đề thi này. Giáo viên có thể cập nhật nội dung vào phần này.</p>
                        
                        <div class="solution-content" style="margin-top: 24px; padding: 20px; background: rgba(255,255,255,0.5); border-radius: 8px; border: 1px solid var(--border-color);">
                            <h4 style="color: var(--text-dark); margin-bottom: 12px;">PART 01: SOCIAL INTERACTION</h4>
                            <p style="color: var(--text-muted); font-style: italic;">(Nội dung bài giải đang được cập nhật...)</p>
                        </div>
                    </div>
                </div>
            </section>

        </main>"""
            html = html.replace(target_section, solution_section)
            
        # Cache buster
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        html = re.sub(r'src="app\.js(\?v=\d+)?"', f'src="app.js?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
            
    # 2. Update JS
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            js = f.read()
            
        if 'btnViewSolution: document.getElementById(\'btn-view-solution\')' not in js:
            js = js.replace("btnRestartTest: document.getElementById('btn-restart-test')", "btnRestartTest: document.getElementById('btn-restart-test'),\n    btnViewSolution: document.getElementById('btn-view-solution')")
            
        if 'elements.btnViewSolution.addEventListener' not in js:
            js = js.replace("elements.btnRestartTest.addEventListener('click', () => {", "if (elements.btnViewSolution) {\n        elements.btnViewSolution.addEventListener('click', () => {\n            showScreen('solution');\n        });\n    }\n\n    elements.btnRestartTest.addEventListener('click', () => {")
            
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js)

print(f"Solution screen added with v={v}")
