from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import upload, chat
from app.services.vector_store import VectorStoreManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Pre-loading embedding model…")
    VectorStoreManager.get_embedding_function()
    print("[Startup] Embedding model ready.")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "healthy"}
