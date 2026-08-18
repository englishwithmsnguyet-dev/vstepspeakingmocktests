import os
import re

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # The current HTML looks like:
        # <h3 class="topic-title"><i class="fa-solid fa-utensils"></i> Let's talk about <strong>street food</strong>:</h3>
        # We want to change it to:
        # <h3 class="topic-title"><i class="fa-solid fa-utensils"></i> <span>Let's talk about <strong>street food</strong>:</span></h3>
        
        # Regex to find: <h3 class="topic-title"><i class=".*?"></i> (Let's talk about .*?:)</h3>
        def replace_func(match):
            i_tag = match.group(1)
            text_content = match.group(2)
            return f'<h3 class="topic-title">{i_tag} <span>{text_content}</span></h3>'
            
        html = re.sub(
            r'<h3 class="topic-title">(<i class="[^"]+"></i>)\s*(Let\'s talk about .*?:)</h3>', 
            replace_func, 
            html
        )
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print("Flexbox wrap issue fixed.")
