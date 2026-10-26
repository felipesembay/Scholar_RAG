# ScholarRAG

**[English](#english) · [Português](#português)**

---

## English

ScholarRAG is a Retrieval-Augmented Generation (RAG) assistant for academic research and writing, built as
part of a master's project. You feed a project with your material (papers, books, class notes, code,
datasets) and with **your own results**, and the application answers questions, drafts the article section by
section, reviews it and proposes corrections, always with **citations tied to the sources you provided**.

The central design rule: **the language model never writes a reference**. It only points to numbered sources
(`[1]`, `[2, 3]`); author, year, page and the reference list are produced by code from the project library
(ABNT NBR 10520/6023 or APA 7). Markers pointing to sources that do not exist are dropped, so an invented
reference cannot reach the final text.

### Features

| Area | What it does |
|---|---|
| **Projects & ingestion** | Upload PDF, DOCX, PPTX, XLSX/CSV, TXT/MD, Jupyter notebooks, R/Python scripts, images (OCR) and **ZIP files with folders** (nested zips included). PDFs are parsed page by page with tables preserved; scanned pages go through Tesseract OCR (`por+eng`). DOIs are detected and enriched via Crossref. |
| **Library** | One bibliographic entry per file, editable (authors, year, venue, pages, page offset…). Each file is classified as **Literature** (citable, goes to the reference list) or **Supporting material** (classes, slides, code, data: used as context, never cited as a work). Your results (`.md`) are a third kind: cited as "results of this research", never as a reference. Reference list and BibTeX export. |
| **Chat with citations** | Hybrid retrieval (BM25 + vectors) + reranking, grounded answers with clickable citations that open the exact excerpt and page. |
| **Article writing** | Section-by-section drafting (default empirical-article layout or a blank article you build part by part), **continue writing** from where your text stops, **import your Word/PDF/Markdown draft** (headings → sections, tables kept as tables), export to **Markdown, DOCX and LaTeX** (abnTeX2 or natbib, real `\cite` commands, only cited works in the `.bib`). |
| **Review** | Exact checks (pending markers, hand-written citations not linked to the library, incomplete references, tables without captions, section numbering, duplicated paragraphs) plus a full read by a reviewer model that also receives the cited source excerpts, so it can flag citations that do not support the claim. |
| **Corrections** | Select review issues (or all of them) and get per-section correction proposals with a paragraph/word diff. Verified citations stay linked, hand-written citations are linked when the work is in the library, and you accept or reject each section. Tables and result numbers are checked before you accept. |
| **Start over** | Delete the article and restart (blank or default layout); a backup is kept in `projects/<project>/article_backups/`. |

### Architecture

```
React (Vite) ──HTTP──► FastAPI ──► ingestion (pdfplumber / Tesseract / Docling, Office, notebooks)
   :3100                 :8100      │
                                    ├─► Elasticsearch 8.19  (BM25 + kNN, RRF fusion)  ◄── bge-m3 embeddings
                                    ├─► bge-reranker-v2-m3 (cross-encoder)
                                    ├─► academic/  (library, citations, grounded answers, article,
                                    │               import, review, revise)
                                    └─► OpenRouter / OpenAI / Ollama  (any OpenAI-compatible LLM)
```

### Tech stack

