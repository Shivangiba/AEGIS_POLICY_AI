"""
This module defines the Pydantic models used for API request and response validation.

These schemas ensure that the data exchanged between the client and the server
is well-formed and adheres to the expected types and constraints.
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request model for the /chat/message endpoint."""

    document_ids: List[str]
    query: str
    chat_history: list[dict] = Field(default_factory=list)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response model for the /chat/message endpoint."""
    answer: str
    source_chunks: List[str]
    routed: bool
    conversation_id: Optional[str] = None


class SensitiveTopicRequest(BaseModel):
    """Request model for the check_sensitive_topic endpoint."""
    query: str


class SensitiveTopicResponse(BaseModel):
    """Response model for the check_sensitive_topic endpoint."""
    is_sensitive: bool
    message: Optional[str] = None

class ConversationHistoryItem(BaseModel):
    question: str
    answer: str
    timestamp: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    document_id: Optional[str] = None

class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]

class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    document_id: Optional[str] = None
    conversation_history: List[ConversationHistoryItem]


