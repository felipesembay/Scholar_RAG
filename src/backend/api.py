import sys
import os

# from bace=kend.chatbot import save_logs, save_audio

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# import Settings
from backend.Settings import setup_cors_client

from configchatbot import ChatBotReact
from core.config import load_parameters
from ingestion.archives import extract_archives
from core.vectorstore import index_info_path, prune_orphan_indexes


from utils import on_error, process_files_and_store_embeddings


import time


from fastapi import FastAPI, APIRouter, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from helper_methods import (
    read_yaml_file,
    get_api_url,
    get_projects_dir,
    decrypt_password,
)
from backend.summarizer import Summarizer
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
import tempfile
import shutil
import json
import ast


if "chatbots" not in globals():
    chatbots = {}


# Constants
FLAG_SAVE_FILE = False


app = FastAPI()


def prune_project_indexes():
    """Best-effort cleanup of Elasticsearch indexes left behind by deleted/updated projects."""
    try:
        deleted = prune_orphan_indexes(get_projects_dir())
        if deleted:
            print(f"[INFO] Índices órfãos removidos: {deleted}")
    except Exception as e:
        print(f"[WARNING] Limpeza de índices falhou: {e}")


@app.on_event("startup")
async def prune_indexes_on_startup():
    prune_project_indexes()

# CORS origins
origins = get_api_url()


class LogRequest(BaseModel):
    project_name: str
    user_input: str
    result_text: str


# add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origins],  # Note: should be a list
    # allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_cors_client(app)


# Create routers
summarizer_router = APIRouter()
dashboard_router = APIRouter()
faq_page_router = APIRouter()
projects_router = APIRouter()
status_router = APIRouter()
log_router = APIRouter()
interactions_router = APIRouter()

chatbot_msg = APIRouter()


@chatbot_msg.post("/chatbot_msg/")
async def msg_chat_project(
    project_name: str = Form(...),
    temperature: float = Form(...),
    similarity: float = Form(...),
    debug_mode: str = Form(...),
    flag_download: str = Form(...),
    user_input: str = Form(...),
    use_param: Optional[str] = Form(None),
):
    try:
        # global chatbots

        if project_name in chatbots:

            try:
                file_path = os.path.join(
                    os.getcwd(), "src", "parameters", "artifacts.yaml"
                )
                parameters = read_yaml_file(file_path)

            except Exception:
                file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
                parameters = read_yaml_file(file_path)

            if use_param and use_param == "Sim":
                # Caso as outras variáveis sejam colocadas no arquivo artfacts.yaml
                # precisa atualizar os 3 parâmetros inibidos
                # temperature = 0.0
                # debug_mode  = "Não"
                similarity = parameters["Model"]["similarity_search"].get(
                    "threshold_default"
                )
                # download    = "Não"
            else:
                # Caso não seja passado ou seja o valor 'N', então irá carregar os parâmetros
                # da própria chamada da API (caso se use uma tela no frontend)
                pass

            bot: ChatBotReact = chatbots[project_name]["chatbot"]
            # print("Estou aqui, antes de ist_messages: List[Dict[str, str]]..........................")
            list_messages: List[Dict[str, str]] = chatbots[project_name]["messages"]

            if user_input and user_input != "":
                chatbots[project_name]["messages"].append(
                    {"role": "user", "content": user_input}
                )

            # list of messages
            list_messages = chatbots[project_name]["messages"]
            if list_messages[-1]["role"] != "assistant":
                result_dict = bot.generate_response(
                    list_messages[:-1],
                    user_input,
                    debug_mode,
                    temperature,
                    similarity,
                    flag_download,
                )
                response = result_dict["Response"]

                # Update documents
                docs = result_dict.get("Documents", [])
                chatbots[project_name]["last_docs"] = docs

                # Save log to text
                plus = ""

                try:
                    plus = ""
                    PROJECTS_DIR = get_projects_dir()
                    log_path = os.path.join(PROJECTS_DIR, project_name, "logs")
                    os.makedirs(log_path, exist_ok=True)
                    log_file = os.path.join(
                        log_path, f"chat_log_{datetime.now().strftime("%Y_%m_%d")}.json"
                    )
                    log_entry = {
                        "timestamp": datetime.now().isoformat(),
                        "user_input": user_input,
                        "bot_response": result_dict["Response"],
                    }
                    with open(log_file, "a", encoding="utf-8") as f:
                        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

                except Exception as e:
                    plus = "|[ERRO DE LOG]"
                    print(
                        "Não foi possível criar os LOGs do Chat. Verifique: " + str(e)
                    )

                # Append the assistant's response to the messages
                chatbots[project_name]["messages"].append(
                    {"role": "assistant", "content": response}
                )

                return JSONResponse(
                    content={
                        "status": "[OK]" + plus.strip(),
                        "response": response,
                        "docs": docs,
                        # numbered sources behind the #src-n citation links in the response
                        "sources": result_dict.get("Sources", []),
                    }
                )

                # verificar se o downloaa de documento ira ficar nesta parte ou na interface
                # Show documents related to the response
                # chatbots[project_name]["messages"] = list_messages

    except Exception as e:
        return JSONResponse(content={"error ": str(e)}, status_code=500)


