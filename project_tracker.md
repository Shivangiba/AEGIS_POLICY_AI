# Project Tracker: HR RAG Chatbot

This file tracks the progress of the HR RAG Chatbot project.

## Phase 1: Project Setup & Backend Skeleton

All initial setup tasks for the backend and frontend are complete. The basic structure is in place, and the core components for document processing and session management have been created.

### Backend
- [x] Create initial directory structure (`/backend/app` with subdirectories).
- [x] Create FastAPI app instance in `main.py` with CORS and health check.
- [x] Create Pydantic settings in `core/config.py`.
- [x] Populate `requirements.txt` with initial dependencies.
- [x] Populate `.env.example` and `.env` files.
- [x] Create `VectorStoreManager` in `services/vector_store.py` to handle ephemeral ChromaDB instances.
- [x] Create `process_pdf` function in `services/document_processor.py`.
- [x] Create `/api/upload` endpoint in `routes/upload.py`.

### Frontend
- [x] Create Next.js application in `/frontend`.

### General
- [x] Initialize `project_tracker.md`.

---

## Phase 2: RAG Chain Implementation

- [x] Define `GROUNDED_QA_PROMPT` in `core/prompts.py`.
- [x] Create `check_sensitive_topic` function in `services/safety_router.py`.
- [x] Create `generate_answer` service in `services/chat_service.py`.
- [x] Create `/api/chat` endpoint in `routes/chat.py`.

### Backend
- [x] Create `check_sensitive_topic` endpoint in `routes/upload.py`.
  - `POST /api/check-sensitive-topic` accepts `SensitiveTopicRequest { query }` and returns `SensitiveTopicResponse { is_sensitive, message }`.

- [x] In `chat_service.py`, changed the retriever's `k` parameter from 3 to 5.
- [x] In `config.py`, increased `CHUNK_OVERLAP` from 150 to 200.
- [x] In `prompts.py`, updated `GROUNDED_QA_PROMPT` to clarify handling of information across multiple context segments.
- [x] In `document_processor.py`, modified `process_pdf()` to extract a document title and attach it to each chunk's metadata.
- [x] In `chat_service.py`, updated `format_docs()` to prepend the document title to the context string.

---

## Errors Encountered & Resolutions

This section documents issues faced during development and how they were fixed.

1.  **Error**: `ModuleNotFoundError: No module named 'langchain.text_splitter'`
    -   **Context**: Occurred when running the FastAPI server with `uvicorn`.
    -   **Reason**: The `langchain` library was updated, and the `RecursiveCharacterTextSplitter` class was moved to its own separate package (`langchain-text-splitters`).
    -   **Resolution**:
        1.  Updated the import statement in `backend/app/services/document_processor.py` to `from langchain_text_splitters import RecursiveCharacterTextSplitter`.
        2.  Added `langchain-text-splitters` to the `backend/requirements.txt` file.
        3.  Re-installed dependencies using `pip install -r requirements.txt`.

2.  **Error**: `ModuleNotFoundError: No module named 'langchain.chains'`
    -   **Context**: Occurred when trying to import `create_stuff_documents_chain`.
    -   **Reason**: The function was moved in newer versions of LangChain.
    -   **Resolution**: Updated the import path in `backend/app/services/chat_service.py` to `from langchain.chains.combine_documents import create_stuff_documents_chain`.

---

## Phase 3: Frontend API Client

This phase focuses on building the frontend infrastructure to communicate with the backend API.

