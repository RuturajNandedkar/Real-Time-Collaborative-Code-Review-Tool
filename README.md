# CollabCode Review — Real-Time Collaborative Code Review Tool

A full-stack MERN application for real-time collaborative code reviews, integrated with Monaco Editor, and powered by Socket.IO live synchronization.

This repository contains the full MERN application source code inside the [`collab-code-review/`](./collab-code-review) directory.

---

## 🏗️ Project Structure

The project is structured as a monorepo containing:
- **`backend/`**: Node.js + Express + Socket.IO + MongoDB (Mongoose)
- **`frontend/`**: React (Vite) + Tailwind CSS + Zustand + TanStack Query + Monaco Editor

```
collab-code-review/
├── backend/                    # Node.js + Express + Socket.IO + MongoDB
│   ├── src/
│   │   ├── config/             # Config + database connections
│   │   ├── controllers/        # Express route handlers
│   │   ├── middleware/         # Auth, validation, rate-limiting, errors
│   │   ├── models/             # Mongoose schemas (User, ReviewRoom, Comment, Session)
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic layer
│   │   ├── sockets/            # Socket.IO handlers (Rooms & Sessions)
│   │   └── utils/              # Winston loggers & custom AppError
│   └── package.json
│
└── frontend/                   # React + Vite + Tailwind CSS
    ├── src/
    │   ├── components/         # Reusable UI & MonacoEditor / CursorOverlay
    │   ├── hooks/              # Custom TanStack Query & Socket.IO hooks
    │   ├── lib/                # API client & Socket.IO singletons
    │   ├── pages/              # Auth, Dashboard, Rooms, Sessions
    │   ├── store/              # Zustand state store
    │   └── App.jsx             # Main Router & Application entry
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (running locally or a MongoDB Atlas connection string)

### 1. Backend Setup & Run

Navigate to the backend directory, configure environment variables, and start the development server:

```bash
cd collab-code-review/backend
# Copy environment variables template
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The backend server will run on `http://localhost:5000`.

### 2. Frontend Setup & Run

In a separate terminal, navigate to the frontend directory and start the Vite dev server:

```bash
cd collab-code-review/frontend
# Install dependencies
npm install

# Run the frontend application
npm run dev
```

The frontend application will start on `http://localhost:5173`.

---

## 🛠️ Tech Stack & Features

- **Monaco Editor Integration**: Embedded high-performance code editor supporting multi-language syntax highlighting (JavaScript, Python, Java, C++, TypeScript, Go, Rust, etc.) with custom themes.
- **Real-Time Collaboration**: Real-time code synchronization, remote cursor rendering (with colored flags and name tags), live active participant lists, and user typing indicators.
- **Auto-Save & Durability**: Auto-saves code changes to MongoDB with a debounced timer (3 seconds) to minimize database operations while ensuring zero data loss.
- **State Management**: React Query (TanStack Query) handles server-state caching/revalidation, and Zustand manages client-side authentication and session persistence.
- **Security**: JWT-based authentication for both HTTP endpoints and Socket.IO handshakes, password hashing using `bcryptjs`, and API rate limiting via `express-rate-limit`.

---

## 🔌 API Endpoints & Sockets

Detailed routes and Socket.IO events are listed inside the project's subfolders:
- For the full backend API specifications and events guide, check the [Backend README](./collab-code-review/README.md).
- To read more details about the frontend client structure, check the [Frontend folder](./collab-code-review/frontend).
