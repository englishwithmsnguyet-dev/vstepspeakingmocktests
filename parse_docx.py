import docx
from docx.shared import RGBColor

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

in_test1 = False
in_answers = False

for p in doc.paragraphs:
    text = p.text.strip()
    if text == 'SPEAKING MOCK TEST 01':
        if not in_test1:
            in_test1 = True
        else:
            in_answers = True
    elif text == 'SPEAKING MOCK TEST 02':
        break
        
    if in_answers and text:
        runs_info = []
        for r in p.runs:
            if not r.text.strip():
                continue
            is_bold = r.bold
            color = r.font.color.rgb if r.font.color else None
            color_hex = str(color) if color else "None"
            runs_info.append(f"[{'B' if is_bold else '_'}|{color_hex}] {r.text.strip()}")
        
        print(" | ".join(runs_info))
