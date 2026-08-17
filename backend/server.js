const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);


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
    // JOIN ROOM
    // ========================================================

    socket.on(
        "join-room",
        (roomId, username) => {

            // ------------------------------------------------
            // VALIDATE ROOM
            // ------------------------------------------------

            if (
                !roomId ||
                typeof roomId !== "string" ||
                !roomId.trim()
            ) {

                console.log(
                    "Join rejected: invalid room"
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


            roomId =
                roomId.trim();

            username =
                username.trim();


            // ------------------------------------------------
            // STORE USER INFO
            // ------------------------------------------------

            socket.username =
                username;

            socket.roomId =
                roomId;


            // ------------------------------------------------
            // JOIN SOCKET.IO ROOM
            // ------------------------------------------------

            socket.join(
                roomId
            );


            console.log(
                `${username} joined room ${roomId}`
            );


            // ------------------------------------------------
            // GET CURRENT USERS
            // ------------------------------------------------

            const room =
                io.sockets.adapter.rooms.get(
                    roomId
                );


            const users =
                room
                    ? [...room]
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
                "Room:",
                roomId
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
            // SEND ROOM DATA TO CURRENT USER
            // =================================================

            socket.emit(
                "room-joined",
                {

                    roomId:
                        roomId,

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
                roomId
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
                !socket.roomId ||
                !data
            ) {

                return;
            }


            socket.to(
                socket.roomId
            ).emit(
                "canvas-draw",
                data
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


            if (
                !socket.roomId
            ) {

                return;
            }


            const roomId =
                socket.roomId;


            const username =
                socket.username ||
                "Unknown User";


            // ------------------------------------------------
            // IMPORTANT
            // Socket.IO removes the socket from the room
            // before disconnect event is handled.
            // ------------------------------------------------

            const room =
                io.sockets.adapter.rooms.get(
                    roomId
                );


            const users =
                room
                    ? [...room]
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
                `${username} left room ${roomId}`
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
                roomId
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