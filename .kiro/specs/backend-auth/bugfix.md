# Bugfix Requirements Document

## Introduction

LiveCanvas currently implements all authentication and authorization logic on the frontend
(in `login.js`, `signup.js`, `room.js`, and `script.js`). User credentials are stored in
`localStorage`, password hashing is performed in the browser, and session state is held
only in `localStorage`/`sessionStorage`. Because none of this is enforced by the server,
any user can bypass the login page, forge a session, enumerate other users' credentials, or
access protected routes simply by manipulating browser storage. This is a security defect:
trust is placed in client-side state that the server never verifies.

The fix moves the source of truth for identity and session management to the Node.js/Express
backend (`backend/server.js`), so every protected action is gated by a server-issued,
server-verified token rather than by data the client controls.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits the signup form THEN the system stores credentials (name, email,
    password hash) directly in `localStorage` on the client without any server involvement.

1.2 WHEN a user submits the login form THEN the system reads the stored credentials from
    `localStorage`, compares password hashes entirely in the browser, and sets a
    `loggedInUser` key in `localStorage` to establish the session — the server is never
    contacted.

1.3 WHEN a page checks whether the user is authenticated THEN the system reads
    `localStorage.getItem("loggedInUser")` and trusts the result unconditionally, allowing
    an attacker to forge a session by writing an arbitrary value to that key.

1.4 WHEN an unauthenticated user navigates directly to a protected page (e.g., `saved.html`,
    `index.html?board=…`) THEN the system's only guard is a client-side `requireLogin()`
    check that can be bypassed by setting `loggedInUser` in `localStorage` without any
    valid credentials.

1.5 WHEN a user joins a Socket.IO room THEN the server accepts the `join-room` event with
    any arbitrary username string and performs no verification that the socket belongs to
    an authenticated session.

### Expected Behavior (Correct)

2.1 WHEN a user submits the signup form THEN the system SHALL send the registration data to
    a backend API endpoint, which validates uniqueness, hashes the password server-side
    (using bcrypt or equivalent), persists the account in the database, and returns a
    signed session token (e.g., a JWT or a server-side session cookie).

2.2 WHEN a user submits the login form THEN the system SHALL send credentials to a backend
    API endpoint, which retrieves the stored account, verifies the password hash
    server-side, and returns a signed session token on success — no credential data shall
    be stored in or read from `localStorage`.

2.3 WHEN a client presents a session token for any protected operation THEN the system SHALL
    validate the token on the server before fulfilling the request, rejecting any request
    that carries an absent, expired, or tampered token.

2.4 WHEN an unauthenticated user (no valid server-issued token) attempts to access a
    protected route or page THEN the system SHALL redirect or return an unauthorized
    response, regardless of what is stored in browser storage.

2.5 WHEN a client emits `join-room` over Socket.IO THEN the server SHALL verify the
    accompanying session token before admitting the socket to the board room, and SHALL
    reject the connection with an auth error if the token is invalid or missing.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a successfully authenticated user creates a new board room THEN the system SHALL
    CONTINUE TO generate a unique room ID and navigate the user to that board.

3.2 WHEN a successfully authenticated user joins an existing board room with a valid room
    code THEN the system SHALL CONTINUE TO connect them via Socket.IO and synchronize the
    shared canvas state in real time.

3.3 WHEN multiple authenticated users are in the same board room THEN the system SHALL
    CONTINUE TO broadcast drawing operations, cursor positions, object changes, and canvas
    style updates to all other participants.

3.4 WHEN an authenticated user's session token is valid THEN the system SHALL CONTINUE TO
    display their name and profile picture in the header and collaborator list.

3.5 WHEN an authenticated user explicitly logs out THEN the system SHALL CONTINUE TO clear
    the local session state and redirect to the login page.

3.6 WHEN board state is saved or updated THEN the system SHALL CONTINUE TO persist drawing
    operations and object data to MongoDB and broadcast changes to collaborators.
