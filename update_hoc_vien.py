import os

files_to_update = [
    "test 1/test01-index.html",
    "test 1/app.js",
    "test 7/test07-index.html",
    "test 7/app.js",
    "test 8/test08-index.html",
    "test 8/app.js"
]

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Perform case-sensitive replacements
        content = content.replace('Học sinh', 'Học viên')
        content = content.replace('học sinh', 'học viên')

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

print("Hoc sinh changed to Hoc vien.")
