from datetime import datetime
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document as langchain_Document
from core.vectorstore import build_vectorstore
from academic.indexing import parse_results, prepare_documents
from ingestion import document_text, parse_file


from helper_methods import get_api_url, get_projects_dir

# from gtts import gTTS
import requests


from helper_methods import encrypt_password, read_yaml_file
from typing import Tuple, Dict
from docx import Document
import pandas as pd
import pdfplumber
import stat
import json
import os
import re


API_URL = get_api_url()


# Function to save logs to the API
async def save_logs_react(project_name: str, user_input: str, result_text: str):
    try:
        response = await requests.post(
            f"{API_URL}/logs/",
            json={
                "project_name": project_name,
                "user_input": user_input,
                "result_text": result_text,
            },
        )
        if response.status_code == 200:
            return True
        return False
    except Exception as e:
        return False


def on_error(func, path, exc_info):
    """Error handler for read-only files."""
    os.chmod(path, stat.S_IWRITE)
    func(path)


# Function to extract text and word count from various file formats
def extract_text_and_word_count(file_path: str) -> Tuple[str, int]:
    """
    Extracts text content and word count from various file formats.

    Args:
        file_path (str): Path to the input file.

    Returns:
        Tuple[str, int]: Extracted text content and the corresponding word count.
    """
    text = ""
    try:
        if file_path.endswith(".pdf"):
            with pdfplumber.open(file_path) as pdf:
                text = "\n".join(
                    [page.extract_text() for page in pdf.pages if page.extract_text()]
                )
        elif file_path.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        elif file_path.endswith(".csv"):
            df = pd.read_csv(file_path, encoding="utf-8")
            text = df.to_string()
        elif file_path.endswith(".xlsx"):
            df = pd.read_excel(file_path, engine="openpyxl")
            text = df.to_string()
        elif file_path.endswith(".docx"):
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
        elif file_path.endswith(".json"):
            with open(file_path, "r", encoding="utf-8") as f:
                text = json.dumps(json.load(f))

        # check text
        if text and len(text) > 0:
            text = re.sub(r"\s+", " ", text).strip()
            return text, len(text)
        else:
            return None, 0

    except Exception:
        return None, 0


def save_context_database(project_name: str, dict_parsed: dict, total_word_count: int) -> None:
    """
    Saves parsed documents either as a plain text KB (single small file) or as a vector index.

    Args:
        project_name (str): Name of the project.
        dict_parsed (dict): Filename -> ingestion.models.ParsedDocument.
        total_word_count (int): Total text length of all parsed documents.
    """
    # load file parameters
    try:
        file_path = os.path.join(os.getcwd(), "src", "parameters", "artifacts.yaml")
        parameters = read_yaml_file(file_path)
    except Exception:
        file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
        parameters = read_yaml_file(file_path)

    PROJECTS_DIR = get_projects_dir()
    project_dir = os.path.join(PROJECTS_DIR, project_name)

    # KB
    results = parse_results(project_dir)
    if (
        len(dict_parsed) == 1
        and not results
        and total_word_count <= parameters["Model"]["max_word_count_kb"]
    ):
        kb_path = os.path.join(project_dir, "KB.txt")
        with open(kb_path, "w", encoding="utf-8") as file:
            file.write(document_text(next(iter(dict_parsed.values()))))

    # Context (vector DB): literature (library + citekeys) + the author's results
    else:
        documents = prepare_documents(project_dir, list(dict_parsed.values()), parameters, results)
        build_vectorstore(project_dir, documents)


def process_files_and_store_embeddings(
    project_name: str, project_owner: str, password: str
) -> None:
    """
    Processes uploaded files, extracts content, and stores embeddings.

    Args:
        project_name (str): Name of the project.
        project_owner (str): Owner of the project.
    """
    # load file parameters
    try:
        file_path = os.path.join(os.getcwd(), "src", "parameters", "artifacts.yaml")
        parameters = read_yaml_file(file_path)
    except Exception:
        file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
        parameters = read_yaml_file(file_path)

    PROJECTS_DIR = get_projects_dir()
    project_path = os.path.join(PROJECTS_DIR, project_name)
    files_path = os.path.join(project_path, "files")
    metadata_path = os.path.join(project_path, "metadata.json")

    # create dir
    os.makedirs(project_path, exist_ok=True)

    # flag password
    if password == "":
        flag_password = False
    else:
        flag_password = True

    try:

        # create metadata
        metadata: Dict[str, any] = {
            "project_name": project_name,
            "project_owner": project_owner,
            "flag_password": flag_password,
            "password": encrypt_password(password, parameters["ADMIN"]["secret"]),
            "creation_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "files": [],
        }

        total_word_count = 0
        qtd_projects = 0
        dict_projects_text = {}
        for file_name in os.listdir(files_path):
            file_path = os.path.join(files_path, file_name)
            try:
                parsed = parse_file(file_path)
            except Exception as e:
                print(f"[WARNING] Falha ao ler {file_name}: {e}")
                continue
            text = document_text(parsed) if parsed else ""
            if len(text) <= 5:
                continue
            word_count = len(text)  # characters, as before (max_word_count_kb compares this)
            qtd_projects += 1
            total_word_count += word_count
            dict_projects_text[file_name] = parsed
            metadata["files"].append(
                {
                    "file_name": file_name,
                    "word_count": word_count,
                    "parser": parsed.parser,
                    "ocr_pages": len(parsed.ocr_pages),
                    **{k: parsed.metadata[k] for k in ("title", "doi", "year") if k in parsed.metadata},
                }
            )

        # save metadata
        if qtd_projects > 0:

            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4)

            # save files
            save_context_database(project_name, dict_projects_text, total_word_count)
            return True
        else:
            return False

    except Exception as e:
        print("Erro ao processar os arquivos:" + str(e))
        return False
