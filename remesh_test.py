"""
This script demonstrates how to create a remeshing task using the Meshy API.
"""
import json
from typing import Any, Callable, Literal, Union
import requests


API_KEY = "msy_wcadg4TtNWPbH08rGNfI7mbuFqZ6zmyOPul6"


# type alias for the task ID
TaskID = str

# sample preview task ID
# {"result":"01960209-84b2-7067-98a2-3ce4c998bf29"}

# sample preview task result
# {
#     "id": "01960209-84b2-7067-98a2-3ce4c998bf29",
#     "mode": "preview",
#     "name": "",
#     "seed": 1743790900,
#     "art_style": "realistic",
#     "texture_richness": "",
#     "prompt": "a monster mask",
#     "negative_prompt": "",
#     "texture_prompt": "",
#     "status": "SUCCEEDED",
#     "created_at": 1743790900628,
#     "progress": 100,
#     "started_at": 1743790901410,
#     "finished_at": 1743790951950,
#     "task_error": null,
#     "model_urls": {
#         "glb": "https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960209-84b2-7067-98a2-3ce4c998bf29/output/model.glb?Expires=4897324800&Signature=ecEa9-a5A8hfTyRvKUY7~GOsj-jRZdGLFnkvGVMezAw2Ly8DGDOfp~0UgtLlpGOV2ijofKeapzNN8wbsplkKtvY8i-poqqkhUEScczdvvXbT7UEeiU9X6eiT91d0kQ~Xrh7zwx67Rr9hKEKXiLEhrWPTPY-xaA5b86aJM7RHZxwiS5IC7k3NQoa2ma7uoxbc9I4C1SjzQX3E5Qz8~f6epOzCxuGXX0K0TUC95wiGvhHEzg31aCPDXydJUId9K4VwvrnJto0VZvpR2hEL09IL2VAKXtpImBVecxmSeqnxXdgrZBr3BqmxipxPdj6y1XLHmh8Ujb1vYytr4LeBXFFEgQ__&Key-Pair-Id=KL5I0C8H7HX83",
#         "fbx": "https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960209-84b2-7067-98a2-3ce4c998bf29/output/model.fbx?Expires=4897324800&Signature=ZJfNngKSmRjkFEutUcWiBAbBi9pTmaZ0KTrAAhdtiywTWTp4hhKSNkOysdT2jFHzxDGdaveev4BgP~j~R1z4FHIwYanEtMJx0pGMpib709ah8uBA0OThE-6Df4Ys7kAm1FfQDK9zkIT260JaoZpBURgtShW7wX3LQQ~YhIWJFjg-NwSK~NduN9XmkCcddfLs~ypwHGNjx6L25GdS-~w9uYqa6GGGS54vA7GFXMj4GRSyeIBqe0LQRkkny~zJzwvP1v-f9KHYUY9wQPFm8Y0byYgyBhajMiltQipicpM0DwS3gu~RIqeL9m9M8xONcR0NDO~Q9r4gejU~oNnH-hbp0g__&Key-Pair-Id=KL5I0C8H7HX83",
#         "usdz": "https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960209-84b2-7067-98a2-3ce4c998bf29/output/model.usdz?Expires=4897324800&Signature=InHkuoK8pUoByKNo9GyTuQY79HrtcYrv78Z9VFXLDnsELWShgRIDx9q~8lNFkzHEOuRzKsS84C8rkFanB7EHfdeSuVaXV9d9ZhpK0ZkgDY7RfrTGYs-ZokASc2tfT4OPVGQRmqaLZyt2tQzyT5oiGPoXZrDAis9QGWDozF7GDA1z-pcrCC~WDslumOM1Hjk-9qP5PxbVhJDQUViatXS9nzNqNRF0nVcizuuOYE3zUhznrmMoNvUrf1Vg7iU70gfHreb6x1WhNkVHJvCMcNMpKxjtxR9vTcEEBHMQGhOtNpJpm-8D4NcDLC6wELB-6cU7H~AbYrYtA9QQwLlfsS-7lw__&Key-Pair-Id=KL5I0C8H7HX83",
#         "obj": "https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960209-84b2-7067-98a2-3ce4c998bf29/output/model.obj?Expires=4897324800&Signature=LONPKprs7~w3BjX9CYS1mU1PIy7z-LXpo~uhtJyudKIhZ4o7-sMzJn4dD6rMIQx-N48usKT9oTIXcFZFheL9pclfig4NcraJMiJwSAOVm2kU50ewRWYdl74h7S~teYpBjXt-w0IZ-7zCw9Lep5tCIJqmQC5AlZsJi5I6DDh39PcrprME0NqgMq7nwyoDGWQAUcEy4VBBLgOcz75bD4rdcRca8mdvORDP6~87HFKpcWFZnNPWxkOd7pK5YxXbFibWiY30qOBO9D3T-v7qwkE9w53aRMnBFx-ZWrUvDvlvjXwaYcSPU0Itky8EVka2KSS7f77hjPVZz71g~2Vpc6E8TA__&Key-Pair-Id=KL5I0C8H7HX83"
#     },
#     "thumbnail_url": "https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960209-84b2-7067-98a2-3ce4c998bf29/output/preview.png?Expires=4897324800&Signature=Uly7RtMH6jHC5lPRnqPME5Co-YfEq4T5-cCOKW7GLK32LkU~sQa4ey9jxiQ2Sz8LOIeIouZW8xxd70NdH0lvU9hDKFNKOg3P8TptNKyQ-v6-W4zdT6OMMOD~BpSfQdp-8SDWuIQHLCz-ABsS2dpiWDKFSyceiu6eKq3JvTZ8VgPuTtFxn6EKgj0B4gQ7MU7-Aqx96Qfb1Hw2aGok8tDgiBquThMdchd6peayr4vr2XVSKVOOkNRIKy2e-PVSIirvn-ZrZHItLRcFJSDxOBPWfgkLv9DBs6qJv8QPlRyzMXBfpH6LyZ2uC8JR70ZuoE7joiYvGwmJqPQC3FNvI6Mbiw__&Key-Pair-Id=KL5I0C8H7HX83",
#     "video_url": "https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960209-84b2-7067-98a2-3ce4c998bf29/output/output.mp4?Expires=4897324800&Signature=pQVwfRRmzjx4WbwYyXH2skQVEHOLs~2b-kyTjkQwWfE98ilFsFhHNqt3cE7dlww35zjVqX16COsTETAyv8rkDAg68FlVJ~66HDM0cFoObDqyi0NU5CWZpnNKEIBohsot0Y9EM~9p5u61MBjJJJfDaHUtcJen1xVR8LZpFb~2fKHf75y74v0y8ukhKBtJ-14QAXURwM1fAIpb0bKVFcWYD~Wn2Y~8XqeFZDGeHn9RaG2ExyyTydtsLEITWMYYE~zeLTE-v734PXoT2ry4wx4D1nPbFKbf2WfQZzy9yHKQ3GeBtvoSfWleW1O9D3m-dQ2WVVhjuCsZwE7G0o1mGO27hQ__&Key-Pair-Id=KL5I0C8H7HX83",
#     "texture_urls": []
# }

