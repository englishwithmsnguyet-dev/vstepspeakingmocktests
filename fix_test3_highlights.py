import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 3/test03-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

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
prev_html = ""
while html != prev_html:
    prev_html = html
    html = pattern_space.sub(merge_strong_space, html)

pattern_nospace = re.compile(r'<strong(?: (style="[^"]+"))?>([^<]*)</strong><strong(?: (style="[^"]+"))?>([^<]*)</strong>')
prev_html = ""
while html != prev_html:
    prev_html = html
    html = pattern_nospace.sub(merge_strong_nospace, html)

def color_vietnamese(match):
    trans_content = match.group(1)
    trans_content = trans_content.replace('<strong>', '<strong style="color: #00b0f0;">')
    trans_content = trans_content.replace('<strong style="color: #00b0f0;">bất lợi</strong>', '<strong style="color: #ee0000;">bất lợi</strong>')
    trans_content = trans_content.replace('<strong style="color: #00b0f0;">nuôi giữ động vật trong vườn thú</strong>', '<strong style="color: #ee0000;">nuôi giữ động vật trong vườn thú</strong>')
    return f'<div class="translation-text" style="display: none; white-space: pre-line;">{trans_content}</div>'

html = re.sub(r'<div class="translation-text" style="display: none; white-space: pre-line;">(.*?)</div>', color_vietnamese, html, flags=re.DOTALL)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed English spacing and Vietnamese colors in test 3")
