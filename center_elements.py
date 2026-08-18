import os

tests = [1, 7, 8]

for t in tests:
    css_path = f"test {t}/styles.css"
    html_path = f"test {t}/test{t:02d}-index.html"
    
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            
        # 1. Fix app-header so header-title-wrapper is perfectly centered
        if '.app-header {\n    height: var(--header-height);\n    background: #ffffff;\n    border-bottom: 1px solid var(--border-color);\n    display: grid;\n    grid-template-columns: 1fr 2fr 1fr;\n    align-items: center;' in css:
            css = css.replace('display: grid;\n    grid-template-columns: 1fr 2fr 1fr;', 'display: flex;\n    justify-content: space-between;')
            
        if '.header-title-wrapper {\n    display: flex;\n    justify-content: center;\n}' in css:
            css = css.replace('.header-title-wrapper {\n    display: flex;\n    justify-content: center;\n}', '.header-title-wrapper {\n    position: absolute;\n    left: 50%;\n    transform: translateX(-50%);\n    display: flex;\n    justify-content: center;\n}')
            
        # 2. Add text-align center for welcome header parts
        if '.welcome-header-center { text-align: center; }' not in css:
            css += "\n.welcome-header-center { text-align: center; margin-bottom: 30px; }\n"
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)
            
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        # Wrap the welcome badge, h1, and desc in a centered div
        if '<div class="welcome-header-center">' not in html:
            start_target = '<div class="welcome-badge">'
            end_target = '</p>'
            
            # Find the exact block to wrap
            import re
            pattern = re.compile(r'(<div class="welcome-badge">[\s\S]*?<p class="welcome-desc">[\s\S]*?</p>)')
            
            def replacer(match):
                return '<div class="welcome-header-center">\n                        ' + match.group(1).replace('\n', '\n    ') + '\n                    </div>'
                
            html = pattern.sub(replacer, html)
            
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html)

print("Centering applied.")
