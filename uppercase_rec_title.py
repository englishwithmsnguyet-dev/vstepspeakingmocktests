import os
import time
import re

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    css_path = f"test {t}/styles.css"
    html_path = f"test {t}/test{t:02d}-index.html"
    
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            
        old_rec_title = """.rec-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
}"""
        
        new_rec_title = """.rec-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
}"""
        if 'text-transform: uppercase;' not in css.split('.rec-title {')[1].split('}')[0]:
            css = css.replace(old_rec_title, new_rec_title)
            
            with open(css_path, 'w', encoding='utf-8') as f:
                f.write(css)
                
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Cache buster
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print(f"rec-title uppercase applied with v={v}")
