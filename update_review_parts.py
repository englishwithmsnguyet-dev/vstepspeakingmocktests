import os
import time
import re

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        html = html.replace('<span class="rec-part">Part 1</span>', '<span class="rec-part">PART 01</span>')
        html = html.replace('<span class="rec-part">Part 2</span>', '<span class="rec-part">PART 02</span>')
        html = html.replace('<span class="rec-part">Part 3</span>', '<span class="rec-part">PART 03</span>')
        
        # Cache buster
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print(f"Review parts updated with v={v}")
