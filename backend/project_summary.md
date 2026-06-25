# HR RAG Chatbot — Complete Project Summary

This document is a comprehensive, self-contained summary of the **HR RAG Chatbot** project.
It covers the full architecture, all files, data flow, known bugs, and current development status.

---

## 1. Project Overview

**Project Name:** HR RAG Chatbot  
**Type:** Full-stack web application  
**Purpose:** An HR policy Q&A chatbot that lets users upload a PDF (e.g., an employee handbook), and then ask questions about it in a conversational interface. The backend uses a **Retrieval-Augmented Generation (RAG)** pipeline powered by LangChain, Groq LLM (Llama 3.3 70B), and ChromaDB. The frontend is a Next.js app.

**Root Directory:** `hr-rag-chatbot/`  
**Two top-level folders:**
- `backend/` — Python FastAPI server
- `frontend/` — Next.js 16 TypeScript app

---

## 2. Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python** | Language |
| **FastAPI** | Web framework / REST API |
| **Uvicorn** | ASGI server |
| **LangChain** | RAG orchestration framework |
| **langchain-groq** | LLM integration (Groq API) |
| **langchain-huggingface** | Embedding model integration |
| **langchain-text-splitters** | Document chunking |
| **langchain-community** | PyPDFLoader, ChromaDB wrappers |
| **ChromaDB** | In-memory vector store (ephemeral per session) |
| **sentence-transformers** | Embedding model (`all-MiniLM-L6-v2`) |
| **pypdf** | PDF parsing |
| **pydantic / pydantic-settings** | Data validation + settings management |
| **python-dotenv** | .env loading |
| **python-multipart** | File upload support |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** | React framework |
| **React 19** | UI library |
| **TypeScript** | Language |
| **Tailwind CSS v4** | Styling |
| **Axios** | HTTP client for API calls |
| **Geist fonts** | Typography (via next/font/google) |

### LLM & Models
- **LLM:** `llama-3.3-70b-versatile` via Groq API (temperature=0.0 for deterministic output)
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace, loaded as a singleton)

---

## 3. Directory Structure

```
hr-rag-chatbot/
├── project_tracker.md               # Task progress tracker
│
├── backend/
│   ├── .env                         # Environment variables (secrets)
│   ├── .env.example                 # Template for .env
│   ├── requirements.txt             # Python dependencies
│   ├── auratech_employee_handbook.pdf  # Sample test PDF
│   └── app/
│       ├── main.py                  # FastAPI app entry point (lifespan: pre-loads embedding model at startup)
│       ├── core/
│       │   ├── config.py            # Pydantic settings (reads .env)
│       │   └── prompts.py           # LangChain prompt templates (GROUNDED_QA, REFORMULATE, CONVERSATION_SUMMARY)
│       ├── models/
│       │   └── schemas.py           # Pydantic request/response schemas
│       ├── routes/
│       │   ├── upload.py            # POST /api/upload + POST /api/check-sensitive-topic endpoints
│       │   └── chat.py              # POST /api/chat endpoint
│       └── services/
│           ├── document_processor.py  # PDF loading + chunking
│           ├── vector_store.py        # ChromaDB session manager
│           ├── chat_service.py        # Core RAG pipeline logic
│           └── safety_router.py       # Sensitive topic keyword filter
│
└── frontend/
    ├── .env.local                   # NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
    ├── next.config.ts               # allowedDevOrigins CIDR ranges + /api rewrite proxy
    ├── package.json                 # Dependencies: next, react, axios, tailwindcss; dev script: --hostname 0.0.0.0
    ├── postcss.config.mjs           # PostCSS for Tailwind
    ├── tsconfig.json                # TypeScript config
    └── src/
        ├── app/
        │   ├── layout.tsx           # Root layout (Inter + Lora fonts, metadata)
        │   ├── globals.css          # Tailwind v4 @theme color palette (warm earthy tones)
        │   └── page.tsx             # Main orchestrator (state + handlers; delegates UI to components)
        ├── components/
        │   ├── icons.tsx            # Inline SVG icons
        │   ├── Sidebar.tsx          # Collapsible session sidebar
        │   ├── MessageBubble.tsx    # User/assistant/routed message rendering
        │   ├── SourcesPanel.tsx     # Collapsible source chunk toggle
        │   ├── ChatInput.tsx        # Auto-expanding textarea + icon send
        │   ├── TypingIndicator.tsx  # Loading dots animation
        │   └── UploadScreen.tsx     # Drag-and-drop PDF upload dropzone
        └── lib/
            ├── types.ts             # Shared TypeScript types
            └── api.ts               # Axios API client functions
```

