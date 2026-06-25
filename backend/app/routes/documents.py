from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.core.security import get_current_user
from app.core.database import db
from app.services.vector_store import vector_store_manager

router = APIRouter()

@router.get("/documents")
async def list_documents(user_id: str = Depends(get_current_user)):
    """
    Lists all documents uploaded by the current user.
    """
    cursor = db.db.documents.find({"user_id": user_id}).sort("upload_timestamp", -1)
    documents = await cursor.to_list(length=100)
    
    # Format for JSON response
    for doc in documents:
        doc["id"] = doc.pop("_id")
        doc["gridfs_id"] = str(doc["gridfs_id"])
        
    return documents

@router.get("/documents/{document_id}")
async def get_document(document_id: str, user_id: str = Depends(get_current_user)):
    """
    Fetches details for a single document.
    """
    doc = await db.db.documents.find_one({"_id": document_id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc["id"] = doc.pop("_id")
    doc["gridfs_id"] = str(doc["gridfs_id"])
    return doc

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user_id: str = Depends(get_current_user)):
    """
    Deletes a document's metadata, GridFS chunks, and ChromaDB embeddings.
    """
    # Verify ownership
    doc = await db.db.documents.find_one({"_id": document_id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete from GridFS
    try:
        await db.fs.delete(doc["gridfs_id"])
    except Exception as e:
        print(f"[DEBUG] GridFS delete error (may already be deleted): {e}")
        
    # Delete from Vector Store
    try:
        vector_store_manager.delete_document(user_id, document_id)
    except Exception as e:
        print(f"[DEBUG] Vector Store delete error: {e}")
        
    # Delete metadata
    await db.db.documents.delete_one({"_id": document_id})
    
    return {"status": "deleted"}
