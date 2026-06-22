"""
This module defines the Pydantic models used for API request and response validation.

These schemas ensure that the data exchanged between the client and the server
is well-formed and adheres to the expected types and constraints.
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request model for the /chat endpoint."""

    session_id: str
    query: str
    chat_history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Response model for the /chat endpoint."""
    answer: str
    source_chunks: List[str]
    routed: bool


class SensitiveTopicRequest(BaseModel):
    """Request model for the check_sensitive_topic endpoint."""
    query: str


class SensitiveTopicResponse(BaseModel):
    """Response model for the check_sensitive_topic endpoint."""
    is_sensitive: bool
    message: Optional[str] = None

