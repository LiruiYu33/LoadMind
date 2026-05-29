import requests

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjM0NmU5ZjZmY2VhMjRmMmFhZmZlYThkNjJhNTA1M2VkIiwiaCI6Im11cm11cjY0In0="

"""
# Provide lat and lon separately for clarity
start_lat, start_lon = 49.41461, 8.681495
end_lat, end_lon = 49.420318, 8.687872

params = {
    # IMPORTANT: OpenRouteService expects longitude,latitude
    "start": f"{start_lon},{start_lat}",
    "end": f"{end_lon},{end_lat}",
}

headers = {
    "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
    "Authorization": ORS_API_KEY,
}

resp = requests.get(
    "https://api.openrouteservice.org/v2/directions/driving-hgv",
    params=params,
    headers=headers,
)
resp.raise_for_status()
data = resp.json()

# Extract distance (meters) and duration (seconds)
summary = data["features"][0]["properties"]["summary"]
distance_meters = summary["distance"]
duration_seconds = summary["duration"]

print(distance_meters, duration_seconds)
"""
import os
import json
import requests
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# ORS_API_KEY = os.environ["ORS_API_KEY"]

ORS_OPTIMIZATION_URL = "https://api.openrouteservice.org/optimization"

# Choose the timezone of your schedule.
TZ = ZoneInfo("Europe/Berlin")

# Planning horizon starts at midnight of the first planning day.
# All ORS/VROOM times below are seconds after this moment.
BASE_TIME = datetime(2026, 6, 1, 0, 0, tzinfo=TZ)


def parse_local_datetime(value: str) -> datetime:
    """
    Convert 'YYYY-MM-DD HH:MM' into a timezone-aware datetime.
    Example: '2026-06-02 10:30'
    """
    return datetime.strptime(value, "%Y-%m-%d %H:%M").replace(tzinfo=TZ)


def to_seconds(value: str) -> int:
    """
    Convert a local datetime string into seconds since BASE_TIME.
    """
    dt = parse_local_datetime(value)
    return int((dt - BASE_TIME).total_seconds())


def from_seconds(seconds: int) -> datetime:
    """
    Convert ORS/VROOM response seconds back into a readable datetime.
    """
    return BASE_TIME + timedelta(seconds=seconds)


# Truck working period across multiple days
truck_start = to_seconds("2026-06-01 08:00")
truck_end = to_seconds("2026-06-03 18:00")

# Example depot / truck start location
depot = [2.35044, 48.51764]  # [lon, lat]

# Five destinations with latest arrival deadlines across multiple days
stops = [
    {
        "id": 1,
        "name": "Customer A",
        "location": [1.98465, 48.70329],
        "latest_arrival": "2026-06-01 10:00",
        "service_minutes": 10,
    },
    {
        "id": 2,
        "name": "Customer B",
        "location": [2.03655, 48.61128],
        "latest_arrival": "2026-06-01 15:30",
        "service_minutes": 10,
    },
    {
        "id": 3,
        "name": "Customer C",
        "location": [2.39719, 49.07611],
        "latest_arrival": "2026-06-02 09:45",
        "service_minutes": 15,
    },
    {
        "id": 4,
        "name": "Customer D",
        "location": [2.41808, 49.22619],
        "latest_arrival": "2026-06-02 16:00",
        "service_minutes": 20,
    },
    {
        "id": 5,
        "name": "Customer E",
        "location": [2.28325, 48.59580],
        "latest_arrival": "2026-06-03 11:30",
        "service_minutes": 10,
    },
]

jobs = []

for stop in stops:
    latest_arrival = to_seconds(stop["latest_arrival"])
    service_seconds = stop["service_minutes"] * 60

    jobs.append(
        {
            "id": stop["id"],
            "description": stop["name"],
            "location": stop["location"],
            "service": service_seconds,
            # This means:
            # service may start any time from truck_start until latest_arrival.
            #
            # If the truck must FINISH service by latest_arrival,
            # use latest_arrival - service_seconds instead.
            "time_windows": [[truck_start, latest_arrival]],
        }
    )

body = {
    "jobs": jobs,
    "vehicles": [
        {
            "id": 1,
            "profile": "driving-car",  # or "driving-hgv" if suitable for your ORS setup/API access
            "description": "Truck 1",
            "start": depot,
            "end": depot,
            "time_window": [truck_start, truck_end],
        }
    ],
}

headers = {"Authorization": ORS_API_KEY, "Content-Type": "application/json"}

response = requests.post(ORS_OPTIMIZATION_URL, headers=headers, json=body, timeout=60)

if not response.ok:
    print("Request failed")
    print("Status:", response.status_code)
    print(response.text)
    raise SystemExit

result = response.json()

print("Raw response:")
print(json.dumps(result, indent=2))

print("\n--- Optimized route ---")

if result.get("unassigned"):
    print("Some jobs could not be assigned:")
    for item in result["unassigned"]:
        print(item)
else:
    route = result["routes"][0]

    for step in route["steps"]:
        step_type = step["type"]
        arrival_seconds = step.get("arrival")

        if arrival_seconds is None:
            continue

        arrival_dt = from_seconds(arrival_seconds)

        if step_type == "job":
            job_id = step["id"]
            stop = next(s for s in stops if s["id"] == job_id)

            print(
                f"{arrival_dt:%Y-%m-%d %H:%M} | "
                f"Job {job_id}: {stop['name']} | "
                f"deadline: {stop['latest_arrival']}"
            )

        elif step_type == "start":
            print(f"{arrival_dt:%Y-%m-%d %H:%M} | Start at depot")

        elif step_type == "end":
            print(f"{arrival_dt:%Y-%m-%d %H:%M} | Return to depot")