chatbot_init = APIRouter()


@chatbot_init.post("/chatbot_init/")
async def init_chat_project(project_name: str = Form(...)):

    try:
        global chatbots
        # # load file parameters
        # try:
        #     file_path = os.path.join(
        #         os.getcwd(), "src", "parameters", "artifacts.yaml"
        #     )
        #     #parameters = read_yaml_file(file_path)

        # except Exception:
        #     file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
        #     #parameters = read_yaml_file(file_path)

        if project_name not in chatbots:
            chat = ChatBotReact(project_name)
            chatbots[project_name] = {
                "chatbot": chat,
                "messages": [
                    {
                        "role": "assistant",
                        "content": chat.TEXT_ENTER_CHAT,
                    }
                ],
                "last_docs": [],
            }

        else:
            pass

        return JSONResponse(content={"status": "[OK]", "project_name": project_name})

    except Exception as e:
        return JSONResponse(content={"error ": str(e)}, status_code=500)


projects_info = APIRouter()


@projects_info.post("/projects_info/")
async def get_info_project(project_name: str = Form(...)):
    PROJECTS_DIR = get_projects_dir()

    project_path = os.path.join(PROJECTS_DIR, project_name)
    metadata_path = os.path.join(project_path, "metadata.json")
    faiss_path = os.path.join(project_path, "faiss_db/index.faiss")

    try:

        infos: str

        qtd_space = 0
        project_files = os.path.join(project_path, "files")
        if os.path.exists(project_files):
            for file in os.listdir(project_files):
                archive_path = os.path.join(project_files, file)
                qtd_space += os.path.getsize(archive_path)
        else:
            qtd_space = 0

        with open(metadata_path, "r", encoding="utf-8") as f:
            infos = f.read()
        f.close()

        json_dict = json.loads(infos)
        project_owner = json_dict.get(
            "project_owner", "[ERRO] - Dono do Projeto Não especificado!"
        )
        has_password = json_dict.get(
            "flag_password", "[ERRO] - Tipo de Senha Não especificada!"
        )
        # create_date = json_dict.get("creation_date", "[ERRO] - Data de Criação Não especificada!")
        qtd_files = 0
        qtd_words = 0

        for chave in json_dict.get("files", []):
            qtd_files += 1
            qtd_words += int(chave["word_count"])

        if os.path.exists(project_path):
            create_date = datetime.fromtimestamp(
                os.path.getctime(project_path)
            ).strftime("%Y-%m-%d %H:%M:%S")
        else:
            create_date = "1900-01-01 00:00:00"

        if os.path.exists(index_info_path(project_path)):
            faiss_path = index_info_path(project_path)
        if os.path.exists(faiss_path):
            last_update = datetime.fromtimestamp(os.path.getmtime(faiss_path)).strftime(
                "%Y-%m-%d %H:%M:%S"
            )
        else:
            last_update = "1900-01-01 00:00:00"

        return JSONResponse(
            content={
                "project_name": project_name,
                "project_owner": project_owner,
                "has_password": has_password,
                "qtd_documents": qtd_files,
                "qtd_words": qtd_words,
                "create_date": create_date,
                "last_update": last_update,
                "total_size": qtd_space,
            }
        )

    except Exception as e:
        return JSONResponse(content={"error ": str(e)}, status_code=500)


projects_delete = APIRouter()


