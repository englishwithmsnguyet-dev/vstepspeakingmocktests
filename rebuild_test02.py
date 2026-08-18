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
        # Convert multiple paragraphs to HTML structure
        # Wait, for test 01 I used <br><br> between paragraphs.
        # But wait! Sometimes the text starts with [B|None] in the docx if it's completely bold.
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
    elif (line.startswith('[_|None]') or line.startswith('[B|')) and current_level and 'LEVEL' not in line:
        # Wait, in test2_format.txt, the very first word might be bold, so it starts with [B|...]
        # Let's check if it's a topic header vs an answer paragraph.
        # Usually answers come immediately after LEVEL.
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
        p_text = p_text.replace(" .", ".").replace(" ,", ",").replace(" ’ s", "’s")
        p_text = p_text.replace(" ?", "?").replace(" !", "!")
        
        # Test if it's a question instead of an answer?
        # In test2_format.txt, questions are prefixed with [B|None] 1. ... but they are BEFORE the LEVEL!
        # Once we are inside a LEVEL, everything is an answer paragraph until the next topic header.
        # But wait, the next topic header could be [B|None] 3. Do you... 
        # If the line is just a question, it doesn't belong to the current LEVEL, it means the answer ended!
        if p_text and p_text[0].isdigit() and ". " in p_text[:5]:
            finish_answer()
        elif p_text.startswith("PART ") or p_text.startswith("Let's talk about") or p_text.startswith("SITUATION") or p_text.startswith("TOPIC"):
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
    exit(1)

for i, lc in enumerate(level_contents):
    eng_html = answers[i]['html']
    
    toggle = lc.find('div', class_='translation-toggle')
    text_div = lc.find('div', class_='translation-text')
    
    # Let's clear the lc content
    lc.clear()
    
    # Append the new parsed english paragraphs
    eng_soup = BeautifulSoup(eng_html, 'html.parser')
    lc.append(eng_soup)
    
    # Re-append the translation features
    if toggle:
        lc.append(toggle)
    if text_div:
        lc.append(text_div)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(str(soup))

print("Successfully rebuilt test02-index.html")