- **Backend:** Python 3.12, FastAPI, LangChain, [uv](https://docs.astral.sh/uv/)
- **Retrieval:** Elasticsearch 8.19 (hybrid BM25 + kNN with RRF), `BAAI/bge-m3` embeddings, `BAAI/bge-reranker-v2-m3`
- **Ingestion:** pdfplumber, Tesseract OCR, Docling (optional), python-docx, python-pptx, pandas, Crossref API
- **LLMs:** any OpenAI-compatible API (OpenRouter, OpenAI, Ollama); separate models for chat, writing and review
- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, Radix UI
- **Infra & quality:** Docker Compose, pytest, ruff

### Requirements

- Docker and Docker Compose (`docker-compose` or `docker compose`)
- ~6 GB of free RAM (Elasticsearch uses 2 GB; embedding/reranker models run locally)
- An API key for an OpenAI-compatible provider (e.g. [OpenRouter](https://openrouter.ai))
- For local development without Docker: Python 3.12, uv, Node.js 22, Tesseract (`tesseract-ocr`, `tesseract-ocr-por`)

### Quick start (Docker)

```bash
git clone <repository-url> scholar-rag
cd scholar-rag
cp .env.example .env          # then fill in the variables below
docker-compose up -d --build  # Elasticsearch, FastAPI and the React frontend
```

| Service | URL |
|---|---|
| Web app (React) | http://localhost:3100 |
| API (FastAPI, docs at `/docs`) | http://localhost:8100 |
| Elasticsearch | http://localhost:9200 (localhost only) |

The first start downloads the embedding and reranker models (~6.5 GB) into `~/.cache/huggingface`, which is
mounted into the containers and reused afterwards.

### Configuration (`.env`)

| Variable | Description |
|---|---|
| `LLM_BASE_URL` | OpenAI-compatible endpoint. OpenRouter: `https://openrouter.ai/api/v1`; Ollama: `http://localhost:11434/v1`; empty = OpenAI. |
| `LLM_API_KEY` | API key of the provider (`ollama` for Ollama). |
| `LLM_MODEL` | Chat model, e.g. `nvidia/nemotron-3-ultra-550b-a55b:free`. |
| `LLM_MODEL_WRITING` | Article writing model (empty = `LLM_MODEL`). |
| `LLM_MODEL_REVIEW` | Review and correction model (empty = `LLM_MODEL_WRITING`). |
| `ELASTIC_PASSWORD` | Password of the `elastic` user (choose any). |
| `ES_URL` | `http://localhost:9200` when running on the host (Compose overrides it inside the containers). |
| `ADMIN_PASSWORD` | Admin password of the app. |
| `ADMIN_SECRET_KEY` | Fernet key used to encrypt project passwords: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

Other parameters (chunk size, reranker, OCR language, PDF engine, number of retrieved sources) live in
`src/parameters/artifacts.yaml`.

**Model choice and cost.** On OpenRouter only model ids ending in `:free` are free; the same id without the
suffix is paid. Set a credit limit on your OpenRouter key. Review and corrections send the whole article plus
source excerpts, and corrections are sent one section at a time (you can stop at any point).

After changing `.env`, recreate the containers (a plain `restart` does not reload it):

```bash
docker-compose up -d --force-recreate fastapi
```

After changing frontend code: `docker-compose build frontend && docker-compose up -d --force-recreate frontend`.

### Local development (without Docker for the app)

```bash
uv sync                                   # Python 3.12 + dependencies (pyproject.toml / uv.lock)
docker-compose up -d elasticsearch        # only Elasticsearch in Docker
cd src && uv run uvicorn backend.api:app --reload --port 8100

cd frontend-react && npm install
VITE_API_URL=http://localhost:8100 npm run dev
```

Tests and lint (the `tests/` folder is kept locally and is not versioned):

```bash
uv run pytest
uvx ruff check src/core src/ingestion src/academic
```

`requirements.txt` is generated for Docker: `uv export --no-hashes --no-dev --no-emit-project -o requirements.txt`.

### Typical workflow

1. **Create a project** and upload your papers and material (a ZIP with folders works).
2. Open the **Library**: complete authors/years, check the Literature × Supporting material split, choose ABNT or APA, and upload your **results** as `.md` (metrics, tables, model outputs).
3. Use the **Chat with citations** to explore the literature.
4. In **Article writing**, start blank or from the default layout, import your Word draft, generate or continue sections.
5. Run **Analyze**, select the issues to fix, review the proposals and accept them.
6. Export to DOCX, Markdown or LaTeX (zip with `main.tex` + `referencias.bib`, ready for Overleaf).

### Project layout

```
src/
  academic/     library, citations (ABNT/APA, BibTeX), grounded answers, article, import, review, revise
  core/         config, LLM client, embeddings, Elasticsearch store, reranker, vector store
  ingestion/    parsers (PDF/OCR, Office, notebooks, code), chunking, archives (zip)
  backend/      FastAPI app (api.py) and academic endpoints (academic_api.py)
  parameters/   artifacts.yaml (all parameters; secrets come from .env)
frontend-react/ React app
scripts/        reindex_projects.py, benchmark_parsers.py
projects/       per-project data (files, library, article, backups) — not versioned
```

### Useful scripts

- Reindex projects (e.g. after changing the embedding model): `PROJECTS_DIR=projects uv run python scripts/reindex_projects.py [name ...]`
- Benchmark PDF parsers/OCR on your files (put them in `samples/`): `uv run python scripts/benchmark_parsers.py samples/`

### Troubleshooting

- **Project creation takes long:** large bases are expected to take minutes (embeddings run locally); the screen keeps the spinner until indexing ends. Check `docker logs scholar_fastapi`.
- **LLM errors / 404 from a provider:** free models on OpenRouter come and go; test another `:free` model or a paid one.
- **New model not used:** recreate the containers (see Configuration).
- **Hand-written citations do not appear in the references:** only citations linked to the library do; use the review + corrections to link them.


---

## Português

O ScholarRAG é um assistente de RAG (*Retrieval-Augmented Generation*) para pesquisa e escrita acadêmica,
desenvolvido no contexto de um mestrado. Você alimenta um projeto com o seu material (artigos, livros, aulas,
códigos, bases de dados) e com **os seus resultados**, e a aplicação responde perguntas, redige o artigo seção a
seção, revisa e propõe correções, sempre com **citações vinculadas às fontes que você forneceu**.

A regra central do projeto: **o modelo de linguagem nunca escreve uma referência**. Ele só aponta fontes
numeradas (`[1]`, `[2, 3]`); autor, ano, página e a lista de referências são montados por código a partir da
biblioteca do projeto (ABNT NBR 10520/6023 ou APA 7). Marcadores que apontam para fontes inexistentes são
descartados, então uma referência inventada não chega ao texto final.

### Funcionalidades

| Área | O que faz |
|---|---|
| **Projetos e ingestão** | Upload de PDF, DOCX, PPTX, XLSX/CSV, TXT/MD, notebooks Jupyter, scripts R/Python, imagens (OCR) e **ZIP com pastas** (inclusive zips dentro de zips). PDFs lidos página a página com tabelas preservadas; páginas escaneadas passam por OCR Tesseract (`por+eng`). DOI detectado e enriquecido pelo Crossref. |
| **Biblioteca** | Uma entrada bibliográfica por arquivo, editável (autores, ano, periódico, páginas, deslocamento de página…). Cada arquivo é **Literatura** (citável, entra nas referências) ou **Material de apoio** (aulas, slides, código, dados: usado como contexto, nunca citado como obra). Seus resultados (`.md`) são um terceiro tipo: citados como "resultados desta pesquisa", nunca como referência. Lista de referências e exportação BibTeX. |
| **Chat com citações** | Busca híbrida (BM25 + vetores) + reranking; respostas fundamentadas com citações clicáveis que abrem o trecho e a página exatos. |
| **Escrita do artigo** | Rascunho seção a seção (estrutura padrão de artigo empírico ou artigo em branco, construído parte a parte), **continuar escrevendo** a partir de onde o texto parou, **importar seu rascunho em Word/PDF/Markdown** (títulos viram seções, tabelas continuam tabelas), exportação em **Markdown, DOCX e LaTeX** (abnTeX2 ou natbib, com `\cite` de verdade e só as obras citadas no `.bib`). |
| **Análise** | Verificações exatas (pendências, citações escritas à mão sem vínculo com a biblioteca, referências incompletas, tabelas sem legenda, numeração de seções, parágrafos repetidos) e leitura completa por um modelo revisor que também recebe os trechos das fontes citadas, para apontar citações que não sustentam a afirmação. |
| **Correções** | Marque apontamentos da análise (ou todos) e receba propostas de correção por seção, com diferenças destacadas por parágrafo e palavra. Citações verificadas continuam vinculadas, citações escritas à mão são vinculadas quando a obra está na biblioteca, e você aceita ou rejeita cada seção. Tabelas e números dos resultados são conferidos antes do aceite. |
| **Recomeçar** | Exclui o artigo e recomeça (em branco ou com a estrutura padrão); uma cópia fica em `projects/<projeto>/article_backups/`. |

### Arquitetura

```
React (Vite) ──HTTP──► FastAPI ──► ingestão (pdfplumber / Tesseract / Docling, Office, notebooks)
   :3100                 :8100      │
                                    ├─► Elasticsearch 8.19  (BM25 + kNN, fusão RRF)  ◄── embeddings bge-m3
                                    ├─► bge-reranker-v2-m3 (cross-encoder)
                                    ├─► academic/  (biblioteca, citações, respostas fundamentadas, artigo,
                                    │               importação, análise, correções)
                                    └─► OpenRouter / OpenAI / Ollama  (qualquer LLM compatível com OpenAI)
```

### Stack

- **Backend:** Python 3.12, FastAPI, LangChain, [uv](https://docs.astral.sh/uv/)
- **Recuperação:** Elasticsearch 8.19 (BM25 + kNN com RRF), embeddings `BAAI/bge-m3`, `BAAI/bge-reranker-v2-m3`
- **Ingestão:** pdfplumber, Tesseract OCR, Docling (opcional), python-docx, python-pptx, pandas, API do Crossref
- **LLMs:** qualquer API compatível com OpenAI (OpenRouter, OpenAI, Ollama); modelos separados para chat, escrita e análise
- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, Radix UI
- **Infra e qualidade:** Docker Compose, pytest, ruff

### Requisitos

- Docker e Docker Compose (`docker-compose` ou `docker compose`)
- ~6 GB de RAM livres (o Elasticsearch usa 2 GB; os modelos de embeddings e reranking rodam localmente)
- Uma chave de API de um provedor compatível com OpenAI (ex.: [OpenRouter](https://openrouter.ai))
- Para desenvolvimento local sem Docker: Python 3.12, uv, Node.js 22, Tesseract (`tesseract-ocr`, `tesseract-ocr-por`)

### Início rápido (Docker)

```bash
git clone <url-do-repositório> scholar-rag
cd scholar-rag
cp .env.example .env          # preencha as variáveis abaixo
docker-compose up -d --build  # Elasticsearch, FastAPI e o frontend React
```

| Serviço | URL |
|---|---|
| Aplicação web (React) | http://localhost:3100 |
| API (FastAPI, documentação em `/docs`) | http://localhost:8100 |
| Elasticsearch | http://localhost:9200 (só localhost) |

Na primeira subida são baixados os modelos de embeddings e reranking (~6,5 GB) em `~/.cache/huggingface`, que é
montado nos containers e reaproveitado depois.

### Configuração (`.env`)

| Variável | Descrição |
|---|---|
| `LLM_BASE_URL` | Endpoint compatível com OpenAI. OpenRouter: `https://openrouter.ai/api/v1`; Ollama: `http://localhost:11434/v1`; vazio = OpenAI. |
| `LLM_API_KEY` | Chave do provedor (`ollama` no Ollama). |
| `LLM_MODEL` | Modelo do chat, ex.: `nvidia/nemotron-3-ultra-550b-a55b:free`. |
| `LLM_MODEL_WRITING` | Modelo da escrita do artigo (vazio = `LLM_MODEL`). |
| `LLM_MODEL_REVIEW` | Modelo da análise e das correções (vazio = `LLM_MODEL_WRITING`). |
| `ELASTIC_PASSWORD` | Senha do usuário `elastic` (escolha qualquer uma). |
| `ES_URL` | `http://localhost:9200` ao rodar no host (o Compose sobrescreve dentro dos containers). |
| `ADMIN_PASSWORD` | Senha de administrador da aplicação. |
| `ADMIN_SECRET_KEY` | Chave Fernet usada para criptografar senhas de projetos: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

Os demais parâmetros (tamanho dos trechos, reranker, idioma do OCR, motor de PDF, número de fontes recuperadas)
ficam em `src/parameters/artifacts.yaml`.

**Escolha de modelos e custo.** No OpenRouter só os ids terminados em `:free` são gratuitos; o mesmo id sem o
sufixo é pago. Defina um limite de crédito na sua chave do OpenRouter. A análise e as correções enviam o artigo
inteiro e trechos das fontes; as correções são enviadas uma seção por vez (é possível parar a qualquer momento).

Depois de alterar o `.env`, recrie os containers (um `restart` simples não relê o arquivo):

```bash
docker-compose up -d --force-recreate fastapi
```

Depois de alterar o frontend: `docker-compose build frontend && docker-compose up -d --force-recreate frontend`.

### Desenvolvimento local (sem Docker para a aplicação)

```bash
uv sync                                   # Python 3.12 + dependências (pyproject.toml / uv.lock)
docker-compose up -d elasticsearch        # só o Elasticsearch no Docker
cd src && uv run uvicorn backend.api:app --reload --port 8100

cd frontend-react && npm install
VITE_API_URL=http://localhost:8100 npm run dev
```

Testes e lint (a pasta `tests/` fica só na máquina local e não é versionada):

```bash
uv run pytest
uvx ruff check src/core src/ingestion src/academic
```

O `requirements.txt` é gerado para o Docker: `uv export --no-hashes --no-dev --no-emit-project -o requirements.txt`.

### Fluxo de uso

1. **Crie um projeto** e envie seus artigos e materiais (um ZIP com pastas funciona).
2. Abra a **Biblioteca**: complete autores e anos, confira a separação Literatura × Material de apoio, escolha ABNT ou APA e envie seus **resultados** em `.md` (métricas, tabelas, saídas dos modelos).
3. Use o **Chat com citações** para explorar a literatura.
4. Na **Escrita do artigo**, comece em branco ou pela estrutura padrão, importe seu rascunho do Word, gere ou continue as seções.
5. Clique em **Analisar**, marque os apontamentos a corrigir, revise as propostas e aceite.
6. Exporte em DOCX, Markdown ou LaTeX (zip com `main.tex` + `referencias.bib`, pronto para o Overleaf).

### Estrutura do projeto

```
src/
  academic/     biblioteca, citações (ABNT/APA, BibTeX), respostas fundamentadas, artigo, importação, análise, correções
  core/         configuração, cliente LLM, embeddings, Elasticsearch, reranker, vector store
  ingestion/    parsers (PDF/OCR, Office, notebooks, código), chunking, arquivos zip
  backend/      aplicação FastAPI (api.py) e endpoints acadêmicos (academic_api.py)
  parameters/   artifacts.yaml (todos os parâmetros; segredos vêm do .env)
frontend-react/ aplicação React
scripts/        reindex_projects.py, benchmark_parsers.py
projects/       dados de cada projeto (arquivos, biblioteca, artigo, backups) — não versionado
```

### Scripts úteis

- Reindexar projetos (ex.: após trocar o modelo de embeddings): `PROJECTS_DIR=projects uv run python scripts/reindex_projects.py [nome ...]`
- Comparar parsers de PDF/OCR nos seus arquivos (coloque-os em `samples/`): `uv run python scripts/benchmark_parsers.py samples/`

### Solução de problemas

- **Criação de projeto demora:** bases grandes levam minutos (os embeddings rodam localmente); a tela mantém o indicador até a indexação terminar. Veja `docker logs scholar_fastapi`.
- **Erros do LLM / 404 de um provedor:** modelos gratuitos no OpenRouter entram e saem do ar; teste outro `:free` ou um pago.
- **Modelo novo não é usado:** recrie os containers (veja Configuração).
- **Citações escritas à mão não aparecem nas referências:** só entram as citações vinculadas à biblioteca; use a análise + correções para vinculá-las.
