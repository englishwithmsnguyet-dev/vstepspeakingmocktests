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
            
        # 1. Remove absolute positioning from header-title-wrapper
        if 'position: absolute;\n    left: 50%;\n    transform: translateX(-50%);\n' in css:
            css = css.replace('position: absolute;\n    left: 50%;\n    transform: translateX(-50%);\n', '')
            
        # 2. Add flex: 1 to brand-left
        if '.brand-left {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n}' in css:
            css = css.replace('.brand-left {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n}', '.brand-left {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    flex: 1;\n}')
            
        # 3. Add brand-right class with flex: 1
        if '.brand-right {' not in css:
            css += "\n.brand-right { flex: 1; }\n"
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)
            
    # Cache buster update
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        import re
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print(f"Header centering fixed via Flexbox, cache buster v={v}")
