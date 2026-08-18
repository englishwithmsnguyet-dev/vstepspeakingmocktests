import re
from bs4 import BeautifulSoup

with open('test1_format.txt', 'r', encoding='utf-8') as f:
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
    elif line.startswith('[_|None]') and current_level:
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
        current_html_paragraphs.append(p_text)
    elif line.startswith('[B|None]') and current_level:
        # non-answer line (e.g. topic headers)
        finish_answer()

finish_answer()

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
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
    
    # We want to keep everything else (like the TTS button is OUTSIDE level-content)
    # Wait, in the HTML, TTS button is next to <span class="level-badge b1"> B1 LEVEL </span>
    # The structure is:
    # <div class="sol-level-box level-b1">
    #   <span class="level-badge b1">B1 LEVEL</span>
    #   <button class="tts-play-btn"...></button>
    #   <div class="level-content">
    #     {english text nodes}
    #     <div class="translation-toggle"...></div>
    #     <div class="translation-text"...></div>
    #   </div>
    # </div>
    
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

print("Successfully injected accurate full paragraphs into Test 1 answers.")
