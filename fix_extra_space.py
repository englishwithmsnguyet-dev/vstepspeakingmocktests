import os

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Fix the extra space before </div> in part-header-tag
        html = html.replace('</span> </div>', '</span></div>')
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

print("Extra spaces removed.")
