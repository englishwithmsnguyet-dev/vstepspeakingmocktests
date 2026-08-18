import os
import re

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Fix the specific broken pattern
        html = re.sub(
            r"Let's talk about <strong></strong>: uppercase;'>(.*?)</strong>:", 
            r"Let's talk about <strong>\1</strong>:", 
            html
        )
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print("Topic bold completely fixed.")
