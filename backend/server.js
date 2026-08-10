const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

const server = http.createServer(app);

const io = new Server(server);


app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "..", "room.html")
    );

});


app.use(express.static(path.join(__dirname, "..")));

const adjectives = [
    "Pixel",
    "Neon",
    "Quantum",
    "Cyber",
    "Digital",
    "Creative",
    "Binary",
    "Logic"
];

const animals = [
    "Panda",
    "Fox",
    "Falcon",
    "Tiger",
    "Wolf",
    "Penguin",
    "Koala",
    "Otter",
    "Phoenix"
];

function generateUsername() {

    const adjective =
        adjectives[
            Math.floor(
                Math.random() * adjectives.length
            )
        ];

    const animal =
        animals[
            Math.floor(
                Math.random() * animals.length
            )
        ];

    const number =
        Math.floor(
            10 + Math.random() * 90
        );

    return `${adjective}${animal}${number}`;
}
/* =========================================
   SOCKET CONNECTION
========================================= */

// ============================================================
// SOCKET CONNECTION
// ============================================================

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

// ========================================================
// JOIN ROOM
// ========================================================

socket.on("join-room", (roomId, username) => {

    // Validate room ID
    if (!roomId || !roomId.trim()) {
        return;
    }

    // Generate random username if none provided
    if (!username || username.trim() === "") {
        username = generateUsername();
    }

    // Store user information
    socket.username = username;
    socket.roomId = roomId;

    // Join room
    socket.join(roomId);

    console.log(
        `${username} joined room ${roomId}`
    );

    // Get users currently inside room
    const room =
        io.sockets.adapter.rooms.get(roomId);

    const userCount =
        room ? room.size : 1;

    // Tell current user
    socket.emit("room-joined", {

        roomId: roomId,
        username: username,
        userCount: userCount

    });

    // Tell everyone else
    socket.to(roomId).emit(
        "user-joined",
        {
            username: username,
            userCount: userCount
        }
    );

});


    // ========================================================
    // USER DISCONNECT
    // ========================================================

    socket.on("disconnect", () => {

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
            room ? room.size : 0;


        socket.to(
            socket.roomId
        ).emit(
            "user-left",
            {
                username:
                    socket.username || "Unknown User",

                userCount:
                    userCount
            }
        );

    });

});


/* =========================================
   START SERVER
========================================= */

const PORT = 3000;

server.listen(PORT, () => {

    console.log(
        `LiveCanvas server running at http://localhost:${PORT}`
    );

});