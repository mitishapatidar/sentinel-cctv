import urllib.request
import urllib.parse
import http.cookiejar
import re

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Login
login_url = "https://cctv.corp8.cloud/auth/login"
data = urllib.parse.urlencode({"email": "patidarmitisha@gmail.com", "password": "NYJF-T8U3-MHP8"}).encode("utf-8")
req = urllib.request.Request(login_url, data=data, headers={"User-Agent": "Mozilla/5.0"})
res = opener.open(req)
print("Login status:", res.status)

# Home page
res_home = opener.open(urllib.request.Request("https://cctv.corp8.cloud/", headers={"User-Agent": "Mozilla/5.0"}))
html = res_home.read().decode("utf-8")
print("Home page length:", len(html))

# Resources page
try:
    res_res = opener.open(urllib.request.Request("https://cctv.corp8.cloud/resources", headers={"User-Agent": "Mozilla/5.0"}))
    print("Resources page status:", res_res.status)
    with open("resources.html", "w", encoding="utf-8") as f:
        f.write(res_res.read().decode("utf-8"))
except Exception as e:
    print("Resources error:", e)

with open("portal_home.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Saved portal_home.html and resources.html")
