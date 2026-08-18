import os

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'

short_str = 'const TEST_PASSWORDS = { 13: "LUCKY", 14: "MOTIVATION", 15: "STUDYHARD", 16: "POSSIBLE", 17: "ENGLISHISEASY", 18: "VSTEPB1B2", 19: "VSTEPEXAM", 20: "PASSED" };'
full_str = 'const TEST_PASSWORDS = { 1: "020896", 2: "241296", 3: "IWILLPASS", 4: "IWILLTRY", 5: "TRYMYBEST", 6: "ICANPASS", 7: "PASSTHEVSTEP", 8: "PASSB1B2", 9: "TRYTRYTRY", 10: "PASSPASS", 11: "ICANDOIT", 12: "NEVERGIVEUP", 13: "LUCKY", 14: "MOTIVATION", 15: "STUDYHARD", 16: "POSSIBLE", 17: "ENGLISHISEASY", 18: "VSTEPB1B2", 19: "VSTEPEXAM", 20: "PASSED" };'

count = 0
for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith('.html') or filename.endswith('.js'):
            filepath = os.path.join(dirpath, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if short_str in content:
                content = content.replace(short_str, full_str)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filepath}")
                count += 1

print(f"Updated {count} files.")
