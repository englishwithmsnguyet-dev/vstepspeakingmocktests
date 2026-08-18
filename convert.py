import os

html_path_src = "test 7/test07-index.html"
js_path_src = "test 7/app.js"

html_path_dest = "test 1/test01-index.html"
js_path_dest = "test 1/app.js"

with open(html_path_src, 'r', encoding='utf-8') as f:
    html = f.read()

# Replacements for HTML
html = html.replace('VSTEP Speaking Mock Test 07 - Miss Nguyet', 'VSTEP Speaking Mock Test 01 - Miss Nguyet')
html = html.replace('SPEAKING MOCK TEST 07', 'SPEAKING MOCK TEST 01')
html = html.replace('Speaking Test 07', 'Speaking Test 01')
html = html.replace('<strong>phone calls</strong> & <strong>clothes</strong>', '<strong>street food</strong> & <strong>coffee shops</strong>')
html = html.replace('Thảo luận tình huống mời bạn đi xem phim.', 'Thảo luận tình huống định hướng sau tốt nghiệp.')
html = html.replace('Tác động tiêu cực của giao tiếp trực tuyến', 'Lợi ích của việc ăn trưa tại căng tin trường')

html = html.replace('<h3 class="topic-title"><i class="fa-solid fa-phone"></i> Let\'s talk about phone calls:</h3>', '<h3 class="topic-title"><i class="fa-solid fa-utensils"></i> Let\'s talk about street food:</h3>')
html = html.replace('<li><span class="q-num">1</span> Who do you usually call, and how often?</li>', '<li><span class="q-num">1</span> Do you like eating street food?</li>')
html = html.replace('<li><span class="q-num">2</span> What do you usually talk about when you make phone calls?</li>', '<li><span class="q-num">2</span> What are some famous street foods?</li>')
html = html.replace('<li><span class="q-num">3</span> Do you prefer talking on the phone or sending messages? Why?</li>', '<li><span class="q-num">3</span> What are the benefits of eating street food?</li>')

html = html.replace('<h3 class="topic-title"><i class="fa-solid fa-shirt"></i> Let\'s talk about clothes:</h3>', '<h3 class="topic-title"><i class="fa-solid fa-mug-hot"></i> Let\'s talk about coffee shops:</h3>')
html = html.replace('<li><span class="q-num">4</span> How often do you go shopping for clothes?</li>', '<li><span class="q-num">4</span> Do you like going to coffee shops?</li>')
html = html.replace('<li><span class="q-num">5</span> On what occasions do you usually buy new clothes?</li>', '<li><span class="q-num">5</span> Who do you often go there with?</li>')
html = html.replace('<li><span class="q-num">6</span> What types of clothes do you usually buy?</li>', '<li><span class="q-num">6</span> What do you usually do at a coffee shop?</li>')

html = html.replace('You want to invite your friend to go to the cinema with you. There are three types of films you can choose from: <strong>an action film</strong>, <strong>a romantic film</strong>, and <strong>a comedy film</strong>. Which one would you choose, and why?', 'Your brother has just graduated, and he is considering what to do after graduation. There are three options: <strong>go to work</strong>, <strong>study for his master’s degree</strong>, or <strong>take a gap year</strong>. Which one would you recommend him?')

html = html.replace('<p class="topic-desc">There are several negative effects of online communication.</p>', '<p class="topic-desc">Having lunch at the school canteen has a lot of benefits.</p>')

html = html.replace('<span>Negative effects of<br>online communication</span>', '<span>Lunch at canteen</span>')

html = html.replace('<span>reduce face-to-face<br>interaction</span>', '<span>cheap</span>')
html = html.replace('<span>lead to conflict</span>', '<span>convenient</span>')
html = html.replace('<span>get distracted easily</span>', '<span>time-saving</span>')

html = html.replace('<li>What kind of modern communication technology do you use most often?</li>', '<li>How does a school attract more students to have lunch at its canteen?</li>')
html = html.replace('<li>Do you think technology will completely replace face-to-face communication in the future?</li>', '<li>What are some disadvantages of eating at the canteen?</li>')
html = html.replace('<li>How can people avoid problems caused by online communication?</li>', '<li>What should schools do to have hygienic and healthy meals for students?</li>')

with open(html_path_dest, 'w', encoding='utf-8') as f:
    f.write(html)

with open(js_path_src, 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace('VSTEP SPEAKING MOCK TEST 07', 'VSTEP SPEAKING MOCK TEST 01')
js = js.replace('VSTEP Speaking Test 07', 'VSTEP Speaking Test 01')
js = js.replace('Green Tea & Crowded Places', 'street food & coffee shops')
js = js.replace('chọn trường Đại học', 'định hướng sau tốt nghiệp')

with open(js_path_dest, 'w', encoding='utf-8') as f:
    f.write(js)

print("Done")