@projects_delete.delete("/projects_delete/")
async def delete_file_project(project_name: str = Form(...)):
    PROJECTS_DIR = get_projects_dir()

    try:
        try:
            shutil.rmtree(
                os.path.join(PROJECTS_DIR, project_name),
                onerror=on_error,
            )
            time.sleep(2)
            prune_project_indexes()
            return {"[OK]": "Projeto " + project_name + " excluído com sucesso!"}

        except Exception as e:
            return JSONResponse(
                content={
                    "error ": "Erro ao tentar Excluir o Projeto: "
                    + project_name
                    + " - erro: "
                    + str(e)
                    + "!"
                },
                status_code=500,
            )
            # return {"Erro": "Erro ao tentar Excluir o Projeto: " + str(e) + "!"}

    except Exception as e:
        return JSONResponse(content={"error ": str(e)}, status_code=500)


projects_update = APIRouter()


@projects_update.put("/projects_update/")
async def update_file_project(
    project_name: str = Form(...),
    user_name: str = Form(...),
    password: str = Form(...),
    upload_method: str = Form(...),
    files: List[UploadFile] = File(...),
):
    PROJECTS_DIR = get_projects_dir()

    try:
        project_folder = os.path.join(PROJECTS_DIR, project_name)
        files_path = os.path.join(project_folder, "files")

        # Backup project folder if it exists
        backup_dir = None
        if os.path.exists(project_folder):
            try:
                backup_dir = tempfile.mkdtemp(prefix="project_backup_")
                backup_path = os.path.join(backup_dir, os.path.basename(project_folder))
                shutil.copytree(project_folder, backup_path)
                shutil.rmtree(project_folder, onerror=on_error)
            except Exception as e:
                return JSONResponse(
                    content={
                        "error ": "Erro ao criar a Pasta de Backup - erro: "
                        + str(e)
                        + "!"
                    },
                    status_code=500,
                )

        os.makedirs(project_folder, exist_ok=True)
        os.makedirs(files_path, exist_ok=True)

        if upload_method == "manual":
            for file in files:
                # Save file (zips are unpacked below, nested folders flattened)
                file_path = os.path.join(files_path, os.path.basename(file.filename))
                buffer = await file.read()
                with open(file_path, "wb") as f:
                    f.write(buffer)
            extract_archives(files_path)

        # count files
        file_count = len(
            [
                f
                for f in os.listdir(files_path)
                if os.path.isfile(os.path.join(files_path, f))
            ]
        )

        if file_count == 0:
            shutil.rmtree(project_folder, onerror=on_error)
            time.sleep(3)
            return JSONResponse(
                content={
                    "error ": "Nenhum arquivo encontrado na pasta: " + files_path + "!"
                },
                status_code=500,
            )
        elif file_count == 1:
            frase = "arquivo"
        else:
            frase = "arquivos"

        flag_success = process_files_and_store_embeddings(
            project_name, user_name, password
        )

        if not FLAG_SAVE_FILE and load_parameters()["OPTIONS"]["delete_files"]:
            try:
                # Loop through all entries in the folder
                for filename in os.listdir(files_path):
                    file_path = os.path.join(files_path, filename)
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
                # remove folder
                shutil.rmtree(files_path, onerror=on_error)
            except Exception:
                pass

        if flag_success:
            time.sleep(3)
            prune_project_indexes()
            return {"[OK]": "Projeto " + project_name + " atualizado com sucesso!"}

        else:
            if os.path.exists(project_folder) and os.path.isdir(project_folder):
                shutil.rmtree(project_folder, onerror=on_error)
            time.sleep(3)
            return JSONResponse(
                content={
                    "error ": "Projeto "
                    + project_name
                    + " não foi criado devido a problemas nos arquivos!"
                },
                status_code=500,
            )

    except Exception as e:
        project_path = os.path.join(PROJECTS_DIR, project_name)

        # Rollback if backup exists
        if backup_dir and os.path.exists(backup_path):
            try:
                if os.path.exists(project_path):
                    shutil.rmtree(project_path, onerror=on_error)
                shutil.copytree(backup_path, project_path)
            except Exception:
                pass
        else:
            try:
                shutil.rmtree(project_path, onerror=on_error)
            except Exception:
                pass

        try:
            shutil.rmtree(backup_dir, onerror=on_error)
        except Exception:
            pass

        return JSONResponse(content={"error ": str(e)}, status_code=500)


projects_chk_pass = APIRouter()


