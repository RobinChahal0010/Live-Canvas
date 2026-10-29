# Implementation Plan

## Overview

This task list implements the backend-auth bugfix by migrating all authentication logic from client-side localStorage to a server-side Express/JWT architecture. The workflow follows the bug-condition methodology: explore the bug with tests first, capture preservation baselines, then implement the fix in a sequence that can be validated step by step.

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Client-Side Auth Bypass
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to each of the four concrete bug-condition cases:
    1. **Signup bypass** — write `localStorage.setItem("loggedInUser", JSON.stringify({name:"Attacker",email:"a@b.com"}))` in a jsdom environment, call the current `requireLogin()` logic, assert it returns `true` — proves the client-side guard is bypassable
    2. **Socket join without token** — connect a Socket.IO test client to the running server WITHOUT supplying `handshake.auth.token`, emit `join-room` with a valid boardId and any username string, assert the server emits `room-joined` — proves `join-room` performs no auth
    3. **Credential enumeration** — call the current signup flow (JSDOM/unit), then read `localStorage.getItem("users")`, assert the returned JSON contains a `password` field — proves credentials are stored client-side
    4. **Login without server contact** — spy/mock `fetch` during the login flow, call `loginBtn` click handler, assert `fetch` was never called with `/api/auth/login` — proves auth is entirely client-side
  - For all four cases: run on UNFIXED code and expect each assertion to be true (the bug is present)
  - After fix: all four assertions should be false (the bug is eliminated)
  - Document counterexamples found (e.g., "requireLogin() returns true for forged localStorage", "join-room succeeds with no token")
  - Mark task complete when all four tests are written, run on unfixed code, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Real-Time Collaboration Events Unaffected
  - **IMPORTANT**: Follow observation-first methodology — run the UNFIXED server and record actual broadcast behavior
  - Observe on UNFIXED server:
    - `canvas-draw` payload emitted by socket A is broadcast to socket B unchanged
    - `object-add` / `object-update` / `object-delete` payloads are relayed to all other sockets in the room unchanged
    - `cursor-move` events are broadcast to other room members with the same payload
    - `canvas-style-change` and `canvas-style` events are broadcast to other room members
    - `document-state`, `board-state-update`, and `save-board-state` continue to sync pages and board data
    - `scheduleBoardPersist` is triggered after each state-mutating event
  - Write property-based tests (use fast-check or similar) capturing these observations:
    - **Drawing property**: for any valid `canvas-draw` payload (random x1/y1/x2/y2, any allowed tool, any color, any lineWidth 1–100), the server broadcasts it to all other sockets in the room — from Preservation Requirements in design
    - **Object sync property**: for any valid `object-add` payload with a random object id and type, the server relays it to other room members with the same content
    - **Cursor property**: for any `cursor-move` event from an authenticated socket, the broadcast payload equals the input payload
    - **Board persistence property**: for any state-mutating event sequence, `scheduleBoardPersist` is called at least once
  - Verify all property tests PASS on UNFIXED code (confirms baseline behavior)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix backend-auth — move all auth to server-side JWT

  - [ ] 3.1 Install bcrypt and jsonwebtoken in backend
    - `cd backend && npm install bcrypt@5.1.1 jsonwebtoken@9.0.2`
    - Verify both packages appear in `backend/package.json` under `dependencies`
    - _Bug_Condition: isBugCondition(SIGNUP | LOGIN) — no backend auth library present, making server-side hashing and JWT issuance impossible_
    - _Expected_Behavior: backend can call bcrypt.hash(), bcrypt.compare(), jwt.sign(), jwt.verify()_
    - _Preservation: no existing routes or socket events are affected by adding npm packages_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Add JWT_SECRET to backend/.env
    - Open `backend/.env` (create it if it does not exist)
    - Add line: `JWT_SECRET=<random 64-char hex string>` — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    - Confirm `backend/server.js` already calls `require("dotenv").config()` at the top (it does — verified in server.js)
    - _Bug_Condition: isBugCondition(SIGNUP | LOGIN) — no server secret exists to sign tokens_
    - _Expected_Behavior: process.env.JWT_SECRET is a non-empty string at runtime_
    - _Preservation: .env change is additive; existing MONGO_URI and PORT vars are untouched_
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Create backend/models/User.js
    - Create file `backend/models/User.js` with the Mongoose schema from the design:
      ```js
      const mongoose = require("mongoose");
      const userSchema = new mongoose.Schema({
        name:      { type: String, required: true, trim: true, minlength: 3 },
        email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
        password:  { type: String, required: true },   // bcrypt hash
        createdAt: { type: Date, default: Date.now }
      }, { versionKey: false });
      userSchema.set("toJSON", {
        transform: (_doc, ret) => { delete ret.password; return ret; }
      });
      module.exports = mongoose.model("User", userSchema);
      ```
    - `password` field is NEVER returned in API responses (toJSON transform deletes it)
    - _Bug_Condition: isBugCondition(SIGNUP) — credentials were stored in localStorage; no User model existed_
    - _Expected_Behavior: new User records are persisted to MongoDB with bcrypt-hashed passwords_
    - _Preservation: existing Board.js and FileMetadata.js models are untouched_
    - _Requirements: 2.1_

  - [ ] 3.4 Create backend/middleware/auth.js
    - Create file `backend/middleware/auth.js` with `verifyToken` middleware:
      ```js
      const jwt = require("jsonwebtoken");
      function verifyToken(req, res, next) {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "No token" });
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
          next();
        } catch {
          return res.status(401).json({ error: "Invalid or expired token" });
        }
      }
      module.exports = { verifyToken };
      ```
    - Reads `Authorization: Bearer <token>` header; attaches decoded payload to `req.user`
    - Returns 401 for absent, tampered, or expired tokens
    - _Bug_Condition: isBugCondition(REQUIRE_LOGIN) — no server-side token verification existed_
    - _Expected_Behavior: verifyToken(req, res, next) rejects any request without a valid JWT_
    - _Preservation: middleware is only applied to /api/auth/me; all other routes (upload, static, health) are untouched_
    - _Requirements: 2.3, 2.4_

  - [ ] 3.5 Create backend/routes/auth.js
    - Create file `backend/routes/auth.js` with four endpoints exactly as specified in the design:

    **POST /api/auth/signup**
    - Validate: `name` ≥ 3 chars (letters/spaces only), valid email format, `password` ≥ 8 chars with uppercase + lowercase + digit + special char
    - Check for duplicate email (case-insensitive) → 409 `{ error: "Email already registered" }` if found
    - `bcrypt.hash(password, 12)`
    - `new User({ name, email, password: hash }).save()`
    - `jwt.sign({ userId: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" })`
    - Respond 201 `{ token, user: { name, email } }`

    **POST /api/auth/login**
    - Find user by email (lowercase match)
    - If not found → 401 `{ error: "Invalid credentials" }`
    - `bcrypt.compare(password, user.password)` — if mismatch → 401 `{ error: "Invalid credentials" }`
    - `jwt.sign({ userId: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" })`
    - Respond 200 `{ token, user: { name, email } }`

    **GET /api/auth/me** (uses `verifyToken` middleware)
    - Respond 200 `{ user: { name: req.user.name, email: req.user.email } }`

    **POST /api/auth/logout**
    - Respond 200 `{ message: "Logged out" }` (token invalidation is client-side; server is stateless JWT)

    - _Bug_Condition: isBugCondition(SIGNUP | LOGIN) — no API endpoints existed; credentials were stored/read from localStorage_
    - _Expected_Behavior: all auth actions routed through /api/auth/*; server issues and validates JWTs_
    - _Preservation: no existing routes (/api/upload, /, /health, static) are modified_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.6 Update backend/server.js — mount auth routes and add Socket.IO auth middleware
    - At the top of `server.js`, after `require("dotenv").config()`, add:
      ```js
      const jwt = require("jsonwebtoken");
      const authRoutes = require("./routes/auth");
      ```
    - After `app.use(uploadRoutes);`, add:
      ```js
      app.use("/api/auth", authRoutes);
      ```
    - Add Socket.IO auth middleware immediately BEFORE `io.on("connection", ...)`:
      ```js
      io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Authentication required"));
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.user = decoded;
          next();
        } catch {
          return next(new Error("Invalid token"));
        }
      });
      ```
    - Inside the `join-room` handler, replace the line `username = cleanUsername(username);` source of authority with the JWT payload:
      ```js
      // Use verified identity from JWT, not the username the client claims
      username = socket.user.name;
      ```
      Keep `cleanUsername()` call for defensive trimming, but derive the canonical value from `socket.user.name` so it cannot be spoofed
    - `socket.username` is still set from `username` for the existing `getBoardUsers()` logic — no other socket event handlers need changes
    - _Bug_Condition: isBugCondition(SOCKET_JOIN) — server accepted any username with no token check_
    - _Expected_Behavior: sockets without a valid JWT are rejected before join-room fires; username is taken from verified JWT payload_
    - _Preservation: all socket events after join-room (canvas-draw, cursor-move, object-*, canvas-style-*, document-state, board-state-update, save-board-state, pages-update, user-profile-sync, cursor-leave) are completely untouched_
    - _Requirements: 2.5, 3.1, 3.2, 3.3_

  - [ ] 3.7 Update login.js — replace localStorage auth with API call
    - Remove: `hashPassword()` function, `localStorage.getItem("users")` read, hash comparison logic
    - Replace the loginBtn click handler body (after field validation) with:
      ```js
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("loggedInUser", JSON.stringify(data.user)); // display cache only
          window.location.href = "saved.html";
        } else {
          setFormMessage(data.error || "Login failed.");
        }
      } catch {
        setFormMessage("Could not connect to server. Please try again.");
      }
      ```
    - Keep: `setFormMessage()`, field validation (email/password not empty check), togglePassword / eyeIcon logic — these are display concerns only
    - _Bug_Condition: isBugCondition(LOGIN) — passwordHashingDoneInBrowser AND sessionSetViaLocalStorage AND serverNotContacted_
    - _Expected_Behavior: credentials sent to /api/auth/login; JWT stored in localStorage.token; loggedInUser used as display cache only_
    - _Preservation: field validation, toggle-password UI, redirect to saved.html are all preserved_
    - _Requirements: 2.2_

  - [ ] 3.8 Update signup.js — replace localStorage auth with API call
    - Remove: `hashPassword()` function, `localStorage.getItem("users")` read/write, `users.push(newUser)`, `localStorage.setItem("users", ...)` call
    - Replace the signupBtn click handler body (after field validation) with:
      ```js
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("loggedInUser", JSON.stringify(data.user)); // display cache only
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect") || "saved.html";
          window.location.href = redirect;
        } else {
          setFormMessage(data.error || "Signup failed.");
        }
      } catch {
        setFormMessage("Could not connect to server. Please try again.");
      }
      ```
    - Keep: `setFormMessage()`, all field validation rules (name/email/password format checks), togglePassword / eyeIcon logic, redirect param handling
    - _Bug_Condition: isBugCondition(SIGNUP) — credentialsWrittenToLocalStorage AND serverNotContacted_
    - _Expected_Behavior: data sent to /api/auth/signup; JWT stored in localStorage.token; no credential data in localStorage.users_
    - _Preservation: all client-side field validation is retained (it provides UX feedback, not security); redirect logic is unchanged_
    - _Requirements: 2.1_

  - [ ] 3.9 Update room.js — replace requireLogin() with server-verified async check
    - Remove: `getLoggedInUser()` reading from localStorage, synchronous `requireLogin()` trusting it
    - Add async `requireLogin()` and update all three callers (createRoomBtn, joinRoomBtn/joinBtn, enterRoomBtn):
      ```js
      async function requireLogin() {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname + window.location.search);
          return false;
        }
        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: "Bearer " + token }
          });
          if (response.ok) return true;
          localStorage.removeItem("token");
          localStorage.removeItem("loggedInUser");
          window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname + window.location.search);
          return false;
        } catch {
          return false;
        }
      }
      ```
    - Update each event listener to be `async` and `await requireLogin()`:
      ```js
      createRoomBtn.addEventListener("click", async () => {
        if (!await requireLogin()) return;
        // ... rest unchanged
      });
      ```
      Apply the same `async/await` pattern to `joinRoomBtn`, `joinBtn`, and `enterRoomBtn` listeners
    - Keep: `generateRoomId()`, room creation/joining/copying logic, `sessionStorage.setItem("roomId", ...)` — all unchanged
    - _Bug_Condition: isBugCondition(REQUIRE_LOGIN) — authDecisionBasedSolelyOnLocalStorage AND noTokenVerifiedByServer_
    - _Expected_Behavior: requireLogin() calls /api/auth/me with Bearer token; invalid/absent token → redirect to login_
    - _Preservation: room ID generation, sessionStorage usage, navigation to index.html?room=... are all preserved (Requirements 3.1, 3.2)_
    - _Requirements: 2.4, 3.1, 3.2_

  - [ ] 3.10 Update script.js — pass JWT in Socket.IO handshake and update logout
    - Find the socket initialisation block (around line 458 in script.js):
      ```js
      // BEFORE:
      socket = io(window.location.origin, { transports: ["websocket", "polling"] });
      ```
      Replace with:
      ```js
      // AFTER:
      const token = localStorage.getItem("token");
      socket = io(window.location.origin, {
        transports: ["websocket", "polling"],
        auth: { token }
      });
      ```
    - Update `handleCanvasLogout()` (used by both `dropdownLogoutBtn` and `logoutBtn`):
      ```js
      async function handleCanvasLogout() {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch { /* ignore */ }
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");
        if (socket) socket.disconnect();
        window.location.href = "login.html";
      }
      ```
    - Keep: `loggedInUser` read from localStorage for display purposes (`updateAuthUI`, `currentUsername`, avatar) — it is now a display-only cache, not a trust anchor
    - Keep: all drawing, cursor, object, canvas-style, board-state, pages, and collaborator socket event handlers — completely untouched
    - _Bug_Condition: isBugCondition(SOCKET_JOIN) — socket connected without token in handshake.auth; server admitted without verification_
    - _Expected_Behavior: token passed in handshake.auth; server Socket.IO middleware verifies it before admitting connection_
    - _Preservation: all socket event listeners (canvas-draw, cursor-move, object-*, canvas-style-*, room-joined, user-joined, user-left, user-profile-sync, cursor-leave, board-state, connect/disconnect) are unchanged (Requirements 3.1–3.6)_
    - _Requirements: 2.5, 3.3, 3.4, 3.5_

  - [ ] 3.11 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Client-Side Auth Bypass Eliminated
    - **IMPORTANT**: Re-run the SAME four tests written in task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior; when they pass, the fix is confirmed
    - Re-run all four test cases against the fixed code:
      1. localStorage forge → `requireLogin()` now calls `/api/auth/me` and returns `false` (no valid token)
      2. Socket join without token → server Socket.IO middleware rejects with `Authentication required`
      3. Credential enumeration → `localStorage.getItem("users")` returns `null` (no credentials stored client-side)
      4. Login without server contact → `fetch` is called exactly once with `/api/auth/login`
    - **EXPECTED OUTCOME**: All four tests PASS (confirms the bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.12 Verify preservation property tests still pass
    - **Property 2: Preservation** - Real-Time Collaboration Events Unaffected
    - **IMPORTANT**: Re-run the SAME property-based tests from task 2 — do NOT write new tests
    - Run all preservation property tests against the fixed server (with authenticated sockets)
    - Confirm: drawing, object, cursor, canvas-style, and board-state events all broadcast identically to unfixed behavior
    - Confirm: `scheduleBoardPersist` is still called after each state-mutating event
    - **EXPECTED OUTCOME**: All property tests PASS (confirms no regressions in real-time collaboration)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run unit tests for all four `/api/auth/*` endpoints (signup valid/duplicate/missing-fields, login correct/wrong-password/unknown-email, me valid/missing/tampered/expired token, logout)
  - Run Socket.IO integration tests: valid JWT → `room-joined`; no token → auth error; invalid token → auth error
  - Re-run `verifyToken` middleware unit tests: valid token populates `req.user`; absent/malformed/expired token returns 401
  - Run the full integration smoke test: signup → login → join room → draw stroke → second client sees it
  - Verify logout flow: `localStorage.token` cleared, subsequent socket connection rejected
  - Ensure all tests pass; ask the user if any questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3.1"] },
    { "wave": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "wave": 4, "tasks": ["3.5"] },
    { "wave": 5, "tasks": ["3.6"] },
    { "wave": 6, "tasks": ["3.7", "3.8", "3.9", "3.10"] },
    { "wave": 7, "tasks": ["3.11", "3.12"] },
    { "wave": 8, "tasks": ["4"] }
  ]
}
```

## Notes

- Tasks 1 and 2 MUST be completed before any implementation work begins. Their purpose is to document the bug and capture the preservation baseline on unfixed code.
- All real-time Socket.IO event handlers in `backend/server.js` (canvas-draw, cursor-move, object-*, canvas-style-*, document-state, board-state-update, save-board-state) are explicitly out of scope — do not modify them.
- `localStorage.loggedInUser` is retained as a display-only cache after the fix; it is no longer a trust anchor. Scripts that read it for UI rendering (`updateAuthUI`, `currentUsername`, collaborator avatars) do not need to change.
- The `generateRoomId()` function in `room.js` is client-side and unchanged.
- `backend/.env` must never be committed to version control — confirm it is listed in `.gitignore`.
