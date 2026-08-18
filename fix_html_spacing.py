import re
from bs4 import BeautifulSoup

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Smart regex to add space between text and tags if they are word chars
# \w inside or outside tags
# text<strong -> text <strong (if text ends with word char and strong starts with word char)
# Actually, since it's hard to look inside the tag, we can temporarily remove tags, but we need to keep them.
# Let's just fix the specific issues since it's just Test 01 and we want to be safe.

fixes = {
    # Part 2
    r'allows<strong([^>]*)>him': r'allows <strong\1>him',
    r'him</strong>to<strong': r'him</strong> to <strong',
    r'fact,<strong([^>]*)>he': r'fact, <strong\1>he',
    r'he</strong>can<strong': r'he</strong> can <strong',
    r'learn</strong><strong([^>]*)>professional': r'learn</strong> <strong\1>professional',
    r'skills</strong>and<strong': r'skills</strong> and <strong',
    r'environment</strong>.': r'environment</strong>.',
    r'Therefore,<strong([^>]*)>he': r'Therefore, <strong\1>he',
    r'prepare better': r'prepare better', # fine
    r'Secondly,<strong([^>]*)>he': r'Secondly, <strong\1>he',
    r'money</strong>and<strong': r'money</strong> and <strong',
    r'result,<strong([^>]*)>he': r'result, <strong\1>he',
    r'support</strong><strong([^>]*)>himself': r'support</strong> <strong\1>himself',
    r'himself</strong>and<strong': r'himself</strong> and <strong',
    r'because<strong': r'because <strong',
    r'waste</strong><strong': r'waste</strong> <strong',
    r'believe<strong': r'believe <strong',

    # Part 3
    r'aresome': r'are some',
    r'convenient\.This': r'convenient. This',
    r'time-saving\.Because': r'time-saving. Because',
    r'cheap\.This': r'cheap. This',
    r'In fact,students': r'In fact, students',
    r'Becausethe': r'Because the',
    r'short,<strong([^>]*)>having': r'short, <strong\1>having',
    r'canteen</strong>has': r'canteen</strong> has',
    r'clear<strong([^>]*)>benefits': r'clear <strong\1>benefits',
    r'that<strong([^>]*)>having': r'that <strong\1>having',
    r'convenient\.This': r'convenient. This',
    r'students<strong([^>]*)>do': r'students <strong\1>do',
    r'food\.As': r'food. As',
    r'can<strong([^>]*)>spend': r'can <strong\1>spend',
    r'spend</strong><strong([^>]*)>more': r'spend</strong> <strong\1>more',
    r'cheap\.In': r'cheap. In',
    r'students<strong([^>]*)>spend': r'students <strong\1>spend',
    r'stalls\.This': r'stalls. This',
    r'students<strong([^>]*)>save': r'students <strong\1>save',
    r'time-saving\.Students': r'time-saving. Students',
    r'far\.Therefore': r'far. Therefore',
    r'they<strong([^>]*)>have': r'they <strong\1>have',

    # Other common ones missed:
    r'it</strong><strong([^>]*)>’</strong><strong([^>]*)>s': r'it</strong><strong\1>’</strong><strong\2>s', # Keep it's together
    r'do</strong><strong([^>]*)>n’</strong><strong([^>]*)>t': r'do</strong><strong\1>n’</strong><strong\2>t', # Keep don't together
    r'students<strong': r'students <strong',
    r'they<strong': r'they <strong',
    r'that<strong': r'that <strong',
    r'because<strong': r'because <strong',
    r'allows<strong': r'allows <strong',
    r'can<strong': r'can <strong',
    r'from<strong': r'from <strong',
    r'and<strong': r'and <strong',
    r'or<strong': r'or <strong',
    r'to<strong': r'to <strong',
    r'of<strong': r'of <strong',
    r'in<strong': r'in <strong',
    r'is<strong': r'is <strong',
    r'are<strong': r'are <strong',
    r'with<strong': r'with <strong',
    r'for<strong': r'for <strong',
    r'about<strong': r'about <strong',
    r'through<strong': r'through <strong',
    r'help<strong': r'help <strong',
    r'helps<strong': r'helps <strong',
    r'make<strong': r'make <strong',
    r'makes<strong': r'makes <strong',
    
    r'</strong>and': r'</strong> and',
    r'</strong>or': r'</strong> or',
    r'</strong>to': r'</strong> to',
    r'</strong>in': r'</strong> in',
    r'</strong>of': r'</strong> of',
    r'</strong>for': r'</strong> for',
    r'</strong>with': r'</strong> with',
    r'</strong>can': r'</strong> can',
    r'</strong>because': r'</strong> because',
    r'</strong>is': r'</strong> is',
    r'</strong>are': r'</strong> are',
    r'</strong>has': r'</strong> has',
    r'</strong>have': r'</strong> have',
    r'</strong>helps': r'</strong> helps',
    r'</strong>help': r'</strong> help',
    r'</strong>make': r'</strong> make',
    r'</strong>makes': r'</strong> makes',
    
    # Extra fix for space before period/comma
    r'\s+\.': r'.',
    r'\s+,': r',',
    r'</strong> \.': r'</strong>.',
    r'</strong> ,': r'</strong>,',
    r' \.': r'.',
    r' ,': r',',
}

# Apply fixes multiple times to catch overlapping
for _ in range(3):
    for pattern, replacement in fixes.items():
        html = re.sub(pattern, replacement, html)

# Generic word boundary fixes
# Insert space between word and tag if needed
html = re.sub(r'([a-zA-Z])<strong', r'\1 <strong', html)
# Insert space between tag and word if needed
html = re.sub(r'</strong>([a-zA-Z])', r'</strong> \1', html)

# Clean up any double spaces
html = html.replace("  ", " ")

# The generic fix might break it's and don't!
# let's revert "it </strong> <strong...>' </strong> <strong...>s" back to "it's"
html = re.sub(r'it\s*</strong>\s*<strong[^>]*>’\s*</strong>\s*<strong[^>]*>s', r"it</strong><strong style=\"color: #00b0f0;\">’</strong><strong style=\"color: #00b0f0;\">s", html)
html = re.sub(r'do\s*</strong>\s*<strong[^>]*>n’\s*</strong>\s*<strong[^>]*>t', r"do</strong><strong style=\"color: #00b0f0;\">n’</strong><strong style=\"color: #00b0f0;\">t", html)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Applied HTML spacing fixes.")
