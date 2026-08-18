import re

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    matches = re.findall(r"Let's talk about.*?:", html)
    for m in matches:
        print(f"Test {t}: {repr(m)}")

