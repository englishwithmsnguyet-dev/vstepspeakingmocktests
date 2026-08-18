import docx

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

in_test1 = False
in_answers = False
for p in doc.paragraphs:
    text = p.text.strip()
    if text == 'SPEAKING MOCK TEST 01':
        in_test1 = True
        in_answers = True
    elif text == 'SPEAKING MOCK TEST 02':
        break
        
    if in_answers and 'Vâng, tôi có.' in text:
        print("Found in Test 1:", text)

