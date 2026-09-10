import urllib.request
import urllib.parse
import http.cookiejar
import json

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_url = "https://cctv.corp8.cloud/auth/login"
data = urllib.parse.urlencode({"email": "patidarmitisha@gmail.com", "password": "NYJF-T8U3-MHP8"}).encode("utf-8")
opener.open(urllib.request.Request(login_url, data=data, headers={"User-Agent": "Mozilla/5.0"}))

# Fetch cameras.json
res = opener.open(urllib.request.Request("https://cctv.corp8.cloud/cameras.json", headers={"User-Agent": "Mozilla/5.0"}))
cams_data = json.loads(res.read().decode("utf-8"))

print(f"Total cameras fetched: {len(cams_data)}")
print("Sample camera 0:", json.dumps(cams_data[0], indent=2))
if len(cams_data) > 1:
    print("Sample camera 1:", json.dumps(cams_data[1], indent=2))

with open("all_cameras.json", "w", encoding="utf-8") as f:
    json.dump(cams_data, f, indent=2)

print("Saved all_cameras.json successfully!")