---

## 4. Backend — File-by-File Explanation

### `backend/.env`
- **Storage & Auth**: Uses Motor (async MongoDB) to store past chat histories, linked to a Supabase User UUID via JWT validation.
  - *Note on Config Validation*: `app/core/config.py` uses Pydantic Settings. `SUPABASE_JWT_SECRET` is assigned a fallback default (`"fallback_secret_for_dev_mode_only"`) so that the backend does not crash with a `ValidationError` if the environment variable is missing from the shell or `.env` during local development.

```
GROQ_API_KEY="gsk_..."              # Groq API key for LLM access
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE=800
CHUNK_OVERLAP=150
MONGODB_URI="mongodb://localhost:27017"
SUPABASE_JWT_SECRET="..."
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000"
```

---

### `backend/requirements.txt`
```
fastapi, uvicorn[standard], python-multipart,
langchain, langchain-community, langchain-groq,
langchain-huggingface, langchain-text-splitters,
chromadb, pypdf, sentence-transformers,
pydantic-settings, python-dotenv
```

---

### `backend/app/main.py`
- Creates the FastAPI app instance with an **`asynccontextmanager` lifespan** handler.
- **Startup event:** Calls `VectorStoreManager.get_embedding_function()` at startup to pre-load the HuggingFace embedding model before any requests are served. Prints `[Startup] Embedding model ready.`
- Defines `_BASE_DEV_ORIGINS` — a hardcoded list of always-allowed local origins:
  `http://localhost:3000`, `http://127.0.0.1:3000`, `http://0.0.0.0:3000`
- Builds `_cors_origins` by merging `_BASE_DEV_ORIGINS` with `settings.BACKEND_CORS_ORIGINS` (from `.env`), deduplicated with `dict.fromkeys()`.
- Adds `CORSMiddleware` with the merged `_cors_origins`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.
- Registers two routers under prefix `/api`:
  - `upload.router` → handles `/api/upload` and `/api/check-sensitive-topic`
  - `chat.router` → handles `/api/chat`
- Exposes a `GET /health` endpoint returning `{"status": "healthy"}`.

---

### `backend/app/core/config.py`
- Uses `pydantic-settings` (`BaseSettings`) to read from `.env`.
- Fields:
  - `GROQ_API_KEY: str` — required
  - `EMBEDDING_MODEL: str` — default `"sentence-transformers/all-MiniLM-L6-v2"`
  - `CHUNK_SIZE: int` — default `800`
  - `CHUNK_OVERLAP: int` — default `200`
  - `ALLOWED_ORIGINS: Union[str, List[str]]`
- Has a `@property BACKEND_CORS_ORIGINS` that splits the string by comma into a list.
- Instantiated once as `settings = Settings()` singleton.

---

### `backend/app/core/prompts.py`
Defines two `ChatPromptTemplate` objects used by the RAG pipeline:

**`REFORMULATE_QUERY_PROMPT`**  
Used to rewrite a user's follow-up question into a self-contained standalone query, given the chat history. System instructs the LLM to only return the reformulated question, not answer it. Variables: `{chat_history}`, `{current_query}`.

**`GROUNDED_QA_PROMPT`**  
System prompt strictly constrains the LLM to answer ONLY from provided context chunks. If the answer isn't in the context, it must respond: *"This information is not stated in the uploaded corporate policy document."* Variables: `{context}`, `{input}`.

**`CONVERSATION_SUMMARY_PROMPT`**  
Used for meta-conversation queries (e.g. "summarize this chat"). Summarizes the provided chat history only — does NOT reference document context. Variables: `{chat_history}`, `{current_query}`.

---

### `backend/app/models/schemas.py`
Pydantic models for API I/O:

- **`ChatRequest`** — `session_id: str`, `query: str`, `chat_history: list[dict] = Field(default_factory=list)`
- **`ChatResponse`** — `answer: str`, `source_chunks: List[str]`, `routed: bool`
- **`SensitiveTopicRequest`** — `query: str` (prepared for a future endpoint)
- **`SensitiveTopicResponse`** — `is_sensitive: bool`, `message: Optional[str]`

---

### `backend/app/routes/upload.py`
Hosts two endpoints: `POST /api/upload` and `POST /api/check-sensitive-topic`.

**`POST /api/upload` Flow:**
1. Validates file extension is `.pdf` (returns 400 if not).
2. Generates a new `session_id = str(uuid.uuid4())`.
3. Saves the uploaded file to a temp file on disk.
4. Calls `process_pdf(file_path, chunk_size, chunk_overlap)` from `document_processor.py`.
   - Raises `HTTPException(422)` on `NoTextFoundError` or other processing errors.
