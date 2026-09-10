import re

with open("portal_home.html", "r", encoding="utf-8") as f:
    home_html = f.read()

scripts = re.findall(r'<script[^>]*>(.*?)</script>', home_html, re.DOTALL)
with open("extracted_script.js", "w", encoding="utf-8") as f:
    if len(scripts) > 1:
        f.write(scripts[1])

with open("resource.html", "r", encoding="utf-8") as f:
    res_html = f.read()

# find API links
apis = re.findall(r'(/api/[a-zA-Z0-9_/]+|/stream/[a-zA-Z0-9_/]+|http[s]?://[^\s\"\'<>]+)', res_html)
print("APIs in resource:", set(apis))

with open("extracted_script.js", "r", encoding="utf-8") as f:
    js = f.read()
fetch_calls = re.findall(r'fetch\([\"\'`]([^\"\'`]+)[\"\'`]', js)
print("Fetch calls in home:", set(fetch_calls))
