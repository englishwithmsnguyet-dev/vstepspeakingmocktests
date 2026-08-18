import re
import json
import sys
from bs4 import BeautifulSoup

# Load translation db for bolds
sys.path.append("/Users/nguyetpham/.gemini/antigravity/brain/1ea5bf29-5d28-4bea-9f3e-0f4ec95e8392/scratch")
from apply_solution_updates import translation_db

def clean_text(text):
    s = re.sub(r'<[^>]+>', '', text)
    s = s.lower()
    s = re.sub(r"[’'\-\(\)\.,;\?\!]", " ", s)
    s = re.sub(r'[^a-z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', '', s)
    return " ".join(s.split())

norm_db = {}
for key, val in translation_db.items():
    norm_db[clean_text(key)] = val

# Parse test1_format.txt
with open('test1_format.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

answers = []
current_level = None

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    if line.endswith('LEVEL'):
        current_level = line
    elif line.startswith('[') and current_level:
        runs = line.split(' | ')
        html_parts = []
        bold_texts = []
        for r in runs:
            m = re.match(r'\[([B_])\|([0-9A-F]+|None)\] (.*)', r)
            if m:
                is_bold = m.group(1) == 'B'
                color = m.group(2)
                text = m.group(3)
                
                if is_bold and color != 'None':
                    html_parts.append(f'<strong style="color: #{color.lower()};">{text}</strong>')
                    bold_texts.append(text)
                elif is_bold:
                    html_parts.append(f'<strong>{text}</strong>')
                    bold_texts.append(text)
                else:
                    html_parts.append(text)
            else:
                html_parts.append(r)
        
        html_text = "".join(html_parts)
        html_text = html_text.replace(" .", ".").replace(" ,", ",").replace(" ’ s", "’s")
        html_text = html_text.replace(" ?", "?").replace(" !", "!")
        
        answers.append({
            'html': html_text,
            'bolds': bold_texts
        })
        current_level = None

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

if len(level_contents) != len(answers):
    print(f"Error: found {len(level_contents)} level-content blocks, but expected {len(answers)}")
    sys.exit(1)

for i, lc in enumerate(level_contents):
    ans = answers[i]
    eng_html = ans['html']
    bolds = ans['bolds']
    
    # Extract translation text
    trans_div = lc.find('div', class_='translation-text')
    if trans_div:
        # Original text without HTML
        trans_text = trans_div.get_text(separator=' ').strip()
        
        # Apply bolds to translation text
        for b in bolds:
            norm_b = clean_text(b)
            if norm_b in norm_db:
                v_bold = norm_db[norm_b]
                # Replace case-insensitively, but keep original case?
                # Actually, simple replace is fine for vietnamese since norm_db has exact matches
                # But to be safe, use regex
                # v_bold could contain regex special chars, escape it
                v_bold_esc = re.escape(v_bold)
                trans_text = re.sub(f'(?i)({v_bold_esc})', r'<strong>\1</strong>', trans_text)
            else:
                print(f"Warning: No translation found for bold phrase '{b}'")
        
        # Now rebuild the inner HTML of level-content
        # We need to keep the structure:
        # {eng_html}
        # <div class="translation-toggle"...></div>
        # <div class="translation-text"...>{trans_text}</div>
        
        # We will clear the lc and append new tags
        lc.clear()
        
        # Insert english text as elements (using BeautifulSoup)
        eng_soup = BeautifulSoup(eng_html, 'html.parser')
        lc.append(eng_soup)
        
        # Re-add toggle
        toggle = soup.new_tag('div', attrs={'class': 'translation-toggle', 'onclick': 'toggleTranslation(this)'})
        toggle_strong = soup.new_tag('strong')
        toggle_strong.string = 'Vietnamese meaning'
        toggle_icon = soup.new_tag('i', attrs={'class': 'fa-solid fa-chevron-down'})
        toggle.append(toggle_strong)
        toggle.append(" ")
        toggle.append(toggle_icon)
        lc.append(toggle)
        
        # Re-add translation-text
        trans_new_div = soup.new_tag('div', attrs={'class': 'translation-text', 'style': 'display: none; white-space: pre-line;'})
        trans_soup = BeautifulSoup(trans_text, 'html.parser')
        trans_new_div.append(trans_soup)
        lc.append(trans_new_div)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(str(soup))

print("Successfully injected formatted Test 1 answers.")
