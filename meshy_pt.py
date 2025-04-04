import requests

YOUR_API_KEY = "msy_ZSlSbBAI5C3wXBHh3b9YFcStXGiUMhiBdl2d"


payload = {
  "mode": "preview",
  "prompt": "a monster mask",
  "art_style": "realistic",
  "should_remesh": True,
  "seed": 0,
  "ai_model": "latest",
  "topology": "triangle",
  "target_polycount": 30000,
  "symmetry_mode": "auto"
}
headers = {
  "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.post(
  "https://api.meshy.ai/openapi/v2/text-to-3d",
  headers=headers,
  json=payload,
)
response.raise_for_status()
print(response.json())

