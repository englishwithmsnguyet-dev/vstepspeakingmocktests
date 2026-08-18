import os

def generate_sidebar_html(active_test_num, is_homepage=False):
    home_href = "index.html" if is_homepage else "../index.html"
    active_home = ' active' if active_test_num == 0 else ''
    
    html = f"""
    <!-- Sidebar Navigation -->
    <nav class="test-sidebar">
        <div class="sidebar-header">
            <i class="fa-solid fa-list-check"></i> <span>VSTEP MOCK TESTS</span>
        </div>
        <ul class="test-list">
            <li class="test-item{active_home}">
                <a href="{home_href}">
                    <span class="test-icon"><i class="fa-solid fa-house"></i></span>
                    <span class="test-name">TRANG CHỦ</span>
                </a>
            </li>"""
            
    # All tests are password protected. No tests are unlocked by default in HTML.
    available_tests = set()
    
    for i in range(1, 21):
        test_num = f"{i:02d}"
        is_available = i in available_tests
        is_active = (i == active_test_num) and is_available
        
        active_class = ' active' if is_active else ''
        locked_class = ' class="locked"' if not is_available else ''
        
        if is_homepage:
            href = f'href="test {i}/test{test_num}-index.html"' if is_available else 'href="javascript:void(0)"'
        else:
            href = f'href="../test {i}/test{test_num}-index.html"' if is_available else 'href="javascript:void(0)"'
            
        icon = 'fa-solid fa-microphone-lines' if is_available else 'fa-solid fa-lock'
        
        html += f"""
            <li class="test-item{active_class}">
                <a {href}{locked_class} data-test-id="{i}">
                    <span class="test-icon"><i class="{icon}"></i></span>
                    <span class="test-name">SPEAKING TEST {test_num}</span>
                </a>
            </li>"""
            
    html += """
        </ul>
        <a href="https://www.facebook.com/nguyetpham28" target="_blank" class="sidebar-brand-bottom">
            <span class="brand-icon"><i class="fa-solid fa-graduation-cap"></i></span>
            <span class="brand-text">ENGLISH WITH MISS NGUYET</span>
        </a>
    </nav>"""
    return html

tests_to_update = [
    (20, "test 20/test20-index.html", "test 20/styles.css"),
    (19, "test 19/test19-index.html", "test 19/styles.css"),
    (18, "test 18/test18-index.html", "test 18/styles.css"),
    (17, "test 17/test17-index.html", "test 17/styles.css"),
    (16, "test 16/test16-index.html", "test 16/styles.css"),
    (15, "test 15/test15-index.html", "test 15/styles.css"),
    (14, "test 14/test14-index.html", "test 14/styles.css"),
    (13, "test 13/test13-index.html", "test 13/styles.css"),
    (12, "test 12/test12-index.html", "test 12/styles.css"),
    (11, "test 11/test11-index.html", "test 11/styles.css"),
    (10, "test 10/test10-index.html", "test 10/styles.css"),
    (9, "test 9/test09-index.html", "test 9/styles.css"),
    (6, "test 6/test06-index.html", "test 6/styles.css"),
    (5, "test 5/test05-index.html", "test 5/styles.css"),
    (1, "test 1/test01-index.html", "test 1/styles.css"),
    (3, "test 3/test03-index.html", "test 3/styles.css"),
    (4, "test 4/test04-index.html", "test 4/styles.css"),
    (2, "test 2/test02-index.html", "test 2/styles.css"),
    (7, "test 7/test07-index.html", "test 7/styles.css"),
    (8, "test 8/test08-index.html", "test 8/styles.css")
]

for test_num, html_path, css_path in tests_to_update:
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        # Replace existing sidebar
        sidebar_start = html_content.find('<!-- Sidebar Navigation -->')
        sidebar_end = html_content.find('</nav>', sidebar_start) + 6
        
        if sidebar_start != -1 and sidebar_end > 5:
            new_sidebar_html = generate_sidebar_html(test_num, is_homepage=False)
            html_content = html_content[:sidebar_start] + new_sidebar_html.strip() + html_content[sidebar_end:]
        else:
            new_sidebar_html = generate_sidebar_html(test_num, is_homepage=False)
            html_content = html_content.replace('<body>', '<body>\n' + new_sidebar_html)
            
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Updated sidebar in {html_path}")

    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
            
        if 'text-transform: uppercase;' not in css_content and '.test-item a {' in css_content:
            css_content = css_content.replace('border: 1px solid transparent;', 'border: 1px solid transparent;\n    text-transform: uppercase;')
            with open(css_path, 'w', encoding='utf-8') as f:
                f.write(css_content)

print("Sidebar generator updated and sidebars in files rebuilt successfully.")