5. Calls `vector_store_manager.create_session(session_id, chunks)` to index the chunks.
6. Deletes the temp file in the `finally` block.
7. Returns: `{ session_id, filename, chunk_count, status: "indexed" }`.

Error handling: if session creation fails after an unexpected error, the session is cleaned up.

**`POST /api/check-sensitive-topic` Flow:**
- Accepts `SensitiveTopicRequest` body `{ query: str }`.
- Calls `check_sensitive_topic(query)` from `safety_router.py`.
- Returns `SensitiveTopicResponse`: `{ is_sensitive: true, message: "..." }` if a keyword matched, or `{ is_sensitive: false, message: null }` otherwise.
- Raises `HTTPException(500)` on unexpected errors.

---

### `backend/app/routes/chat.py`
Handles `POST /api/chat`.

**Flow:**
1. Accepts `ChatRequest` (session_id, query, chat_history).
2. Calls `generate_answer(session_id, query, chat_history)` from `chat_service.py`.
3. Returns `ChatResponse` on success.
4. Raises `404` if `ValueError` (invalid/expired session).
5. Raises `500` for any other unexpected error (without leaking internal details).

---

### `backend/app/services/document_processor.py`
Stateless PDF processing utility.

**`process_pdf(file_path, chunk_size, chunk_overlap) -> List[Document]`**
1. Loads the PDF with `PyPDFLoader`.
2. Raises `NoTextFoundError` if no extractable text (e.g., scanned/image PDF).
3. Calls `_extract_title_from_pdf()` — takes the first non-empty line of page 1 as document title; falls back to filename.
4. Splits documents with `RecursiveCharacterTextSplitter(separators=["\n\n", "\n", " ", ""])`.
5. Attaches `document_title` to every chunk's metadata.
6. Returns list of `Document` chunks.

---

### `backend/app/services/vector_store.py`
Manages per-session in-memory ChromaDB instances.

**`VectorStoreManager` class:**
- `sessions: Dict[str, Chroma]` — stores active vector stores keyed by session_id.
- `get_embedding_function()` (classmethod) — singleton `HuggingFaceEmbeddings` using `settings.EMBEDDING_MODEL`. Loaded only once.
- `create_session(session_id, documents)` — embeds docs with `Chroma.from_documents()`, stores in `sessions`.
- `get_retriever(session_id, k=3) -> BaseRetriever` — raises `SessionNotFoundError` if session not found; returns `vector_store.as_retriever(search_kwargs={"k": k})`.
- `delete_session(session_id)` — removes the Chroma instance from `sessions` dict.

Instantiated as `vector_store_manager = VectorStoreManager()` singleton.

**Design choice:** Ephemeral (in-memory) only — no persistence to disk. All data is lost when the server restarts. This is intentional for data privacy.

---

### `backend/app/services/safety_router.py`
Keyword-based pre-filter that runs BEFORE the RAG pipeline.

**`check_sensitive_topic(query: str) -> Optional[str]`**
- Pre-compiled regex with word boundaries checks against a keyword list:
  `["harassment", "whistleblower", "wrongful termination", "discrimination", "retaliation", "sexual misconduct"]`
- If a keyword is found → returns a canned message directing the user to HR compliance.
- If not → returns `None` (safe to proceed).

---

### `backend/app/services/chat_service.py`
Core RAG pipeline logic. This is the brain of the application.

**Module-level initialization (runs once on import):**
```python
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.0, api_key=...)
rag_chain = GROUNDED_QA_PROMPT | llm | StrOutputParser()
reformulation_chain = REFORMULATE_QUERY_PROMPT | llm | StrOutputParser()
conversation_summary_chain = CONVERSATION_SUMMARY_PROMPT | llm | StrOutputParser()
```

**`is_meta_conversation_query(query) -> bool`**  
Detects when a query is about the conversation itself (not the document). Uses **four pre-compiled regex patterns** with word boundaries:
- `_SUMMARY_ACTION_PATTERN` — matches `summarize|summarise|recap`
- `_CONVERSATION_REF_PATTERN` — matches `chat|conversation|asked|discussed`
- `_WHAT_DID_ASK_PATTERN` — matches `"what ... I/we ... ask/asked"`
- `_WHAT_DISCUSSED_PATTERN` — matches `"what have/did ... discussed/talked/asked"`

