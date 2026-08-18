import re

path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 3/test03-index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

levels = re.split(r'<div class="level-content">', content)[1:]
for level in levels:
    parts = level.split('<div class="translation-text"')
    if len(parts) > 1:
        english = parts[0]
        vietnamese = parts[1].split('</div>')[0].split('>')[-1].strip()
        if '<strong' not in vietnamese:
            print("ENG:", re.sub(r'<[^>]+>', '', english).strip()[:100])
            print("VIE:", vietnamese)
            print("-" * 50)
