import os
import json
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Load .env variables
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://splqtcnmbxjojxjeauzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def supabase_request(table, data, method="POST", query=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}{query}"
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[Supabase] Error on {method} {table}:", e)
        return None

# 12 Genuine Gujarat Police Targets
WATCHLIST_ENTRIES = [
    {
        "entity_type": "vehicle",
        "identifier": "GJ-01-AB-1234",
        "category": "stolen",
        "description": "White Maruti Swift Dzire - Navrangpura PS (Ahmedabad) FIR #391/2026. Stolen from CG Road commercial parking.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-05-CD-5678",
        "category": "wanted",
        "description": "Silver Hyundai Creta (2024) - Varachha PS (Surat) Crime #108/2026. Child abduction suspect vehicle, Critical Amber Alert.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-18-XY-9012",
        "category": "wanted",
        "description": "Grey Honda City - Sector 7 PS (Gandhinagar) IPC 304A Hit-and-run fatality on Infocity Highway.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-06-ER-3456",
        "category": "challan_defaulter",
        "description": "Black Mahindra Scorpio-N - Vadodara Traffic Branch. 14 unpaid automated e-challans (over-speeding & signal jumping).",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-03-GH-7890",
        "category": "suspicious",
        "description": "Dark Red Toyota Fortuner - Rajkot Crime Branch surveillance for inter-district contraband courier route.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-12-KL-4321",
        "category": "stolen",
        "description": "Blue Maruti Baleno Alpha - Bhuj 'A' Division (Kutch). Highway robbery near Samakhiali Toll Plaza.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-27-MN-8765",
        "category": "suspicious",
        "description": "White Tata Nexon EV - Sanand Rural Police. Multiple unauthorized night runs along industrial pipeline perimeter.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-15-PQ-2109",
        "category": "wanted",
        "description": "Dark Grey Kia Seltos - Vapi Town PS (Valsad). Armed jewelry heist getaway vehicle fleeing towards Maharashtra border.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-10-RS-6543",
        "category": "stolen",
        "description": "Black Royal Enfield Classic 350 - Jamnagar City 'B' Division. Inter-district motorcycle theft syndicate target.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-08-TU-1098",
        "category": "wanted",
        "description": "White Mahindra Bolero Camper - Palanpur Highway PS (Banaskantha). Illegal sand mafia convoy leader, police blockade evasion.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-23-VW-5432",
        "category": "wanted",
        "description": "White Honda Activa 6G - Anand Town PS FIR #224/2026. Two-rider tandem chain snatching suspect bike.",
        "is_active": True
    },
    {
        "entity_type": "vehicle",
        "identifier": "GJ-16-ZA-9876",
        "category": "suspicious",
        "description": "Silver Hyundai i20 - Ankleshwar GIDC PS (Bharuch). Duplicate cloned HSRP registration plate alert.",
        "is_active": True
    }
]

