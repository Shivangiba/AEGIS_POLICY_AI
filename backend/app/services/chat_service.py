"""
This module contains the core business logic for the chat service.

It orchestrates the RAG pipeline by coordinating the safety router,
vector store, and the language model to generate grounded answers.
"""
import re
from typing import Any, Dict, List, Optional
from pydantic import SecretStr
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_groq import ChatGroq

from app.core.config import settings
from app.core.prompts import (
    CONVERSATION_SUMMARY_PROMPT,
    GROUNDED_QA_PROMPT,
    REFORMULATE_QUERY_PROMPT,
)
from app.services.safety_router import check_sensitive_topic
from app.services.vector_store import vector_store_manager


def format_docs(docs: List[Document]) -> str:
    """
    Join retrieved document chunks into a single context string for the prompt.

    If a `document_title` is present in the first document's metadata, it
    prepends a title to the context string. This helps the LLM understand
    the source of the information.
    """
    # Prepend the document title if available in the first chunk
    title_prefix = ""
    if docs and "document_title" in docs[0].metadata:
        title = docs[0].metadata["document_title"]
        if title:
            title_prefix = f"Document: {title}\n\n"

    # Join the page content of all chunks
    content_str = "\n\n".join(doc.page_content for doc in docs)
    return f"{title_prefix}{content_str}"


# Initialize the LLM once at module level for efficiency — avoids
# reinitializing ChatGroq on every request.
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.0,
    api_key=SecretStr(settings.GROQ_API_KEY),
)

# LCEL chain: prompt -> llm -> string output parser
rag_chain = GROUNDED_QA_PROMPT | llm | StrOutputParser()
reformulation_chain = REFORMULATE_QUERY_PROMPT | llm | StrOutputParser()
conversation_summary_chain = CONVERSATION_SUMMARY_PROMPT | llm | StrOutputParser()

_SUMMARY_ACTION_PATTERN = re.compile(r"\b(summarize|summarise|recap)\b", re.IGNORECASE)
_CONVERSATION_REF_PATTERN = re.compile(
    r"\b(chat|conversation|asked|discussed)\b", re.IGNORECASE
)
_WHAT_DID_ASK_PATTERN = re.compile(
    r"\bwhat\b.{0,40}\b(i|we)\b.{0,30}\b(ask|asked)\b", re.IGNORECASE
)
_WHAT_DISCUSSED_PATTERN = re.compile(
    r"\bwhat\b.{0,40}\b(have|did)\b.{0,30}\b(discussed|talked|asked)\b",
    re.IGNORECASE,
)


def is_meta_conversation_query(query: str) -> bool:
    """
    Detect whether a query is asking about the conversation itself
    rather than the uploaded policy document.
    """
    if _SUMMARY_ACTION_PATTERN.search(query) and _CONVERSATION_REF_PATTERN.search(query):
        return True
    if _WHAT_DID_ASK_PATTERN.search(query):
        return True
    if _WHAT_DISCUSSED_PATTERN.search(query):
        return True
    return False


def reformulate_query(chat_history: list[dict], current_query: str) -> str:
    """
    Reformulates a follow-up question into a standalone query.

    This function implements query reformulation for multi-turn conversations.
    It rewrites a user's potentially contextual or incomplete follow-up question
    into a self-contained, standalone query. This is crucial for effective
    retrieval, as it provides the vector search with the full context needed
    to find relevant documents, even if the user's literal phrasing was short.

    Args:
        chat_history: A list of previous user and assistant messages.
        current_query: The user's latest follow-up question.

    Returns:
        The reformulated, standalone query. If reformulation fails or is not
        needed (e.g., for the first message), it returns the original query.
    """
    if not chat_history:
        return current_query

    # Limit to the last 4 messages (2 user/assistant pairs)
    history_str = "\n".join(
        f"{msg['role']}: {msg['content']}" for msg in chat_history[-4:]
    )

    try:
        reformulated = reformulation_chain.invoke(
            {"chat_history": history_str, "current_query": current_query}
        )
        return reformulated
    except Exception:
        # Gracefully fall back to the original query on any failure
        return current_query


def generate_answer(
    user_id: str, document_ids: List[str], query: str, chat_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Generates a grounded answer for a user query based on a session's context.

    Steps:
    1. Checks the ORIGINAL query for sensitive topics using the safety router.
    2. If sensitive, short-circuits and returns the routing message.
    3. If safe, reformulates the user's query based on chat history to make it standalone.
    4. Retrieves relevant chunks from the vector store using the REFORMULATED query.
    5. Invokes the RAG chain with the retrieved context and the REFORMULATED query.
    6. Returns the answer along with truncated source previews.

    Args:
        user_id: The unique identifier for the user.
        document_ids: The unique identifiers for the document sessions.
        query: The user's original question.
        chat_history: The history of the conversation. Defaults to None.

    Returns:
        A dictionary containing the answer, source chunks, and routing status.

    Raises:
        ValueError: If the document_id is invalid or has expired.
    """
    if chat_history is None:
        chat_history = []

    # Step 1: Safety check on the ORIGINAL query first
    routed_response = check_sensitive_topic(query)
    if routed_response is not None:
        return {"answer": routed_response, "source_chunks": [], "routed": True}

    # Step 2: Meta-conversation queries — summarize chat, not the document
    if is_meta_conversation_query(query):
        if not chat_history:
            return {
                "answer": "We haven't discussed anything yet in this conversation.",
                "source_chunks": [],
                "routed": False,
            }

        history_str = "\n".join(
            f"{msg['role']}: {msg['content']}" for msg in chat_history
        )
        summary = conversation_summary_chain.invoke(
            {"chat_history": history_str, "current_query": query}
        )
        return {"answer": summary, "source_chunks": [], "routed": False}

    # Step 3: If safe, reformulate the query for better retrieval context
    reformulated_query = reformulate_query(chat_history, query)

    # Step 4: Retrieve relevant chunks using the reformulated query
    try:
        retriever = vector_store_manager.get_retriever(user_id, document_ids, k=5)
    except Exception as exc:
        raise ValueError("Error retrieving from vector store.") from exc

    retrieved_docs = retriever.invoke(reformulated_query)
    context_str = format_docs(retrieved_docs)

    # Step 5: Invoke the grounded RAG chain with the reformulated query
    answer = rag_chain.invoke({"context": context_str, "input": reformulated_query})

    # Step 6: Build response with truncated source previews
    source_chunks = [doc.page_content[:200] for doc in retrieved_docs]

    return {"answer": answer, "source_chunks": source_chunks, "routed": False}