Returns `True` if `(SUMMARY_ACTION + CONVERSATION_REF)` both match, OR if either `WHAT_DID_ASK` or `WHAT_DISCUSSED` matches alone.

**`format_docs(docs) -> str`**  
Joins retrieved chunks into one context string. If the first chunk has `document_title` metadata, prepends `"Document: <title>\n\n"` to the context.

**`reformulate_query(chat_history, current_query) -> str`**  
- If no chat history, returns the query unchanged.
- Otherwise, takes last 4 messages, formats them as `"role: content"` string.
- Invokes `reformulation_chain` to rewrite the query as a standalone question.
- Falls back to original query on any error.

**`generate_answer(session_id, query, chat_history: Optional[List[Dict[str, str]]] = None) -> Dict`**  
The full RAG pipeline:
1. **Safety check** — runs `check_sensitive_topic(query)` on the ORIGINAL query. If sensitive, returns `{ answer: <canned_response>, source_chunks: [], routed: True }` immediately.
2. **Meta-conversation check** — runs `is_meta_conversation_query(query)`. If true:
   - Empty history → returns `"We haven't discussed anything yet in this conversation."`
   - Otherwise → invokes `conversation_summary_chain` with full chat history; skips retrieval and RAG.
   - Returns `{ answer: <summary>, source_chunks: [], routed: False }`.
3. **Query reformulation** — calls `reformulate_query(chat_history, query)` to get a better retrieval query.
4. **Retrieval** — gets the retriever for the session (`k=5`); raises `ValueError` if session not found.
5. **Retriever invocation** — calls `retriever.invoke(reformulated_query)` to get top-5 relevant chunks.
6. **Context formatting** — calls `format_docs(retrieved_docs)`.
7. **LLM generation** — calls `rag_chain.invoke({"context": context_str, "input": reformulated_query})`.
8. **Response** — returns `{ answer, source_chunks: [first 200 chars of each doc], routed: False }`.

---

## 5. Frontend — File-by-File Explanation

### `frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
- `NEXT_PUBLIC_API_URL` — read by `api.ts` as the Axios base URL (publicly exposed to the browser).
- `BACKEND_URL` — read by `next.config.ts` to configure the `/api/*` rewrite proxy (server-side only).
- `NEXT_PUBLIC_SUPABASE_*` — used by `supabase.ts` to initialize the auth client.

### `frontend/src/lib/supabase.ts`
- Initializes the `@supabase/supabase-js` client.
- **Critical Fix (Invalid supabaseUrl / Failed to fetch)**: Next.js Turbopack compilation or browser client execution can crash with an `Invalid supabaseUrl` or a generic `TypeError: Failed to fetch` if the `NEXT_PUBLIC_SUPABASE_URL` is empty, contains placeholder strings, hidden whitespace, or a trailing slash.
- **Implementation**: The initialization script explicitly checks for the presence of the variables, throws a clean diagnostic error if missing, and aggressively sanitizes the inputs using `url.trim().replace(/\/$/, '')` and `key.trim()` before passing them to the `createClient` constructor. This guarantees network requests do not fail due to malformed URLs.

---

### `frontend/next.config.ts`
- **`allowedDevOrigins`** — uses CIDR notation to permanently allow HMR WebSocket connections from any private-network IP, eliminating the recurring cross-origin warning on DHCP reassignment:
  - `localhost`, `127.0.0.1`
  - `10.0.0.0/8` (Class A), `172.16.0.0/12` (Class B), `192.168.0.0/16` (Class C)
  - CIDR support requires Next.js ≥ 15.1 (this project: **Next.js 16.2.9**) ✅
- **`rewrites()`** — proxies all `/api/*` requests to the FastAPI backend at `BACKEND_URL` (defaults to `http://127.0.0.1:8000`). This lets the frontend call `/api/upload`, `/api/chat`, etc. without specifying the backend host directly.

---

### `frontend/src/app/layout.tsx`
- Root Next.js layout.
- Loads **Inter** (body), **Lora** (serif headings), and **Geist Mono** from Google Fonts.
- Metadata title: `"HR Policy Assistant"`.
- Wraps children in `<html>` and `<body>` with `bg-linen text-deepolive`.
- **`<body suppressHydrationWarning={true}>`** — suppresses React hydration mismatch warnings caused by browser extensions (e.g. Adobe Acrobat) injecting attributes like `__processed_*__` into `<body>` before React hydrates. This is the official React/Next.js fix; it only affects that element and has zero production impact.

---

