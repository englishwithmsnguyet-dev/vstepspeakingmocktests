import os

css_addition = """
/* Fix text wrapping in time badges */
.time-badge {
    white-space: nowrap !important;
    flex-shrink: 0 !important;
}
"""

tests_to_update = [
    "test 1/styles.css",
    "test 7/styles.css",
    "test 8/styles.css"
]

for css_path in tests_to_update:
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if '/* Fix text wrapping in time badges */' not in content:
            with open(css_path, 'a', encoding='utf-8') as f:
                f.write(css_addition)

print("time-badge CSS fixed.")
