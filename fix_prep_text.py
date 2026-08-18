import os
import re

tests = [1, 7, 8]

for t in tests:
    js_path = f"test {t}/app.js"
    css_path = f"test {t}/styles.css"
    
    # Update JS
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            js = f.read()
            
        # Replace innerText with innerHTML for prep text
        js = js.replace(
            "elements.p2StatusText.innerText = 'Thời gian chuẩn bị. Hệ thống sẽ không ghi âm.';",
            "elements.p2StatusText.innerHTML = 'Thời gian chuẩn bị.<br>Hệ thống sẽ không ghi âm.';\n    elements.p2StatusText.style.textAlign = 'left';"
        )
        js = js.replace(
            "elements.p3StatusText.innerText = 'Thời gian chuẩn bị. Hệ thống sẽ không ghi âm.';",
            "elements.p3StatusText.innerHTML = 'Thời gian chuẩn bị.<br>Hệ thống sẽ không ghi âm.';\n    elements.p3StatusText.style.textAlign = 'left';"
        )
        
        # We should use text-align: left or center?
        # User requested "canh giữa" (center aligned)
        js = js.replace(
            "elements.p2StatusText.style.textAlign = 'left';",
            "elements.p2StatusText.style.textAlign = 'center';"
        )
        js = js.replace(
            "elements.p3StatusText.style.textAlign = 'left';",
            "elements.p3StatusText.style.textAlign = 'center';"
        )
        
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js)
            
    # Update CSS
    if os.path.exists(css_path):
        with open(css_path, 'a', encoding='utf-8') as f:
            f.write('\n.status-text { text-align: center; line-height: 1.4; }\n')

print("Prep text updated.")
