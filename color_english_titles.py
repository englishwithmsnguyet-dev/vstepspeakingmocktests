import os

tests_to_update = [
    "test 1/test01-index.html",
    "test 7/test07-index.html",
    "test 8/test08-index.html"
]

replacements = {
    '<h4>Social Interaction [Giao tiếp xã hội]</h4>': '<h4><span style="color: var(--color-red);">Social Interaction</span> [Giao tiếp xã hội]</h4>',
    '<h4>Solution Discussion [Thảo luận giải pháp]</h4>': '<h4><span style="color: var(--color-red);">Solution Discussion</span> [Thảo luận giải pháp]</h4>',
    '<h4>Topic Development [Phát triển chủ đề]</h4>': '<h4><span style="color: var(--color-red);">Topic Development</span> [Phát triển chủ đề]</h4>',
    '<div class="part-header-tag">PART 01: SOCIAL INTERACTION [GIAO TIẾP XÃ HỘI]</div>': '<div class="part-header-tag">PART 01: <span style="color: var(--color-red);">SOCIAL INTERACTION</span> [GIAO TIẾP XÃ HỘI]</div>',
    '<div class="part-header-tag">PART 02: SOLUTION DISCUSSION [THẢO LUẬN GIẢI PHÁP]</div>': '<div class="part-header-tag">PART 02: <span style="color: var(--color-red);">SOLUTION DISCUSSION</span> [THẢO LUẬN GIẢI PHÁP]</div>',
    '<div class="part-header-tag">PART 03: TOPIC DEVELOPMENT [PHÁT TRIỂN CHỦ ĐỀ]</div>': '<div class="part-header-tag">PART 03: <span style="color: var(--color-red);">TOPIC DEVELOPMENT</span> [PHÁT TRIỂN CHỦ ĐỀ]</div>'
}

for html_path in tests_to_update:
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        for old_str, new_str in replacements.items():
            html_content = html_content.replace(old_str, new_str)

        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

print("English titles colored red.")
