import os

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
index_path = os.path.join(root_dir, 'index.html')

old_passwords = 'const TEST_PASSWORDS = { 5: "TRYMYBEST", 6: "ICANPASS", 7: "PASSTHEVSTEP", 8: "PASSB1B2", 9: "TRYTRYTRY", 10: "PASSPASS", 11: "ICANDOIT", 12: "NEVERGIVEUP", 13: "LUCKY", 14: "MOTIVATION", 15: "STUDYHARD", 16: "POSSIBLE", 17: "ENGLISHISEASY", 18: "VSTEPB1B2", 19: "VSTEPEXAM", 20: "PASSED" };'
new_passwords = 'const TEST_PASSWORDS = { 1: "IWILLPASS", 5: "TRYMYBEST", 6: "ICANPASS", 7: "PASSTHEVSTEP", 8: "PASSB1B2", 9: "TRYTRYTRY", 10: "PASSPASS", 11: "ICANDOIT", 12: "NEVERGIVEUP", 13: "LUCKY", 14: "MOTIVATION", 15: "STUDYHARD", 16: "POSSIBLE", 17: "ENGLISHISEASY", 18: "VSTEPB1B2", 19: "VSTEPEXAM", 20: "PASSED" };'

# 1. Update index.html
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(old_passwords, new_passwords)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update app.js in all test directories
for i in range(1, 21):
    app_js_path = os.path.join(root_dir, f'test {i}', 'app.js')
    if os.path.exists(app_js_path):
        with open(app_js_path, 'r', encoding='utf-8') as f:
            app_content = f.read()
        
        app_content = app_content.replace(old_passwords, new_passwords)
        
        with open(app_js_path, 'w', encoding='utf-8') as f:
            f.write(app_content)

print("Password for Test 01 added successfully")
