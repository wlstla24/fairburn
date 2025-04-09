import requests

YOUR_API_KEY = "msy_wcadg4TtNWPbH08rGNfI7mbuFqZ6zmyOPul6"

headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.get(
    "https://api.meshy.ai/openapi/v2/text-to-3d",
    headers=headers,
    params={"page_size": 10,
            "page_num" : 1},
    #sort_by= +created_at
)
response.raise_for_status()
print(response.json())