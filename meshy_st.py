import requests
import json

YOUR_API_KEY = "msy_ZSlSbBAI5C3wXBHh3b9YFcStXGiUMhiBdl2d"

headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}",
    "Accept": "text/event-stream"
}

response = requests.get(
    'https://api.meshy.ai/openapi/v2/text-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578/stream',
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
