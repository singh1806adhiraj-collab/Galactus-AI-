# Galactus AI

> **AI Orchestration Workspace for Developers** — A production-ready, multi-provider AI chat application with real-time streaming, provider management, and local router support.

---

## 🎯 Core Principles

Galactus AI is built on these foundational principles:

### 1. **Provider-Agnostic Architecture**
- **Unified Interface**: Single abstraction layer (`BaseProvider`) supports 8+ AI providers
- **Hot-Swappable**: Switch between OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Mistral, Grok, Groq without code changes
- **Real Connectivity Testing**: "Connected" status means actual API validation, not just configuration

### 2. **Local-First with Router Support**
- **9Router/OmniRoute Compatible**: Configure custom base URLs (e.g., `http://localhost:20128/v1`) to route through local AI gateways
- **Zero Lock-in**: Use cloud APIs, local models, or hybrid routing transparently
- **Encrypted Credentials**: AES-256-CBC encryption for all API keys at rest

### 3. **Production-Grade Streaming**
- **True SSE Streaming**: Server-Sent Events with progressive token rendering
- **AbortController Integration**: Cancel in-flight requests instantly (Esc key)
- **Timeout Protection**: 60s/120s/180s cascading timeouts prevent hanging requests

### 4. **Developer Experience**
- **Type-Safe**: ESM modules, modern React 19, Express 5
- **Test Coverage**: 108 tests (Vitest + Supertest) covering auth, providers, chat, usage
- **Debug Logging**: Structured console output for request/response tracing

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vite + React 19)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Composer    │  │ ModelSelector│  │ ProviderComboSelector│  │
│  │  (Input)     │  │ (Portal)     │  │ (Portal)             │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                 │                      │               │
│         └─────────────────┼──────────────────────┘               │
│                           ▼                                      │
│              ┌────────────────────────┐                          │
│              │  api.streamMessage()   │                          │
│              │  (SSE Consumer)        │                          │
│              └───────────┬────────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS / SSE
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express 5)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ /api/chat    │  │ /api/providers│ │ /api/auth            │  │
│  │ /stream      │  │ /health      │  │ (JWT + Cookies)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ProviderService                              │   │
│  │  • chatCompletion()    • streamChatCompletion()          │   │
│  │  • testProviderConnection()  • getProviderHealth()       │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                     │
│         ┌───────────────────┼───────────────────┐                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ OpenAIProvider│   │AnthropicProvider│ │  ...        │         │
│  │ (9Router)    │    │             │    │  6 more     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | ≥ 20.0.0 | LTS recommended |
| **npm** | ≥ 10.0.0 | Comes with Node |
| **Git** | Any | For cloning |

> **Tip**: Use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) to manage Node versions.

---

### 1. Clone the Repository

```bash
# Clone the repo
git clone https://github.com/your-username/galactus-ai.git
cd galactus-ai/galactus-ai
```

### 2. Install Dependencies

```bash
# Install all dependencies (frontend + backend in one package)
npm install
```

### 3. Configure Environment

```bash
# Copy example env (if available) or create your own
cp .env.example .env 2>/dev/null || touch .env
```

Edit `.env` with your settings:

```env
# Required
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-32-char-hex-encryption-key

# Optional - for local AI router (9Router, etc.)
# FRONTEND_URL=http://localhost:5173
# PORT=3001
```

> **Generate keys:**
> ```bash
> # JWT Secret
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> # Encryption Key (32 bytes = 64 hex chars)
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4. Start Development Servers

**Terminal 1 — Backend (Express API on :3001)**
```bash
npm run dev
# Or: node server.js
```

**Terminal 2 — Frontend (Vite on :5173)**
```bash
# In a new terminal, same directory
npm run dev
# Vite starts both client and proxies /api to backend
```

> **Single-command alternative** (if configured in package.json):
> ```bash
> npm run dev:full
> ```

### 5. Open the App

Navigate to **http://localhost:5173**

1. **Sign up** or **Continue as Guest**
2. Go to **Providers** page → **Add Provider**
3. Select **OpenAI**, enter API key (or leave empty for 9Router)
4. **Optional**: Set Base URL to `http://localhost:20128/v1` for 9Router
5. Click **Test Connection** → Should show "Connected"
6. Return to **Chat**, select **GPT-4o**, send a message

---

## 🔧 Provider Configuration

### Using 9Router / Local Gateway

Galactus AI works with any OpenAI-compatible endpoint:

| Provider | Base URL | Notes |
|----------|----------|-------|
| **9Router** | `http://localhost:20128/v1` | Local router, no API key needed |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Requires OpenRouter API key |
| **Ollama** | `http://localhost:11434/v1` | Local models via Ollama |
| **LM Studio** | `http://localhost:1234/v1` | Local models via LM Studio |
| **Official OpenAI** | `https://api.openai.com/v1` | Default, requires OpenAI key |

