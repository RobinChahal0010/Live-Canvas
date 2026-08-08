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


/* =========================================
   SOCKET CONNECTION
========================================= */

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);


    /* JOIN ROOM */

    socket.on("join-room", (roomId, username) => {

        socket.join(roomId);

        socket.data.roomId = roomId;
        socket.data.username = username || "Guest";


        console.log(
            `${socket.data.username} joined room ${roomId}`
        );


        /* Get users currently inside room */

        const room = io.sockets.adapter.rooms.get(roomId);

        const userCount = room ? room.size : 1;


        /* Tell current user */

        socket.emit("room-joined", {

            roomId: roomId,
            userCount: userCount

        });


        /* Tell everyone else */

        socket.to(roomId).emit("user-joined", {

            username: socket.data.username,
            userCount: userCount

        });

    });


    /* DISCONNECT */

    socket.on("disconnect", () => {

        const roomId = socket.data.roomId;

        if (!roomId) return;


        const room = io.sockets.adapter.rooms.get(roomId);

        const userCount = room ? room.size : 0;


        socket.to(roomId).emit("user-left", {

            username: socket.data.username,
            userCount: userCount

        });


        console.log(
            `${socket.data.username} left room ${roomId}`
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