# sample remesh task ID
# {"result":"01960220-1de2-7292-9928-284489303618"}

# type alias for the model URL format
ModelURLFormat = Literal["glb", "fbx", "obj", "usdz", "blend", "stl"]


class RemeshTaskOptions:
    """
    A class representing the options for a remeshing task.
    """
    def __init__(self, task_id: TaskID):
        """
        Initializes a RemeshTaskOptions object.
        """
        # The ID of the input task to be remeshed
        self.input_task_id: TaskID = task_id
        # The target formats for the remeshed model
        self.__target_formats: list[ModelURLFormat] = ["glb"]
        # The topology of the remeshed model (quad or triangle)
        self.__topology: Literal["quad", "triangle"] = "triangle"
        # The target polygon count for the remeshed model
        self.__target_polycount: int = 30000
        # Resize the model to a certain height in meters (0.0 means no resize)
        self.__resize_height: float = 1.0
         # Position of the model origin (bottom or center)
        self.__origin_at: Literal["bottom", "center"] = "bottom"


    @property
    def target_formats(self) -> list[ModelURLFormat]:
        """
        Get the target formats for the remeshed model.
        """
        return self.__target_formats

    @target_formats.setter
    def target_formats(
            self,
            target_formats: list[ModelURLFormat]):
        """
        Set the target formats for the remeshed model.
        """
        if not target_formats:
            raise ValueError("Target formats must be a non-empty list")
        if not all(format in ModelURLFormat for format in target_formats):
            raise ValueError("Invalid target format")
        self.__target_formats = target_formats

    @property
    def topology(self) -> Literal["quad", "triangle"]:
        """
        Get the topology for the remeshed model.
        """
        return self.__topology

    @topology.setter
    def topology(self, topology: Literal["quad", "triangle"]):
        """
        Set the topology for the remeshed model.
        """
        if topology not in ["quad", "triangle"]:
            raise ValueError("Invalid topology")
        self.__topology = topology

    @property
    def target_polycount(self) -> int:
        """
        Get the target polygon count for the remeshed model.
        """
        return self.__target_polycount

    @target_polycount.setter
    def target_polycount(self, target_polycount: int):
        """
        Set the target polygon count for the remeshed model.
        """
        if target_polycount < 100 or target_polycount > 300_000:
            raise ValueError("Target polygon count must be between 100 and 3000000")
        self.__target_polycount = target_polycount

    @property
    def resize_height(self) -> float:
        """
        Get the resize height for the remeshed model.
        """
        return self.__resize_height

    @resize_height.setter
    def resize_height(self, resize_height: float):
        """
        Set the resize height for the remeshed model.
        """
        if resize_height < 0:
            raise ValueError("Resize height must be greater than 0")
        self.__resize_height = resize_height

    @property
    def origin_at(self) -> Literal["bottom", "center"]:
        """
        Get the origin position for the remeshed model.
        """
        return self.__origin_at

    @origin_at.setter
    def origin_at(self, origin_at: Literal["bottom", "center"]):
        """
        Set the origin position for the remeshed model.
        """
        if origin_at not in ["bottom", "center"]:
            raise ValueError("Invalid origin position")
        self.__origin_at = origin_at

    def payload(self) -> dict[str, Any]:
        """
        Returns a dictionary containing the payload for the remesh task.
        """
        return {
            "input_task_id": self.input_task_id,
            "target_formats": self.__target_formats,
            "topology": self.__topology,
            "target_polycount": self.__target_polycount,
            "resize_height": self.__resize_height,
            "origin_at": self.__origin_at
        }


