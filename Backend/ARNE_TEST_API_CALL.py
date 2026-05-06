import requests

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjM0NmU5ZjZmY2VhMjRmMmFhZmZlYThkNjJhNTA1M2VkIiwiaCI6Im11cm11cjY0In0="

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
