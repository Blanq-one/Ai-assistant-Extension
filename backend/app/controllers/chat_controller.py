"""
Chat Controller following Single Responsibility Principle.
Handles HTTP routing and request/response transformation only.
Business logic is delegated to services.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator

from ..models.chat_models import ChatRequest, StreamEvent
from ..services.claude_service import GroqService, ILLMService
from ..config import get_settings, Settings


router = APIRouter(prefix="/api/chat", tags=["chat"])


def get_llm_service(settings: Settings = Depends(get_settings)) -> ILLMService:
    """
    Dependency injection for LLM service.
    Following Dependency Inversion Principle.
    """
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="Groq API key not configured. Get a FREE key at https://console.groq.com"
        )
    return GroqService(api_key=settings.groq_api_key)


async def event_generator(
    request: ChatRequest,
    service: ILLMService
) -> AsyncGenerator[str, None]:
    """
    Transform service events into SSE format.
    Single Responsibility: Only handles SSE formatting.
    """
    async for event in service.stream_response(request):
        # Format as SSE: data: {...}\n\n
        event_data = event.model_dump_json()
        yield f"data: {event_data}\n\n"


@router.post("/stream")
async def stream_chat(
    request: ChatRequest,
    service: ILLMService = Depends(get_llm_service)
) -> StreamingResponse:
    """
    Stream chat response using Server-Sent Events.
    
    - **selected_text**: The text selected on the webpage
    - **question**: User's question about the selected text
    - **context_url**: Optional URL of the source page
    """
    return StreamingResponse(
        event_generator(request, service),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "llm-extension-api"}

