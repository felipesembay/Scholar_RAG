from helper_methods import get_api_url
import requests

API_URL = get_api_url()


# Function to load FAQ from the API
def load_faq():
    try:
        response = requests.get(f"{API_URL}/faq/")
        if response.status_code == 200:
            return response.json()["faq"]
        return None
    except Exception:
        return None
