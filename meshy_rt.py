
import requests

YOUR_API_KEY = "msy_wcadg4TtNWPbH08rGNfI7mbuFqZ6zmyOPul6"

task_id = "01961b65-be58-7a91-b9e6-89aa5ffe4b12"
headers = {
  "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.get(
  f"https://api.meshy.ai/openapi/v2/text-to-3d/{task_id}",
  headers=headers,
)
response.raise_for_status()
print(response.json())
