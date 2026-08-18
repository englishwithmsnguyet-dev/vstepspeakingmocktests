import os
import time

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    css_path = f"test {t}/styles.css"
    html_path = f"test {t}/test{t:02d}-index.html"
    
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            
        # Hide app-header
        if 'display: none !important;' not in css.split('.app-header {')[1].split('}')[0]:
            css = css.replace('.app-header {\n    position: relative;', '.app-header {\n    display: none !important;\n    position: relative;')
            
        # Modify mock-test-pill to look good inline
        if 'display: inline-block;' not in css.split('.mock-test-pill {')[1].split('}')[0]:
            css = css.replace('.mock-test-pill {\n    background:', '.mock-test-pill {\n    display: inline-block;\n    margin-top: 8px;\n    margin-bottom: 24px;\n    background:')
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)
            
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        test_str = f"SPEAKING MOCK TEST {t:02d}"
        
        # Remove from header
        pill_html = f'<div class="mock-test-pill">{test_str}</div>'
        if pill_html in html:
            # We will just remove it from the header area. Since we'll add it under h1, we need to be careful not to remove the one we just added if we run script multiple times.
            pass
            
        # Instead of generic replace, let's target the exact header-title-wrapper block
        import re
        html = re.sub(r'<div class="header-title-wrapper">\s*<div class="mock-test-pill">.*?</div>\s*</div>', '<div class="header-title-wrapper"></div>', html)
        
        # Add to welcome-header-center
        target_h1 = '<h1>VSTEP Speaking Practice</h1>'
        if target_h1 in html and test_str not in html.split(target_h1)[1][:200]:
            html = html.replace(target_h1, f'{target_h1}\n                        <div class="mock-test-pill">{test_str}</div>')
            
        # Cache buster
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print(f"Pill moved down with cache buster v={v}")
