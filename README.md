# JaisChat — Real-Time Chat Application

JaisChat is a real-time messaging web application inspired by modern chat platforms. It allows users to authenticate using their phone number, manage their profiles, discover other users, create direct conversations, and exchange messages in real time.

## Features

### Authentication & User Management
- Phone number authentication using Firebase Authentication.
- Backend authentication using Firebase Admin SDK to verify ID tokens.
- User identity management with PostgreSQL and Prisma ORM.
- User profile management and profile setup.
- User discovery to find other registered users.

### Conversations & Messaging
- Create or retrieve direct conversations between users.
- Persistent message storage in PostgreSQL.
- Real-time messaging using Socket.IO.
- Conversation membership validation.
- Message history retrieval through REST APIs.
- Client message IDs for handling duplicate submissions.
- Real-time conversation list updates.
- Automatic conversation reordering based on recent activity.
- Latest message preview and timestamp updates.
- Socket reconnection handling and message-history synchronization to recover missed messages.

### User Interface
- Responsive chat interface.
- Conversation sidebar and active chat view.
- User search and conversation selection.
- Modern UI built with React and Tailwind CSS.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| JavaScript | Frontend and backend development |
| Vite | Frontend development server and build tool |
| Tailwind CSS | Styling and responsive UI |
| Node.js | Backend runtime |
| Express.js | REST API and server-side routing |
| PostgreSQL | Relational database |
| Prisma ORM | Database access and schema management |
| Socket.IO | Real-time messaging and event communication |
| Firebase Authentication | Phone number authentication |
| Firebase Admin SDK | Server-side Firebase token verification |

## Architecture

JaisChat follows a **modular monolith architecture**. The frontend and backend are separate applications, while backend functionality is organized into feature-based modules.

### High-Level Architecture

```text
React Frontend
      |
      | REST API
      | Socket.IO
      v
Node.js + Express Backend
      |
      |-- Authentication
      |-- User Profiles
      |-- User Discovery
      |-- Conversations
      |-- Messages
      |
      v
Prisma ORM
      |
      v
PostgreSQL Database

Firebase Authentication
      |
      v
Firebase ID Token Verification
      |
      v
Authenticated Backend Requests
```

## Getting Started

### Prerequisites

Make sure the following tools are installed:

- Node.js (a supported LTS version)
- npm
- PostgreSQL
- A Firebase project with Phone Authentication enabled

### 1. Clone the Repository

```bash
git clone https://github.com/DevrajJaiswal/JaisChat---A-real-time-Chat-App.git
cd JaisChat---A-real-time-Chat-App
```

### 2. Configure the Backend

Navigate to the server directory:

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory and configure the required variables:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/jaischat"

FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json
```

Update the database credentials and Firebase configuration according to your local environment.

### 3. Configure PostgreSQL and Prisma

Create the PostgreSQL database named `jaischat` if it does not already exist.

From the `server/` directory, run the Prisma commands appropriate for your project's configured version and migration workflow.

For a project using Prisma migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

If your project uses a separate Prisma configuration file or a different migration workflow, follow that configuration instead.

### 4. Configure the Frontend

Navigate to the client directory:

```bash
cd ../client
npm install
```

Create a `.env` file in `client/`:

```env
VITE_SOCKET_URL=http://localhost:5000

VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Add any other Firebase environment variables required by your existing Firebase configuration.

### 5. Start the Application

Start the backend in one terminal:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Open the local URL printed by Vite, typically:

```text
http://localhost:5173
```

## Real-Time Messaging Flow

1. A user authenticates using Firebase Phone Authentication.
2. The frontend obtains a Firebase ID token.
3. The backend verifies the token and resolves the authenticated user in PostgreSQL.
4. The Socket.IO connection authenticates using the Firebase ID token.
5. The server joins the authenticated socket to the user's personal room.
6. When a user opens a conversation, the server verifies conversation membership before allowing the socket to join its conversation room.
7. A message is validated and saved to PostgreSQL.
8. The server emits the new message to the conversation room.
9. Conversation-list update events notify participating users so their sidebar preview, timestamp, and ordering can update.
10. When a socket reconnects, the client synchronizes the active conversation's message history and refreshes the conversation list to recover updates missed while disconnected.

## Roadmap

Planned improvements include:

- [ ] Message delivery and read receipts.
- [ ] Online/offline presence and last-seen status.
- [ ] Firebase Cloud Messaging push notifications.
- [ ] Additional security and performance testing.

## Future Improvements

Potential future features include group conversations, message attachments, typing indicators, and additional messaging status indicators.

## Author

**Devraj Jaiswal**

Full Stack Developer

- GitHub: [DevrajJaiswal](https://github.com/DevrajJaiswal)

---

JaisChat is an ongoing portfolio project built to explore real-time communication, database design, authentication, and maintainable application architecture.
