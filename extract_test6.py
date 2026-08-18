import docx

doc = docx.Document('SPEAKING MOCK TESTS - BÀI GIẢI.docx')

output_lines = []
printing = False

for p in doc.paragraphs:
    text = p.text.strip()
    if 'SPEAKING MOCK TEST 06' in text and not printing:
        printing = True
    if 'SPEAKING MOCK TEST 07' in text:
        break
        
    if printing and text:
        line_parts = []
        for run in p.runs:
            run_text = run.text
            if not run_text:
                continue
                
            # determine if bold
            is_bold = run.bold or (run.style and run.style.font.bold)
            color = 'None'
            
            if is_bold and run.font and run.font.color and run.font.color.rgb:
                color = str(run.font.color.rgb)
                
            symbol = 'B' if is_bold else '_'
            line_parts.append(f"[{symbol}|{color}] {run_text}")
            
        output_lines.append(" | ".join(line_parts))

with open('test6_format.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(output_lines))

print("Extraction complete.")
