# """
# This module defines the API routes for the chat functionality.

# It handles incoming chat requests, orchestrates the call to the chat service,
# and manages exceptions to provide clear, standardized error responses.
# """
# from datetime import datetime, timezone
# import asyncio
# import uuid
# from bson import ObjectId
# from fastapi import APIRouter, HTTPException, Depends

# from app.models.schemas import ChatRequest, ChatResponse, ConversationListResponse, ConversationDetailResponse, ConversationHistoryItem, ConversationResponse
# from app.services.chat_service import generate_answer
# from app.core.security import get_current_user
# from app.core.database import db

# router = APIRouter()


# @router.get("/chat/conversations", response_model=ConversationListResponse)
# async def get_conversations(user_id: str = Depends(get_current_user)):
#     """
#     Fetches the list of conversations for the authenticated user.
#     """
#     cursor = db.db.conversations.find({"user_id": user_id}, {"_id": 1, "title": 1}).sort("created_at", -1)
#     conversations = await cursor.to_list(length=100)
    
#     return ConversationListResponse(
#         conversations=[
#             ConversationResponse(id=str(conv["_id"]), title=conv.get("title", "Untitled Chat"))
#             for conv in conversations
#         ]
#     )

# @router.get("/chat/conversations/{conversation_id}", response_model=ConversationDetailResponse)
# async def get_conversation_detail(conversation_id: str, user_id: str = Depends(get_current_user)):
#     """
#     Fetches the full conversation details including history.
#     """
#     try:
#         obj_id = ObjectId(conversation_id)
#     except Exception:
#         raise HTTPException(status_code=400, detail="Invalid conversation ID")
        
#     conversation = await db.db.conversations.find_one({"_id": obj_id, "user_id": user_id})
#     if not conversation:
#         raise HTTPException(status_code=404, detail="Conversation not found")
        
#     history = [
#         ConversationHistoryItem(
#             question=item["question"],
#             answer=item["answer"],
#             timestamp=item["timestamp"]
#         ) for item in conversation.get("conversation_history", [])
#     ]
    
#     return ConversationDetailResponse(
#         id=str(conversation["_id"]),
#         title=conversation.get("title", "Untitled Chat"),
#         conversation_history=history
#     )


# @router.post("/chat/message", response_model=ChatResponse)
# async def handle_chat_request(request: ChatRequest, user_id: str = Depends(get_current_user)):
#     """
#     Handles a user's chat query for a specific session.

#     This endpoint is the main entry point for the RAG Q&A functionality.
#     It validates the request, calls the chat generation service, and handles
#     potential errors like invalid sessions or internal processing failures.

#     Args:
#         request (ChatRequest): The incoming request containing the session ID
#                                and user query.

#     Returns:
#         ChatResponse: The generated answer, source documents, and routing status.

#     Raises:
#         HTTPException:
#             - 404 if the session ID is not found or has expired.
#             - 500 for any other internal server errors.
#     """
#     try:
#         # generate_answer is synchronous (calls retriever.invoke + LLM chain.invoke).
#         # Wrap in asyncio.to_thread so the event loop remains free to serve
#         # other requests while the LLM call is in progress.
#         import functools
#         # result = await asyncio.to_thread(
#         #     functools.partial(
#         #         generate_answer,
#         #         session_id=request.session_id,
#         #         query=request.query,
#         #         chat_history=request.chat_history,
#         #     )
#         # )
#         result = await asyncio.to_thread(
#     generate_answer,
#     request.session_id,
#     request.query,
#     request.chat_history,
#   )
        
#         # Prepare the conversation turn object
#         timestamp = datetime.now(timezone.utc).isoformat()
#         turn_obj = {
#             "question": request.query,
#             "answer": result["answer"],
#             "timestamp": timestamp
#         }
        
#         conversation_id = request.conversation_id
        
#         if conversation_id:
#             try:
#                 obj_id = ObjectId(conversation_id)
#                 # Verify ownership and update
#                 update_result = await db.db.conversations.update_one(
#                     {"_id": obj_id, "user_id": user_id},
#                     {"$push": {"conversation_history": turn_obj}}
#                 )
#                 if update_result.matched_count == 0:
#                     raise ValueError("Conversation not found or access denied")
#             except Exception as e:
#                  raise ValueError(f"Database error: {e}")
#         else:
#             # Create a new conversation document
#             # TODO: Improve conversation title generation.
#             # Current limitation: title is set to the first 40 chars of the first query
#             # and NEVER updated. If the first query is "Hi" or "Hello", every conversation
#             # in the sidebar will show "Hi" as its title, making it impossible to distinguish
#             # past chats. A better approach:
#             #   1. After the first full Q&A exchange, send both question + answer to the LLM
#             #      and ask it to generate a concise 5-7 word title.
#             #   2. Store the generated title with a PATCH request to update the conversation doc.
#             # This requires an additional async LLM call but dramatically improves UX.
#             title = request.query[:40] + "..." if len(request.query) > 40 else request.query
#             new_chat = {
#                 "user_id": user_id,
#                 "title": title,
#                 "created_at": timestamp,
#                 "conversation_history": [turn_obj]
#             }
#             insert_result = await db.db.conversations.insert_one(new_chat)
#             conversation_id = str(insert_result.inserted_id)
            
