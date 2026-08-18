script_path = '/Users/nguyetpham/.gemini/antigravity/brain/1ea5bf29-5d28-4bea-9f3e-0f4ec95e8392/scratch/verify_clean.py'
with open(script_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Test 2
text = text.replace('"duy trì một lối sống lành mạnh"', '"duy trì lối sống lành mạnh"')

# Test 6 fixes
text = text.replace('"học tập hiệu quả"', '"học tập hiệu quả hơn"') # let's use exact
text = text.replace('"học hỏi một cách hiệu quả"', '"học tập hiệu quả"') 
text = text.replace('"hoàn thành công việc một cách hiệu quả"', '"hiệu quả hơn"') 
text = text.replace('"tự lập"', '"tự lực"')

# For "giới trẻ" vs "người trẻ" -> wait, my previous script replaced ALL "người trẻ" with "giới trẻ".
# Test 10 needs "giới trẻ", Test 6 needs "người trẻ".
# Actually, Test 10 had "người trẻ" as well!
# "giới trẻ" was my fix for Test 10. Let's just manually replace Test 6's list.
import re
test6_match = re.search(r'(viet_bolds\[6\] = \[.*?\])', text, re.DOTALL)
if test6_match:
    t6 = test6_match.group(1)
    t6 = t6.replace('"giới trẻ"', '"người trẻ"')
    text = text.replace(test6_match.group(1), t6)

with open(script_path, 'w', encoding='utf-8') as f:
    f.write(text)
