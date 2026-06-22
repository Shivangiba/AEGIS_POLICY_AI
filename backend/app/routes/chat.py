"""
This module defines the API routes for the chat functionality.

It handles incoming chat requests, orchestrates the call to the chat service,
and manages exceptions to provide clear, standardized error responses.
"""
from fastapi import APIRouter, HTTPException

from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import generate_answer

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def handle_chat_request(request: ChatRequest):
    """
    Handles a user's chat query for a specific session.

    This endpoint is the main entry point for the RAG Q&A functionality.
    It validates the request, calls the chat generation service, and handles
    potential errors like invalid sessions or internal processing failures.

    Args:
        request (ChatRequest): The incoming request containing the session ID
                               and user query.

    Returns:
        ChatResponse: The generated answer, source documents, and routing status.

    Raises:
        HTTPException:
            - 404 if the session ID is not found or has expired.
            - 500 for any other internal server errors.
    """
    try:
        result = generate_answer(
            session_id=request.session_id,
            query=request.query,
            chat_history=request.chat_history,
        )
        return result
    except ValueError as e:
        # This is raised by our service for invalid/expired sessions
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        # Catch-all for any other unexpected errors
        # Avoid leaking internal error details to the client
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing your question.",
        )
