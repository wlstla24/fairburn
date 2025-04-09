import requests

YOUR_API_KEY = "msy_wcadg4TtNWPbH08rGNfI7mbuFqZ6zmyOPul6"

payload = {
  "mode": "refine",
  "preview_task_id": "01961b65-be58-7a91-b9e6-89aa5ffe4b12",
  "enable_pbr": True
  #"ai_model": "meshy-4",
  #"texture_prompt": "rainbow"
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