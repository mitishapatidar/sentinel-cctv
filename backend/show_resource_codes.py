with open("resource.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
# print pre and code blocks
codes = re.findall(r'<pre[^>]*>(.*?)</pre>', text, re.DOTALL)
for c in codes:
    print("--- CODE BLOCK ---")
    print(c.strip())
