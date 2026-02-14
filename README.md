# AI Text Assistant

A browser extension that lets you select text on any webpage, ask AI questions about it, and see streaming responses in real-time — without leaving the page.

Built with **FastAPI** backend and **Chrome Extension (Manifest V3)** frontend, following **MVC architecture** and **SOLID principles**.

![Architecture](https://img.shields.io/badge/Architecture-MVC-blue)
![Principles](https://img.shields.io/badge/Principles-SOLID-green)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![AI](https://img.shields.io/badge/AI-Groq_Llama_3.1-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

- **Instant Text Selection** — Select any text on a webpage to activate the assistant
- **Keyboard Shortcut** — Press `Ctrl+Shift+A` for quick access
- **Real-time Streaming** — Watch AI responses appear word-by-word using Server-Sent Events
- **Modern UI** — Beautiful dark theme with smooth animations
- **Draggable Panel** — Position the response panel anywhere on screen
- **Cross-Browser Support** — Works on Chrome, Brave, Edge, Opera, and other Chromium browsers
- **Free AI** — Uses Groq's free API tier with Llama 3.1 8B model

---

## Demo

1. Select any text on a webpage
2. Click the floating sparkle button (or press `Ctrl+Shift+A`)
3. Type your question about the selected text
4. Get instant AI-powered answers!

---

## Architecture

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Browser           │      │   FastAPI           │      │   Groq API          │
│   Extension         │─────▶│   Backend           │─────▶│   (Llama 3.1)       │
│   (Manifest V3)     │◀─────│   (Python)          │◀─────│                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
         │                            │
         │     Server-Sent Events     │
         │◀───────(Streaming)─────────│
```

### Why This Architecture?

| Decision | Reasoning |
|----------|-----------|
| **Backend Gateway** | API keys stay secure on the server, never exposed in browser |
| **SSE Streaming** | Real-time token-by-token response display |
| **Manifest V3** | Latest Chrome extension standard with improved security |
| **Service Worker** | Handles API communication, bypassing CORS restrictions |

---

## Project Structure

```
ai-text-assistant/
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # Application entry point
│   │   ├── config.py            # Configuration management (SRP)
│   │   ├── controllers/         # HTTP request handlers
│   │   │   ├── __init__.py
│   │   │   └── chat_controller.py
│   │   ├── services/            # Business logic layer
│   │   │   ├── __init__.py
│   │   │   └── claude_service.py  # LLM service (DIP)
│   │   └── models/              # Data models
│   │       ├── __init__.py
│   │       └── chat_models.py   # Pydantic schemas
│   ├── requirements.txt
│   ├── env.template
│   └── run.py                   # Server runner script
│
├── extension/                    # Chrome Extension
│   ├── manifest.json            # Extension configuration
│   ├── background/
│   │   └── background.js        # Service worker (API proxy)
│   ├── content/
│   │   ├── content.js           # Page interaction logic
│   │   └── content.css          # UI styles
│   ├── popup/
│   │   ├── popup.html           # Settings popup
│   │   └── popup.js             # Popup logic
│   └── icons/                   # Extension icons
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
│
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- Chrome, Brave, Edge, or any Chromium-based browser
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-text-assistant.git
cd ai-text-assistant

# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp env.template .env
# Edit .env and add your Groq API key

# Start the server
python run.py
```

The server will start at `http://localhost:8000`

### 2. Extension Setup

1. Open your browser and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this project
5. The AI Text Assistant icon will appear in your toolbar

### 3. Verify Setup

1. Click the extension icon in your browser toolbar
2. Click **Test Connection** — should show "Connected"
3. Visit any webpage, select some text, and try it out!

---

## Usage

| Action | Method |
|--------|--------|
| **Activate** | Select text → Click floating button OR press `Ctrl+Shift+A` |
| **Ask Question** | Type in the input field and press Enter |
| **Move Panel** | Drag the panel header to reposition |
| **Close Panel** | Click the X button or press Escape |

---

## API Documentation

When the backend is running, access interactive documentation at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoints

#### `POST /api/chat/stream`

Stream an AI response for selected text.

**Request:**
```json
{
  "selected_text": "The text user selected",
  "question": "User's question about the text",
  "context_url": "https://example.com/page"
}
```

**Response:** Server-Sent Events stream with the following event types:
- `start` — Stream initiated
- `delta` — Content chunk
- `stop` — Stream complete
- `error` — Error occurred

#### `GET /api/chat/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "llm-extension-api"
}
```

---

## Design Principles

### SOLID Principles

| Principle | Implementation |
|-----------|----------------|
| **Single Responsibility (SRP)** | Each module has one job: `config.py` handles settings, `chat_controller.py` handles routing, `claude_service.py` handles LLM communication |
| **Open/Closed (OCP)** | New LLM providers can be added by implementing `ILLMService` interface without modifying existing code |
| **Liskov Substitution (LSP)** | Any `ILLMService` implementation can replace another (Groq, OpenAI, Anthropic, etc.) |
| **Interface Segregation (ISP)** | `ILLMService` interface contains only what's needed: `stream_response()` method |
| **Dependency Inversion (DIP)** | Controllers depend on `ILLMService` abstraction, not concrete implementations |

### MVC Pattern

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Model** | `models/chat_models.py` | Data structures, validation with Pydantic |
| **View** | `extension/*` | User interface, rendering responses |
| **Controller** | `controllers/chat_controller.py` | Request handling, routing, response formatting |

---

## Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Your Groq API key | Required |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `true` |
| `ALLOWED_ORIGINS` | CORS origins | `chrome-extension://*,http://localhost:*` |

### Extension Settings

Access via the popup (click extension icon):
- **API URL**: Backend server URL (default: `http://localhost:8000`)

---

## Switching LLM Providers

The architecture supports easy provider switching. To use a different LLM:

1. Install the provider's SDK in `requirements.txt`
2. Create a new service implementing `ILLMService`
3. Update the dependency injection in `chat_controller.py`

Example providers that can be integrated:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Local models (Ollama)

---

## Security

- API keys are stored only on the backend server
- Extension communicates with backend via service worker
- CORS configured to accept only extension origins
- All user input is validated with Pydantic models
- No sensitive data stored in browser storage

---

## Troubleshooting

### "Cannot connect to server"
- Ensure the backend is running (`python run.py`)
- Check if the API URL in extension settings is correct
- Verify no firewall is blocking port 8000

### "API key not configured"
- Create `.env` file from `env.template`
- Add your Groq API key
- Restart the backend server

### Extension not appearing
- Ensure Developer mode is enabled in browser
- Check for errors in `chrome://extensions/`
- Verify all files are in the `extension` folder

### Rate limit errors
- Groq has generous free limits, but wait a moment if hit
- Consider implementing request queuing for heavy usage

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend Framework** | FastAPI |
| **LLM Provider** | Groq (Llama 3.1 8B Instant) |
| **Streaming** | Server-Sent Events (SSE) |
| **Data Validation** | Pydantic |
| **Extension Standard** | Manifest V3 |
| **Async HTTP** | HTTPX / Groq SDK |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Groq](https://groq.com) for providing free, fast LLM inference
- [FastAPI](https://fastapi.tiangolo.com) for the excellent Python framework
- [Pydantic](https://pydantic.dev) for data validation
