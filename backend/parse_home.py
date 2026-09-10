with open("portal_home.html", "r", encoding="utf-8") as f:
    content = f.read()

import re
# Look for camera names, ids, stream links
cameras = re.findall(r'CAM\d+', content)
print("Found cameras:", set(cameras))

# look for stream urls or api endpoints
streams = re.findall(r'/stream/\d+|/live/stream/\d+|rtsp://[^\s\"\'<>]+', content)
print("Found streams:", set(streams))

# look for cards or links
links = re.findall(r'href=[\"\']([^\"\']+)[\"\']', content)
print("Links:", set(links))

# print first 50 lines of body
lines = content.splitlines()
for l in lines[:40]:
    if "<div" in l or "<a" in l or "CAM" in l or "card" in l or "grid" in l:
        print(l[:120])
