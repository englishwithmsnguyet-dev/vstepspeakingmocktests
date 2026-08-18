import re
import os

def extract_colors(text):
    return re.findall(r'<strong[^>]*style=["\']color:\s*(#[0-9a-fA-F]{6})[^>]*>', text)

with open('all_mismatches.txt', 'w', encoding='utf-8') as f:
    for i in [1, 2, 4, 5]:
        test_num = f"{i:02d}"
        html_path = f'/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test {i}/test{test_num}-index.html'
        
        with open(html_path, 'r', encoding='utf-8') as f_in:
            html = f_in.read()
            
        levels = re.split(r'<div class="level-content"[^>]*>', html)[1:]
        
        f.write(f"--- TEST {test_num} ---\n")
        for j, level in enumerate(levels):
            parts = level.split('<div class="translation-text"')
            if len(parts) > 1:
                english = parts[0]
                # Extract the translation text block
                # Find the closing </div> of the translation-text
                # A robust way is to just take everything until the </div></div>
                # But let's just find the first </div> that closes the translation text.
                # Actually, translation-text contains bold tags but no other divs.
                vietnamese_raw = parts[1]
                match = re.search(r'>([\s\S]*?)</div>', vietnamese_raw)
                if match:
                    vietnamese = match.group(1)
                else:
                    vietnamese = vietnamese_raw
                
                eng_colors = extract_colors(english)
                vie_colors = extract_colors(vietnamese)
                
                if eng_colors != vie_colors:
                    f.write(f"[{j+1}] Mismatch!\n")
                    f.write(f"ENG: {english.strip()}\n")
                    f.write(f"VIE: {vietnamese.strip()}\n\n")
