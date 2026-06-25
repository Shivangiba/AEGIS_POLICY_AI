from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None # type: ignore
    db = None
    fs: AsyncIOMotorGridFSBucket = None # type: ignore

db = Database()

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db.db = db.client.hr_rag_chatbot
    db.fs = AsyncIOMotorGridFSBucket(db.db)

async def close_mongo_connection():
    db.client.close()
