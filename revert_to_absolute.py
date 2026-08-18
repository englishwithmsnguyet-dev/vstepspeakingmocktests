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
            
        # Ensure app-header is relative
        if 'position: relative;' not in css.split('.app-header {')[1].split('}')[0]:
            css = css.replace('.app-header {\n    height', '.app-header {\n    position: relative;\n    height')
            
        # Re-add absolute positioning to header-title-wrapper
        if 'position: absolute;' not in css.split('.header-title-wrapper {')[1].split('}')[0]:
            css = css.replace('.header-title-wrapper {\n        display: flex;\n    justify-content: center;\n}', '.header-title-wrapper {\n    position: absolute;\n    left: 50%;\n    transform: translateX(-50%);\n    display: flex;\n    justify-content: center;\n}')
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)
            
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        import re
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print(f"Reverted to absolute centering with cache buster v={v}")
