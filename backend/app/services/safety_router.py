"""
This module implements a safety router to check for sensitive topics.

This check is designed to run *before* the main RAG pipeline is invoked.
Its purpose is to identify queries related to highly sensitive HR issues
that should not be handled by an automated system. By short-circuiting the
pipeline, it prevents sensitive queries from being processed by the LLM or
logged as standard Q&A, directing the user to human experts instead.
"""
import re
from typing import List, Optional

# A list of keywords that flag a query as a sensitive topic.
# This list should be curated and maintained by legal/compliance teams.
SENSITIVE_TOPIC_KEYWORDS: List[str] = [
    "harassment",
    "whistleblower",
    "wrongful termination",
    "discrimination",
    "retaliation",
    "sexual misconduct",
]

# Pre-compile the regex for efficiency
_sensitive_topic_pattern = re.compile(
    r"\b(" + "|".join(re.escape(keyword) for keyword in SENSITIVE_TOPIC_KEYWORDS) + r")\b",
    re.IGNORECASE,
)


def check_sensitive_topic(query: str) -> Optional[str]:
    """
    Checks if a user's query contains keywords related to sensitive topics.

    This function uses a pre-defined list of keywords and regular expressions
    with word boundaries to avoid partial matches. If a sensitive keyword is
    found, it returns a canned response directing the user to a human HR
    compliance officer.

    Args:
        query (str): The user's input query.

    Returns:
        Optional[str]: A predefined response string if a sensitive topic is
                       detected, otherwise None.
    """
    if _sensitive_topic_pattern.search(query):
        return (
            "This query involves a sensitive topic that requires direct "
            "attention from a human compliance officer. Please contact your "
            "HR compliance team directly rather than relying on this "
            "automated assistant for guidance on this matter."
        )
    return None
