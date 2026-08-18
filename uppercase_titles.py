import os

css_addition = """
/* Uppercase Titles */
h1, h2, h3, h4, 
.brand-text, 
.step-label, 
.topic-title, 
.section-subtitle,
.topic-heading-red,
.part-header-tag {
    text-transform: uppercase !important;
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
            
        if '/* Uppercase Titles */' not in content:
            with open(css_path, 'a', encoding='utf-8') as f:
                f.write(css_addition)

print("Titles uppercased successfully.")