def create_remesh_task(options: RemeshTaskOptions) -> TaskID:
    """
    Creates a remeshing task by sending a POST request to the Meshy API.
    This function sends a payload containing the input task ID, target formats,
    topology, target polygon count, resize height, and origin position to the
    Meshy API. It requires an API key for authorization.
    Args:
        options (RemeshTaskOptions): The options for the remesh task.
    Returns:
        str: The ID of the created remesh task.
    Raises:
        requests.exceptions.HTTPError: If the HTTP request to the API fails.
    """
    payload = options.payload()
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    response = requests.post(
        "https://api.meshy.ai/openapi/v1/remesh",
        headers=headers,
        json=payload,
        timeout=10,  # Set a timeout of 10 seconds
    )
    response.raise_for_status()

    # response.json() will return a JSON object like this:
    # {
    #   "result": "0193bfc5-ee4f-73f8-8525-44b398884ce9"
    # }
    response_remesh_task_id = response.json()["result"]

    return response_remesh_task_id


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


# sample remesh task streaming result
# {
#     'id': '01960220-1de2-7292-9928-284489303618',
#     'name': '',
#     'art_style': '',
#     'object_prompt': '',
#     'style_prompt': '',
#     'negative_prompt': '',
#     'texture_prompt': '',
#     'status': 'PENDING',
#     'created_at': 1743792381425,
#     'progress': 0,
#     'preceding_tasks': 1,
#     'started_at': 0,
#     'finished_at': 0,
#     'expires_at': 0,
#     'task_error': None,
#     'model_url': '',
#     'model_urls': {'glb': ''},
#     'thumbnail_url': '',
#     'texture_urls': None
# }
# {
#     'id': '01960220-1de2-7292-9928-284489303618',
#     'name': '',
#     'art_style': '',
#     'object_prompt': '',
#     'style_prompt': '',
#     'negative_prompt': '',
#     'texture_prompt': '',
#     'status': 'IN_PROGRESS',
#     'created_at': 1743792381425,
#     'progress': 1,
#     'started_at': 0,
#     'finished_at': 0,
#     'expires_at': 0,
#     'task_error': None,
#     'model_url': '',
#     'model_urls': {'glb': ''},
#     'thumbnail_url': '',
#     'texture_urls': None
# }
# {
#     'id': '01960220-1de2-7292-9928-284489303618',
#     'name': '',
#     'art_style': '',
#     'object_prompt': '',
#     'style_prompt': '',
#     'negative_prompt': '',
#     'texture_prompt': '',
#     'status': 'SUCCEEDED',
#     'created_at': 1743792381425,
#     'progress': 100,
#     'started_at': 1743792381606,
#     'finished_at': 1743792409130,
#     'expires_at': 1744051609130,
#     'task_error': None,
#     'model_url': '',
#     'model_urls': {
#         'glb': 'https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960220-1de2-7292-9928-284489303618/output/model.glb?Expires=1744051609&Signature=SmMkyZH~p2RbOYzNvp1WX6EFbUVJwCV5eZ8oGX3mlnHa9-PmuEGSl535TYN6y565wnzZ97vlWnH4xiMjk-SrlvaMdLXUuwo3mO402APFGY34WNt~ZBYf4q1xd7ESfxRgsGUJ1mOZJoBIKL-WKaK3bqaTb-uG1MTQP3qpti530wdH01NGhOIy6SdMSaZVw1vJ8HJGKvtpCf9Bb1N6nmpfnPcu0H0M3ZifdZ5Ihr0D0bJO1ReW4pgVn3LUYljHTjBaoMog83EndO-TORIathKYumvhhc~BGaC2rSvXdzsZYdcXe3EzYUv1GArhXrd2bufbOHpdZQjFdTXr9Mh6Jwfv9Q__&Key-Pair-Id=KL5I0C8H7HX83',
#         'fbx': 'https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960220-1de2-7292-9928-284489303618/output/model.fbx?Expires=1744051609&Signature=P1ttprm4E65hSuIBS1juUrNrbk1LO~RD-I1~E0-8o7XksSFFeAHe~OQqnh9kt5OE0j4wVF37HSQfJhAdE5s9etixEoUO5RiTOxYZuPSqm31H8LUjOSnRgowuc56zomelBrPSpLqdj7MbtL-rNt9SijmpyirLW1vi7Gu7wP8jmqgZoSwTfgiSiAEjhOJbUAfaD7XpLIVrKMgSJ-TbO~~zXetBPURAFTzdvEgc3V-umvZwGOhbrm8FiQq9R4rdGz8wuFtMAORVmDafZiDmeviQSTQ6t5u-2YiVkVMnoecZknLn9dfZS5D5pSipVGqDM63FavJnZ5ZHnNOFR3JZyd6eig__&Key-Pair-Id=KL5I0C8H7HX83'
#     },
#     'thumbnail_url': 'https://assets.meshy.ai/a489e6b0-f74b-47c9-9b8d-d6ed713f75c8/tasks/01960220-1de2-7292-9928-284489303618/output/preview.png?Expires=1744051609&Signature=a~LQN0tD5WRGncR-u5PhajEgKU23Op1Mwe7LcctUxgJGnjpORvBiO7aMtaWNSJw5emZv7gIWvQ3Ox32KjGZFCN--vvsSptdte~RngbgD7Ud~UgN9jH4lT-XcoPped9jZKIuKfJcs7hXSXxZW4R3uq-knpAXVr-z6g0Dssk9aCWc5v~4KjZldx-cPY2DhhWcxGfIdMAjYwnS8yPx5qOXsAkFk8A4zq1n3AdMAzWIxS5SSQNYPWGpucfEmFyKMkdP7~plthYTpxepANWGi-3rRhbC4NuXtxgfVUH3-2fY3uuKjmryicxJjYlZpaVUx0SwEIQFBosAE85A5rFFEO92QcQ__&Key-Pair-Id=KL5I0C8H7HX83',
#     'texture_urls': []
# }

