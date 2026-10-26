from helper_methods import get_api_url
import requests

API_URL = get_api_url()


# Function to load projects from the API
def load_projects():
    try:

        response = requests.get(f"{API_URL}/projects/")
        if response.status_code == 200:
            return response.json()["projects"]
        return None
    except Exception:
        return None