**Model IDs must match the router's `/v1/models` response.**  
Example: If 9Router returns `"id": "openai"`, use `model: "openai"` in chat.

---

## 🧪 Testing

```bash
# Run all tests (108 tests)
npm test

# Watch mode
npm test:watch

# Lint
npm run lint
```

**Test Structure:**
```
tests/
├── auth.test.js          # JWT, cookies, registration
├── providers.test.js     # CRUD, encryption, health checks
├── chat.test.js          # Streaming, non-streaming, providers
├── conversations.test.js # CRUD, messages
└── usage.test.js         # Logging, stats
```

---

## 📦 Production Build

```bash
# Build frontend to dist/
npm run build

# Preview production build
npm run preview

# Start production server
NODE_ENV=production node server.js
```

---

## 🔐 Security Notes

- **API Keys**: Encrypted with AES-256-CBC before database storage
- **Authentication**: HttpOnly Secure cookies + JWT (access + refresh tokens)
- **CORS**: Configured for `FRONTEND_URL` origin only
- **Rate Limiting**: Not implemented — add reverse proxy (nginx/Cloudflare) for production

---

## 📁 Project Structure

```
galactus-ai/
├── app.js                 # Express app (testable, no listen)
├── server.js              # Entry point, starts server
├── vite.config.js         # Vite config with API proxy
├── db/
│   └── database.js        # better-sqlite3 + WAL mode
├── providers/
│   ├── index.js           # Registry + metadata (8 providers)
│   ├── BaseProvider.js    # Abstract base class
│   ├── OpenAIProvider.js  # OpenAI/9Router implementation
│   ├── AnthropicProvider.js
│   ├── GeminiProvider.js
│   ├── DeepSeekProvider.js
│   ├── OpenRouterProvider.js
│   ├── MistralProvider.js
│   ├── GrokProvider.js
│   ├── GroqProvider.js
│   └── ProviderService.js # Business logic, encryption, health
├── routes/
│   ├── auth.js            # Register, login, guest, verify
│   ├── chat.js            # /complete, /stream, /models
│   ├── providers.js       # CRUD, test, health, toggle
│   ├── conversations.js   # Chat history
│   └── usage.js           # Token usage stats
├── src/
│   ├── main.jsx           # React entry
│   ├── App.jsx            # Router, layout
│   ├── pages/
│   │   ├── HomePage.jsx   # Chat workspace
│   │   ├── ProvidersPage.jsx
│   │   ├── LoginPage.jsx
│   │   └── SettingsPage.jsx
│   ├── components/
│   │   ├── Composer.jsx   # Input + Model/Provider selectors
│   │   ├── ModelSelector.jsx
│   │   ├── ProviderComboSelector.jsx
│   │   ├── ProviderModal.jsx
│   │   ├── ChatMessage.jsx
│   │   ├── ContextSidebar.jsx
│   │   └── Terminal.jsx
│   ├── services/
│   │   └── api.js         # Fetch wrapper with auth
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── providers/
│   │   └── index.js       # Frontend provider metadata
│   └── styles/
│       ├── index.css      # Global tokens, reset
│       ├── providers.css  # Providers page styles
│       └── variables.css  # CSS custom properties
└── tests/
    └── *.test.js          # Vitest + Supertest suites
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 8, React Router 7 |
| **Backend** | Express 5, better-sqlite3 |
| **Auth** | JWT (access/refresh), HttpOnly cookies |
| **Crypto** | Node crypto (AES-256-CBC) |
| **Testing** | Vitest 5, Supertest 7 |
| **Linting** | Oxlint |
| **Streaming** | Native Fetch + ReadableStream (SSE) |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `createPortal is not a function` | Ensure `import { createPortal } from 'react-dom'` (not `react-dom/client`) |
| Chat hangs on "thinking..." | Check backend logs; verify 9Router running at `:20128`; check API key |
| "Provider not configured" | Add provider in Providers page with valid API key |
| CORS errors | Set `FRONTEND_URL` in `.env` to match your frontend origin |
| SQLite locked | Ensure single process; WAL mode handles concurrent reads |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Run tests: `npm test`
4. Lint: `npm run lint`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feat/amazing-feature`
7. Open Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **9Router** — Local AI routing inspiration
- **OpenAI-compatible APIs** — Universal interface standard
- **React Team** — React 19 streaming primitives
- **Vite Team** — Lightning-fast build tooling

---

**Built with ❤️ for developers who want control over their AI stack.**