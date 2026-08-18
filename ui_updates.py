import os
import re

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    css_path = f"test {t}/styles.css"
    js_path = f"test {t}/app.js"
    
    # 1. Update HTML
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Remove Vietnamese from part-header-tag
        html = html.replace('[GIAO TIẾP XÃ HỘI]</div>', '</div>')
        html = html.replace('[THẢO LUẬN GIẢI PHÁP]</div>', '</div>')
        html = html.replace('[PHÁT TRIỂN CHỦ ĐỀ]</div>', '</div>')
        
        # Topic Title "Let's talk about street food:" -> "Let's talk about <strong>street food</strong>:"
        # Note: the user's test 1 has "street food" and "coffee shops". Test 7 has "phone calls" and "clothes".
        # Regex to find "Let's talk about XXX:"
        # Only modify if it doesn't already have strong
        html = re.sub(r"Let's talk about (?!<strong>)(.*?):", r"Let's talk about <strong style='text-transform: uppercase;'>\1</strong>:", html)
        
        # Wait, the user said "Không in hoa toàn bộ, in đậm tên chủ đề" (Do not uppercase entirely, bold the topic name).
        # Should the topic name itself be uppercase? If they say "Không in hoa toàn bộ", they mean the whole sentence shouldn't be uppercase. 
        # But should "street food" be uppercase? Usually "Let's talk about **STREET FOOD**:".
        # Let's just bold it: "Let's talk about <strong>\1</strong>:" and let them be as they are typed.
        # Actually I'll use <strong>\1</strong>. If it needs uppercase, CSS can do it, but I'll just leave it bold.
        # Let's fix the regex again:
        html = re.sub(r"Let's talk about (?!<strong>)(.*?):", r"Let's talk about <strong>\1</strong>:", html)
        
        # Update recording text
        html = html.replace('ĐANG GHI ÂM (SPEAKING)', 'Hệ thống đang ghi âm bài nói của bạn')
        
        # Update button text
        html = html.replace('<span>Chuyển sang Part 2</span>', '<span>TIẾP TỤC</span>')
        html = html.replace('<span>Chuyển sang Part 3</span>', '<span>TIẾP TỤC</span>')
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
            
    # 2. Update CSS
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            
        # Remove .topic-title from uppercase
        css = re.sub(r'\s*\.topic-title,', '', css)
        
        # Make part-header-tag larger
        if 'font-size: 16px !important;' not in css:
            css += "\n.part-header-tag { font-size: 16px !important; }\n"
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)
            
    # 3. Update JS
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            js = f.read()
            
        js = js.replace('ĐANG GHI ÂM (SPEAKING)', 'Hệ thống đang ghi âm bài nói của bạn')
        js = js.replace('<span>Chuyển sang Part 3</span>', '<span>TIẾP TỤC</span>')
        
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js)

print("UI updates complete.")