### `frontend/src/app/globals.css`
- Imports Tailwind CSS v4 (`@import "tailwindcss"`).
- Registers warm earthy palette via `@theme` block with direct hex values:
  - `linen` (#FFF9F3), `latte` (#DBC4A5), `deepolive` (#44422D), `clockwork` (#72583E),
  - `cedar` (#7C7960), `mauve` (#755151), `cafenoir` (#443223), `weathered` (#A08670).
- Custom utilities: `shadow-warm-sm/md/lg`, `.sources-collapse` animation, `.custom-scrollbar`.

---

### `frontend/src/components/` (UI layer)
| Component | Purpose |
|---|---|
| `Sidebar.tsx` | Collapsible session sidebar; filename/chunk count; question history; "New Chat" button; mobile overlay; displays past conversations fetched from MongoDB |
| `MessageBubble.tsx` | User (Clockwork) and assistant bubbles; Mauve routed styling; timestamps |
| `SourcesPanel.tsx` | Collapsible "Sources (N)" pill; hidden by default |
| `ChatInput.tsx` | Sticky footer; auto-expanding textarea; icon send; Enter/Shift+Enter |
| `TypingIndicator.tsx` | Pulsing dots while `isSending` |
| `UploadScreen.tsx` | Drag-and-drop PDF dropzone; Clockwork spinner; Mauve error banner |
| `icons.tsx` | Inline SVG icons (no extra dependencies) |

---

### `frontend/src/lib/types.ts`
Shared TypeScript types:

```typescript
type Message = {
  role: "user" | "assistant";
  content: string;
  sourceChunks?: string[];   // Optional: shown under assistant messages
  routed?: boolean;          // Optional: whether this was a safety-routed response
};

type UploadResponse = {
  session_id: string;
  filename: string;
  chunk_count: number;
  status: string;
};

type ChatResponse = {
  answer: string;
  source_chunks: string[];
  routed: boolean;
};
```

---

### `frontend/src/lib/api.ts`
Axios-based API client. Base URL defaults to `http://127.0.0.1:8000` (overridden by `NEXT_PUBLIC_API_URL`).

**`uploadDocument(file: File): Promise<UploadResponse>`**
- POSTs to `/api/upload` as `multipart/form-data` with the file field named `"file"`.
- On Axios error: extracts `error.response.data.detail` for human-readable error message.

**`sendChatMessage(sessionId, query, chatHistory=[]): Promise<ChatResponse>`**
- POSTs to `/api/chat` with JSON body:
  ```json
  { "session_id": "...", "query": "...", "chat_history": [...] }
  ```
- `chatHistory` is typed as `{ role: "user" | "assistant"; content: string }[]`.
- On Axios error: extracts `error.response.data.detail`.

---

### `frontend/src/app/page.tsx`
Main orchestrator component (`"use client"`). Owns all state and API logic; delegates rendering to components.

**State:**
- `uploadedFile: File | null` — currently selected file
- `sessionInfo: UploadResponse | null` — set after successful upload; drives which view is shown
- `messages: Message[]` — conversation history
- `isUploading: boolean` — controls upload loading state
- `isSending: boolean` — controls send loading state
- `error: string | null` — upload error display
- `chatInput: string` — controlled chat input value
- `sidebarOpen: boolean` — sidebar visibility (default: `false`)

**Refs:**
- `fileInputRef` — ref to the hidden file `<input>`
- `chatContainerRef` — ref to scrollable chat area
- `userMessageRefs` — `Map<number, HTMLDivElement>` for scroll-to-message and auto-scroll

**Functions:**
- `handleFileChange` — fires on file selection, calls `handleUpload(file)` immediately.
- `handleUpload(file)` — calls `uploadDocument(file)`, sets `sessionInfo` on success.
- `handleSendMessage(event)` — form submit handler:
  1. Reads `chatInput` state (controlled input).
  2. Adds user message to `messages` state.
  3. Clears input with `setChatInput("")`.
  4. Builds `priorHistory` from the messages state BEFORE the new user message.
  5. Calls `sendChatMessage(session_id, query, priorHistory)`.
  6. Appends assistant response to `messages`.
- `handleStartOver` — resets all state, clears file input.

**UI layout (conditional):**
- **No session** → `UploadScreen` component (drag-and-drop dropzone).
- **Session active** → Chat layout:
  - Collapsible `Sidebar` (closed by default) + main chat column.
  - Header with sidebar toggle and app title.
  - Scrollable message list via `MessageBubble`; auto-scrolls to latest user message.
  - `TypingIndicator` while `isSending`.
  - Sticky `ChatInput` at bottom.

---

## 6. End-to-End Data Flow

### Phase A: Document Upload

```
User selects PDF
    → handleFileChange() fires
    → handleUpload(file) called
    → api.uploadDocument(file)
        → POST /api/upload (multipart/form-data)
        → FastAPI: validates .pdf extension
        → saves to temp file
        → process_pdf(): PyPDFLoader → RecursiveCharacterTextSplitter → attach title metadata
        → vector_store_manager.create_session(session_id, chunks)
            → HuggingFaceEmbeddings (singleton) embeds all chunks
            → Chroma.from_documents() stores in memory
        → deletes temp file
        → returns { session_id, filename, chunk_count, status }
    → frontend: setSessionInfo(response) → switches to chat view
```

### Phase B: Chat Message (Multi-Turn RAG)

```
User types query, clicks Send (or presses Enter)
    → handleSendMessage() fires
    → user message appended to messages state
    → api.sendChatMessage(session_id, query, priorHistory)
        → POST /api/chat { session_id, query, chat_history }
        → FastAPI: ChatRequest validated by Pydantic
        → generate_answer(session_id, query, chat_history)
            1. check_sensitive_topic(query)
               → regex match against keyword list
               → if match: return { answer: canned_response, routed: true }
            2. is_meta_conversation_query(query)
               → if match and empty history: return "We haven't discussed anything yet..."
               → if match with history: conversation_summary_chain → return summary (no retrieval)
            3. reformulate_query(chat_history, query)
               → if history exists: invoke reformulation_chain (LLM call)
               → returns standalone query
            4. vector_store_manager.get_retriever(session_id, k=5)
               → looks up Chroma instance by session_id
               → raises SessionNotFoundError if not found → 404
            5. retriever.invoke(reformulated_query)
               → ChromaDB similarity search → top 5 chunks
            6. format_docs(retrieved_docs)
               → join chunks, prepend document title
            7. rag_chain.invoke({ context, input: reformulated_query })
               → GROUNDED_QA_PROMPT | ChatGroq | StrOutputParser
               → LLM generates grounded answer
            8. return { answer, source_chunks: [200-char previews], routed: false }
        → ChatResponse validated by Pydantic
    → frontend: assistant message appended to messages state
    → UI renders assistant bubble with answer + source chunks
```

---

## 7. Known Bugs — All Resolved ✅

All four originally documented bugs have been fixed:

| # | Severity | Issue | Fix | Status |
|---|---|---|---|---|
| 1 | CRITICAL | Send button permanently disabled (uncontrolled input) | Controlled `chatInput` state in `page.tsx` | ✅ Fixed |
| 2 | CRITICAL | Missing `allow_credentials=True` in CORS | Added to `main.py` CORSMiddleware | ✅ Fixed |
| 3 | MEDIUM | Mutable default `[]` in `ChatRequest` | `Field(default_factory=list)` in `schemas.py` | ✅ Fixed |
| 4 | MEDIUM | `chat_history` type annotation with `# type: ignore` | `Optional[List[Dict[str, str]]] = None` | ✅ Fixed |

### Additional fixes (post-initial bug pass)
| Issue | Fix | Status |
|---|---|---|
| Meta-conversation queries ("summarize this chat") sent through RAG incorrectly | `is_meta_conversation_query()` + `CONVERSATION_SUMMARY_PROMPT` in `chat_service.py` | ✅ Fixed |
| Custom Tailwind palette not rendering (v4 `@theme inline` issue) | Direct hex values in `@theme` block; renamed tokens `deepolive`, `cafenoir` | ✅ Fixed |
| Sidebar open by default | `sidebarOpen` initial state changed to `false` | ✅ Fixed |

---

## 8. Configuration Reference

| Setting | Source | Value |
|---|---|---|
| Backend URL | `frontend/.env.local` | `http://127.0.0.1:8000` |
| Frontend URL | `backend/.env` ALLOWED_ORIGINS | `http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000` |
| Dev server binding | `package.json` dev script | `--hostname 0.0.0.0` (all interfaces) |
| HMR allowed origins | `next.config.ts` allowedDevOrigins | CIDR: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` |
| LLM | `chat_service.py` | `llama-3.3-70b-versatile` (Groq) |
| LLM Temperature | `chat_service.py` | `0.0` |
| Embedding Model | `.env` / `config.py` | `sentence-transformers/all-MiniLM-L6-v2` |
| Chunk Size | `.env` | `800` chars |
| Chunk Overlap | `.env` | `150` chars (config.py default is 200) |
| Retriever k | `chat_service.py` | `5` chunks per query |
| Chat history window | `chat_service.py` | Last 4 messages for reformulation |
| Vector store | `vector_store.py` | In-memory ChromaDB (ephemeral) |

---

## 9. How to Run the Project

### Backend
```bash
cd hr-rag-chatbot/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd hr-rag-chatbot/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 10. Development Status (from project_tracker.md)

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Project setup, backend skeleton, FastAPI, Next.js init | ✅ Complete |
| Phase 2 | RAG chain: prompts, safety router, chat service, /api/chat | ✅ Complete |
| Phase 3 | Frontend API client: axios, typed functions, error handling | ✅ Complete |
| Phase 4 | Frontend UI: upload/chat views, state, loading, start-over | ✅ Complete |
| Phase 5 | Multi-turn conversation: query reformulation, chat history | ✅ Complete |
| Phase 6 | Bug fixes: send button, CORS, Pydantic default, type annotation | ✅ Complete |
| Phase 7 | High-fidelity UI redesign with warm palette & component split | ✅ Complete |
| Phase 8 | Meta-conversation queries, Tailwind v4 color fix, sidebar default | ✅ Complete |
| Phase 13 | Audit hardening (security, stability, best practices) | ✅ Complete |
| Phase 14 | API Error Handling & Asymmetric JWT Support (RS256/ES256 JWKS) | ✅ Complete |

### Optional / Future Work
- Persist vector store sessions across server restarts (currently ephemeral by design).
- Add authentication for session access.

---

## 11. Currently Working & Known Problems

This section details ongoing challenges and architectural friction we are actively managing:

1. **Supabase Asymmetric JWTs (`ES256` / `RS256`) vs Local Secrets**
   - **Problem:** Supabase projects are migrating to `ES256` asymmetric keys, meaning the `SUPABASE_JWT_SECRET` in `.env` is insufficient on its own.
   - **Current Status:** Fixed via dynamic JWKS fetching in `security.py`.
   - **Ongoing Risk:** `PyJWKClient` introduces a network call on the backend to fetch the public key. While cached by PyJWKClient, if the Supabase JWKS endpoint is unreachable, backend authentication will fail.

2. **Frontend Unhandled Rejections on Backend Downtime**
   - **Problem:** If the FastAPI backend is completely down, Axios throws `ERR_NETWORK` or `ECONNREFUSED`. Previously, this crashed the UI or logged empty errors.
   - **Current Status:** Mitigated. `api.ts` now explicitly translates these into "Network error: Cannot connect to backend", and `page.tsx` displays this via `setError()` or browser alerts rather than crashing.
   - **Ongoing Risk:** A true offline state or backend crash still relies on generic error toasts.

3. **Ephemeral Vector Store (ChromaDB)**
   - **Problem:** The backend vector store resets entirely if `uvicorn` reloads. Users must re-upload PDFs to continue chatting.
   - **Current Status:** Documented as a known limitation in `SECURITY.md` and `vector_store.py`.
   - **Ongoing Goal:** Needs persistent storage (Redis / MongoDB integration for Chroma data).

---

## 12. What the Next Agent Should Know

- **All originally known bugs are fixed** — send button, CORS, Pydantic default, type annotation, Tailwind colors, sidebar default.
- **`/api/check-sensitive-topic` endpoint is live** — implemented in `routes/upload.py`; now requires authentication.
- **Embedding model is pre-loaded at startup** — `main.py` uses an `asynccontextmanager` lifespan to call `VectorStoreManager.get_embedding_function()` inside `asyncio.to_thread()` to avoid blocking the event loop.
- **HMR cross-origin warning is permanently fixed** — `allowedDevOrigins` uses CIDR ranges (no hardcoded IPs); dev server binds `0.0.0.0`; backend CORS always includes `localhost:3000`, `127.0.0.1:3000`, and `0.0.0.0:3000` in code regardless of `.env`.
- **UI is componentized** — `page.tsx` owns state/handlers; rendering lives in `src/components/`.
- **Meta-conversation queries** ("summarize this chat", "what did I ask") are handled by `is_meta_conversation_query()` and bypass the RAG pipeline.
- **Tailwind v4** — colors registered via `@theme { --color-*: #hex }` in `globals.css`; use `deepolive`, `cafenoir`, etc. (no hyphens).
- **The backend RAG pipeline is architecturally sound** — safety routing → meta-query check → reformulation → retrieval → grounded answer.
- **The embedding model is loaded as a singleton** — do not reinitialize `VectorStoreManager` or `HuggingFaceEmbeddings` unnecessarily.
- **Sessions are ephemeral** — if the FastAPI server restarts, all sessions are lost and users must re-upload their PDF. See `SECURITY.md` and module docstring in `vector_store.py`.
- **The Groq API key is in `.env`** — treat it as sensitive; never commit `.env` to version control. See `SECURITY.md` for rotation steps.
- **Authentication is implemented** — Supabase JWT is verified on ALL routes including `/api/upload` and `/api/check-sensitive-topic`.
- **`SUPABASE_JWT_SECRET` is required** — no fallback default exists; backend will refuse to start without it set in `.env`.
- **Next.js version** — fixed from the non-existent `16.2.9` to `^15.2.4`.
- **LLM calls have retry logic** — `invoke_with_retry()` in `chat_service.py` retries up to 3 times with exponential backoff on Groq API failures.
- **Global error boundary** — `frontend/src/app/error.tsx` catches module-load failures and renders a helpful UI instead of a white screen.

---

## 13. Phase 13 — Audit Hardening (Security, Stability & Best Practices)

Applied all fixes from `hr-rag-chatbot-audit-report.md`.

### Files Modified
| File | What Changed |
|---|---|
| `frontend/src/lib/supabase.ts` | Added URL format regex guard (Fix A2); improved error messages |
| `.gitignore` | Added `frontend/.env.local`, `frontend/.env*.local` (Fix A3) |
| `backend/app/core/config.py` | Removed hardcoded `fallback_secret_for_dev_mode_only` JWT default (Fix B3) |
| `backend/.env` | Added `SUPABASE_JWT_SECRET` entry; preserved all existing values |
| `backend/app/routes/chat.py` | Wrapped `generate_answer` in `asyncio.to_thread` (Fix B2); added conversation title TODO |
| `backend/app/routes/upload.py` | Added `Depends(get_current_user)` to both endpoints (Fix B4); added 25 MB size limit (Fix B6) |
| `frontend/package.json` | Fixed Next.js version `16.2.9` → `^15.2.4` (Fix B5) |
| `backend/.env.example` | Enhanced with full documentation, SUPABASE_JWT_SECRET, security warnings |
| `backend/requirements.txt` | Added minimum version constraints (Fix B9) |
| `frontend/.env.local` | Added inline documentation comments for both API URL variables (Fix B8) |
| `frontend/src/app/page.tsx` | `useState<any>` → `User | null` and `ConversationResponse[]` (Fix B10); added `onAuthStateChange` listener |
| `frontend/src/app/signup/page.tsx` | Added `minLength={8}` + placeholder to password input |
| `frontend/src/lib/types.ts` | Added `ConversationResponse` type alias for `Conversation` |
| `backend/app/services/vector_store.py` | Replaced all `print("[DEBUG]...")` with `logging.getLogger(__name__)` (Fix B7); added in-memory warning docstring |
| `backend/app/services/chat_service.py` | Added `invoke_with_retry()` with exponential backoff for all LLM calls |
| `backend/app/main.py` | Wrapped `get_embedding_function()` in `asyncio.to_thread` (Phase 4) |

### Files Created
| File | Purpose |
|---|---|
| `frontend/.env.example` | Documents all frontend env variables for new developers |
| `SECURITY.md` | Credential rotation instructions, git history purge, RLS docs, in-memory session warning |
| `frontend/src/app/error.tsx` | Next.js global error boundary — prevents white screen on module-load failures |

---

## 14. Phase 14 — API Error Handling & Asymmetric JWT Support

This phase focused on fixing frontend unhandled API errors and supporting Supabase's newer asymmetric JWT algorithms (`RS256` and `ES256`).

### Files Modified
| File | What Changed |
|---|---|
| `frontend/src/lib/api.ts` | Completely rewritten `formatApiError`. Prevents empty `[API Error] {}` logs and gracefully maps HTTP statuses (401, 403, 413, 500) to user-friendly messages. Handles `ECONNREFUSED` safely. |
| `frontend/src/app/page.tsx` | Wrapped API calls to intercept 401 Session Expired messages and push users to `/login` without crashing. |
| `frontend/src/lib/types.ts` | Explicitly typed `ConversationResponse` with `_id`, `created_at`, `updated_at`. |
| `backend/app/core/security.py` | Added dynamic JWKS fetching from the token's `iss` URL to support `RS256` and `ES256` algorithms securely without requiring the `SUPABASE_URL` env variable. |
| `backend/requirements.txt` | Added `cryptography>=43.0.0` which is strictly required by PyJWT to verify ES256 (ECDSA) tokens. |
