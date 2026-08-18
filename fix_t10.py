import re
script_path = '/Users/nguyetpham/.gemini/antigravity/brain/1ea5bf29-5d28-4bea-9f3e-0f4ec95e8392/scratch/verify_clean.py'
with open(script_path, 'r', encoding='utf-8') as f:
    text = f.read()

test10_match = re.search(r'(viet_bolds\[10\] = \[.*?\])', text, re.DOTALL)
if test10_match:
    t10 = test10_match.group(1)
    t10 = t10.replace('"duy trì lối sống lành mạnh"', '"duy trì một lối sống lành mạnh"')
    text = text.replace(test10_match.group(1), t10)

with open(script_path, 'w', encoding='utf-8') as f:
    f.write(text)
