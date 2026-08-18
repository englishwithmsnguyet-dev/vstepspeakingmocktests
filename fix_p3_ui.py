import os
import re

tests = [1, 7, 8]

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    js_path = f"test {t}/app.js"
    
    # 1. Update HTML: ol.follow-up-list to ul.question-list with q-num
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        def replace_ol(match):
            inner_li = match.group(1)
            # Find all <li>...</li>
            li_items = re.findall(r'<li>(.*?)</li>', inner_li, re.DOTALL)
            
            new_ul = '<ul class="question-list">\n'
            for idx, text in enumerate(li_items):
                new_ul += f'                                <li><span class="q-num">{idx+1}</span> {text.strip()}</li>\n'
            new_ul += '                            </ul>'
            return new_ul
            
        html = re.sub(r'<ol class="follow-up-list">\s*(.*?)\s*</ol>', replace_ol, html, flags=re.DOTALL)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
            
    # 2. Update JS: Part 3 Button text
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            js = f.read()
            
        # Add TIẾP TỤC text and secondary class to enterPart3Prep
        target_prep = "elements.btnP3Next.style.display = 'inline-flex';"
        if "elements.btnP3Next.className = 'btn btn-secondary';" not in js:
            js = js.replace(target_prep, 
                target_prep + "\n    elements.btnP3Next.innerHTML = '<span>TIẾP TỤC</span> <i class=\"fa-solid fa-arrow-right\"></i>';\n    elements.btnP3Next.className = 'btn btn-secondary';")
                
        # Add success class to enterPart3Speaking
        target_speak = "elements.btnP3Next.innerHTML = '<span>Hoàn thành bài thi</span> <i class=\"fa-solid fa-circle-check\"></i>';"
        if "elements.btnP3Next.className = 'btn btn-success';" not in js:
            js = js.replace(target_speak, 
                target_speak + "\n    elements.btnP3Next.className = 'btn btn-success';")
                
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js)

print("Part 3 UI updated.")
