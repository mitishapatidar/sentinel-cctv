import urllib.request
import urllib.parse
import http.cookiejar
import json
import re

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Login
login_url = "https://cctv.corp8.cloud/auth/login"
data = urllib.parse.urlencode({"email": "patidarmitisha@gmail.com", "password": "NYJF-T8U3-MHP8"}).encode("utf-8")
req = urllib.request.Request(login_url, data=data, headers={"User-Agent": "Mozilla/5.0"})
opener.open(req)

# Fetch /resource
res_resource = opener.open(urllib.request.Request("https://cctv.corp8.cloud/resource", headers={"User-Agent": "Mozilla/5.0"}))
resource_html = res_resource.read().decode("utf-8")
with open("resource.html", "w", encoding="utf-8") as f:
    f.write(resource_html)
print("Fetched /resource successfully! Length:", len(resource_html))

# Also check portal_home.html body content
with open("portal_home.html", "r", encoding="utf-8") as f:
    home_html = f.read()

scripts = re.findall(r'<script[^>]*>(.*?)</script>', home_html, re.DOTALL)
print(f"Found {len(scripts)} scripts in home")
for i, s in enumerate(scripts):
    if len(s.strip()) > 0:
        print(f"Script {i} snippet:", s.strip()[:300])

