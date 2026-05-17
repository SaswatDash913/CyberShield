# CyberShield — Integrated Backend

A cybersecurity AI platform with two bots:
- **CodeBot** — static code analysis (detects suspicious/malicious patterns)
- **RagBot** — document Q&A (upload a PDF/DOCX and ask questions about it)

---

## Project structure

```
cybershield-integrated/
├── index.js                  ← Node.js entry point (port 8000)
├── package.json
├── .env.example              ← copy to .env and fill in
├── middleware/
│   └── auth.js               ← JWT verification
├── models/
│   ├── User.js
│   ├── File.js
│   └── Conversation.js
├── routes/
│   ├── auth.js               ← /api/auth
│   ├── files.js              ← /api/files
│   ├── history.js            ← /api/history
│   └── chat.js               ← /api/chat  ← NEW: bridges Node ↔ Python bots
└── python_bots/
    ├── CodeBot.py            ← Flask, port 3000
    └── RagBot.py             ← Flask, port 5000
```

---

## Setup

### 1. Clone / copy and configure environment

```bash
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, GMAIL_*, GEMINI_API_KEY
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Install Python dependencies

```bash
pip install flask flask-cors python-dotenv \
  langgraph langchain langchain-google-genai \
  langchain-community langchain-huggingface \
  faiss-cpu sentence-transformers pymupdf docx2txt
```

### 4. Copy your `.env` into `python_bots/` as well (for GEMINI_API_KEY)

```bash
cp .env python_bots/.env
```

### 5. Start all three services (three terminals)

```bash
# Terminal 1 — Node.js backend
npm run dev

# Terminal 2 — CodeBot
cd python_bots && python CodeBot.py

# Terminal 3 — RagBot
cd python_bots && python RagBot.py
```

---

## API reference

All endpoints except `/api/auth/signup` and `/api/auth/signin` require:
```
Authorization: Bearer <token>
```

---

### Auth  `/api/auth`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/signup` | `{ name, email, password }` | Send OTP to email |
| POST | `/signup/verify` | `{ email, otp }` | Verify OTP → get token |
| POST | `/signin` | `{ name, password }` | Sign in → get token |
| GET  | `/me` | — | Get current user profile |

---

### Files  `/api/files`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/upload` | `multipart: file` | Upload a file (code or PDF/DOCX) |
| GET  | `/` | — | List your uploaded files |
| DELETE | `/:file_id` | — | Delete a file |

---

### Chat  `/api/chat`  ← new

#### CodeBot — analyse code

```
POST /api/chat/codebot
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "import os; os.system('rm -rf /')",
  "conversation_id": "optional — omit to auto-create"
}
```

Response:
```json
{
  "conversation_id": "abc123",
  "response": "This code is dangerous because...",
  "total_messages": 2
}
```

#### RagBot — send document for embedding

```
POST /api/chat/ragbot/upload
Content-Type: application/json
Authorization: Bearer <token>

{
  "file_id": "<file_id from /api/files/upload>",
  "conversation_id": "optional"
}
```

Response:
```json
{
  "message": "File sent to RagBot and embedded successfully.",
  "conversation_id": "xyz789",
  "file": { "file_id": "...", "original_name": "report.pdf" }
}
```

#### RagBot — ask a question about the document

```
POST /api/chat/ragbot
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "What are the main vulnerabilities mentioned?",
  "conversation_id": "xyz789"
}
```

Response:
```json
{
  "conversation_id": "xyz789",
  "response": "The document mentions three main vulnerabilities...",
  "total_messages": 2
}
```

---

### History  `/api/history`

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/conversations` | `?bot_type=codebot` | List all conversations |
| GET | `/conversations/:id` | — | Get a conversation with all messages |
| DELETE | `/conversations/:id` | — | Delete one conversation |
| DELETE | `/conversations` | — | Clear all conversations |

---

## Typical flow for CodeBot

1. `POST /api/auth/signin` → get token
2. `POST /api/chat/codebot` with your code snippet
3. Keep sending follow-up queries with the same `conversation_id` — CodeBot remembers context

## Typical flow for RagBot

1. `POST /api/auth/signin` → get token
2. `POST /api/files/upload` with a PDF or DOCX → get `file_id`
3. `POST /api/chat/ragbot/upload` with `file_id` → get `conversation_id`
4. `POST /api/chat/ragbot` with your question and `conversation_id`
5. Keep asking follow-up questions with the same `conversation_id`
