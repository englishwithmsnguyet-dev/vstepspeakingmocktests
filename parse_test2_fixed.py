import docx
import re

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
        runs_info = []
        for r in p.runs:
            # Check if run has text
            if not r.text:
                continue
            # Preserve spaces by not stripping!
            # But we must escape newlines or deal with them?
            r_text = r.text.replace("\n", " ")
            if not r_text.strip():
                # it's just spaces, we should still keep it if it's part of a sentence?
                # Actually, let's just append it as non-bold
                runs_info.append(f"[_|None] {r_text}")
                continue
                
            is_bold = r.bold
            color = r.font.color.rgb if r.font.color else None
            color_hex = str(color) if color else "None"
            runs_info.append(f"[{'B' if is_bold else '_'}|{color_hex}] {r_text}")
        
        lines.append(" | ".join(runs_info))

with open('test2_format.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("Extracted test 2 format fixed")