# state transition:
# PENDING -> IN_PROGRESS -> SUCCEEDED | FAILED | CANCELED


class RemeshTaskPendingResult:
    """
    A class representing the pending result of a remesh task.
    """
    def __init__(
            self,
            task_id: TaskID,
            created_at: int,
            preceding_tasks: int):
        self.__task_id: TaskID = task_id
        self.__created_at: int = created_at
        self.__preceding_tasks: int = preceding_tasks

    @property
    def task_id(self) -> TaskID:
        """
        Get the ID of the remesh task.
        """
        return self.__task_id

    @property
    def created_at(self) -> int:
        """
        Get the creation time of the remesh task.
        """
        return self.__created_at

    @property
    def preceding_tasks(self) -> int:
        """
        Get the number of preceding tasks.
        """
        return self.__preceding_tasks


class RemeshTaskInProgressResult:
    """
    A class representing the in-progress result of a remesh task.
    """
    def __init__(
            self,
            task_id: TaskID,
            progress: int):
        self.__task_id: TaskID = task_id
        self.__progress: int = progress

    @property
    def task_id(self) -> TaskID:
        """
        Get the ID of the remesh task.
        """
        return self.__task_id

    @property
    def progress(self) -> int:
        """
        Get the progress of the remesh task.
        """
        return self.__progress


