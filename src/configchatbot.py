from prompts.prompts import (
    PROMPT_CHATBOT,
    PROMPT_GUARDRAIL,
    PROMPT_REGULAR_REPLY,
    PROMPT_KB,
    TEXT_CANT_REPLY,
    TEXT_ENTER_CHAT,
    TEXT_END_CONTEXT_PROMPT,
    TEXT_END_KB_PROMPT,
    TEXT_END_REGULAR_PROMPT,
)
from helper_methods import get_projects_dir, read_yaml_file
from parameters.offensive_words import LIST_OFFENSIVE_WORDS
from core.vectorstore import load_vectorstore
from academic.grounded import grounded_answer
from core.llm import chat_completion
from core.reranker import rerank
from unidecode import unidecode
from typing import List

import re
import os


class ChatBotReact:
    """
    A chatbot for handling user interactions, retrieving relevant documents,
    and gen
    erating AI responses using OpenAI's LLM and FAISS for vector-based retrieval.
    """

    # _instance = None
    # _initialized = False
    # def __new__(cls, project_name: str):
    #     """
    #     Initializes the ChatBot with project-specific settings.

    #     Args:
    #         project_name (str): Name of the project to load FAISS database.
    #     """
    #     if cls._instance is None:
    #         cls._instance = super(ChatBotReact, cls).__new__(cls)
    #     return cls._instance

    def __init__(self, project_name: str) -> None:
        # if self.__class__._initialized and getattr(self, "project_name", None) == project_name:
        #     return  # Já inicializado para este projeto
        # # ... (restante do seu __init__ atual)

        # load file parameters
        try:
            file_path = os.path.join(os.getcwd(), "src", "parameters", "artifacts.yaml")
            parameters = read_yaml_file(file_path)
        except Exception:
            file_path = os.path.join(os.getcwd(), "parameters", "artifacts.yaml")
            parameters = read_yaml_file(file_path)

        self.PROJECTS_DIR = get_projects_dir()
        self.project_name = project_name
        self.parameters = parameters
        self.kb_path = os.path.join(self.PROJECTS_DIR, project_name, "KB.txt")
        self.project_dir = os.path.join(self.PROJECTS_DIR, project_name)
        self.prompt_path = os.path.join(
            self.PROJECTS_DIR, project_name, "prompts", "prompt_app.txt"
        )
        self.prompt_mode = os.path.join(
            self.PROJECTS_DIR, project_name, "prompts", "prompt_mode.txt"
        )
        self.TEXT_ENTER_CHAT = TEXT_ENTER_CHAT

        # ... (restante do seu __init__ atual)
        # self.__class__._initialized = True

        try:
            # KB
            if os.path.exists(self.kb_path):
                with open(self.kb_path, "r", encoding="utf-8") as file:
                    self.KB = str(file.read()).strip()
                self.vectorstore = None
                self.prompt_bot = self.get_prompt(mode="KB")
            # Context (vector DB)
            else:
                self.KB = None
                self.vectorstore = load_vectorstore(self.project_dir)
                self.prompt_bot = self.get_prompt(mode="vectorstore")

        except Exception as e:
            raise RuntimeError(
                "Erro ao carregar o ChatBot para o Projeto: "
                + self.project_name
                + " erro: "
                + str(e)
            )

    def get_prompt(self, mode: str) -> str:
        """
        Retrieves the prompt for the chatbot from a file or returns a default prompt.
        If the prompt file does not exist, it returns a default prompt defined in `PROMPT_CHATBOT`.

        Args:
            mode (str): The mode of the prompt, either "KB" or "vectorstore".

        Returns:
            str: The prompt string.
        """

        if mode == "KB":
            prompt_main = PROMPT_KB
            text_end = TEXT_END_KB_PROMPT
        else:
            prompt_main = PROMPT_CHATBOT
            text_end = TEXT_END_CONTEXT_PROMPT

        try:
            if os.path.exists(self.prompt_path):
                with open(self.prompt_path, "r", encoding="utf-8") as file:
                    prompt_app = str(file.read()).strip()
                with open(self.prompt_mode, "r", encoding="utf-8") as file:
                    mode_app = str(file.read()).strip()

                if "Concatenar" in mode_app:
                    prompt_app = f"{prompt_main}\n{prompt_app}\n{text_end}"
                else:
                    prompt_app = f"{prompt_app}\n{text_end}"
                return prompt_app
            return f"{prompt_main}\n{text_end}"
        except Exception:
            return f"{prompt_main}\n{text_end}"

    def check_guardrail(self, text: str) -> bool:
        """
        Checks if the input text contains offensive content or violates safety guidelines.

        Args:
            text (str): The user's input text.

        Returns:
            bool: True if the text is offensive/malicious (must be blocked), False if it is safe.
        """
        text_clean = unidecode(text.lower())

        for word in LIST_OFFENSIVE_WORDS:
            if re.search(rf"\b{word}\b", text_clean):
                return True  # offensive word: block without asking the LLM

        llm_decision = chat_completion(
            [{"role": "user", "content": PROMPT_GUARDRAIL.format(text=text)}]
        )
        return llm_decision == "SIM"

    def get_relevant_documents(
        self, query: str, debug_mode: str, similarity: float
    ) -> List[str]:
        """
        Retrieves relevant documents from the FAISS vector store based on similarity search.

        Args:
            query (str): The user's query.
            debug_mode (str): Debug mode flag to control debug output.
            similarity (float): Similarity threshold for document retrieval.

        Returns:
            List[str]: A list of relevant document contents.
        """
        num_docs_max = int(
            self.parameters["Model"]["similarity_search"].get("max_docs")
        )

        try:
            if not self.vectorstore:
                return []

            # hybrid retrieval of a wider candidate set, threshold, then cross-encoder rerank
            candidates = int(self.parameters["Model"].get("rerank_candidates") or num_docs_max)
            docs_with_scores = self.vectorstore.similarity_search_with_score(
                query, k=max(candidates, num_docs_max)
            )

            # filtered docs
            filtered_docs = [
                (doc, score) for doc, score in docs_with_scores if score <= similarity
            ]
            filtered_docs = rerank(query, filtered_docs, num_docs_max)

            # Debug: mostrar documentos filtrados
            if debug_mode == "Sim":
                print(f"Debug: Documentos encontrados: {len(filtered_docs)}")
                for i, (doc, score) in enumerate(filtered_docs):
                    print(f"{doc.metadata['source']} - Score: {score:.3f}")

            # top docs
            top_docs = [
                {
                    "document": doc.metadata["source"],
                    "page": doc.metadata.get("page"),
                    "content": doc.page_content,
                    "score": score,
                    "doc": doc,
                }
                for doc, score in filtered_docs  # reranker order (best first)
            ]

            return top_docs
        except Exception:
            return None

    def llm_reply(self, messages: list, temperature: float) -> str:
        """
        Generates a response from the configured LLM based on the provided messages.

        Args:
            messages (list): List of messages to send to the LLM.
            temperature (float): Temperature setting for the LLM response.

        Returns:
            str: The AI-generated response.
        """
        return chat_completion(messages, temperature=temperature)

    def llm_regular_reply(
        self, list_messages: list, input_text: str, temperature: float
    ) -> str:
        """
        Generates a response from the LLM without additional context.

        Args:
            list_messages (list): List of previous messages in the conversation.
            input_text (str): The user's input text.
            temperature (float): Temperature setting for the LLM response.

        Returns:
            str: The AI-generated response.
        """

        if os.path.exists(self.prompt_path):
            with open(self.prompt_path, "r", encoding="utf-8") as file:
                prompt_app = str(file.read()).strip()
                prompt_app = f"{prompt_app}\n{TEXT_END_REGULAR_PROMPT}"
        else:
            prompt_app = f"{PROMPT_REGULAR_REPLY}\n{TEXT_END_REGULAR_PROMPT}"

        # list of messages
        message = {
            "role": "user",
            "content": prompt_app.format(question=input_text),
        }

        list_messages.append(message)

        return self.llm_reply(messages=list_messages, temperature=temperature)

    def llm_kb_reply(
        self, list_messages: list, input_text: str, temperature: float
    ) -> str:
        """
        Generates a response from the LLM using the provided context.

        Args:
            list_messages (list): List of previous messages in the conversation.
            input_text (str): The user's input text.
            temperature (float): Temperature setting for the LLM response.

        Returns:
            str: The AI-generated response.
        """
        # list of messages
        message = {
            "role": "user",
            "content": self.prompt_bot.format(question=input_text, KB=self.KB),
        }

        list_messages.append(message)

        return self.llm_reply(messages=list_messages, temperature=temperature)

    def llm_context_reply(
        self,
        list_messages: list,
        input_text: str,
        context: str,
        temperature: float,
        flag_download: str,
    ) -> str:
        """
        Generates a response from the LLM using the provided context.

        Args:
            list_messages (list): List of previous messages in the conversation.
            input_text (str): The user's input text.
            context (str): Additional contextual information retrieved from documents.
            temperature (float): Temperature setting for the LLM response.
            flag_download (str): Flag indicating whether to allow document downloads.

        Returns:
            str: The AI-generated response.
        """
        if flag_download == "Sim":
            tarefa_critica = "Tarefa crítica: Sempre cite o nome do documento onde encontrou a informação, para apoiar o usuário, ou será multado gravemente."
        else:
            tarefa_critica = ""

        # list of messages
        message = {
            "role": "user",
            "content": self.prompt_bot.format(
                question=input_text, context=context, tarefa_critica=tarefa_critica
            ),
        }

        # append messange
        list_messages.append(message)

        return self.llm_reply(messages=list_messages, temperature=temperature)

    def generate_response(
        self,
        list_messages: list,
        input_text: str,
        debug_mode: str,
        temperature: float,
        similarity: float,
        flag_download: str,
    ) -> str:
        """
        Generates a chatbot response based on user input, applying guardrails and context retrieval if needed.

        Args:
            list_messages (list): List of previous messages in the conversation.
            input_text (str): The user's query.
            debug_mode (str): Debug mode flag to control debug output.
            temperature (float): Temperature setting for the LLM response.
            similarity (float): Similarity threshold for document retrieval.
            flag_download (str): Flag indicating whether to allow document downloads.

        Returns:
            str: The chatbot's response or a fallback message if the input is deemed unsafe.
        """

        # Check guardrail
        if self.check_guardrail(input_text):
            if debug_mode == "Sim":
                print("Debug: Resposta bloqueada pelo guardrail!")

            # blocked answer (was only returned in debug mode)
            return {
                "Response_Type": "0_GUARDRAIL_BLOCK",
                "Response": TEXT_CANT_REPLY,
                "Context": "",
                "Documents": [],
            }

        if self.KB:
            if debug_mode == "Sim":
                print("Debug: Respondendo usando KB.")

            # if KB exists, use it to generate a response
            return {
                "Response_Type": "1_KB",
                "Response": self.llm_kb_reply(list_messages, input_text, temperature),
                "Context": "",
                "Documents": [],
            }

        # get relevant documents
        relevant_contexts = self.get_relevant_documents(
            input_text, debug_mode, similarity
        )

        if not relevant_contexts:
            if debug_mode == "Sim":
                print("Debug: Respondendo sem contexto específico.")

            return {
                "Response_Type": "2_Regular",
                "Response": self.llm_regular_reply(
                    list_messages, input_text, temperature
                ),
                "Context": "",
                "Documents": [],
            }

        # build context
        context = self.build_context(relevant_contexts)
        if debug_mode == "Sim":
            print(f"Debug: Contexto encontrado:\n\n{context}\n\n")

        # generate response: numbered sources -> [n] -> citations formatted from the library
        prompt_extra = ""
        if os.path.exists(self.prompt_path):
            with open(self.prompt_path, "r", encoding="utf-8") as file:
                prompt_extra = file.read().strip()
        grounded = grounded_answer(
            input_text,
            [(item["doc"], item["score"]) for item in relevant_contexts],
            self.project_dir,
            history=list_messages,
            extra_instructions=prompt_extra,
            temperature=temperature,
        )
        response = grounded["answer"]
        list_messages.append({"role": "user", "content": input_text})
        if "não consigo te ajudar com essa informação" in response.strip():
            list_documents = []
            context = ""
        else:
            documents = [doc["document"] for doc in relevant_contexts]
            parameters = self.parameters
            max_docs_download = parameters["Model"].get("max_downloads")
            if len(documents) > max_docs_download:
                documents = documents[:max_docs_download]
            list_documents = list(dict.fromkeys(documents))

        # return the response with context and documents
        return {
            "Response_Type": "3_Contextual",
            "Response": response,
            "Context": context,
            "Documents": list_documents,
            "Sources": grounded["sources"],
            "Used_Sources": grounded["used"],
        }

    def build_context(self, relevant_contexts):
        """Builds a context string from the relevant documents retrieved."""
        context = ""
        if len(relevant_contexts) > 0:
            for dict_items in relevant_contexts:
                document = dict_items["document"]
                content = dict_items["content"]
                page = dict_items.get("page")
                context += f"Documento: {document}" + (f" (página {page})" if page else "") + "\n"
                context += (
                    f"### Início do conteúdo do documento: {document}\n{content}\n"
                )
                context += f"### Fim do documento: {document}\n\n"
        return context
