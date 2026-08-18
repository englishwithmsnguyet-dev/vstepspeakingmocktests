import re

path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'recommendgoing': 'recommend going',
    'howbusinesses': 'how businesses',
    'hisown': 'his own',
    'significantinvestment': 'significant investment',
    'coffee shopsin': 'coffee shops in',
    'especiallyon': 'especially on',
    'therelaxing atmosphere': 'the relaxing atmosphere',
    'relaxingatmosphere': 'relaxing atmosphere',
    'orco-workers': 'or co-workers',
    'exchangeideas': 'exchange ideas',
    'somework': 'some work',
    'Iusually': 'I usually',
    'providedeliciousand': 'provide delicious and',
    'foodchoices': 'food choices',
    'peakhours': 'peak hours',
    'ofingredients': 'of ingredients',
    'sufficientnutrients': 'sufficient nutrients',
    'countrysuch': 'country such',
    'reasonablypriced': 'reasonably priced',
    'recommendgoing': 'recommend going',
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed spacing issues in Test 1")