#         result["conversation_id"] = conversation_id
#         return result
#     except ValueError as e:
#         # This is raised by our service for invalid/expired sessions
#         raise HTTPException(status_code=404, detail=str(e))
#     except Exception:
#         # Catch-all for any other unexpected errors
#         # Avoid leaking internal error details to the client
#         raise HTTPException(
#             status_code=500,
#             detail="An internal error occurred while processing your question.",
#         )
"""
This module defines the API routes for the chat functionality.

It handles incoming chat requests, orchestrates the call to the chat service,
and manages exceptions to provide clear, standardized error responses.
"""
from datetime import datetime, timezone
import asyncio
import uuid
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import ChatRequest, ChatResponse, ConversationListResponse, ConversationDetailResponse, ConversationHistoryItem, ConversationResponse
from app.services.chat_service import generate_answer
from app.core.security import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/chat/conversations", response_model=ConversationListResponse)
async def get_conversations(user_id: str = Depends(get_current_user)):
    """
    Fetches the list of conversations for the authenticated user.
    """
    cursor = db.db.conversations.find({"user_id": user_id}, {"_id": 1, "title": 1, "document_id": 1}).sort("created_at", -1)
    conversations = await cursor.to_list(length=100)
    
    return ConversationListResponse(
        conversations=[
            ConversationResponse(id=str(conv["_id"]), title=conv.get("title", "Untitled Chat"), document_id=conv.get("document_id"))
            for conv in conversations
        ]
    )


@router.get("/chat/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_detail(conversation_id: str, user_id: str = Depends(get_current_user)):
    """
    Fetches the full conversation details including history.
    """
    try:
        obj_id = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
        
    conversation = await db.db.conversations.find_one({"_id": obj_id, "user_id": user_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    history = [
        ConversationHistoryItem(
            question=item["question"],
            answer=item["answer"],
            timestamp=item["timestamp"]
        ) for item in conversation.get("conversation_history", [])
    ]
    
    return ConversationDetailResponse(
        id=str(conversation["_id"]),
        title=conversation.get("title", "Untitled Chat"),
        document_id=conversation.get("document_id"),
        conversation_history=history
    )


@router.post("/chat/message", response_model=ChatResponse)
async def handle_chat_request(request: ChatRequest, user_id: str = Depends(get_current_user)):
    """
    Handles a user's chat query for a specific session.
    """
    try:
        # generate_answer is synchronous (calls retriever.invoke + LLM chain.invoke).
        # Wrap in asyncio.to_thread so the event loop remains free.
        result = await asyncio.to_thread(
            generate_answer,
            user_id,
            request.document_ids,
            request.query,
            request.chat_history,
        )
        
        # Prepare the conversation turn object
        timestamp = datetime.now(timezone.utc).isoformat()
        turn_obj = {
            "question": request.query,
            "answer": result["answer"],
            "timestamp": timestamp
        }
        
        conversation_id = request.conversation_id
        
        if conversation_id:
            try:
                obj_id = ObjectId(conversation_id)
                update_result = await db.db.conversations.update_one(
                    {"_id": obj_id, "user_id": user_id},
                    {"$push": {"conversation_history": turn_obj}}
                )
                if update_result.matched_count == 0:
                    raise ValueError("Conversation not found or access denied")
            except Exception as e:
                 raise ValueError(f"Database error: {e}")
        else:
            # TODO: Improve conversation title generation.
            # Current limitation: title is set to the first 40 chars of the first query
            # and NEVER updated. Consider generating a title via LLM after first Q&A.
            title = request.query[:40] + "..." if len(request.query) > 40 else request.query
            new_chat = {
                "user_id": user_id,
                "document_id": request.document_ids[0] if request.document_ids else None,
                "document_ids": request.document_ids,
                "title": title,
                "created_at": timestamp,
                "conversation_history": [turn_obj]
            }
            insert_result = await db.db.conversations.insert_one(new_chat)
            conversation_id = str(insert_result.inserted_id)
            
        # Update last_chat_at for associated documents
        if request.document_ids:
            await db.db.documents.update_many(
                {"_id": {"$in": request.document_ids}, "user_id": user_id},
                {"$set": {"last_chat_at": timestamp}}
            )
            
        result["conversation_id"] = conversation_id
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing your question.",
        )