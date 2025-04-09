import requests
import json

YOUR_API_KEY = "01961b65-be58-7a91-b9e6-89aa5ffe4b12"

headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}",
    "Accept": "text/event-stream"
}

response = requests.get(
    'https://api.meshy.ai/openapi/v2/text-to-3d/01961b60-271b-70d7-b910-7fc1a4dae1a0/stream',
    headers=headers,
    stream=True
)

for line in response.iter_lines():
    if line:
        if line.startswith(b'data:'):
            data = json.loads(line.decode('utf-8')[5:])
            print(data)

            if data['status'] in ['SUCCEEDED', 'FAILED', 'CANCELED']:
                break

response.close()
