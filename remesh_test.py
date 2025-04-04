from typing import Literal
import requests
import json

API_KEY = "msy_wcadg4TtNWPbH08rGNfI7mbuFqZ6zmyOPul6"

# typealias for the task ID
TaskID = str

def create_text_to_3d_task() -> TaskID:
    """
    Creates a text-to-3D task by sending a POST request to the Meshy API.
    This function sends a payload containing the mode, prompt, art style,
    and remesh option to the Meshy API. It requires an API key for authorization.
    Returns:
        str: The ID of the created text-to-3D task.
    Raises:
        requests.exceptions.HTTPError: If the HTTP request to the API fails.
    """
    payload = {
        "mode": "preview",
        "prompt": "a monster mask",
        "art_style": "realistic",
        "should_remesh": True
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    response = requests.post(
        "https://api.meshy.ai/openapi/v2/text-to-3d",
        headers=headers,
        json=payload,
    )
    response.raise_for_status()
    print(response.json())

    # response.json() will return a JSON object like this:
    # {
    #   "result": "018a210d-8ba4-705c-b111-1f1776f7f578"
    # }
    task_id = response.json()["result"]
    return task_id

def create_remesh_task(task_id: TaskID) -> TaskID:
    """
    Creates a remeshing task by sending a POST request to the Meshy API.
    This function sends a payload containing the input task ID, target formats,
    topology, target polygon count, resize height, and origin position to the
    Meshy API. It requires an API key for authorization.
    Returns:
        str: The ID of the created remesh task.
    Raises:
        requests.exceptions.HTTPError: If the HTTP request to the API fails.
    """
    
    payload = {
        "input_task_id": "018a210d-8ba4-705c-b111-1f1776f7f578",
        "target_formats": ["glb", "fbx"],
        "topology": "quad",
        "target_polycount": 50000,
        "resize_height": 1.0,
        "origin_at": "bottom"
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    response = requests.post(
        "https://api.meshy.ai/openapi/v1/remesh",
        headers=headers,
        json=payload,
    )
    response.raise_for_status()

    # response.json() will return a JSON object like this:
    # {
    #   "result": "0193bfc5-ee4f-73f8-8525-44b398884ce9"
    # }
    remesh_task_id = response.json()["result"]

    return remesh_task_id

# {
#   "id": "0193bfc5-ee4f-73f8-8525-44b398884ce9",
#   "model_urls": {
#       "glb": "https://assets.meshy.ai/***/tasks/0193bfc5-ee4f-73f8-8525-44b398884ce9/output/model.glb?Expires=***",
#       "fbx": "https://assets.meshy.ai/***/tasks/0193bfc5-ee4f-73f8-8525-44b398884ce9/output/model.fbx?Expires=***",
#       "obj": "https://assets.meshy.ai/***/tasks/0193bfc5-ee4f-73f8-8525-44b398884ce9/output/model.obj?Expires=***",
#       "usdz": "https://assets.meshy.ai/***/tasks/0193bfc5-ee4f-73f8-8525-44b398884ce9/output/model.usdz?Expires=***"
#   },
#   "progress": 100,
#   "status": "SUCCEEDED",
#   "preceding_tasks": 0,
#   "created_at": 1699999999000,
#   "started_at": 1700000000000,
#   "finished_at": 1700000001000,
#   "task_error": {
#       "message": ""
#   }
# }
class RemeshTaskResult:
    def __init__(
        self,
        task_id: TaskID,
        model_urls: dict[str, str],
        progress: int,
        status: str,
        preceding_tasks: int,
        created_at: int,
        started_at: int,
        finished_at: int,
        task_error: dict[str, str]
    ):
        """
        Initializes a RemeshTaskResult object with the given parameters.
        Args:
            task_id (TaskID): The ID of the remesh task.
            model_urls (dict[str, str]): A dictionary containing URLs for different model formats.
            progress (int): The progress of the task as a percentage.
            status (str): The status of the task (e.g., "SUCCEEDED", "FAILED").
            preceding_tasks (int): The number of preceding tasks.
            created_at (int): The timestamp when the task was created.
            started_at (int): The timestamp when the task started.
            finished_at (int): The timestamp when the task finished.
            task_error (dict[str, str]): A dictionary containing error information if any.
        """
        self.task_id = task_id
        self.model_urls = model_urls
        self.progress = progress
        self.status = status
        self.preceding_tasks = preceding_tasks
        self.created_at = created_at
        self.started_at = started_at
        self.finished_at = finished_at
        self.task_error = task_error

def wait_for_remesh_task(task_id: TaskID) -> None | RemeshTaskResult:
    """
    Waits for the remeshing task to complete by sending a GET request to the Meshy API.
    This function streams the response and prints the status of the task until it is completed.
    Args:
        task_id (TaskID): The ID of the remesh task to wait for.
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "text/event-stream"
    }

    response = requests.get(
        "https://api.meshy.ai/openapi/v1/remesh/a43b5c6d-7e8f-901a-234b-567c890d1e2f/stream",
        headers=headers,
        stream=True
    )

    result = None

    for line in response.iter_lines():
        if line:
            if line.startswith(b"data:"):
                data = json.loads(line.decode("utf-8")[5:])
                print(data)

                if data["status"] in ["SUCCEEDED", "FAILED", "CANCELED"]:
                    result = RemeshTaskResult(
                        task_id=data["id"],
                        model_urls=data["model_urls"],
                        progress=data["progress"],
                        status=data["status"],
                        preceding_tasks=data["preceding_tasks"],
                        created_at=data["created_at"],
                        started_at=data["started_at"],
                        finished_at=data["finished_at"],
                        task_error=data["task_error"]
                    )
                    break

    response.close()

    return result


