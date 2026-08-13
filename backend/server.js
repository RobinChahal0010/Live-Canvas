const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);


// ============================================================
// SERVE ROOM PAGE
// ============================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "..",
            "room.html"
        )
    );

});


// ============================================================
// SERVE STATIC FILES
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

            // Validate room ID
            if (
                !roomId ||
                !roomId.trim()
            ) {

                return;
            }


            // Validate username
            if (
                !username ||
                !username.trim()
            ) {

                console.log(
                    "Join rejected: username missing"
                );

                return;
            }


            username =
                username.trim();


            // Store user information
            socket.username =
                username;

            socket.roomId =
                roomId;


            // Join room
            socket.join(roomId);


            console.log(
                `${username} joined room ${roomId}`
            );


            // Get users currently inside room
            const room =
                io.sockets.adapter.rooms.get(
                    roomId
                );


            const userCount =
                room
                    ? room.size
                    : 1;


            // =================================================
            // TELL CURRENT USER
            // =================================================

            socket.emit(
                "room-joined",
                {

                    roomId:
                        roomId,

                    username:
                        username,

                    userCount:
                        userCount

                }
            );


            // =================================================
            // TELL OTHER USERS
            // =================================================

            socket.to(roomId).emit(
                "user-joined",
                {

                    username:
                        username,

                    userCount:
                        userCount

                }
            );

        }
    );


    // =========================================================
    // CANVAS DRAW SYNC
    // =========================================================

    socket.on(
        "canvas-draw",
        (data) => {

            if (!socket.roomId) {
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


    // =========================================================
    // USER DISCONNECT
    // =========================================================

    socket.on(
        "disconnect",
        () => {

            console.log(
                "User disconnected:",
                socket.id
            );


            if (!socket.roomId) {
                return;
            }


            const room =
                io.sockets.adapter.rooms.get(
                    socket.roomId
                );


            const userCount =
                room
                    ? room.size
                    : 0;


            socket.to(
                socket.roomId
            ).emit(
                "user-left",
                {

                    username:
                        socket.username ||
                        "Unknown User",

                    userCount:
                        userCount

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