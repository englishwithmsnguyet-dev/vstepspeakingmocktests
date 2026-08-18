import re
import os

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
index_path = os.path.join(root_dir, 'index.html')

# 1. Update index.html
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_passwords = 'const TEST_PASSWORDS = { 1: "020896", 2: "241296", 3: "IWILLPASS", 4: "IWILLTRY", 5: "TRYMYBEST", 6: "ICANPASS", 7: "PASSTHEVSTEP", 8: "PASSB1B2", 9: "TRYTRYTRY", 10: "PASSPASS", 11: "ICANDOIT", 12: "NEVERGIVEUP", 13: "LUCKY", 14: "MOTIVATION", 15: "STUDYHARD", 16: "POSSIBLE", 17: "ENGLISHISEASY", 18: "VSTEPB1B2", 19: "VSTEPEXAM", 20: "PASSED" };'
new_passwords = 'const TEST_PASSWORDS = { 5: "TRYMYBEST", 6: "ICANPASS", 7: "PASSTHEVSTEP", 8: "PASSB1B2", 9: "TRYTRYTRY", 10: "PASSPASS", 11: "ICANDOIT", 12: "NEVERGIVEUP", 13: "LUCKY", 14: "MOTIVATION", 15: "STUDYHARD", 16: "POSSIBLE", 17: "ENGLISHISEASY", 18: "VSTEPB1B2", 19: "VSTEPEXAM", 20: "PASSED" };'

content = content.replace(old_passwords, new_passwords)

# Update isTestUnlocked in index.html
old_unlock_func = """        function isTestUnlocked(testId) {
            // Check storage for all tests (none are unlocked by default now)
            return sessionStorage.getItem('unlocked_test_' + testId) === 'true';
        }"""
new_unlock_func = """        function isTestUnlocked(testId) {
            if (!TEST_PASSWORDS[testId]) return true;
            return sessionStorage.getItem('unlocked_test_' + testId) === 'true';
        }"""
content = content.replace(old_unlock_func, new_unlock_func)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update app.js in all test directories
for i in range(1, 21):
    app_js_path = os.path.join(root_dir, f'test {i}', 'app.js')
    if os.path.exists(app_js_path):
        with open(app_js_path, 'r', encoding='utf-8') as f:
            app_content = f.read()
        
        app_content = app_content.replace(old_passwords, new_passwords)
        
        # update isUnlockedByDefault
        old_is_unlocked_by_default = 'const isUnlockedByDefault = false;'
        new_is_unlocked_by_default = 'const isUnlockedByDefault = !TEST_PASSWORDS[testId];'
        app_content = app_content.replace(old_is_unlocked_by_default, new_is_unlocked_by_default)
        
        with open(app_js_path, 'w', encoding='utf-8') as f:
            f.write(app_content)

print("Passwords for Test 1-4 removed successfully")
