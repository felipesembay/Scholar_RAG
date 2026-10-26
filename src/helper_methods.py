from cryptography.fernet import Fernet
import platform
import base64
import yaml
import re
import os

# Set environment variable explicitly for Tesseract (make sure it's correct for Windows)
if platform.system() == "Windows":
    TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
else:
    TESSERACT_CMD = "/usr/bin/tesseract"  # tessdata found by tesseract itself (v4 or v5)


def _load_dotenv():
    """Loads the project .env into os.environ without overriding existing vars."""
    try:
        from dotenv import find_dotenv, load_dotenv
    except ImportError:
        return
    load_dotenv(find_dotenv(usecwd=True), override=False)


def _expand_env(value):
    """Recursively replaces ${VAR} placeholders with environment variable values."""
    if isinstance(value, dict):
        return {k: _expand_env(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_expand_env(v) for v in value]
    if isinstance(value, str):
        return re.sub(r"\$\{(\w+)\}", lambda m: os.environ.get(m.group(1), ""), value)
    return value


def read_yaml_file(file_path):
    """Reads a YAML file and returns its contents as a dictionary.

    Secrets stay out of the YAML as ${VAR} placeholders, resolved from .env / environment.
    """
    _load_dotenv()
    with open(file_path, "r", encoding="utf-8") as file:
        data = yaml.safe_load(file)
    return _expand_env(data)


def get_llm_response(prompt: str, parameters: dict, temperature: float = 0) -> str:
    """
    Sends a prompt to the configured LLM and returns the response.

    Args:
        prompt (str): The prompt to send to the API.
        parameters (dict): Kept for backward compatibility; LLM config comes from core.llm.
        temperature (float): The temperature setting for the API request.

    Returns:
        str: The response from the LLM.
    """
    from core.llm import chat_completion  # local import: core.config imports this module

    return chat_completion([{"role": "user", "content": prompt}], temperature=temperature)


def encrypt_password(password: str, key: str) -> str:
    """Encrypt and store the password in a Base64-encoded format.
    Args:
        password (str): The password to encrypt.
        key (str): The encryption key.

    Returns:
        str: The Base64-encoded encrypted password.
    """
    try:
        fernet = Fernet(key)

        # Encrypt the password
        encrypted_password = fernet.encrypt(password.encode())

        # Encode in Base64 and return
        encrypted_password_b64 = base64.b64encode(encrypted_password).decode("utf-8")
        return encrypted_password_b64
    except Exception as e:
        print(f"[ERROR] encrypting password: {e}")
        return ""


def decrypt_password(password_b64: str, key: str) -> str:
    """Retrieve and decrypt the Base64-encoded password.
    Args:
        password_b64 (str): The Base64-encoded encrypted password.
        key (str): The decryption key.

        Returns:
        str: The decrypted password.
    """
    try:
        fernet = Fernet(key)

        # Ensure proper Base64 padding (if needed)
        missing_padding = len(password_b64) % 4
        if missing_padding:
            password_b64 += "=" * (4 - missing_padding)

        # Decode the Base64 string
        encrypted_password = base64.b64decode(password_b64.encode("utf-8"))
        decrypted_password = fernet.decrypt(encrypted_password).decode("utf-8")
        return decrypted_password

    except Exception as e:
        return ""


# Function to extract text from different file types
def extract_text_from_file(file_path):
    """Extracts text from any supported format (OCR included) via the ingestion pipeline."""
    from ingestion import document_text, parse_file  # local import: ingestion imports this module

    try:
        parsed = parse_file(file_path)
        text = document_text(parsed) if parsed else ""
        return text if len(text) > 5 else None
    except Exception:
        return None


def get_api_url():
    try:
        with open("/proc/1/cgroup", "rt") as f:
            if any("docker" in line for line in f):
                # get api url from environment variable
                return os.getenv("API_URL", "http://fastapi:8000").split(",")[0]
            else:
                return os.getenv("API_URL", "http://localhost:8000").split(",")[0]
    except Exception:
        return "http://localhost:8000"


def get_projects_dir():
    """
    Returns the path to the projects directory based on the operating system.

    Returns:
        str: The path to the projects directory.
    """

    if platform.system() == "Windows":
        return "projects"
    else:
        # Caminho absoluto: independe do diretório de trabalho do processo
        # pois ambos têm o volume .:/app mapeado; PROJECTS_DIR permite rodar fora do Docker
        return os.environ.get("PROJECTS_DIR", "/app/projects")


