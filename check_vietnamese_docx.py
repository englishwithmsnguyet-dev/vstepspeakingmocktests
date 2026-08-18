import docx

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

in_test = False
in_answers = False

for p in doc.paragraphs:
    text = p.text.strip()
    
    if text == 'SPEAKING MOCK TEST 03':
        in_test = True
        in_answers = True
    elif text == 'SPEAKING MOCK TEST 04':
        break
        
    if in_answers and 'hoạt động giải trí' in text.lower() or 'có một số bất lợi' in text.lower():
        print("Found vietnamese paragraph:", text)
        for r in p.runs:
            if r.text.strip():
                is_bold = r.bold
                color = r.font.color.rgb if r.font.color else None
                print(f"  - [{is_bold}|{color}] {r.text}")