@projects_chk_pass.post("/projects_chk_pass/")
async def chk_password(
    project_name: str = Form(...), password: Optional[str] = Form(None)
):
    PROJECTS_DIR = get_projects_dir()

    try:
        try:
            file_path = os.path.join(os.getcwd(), "src", "parameters", "artifacts.yaml")
            parameters = read_yaml_file(file_path)
        except Exception:
            file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
            parameters = read_yaml_file(file_path)

        project_metadata_path = os.path.join(
            PROJECTS_DIR, project_name, "metadata.json"
        )
        if os.path.exists(project_metadata_path):
            with open(project_metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)

            flag_password = metadata["flag_password"]
            project_password = metadata["password"].strip()

            project_password = decrypt_password(
                project_password, parameters["ADMIN"]["secret"]
            ).strip()

            if flag_password:
                password = password
            else:
                password = ""

            password = password.strip()
            PASSWORD_ADMIN = parameters["ADMIN"]["admin"]
            if (
                flag_password
                and password != project_password
                and password != PASSWORD_ADMIN
            ):
                return JSONResponse(content={"password": "FALSE"})
            else:
                return JSONResponse(content={"password": "TRUE"})

        else:
            return JSONResponse(
                content={
                    "error ": "Não existem metadados para o projeto"
                    + project_name
                    + "!"
                },
                status_code=500,
            )

    except Exception as e:
        return JSONResponse(content={"error ": str(e)}, status_code=500)


projects_save = APIRouter()


@projects_save.post("/save_project/")
async def save_project(
    project_name: str = Form(...),
    user_name: str = Form(...),
    password: str = Form(...),
    upload_method: str = Form(...),
    prompt: Optional[str] = Form(None),
    prompt_mode: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
):
    PROJECTS_DIR = get_projects_dir()
    try:
        # create project folder
        project_folder = os.path.join(PROJECTS_DIR, project_name)
        prompt_path = os.path.join(PROJECTS_DIR, project_name, "prompts")
        files_path = os.path.join(project_folder, "files")

        os.makedirs(files_path, exist_ok=True)
        if upload_method == "manual":
            for file in files:
                # Save file (zips are unpacked below, nested folders flattened)
                file_path = os.path.join(files_path, os.path.basename(file.filename))
                buffer = await file.read()
                with open(file_path, "wb") as f:
                    f.write(buffer)
            extract_archives(files_path)

        # save prompt
        if prompt != "":
            os.makedirs(prompt_path, exist_ok=True)
            path_prompt_file = os.path.join(prompt_path, "prompt_app.txt")
            path_prompt_mode = os.path.join(prompt_path, "prompt_mode.txt")

            # save prompt file
            with open(path_prompt_file, "w", encoding="utf-8") as f:
                f.write(prompt)

            # save prompt mode
            prompt_mode = prompt_mode.strip()
            with open(path_prompt_mode, "w", encoding="utf-8") as f:
                f.write(f"MODE: {prompt_mode}")

        # count files
        file_count = len(
            [
                f
                for f in os.listdir(files_path)
                if os.path.isfile(os.path.join(files_path, f))
            ]
        )

        if file_count == 0:
            shutil.rmtree(project_folder, onerror=on_error)
            time.sleep(3)
            return JSONResponse(
                content={
                    "error ": "Nenhum arquivo encontrado na pasta: " + files_path + "!"
                },
                status_code=500,
            )

        elif file_count == 1:
            frase = "arquivo"
        else:
            frase = "arquivos"

        flag_success = process_files_and_store_embeddings(
            project_name, user_name, password
        )

        if not FLAG_SAVE_FILE and load_parameters()["OPTIONS"]["delete_files"]:
            try:
                # Loop through all entries in the folder
                for filename in os.listdir(files_path):
                    file_path = os.path.join(files_path, filename)
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
                # remove folder
                shutil.rmtree(files_path, onerror=on_error)
            except Exception:
                pass

        if flag_success:
            time.sleep(2)
            results = []
            results.append(
                {
                    "project_name": project_name,
                    "user_name": user_name,
                    # "password": password,
                    "upload_method": upload_method,
                    "prompt": prompt,
                }
            )
            return JSONResponse(content={"results": results})
        else:
            print(
                f"Projeto '{project_name}' não foi criado devido a problemas nos arquivos."
            )
            if os.path.exists(project_folder) and os.path.isdir(project_folder):
                shutil.rmtree(project_folder, onerror=on_error)
            time.sleep(3)
            return JSONResponse(
                content={
                    "error ": "O Projeto "
                    + project_name
                    + " não foi criado devido a problemas nos arquivos!"
                },
                status_code=500,
            )

    except Exception as e:
        return JSONResponse(content={"error ": str(e)}, status_code=500)


get_existsproject = APIRouter()


