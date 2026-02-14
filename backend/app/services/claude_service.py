"""
Groq API Service following Interface Segregation and Dependency Inversion Principles.
Groq offers FREE API access with VERY fast inference.
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator
from groq import AsyncGroq
from ..models.chat_models import ChatRequest, StreamEvent, StreamEventType


class ILLMService(ABC):
    """
    Interface for LLM service - Dependency Inversion Principle.
    Allows for easy mocking and alternative implementations.
    """
    
    @abstractmethod
    async def stream_response(
        self, 
        request: ChatRequest
    ) -> AsyncGenerator[StreamEvent, None]:
        """Stream a response from the LLM for the given request."""
        pass


# Backward compatibility aliases
IClaudeService = ILLMService


class GroqService(ILLMService):
    """
    Concrete implementation of LLM service using Groq (FREE!).
    Single Responsibility: Handles all Groq API communication.
    Uses Llama 3.1 8B - fast and capable.
    """
    
    SYSTEM_PROMPT = """You are a helpful AI assistant integrated into a browser extension. 
The user has selected some text on a webpage and wants to ask you about it.

Guidelines:
- Be concise but thorough
- If the selected text is unclear, acknowledge that and provide your best interpretation
- Format your response with markdown when helpful (lists, code blocks, etc.)
- If the question seems unrelated to the text, still try to be helpful"""

    def __init__(self, api_key: str):
        """Initialize with Groq API key."""
        self._client = AsyncGroq(api_key=api_key)
        self._model = "llama-3.1-8b-instant"  # Fast, free model
        self._max_tokens = 2048
    
    def _build_user_message(self, request: ChatRequest) -> str:
        """Build the user message from the request."""
        message_parts = [
            f"**Selected Text:**\n```\n{request.selected_text}\n```",
            f"\n**Question:** {request.question}"
        ]
        
        if request.context_url:
            message_parts.insert(0, f"**Source URL:** {request.context_url}\n")
        
        return "\n".join(message_parts)
    
    async def stream_response(
        self, 
        request: ChatRequest
    ) -> AsyncGenerator[StreamEvent, None]:
        """
        Stream response from Groq using SSE-compatible events.
        """
        try:
            # Emit start event
            yield StreamEvent(event_type=StreamEventType.START)
            
            user_message = self._build_user_message(request)
            
            stream = await self._client.chat.completions.create(
                model=self._model,
                max_tokens=self._max_tokens,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield StreamEvent(
                        event_type=StreamEventType.DELTA,
                        content=chunk.choices[0].delta.content
                    )
            
            # Emit stop event
            yield StreamEvent(event_type=StreamEventType.STOP)
            
        except Exception as e:
            error_message = str(e)
            print(f"[Groq Error] {error_message}", flush=True)
            
            if "rate" in error_message.lower():
                yield StreamEvent(
                    event_type=StreamEventType.ERROR,
                    error="Rate limit. Please wait a moment and try again."
                )
            elif "api_key" in error_message.lower() or "invalid" in error_message.lower():
                yield StreamEvent(
                    event_type=StreamEventType.ERROR,
                    error="Invalid API key. Get a free key at https://console.groq.com"
                )
            else:
                yield StreamEvent(
                    event_type=StreamEventType.ERROR,
                    error=f"Error: {error_message}"
                )


# Backward compatibility aliases
ClaudeService = GroqService
OpenAIService = GroqService
GeminiService = GroqService
