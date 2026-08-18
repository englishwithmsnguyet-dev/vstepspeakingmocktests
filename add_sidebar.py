import os

sidebar_css = """
/* -------------------------------------------------------------------------- */
/* Sidebar Styles */
:root {
    --sidebar-width: 260px;
}

body {
    padding-left: var(--sidebar-width);
}

.test-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: #ffffff;
    border-right: 1px solid var(--border-color);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 10px rgba(0,0,0,0.02);
}

.sidebar-header {
    height: var(--header-height);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px;
    border-bottom: 1px solid var(--border-color);
    font-weight: 800;
    font-size: 16px;
    color: var(--text-dark);
}

.sidebar-header i {
    color: var(--color-violet);
    font-size: 18px;
}

.test-list {
    list-style: none;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
}

/* Scrollbar styling for sidebar */
.test-list::-webkit-scrollbar {
    width: 6px;
}
.test-list::-webkit-scrollbar-track {
    background: transparent;
}
.test-list::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 4px;
}

.test-item a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.test-item a:hover:not(.locked) {
    background: #f8fafc;
    border-color: var(--border-color);
    transform: translateX(4px);
}

.test-item.active a {
    background: rgba(124, 58, 237, 0.08);
    color: var(--color-violet);
    border-color: rgba(124, 58, 237, 0.2);
}

.test-item a.locked {
    color: var(--text-muted);
    opacity: 0.6;
    cursor: default;
    background: #f8fafc;
    border: 1px dashed var(--border-color);
}

.test-icon {
    width: 24px;
    display: flex;
    justify-content: center;
    font-size: 16px;
}

.test-item.active .test-icon i {
    color: var(--color-violet);
}

.test-item a:not(.locked):not(.active) .test-icon i {
    color: var(--color-emerald);
}

.test-item a.locked .test-icon i {
    color: #94a3b8;
}

/* Adjust header to fill remaining space */
.app-header {
    width: calc(100% - var(--sidebar-width));
    left: var(--sidebar-width);
}
"""

def generate_sidebar_html(active_test_num):
    html = """
    <!-- Sidebar Navigation -->
    <nav class="test-sidebar">
        <div class="sidebar-header">
            <i class="fa-solid fa-list-check"></i> <span>VSTEP MOCK TESTS</span>
        </div>
        <ul class="test-list">"""
    
    available_tests = {1, 7, 8}
    
    for i in range(1, 11):
        test_num = f"{i:02d}"
        is_active = (i == active_test_num)
        is_available = i in available_tests
        
        active_class = ' active' if is_active else ''
        locked_class = ' class="locked"' if not is_available else ''
        href = f'href="../test {i}/test{test_num}-index.html"' if is_available else 'href="javascript:void(0)"'
        icon = 'fa-solid fa-microphone-lines' if is_available else 'fa-solid fa-lock'
        
        html += f"""
            <li class="test-item{active_class}">
                <a {href}{locked_class}>
                    <span class="test-icon"><i class="{icon}"></i></span>
                    <span class="test-name">Speaking Test {test_num}</span>
                </a>
            </li>"""
            
    html += """
        </ul>
    </nav>
    """
    return html

tests_to_update = [
    (1, "test 1/test01-index.html", "test 1/styles.css"),
    (7, "test 7/test07-index.html", "test 7/styles.css"),
    (8, "test 8/test08-index.html", "test 8/styles.css")
]

for test_num, html_path, css_path in tests_to_update:
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        if '<nav class="test-sidebar">' not in html_content:
            sidebar_html = generate_sidebar_html(test_num)
            html_content = html_content.replace('<body>', '<body>\n' + sidebar_html)
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
                
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
            
        if '--sidebar-width' not in css_content:
            with open(css_path, 'a', encoding='utf-8') as f:
                f.write(sidebar_css)

print("Sidebar added successfully.")
