# Backend Auth Bugfix Design

## Overview

LiveCanvas trusts the client for all authentication decisions. Credentials are stored in
`localStorage`, password hashing runs in the browser, and the server never issues or
verifies a session token. Any user can forge a session by writing an arbitrary value to
`localStorage.loggedInUser` and gain full access to protected pages and Socket.IO rooms.

The fix migrates every auth concern to the Express/Node.js backend:

- A new `User` Mongoose model stores hashed credentials.
- Four REST endpoints (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`,
  `/api/auth/logout`) replace all localStorage credential operations.
- A `verifyToken` middleware guards HTTP routes that require a valid session.
- A Socket.IO auth middleware verifies the JWT attached in `socket.handshake.auth.token`
  before any socket is admitted to a board room.
- Frontend files (`login.js`, `signup.js`, `room.js`, `script.js`) are updated to call
  the API and carry the JWT rather than reading/writing `localStorage.users`.

All real-time collaboration events (drawing, cursors, objects, canvas style, pages) are
completely untouched — only the auth boundary changes.

---

## Glossary

- **Bug_Condition (C)**: Any auth decision that reads from or writes to client-controlled
  storage (`localStorage.users`, `localStorage.loggedInUser`) or any socket admission that
  proceeds without a server-verified JWT.
- **Property (P)**: The desired behavior when the bug condition holds — the action is
  redirected through a backend API endpoint and validated by the server.
- **Preservation**: All real-time collaborative behaviors (drawing, cursors, object sync,
  canvas style, page management, board persistence) that must remain unchanged by the fix.
- **verifyToken**: Express middleware in `backend/middleware/auth.js` that reads the
  `Authorization: Bearer <token>` header, verifies the JWT signature, and attaches the
  decoded payload to `req.user`.
- **socketAuthMiddleware**: Socket.IO middleware that reads `socket.handshake.auth.token`,
  verifies it, and attaches the decoded payload to `socket.user` before `join-room` fires.
- **loggedInUser (legacy)**: The `localStorage` key currently used to store session state —
  replaced by `localStorage.token` (JWT) after the fix.
- **JWT**: JSON Web Token — a signed, stateless credential issued by the server on
  successful login or signup, stored in `localStorage` under the key `token`.
- **bcrypt**: Password-hashing library used server-side; replaces the browser-side SHA-256
  approach in the current `login.js` and `signup.js`.

---

## Bug Details

### Bug Condition

The bug manifests whenever the application makes an auth decision using client-controlled
storage rather than a server-issued, server-verified token. This covers:

- Writing new user credentials to `localStorage` on signup (no server call).
- Reading credentials from `localStorage` and comparing hashes in the browser on login.
- Checking `localStorage.getItem("loggedInUser")` as the sole gate for protected pages.
- Emitting `join-room` over Socket.IO with only a username string and no token.

**Formal Specification:**

```
FUNCTION isBugCondition(action)
  INPUT: action — one of { SIGNUP, LOGIN, REQUIRE_LOGIN, SOCKET_JOIN }
  OUTPUT: boolean

  IF action = SIGNUP
    RETURN credentialsWrittenToLocalStorage(action)
           AND serverNotContacted(action)

  IF action = LOGIN
    RETURN passwordHashingDoneInBrowser(action)
           AND sessionSetViaLocalStorage(action)
           AND serverNotContacted(action)

  IF action = REQUIRE_LOGIN
    RETURN authDecisionBasedSolelyOnLocalStorage(action)
           AND noTokenVerifiedByServer(action)

  IF action = SOCKET_JOIN
    RETURN joinRoomEmittedWithoutToken(action)
           AND serverAcceptsWithoutVerification(action)

  RETURN false
END FUNCTION
```

### Examples

- **Signup bypass**: A user opens DevTools, runs
  `localStorage.setItem("loggedInUser", JSON.stringify({name:"Attacker",email:"a@b.com"}))`,
  then navigates to `saved.html`. `requireLogin()` returns `true` immediately — no server
  involved. *(Expected after fix: redirect to login; no valid JWT present.)*

- **Credential enumeration**: `JSON.parse(localStorage.getItem("users"))` returns every
  registered account's email and password hash in plaintext from the browser console.
  *(Expected after fix: no credential data in localStorage at all.)*

- **Socket impersonation**: A client emits
  `socket.emit("join-room", "BOARDID", "admin", "1")` with no token. The server currently
  admits the socket and labels it "admin". *(Expected after fix: server rejects with
  `join-error` because no valid JWT is in `socket.handshake.auth.token`.)*

- **Expired session**: A user's `loggedInUser` key persists indefinitely in localStorage.
  There is no mechanism to invalidate it. *(Expected after fix: JWT has a configurable
  expiry; after expiry, `/api/auth/me` returns 401 and the user is redirected to login.)*

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Real-time drawing (`canvas-draw`) broadcast to all room participants must continue to
  work exactly as before once a socket is authenticated.
- Remote cursor sync (`cursor-move`, `cursor-leave`) must continue to work unchanged.
- Object operations (`object-add`, `object-update`, `object-delete`) must continue to sync
  across all connected sockets in a board room.
- Canvas style changes (`canvas-style-change`, `canvas-style`) must continue to be
  broadcast to other room members.
- Board state persistence to MongoDB (via `scheduleBoardPersist`) must continue to operate
  on every state-mutating event.
- Page management (`document-state`, `board-state-update`, `save-board-state`,
  `pages-update`) must continue to synchronize across all participants.
- The collaborator list (avatar display, username, profile picture) must continue to be
  populated from the Socket.IO room state.
- Logout must continue to clear local session state and redirect to the login page.
- Room creation and room-code joining flow in `room.js` must continue to work for
  authenticated users.

**Scope:**

All socket events that are NOT `join-room` authentication, and all HTTP routes that are NOT
`/api/auth/*`, are completely unaffected by this fix. This includes:

- All drawing, cursor, object, and page Socket.IO events.
- The file upload route (`/api/upload` via `Upload.js`).
- The static file serving and health check endpoints.
- Board creation and room code generation (client-side `generateRoomId()` stays unchanged).

---

## Hypothesized Root Cause

1. **No server-side auth infrastructure**: `backend/server.js` has no User model, no auth
   routes, no JWT library, and no middleware to verify tokens. There is simply no server
   component capable of issuing or validating credentials.

2. **Frontend owns the credential store**: `signup.js` writes to `localStorage.users` and
   `login.js` reads from it. The server was never part of the signup/login flow, so the
   client became the de-facto database and trust authority.

3. **Session state is unforgeable only by convention**: `localStorage.loggedInUser` is
   treated as proof of identity. Because no server ever issued it and no server ever checks
   it, it provides security by obscurity at best.

4. **Socket.IO `join-room` skips auth entirely**: The handler validates only that
   `username` is a non-empty string. There is no step where the server asks "who issued
   this identity claim?" — adding the JWT middleware is the minimal change needed here.

5. **Missing dependencies**: `bcrypt` and `jsonwebtoken` are not listed in
   `backend/package.json` and need to be installed before the backend auth routes can be
   implemented.

---

## Correctness Properties

Property 1: Bug Condition — Server-Issued Token Required for All Auth Decisions

_For any_ action where the bug condition holds (signup, login, page guard, or socket join
performed using client-controlled storage without a server-verified token), the fixed
system SHALL route that action through the backend API, receive a server-issued JWT on
success, and reject the action with an appropriate error response if the token is absent,
expired, or invalid — without reading from or writing credential data to `localStorage`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation — Real-Time Collaboration Unaffected

_For any_ input that does NOT involve an auth decision (drawing events, cursor events,
object events, canvas style events, board state events, page events, file uploads), the
fixed server SHALL produce exactly the same behavior as the original server, preserving all
real-time collaboration functionality for authenticated sockets in a board room.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Dependencies to Install

```
cd backend
npm install bcrypt@5.1.1 jsonwebtoken@9.0.2
```

### New Files

**`backend/models/User.js`** — Mongoose schema for user accounts:

```
FIELDS:
  name       String, required, trimmed, min 3 chars
  email      String, required, unique, lowercase, trimmed
  password   String, required  (bcrypt hash, never returned to client)
  createdAt  Date, default Date.now

OPTIONS:
  versionKey: false
  toJSON transform: delete password before serialisation
```

**`backend/middleware/auth.js`** — `verifyToken` Express middleware:

```
FUNCTION verifyToken(req, res, next)
  token ← req.headers.authorization?.split(" ")[1]
  IF token is absent THEN return res.status(401).json({error: "No token"})
  TRY
    decoded ← jwt.verify(token, process.env.JWT_SECRET)
    req.user ← decoded
    next()
  CATCH
    return res.status(401).json({error: "Invalid or expired token"})
END FUNCTION
```

**`backend/routes/auth.js`** — Four auth endpoints:

```
POST /api/auth/signup
  BODY: { name, email, password }
  VALIDATE: name ≥ 3 chars, valid email format, password ≥ 8 chars with complexity rules
  CHECK: no existing User with same email (case-insensitive) → 409 if duplicate
  HASH: bcrypt.hash(password, 12)
  SAVE: new User({ name, email, password: hash })
  ISSUE: jwt.sign({ userId: user._id, email, name }, JWT_SECRET, { expiresIn: "7d" })
  RESPOND: 201 { token, user: { name, email } }

POST /api/auth/login
  BODY: { email, password }
  FIND: User by email (case-insensitive)
  IF not found → 401 { error: "Invalid credentials" }
  VERIFY: bcrypt.compare(password, user.password)
  IF mismatch → 401 { error: "Invalid credentials" }
  ISSUE: jwt.sign({ userId: user._id, email, name: user.name }, JWT_SECRET, { expiresIn: "7d" })
  RESPOND: 200 { token, user: { name, email } }

GET /api/auth/me    [requires verifyToken middleware]
  RESPOND: 200 { user: { name: req.user.name, email: req.user.email } }

POST /api/auth/logout
  RESPOND: 200 { message: "Logged out" }
  (Token invalidation is client-side; server is stateless JWT)
```

### Changes to `backend/server.js`

```
1. Require and mount auth routes:
     const authRoutes = require("./routes/auth");
     app.use("/api/auth", authRoutes);

2. Add Socket.IO auth middleware (before io.on("connection")):
     io.use(async (socket, next) => {
       token ← socket.handshake.auth.token
       IF absent → next(new Error("Authentication required"))
       TRY
         decoded ← jwt.verify(token, process.env.JWT_SECRET)
         socket.user ← decoded
         next()
       CATCH → next(new Error("Invalid token"))
     })

3. In join-room handler:
     - REMOVE username validation as auth (username is still used for display)
     - ADD: use socket.user.name as the authoritative username
     - socket.username ← socket.user.name (from verified JWT payload)
```

### Changes to Frontend Files

**`signup.js`** — Replace localStorage logic:

```
REMOVE: hashPassword(), users array, localStorage.setItem("users", ...)
REPLACE WITH:
  response ← await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  })
  IF response.ok:
    { token, user } ← await response.json()
    localStorage.setItem("token", token)
    localStorage.setItem("loggedInUser", JSON.stringify(user))  // display cache only
    redirect to saved.html (or redirect param)
  ELSE:
    show error from response body
```

**`login.js`** — Replace localStorage logic:

```
REMOVE: hashPassword(), users array read, localStorage comparison
REPLACE WITH:
  response ← await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  IF response.ok:
    { token, user } ← await response.json()
    localStorage.setItem("token", token)
    localStorage.setItem("loggedInUser", JSON.stringify(user))  // display cache only
    redirect to saved.html
  ELSE:
    show error from response body
```

**`room.js`** — Replace requireLogin():

```
REMOVE: getLoggedInUser() reading from localStorage, requireLogin() trusting it
REPLACE WITH:
  async function requireLogin():
    token ← localStorage.getItem("token")
    IF absent → redirect to login.html; return false
    response ← await fetch("/api/auth/me", {
      headers: { Authorization: "Bearer " + token }
    })
    IF response.ok → return true
    ELSE → localStorage.removeItem("token"); redirect to login.html; return false
```

**`script.js`** — Pass JWT in Socket.IO handshake:

```
CHANGE socket initialisation from:
  io(window.location.origin, { transports: [...] })
TO:
  token ← localStorage.getItem("token")
  io(window.location.origin, {
    transports: ["websocket", "polling"],
    auth: { token }
  })

CHANGE logout handlers (handleCanvasLogout, dropdownLogoutBtn):
  REMOVE: localStorage.removeItem("loggedInUser")
  ADD:    localStorage.removeItem("token")
          localStorage.removeItem("loggedInUser")
          await fetch("/api/auth/logout", { method: "POST" })

KEEP: loggedInUser read from localStorage for display purposes (name, email, avatar)
      — it is now a display-only cache populated on login/signup, not a trust anchor
```

### Environment Variable

Add `JWT_SECRET=<random 64-char hex string>` to `backend/.env`. The server must refuse to
start if this variable is absent.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate the insecure behavior on the **unfixed** code, then verify the fix enforces
server-side auth correctly while leaving all real-time collaboration untouched.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix.
Confirm or refute the root cause analysis.

**Test Plan**: Write tests that simulate each auth action against the original code and
assert that the server rejects or the localStorage bypass succeeds (to prove the bug
exists). Run on the unfixed code to observe failures.

**Test Cases**:

1. **localStorage session forge** (will pass on unfixed code, should fail after fix):
   Write `localStorage.loggedInUser = '{"name":"Attacker"}'`, call `requireLogin()`,
   assert returns `true` — proves the client-side guard is bypassable.

2. **Socket join without token** (will pass on unfixed code, should fail after fix):
   Emit `join-room` with a valid boardId and username but no JWT in
   `handshake.auth.token`; assert server emits `room-joined` — proves the socket
   handler performs no auth.

3. **Credential enumeration** (will pass on unfixed code, should fail after fix):
   After signup, read `localStorage.getItem("users")` and assert it contains the
   password hash — proves credentials are client-accessible.

4. **Login without server contact** (will pass on unfixed code, should fail after fix):
   Intercept network requests during login; assert zero requests to `/api/auth/login`
   are made — proves auth is entirely client-side.

**Expected Counterexamples**:
- `requireLogin()` returns `true` for a forged localStorage value.
- `join-room` succeeds with a missing token.
- Credentials readable via `localStorage.getItem("users")`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system
produces the expected behavior (server-issued JWT, server validation).

**Pseudocode:**

```
FOR ALL action WHERE isBugCondition(action) DO
  result := fixedHandler(action)
  ASSERT result.routedThroughServer = true
  ASSERT result.tokenIssuedByServer = true   // for signup/login
  ASSERT result.localStorageCredentials = false
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (real-time
collaboration events), the fixed server produces the same result as the original server.

**Pseudocode:**

```
FOR ALL event WHERE NOT isBugCondition(event) DO
  ASSERT originalServer(event) = fixedServer(event)
END FOR
```

**Testing Approach**: Property-based testing is ideal for preservation checking because:
- It generates random drawing operations, object payloads, and cursor positions to verify
  broadcast behavior is unchanged.
- It catches edge cases that manual tests miss (e.g., empty pages array, zero-length
  draw strokes, simultaneous joins).
- It provides strong guarantees that the auth layer is genuinely isolated from the
  collaboration layer.

**Test Cases**:

1. **Drawing Preservation**: For any valid `canvas-draw` payload emitted by an
   authenticated socket, assert it is broadcast to all other sockets in the room,
   identical to the original behavior.

2. **Object Sync Preservation**: For any valid `object-add` / `object-update` /
   `object-delete` payload, assert it is relayed to other room members unchanged.

3. **Cursor Preservation**: For any `cursor-move` event from an authenticated socket,
   assert it is broadcast to other room members with the same payload.

4. **Board Persistence Preservation**: For any state-mutating event, assert
   `scheduleBoardPersist` is called and MongoDB is updated as before.

### Unit Tests

- `POST /api/auth/signup` with valid body → 201 + token + user object.
- `POST /api/auth/signup` with duplicate email → 409 + error message.
- `POST /api/auth/signup` with missing fields → 400 + validation error.
- `POST /api/auth/login` with correct credentials → 200 + token.
- `POST /api/auth/login` with wrong password → 401.
- `POST /api/auth/login` with unknown email → 401.
- `GET /api/auth/me` with valid token → 200 + user.
- `GET /api/auth/me` with missing token → 401.
- `GET /api/auth/me` with tampered token → 401.
- `GET /api/auth/me` with expired token → 401.
- Socket `join-room` with valid JWT → `room-joined` emitted.
- Socket `join-room` with no token → connection rejected with auth error.
- Socket `join-room` with invalid token → connection rejected with auth error.
- `verifyToken` middleware passes valid token → `req.user` populated.
- `verifyToken` middleware rejects absent/malformed/expired token → 401.

### Property-Based Tests

- For any random valid `{ name, email, password }` triple that passes validation, signup
  should succeed and return a verifiable JWT (fix-checking property).
- For any random token string that is NOT signed with `JWT_SECRET`, `verifyToken` should
  return 401 (fix-checking property).
- For any random drawing/cursor/object event emitted by an authenticated socket, the
  server should broadcast it to other room members without modification (preservation
  property).
- For any sequence of random collaboration events on a board, the in-memory board state
  and MongoDB state should remain consistent, as before the fix (preservation property).

### Integration Tests

- Full signup → login → join room → draw → collaborator sees drawing flow.
- Token expiry: issue a token with 1-second TTL, wait, assert `/api/auth/me` returns 401.
- Concurrent signup with the same email from two clients; assert exactly one succeeds.
- Socket disconnect and reconnect with valid JWT; assert board state is restored correctly.
- Logout clears `localStorage.token` and subsequent socket connection is rejected.
