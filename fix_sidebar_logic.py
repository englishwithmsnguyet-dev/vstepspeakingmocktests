import os

def generate_sidebar_html(active_test_num):
    html = """
    <!-- Sidebar Navigation -->
    <nav class="test-sidebar">
        <div class="sidebar-header">
            <i class="fa-solid fa-list-check"></i> <span>VSTEP MOCK TESTS</span>
        </div>
        <ul class="test-list">"""
    
    # We only want to show test 1 as universally unlocked.
    # But the CURRENT test must also appear unlocked and active so the user isn't confused.
    for i in range(1, 11):
        test_num = f"{i:02d}"
        
        is_active = (i == active_test_num)
        is_available = (i == 1) or is_active
        
        active_class = ' active' if is_active else ''
        locked_class = ' class="locked"' if not is_available else ''
        href = f'href="../test {i}/test{test_num}-index.html"' if is_available else 'href="javascript:void(0)"'
        icon = 'fa-solid fa-microphone-lines' if is_available else 'fa-solid fa-lock'
        
        html += f"""
            <li class="test-item{active_class}">
                <a {href}{locked_class}>
                    <span class="test-icon"><i class="{icon}"></i></span>
                    <span class="test-name">SPEAKING TEST {test_num}</span>
                </a>
            </li>"""
            
    html += """
        </ul>
    </nav>"""
    return html

tests_to_update = [
    (1, "test 1/test01-index.html"),
    (7, "test 7/test07-index.html"),
    (8, "test 8/test08-index.html")
]

for test_num, html_path in tests_to_update:
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        sidebar_start = html_content.find('<!-- Sidebar Navigation -->')
        sidebar_end = html_content.find('</nav>', sidebar_start) + 6
        
        if sidebar_start != -1 and sidebar_end > 5:
            new_sidebar_html = generate_sidebar_html(test_num)
            html_content = html_content[:sidebar_start] + new_sidebar_html.strip() + html_content[sidebar_end:]
            
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

print("Sidebar logic updated.")
