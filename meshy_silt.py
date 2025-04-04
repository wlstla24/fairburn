import requests

YOUR_API_KEY = "msy_ZSlSbBAI5C3wXBHh3b9YFcStXGiUMhiBdl2d"

headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.get(
    "https://api.meshy.ai/openapi/v2/text-to-3d",
    headers=headers,
    page_num=1,
    params={"page_size": 10},
    #sort_by= +created_at
)
response.raise_for_status()
print(response.json())
