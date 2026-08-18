import json
from rebuild_vietnamese_newlines import clean_text

with open('docx_solutions_bold.json', 'r', encoding='utf-8') as f:
    docx_data = json.load(f)

def search_test(test_num, missing_vi):
    data = docx_data[f"test_{test_num:02d}"]
    print(f"--- Test {test_num} ---")
    
    # We want to find sentences containing words from missing_vi, but since missing_vi is what we guessed, it's wrong.
    # Instead, let's print ALL English bold terms and their translated Vietnamese sentences in that test.
    # But that's too much. Let's just dump ALL Vietnamese sentences from the JSON.
    sentences = []
    def add_ans(ans):
        # The ans here has English. But wait, in docx_solutions_bold.json, we only have English! 
        # The Vietnamese is in norm_db. Wait, the JSON in docx_solutions_bold.json only has English?
        # Let's check!
        pass
    
    # Wait, docx_solutions_bold.json has BOTH English and Vietnamese if I remember correctly?
    # No, it's just English answers. The Vietnamese translation is in the HTML? No, it's injected from another file.
    # Ah! 'apply_solution_updates' uses Google Translate or something? No, it uses 'extracted_answers_full.txt' or something.
    pass

with open('scratch/verify_clean.py', 'r') as f:
    verify_script = f.read()

# Let's just dump the sentences list for Test 6, 9, 10
