import os
import time

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        import re
        # Find <link rel="stylesheet" href="styles.css..."> and update it
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print(f"Cache buster applied with v={v}")
