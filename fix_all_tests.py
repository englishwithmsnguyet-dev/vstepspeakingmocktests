import re
import os

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'

def merge_strong_space(match):
    style1 = match.group(1) or ""
    text1 = match.group(2)
    space = match.group(3)
    style2 = match.group(4) or ""
    text2 = match.group(5)
    if style1 == style2:
        if style1:
            return f'<strong {style1}>{text1}{space}{text2}</strong>'
        else:
            return f'<strong>{text1}{space}{text2}</strong>'
    return match.group(0)

def merge_strong_nospace(match):
    style1 = match.group(1) or ""
    text1 = match.group(2)
    style2 = match.group(3) or ""
    text2 = match.group(4)
    if style1 == style2:
        if style1:
            return f'<strong {style1}>{text1}{text2}</strong>'
        else:
            return f'<strong>{text1}{text2}</strong>'
    return match.group(0)

pattern_space = re.compile(r'<strong(?: (style="[^"]+"))?>([^<]*)</strong>(\s+)<strong(?: (style="[^"]+"))?>([^<]*)</strong>')
pattern_nospace = re.compile(r'<strong(?: (style="[^"]+"))?>([^<]*)</strong><strong(?: (style="[^"]+"))?>([^<]*)</strong>')

red_keywords = [
    "lợi ích",
    "bất lợi",
    "việc ăn trưa ở căn tin trường",
    "việc ăn trưa tại căn tin trường",
    "sống một mình đối với sinh viên",
    "việc sống một mình đối với sinh viên",
    "nuôi giữ động vật trong vườn thú"
]

def color_vietnamese(match):
    trans_content = match.group(1)
    trans_content = trans_content.replace('<strong>', '<strong style="color: #00b0f0;">')
    
    # Fix the red ones
    for kw in red_keywords:
        trans_content = trans_content.replace(f'<strong style="color: #00b0f0;">{kw}</strong>', f'<strong style="color: #ee0000;">{kw}</strong>')
        # What if it's "lợi ích của việc sống một mình đối với sinh viên"?
        # It's better to just replace the whole phrase if it exists
        trans_content = trans_content.replace(f'<strong style="color: #00b0f0;">{kw} ', f'<strong style="color: #ee0000;">{kw} ')
        
    return f'<div class="translation-text" style="display: none; white-space: pre-line;">{trans_content}</div>'

for i in range(1, 4):
    html_path = os.path.join(root_dir, f'test {i}', f'test0{i}-index.html')
    if not os.path.exists(html_path):
        continue
        
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # 1. Merge discontinuous highlights
    prev_html = ""
    while html != prev_html:
        prev_html = html
        html = pattern_space.sub(merge_strong_space, html)
        
    prev_html = ""
    while html != prev_html:
        prev_html = html
        html = pattern_nospace.sub(merge_strong_nospace, html)
        
    # 2. Color Vietnamese
    html = re.sub(r'<div class="translation-text" style="display: none; white-space: pre-line;">(.*?)</div>', color_vietnamese, html, flags=re.DOTALL)
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"Fixed test {i}")

print("All tests fixed")
