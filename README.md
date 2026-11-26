# Lab 4: Secure Connect and Communication Platform

Node.js + Express + MongoDB (Mongoose) + JWT + bcrypt + dotenv + Socket.IO + EventEmitter.

## Setup
```bash
npm install
cp .env.example .env     # then edit JWT_SECRET and MONGO_URI
npm start                # http://localhost:5000
```
MongoDB must be running locally (or put an Atlas URI in `MONGO_URI`).

## Project structure
```
server.js              entry point (Express + HTTP server + Socket.IO)
config/db.js           MongoDB connection
models/                User, Note, Message
middleware/auth.js     authenticate (JWT) + authorize (RBAC)
routes/auth.js         signup, login, me
routes/notes.js        protected Notes CRUD
routes/admin.js        admin-only routes + chat history
events/appEvents.js    EventEmitter + listeners
sockets/chat.js        authenticated real-time chat
public/index.html      browser chat client
```

## API
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/auth/signup | public | Register (password hashed with bcrypt) |
| POST | /api/auth/login | public | Returns JWT |
| GET | /api/auth/me | token | Current user |
| POST | /api/notes | token | Create note |
| GET | /api/notes | token | List own notes (admin: `?all=true`) |
| GET | /api/notes/:id | owner/admin | Read note |
| PUT | /api/notes/:id | owner/admin | Update note |
| DELETE | /api/notes/:id | owner/admin | Delete note |
| GET | /api/admin/users | admin | List users (RBAC) |
| PATCH | /api/admin/users/:id/role | admin | Change role |
| GET | /api/admin/messages/:room | token | Chat history |

## Testing (Postman / curl)
**Signup**
```bash
curl -X POST http://localhost:5000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"username":"victor","email":"victor@example.com","password":"123456"}'
```
Expected: `{"message":"User registered","id":"...","username":"victor","email":"victor@example.com"}`

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"victor@example.com","password":"123456"}'
```
**Protected route (no token -> 401)**
```bash
curl http://localhost:5000/api/notes
```
**Create note**
```bash
curl -X POST http://localhost:5000/api/notes -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" -d '{"title":"First","content":"Hello"}'
```
**Admin route as normal user -> 403**
```bash
curl http://localhost:5000/api/admin/users -H "Authorization: Bearer <TOKEN>"
```
To get an admin, sign up with the email set as `ADMIN_EMAIL` in `.env`.

**Real-time chat:** open http://localhost:5000 in two browser tabs, log in as two users, join the same room, and chat. Creating/updating/deleting a note sends a live notification to that user's open tabs (EventEmitter -> Socket.IO).

## How each requirement is met
- **Signup/Login:** `routes/auth.js`, bcrypt hash + compare, generic error on bad credentials.
- **JWT:** signed with `JWT_SECRET`, expiry from env, verified in `middleware/auth.js`.
- **Protected routes / RBAC:** `authenticate` + `authorize('admin')`; ownership checks on notes.
- **Notes API:** full CRUD scoped to the owner.
- **Real-time chat:** Socket.IO with JWT handshake auth, rooms, typing, presence, persisted messages.
- **Event-driven:** `events/appEvents.js` (`user:registered`, `user:loggedIn`, `note:*`, `chat:message`).
- **dotenv:** secrets and config in `.env`, never hard-coded.
- **Restrictions:** only Node.js, Express and the listed libraries (Mongoose is the MongoDB driver layer).
