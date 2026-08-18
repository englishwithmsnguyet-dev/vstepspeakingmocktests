import os
import time

tests = [1, 7, 8]
v = int(time.time())

for t in tests:
    html_path = f"test {t}/test{t:02d}-index.html"
    css_path = f"test {t}/styles.css"
    
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        brand_html = """
                <span class="brand-icon"><i class="fa-solid fa-graduation-cap"></i></span>
                <span class="brand-text">Miss Nguyet – VSTEP</span>"""
                
        # Remove from brand-left
        if brand_html in html:
            html = html.replace(brand_html, "")
            
        # Add to sidebar if not there
        sidebar_brand = """
        <div class="sidebar-brand-bottom">
            <span class="brand-icon"><i class="fa-solid fa-graduation-cap"></i></span>
            <span class="brand-text">Miss Nguyet – VSTEP</span>
        </div>
    </nav>"""
        
        if '<div class="sidebar-brand-bottom">' not in html:
            html = html.replace('</ul>\n    </nav>', '</ul>\n' + sidebar_brand)
            
        # Cache buster update
        import re
        html = re.sub(r'href="styles\.css(\?v=\d+)?"', f'href="styles.css?v={v}"', html)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
            
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            
        if '.sidebar-brand-bottom {' not in css:
            css += """
.sidebar-brand-bottom {
    margin-top: auto;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-top: 1px dashed var(--border-color);
    background: #f8fafc;
}
.sidebar-brand-bottom .brand-icon {
    font-size: 20px;
    color: var(--color-violet);
}
.sidebar-brand-bottom .brand-text {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: var(--text-dark);
}
"""
        if '.test-list {\n    list-style: none;\n    padding: 16px 12px;\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    overflow-y: auto;\n}' in css:
            css = css.replace('.test-list {\n    list-style: none;\n    padding: 16px 12px;\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    overflow-y: auto;\n}', '.test-list {\n    list-style: none;\n    padding: 16px 12px;\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    overflow-y: auto;\n    flex: 1;\n    min-height: 0;\n}')
            
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css)

print(f"Brand moved to sidebar with cache buster v={v}")
