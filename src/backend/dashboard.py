from helper_methods import get_api_url
import requests

API_URL = get_api_url()


# Function to load project metadata from the API
def load_project_metadata():
    try:
        response = requests.get(f"{API_URL}/metadata/")
        if response.status_code == 200:
            return response.json()["projects"]
        return None
    except Exception:
        return None


# Function to load interactions from the API
def load_interactions():
    try:
        response = requests.get(f"{API_URL}/interactions/")
        if response.status_code == 200:
            return response.json()
        return None
    except Exception:
        return None
