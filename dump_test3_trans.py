import re

path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 3/test03-index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

levels = re.split(r'<div class="level-content">', content)[1:]
with open('test3_trans_debug.txt', 'w', encoding='utf-8') as f:
    for i, level in enumerate(levels):
        parts = level.split('<div class="translation-text"')
        if len(parts) > 1:
            english = parts[0]
            english_clean = re.sub(r'<[^>]+>', '', english).strip().replace('\n', ' ')
            vietnamese = parts[1].split('</div>')[0].split('>')[-1].strip().replace('\n', ' ')
            f.write(f"[{i+1}]\nENG: {english_clean}\nVIE: {vietnamese}\n\n")
