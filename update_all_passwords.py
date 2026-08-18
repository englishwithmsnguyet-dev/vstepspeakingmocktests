import os
import glob
import re

workspace = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
files = glob.glob(os.path.join(workspace, '**', '*.html'), recursive=True)
files += glob.glob(os.path.join(workspace, '**', '*.js'), recursive=True)

new_inline = 'const TEST_PASSWORDS = { 1: "020896", 2: "241296", 3: "IWILLPASS", 4: "IWILLTRY", 5: "TRYMYBEST", 6: "ICANPASS", 7: "PASSTHEVSTEP", 8: "PASSB1B2", 9: "TRYTRYTRY", 10: "PASSPASS", 11: "ICANDOIT", 12: "NEVERGIVEUP", 13: "LUCKY", 14: "MOTIVATION", 15: "STUDYHARD", 16: "POSSIBLE", 17: "ENGLISHISEASY", 18: "VSTEPB1B2", 19: "VSTEPEXAM", 20: "PASSED" };'

new_multiline = """const TEST_PASSWORDS = {
    1: "020896",
    2: "241296",
    3: "IWILLPASS",
    4: "IWILLTRY",
    5: "TRYMYBEST",
    6: "ICANPASS",
    7: "PASSTHEVSTEP",
    8: "PASSB1B2",
    9: "TRYTRYTRY",
    10: "PASSPASS",
    11: "ICANDOIT",
    12: "NEVERGIVEUP",
    13: "LUCKY",
    14: "MOTIVATION",
    15: "STUDYHARD",
    16: "POSSIBLE",
    17: "ENGLISHISEASY",
    18: "VSTEPB1B2",
    19: "VSTEPEXAM",
    20: "PASSED"
};"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Replace inline (html files usually)
    content = re.sub(r'const TEST_PASSWORDS = \{[^\}]+\};', new_inline, content, flags=re.MULTILINE)
    
    # Replace multiline (app.js usually) if inline didn't match
    if content == original:
        content = re.sub(r'const TEST_PASSWORDS = \{[^}]+\};', new_multiline, content, flags=re.MULTILINE|re.DOTALL)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

print("Done updating all passwords.")
