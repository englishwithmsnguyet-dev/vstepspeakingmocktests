import docx
import re

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

in_test = False
in_answers = False
lines = []

for p in doc.paragraphs:
    text = p.text.strip()
    
    if text == 'SPEAKING MOCK TEST 05':
        if not in_test:
            in_test = True
        else:
            in_answers = True
    elif text == 'SPEAKING MOCK TEST 06':
        break
        
    if in_answers and text:
        runs_info = []
        for r in p.runs:
            if not r.text:
                continue
            r_text = r.text.replace("\n", " ")
            if not r_text.strip():
                runs_info.append(f"[_|None] {r_text}")
                continue
                
            is_bold = r.bold
            color = r.font.color.rgb if r.font.color else None
            color_hex = str(color) if color else "None"
            runs_info.append(f"[{'B' if is_bold else '_'}|{color_hex}] {r_text}")
        
        lines.append(" | ".join(runs_info))

with open('test5_format.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("Extracted test 5 format")
