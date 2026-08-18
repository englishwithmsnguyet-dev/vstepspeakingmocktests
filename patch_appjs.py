import os
import glob
import re

workspace = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
js_files = glob.glob(os.path.join(workspace, 'test *', 'app.js'))

for filepath in js_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add sessionStorage.removeItem in checkPageLock
    old_else = """    } else {
        // Ensure page is shown if unlocked or doesn't require a password
        document.documentElement.style.display = '';"""
    
    new_else = """    } else {
        sessionStorage.removeItem('unlocked_test_' + testId);
        // Ensure page is shown if unlocked or doesn't require a password
        document.documentElement.style.display = '';"""
    
    content = content.replace(old_else, new_else)
    
    # 2. Remove sessionStorage.setItem in main handleUnlock
    # We need to be careful because there are two handleUnlock functions!
    # The first one is for injectLockUI, the second one is for showSidebarPasswordPrompt.
    # The first one has `overlay.style.opacity = '0';` directly after it.
    
    old_main_unlock = """        if (value === TEST_PASSWORDS[testId]) {
            sessionStorage.setItem('unlocked_test_' + testId, 'true');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                style.remove();"""
    
    new_main_unlock = """        if (value === TEST_PASSWORDS[testId]) {
            // sessionStorage.setItem('unlocked_test_' + testId, 'true'); // Removed to lock on refresh
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                style.remove();"""
                
    content = content.replace(old_main_unlock, new_main_unlock)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filepath}")

print("Done patching app.js.")
