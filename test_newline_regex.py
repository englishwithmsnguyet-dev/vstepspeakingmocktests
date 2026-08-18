import re

text = "recommend a library. First of all, a library is usually quiet... <br/><br/> Secondly, it has...<br><br> As for... . Tóm lại,"

replacements = {
    "First of all,": "<br/><br/>First of all,",
    "Secondly,": "<br/><br/>Secondly,",
    "As for": "<br/><br/>As for",
    "Tóm lại,": "<br/><br/>Tóm lại,"
}

for k, v in replacements.items():
    text = re.sub(r'(?:<br\s*/?>|\s)*' + re.escape(k), v, text)

print(text)

