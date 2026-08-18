import docx

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

in_test2 = False
in_answers = False
lines = []

for p in doc.paragraphs:
    text = p.text.strip()
    if text == 'SPEAKING MOCK TEST 02':
        if not in_test2:
            in_test2 = True
        else:
            in_answers = True
    elif text == 'SPEAKING MOCK TEST 03':
        break
        
    if in_answers and text:
        lines.append(text)

with open('test2_dump.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("Dumped test 2 text")
