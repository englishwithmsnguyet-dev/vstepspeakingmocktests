import os

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    css_path = f"test {t}/styles.css"
    
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Change "Bắt đầu Mock Test" to "BẮT ĐẦU BÀI THI"
        html = html.replace('Bắt đầu Mock Test', 'BẮT ĐẦU BÀI THI')
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
            
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            
        # Override uppercase for topic-title
        if '.topic-title { text-transform: none !important; }' not in css:
            css += "\n.topic-title { text-transform: none !important; }\n"
            css += ".topic-title strong { text-transform: uppercase !important; }\n" # Just in case they want the topic bold AND uppercase like the image
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)

print("Updates applied.")
