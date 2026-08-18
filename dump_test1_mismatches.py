import re
import os

def extract_colors(text):
    return re.findall(r'<strong[^>]*style=["\']color:\s*(#[0-9a-fA-F]{6})[^>]*>', text)

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()
    
# Split by level-content
levels = re.split(r'<div class="level-content"[^>]*>', html)[1:]

with open('test1_mismatches.txt', 'w', encoding='utf-8') as f:
    for j, level in enumerate(levels):
        parts = level.split('<div class="translation-text"')
        if len(parts) > 1:
            english = parts[0]
            vietnamese = parts[1].split('</div>')[0].split('>')[-1].strip()
            
            eng_colors = extract_colors(english)
            vie_colors = extract_colors(vietnamese)
            
            if eng_colors != vie_colors:
                f.write(f"[{j+1}] Mismatch!\n")
                f.write(f"ENG: {english.strip()}\n")
                f.write(f"VIE: {vietnamese.strip()}\n\n")
