import os
import time

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    css_path = f"test {t}/styles.css"
    html_path = f"test {t}/test{t:02d}-index.html"
    
    # 1. Update HTML
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        html = html.replace('<div class="brand-left">\n            </div>', '')
        html = html.replace('<div class="brand-right"></div>', '')
        
        # Cache buster
        import re
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
            
    # 2. Update CSS
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            
        # Update .app-container padding
        if 'padding-bottom: 120px;' not in css:
            css = css.replace('.app-container {\n    display: flex;\n    flex-direction: column;\n    min-height: 100vh;\n    position: relative;\n}', '.app-container {\n    display: flex;\n    flex-direction: column;\n    min-height: 100vh;\n    position: relative;\n    padding-bottom: 120px;\n}')
            
        # Update .app-header
        css = css.replace('justify-content: space-between;', 'justify-content: center;')
        
        # Update header-title-wrapper
        css = css.replace('position: absolute;\n    left: 50%;\n    transform: translateX(-50%);\n    ', '')
        
        # Update mock-test-pill
        if 'font-size: 22px;' not in css:
            css = css.replace('.mock-test-pill {\n    background: rgba(124, 58, 237, 0.06);\n    border: 1.5px solid rgba(124, 58, 237, 0.2);\n    color: var(--color-violet);\n    padding: 8px 24px;\n    border-radius: 50px;\n    font-size: 14px;\n    font-weight: 800;\n    letter-spacing: 1px;\n    text-transform: uppercase;\n}', '.mock-test-pill {\n    background: rgba(124, 58, 237, 0.06);\n    border: 2px solid rgba(124, 58, 237, 0.2);\n    color: var(--color-violet);\n    padding: 12px 40px;\n    border-radius: 50px;\n    font-size: 22px;\n    font-weight: 900;\n    letter-spacing: 1.5px;\n    text-transform: uppercase;\n}')
            
        # Update progress-timeline
        if 'position: fixed;' not in css.split('.progress-timeline {')[1].split('}')[0]:
            replacement = """.progress-timeline {
    position: fixed;
    bottom: 30px;
    left: calc(var(--sidebar-width) + (100vw - var(--sidebar-width)) / 2);
    transform: translateX(-50%);
    z-index: 1000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 800px;
    width: 90%;
    margin: 0;
    padding: 14px 30px;
    border-radius: 100px;
    border: 1px solid var(--border-color);
}"""
            import re
            css = re.sub(r'\.progress-timeline \{[^\}]+\}', replacement, css)
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)

print(f"Layout updated to fix timeline to bottom and center header. v={v}")
