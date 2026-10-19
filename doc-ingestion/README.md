# Document Ingestion Service

Modular microservice for ingesting presentations and documents (`.pdf`, `.pptx`, `.ppt`) for the hackathon AI evaluation platform.

Accepts uploads, parses text per slide/page, detects embedded images, runs OCR on screenshots and diagrams, and stores structured results for the AI evaluation agent.

---

## Features

- **Multi-Format Support**:
  - **PDF**: Uses `PyMuPDF` (`fitz`) for lightning-fast native text extraction and image extraction with coordinates and dimensions.
  - **PPTX**: Uses `python-pptx` to extract slide text, table cell content, presenter notes, shape hierarchies, and embedded images.
  - **PPT (Legacy)**: Automatically converted to PDF via headless LibreOffice (if installed) or parsed with graceful fallback.
- **Image & OCR Pipeline**:
  - Detects images per slide/page.
  - Filters out tiny icons/spacers (configurable dimensions).
  - Runs OCR via Google Cloud Vision API (with graceful fallback and mock modes).
- **Structured Output**:
  - Returns per-page JSON: `{ page, text, ocr_text, images, metadata, extraction_error }`.
  - Aggregated document overview (`full_text`, `full_ocr_text`, page counts, stats).
- **Persistent Storage**:
  - Uploads complete JSON result to Supabase Storage.
  - Stores summary status and metadata in the `document_extractions` Supabase table.
- **Fail-Safe & Modular**:
  - Errors on individual slides or images do not crash the document pipeline.
  - Completely decoupled from frontend UI, auth, and AI evaluator logic.
- **Ready for AI Evaluator**:
  - Includes a typed client in `src/services/doc-ingestion/client.ts`.

---

## Directory Structure

```
doc-ingestion/
├── config.py                 # Pydantic Settings & environment variable configuration
├── logger.py                 # Structured logging with structlog
├── models.py                 # Pydantic schemas (ExtractionResult, PageExtraction, etc.)
├── ocr.py                    # Google Cloud Vision OCR engine with error handling & caching
├── pipeline.py               # Main extraction orchestrator
├── routes.py                 # FastAPI endpoints (POST /ingest, GET /extraction/{id}, etc.)
├── storage.py                # Supabase Storage & Database persistence adapter
├── main.py                   # FastAPI application factory & server entrypoint
├── requirements.txt          # Python dependencies
├── Dockerfile                # Multi-stage production container build
├── .env.example              # Environment variables template
├── extractors/
│   ├── __init__.py           # Unified extractor dispatcher & magic byte detector
│   ├── pdf.py                # PyMuPDF extractor
│   └── pptx.py               # python-pptx extractor
└── tests/
    ├── __init__.py
    └── test_pipeline.py      # Unit tests (runs without external API credentials)
```

---

## Getting Started

### 1. Local Environment Setup

Ensure Python 3.11+ is installed.

```bash
cd doc-ingestion
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and provide your secrets:

```bash
cp .env.example .env
```

Key variables:
- `MAX_FILE_SIZE_MB`: Maximum file upload size in megabytes (default: 50).
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: For persisting results.
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud Service Account JSON for OCR (optional; OCR safely disabled if absent).
- `SERVICE_SECRET_TOKEN`: Shared token for internal microservice authentication.

### 3. Run the Service

```bash
# Direct python
python main.py

# Or via uvicorn directly
uvicorn main:app --reload --port 8001
```

The interactive OpenAPI docs will be available at:
`http://localhost:8001/docs`

---

## Running Tests

The test suite uses synthetic in-memory data and mocks so no external credentials are required:

```bash
pytest tests/ -v
```

---

## API Endpoints

### 1. `POST /api/v1/ingest`
Uploads and extracts a document.
- **Form Data**:
  - `file`: Multipart file upload (`.pdf`, `.pptx`, `.ppt`).
  - `submission_id`: Optional string identifying the hackathon project submission.
- **Response**: `IngestResponse` containing the `job_id`, page statistics, storage paths, and the complete `ExtractionResult`.

### 2. `GET /api/v1/extraction/{job_id}`
Retrieves a previously computed extraction result by its job ID.

### 3. `GET /api/v1/extractions`
Lists previous extractions, filterable by `submission_id`, with pagination (`limit`, `offset`).

### 4. `GET /api/v1/health`
Health check reporting uptime, version, and external service availability status.

---

## Docker Deployment

Build and run with Docker:

```bash
docker build -t doc-ingestion .
docker run -p 8001:8001 --env-file .env doc-ingestion
```
