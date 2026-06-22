import os
import tempfile
import uuid
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.services.document_processor import NoTextFoundError, process_pdf
from app.services.vector_store import vector_store_manager
from app.services.safety_router import check_sensitive_topic
from app.models.schemas import SensitiveTopicRequest, SensitiveTopicResponse

router = APIRouter()


@router.post("/check-sensitive-topic", response_model=SensitiveTopicResponse)
async def check_sensitive_topic_endpoint(request: SensitiveTopicRequest):
    """
    Checks if the provided query contains sensitive topics.

    Args:
        request (SensitiveTopicRequest): The request containing the query.

    Returns:
        SensitiveTopicResponse: True with a canned message if sensitive, False otherwise.
    """
    try:
        result = check_sensitive_topic(request.query)
        if result is not None:
            return SensitiveTopicResponse(is_sensitive=True, message=result)
        return SensitiveTopicResponse(is_sensitive=False, message=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error checking safety: {e}")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts a PDF file, processes it, and creates a new RAG session.

    - Validates that the uploaded file is a PDF.
    - Saves the file temporarily to disk.
    - Processes the PDF to extract text and split it into chunks.
    - Creates a new vector store session and indexes the document chunks.
    - Cleans up the temporary file after processing.

    Args:
        file (UploadFile): The PDF file uploaded by the user.

    Returns:
        JSONResponse: A confirmation message with the new session ID,
                      filename, and number of indexed chunks.
    
    Raises:
        HTTPException: 
            - 400 if the file is not a PDF.
            - 422 if the PDF processing fails (e.g., no text found).
            - 500 for other server-side errors.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only PDFs are allowed."
        )

    session_id = str(uuid.uuid4())
    temp_file_path = None
    session_created = False

    try:
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file_path = temp_file.name
            content = await file.read()
            temp_file.write(content)

        # Process the PDF to get document chunks
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

        # Create a new session in the vector store
        vector_store_manager.create_session(session_id, chunks)
        session_created = True

    except HTTPException:
        # Known, expected errors — re-raise as-is, no session to clean up
        raise
    except Exception as e:
        # Unexpected error — only clean up if a session was actually created
        if session_created:
            vector_store_manager.delete_session(session_id)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return {
        "session_id": session_id,
        "filename": file.filename,
        "chunk_count": len(chunks),
        "status": "indexed",
    }

