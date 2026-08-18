from rebuild_vietnamese_newlines import norm_db, clean_text
import json

with open('docx_solutions_bold.json', 'r', encoding='utf-8') as f:
    docx_data = json.load(f)

t = 6
data = docx_data[f"test_{t:02d}"]
docx_answers = []
for topic, qs in data.get("part1", {}).items():
    for q, lvls in qs.items():
        docx_answers.append(lvls.get("b1", ""))
        docx_answers.append(lvls.get("b2", ""))
docx_answers.append("\n\n".join(data.get("part2", {}).get("b1", [])))
docx_answers.append("\n\n".join(data.get("part2", {}).get("b2", [])))
docx_answers.append("\n\n".join(data.get("part3", {}).get("b1", [])))
docx_answers.append("\n\n".join(data.get("part3", {}).get("b2", [])))
for q, lvls in data.get("part3", {}).get("followup", {}).items():
    docx_answers.append(lvls.get("b1", ""))
    docx_answers.append(lvls.get("b2", ""))
    
for ans in docx_answers:
    cleaned = clean_text(ans)
    val = norm_db.get(cleaned)
    if val:
        if "học" in val.lower() or "làm việc" in val.lower() or "tự" in val.lower():
            print(val)
