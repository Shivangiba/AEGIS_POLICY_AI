from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import upload, chat
from app.services.vector_store import VectorStoreManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Pre-loading embedding model\u2026")
    VectorStoreManager.get_embedding_function()
    print("[Startup] Embedding model ready.")
    yield


app = FastAPI(lifespan=lifespan)

# Base origins that must always be allowed for local development,
# regardless of what is set in .env ALLOWED_ORIGINS.
_BASE_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
]

# Merge base origins with any additional origins from .env (deduplicated).
_cors_origins = list(dict.fromkeys(_BASE_DEV_ORIGINS + settings.BACKEND_CORS_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "healthy"}
