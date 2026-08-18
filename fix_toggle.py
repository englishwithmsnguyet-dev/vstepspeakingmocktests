import os

script_to_add = """<script>
  function toggleTranslation(element) {
   const textNode = element.nextElementSibling;
   const icon = element.querySelector('i');
   if (textNode.style.display === 'none') {
    textNode.style.display = 'block';
    if (icon) icon.className = 'fa-solid fa-chevron-up';
   } else {
    textNode.style.display = 'none';
    if (icon) icon.className = 'fa-solid fa-chevron-down';
   }
  }
</script>
"""

files_to_fix = [
    '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 11/test11-index.html',
    '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 12/test12-index.html'
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "function toggleTranslation(element)" not in content:
        content = content.replace("</body>", script_to_add + "</body>")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file_path}")
    else:
        print(f"Already fixed {file_path}")
