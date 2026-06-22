"""
This module provides functions for processing and chunking documents,
specifically focusing on PDF files for the RAG pipeline.

It is designed to be a stateless utility, performing pure data transformation
without any side effects or dependencies on session management or vector stores.
"""
import os
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document


class NoTextFoundError(Exception):
    """Custom exception raised when a PDF contains no extractable text."""

    pass


def _extract_title_from_pdf(
    documents: List[Document], fallback_path: str
) -> str:
    """
    Heuristically extracts a title from the first page of a document.

    It takes the first non-empty line of text from the first page. If the
    first page is empty or no text is found, it falls back to using the
    PDF's filename.

    Args:
        documents: A list of loaded LangChain Document objects.
        fallback_path: The original file path, used to derive a fallback title.

    Returns:
        The extracted or fallback document title.
    """
    # Check the first document (page 1) for content
    if documents and documents[0].page_content.strip():
        first_page_text = documents[0].page_content.strip()
        # Find the first line that isn't just whitespace
        for line in first_page_text.split("\n"):
            if line.strip():
                return line.strip()

    # Fallback: use the filename without its extension
    return os.path.splitext(os.path.basename(fallback_path))[0]


def process_pdf(
    file_path: str, chunk_size: int, chunk_overlap: int
) -> List[Document]:
    """
    Loads a PDF, extracts text, and splits it into manageable chunks.

    This function uses PyPDFLoader to load the document and then applies a
    RecursiveCharacterTextSplitter to break it down into smaller pieces suitable
    for a RAG pipeline's context window.

    It also attaches a `document_title` to each chunk's metadata. This title
    is derived heuristically from the first line of text on the first page,
    providing fallback context for document-level questions.

    Args:
        file_path (str): The local path to the PDF file.
        chunk_size (int): The maximum size of each text chunk.
        chunk_overlap (int): The number of characters to overlap between chunks.

    Returns:
        List[Document]: A list of LangChain Document objects, each representing
                        a chunk of the original PDF.

    Raises:
        NoTextFoundError: If the PDF file contains no extractable text, which
                          can happen if it's an image-based or scanned PDF.
    """
    # 1. Load the PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # 2. Check for extractable text
    if not any(doc.page_content.strip() for doc in documents):
        raise NoTextFoundError(
            "The PDF file appears to have no extractable text. "
            "It might be a scanned image. Please consider using an OCR "
            "tool to preprocess the document."
        )

    # 3. Extract a heuristic title and split the document into chunks
    extracted_title = _extract_title_from_pdf(documents, file_path)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    chunked_documents = text_splitter.split_documents(documents)

    # 4. Attach the extracted title to each chunk's metadata
    for chunk in chunked_documents:
        chunk.metadata["document_title"] = extracted_title

    return chunked_documents
