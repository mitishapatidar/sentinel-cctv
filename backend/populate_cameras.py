import json
import urllib.request
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://splqtcnmbxjojxjeauzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_KEY:
    print("Please provide SUPABASE_SERVICE_ROLE_KEY environment variable.")
    exit(0)

with open("all_cameras.json", "r", encoding="utf-8") as f:
    raw_cams = json.load(f)

city_geo = {
    "chiman": {"city": "Ahmedabad", "lat": 23.0301, "lng": 72.5075, "dept": "Traffic Police", "type": "ANPR"},
    "janpath": {"city": "Ahmedabad", "lat": 23.0225, "lng": 72.5714, "dept": "City Police", "type": "PTZ"},
    "o.n.g.c": {"city": "Ahmedabad", "lat": 23.0901, "lng": 72.5802, "dept": "Industrial Security", "type": "Bullet"},
    "paldi": {"city": "Ahmedabad", "lat": 23.0131, "lng": 72.5624, "dept": "Traffic Police", "type": "ANPR"},
    "visat": {"city": "Ahmedabad", "lat": 23.1042, "lng": 72.5932, "dept": "Highway Patrol", "type": "ANPR"},
    "timbavadi": {"city": "Junagadh", "lat": 21.5054, "lng": 70.4352, "dept": "City Police", "type": "PTZ"},
    "somnath": {"city": "Gir Somnath", "lat": 20.9002, "lng": 70.4011, "dept": "Coastal Security", "type": "Thermal"},
    "majewadi": {"city": "Junagadh", "lat": 21.5281, "lng": 70.4619, "dept": "City Police", "type": "Dome"},
    "bypass": {"city": "Junagadh", "lat": 21.5420, "lng": 70.4812, "dept": "Highway Patrol", "type": "ANPR"},
    "char-chowk": {"city": "Junagadh", "lat": 21.5188, "lng": 70.4578, "dept": "Traffic Police", "type": "Dome"},
    "dolatpara": {"city": "Junagadh", "lat": 21.5342, "lng": 70.4721, "dept": "Traffic Police", "type": "ANPR"},
    "adalaj": {"city": "Gandhinagar", "lat": 23.1673, "lng": 72.5812, "dept": "Highway Patrol", "type": "ANPR"},
    "vidhyalaya": {"city": "Ahmedabad", "lat": 23.0189, "lng": 72.5510, "dept": "City Police", "type": "Dome"},
    "delight": {"city": "Ahmedabad", "lat": 23.0450, "lng": 72.5200, "dept": "Traffic Police", "type": "ANPR"},
    "suvidha": {"city": "Ahmedabad", "lat": 23.0120, "lng": 72.5480, "dept": "City Police", "type": "Bullet"},
    "rajkot": {"city": "Rajkot", "lat": 22.3039, "lng": 70.8022, "dept": "City Police", "type": "PTZ"},
    "navsari": {"city": "Navsari", "lat": 20.9467, "lng": 72.9520, "dept": "Panchayat Security", "type": "Bullet"},
    "mohanpura": {"city": "Ahmedabad", "lat": 23.0330, "lng": 72.5850, "dept": "City Police", "type": "Dome"},
    "patan": {"city": "Patan", "lat": 23.8493, "lng": 72.1266, "dept": "Highway Patrol", "type": "ANPR"},
    "mervada": {"city": "Banaskantha", "lat": 24.1724, "lng": 72.4346, "dept": "Highway Patrol", "type": "ANPR"},
    "kheram": {"city": "Kheda", "lat": 22.7521, "lng": 72.6841, "dept": "Panchayat Security", "type": "Bullet"},
    "dehgam": {"city": "Gandhinagar", "lat": 23.1690, "lng": 72.8130, "dept": "City Police", "type": "Dome"},
    "dhanori": {"city": "Navsari", "lat": 20.8910, "lng": 72.9810, "dept": "Panchayat Security", "type": "Bullet"},
    "tankal": {"city": "Navsari", "lat": 20.8120, "lng": 73.0140, "dept": "Panchayat Security", "type": "Bullet"},
    "bilimora": {"city": "Navsari", "lat": 20.7645, "lng": 72.9691, "dept": "Coastal Security", "type": "PTZ"},
    "gandhidham": {"city": "Kutch", "lat": 23.0753, "lng": 70.1337, "dept": "Port & Highway", "type": "ANPR"},
}

cameras_to_insert = []
for c in raw_cams:
    cid = c["id"]
    name = c["name"]
    name_lower = name.lower()
    geo = {"city": "Gujarat", "lat": 22.2587, "lng": 71.1924, "dept": "Gujarat Police", "type": "Fixed"}
    for k, v in city_geo.items():
        if k in name_lower:
            geo = v
            break
            
    cameras_to_insert.append({
        "id": cid,
        "name": name,
        "location": name,
        "city": geo["city"],
        "department": geo["dept"],
        "camera_type": geo["type"],
        "codec": "H.264",
        "resolution": "1080p",
        "status": "live",
        "lat": geo["lat"],
        "lng": geo["lng"],
        "hls_url": f"https://cctv.corp8.cloud/{cid}/index.m3u8",
        "rtsp_url": f"rtsp://103.250.160.189:8554/stream/{cid}",
        "webrtc_url": f"http://103.250.160.189:8889/stream/{cid}/whep"
    })

url = f"{SUPABASE_URL}/rest/v1/cameras"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

req = urllib.request.Request(url, data=json.dumps(cameras_to_insert).encode("utf-8"), headers=headers, method="POST")
with urllib.request.urlopen(req) as resp:
    print("Cameras Insert Status:", resp.status)
