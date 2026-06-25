"""
This module provides a persistent vector store manager for the RAG pipeline.

It stores embeddings in a persistent ChromaDB on disk, and enforces multi-user isolation
by appending `user_id` and `document_id` to document chunk metadata.
"""
from typing import List, Optional
import os

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings


class VectorStoreManager:
    """
    Manages a persistent, single-collection ChromaDB instance.
    Enforces user isolation via metadata filtering.
    """
    _embedding_function: Optional[HuggingFaceEmbeddings] = None
    _vector_store: Optional[Chroma] = None

    @classmethod
    def get_embedding_function(cls) -> HuggingFaceEmbeddings:
        if cls._embedding_function is None:
            cls._embedding_function = HuggingFaceEmbeddings(
                model_name=settings.EMBEDDING_MODEL
            )
        return cls._embedding_function

    @classmethod
    def get_vector_store(cls) -> Chroma:
        """
        Initializes the persistent ChromaDB collection.
        """
        if cls._vector_store is None:
            persist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_data")
            os.makedirs(persist_dir, exist_ok=True)
            
            cls._vector_store = Chroma(
                collection_name="documents",
                embedding_function=cls.get_embedding_function(),
                persist_directory=persist_dir
            )
        return cls._vector_store

    def index_document(self, user_id: str, document_id: str, documents: List[Document]) -> None:
        """
        Adds documents to the persistent ChromaDB, enforcing user metadata.
        """
        for doc in documents:
            doc.metadata["user_id"] = user_id
            doc.metadata["document_id"] = document_id
            
        vector_store = self.get_vector_store()
        vector_store.add_documents(documents)
        print(f"[DEBUG] Indexed {len(documents)} chunks for user {user_id}, doc {document_id}")

    def get_retriever(self, user_id: str, document_ids: List[str], k: int = 3) -> BaseRetriever:
        """
        Retrieves the vector retriever, strictly filtering by user_id and document_ids.
        """
        vector_store = self.get_vector_store()
        
        return vector_store.as_retriever(
            search_kwargs={
                "k": k,
                "filter": {"$and": [{"user_id": user_id}, {"document_id": {"$in": document_ids}}]}
            }
        )

    def delete_document(self, user_id: str, document_id: str) -> None:
        """
        Deletes all chunks associated with a specific document.
        """
        vector_store = self.get_vector_store()
        collection = vector_store._collection
        collection.delete(where={"$and": [{"user_id": user_id}, {"document_id": document_id}]})
        print(f"[DEBUG] Deleted vectors for user {user_id}, doc {document_id}")


# Create a singleton instance
vector_store_manager = VectorStoreManager()
