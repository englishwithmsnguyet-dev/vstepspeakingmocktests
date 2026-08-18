import re

path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 6/test06-index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

levels = re.split(r'<div class="level-content">', content)[1:]
if not levels:
    levels = re.split(r'<div class="level-content" style="white-space: pre-line;">', content)[1:]
    
with open('test6_debug.txt', 'w', encoding='utf-8') as f:
    for i, level in enumerate(levels):
        parts = level.split('<div class="translation-text"')
        if len(parts) > 1:
            english = parts[0]
            english_clean = english.replace('\n', ' ').strip()
            vietnamese = parts[1].split('</div>')[0].split('>')[-1].strip().replace('\n', ' ')
            f.write(f"[{i+1}]\nENG: {english_clean}\nVIE: {vietnamese}\n\n")
