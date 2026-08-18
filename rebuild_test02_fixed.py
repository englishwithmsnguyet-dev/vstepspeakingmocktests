import re
from bs4 import BeautifulSoup

with open('test2_format.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

answers = []
current_level = None
current_html_paragraphs = []

def finish_answer():
    global current_level, current_html_paragraphs
    if current_level and current_html_paragraphs:
        html_text = "<br><br>".join(current_html_paragraphs)
        answers.append({
            'html': html_text
        })
        current_html_paragraphs = []
    current_level = None

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    if line.endswith('LEVEL'):
        finish_answer()
        current_level = line
    elif (line.startswith('[_|') or line.startswith('[B|')) and current_level and 'LEVEL' not in line:
        runs = line.split(' | ')
        html_parts = []
        for r in runs:
            m = re.match(r'\[([B_])\|([0-9A-F]+|None)\] (.*)', r)
            if m:
                is_bold = m.group(1) == 'B'
                color = m.group(2)
                text = m.group(3)
                
                if is_bold and color != 'None':
                    html_parts.append(f'<strong style="color: #{color.lower()};">{text}</strong>')
                elif is_bold:
                    html_parts.append(f'<strong>{text}</strong>')
                else:
                    html_parts.append(text)
            else:
                html_parts.append(r)
        
        p_text = "".join(html_parts)
        
        # Clean up some spaces
        p_text = p_text.replace(" .", ".").replace(" ,", ",").replace(" ’ s", "’s")
        p_text = p_text.replace(" ?", "?").replace(" !", "!")
        
        clean_text = re.sub(r'<[^>]+>', '', p_text).strip()
        
        if clean_text and clean_text[0].isdigit() and ". " in clean_text[:5]:
            finish_answer()
        elif clean_text.startswith("PART ") or clean_text.startswith("Let's talk about") or clean_text.startswith("SITUATION") or clean_text.startswith("TOPIC"):
            finish_answer()
        else:
            current_html_paragraphs.append(p_text)

finish_answer()

print(f"Extracted {len(answers)} answers from test2_format.txt")

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 2/test02-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

if len(level_contents) != len(answers):
    print(f"Error: found {len(level_contents)} level-content blocks, but expected {len(answers)}")
    # Just to be safe, don't crash
    # exit(1)

for i, lc in enumerate(level_contents):
    if i >= len(answers):
        break
    eng_html = answers[i]['html']
    
    toggle = lc.find('div', class_='translation-toggle')
    text_div = lc.find('div', class_='translation-text')
    
    lc.clear()
    
    eng_soup = BeautifulSoup(eng_html, 'html.parser')
    lc.append(eng_soup)
    
    if toggle:
        lc.append(toggle)
    if text_div:
        lc.append(text_div)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(str(soup))

print("Successfully rebuilt test02-index.html")
