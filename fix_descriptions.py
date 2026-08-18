import os
import re

tests_to_update = [
    (1, "test 1/test01-index.html", "test 1/styles.css"),
    (7, "test 7/test07-index.html", "test 7/styles.css"),
    (8, "test 8/test08-index.html", "test 8/styles.css")
]

for test_num, html_path, css_path in tests_to_update:
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # Update Badges
        html_content = html_content.replace('<span class="part-badge">Part 1</span>', '<span class="part-badge">PART 01</span>')
        html_content = html_content.replace('<span class="part-badge">Part 2</span>', '<span class="part-badge">PART 02</span>')
        html_content = html_content.replace('<span class="part-badge">Part 3</span>', '<span class="part-badge">PART 03</span>')
        
        # Replace descriptions using regex
        # Part 1
        html_content = re.sub(
            r'(<h4>Social Interaction</h4>\s*)<p>.*?</p>',
            r'\1<p>Thí sinh trả lời 02 chủ đề bất kì, mỗi chủ đề có 03 câu hỏi. Không có thời gian chuẩn bị.</p>',
            html_content,
            flags=re.DOTALL
        )
        
        # Part 2
        html_content = re.sub(
            r'(<h4>Solution Discussion</h4>\s*)<p>.*?</p>',
            r'\1<p>Thí sinh thảo luận phương án tốt nhất cho một tình huống giả định bất kì với 03 sự lựa chọn. Có một phút chuẩn bị.</p>',
            html_content,
            flags=re.DOTALL
        )
        
        # Part 3
        html_content = re.sub(
            r'(<h4>Topic Development</h4>\s*)<p>.*?</p>',
            r'\1<p>Thí sinh phát triển một chủ đề bất kì dựa vào sơ đồ gợi ý và 03 câu hỏi mở rộng. Có một phút chuẩn bị.</p>',
            html_content,
            flags=re.DOTALL
        )

        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()

        # Ensure .part-badge has white-space: nowrap;
        if 'white-space: nowrap;' not in css_content and '.part-badge {' in css_content:
            css_content = css_content.replace('.part-badge {\n    background: var(--color-violet);', '.part-badge {\n    background: var(--color-violet);\n    white-space: nowrap;')
            with open(css_path, 'w', encoding='utf-8') as f:
                f.write(css_content)
        # Just in case the format above doesn't match perfectly, append to the end of the file.
        elif 'white-space: nowrap' not in css_content:
            with open(css_path, 'a', encoding='utf-8') as f:
                f.write('\n.part-badge { white-space: nowrap !important; }\n')

print("Descriptions and badges updated.")