def seed_data():
    print("=" * 70)
    print("SENTINEL CCTV - SEEDING SURVEILLANCE WATCHLIST, DETECTIONS & LIVE ALERTS")
    print("=" * 70)

    # 1. Fetch current watchlist to avoid duplicate inserts
    print("\n[1/3] Synchronizing Watchlist Targets with Supabase...")
    existing = supabase_request("watchlist", None, method="GET", query="?select=id,identifier")
    existing_ids = {item["identifier"]: item["id"] for item in (existing or [])}

    watchlist_map = {} # identifier -> id

    for entry in WATCHLIST_ENTRIES:
        ident = entry["identifier"]
        if ident in existing_ids:
            print(f"  - Target already exists in Watchlist: {ident} (ID: {existing_ids[ident]})")
            watchlist_map[ident] = existing_ids[ident]
        else:
            res = supabase_request("watchlist", entry, method="POST")
            if res and len(res) > 0:
                new_id = res[0]["id"]
                watchlist_map[ident] = new_id
                print(f"  + Added new Watchlist target: {ident} -> {entry['description'][:50]}... (ID: {new_id})")
            else:
                print(f"  ! Failed to insert {ident}")

    # 2. Seed realistic Trajectory Detections across camera checkpoints
    print("\n[2/3] Seeding Vehicle Trajectory Detections across Gujarat Police CCTV network...")
    
    # Checkpoint trajectories
    trajectories = [
        {
            "plate": "GJ-01-AB-1234",
            "type": "Car",
            "checkpoints": [
                ("cam01", 180, "01 Chiman bhai Bridge", 0.96),
                ("cam04", 120, "04 Paldi Circle", 0.98),
                ("cam12", 60, "12 Tri Mandir Adalaj Tollnaka", 0.94),
                ("cam08", 15, "08 majewadi-gate-junagadh", 0.95)
            ]
        },
        {
            "plate": "GJ-05-CD-5678",
            "type": "SUV",
            "checkpoints": [
                ("cam14", 140, "14 Surat Ring Road", 0.97),
                ("cam13", 90, "13 Bharuch Toll Plaza", 0.95),
                ("cam02", 40, "02 Janpath Ahmedabad", 0.98),
                ("cam04", 5, "04 Paldi Circle Ahmedabad", 0.99)
            ]
        },
        {
            "plate": "GJ-18-XY-9012",
            "type": "Car",
            "checkpoints": [
                ("cam12", 200, "12 Tri Mandir Adalaj Tollnaka", 0.93),
                ("cam03", 110, "03 O.N.G.C. Office", 0.96),
                ("cam01", 20, "01 Chiman bhai Bridge", 0.97)
            ]
        },
        {
            "plate": "GJ-06-ER-3456",
            "type": "SUV",
            "checkpoints": [
                ("cam15", 220, "15 Vadodara Central", 0.94),
                ("cam13", 140, "13 Bharuch Toll", 0.97),
                ("cam04", 30, "04 Paldi Circle", 0.96)
            ]
        },
        {
            "plate": "GJ-03-GH-7890",
            "type": "SUV",
            "checkpoints": [
                ("cam10", 180, "10 char-chowk-road-2-junagadh", 0.95),
                ("cam08", 120, "08 majewadi-gate-junagadh", 0.98),
                ("cam06", 45, "06 Timbavadi gate-Junagadh", 0.96)
            ]
        },
        {
            "plate": "GJ-12-KL-4321",
            "type": "Car",
            "checkpoints": [
                ("cam11", 160, "11 Gandhi Ashram", 0.94),
                ("cam05", 80, "05 Visat teen Rasta", 0.97),
                ("cam01", 10, "01 Chiman bhai Bridge", 0.95)
            ]
        },
        {
            "plate": "GJ-15-PQ-2109",
            "type": "SUV",
            "checkpoints": [
                ("cam14", 90, "14 Surat Ring Road", 0.96),
                ("cam13", 35, "13 Bharuch Toll Plaza", 0.94),
                ("cam15", 8, "15 Vadodara Checkpoint", 0.98)
            ]
        },
        {
            "plate": "GJ-10-RS-6543",
            "type": "Motorcycle",
            "checkpoints": [
                ("cam09", 110, "09 new-bypass-circle-junagadh", 0.96),
                ("cam10", 40, "10 char-chowk-road-2-junagadh", 0.97)
            ]
        },
        {
            "plate": "GJ-08-TU-1098",
            "type": "Truck",
            "checkpoints": [
                ("cam05", 130, "05 Visat teen Rasta", 0.94),
                ("cam12", 50, "12 Tri Mandir Adalaj Tollnaka", 0.98)
            ]
        },
        {
            "plate": "GJ-23-VW-5432",
            "type": "Motorcycle",
            "checkpoints": [
                ("cam02", 70, "02 Janpath Ahmedabad", 0.97),
                ("cam04", 12, "04 Paldi Circle", 0.98)
            ]
        }
    ]

    now = datetime.now(timezone.utc)
    detections_inserted = 0

    for traj in trajectories:
        plate = traj["plate"]
        v_type = traj["type"]
        for cam_id, mins_ago, cam_name, conf in traj["checkpoints"]:
            det_time = (now - timedelta(minutes=mins_ago)).isoformat()
            det_payload = {
                "camera_id": cam_id,
                "plate_number": plate,
                "confidence": conf,
                "vehicle_type": v_type,
                "pts_ms": round(mins_ago * 60 * 1000.0, 1),
                "detected_at": det_time
            }
            res = supabase_request("detections", det_payload, method="POST")
            if res:
                detections_inserted += 1
    print(f"  + Successfully registered {detections_inserted} chronological tracking points in `detections` table.")

    # 3. Seed Live Automated Alerts
    print("\n[3/3] Generating Live Urgent Surveillance Alerts in Supabase...")
    alert_samples = [
        {
            "code": "ALT-9021",
            "type": "Watchlist Match",
            "severity": "critical",
            "cam_id": "cam08",
            "target": "GJ-01-AB-1234",
            "title": "STOLEN Vehicle Detected: GJ-01-AB-1234",
            "msg": "Identified at 08 majewadi-gate-junagadh. Confidence 95.2%. Automated law enforcement intercept dispatched."
        },
        {
            "code": "ALT-9022",
            "type": "Amber Alert",
            "severity": "critical",
            "cam_id": "cam04",
            "target": "GJ-05-CD-5678",
            "title": "KIDNAPPING Amber Alert: GJ-05-CD-5678",
            "msg": "Identified at 04 Paldi Circle. Confidence 99.1%. Emergency PCR intercept deployed to isolate intersection."
        },
        {
            "code": "ALT-9023",
            "type": "Hit & Run Intercept",
            "severity": "high",
            "cam_id": "cam01",
            "target": "GJ-18-XY-9012",
            "title": "HIT & RUN Suspect Vehicle: GJ-18-XY-9012",
            "msg": "Identified at 01 Chiman bhai Bridge. Confidence 97.0%. Traced heading south towards Nehru Bridge."
        },
        {
            "code": "ALT-9024",
            "type": "E-Challan Defaulter",
            "severity": "medium",
            "cam_id": "cam04",
            "target": "GJ-06-ER-3456",
            "title": "CHALLAN DEFAULTER Intercept: GJ-06-ER-3456",
            "msg": "Identified at 04 Paldi Circle. 14 unpaid violations (Rs. 28,000 pending). Traffic impoundment flagged."
        },
        {
            "code": "ALT-9025",
            "type": "Contraband Surveillance",
            "severity": "high",
            "cam_id": "cam06",
            "target": "GJ-03-GH-7890",
            "title": "SUSPICIOUS CONVOY: GJ-03-GH-7890",
            "msg": "Identified at 06 Timbavadi gate-Junagadh. Confidence 96.4%. Undercover anti-narcotics unit notified."
        },
        {
            "code": "ALT-9026",
            "type": "Stolen Vehicle",
            "severity": "critical",
            "cam_id": "cam01",
            "target": "GJ-12-KL-4321",
            "title": "STOLEN Vehicle Detected: GJ-12-KL-4321",
            "msg": "Identified at 01 Chiman bhai Bridge. Confidence 95.0%. Highway robbery FIR #201 registered."
        },
        {
            "code": "ALT-9027",
            "type": "Armed Robbery Getaway",
            "severity": "critical",
            "cam_id": "cam15",
            "target": "GJ-15-PQ-2109",
            "title": "ARMED SUSPECT ESCAPE: GJ-15-PQ-2109",
            "msg": "Identified at 15 Vadodara Checkpoint. Confidence 98.0%. Spike strip barrier alert issued."
        },
        {
            "code": "ALT-9028",
            "type": "Stolen Two-Wheeler",
            "severity": "medium",
            "cam_id": "cam10",
            "target": "GJ-10-RS-6543",
            "title": "STOLEN Bike Detected: GJ-10-RS-6543",
            "msg": "Identified at 10 char-chowk-road-2-junagadh. Confidence 97.0%. Local beat constable notified."
        },
        {
            "code": "ALT-9029",
            "type": "Blockade Evasion",
            "severity": "high",
            "cam_id": "cam12",
            "target": "GJ-08-TU-1098",
            "title": "POLICE BLOCKADE EVADER: GJ-08-TU-1098",
            "msg": "Identified at 12 Tri Mandir Adalaj Tollnaka. Heavy commercial vehicle bypassing inspection lane."
        },
        {
            "code": "ALT-9030",
            "type": "Serial Chain Snatcher",
            "severity": "high",
            "cam_id": "cam04",
            "target": "GJ-23-VW-5432",
            "title": "WANTED Two-Wheeler: GJ-23-VW-5432",
            "msg": "Identified at 04 Paldi Circle. Confidence 98.0%. Matches 3 snatching incidents in Navrangpura."
        }
    ]

    alerts_inserted = 0
    for a in alert_samples:
        watchlist_id = watchlist_map.get(a["target"])
        alert_payload = {
            "alert_code": a["code"],
            "alert_type": a["type"],
            "severity": a["severity"],
            "camera_id": a["cam_id"],
            "watchlist_id": watchlist_id,
            "title": a["title"],
            "message": a["msg"],
            "status": "pending"
        }
        res = supabase_request("alerts", alert_payload, method="POST")
        if res:
            alerts_inserted += 1
            print(f"  + Alert {a['code']} [{a['severity'].upper()}]: {a['title']}")

    print("\n" + "=" * 70)
    print("DATABASE SEEDING COMPLETE!")
    print(f"Watchlist Targets Active:     {len(watchlist_map)}")
    print(f"Tracking Detections Seeded:   {detections_inserted}")
    print(f"Active Law Enforcement Alerts: {alerts_inserted}")
    print("=" * 70)

if __name__ == "__main__":
    seed_data()
