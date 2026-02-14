"""
Main FastAPI application entry point.
Following Single Responsibility: Only handles app initialization and middleware setup.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import get_settings
from .controllers import chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    settings = get_settings()
    print(f"[*] LLM Extension API starting on {settings.host}:{settings.port}")
    print(f"[*] Debug mode: {settings.debug}")
    yield
    print("[*] LLM Extension API shutting down")


def create_app() -> FastAPI:
    """
    Application factory pattern.
    Open/Closed Principle: Easy to extend with new routers/middleware.
    """
    settings = get_settings()
    
    app = FastAPI(
        title="LLM Extension API",
        description="Backend API for Claude-powered browser extension",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )
    
    # CORS middleware for browser extension
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Chrome extensions need wildcard
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    # Register routers
    app.include_router(chat_router)
    
    @app.get("/")
    async def root():
        """Root endpoint with API info."""
        return {
            "name": "LLM Extension API",
            "version": "1.0.0",
            "docs": "/docs" if settings.debug else "disabled"
        }
    
    return app


# Create app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

