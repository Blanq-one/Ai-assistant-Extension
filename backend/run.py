"""
Convenience script to run the backend server.
Usage: python run.py
"""

import uvicorn
from app.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    
    print("=" * 50)
    print("  Claude Text Assistant - Backend API")
    print("=" * 50)
    print(f"  Server: http://{settings.host}:{settings.port}")
    print(f"  Docs:   http://localhost:{settings.port}/docs")
    print("=" * 50)
    print()
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )


