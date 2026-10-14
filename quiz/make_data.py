# Rebuilds data.js from the question .json files. Run this after you replace a .json file:  python make_data.py
# (data.js is only used when index.html is opened by double-click; a web server reads the .json files directly)
import json
files = ['manifest.json', 'hindi.json', 'english.json', 'science.json', 'reasoning.json', 'computer.json', 'maths.json']
d = {f: json.load(open(f, encoding='utf8')) for f in files}
open('data.js', 'w', encoding='utf8').write('window.QDATA=' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('data.js written')
