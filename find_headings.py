import docx
doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')
for p in doc.paragraphs:
    text = p.text.strip()
    if 'SPEAKING MOCK TEST' in text:
        print(repr(text))
