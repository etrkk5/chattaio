# LightRAG Backend (Text-Only)

A production-ready asynchronous text-only RAG backend serving LightRAG + RAGAnything integrations via FastAPI, using Google AI Studio (Gemini) and cloud-hosted Milvus.

## Architecture

* **Framework:** `FastAPI` (Python 3.11+) + `Uvicorn`
* **Embedding/LLM Model:** Google Gemini (2.0 Flash for LLM, models/text-embedding-004 for embeddings)
* **Vector Database:** Milvus Cloud Serverless or dedicated DB 
* **Worker Execution:** Fully async ingestion workers using `asyncio.Queue`
* **Parsing Engine:** `RAGAnything` (configured explicitly without Vision Processing)

## Setup and Installation

**1. Create virtual environment**
```bash
python -m venv .venv
source .venv/bin/activate
```

**2. Install dependencies**
```bash
pip install -e .
```

**3. Configure Environment**
Rename the `.env.example` -> `.env` and configure accordingly:
```bash
# Obtain from Google AI Studio
GEMINI_API_KEY="..."

# Example configuration of external Milvus instances
MILVUS_URI="https://..."
MILVUS_DB_NAME="lightrag"
MILVUS_TOKEN="..."
```

## Running

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Examples

**Ingest Text Document:**
```bash
curl -X POST "http://localhost:8000/api/v1/ingest/file" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@your_document.txt"
```

**Perform Query Retrieval:**
```bash
curl -X POST "http://localhost:8000/api/v1/query" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"question":"What does the document outline regarding X?","mode":"hybrid"}'
```

**List Admin Information:**
```bash
curl -X GET "http://localhost:8000/api/v1/admin/stats" -H "accept: application/json"
```

## Considerations
* The system is explicitly configured for `text-only` parsing. VLM and image embedding overrides via `RAGAnything` have intentionally been disabled.
* The embedding model initialized at first indexing must be maintained. Changing the model will cause failures matching newly embedded dimensions towards the previously populated dimensions persisting in Milvus. 