class RemeshTaskSucceededResult:
    """
    A class representing the succeeded result of a remesh task.
    """
    def __init__(
            self,
            task_id: TaskID,
            model_urls: dict[ModelURLFormat, str]):
        self.__task_id: TaskID = task_id
        self.__model_urls: dict[ModelURLFormat, str] = model_urls

    @property
    def task_id(self) -> TaskID:
        """
        Get the ID of the remesh task.
        """
        return self.__task_id

    @property
    def model_urls(self) -> dict[ModelURLFormat, str]:
        """
        Get the model URLs of the remesh task.
        """
        return self.__model_urls


class RemeshTaskFailedResult:
    """
    A class representing the failed result of a remesh task.
    """
    def __init__(self, task_id: TaskID, task_error: dict[str, str]):
        self.__task_id: TaskID = task_id
        self.__task_error: dict[str, str] = task_error

    @property
    def task_id(self) -> TaskID:
        """
        Get the ID of the remesh task.
        """
        return self.__task_id

    @property
    def task_error(self) -> dict[str, str]:
        """
        Get the task error of the remesh task.
        """
        return self.__task_error


class RemeshTaskCanceledResult:
    """
    A class representing the canceled result of a remesh task.
    """
    def __init__(self, task_id: TaskID):
        self.__task_id: TaskID = task_id

    @property
    def task_id(self) -> TaskID:
        """
        Get the ID of the remesh task.
        """
        return self.__task_id


RemeshTaskResult = Union[
    RemeshTaskPendingResult,
    RemeshTaskInProgressResult,
    RemeshTaskSucceededResult,
    RemeshTaskFailedResult,
    RemeshTaskCanceledResult
]


RemeshTaskFinishedResult = Union[
    RemeshTaskSucceededResult,
    RemeshTaskFailedResult,
    RemeshTaskCanceledResult
]


def wait_for_remesh_task(
        task_id: TaskID,
        on_pending: Callable[[RemeshTaskPendingResult], None],
        on_in_progress: Callable[[RemeshTaskInProgressResult], None],
    ) -> None | RemeshTaskFinishedResult:
    """
    Waits for the remeshing task to complete by sending a GET request to the Meshy API.
    This function streams the response and prints the status of the task until it is completed.
    Args:
        task_id (TaskID): The ID of the remesh task to wait for.
    Returns:
        None | RemeshTaskFinishedResult
        The result of the remesh task.
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "text/event-stream"
    }

    response = requests.get(
        f"https://api.meshy.ai/openapi/v1/remesh/{task_id}/stream",
        headers=headers,
        stream=True,
        timeout=10,  # Set a timeout of 10 seconds
    )

    waiting_result = None

    for line in response.iter_lines():
        if line:
            if line.startswith(b"data:"):
                data = json.loads(line.decode("utf-8")[5:])

                if data["status"] == "PENDING":
                    on_pending(RemeshTaskPendingResult(
                        task_id=data["id"],
                        created_at=data["created_at"],
                        preceding_tasks=data["preceding_tasks"]
                    ))
                elif data["status"] == "IN_PROGRESS":
                    on_in_progress(RemeshTaskInProgressResult(
                        task_id=data["id"],
                        progress=data["progress"]
                    ))
                elif data["status"] == "SUCCEEDED":
                    waiting_result = RemeshTaskSucceededResult(
                        task_id=data["id"],
                        model_urls=data["model_urls"]
                    )
                    break
                elif data["status"] == "FAILED":
                    waiting_result = RemeshTaskFailedResult(
                        task_id=data["id"],
                        task_error=data["task_error"]
                    )
                    break
                elif data["status"] == "CANCELED":
                    waiting_result = RemeshTaskCanceledResult(
                        task_id=data["id"]
                    )
                    break
                else:
                    raise ValueError(f"Invalid status: {data['status']}")

    response.close()

    return waiting_result


SAMPLE_PREVIEW_TASK_ID = "01960209-84b2-7067-98a2-3ce4c998bf29"

remesh_task_options = RemeshTaskOptions(SAMPLE_PREVIEW_TASK_ID)
remesh_task_id = create_remesh_task(remesh_task_options)
result = wait_for_remesh_task(remesh_task_id,
    on_pending=lambda pending: print(f"Pending: {pending.task_id}"),
    on_in_progress=lambda in_progress: print(f"In progress: {in_progress.progress}"),
)
result = wait_for_remesh_task(remesh_task_id,
    on_pending=lambda pending: print(f"Pending: {pending.task_id}"),
    on_in_progress=lambda in_progress: print(f"In progress: {in_progress.progress}"),
)

if result is not None:
    if isinstance(result, RemeshTaskSucceededResult):
        print(f"Succeeded: {result.model_urls}")
    elif isinstance(result, RemeshTaskFailedResult):
        print(f"Failed: {result.task_id}")
