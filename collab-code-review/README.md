# CollabCode Review — Real-Time Collaborative Code Review Tool

A full-stack MERN application for real-time collaborative code reviewing with Socket.IO-powered live collaboration.

## 🏗️ Project Structure

```
collab-code-review/
├── backend/                    # Node.js + Express + Socket.IO + MongoDB
│   ├── src/
│   │   ├── config/             # Environment config + DB connection
│   │   │   ├── index.js
│   │   │   └── database.js
│   │   ├── controllers/        # Route handlers (thin, delegate to services)
│   │   │   ├── authController.js
│   │   │   ├── roomController.js
│   │   │   └── commentController.js
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.js         # JWT protect + restrictTo
│   │   │   ├── errorHandler.js # Global error handler
│   │   │   ├── validate.js     # express-validator middleware
│   │   │   └── rateLimiter.js  # API + auth rate limits
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── ReviewRoom.js
│   │   │   └── Comment.js
│   │   ├── routes/             # Express routers
│   │   │   ├── healthRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── roomRoutes.js
│   │   │   └── commentRoutes.js
│   │   ├── services/           # Business logic layer
│   │   │   ├── authService.js
│   │   │   └── roomService.js
│   │   ├── sockets/            # Socket.IO layer
│   │   │   ├── index.js        # Socket.IO server init
│   │   │   ├── socketAuth.js   # Socket JWT middleware
│   │   │   └── roomSocket.js   # Room event handlers
│   │   ├── utils/
│   │   │   ├── logger.js       # Winston logger
│   │   │   └── AppError.js     # Custom error class
│   │   ├── app.js              # Express app factory
│   │   └── server.js           # HTTP server + bootstrap
│   ├── .env.example
│   └── package.json
│
└── frontend/                   # React + Vite + Tailwind CSS
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   │   └── ProtectedRoute.jsx
    │   │   └── layout/
    │   │       ├── Navbar.jsx
    │   │       └── AppLayout.jsx
    │   ├── hooks/
    │   │   └── useRooms.js     # React Query hooks
    │   ├── lib/
    │   │   ├── api.js          # Axios instance
    │   │   └── socket.js       # Socket.IO client
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── LoginPage.jsx
    │   │   │   └── RegisterPage.jsx
    │   │   ├── dashboard/
    │   │   │   └── DashboardPage.jsx
    │   │   └── room/
    │   │       └── RoomPage.jsx
    │   ├── store/
    │   │   └── authStore.js    # Zustand auth store
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

The backend starts on `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | Public |
| POST | `/api/auth/register` | Register user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | 🔒 |
| GET | `/api/rooms` | List user rooms | 🔒 |
| POST | `/api/rooms` | Create room | 🔒 |
| GET | `/api/rooms/:id` | Get room | 🔒 |
| POST | `/api/rooms/join` | Join by invite code | 🔒 |
| DELETE | `/api/rooms/:id` | Archive room | 🔒 |
| GET | `/api/rooms/:id/comments` | List comments | 🔒 |
| POST | `/api/rooms/:id/comments` | Add comment | 🔒 |
| PATCH | `/api/comments/:id/resolve` | Toggle resolve | 🔒 |
| DELETE | `/api/comments/:id` | Delete comment | 🔒 |

## 🔴 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ roomId }` | Join a review room |
| `leave-room` | `{ roomId }` | Leave a review room |
| `code-change` | `{ roomId, code }` | Broadcast code changes |
| `cursor-move` | `{ roomId, cursor }` | Share cursor position |
| `new-comment` | `{ roomId, comment }` | Notify new comment |
| `typing` | `{ roomId, isTyping }` | Typing indicator |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `room:users-updated` | `{ users }` | Active users list |
| `room:user-joined` | `{ user }` | User joined |
| `room:user-left` | `{ user }` | User left |
| `code:updated` | `{ code, sender }` | Live code update |
| `cursor:updated` | `{ cursor, user }` | Cursor position |
| `comment:added` | `{ comment }` | New comment |
| `comment:resolved` | `{ commentId, resolved }` | Comment resolved |
| `user:typing` | `{ user, isTyping }` | Typing status |

## 🛡️ Security

- JWT authentication on all protected routes and Socket.IO connections
- Helmet.js security headers
- CORS restricted to client origin
- Rate limiting: 100 req/15min (API), 10 req/15min (auth routes)
- Input validation with express-validator
- Password hashing with bcryptjs (12 salt rounds)

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3 |
| State | Zustand (auth), TanStack Query (server state) |
| Realtime | Socket.IO client |
| HTTP client | Axios |
| Backend | Node.js, Express 4 |
| Realtime | Socket.IO server |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Logging | Winston |
| Validation | express-validator |
