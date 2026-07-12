# CollabCode Review — Real-Time Collaborative Code Review Tool

A production-ready full-stack MERN application for real-time collaborative code reviews, integrated with Monaco Editor, and powered by Socket.IO live synchronization.

---

## 🏗️ Project Structure

The project is structured as a monorepo under the `collab-code-review/` directory:

```
collab-code-review/
├── backend/                    # Node.js + Express + Socket.IO + MongoDB
│   ├── src/
│   │   ├── config/             # Environment config & Mongoose connection
│   │   ├── controllers/        # Express route handlers
│   │   ├── middleware/         # Auth, validation, rate-limiting, error handling
│   │   ├── models/             # Mongoose schemas (User, ReviewRoom, Comment, Session)
│   │   ├── routes/             # REST routes
│   │   ├── services/           # Business logic layer
│   │   ├── sockets/            # Socket.IO event namespaces & handlers
│   │   └── utils/              # Winston logger & Custom AppError
│   └── package.json
│
└── frontend/                   # React + Vite + Tailwind CSS
    ├── src/
    │   ├── components/         # Common layout, MonacoEditor & CursorOverlay
    │   ├── hooks/              # Zustand + Socket.IO connection hooks
    │   ├── lib/                # API client & Socket.IO singletons
    │   ├── pages/              # Auth, Dashboard, Rooms, Sessions
    │   ├── store/              # Zustand global auth state store
    │   └── App.jsx             # Main Router
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (running locally or a MongoDB Atlas connection string)

### 1. Backend Setup

Configure the environment variables and start the server:

```bash
cd collab-code-review/backend
# Copy variables template
cp .env.example .env
# Edit .env and configure MONGO_URI and JWT_SECRET

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend server runs at `http://localhost:5000`. The API health check is available at `http://localhost:5000/api/health`.

### 2. Frontend Setup

In a separate terminal, install the frontend dependencies and launch the Vite dev server:

```bash
cd collab-code-review/frontend
# Install dependencies
npm install

# Launch development server
npm run dev
```

The frontend application runs at `http://localhost:5173`.

---

## 🔌 API Endpoints

All protected endpoints require a valid JWT token in the `Authorization` header (`Bearer <token>`).

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/health` | Service health status | Public |
| **POST** | `/api/auth/register` | Register new user | Public |
| **POST** | `/api/auth/login` | Login user & return token | Public |
| **GET** | `/api/auth/me` | Fetch profile info | 🔒 Protected |
| **GET** | `/api/rooms` | Fetch all user rooms | 🔒 Protected |
| **POST** | `/api/rooms` | Create new review room | 🔒 Protected |
| **GET** | `/api/rooms/:id` | Get room details by ID | 🔒 Protected |
| **PATCH** | `/api/rooms/:id/code` | Persist code (REST fallback) | 🔒 Protected |
| **POST** | `/api/rooms/join` | Join room via invite code | 🔒 Protected |
| **DELETE** | `/api/rooms/:id` | Archive room | 🔒 Protected |
| **GET** | `/api/rooms/:id/comments` | List room comments | 🔒 Protected |
| **POST** | `/api/rooms/:id/comments` | Add comment to code line | 🔒 Protected |
| **GET** | `/api/sessions` | List active sessions | 🔒 Protected |
| **POST** | `/api/sessions` | Create a new review session | 🔒 Protected |
| **GET** | `/api/sessions/:sessionId` | Get session by UUID | 🔒 Protected |
| **POST** | `/api/sessions/:sessionId/join` | Join session as reviewer/observer | 🔒 Protected |
| **PATCH** | `/api/sessions/:sessionId/code` | Save code content | 🔒 Protected |
| **DELETE** | `/api/sessions/:sessionId` | Archive session | 🔒 Protected |

---

## 🔴 Socket.IO Collaborative Protocols

### 1. Review Rooms (Legacy Room Namespace)

#### Client → Server
- `join-room` (`{ roomId }`): Join a specific room.
- `leave-room` (`{ roomId }`): Leave room.
- `code-change` (`{ roomId, code }`): Broadcast text modifications.
- `cursor-move` (`{ roomId, cursor }`): Broadcast cursor position.
- `new-comment` (`{ roomId, comment }`): Broadcast new line comments.
- `typing` (`{ roomId, isTyping }`): Toggle user typing indicators.

#### Server → Client
- `room:users-updated` (`{ users }`): Active room members update.
- `room:user-joined` (`{ user }`): Broadcaster joined room notice.
- `room:user-left` (`{ user }`): Broadcaster left room notice.
- `code:updated` (`{ code, sender }`): Received remote text change.
- `cursor:updated` (`{ cursor, user }`): Render remote user cursor.
- `comment:added` (`{ comment }`): Push comment update.

### 2. Live Sessions (New Session Namespace)

#### Client → Server
- `session:join` (`{ sessionId }`): Connect to a UUID-addressed session.
- `session:leave` (`{ sessionId }`): Disconnect from session.
- `session:code-change` (`{ sessionId, code, version }`): Edit code content.
- `session:cursor-move` (`{ sessionId, cursor }`): Send `{ lineNumber, column, selection }`.
- `session:force-save` (`{ sessionId }`): Trigger immediate database auto-save.
- `session:language-change` (`{ sessionId, language }`): Switch language.
- `session:chat` (`{ sessionId, message }`): Broadcast message.

#### Server → Client
- `session:joined` (`{ sessionId, session, you, participants }`): Full snapshot bootstrap.
- `session:user-joined` (`{ participant, participants }`): Broadcast user joined.
- `session:user-left` (`{ participant, participants }`): Broadcast user left.
- `session:code-updated` (`{ code, version, sender }`): Broadcast live edit.
- `session:cursor-updated` (`{ cursor, participant }`): Broadcast remote cursor change.
- `session:saved` (`{ savedAt, savedBy }`): Broadcast successful DB write.
- `session:language-updated` (`{ language }`): Broadcast code language switch.
- `session:chat-message` (`{ message, sender, timestamp }`): Receive chat.

---

## 🛡️ Security & Reliability

- **Socket JWT Authorization**: Custom socket handshake validation matches token on connection.
- **Express-Rate-Limit**: 100 requests per 15 minutes overall, and strict limit of 10 requests per 15 minutes on auth routes.
- **Input Sanitization**: Router controllers validated with `express-validator` rules.
- **Security Headers**: Secured by `helmet.js` configurations.
- **Debounced Save**: Automatically updates MongoDB every 3 seconds after typing ceases, minimizing DB queries while maintaining persistency.

---

## 🧰 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, Tailwind CSS 3 |
| **State & Fetch** | Zustand (persistent global auth), TanStack Query (caching & mutations) |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) with dynamic cursors overlay |
| **HTTP & WS** | Axios, Socket.IO Client |
| **Backend** | Node.js, Express 4, Socket.IO Server |
| **Database** | MongoDB, Mongoose 8 |
| **Logging** | Winston (centralized log streams) |
