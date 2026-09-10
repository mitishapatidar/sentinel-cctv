with open("portal_home.html", "r", encoding="utf-8") as f:
    home_html = f.read()

import re
scripts = re.findall(r'<script[^>]*>(.*?)</script>', home_html, re.DOTALL)
print("=== HOME SCRIPT 1 FULL ===")
if len(scripts) > 1:
    print(scripts[1][:4000])

print("=== RESOURCE PAGE HEADINGS ===")
with open("resource.html", "r", encoding="utf-8") as f:
    res_html = f.read()

# look for endpoints or code blocks
code_blocks = re.findall(r'<code[^>]*>(.*?)</code>|<pre[^>]*>(.*?)</pre>', res_html, re.DOTALL)
for cb in code_blocks[:10]:
    t = (cb[0] or cb[1]).strip()
    if len(t) > 0:
        print("CODE:", t[:150])
