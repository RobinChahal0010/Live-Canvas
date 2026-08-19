const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ============================================================
// SERVE HOME PAGE
// ============================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "..",
            "home.html"
        )
    );
});

// ============================================================
// STATIC FILES
// ============================================================

app.use(
    express.static(
        path.join(
            __dirname,
            ".."
        )
    )
);

// ============================================================
// BOARD STATE
// ============================================================

// boardId -> board state
const boards = new Map();

function getBoardState(boardId) {

    if (!boards.has(boardId)) {

        boards.set(boardId, {

            // Drawing pages
            pages: [
                {
                    canvasData: null,
                    height: 700
                }
            ],

            currentPage: 0,

            zoom: 100,

            title: "Study Notes",

            canvasStyle: "blank"

        });

    }

    return boards.get(boardId);
}

// ============================================================
// SOCKET CONNECTION
// ============================================================

io.on("connection", socket => {

    console.log(
        "User connected:",
        socket.id
    );

    // ========================================================
    // JOIN BOARD
    // ========================================================

    socket.on(
        "join-room",
        (boardId, username) => {

            if (
                !boardId ||
                typeof boardId !== "string" ||
                !boardId.trim()
            ) {
                return;
            }

            if (
                !username ||
                typeof username !== "string" ||
                !username.trim()
            ) {
                console.log(
                    "Join rejected: username missing"
                );

                return;
            }

            boardId = boardId.trim();
            username = username.trim();

            socket.username = username;
            socket.boardId = boardId;

            // Join Socket.IO room
            socket.join(boardId);

            console.log(
                `${username} joined board ${boardId}`
            );

            // Get/create board state
            const boardState =
                getBoardState(boardId);

            // =================================================
            // GET USERS
            // =================================================

            const room =
                io.sockets.adapter.rooms.get(
                    boardId
                );

            const users =
                room
                    ? [...room]
                        .map(socketId => {

                            const userSocket =
                                io.sockets.sockets.get(
                                    socketId
                                );

                            return userSocket?.username;

                        })
                        .filter(Boolean)
                    : [];

            const userCount =
                users.length;

            // =================================================
            // SEND BOARD STATE TO NEW USER
            // =================================================

            socket.emit(
                "room-joined",
                {
                    roomId: boardId,

                    username,

                    userCount,

                    users,

                    boardState
                }
            );

            // =================================================
            // TELL OTHER USERS
            // =================================================

            socket.to(boardId).emit(
                "user-joined",
                {
                    username,

                    userCount,

                    users
                }
            );

        }
    );

    // ========================================================
    // CANVAS DRAW SYNC
    // ========================================================

    socket.on(
        "canvas-draw",
        data => {

            if (
                !socket.boardId ||
                !data
            ) {
                return;
            }

            // Forward live stroke
            socket.to(
                socket.boardId
            ).emit(
                "canvas-draw",
                data
            );

        }
    );

    // ========================================================
    // BOARD STATE UPDATE
    // ========================================================

    socket.on(
        "board-state-update",
        data => {

            if (
                !socket.boardId ||
                !data ||
                typeof data !== "object"
            ) {
                return;
            }

            const boardState =
                getBoardState(
                    socket.boardId
                );

            // Update only supplied properties
            if (
                Array.isArray(data.pages)
            ) {
                boardState.pages =
                    data.pages;
            }

            if (
                typeof data.currentPage === "number"
            ) {
                boardState.currentPage =
                    data.currentPage;
            }

            if (
                typeof data.zoom === "number"
            ) {
                boardState.zoom =
                    data.zoom;
            }

            if (
                typeof data.title === "string"
            ) {
                boardState.title =
                    data.title;
            }

            if (
                typeof data.canvasStyle === "string"
            ) {
                boardState.canvasStyle =
                    data.canvasStyle;
            }

            // Send updated state to everyone
            // except sender
            socket.to(
                socket.boardId
            ).emit(
                "board-state-update",
                boardState
            );

        }
    );

    // ========================================================
    // USER DISCONNECT
    // ========================================================

    socket.on(
        "disconnect",
        () => {

            console.log(
                "User disconnected:",
                socket.id
            );

            if (!socket.boardId) {
                return;
            }

            const boardId =
                socket.boardId;

            const username =
                socket.username ||
                "Unknown User";

            const room =
                io.sockets.adapter.rooms.get(
                    boardId
                );

            const users =
                room
                    ? [...room]
                        .map(socketId => {

                            const userSocket =
                                io.sockets.sockets.get(
                                    socketId
                                );

                            return userSocket?.username;

                        })
                        .filter(Boolean)
                    : [];

            const userCount =
                users.length;

            socket.to(
                boardId
            ).emit(
                "user-left",
                {
                    username,

                    userCount,

                    users
                }
            );

        }
    );

});

// ============================================================
// START SERVER
// ============================================================

const PORT = 3000;

server.listen(
    PORT,
    () => {

        console.log(
            `LiveCanvas server running at http://localhost:${PORT}`
        );

    }
);