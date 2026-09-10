import json
with open("all_cameras.json", "r", encoding="utf-8") as f:
    cams = json.load(f)

for c in cams:
    print(f"{c['id']}: {c['name']}")
