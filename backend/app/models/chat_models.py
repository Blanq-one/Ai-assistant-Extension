"""
Data models following Single Responsibility Principle.
Each model represents a single concept in the domain.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class ChatRequest(BaseModel):
    """Request model for chat completion."""
    
    selected_text: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="The text selected by the user on the webpage"
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's question about the selected text"
    )
    context_url: Optional[str] = Field(
        default=None,
        description="URL of the page where text was selected"
    )


class StreamEventType(str, Enum):
    """Types of streaming events."""
    START = "start"
    DELTA = "delta"
    STOP = "stop"
    ERROR = "error"


class StreamEvent(BaseModel):
    """Model for SSE stream events."""
    
    event_type: StreamEventType
    content: str = ""
    error: Optional[str] = None


class ChatResponse(BaseModel):
    """Response model for non-streaming chat completion."""
    
    response: str
    tokens_used: int = 0