- [x] Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL`.
- [x] Install `axios` in the frontend project.
- [x] Create a typed API client in `frontend/src/lib/api.ts`.
  - [x] Define `UploadResponse` and `ChatResponse` types.
  - [x] Implement `uploadDocument` function for file uploads.
  - [x] Implement `sendChatMessage` function for sending user queries.
  - [x] Add robust error handling to interpret FastAPI error responses.

---

## Phase 4: Frontend UI Implementation

This phase covers the creation of the main user interface for the chatbot.

- [x] Create the main page component in `frontend/src/app/page.tsx`.
  - [x] Implement state management for file uploads, session info, messages, and loading/error states.
  - [x] Create a conditional layout: one view for uploading a document, and another for the chat interface.
  - [x] Wire up the file upload functionality to the `uploadDocument` API call.
  - [x] Wire up the chat input to the `sendChatMessage` API call.
  - [x] Display chat messages, including user queries and assistant responses with source chunks.
  - [x] Add a "Start Over" button to reset the session.
  - [x] Implement loading indicators for asynchronous operations.

---

## Phase 5: Multi-Turn Conversation Support

This phase enhances the chatbot's ability to handle follow-up questions by implementing query reformulation.

- [x] In `backend/app/core/prompts.py`, add `REFORMULATE_QUERY_PROMPT`.
- [x] In `backend/app/services/chat_service.py`:
  - [x] Create `reformulate_query` function to rewrite contextual questions into standalone queries.
  - [x] Integrate reformulation into `generate_answer` to improve retrieval accuracy in conversations.
  - [x] Update `generate_answer` to use the reformulated query for both retrieval and final answer generation, while checking the original query for safety.
- [x] In `backend/app/models/schemas.py`, add `chat_history` to the `ChatRequest` model.
- [x] In `backend/app/routes/chat.py`, update the `/chat` endpoint to accept and pass `chat_history`.
- [x] In `frontend/src/lib/api.ts`, update `sendChatMessage` to include the conversation history.
- [x] In `frontend/src/app/page.tsx`, pass the `messages` state as chat history when sending a new message.

---

## Phase 6: Bug Fixes & Stability

All four known bugs documented in `project_summary.md` were identified and resolved.

### Frontend
- [x] **Bug 1 — Send button permanently disabled** (`frontend/src/app/page.tsx`)
  - Converted chat input from uncontrolled ref to controlled `chatInput` state with `value` + `onChange`.
  - Send button `disabled` check now uses `chatInput.trim()` instead of `chatInputRef.current?.value`.

### Backend
- [x] **Bug 2 — Missing CORS credentials** (`backend/app/main.py`)
  - Added `allow_credentials=True` to `CORSMiddleware` to prevent cross-origin request blocking between `localhost:3000` and `127.0.0.1:8000`.

- [x] **Bug 3 — Mutable default in Pydantic schema** (`backend/app/models/schemas.py`)
  - Changed `chat_history: list[dict] = []` to `chat_history: list[dict] = Field(default_factory=list)`.

- [x] **Bug 4 — Incorrect type annotation** (`backend/app/services/chat_service.py`)
  - Changed `chat_history: List[Dict[str, str]] = None  # type: ignore` to `chat_history: Optional[List[Dict[str, str]]] = None`.

---

## Phase 7: High-Fidelity UI Redesign

Full UI/UX redesign applied on top of existing working API logic. No changes to `api.ts` function signatures, data shapes, or core state/handler logic in `page.tsx`.

### Design System
- [x] Defined warm earthy color palette in `frontend/src/app/globals.css` (Tailwind v4 `@theme`).
  - Colors: `linen`, `latte`, `deepolive`, `clockwork`, `cedar`, `mauve`, `cafenoir`, `weathered`.
- [x] Updated `frontend/src/app/layout.tsx` — Inter (body) + Lora (headings), metadata title "HR Policy Assistant".

### New Components (`frontend/src/components/`)
- [x] `icons.tsx` — Inline SVG icons (no new npm dependencies).
- [x] `Sidebar.tsx` — Collapsible Claude/Gemini-style sidebar with session info, question history, "New Chat" button, mobile overlay.
- [x] `MessageBubble.tsx` — User (Clockwork) and assistant (minimal chrome) bubbles; Mauve styling for routed/safety messages; timestamps.
- [x] `SourcesPanel.tsx` — Collapsible "Sources (N)" pill toggle with smooth expand animation and Latte/Cedar card styling.
- [x] `ChatInput.tsx` — Sticky footer, auto-expanding textarea, icon send button, Enter/Shift+Enter handling.
- [x] `TypingIndicator.tsx` — Pulsing dots while assistant response is loading.
- [x] `UploadScreen.tsx` — Warm dropzone with drag-and-drop, Clockwork spinner, Mauve error banner.

### UX Features (`frontend/src/app/page.tsx`)
- [x] Collapsible sidebar with smooth width transition (200–300ms); clickable truncated question summaries scroll chat to that turn.
- [x] Auto-scroll to latest user message on send/response (`scrollIntoView({ behavior: "smooth", block: "start" })`).
- [x] Source chunks hidden by default; expand on user click only.
- [x] Sticky bottom input area with pill-shaped container.
- [x] Upload screen with drag-and-drop handlers (`onDragOver`, `onDragLeave`, `onDrop`).

---

## Phase 8: Meta-Conversation Queries & Frontend Polish

### Backend — Meta-conversation query handling
- [x] Added `CONVERSATION_SUMMARY_PROMPT` in `backend/app/core/prompts.py`.
  - Separate from `GROUNDED_QA_PROMPT`; summarizes chat history only, no document context.
- [x] Added `is_meta_conversation_query(query)` in `backend/app/services/chat_service.py`.
  - Word-boundary regex matching for phrases like "summarize this chat", "what did I ask", "recap our conversation", etc.
- [x] Integrated meta-query check in `generate_answer()` — runs after safety router, before reformulation/retrieval.
  - Empty history → returns `"We haven't discussed anything yet in this conversation."`
  - With history → uses `conversation_summary_chain` (existing `llm`, temperature 0.0).
  - Skips vector retrieval and RAG chain entirely for meta-queries.
  - Returns `{ answer, source_chunks: [], routed: False }`.

