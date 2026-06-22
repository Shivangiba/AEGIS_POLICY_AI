"""
This module provides an in-memory vector store manager for the RAG pipeline.

It is designed to be ephemeral, meaning that vector stores are not persisted to disk.
This choice is intentional to guarantee data privacy; all user-uploaded data
is cleared from memory after the session is terminated.
"""
from typing import Dict, List, Optional

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings


class SessionNotFoundError(Exception):
    """Custom exception raised when a session is not found in the vector store."""
    pass


class VectorStoreManager:
    """
    Manages per-session in-memory ChromaDB instances for a RAG pipeline.

    This manager ensures that each user session has its own isolated, ephemeral
    vector store. The embedding model is loaded once as a singleton to avoid
    costly re-initialization.
    """
    _embedding_function: Optional[HuggingFaceEmbeddings] = None

    def __init__(self):
        """
        Initializes the VectorStoreManager.

        The sessions dictionary stores active ChromaDB instances keyed by session_id.
        """
        self.sessions: Dict[str, Chroma] = {}

    @classmethod
    def get_embedding_function(cls) -> HuggingFaceEmbeddings:
        """
        Loads the embedding model as a class-level singleton.

        This method ensures that the HuggingFace embedding model is loaded only
        once per application lifecycle, which is crucial for performance as these
        models can be large and slow to initialize.

        Returns:
            HuggingFaceEmbeddings: The singleton instance of the embedding model.
        """
        if cls._embedding_function is None:
            cls._embedding_function = HuggingFaceEmbeddings(
                model_name=settings.EMBEDDING_MODEL
            )
        return cls._embedding_function

    def create_session(self, session_id: str, documents: List[Document]) -> None:
        """
        Creates a new in-memory Chroma collection for a given session.

        This method is the entry point for a new user session. It takes the user's
        documents, embeds them, and stores them in a new, isolated ChromaDB
        instance in memory.

        Args:
            session_id (str): The unique identifier for the user session.
            documents (List[Document]): A list of documents to be indexed.
        """
        # TODO: Implement logic to handle potential existing session_id.
        # Currently, it will overwrite. A check might be needed.
        embedding_function = self.get_embedding_function()
        vector_store = Chroma.from_documents(
            documents=documents, embedding=embedding_function
        )
        self.sessions[session_id] = vector_store
        print(f"[DEBUG] Session created: {session_id} | Total sessions now: {list(self.sessions.keys())}")

    def get_retriever(self, session_id: str, k: int = 3) -> BaseRetriever:
        """
        Retrieves the vector retriever for a specific session.

        This method provides access to the retrieval functionality of the
        session's vector store.

        Args:
            session_id (str): The unique identifier for the user session.
            k (int, optional): The number of documents to retrieve. Defaults to 3.

        Returns:
            BaseRetriever: The retriever instance for the session.

        Raises:
            SessionNotFoundError: If the session_id does not exist.
        """
        print(f"[DEBUG] Looking for session: {session_id} | Available sessions: {list(self.sessions.keys())}")
        if session_id not in self.sessions:
            raise SessionNotFoundError(f"Session '{session_id}' not found.")
        
        vector_store = self.sessions[session_id]
        return vector_store.as_retriever(search_kwargs={"k": k})

    def delete_session(self, session_id: str) -> None:
        """
        Deletes a session's Chroma instance from memory.

        This is a critical method for data privacy. It ensures that all data
        associated with a user's session is purged from memory when the session ends.
        Chroma's in-memory implementation handles garbage collection, but we
        explicitly delete the session entry.

        Args:
            session_id (str): The unique identifier for the user session.
        """
        if session_id in self.sessions:
            # TODO: Chroma's in-memory implementation doesn't have an explicit
            # cleanup method like on-disk versions. Deleting the object
            # reference is the current approach for garbage collection.
            # Monitor memory usage to confirm this is sufficient.
            del self.sessions[session_id]

# Create a singleton instance of the manager to be used across the application
vector_store_manager = VectorStoreManager()
