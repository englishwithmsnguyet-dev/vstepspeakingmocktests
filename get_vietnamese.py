import docx

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

in_test2 = False
in_answers = False
for p in doc.paragraphs:
    text = p.text.strip()
    if text == 'SPEAKING MOCK TEST 02':
        if not in_test2:
            in_test2 = True
        else:
            in_answers = True
    elif text == 'SPEAKING MOCK TEST 03':
        break
        
    if in_answers and 'thời gian rảnh' in text.lower():
        print(text)

