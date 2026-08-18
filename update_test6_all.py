import re
from bs4 import BeautifulSoup

format_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test6_format.txt'
html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 6/test06-index.html'

with open(format_path, 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f if line.strip()]

# Parse items from format
items = []
current_item = []

for line in lines:
    if line.startswith('[B|None] B1 LEVEL') or line.startswith('[B|None] B2 LEVEL'):
        if current_item:
            items.append(current_item)
            current_item = []
        continue
    
    if '|' in line and ('[_|None]' in line or '[B|' in line):
        # Determine if it's text line inside B1/B2
        text_line = line
        
        # Correctly strip the markup to get plain text
        plain_text = re.sub(r'\[[B_]\|([0-9A-F]+|None)\]\s*', '', line).strip()
        
        if plain_text.startswith('PART') or plain_text.startswith('SITUATION') or plain_text.startswith('TOPIC'):
            continue
        if plain_text.startswith('Let\'s talk') or plain_text.startswith('1.') or plain_text.startswith('2.') or plain_text.startswith('3.'):
            continue
        if plain_text == 'SPEAKING MOCK TEST 06' or plain_text.startswith('Follow-up questions') or plain_text.startswith('There are several reasons why responsibility is important.'):
            # Wait, "There are several reasons why responsibility is important." is the topic, it shouldn't be inside B1/B2
            continue
        
        if '[B|' in line or '[_|' in line:
            current_item.append(line)

if current_item:
    items.append(current_item)

# Convert to HTML
def format_item(item_lines):
    html_lines = []
    for line in item_lines:
        line = line.replace(' | ', '')
        matches = re.findall(r'\[([B_])\|([0-9A-F]+|None)\]\s*([^\[]+)', line)
        html_line = ""
        for is_bold, color, text in matches:
            text = text.strip('\n')
            if not text:
                continue
            if is_bold == 'B':
                if color != 'None':
                    html_line += f'<strong style="color: #{color.lower()};">{text}</strong>'
                else:
                    html_line += f'<strong>{text}</strong>'
            else:
                html_line += text
        if html_line.strip():
            html_lines.append(html_line.strip())
            
    if len(html_lines) > 1:
        return "<br/><br/>".join(html_lines)
    elif len(html_lines) == 1:
        return html_lines[0]
    return ""

parsed_html_items = [format_item(item) for item in items]

# Merge broken tags
for i in range(len(parsed_html_items)):
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #00b0f0;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #00b0f0;">', ' ')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #ee0000;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #ee0000;">', ' ')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #70ad47;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #70ad47;">', ' ')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #7030a0;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #7030a0;">', ' ')

print(f"Found {len(parsed_html_items)} items")
for i, item in enumerate(parsed_html_items):
    print(f"[{i+1}] {item[:50]}...")

with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    if i >= len(parsed_html_items):
        break
        
    translation_toggle = lc.find('div', class_='translation-toggle')
    translation_text = lc.find('div', class_='translation-text')
    tts_btn = lc.find('button', class_='tts-btn')
    
    lc.clear()
    
    if '<br/>' in parsed_html_items[i]:
        lc['style'] = "white-space: pre-line;"
    else:
        if 'style' in lc.attrs:
            del lc['style']
            
    parsed_eng = BeautifulSoup(parsed_html_items[i], 'html.parser')
    lc.append(parsed_eng)
    
    if tts_btn:
        lc.append(tts_btn)
    if translation_toggle:
        lc.append(translation_toggle)
    if translation_text:
        lc.append(translation_text)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(str(soup).replace('\\"', '"'))

print("Updated HTML!")
