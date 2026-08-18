import docx

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

in_test2 = False
in_answers = False
lines = []

for p in doc.paragraphs:
    text = p.text.strip()
    
    # We want the second occurrence of "SPEAKING MOCK TEST 02" which is the answers section
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
            if not r.text.strip():
                continue
            is_bold = r.bold
            color = r.font.color.rgb if r.font.color else None
            color_hex = str(color) if color else "None"
            runs_info.append(f"[{'B' if is_bold else '_'}|{color_hex}] {r.text.strip()}")
        
        lines.append(" | ".join(runs_info))

with open('test2_format.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("Extracted test 2 format")