### Frontend — Tailwind color fix & sidebar default
- [x] **Detected Tailwind v4** (`tailwindcss@^4`, `@tailwindcss/postcss`, `@theme` in `globals.css`).
- [x] **Fixed custom colors not rendering** — replaced `@theme inline` with CSS variable indirection with direct hex values in `@theme { --color-*: #... }` block.
- [x] Renamed utility classes to match registered tokens: `deepolive`, `cafenoir` (replacing `deep-olive`, `cafe-noir`).
- [x] Replaced default Tailwind colors (`bg-white`, `gray-*`, `blue-*`) with palette equivalents across all components.
- [x] **Sidebar default state** — changed `useState(true)` to `useState(false)` so sidebar starts closed.

### Files updated in Phase 8 (frontend color pass)
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/UploadScreen.tsx`
- `frontend/src/components/ChatInput.tsx`
- `frontend/src/components/MessageBubble.tsx`
- `frontend/src/components/SourcesPanel.tsx`

---

## Phase 9: Safety Endpoint & Startup Optimization

### Backend
- [x] Implemented `POST /api/check-sensitive-topic` endpoint in `routes/upload.py`.
  - Accepts `SensitiveTopicRequest { query: str }` body.
  - Calls `check_sensitive_topic()` from `safety_router.py`.
  - Returns `SensitiveTopicResponse { is_sensitive: bool, message: Optional[str] }`.
  - Raises `HTTPException(500)` on unexpected errors.
- [x] Added `asynccontextmanager` lifespan handler to `main.py`.
  - Pre-loads the HuggingFace embedding model (`VectorStoreManager.get_embedding_function()`) at server startup.
  - Eliminates cold-start latency on the first upload request.
  - Prints `[Startup] Pre-loading embedding model…` and `[Startup] Embedding model ready.` to logs.

---

---

## Phase 10: Cross-Origin HMR/WebSocket Warning Fix

Fix for a recurring Next.js dev server cross-origin warning that appeared on every new network session due to DHCP IP reassignment.

**Root cause:** The `allowedDevOrigins` list in `next.config.ts` contained a hardcoded LAN IP (`10.152.183.197`) that became invalid after DHCP reassignment, causing Next.js to block HMR WebSocket connections from the new IP.

### Fix 1 — `frontend/next.config.ts` (allowedDevOrigins)
- [x] Replaced hardcoded LAN IP with CIDR notation for all three private IPv4 ranges:
  - `10.0.0.0/8` (Class A), `172.16.0.0/12` (Class B), `192.168.0.0/16` (Class C)
- [x] CIDR notation is supported in Next.js 15.1+; this project uses **Next.js 16.2.9**.
- [x] Preserved the existing `rewrites()` proxy block (backend API passthrough) unchanged.

### Fix 2 — `frontend/package.json` (dev script)
- [x] Changed `"dev": "next dev"` → `"dev": "next dev --hostname 0.0.0.0"`
- [x] Binds the dev server to all network interfaces, eliminating the binding mismatch between `localhost` and the machine's LAN IP.

### Fix 3 — `frontend/.env.local` (no change needed)
- [x] `NEXT_PUBLIC_API_URL` was already set to `http://127.0.0.1:8000` ✅

### Fix 4 — `backend/app/main.py` + `.env` + `.env.example` (CORS hardening)
- [x] Added `_BASE_DEV_ORIGINS` list in `main.py` with three always-allowed local origins:
  - `http://localhost:3000`, `http://127.0.0.1:3000`, `http://0.0.0.0:3000`
- [x] `_cors_origins` now merges `_BASE_DEV_ORIGINS` + `settings.BACKEND_CORS_ORIGINS` (deduplicated via `dict.fromkeys`).
- [x] Removed hardcoded LAN IP `http://10.152.183.197:3000` from `backend/.env` and replaced with `http://0.0.0.0:3000`.
- [x] Rewrote `backend/.env.example` with clear documentation explaining when to extend `ALLOWED_ORIGINS`.

### Fix 5 — `frontend/src/app/layout.tsx` (React hydration mismatch)
- [x] Added `suppressHydrationWarning={true}` to the `<body>` element.
- **Cause:** Adobe Acrobat browser extension injects a `__processed_*__` attribute into `<body>` before React hydrates, causing a server/client HTML mismatch warning in dev mode.
- **Why this fix:** `suppressHydrationWarning` is the official React/Next.js recommended approach — it silences the warning only on that specific element without disabling hydration checks anywhere else in the component tree. Only affects dev-mode warnings; has zero production impact.

### Files changed in Phase 10
- `frontend/next.config.ts`
- `frontend/package.json`
- `backend/app/main.py`
- `backend/.env`
- `backend/.env.example`

---

## Current Project Status

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
| Phase 9 | `/api/check-sensitive-topic` endpoint, lifespan startup embedding pre-load | ✅ Complete |
| Phase 10 | Cross-origin HMR fix: CIDR allowedDevOrigins, 0.0.0.0 binding, CORS hardening, suppressHydrationWarning | ✅ Complete |

### Optional / Future Work
- [ ] Persist vector store sessions across server restarts (currently ephemeral by design).
- [ ] Add authentication for session access.
