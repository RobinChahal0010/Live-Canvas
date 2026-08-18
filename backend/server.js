const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://127.0.0.1:3000",
            "http://localhost:3000"
        ],
        methods: ["GET", "POST"]
    }
});


// ============================================================
// SERVE ROOM PAGE
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
// SOCKET CONNECTION
// ============================================================

io.on("connection", (socket) => {

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

            // ------------------------------------------------
            // VALIDATE BOARD
            // ------------------------------------------------

            if (
                !boardId ||
                typeof boardId !== "string" ||
                !boardId.trim()
            ) {

                console.log(
                    "Join rejected: invalid board"
                );

                return;
            }


            // ------------------------------------------------
            // VALIDATE USERNAME
            // ------------------------------------------------

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


            // ------------------------------------------------
            // CLEAN DATA
            // ------------------------------------------------

            boardId =
                boardId.trim();

            username =
                username.trim();


            // ------------------------------------------------
            // STORE USER INFO
            // ------------------------------------------------

            socket.username =
                username;

            socket.boardId =
                boardId;


            // ------------------------------------------------
            // JOIN SOCKET.IO BOARD ROOM
            // ------------------------------------------------

            socket.join(
                boardId
            );


            console.log(
                `${username} joined board ${boardId}`
            );


            // ------------------------------------------------
            // GET CURRENT USERS
            // ------------------------------------------------

            const board =
                io.sockets.adapter.rooms.get(
                    boardId
                );


            const users =
                board
                    ? [...board]
                        .map(
                            socketId => {

                                const userSocket =
                                    io.sockets.sockets.get(
                                        socketId
                                    );

                                return userSocket
                                    ?.username;

                            }
                        )
                        .filter(Boolean)
                    : [];


            const userCount =
                users.length;


            console.log(
                "Board:",
                boardId
            );

            console.log(
                "Users:",
                users
            );

            console.log(
                "User count:",
                userCount
            );


            // =================================================
            // SEND BOARD DATA TO CURRENT USER
            // =================================================

            socket.emit(
                "room-joined",
                {

                    boardId:
                        boardId,

                    username:
                        username,

                    userCount:
                        userCount,

                    users:
                        users

                }
            );


            // =================================================
            // SEND UPDATED USERS TO OTHER USERS
            // =================================================

            socket.to(
                boardId
            ).emit(
                "user-joined",
                {

                    username:
                        username,

                    userCount:
                        userCount,

                    users:
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
        (data) => {

            if (
                !socket.boardId ||
                !data
            ) {

                return;
            }


            socket.to(
                socket.boardId
            ).emit(
                "canvas-draw",
                data
            );

        }
    );

    socket.on(
        "cursor-move",
        data => {
            if (
                !socket.boardId ||
                !data ||
                typeof data.x !== "number" ||
                typeof data.y !== "number"
            ) {
                return;
            }

            socket.to(socket.boardId).emit("cursor-move", {
                socketId: socket.id,
                username: socket.username,
                x: data.x,
                y: data.y,
                visible: Boolean(data.visible)
            });
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


            if (
                !socket.boardId
            ) {

                return;
            }


            const boardId =
                socket.boardId;


            const username =
                socket.username ||
                "Unknown User";


            // ------------------------------------------------
            // Socket.IO removes the socket from the room
            // before disconnect event is handled.
            // ------------------------------------------------

            const board =
                io.sockets.adapter.rooms.get(
                    boardId
                );


            const users =
                board
                    ? [...board]
                        .map(
                            socketId => {

                                const userSocket =
                                    io.sockets.sockets.get(
                                        socketId
                                    );

                                return userSocket
                                    ?.username;

                            }
                        )
                        .filter(Boolean)
                    : [];


            const userCount =
                users.length;


            console.log(
                `${username} left board ${boardId}`
            );


            console.log(
                "Remaining users:",
                users
            );


            console.log(
                "Remaining user count:",
                userCount
            );


            // ------------------------------------------------
            // INFORM REMAINING USERS
            // ------------------------------------------------

            socket.to(
                boardId
            ).emit(
                "user-left",
                {

                    username:
                        username,

                    userCount:
                        userCount,

                    users:
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