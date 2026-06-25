import os
import tempfile
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import settings
from app.core.security import get_current_user
from app.core.database import db
from app.services.document_processor import NoTextFoundError, process_pdf
from app.services.vector_store import vector_store_manager
from app.services.safety_router import check_sensitive_topic
from app.models.schemas import SensitiveTopicRequest, SensitiveTopicResponse

router = APIRouter()

@router.post("/check-sensitive-topic", response_model=SensitiveTopicResponse)
async def check_sensitive_topic_endpoint(
    request: SensitiveTopicRequest,
    _user_id: str = Depends(get_current_user),
):
    try:
        result = check_sensitive_topic(request.query)
        if result is not None:
            return SensitiveTopicResponse(is_sensitive=True, message=result)
        return SensitiveTopicResponse(is_sensitive=False, message=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error checking safety: {e}")

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only PDFs are allowed."
        )

    document_id = str(uuid.uuid4())
    temp_file_path = None
    session_created = False

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file_path = temp_file.name
            MAX_BYTES = 25 * 1024 * 1024
            content = await file.read(MAX_BYTES + 1)
            if len(content) > MAX_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail="File is too large. Maximum allowed size is 25 MB."
                )
            temp_file.write(content)

        # Upload to GridFS
        grid_in = db.fs.open_upload_stream(file.filename)
        await grid_in.write(content)
        await grid_in.close()
        gridfs_id = grid_in._id

        try:
            chunks = process_pdf(
                file_path=temp_file_path,
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )
        except NoTextFoundError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to process PDF: {e}")

        # Add to vector store
        vector_store_manager.index_document(user_id, document_id, chunks)
        session_created = True

        # Save metadata to MongoDB
        await db.db.documents.insert_one({
            "_id": document_id,
            "user_id": user_id,
            "filename": file.filename,
            "gridfs_id": gridfs_id,
            "chunk_count": len(chunks),
            "upload_timestamp": datetime.now(timezone.utc).isoformat(),
            "processing_status": "indexed"
        })

    except HTTPException:
        raise
    except Exception as e:
        if session_created:
            vector_store_manager.delete_document(user_id, document_id)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return {
        "document_id": document_id,
        "filename": file.filename,
        "chunk_count": len(chunks),
        "status": "indexed",
    }