@get_existsproject.post("/exists_project/")
async def exists_project(project_name: str = Form(...)):

    PROJECTS_DIR = get_projects_dir()

    try:
        if os.path.exists(os.path.join(PROJECTS_DIR, project_name)):
            return JSONResponse(content={"project": "TRUE"})
        else:
            return JSONResponse(content={"project": "FALSE"})
    except Exception as e:
        return JSONResponse(content={"error ": str(e)}, status_code=500)


get_enviroment_var_router = APIRouter()


@get_enviroment_var_router.get("/load_enviroment/")
async def load_vars():
    # Lista de variáveis a serem carregadas (pode ser incrementada)

    try:
        file_path = os.path.join(os.getcwd(), "src", "parameters", "artifacts.yaml")
        config = read_yaml_file(file_path)
    except Exception:
        file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
        config = read_yaml_file(file_path)
    PROJECTS_DIR = get_projects_dir()

    backend_env = []
    backend_env.append(
        {
            "url_back": get_api_url(), #- Usado em ambiente de desenvolvimento
            #"url_back": "/api",  # Usado em ambiente de produção com Docker
            "suburl_getprojets": "/projects/",
            "suburl_summarize": "/summarize/",
            "suburl_existprj": "/exists_project/",
            "suburl_saveprj": "/save_project/",
            "suburl_faq": "/faq/",
            # "projects_dir": get_projects_dir(),
            "suburl_updateprj": "/projects_update/",
            "suburl_deleteprj": "/projects_delete/",
            "suburl_loadprjs": "/metadata/",
            "suburl_chkpass": "/projects_chk_pass/",
            "suburl_infoprj": "/projects_info/",
            "suburl_initchatprj": "/chatbot_init/",
            "suburl_msgchatprj": "/chatbot_msg/",
            "suburl_getinteractprj": "/interactions/",
            "projects_dir": PROJECTS_DIR,
        }
    )
    return JSONResponse(content={"backend_env": backend_env})


# Summarize endpoint
@summarizer_router.post("/summarize/")
async def summarize_endpoint(
    word_limit: int = Form(...),
    summarize_all: bool = Form(...),
    additional_info: str = Form(""),
    files: List[UploadFile] = File(...),
    parameters: Optional[str] = Form(None),
):
    try:
        if parameters and "key" in parameters:
            parameters = ast.literal_eval(parameters)
        else:
            # read data
            try:
                file_path = os.path.join(
                    os.getcwd(), "src", "parameters", "artifacts.yaml"
                )
                data = read_yaml_file(file_path)
            except Exception:
                file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
                data = read_yaml_file(file_path)

            # parameters
            parameters = {
                "key": data["Model"]["key"],
                "model_name": data["Model"]["model_name"],
            }

        # Validate word_limit
        with tempfile.TemporaryDirectory() as temp_dir:
            file_paths = []
            for file in files:
                file_path = os.path.join(temp_dir, file.filename)
                with open(file_path, "wb") as f:
                    shutil.copyfileobj(file.file, f)
                file_paths.append(file_path)

            summarizer = Summarizer(parameters)
            result = summarizer.process_documents(
                file_paths, word_limit, summarize_all, additional_info
            )

        return JSONResponse(content={"summaries": result})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# Dashboard endpoint
@dashboard_router.get("/metadata/", response_class=JSONResponse)
async def get_dashboard_metadata():
    try:
        # projects dir
        PROJECTS_DIR = get_projects_dir()
        # return JSONResponse(content={"Docker em uso": PROJECTS_DIR})

        # iterate projects
        projects = []
        for project_name in os.listdir(PROJECTS_DIR):
            project_path = os.path.join(PROJECTS_DIR, project_name)
            metadata_path = os.path.join(project_path, "metadata.json")

            if os.path.isdir(project_path) and os.path.exists(metadata_path):
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                    projects.append(metadata)

        return JSONResponse(content={"projects": projects})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@interactions_router.get("/interactions/", response_class=JSONResponse)
