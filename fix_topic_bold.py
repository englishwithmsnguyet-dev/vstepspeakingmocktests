import os
import re

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # The broken text looks like: Let's talk about <strong><strong style='text-transform</strong>: uppercase;'>street food</strong>:
        # Or something else. Let's just use regex to strip out everything between "Let's talk about " and ":" and wrap it in a clean <strong>.
        # Let's find all occurrences:
        def replace_func(match):
            inner = match.group(1)
            # Remove all HTML tags from the inner content to extract just the text
            clean_text = re.sub(r'<[^>]+>', '', inner)
            return f"Let's talk about <strong>{clean_text}</strong>:"
            
        html = re.sub(r"Let's talk about (.*?):", replace_func, html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print("Topic bold fixed.")
