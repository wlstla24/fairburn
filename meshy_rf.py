
import requests

YOUR_API_KEY = "msy_ZSlSbBAI5C3wXBHh3b9YFcStXGiUMhiBdl2d"

payload = {
  "mode": "refine",
  "preview_task_id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "enable_pbr": True,
  "texture_prompt": "rainbow"
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
