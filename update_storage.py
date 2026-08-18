import os
import glob

workspace = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
files = glob.glob(os.path.join(workspace, '**', '*.html'), recursive=True)
files += glob.glob(os.path.join(workspace, '**', '*.js'), recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace localStorage with sessionStorage for unlocked_test_
    new_content = content.replace("localStorage.getItem('unlocked_test_'", "sessionStorage.getItem('unlocked_test_'")
    new_content = new_content.replace('localStorage.getItem("unlocked_test_"', 'sessionStorage.getItem("unlocked_test_"')
    new_content = new_content.replace("localStorage.setItem('unlocked_test_'", "sessionStorage.setItem('unlocked_test_'")
    new_content = new_content.replace('localStorage.setItem("unlocked_test_"', 'sessionStorage.setItem("unlocked_test_"')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

print("Done updating storage.")