async def get_interactions():
    try:
        projects_dir = get_projects_dir()
        projects = [
            p
            for p in os.listdir(projects_dir)
            if os.path.isdir(os.path.join(projects_dir, p))
        ]

        records = []

        for project in projects:
            logs_path = os.path.join(projects_dir, project, "logs")
            if not os.path.exists(logs_path):
                continue

            for filename in os.listdir(logs_path):
                if filename.startswith("chat_log_") and filename.endswith(".json"):
                    date_str = filename[len("chat_log_") : -len(".json")]
                    try:
                        date = datetime.strptime(date_str, "%Y_%m_%d").date()
                    except Exception:
                        continue

                    file_path = os.path.join(logs_path, filename)
                    with open(file_path, "r", encoding="utf-8") as f:
                        count = sum(1 for line in f if line.strip())

                    records.append(
                        {
                            "project_name": project,
                            "date": date.isoformat(),
                            "interactions": count,
                        }
                    )

        if not records:
            return JSONResponse(
                content={
                    "total_per_project": {},
                    "total_over_time": [],
                    "per_project_over_time": [],
                }
            )

        # Aggregate total interactions per project
        total_per_project: Dict[str, int] = {}
        for rec in records:
            total_per_project[rec["project_name"]] = (
                total_per_project.get(rec["project_name"], 0) + rec["interactions"]
            )

        # Aggregate total interactions per date (all projects)
        total_over_time_map: Dict[str, int] = {}
        for rec in records:
            total_over_time_map[rec["date"]] = (
                total_over_time_map.get(rec["date"], 0) + rec["interactions"]
            )
        total_over_time = [
            {"date": k, "interactions": v}
            for k, v in sorted(total_over_time_map.items())
        ]

        # per project over time is basically records sorted by date, project_name
        per_project_over_time = sorted(
            records, key=lambda r: (r["project_name"], r["date"])
        )

        return JSONResponse(
            content={
                "total_per_project": total_per_project,
                "total_over_time": total_over_time,
                "per_project_over_time": per_project_over_time,
            }
        )

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# Projects endpoint
@projects_router.get("/projects/", response_class=JSONResponse)
async def get_projects():
    try:
        # projects dir
        PROJECTS_DIR = get_projects_dir()

        # get projects
        list_projects = [
            d
            for d in os.listdir(PROJECTS_DIR)
            if os.path.isdir(os.path.join(PROJECTS_DIR, d))
        ]
        return JSONResponse(content={"projects": list_projects})

    except FileNotFoundError:
        return JSONResponse(content={"projects": []})


@faq_page_router.get("/faq/", response_class=JSONResponse)
async def get_faq():
    try:
        # read yaml file
        try:
            file_path = os.path.join(os.getcwd(), "src", "parameters", "faq.yaml")
            data = read_yaml_file(file_path)
        except Exception:
            file_path = os.path.join(os.getcwd(), "parameters", "faq.yaml")
            data = read_yaml_file(file_path)

        # faq data
        faq_data = data["faq"]

        return JSONResponse(content={"faq": faq_data})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@log_router.post("/logs/", response_class=JSONResponse)
async def save_logs(request: LogRequest):
    try:
        PROJECTS_DIR = get_projects_dir()
        log_path = os.path.join(PROJECTS_DIR, request.project_name, "logs")

        os.makedirs(log_path, exist_ok=True)

        log_file = os.path.join(
            log_path, f"chat_log_{datetime.now().strftime("%Y_%m_%d")}.json"
        )
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_input": request.user_input,
            "bot_response": request.result_text,
        }

        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

        return JSONResponse(content={"message": "Log saved successfully."})

    except Exception:
        return JSONResponse(content={"error": "Log file not found."}, status_code=500)


@status_router.get("/status/", response_class=JSONResponse)
async def get_status():
    try:
        return JSONResponse(content={"message": "API está em execução."})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# Register routers with the app
app.include_router(summarizer_router, tags=["Summarizer"])
app.include_router(dashboard_router, tags=["Dashboard"])
app.include_router(projects_router, tags=["Projects"])
app.include_router(faq_page_router, tags=["FAQ"])
app.include_router(log_router, tags=["Logs"])
app.include_router(status_router, tags=["Status"])
app.include_router(interactions_router, tags=["Interactions"])

app.include_router(get_enviroment_var_router, tags=["Integration Enviroment Variables"])
app.include_router(get_existsproject, tags=["Project Exists"])
app.include_router(projects_save, tags=["Save Project"])
app.include_router(projects_chk_pass, tags=["Check Password for Project"])
app.include_router(projects_update, tags=["Update Project"])
app.include_router(projects_delete, tags=["Delete Project"])
app.include_router(projects_info, tags=["Retrive Informations from Project"])
app.include_router(chatbot_init, tags=["Initialize ChatBot for the project"])
app.include_router(chatbot_msg, tags=["Chat with RAG for the project"])

# Academic layer (library, citations, references, author results)
from backend.academic_api import router as academic_router  # noqa: E402

app.include_router(academic_router)
