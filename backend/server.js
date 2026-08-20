// ============================================================
// LIVE CANVAS - SERVER
// Express + Socket.IO
// Real-Time Collaborative Board Server
// ============================================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");


// ============================================================
// APP SETUP
// ============================================================

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ============================================================
// BOARD STATES
// ============================================================

const boardStates = new Map();

function getBoardState(boardId) {
    if (!boardStates.has(boardId)) {
        boardStates.set(boardId, {
            canvasStyle: "blank"
        });
    }

    return boardStates.get(boardId);
}


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json({
    limit: "10mb"
}));


// ============================================================
// SERVE FRONTEND
// ============================================================

const rootDirectory =
    path.join(__dirname, "..");


// Home page
app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            rootDirectory,
            "home.html"
        )
    );

});


// Static frontend files
app.use(
    express.static(rootDirectory)
);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        service: "LiveCanvas",
        boards: boards.size,
        time: new Date().toISOString()
    });

});


// ============================================================
// BOARD STORAGE
// ============================================================
//
// Every board has its own state.
//
// Example:
//
// boards
//   └── DUKYTOHY
//         ├── users
//         ├── canvasStyle
//         ├── pages
//         ├── currentPage
//         ├── zoom
//         ├── title
//         ├── drawingOperations
//         └── objects
//
// This is server memory for now.
// Later this can easily be moved to MongoDB/PostgreSQL/Redis.
//

const boards = new Map();


// ============================================================
// CREATE DEFAULT BOARD STATE
// ============================================================

function createDefaultBoard(boardId) {

    return {

        boardId,

        title: "",

        canvasStyle: "blank",

        currentPage: 0,

        zoom: 100,

        pages: [
            {
                id: "page-1",
                height: 700,
                canvasData: null,

                // Drawing operations for this page
                drawings: [],

                // Text, shapes, images, sticky notes, tables
                objects: []
            }
        ],

        updatedAt: Date.now()

    };

}


// ============================================================
// GET OR CREATE BOARD
// ============================================================

function getBoard(boardId) {

    if (!boards.has(boardId)) {

        boards.set(
            boardId,
            createDefaultBoard(boardId)
        );

        console.log(
            `Created new board: ${boardId}`
        );

    }

    return boards.get(boardId);

}


// ============================================================
// VALIDATE BOARD ID
// ============================================================

function cleanBoardId(boardId) {

    if (
        typeof boardId !== "string"
    ) {
        return null;
    }

    const cleaned =
        boardId.trim();

    if (!cleaned) {
        return null;
    }

    // Prevent absurdly large IDs
    if (cleaned.length > 100) {
        return null;
    }

    return cleaned;

}


// ============================================================
// VALIDATE USERNAME
// ============================================================

function cleanUsername(username) {

    if (
        typeof username !== "string"
    ) {
        return null;
    }

    const cleaned =
        username.trim();

    if (!cleaned) {
        return null;
    }

    if (cleaned.length > 100) {
        return cleaned.substring(0, 100);
    }

    return cleaned;

}


// ============================================================
// GET USERS IN BOARD
// ============================================================

function getBoardUsers(boardId) {

    const room =
        io.sockets.adapter.rooms.get(
            boardId
        );

    if (!room) {
        return [];
    }

    const users = [];

    for (const socketId of room) {

        const userSocket =
            io.sockets.sockets.get(
                socketId
            );

        if (
            userSocket &&
            userSocket.username
        ) {

            users.push(
                userSocket.username
            );

        }

    }

    return [...new Set(users)];

}


// ============================================================
// GET USER COUNT
// ============================================================

function getUserCount(boardId) {

    return getBoardUsers(boardId).length;

}


// ============================================================
// SANITIZE DRAW OPERATION
// ============================================================

function sanitizeDrawing(data) {

    if (!data || typeof data !== "object") {
        return null;
    }

    const x1 = Number(data.x1);
    const y1 = Number(data.y1);
    const x2 = Number(data.x2);
    const y2 = Number(data.y2);

    if (
        !Number.isFinite(x1) ||
        !Number.isFinite(y1) ||
        !Number.isFinite(x2) ||
        !Number.isFinite(y2)
    ) {
        return null;
    }

    const allowedTools = [
        "pen",
        "eraser",
        "highlighter",
        "lightPen"
    ];

    const tool =
        allowedTools.includes(data.tool)
            ? data.tool
            : "pen";

    const lineWidth =
        Number(data.lineWidth);

    return {

        x1,
        y1,
        x2,
        y2,

        color:
            typeof data.color === "string"
                ? data.color
                : "#172033",

        lineWidth:
            Number.isFinite(lineWidth)
                ? Math.max(
                    1,
                    Math.min(
                        lineWidth,
                        100
                    )
                )
                : 4,

        tool

    };

}


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
        (boardId, username) => {

            boardId =
                cleanBoardId(boardId);

            username =
                cleanUsername(username);


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!boardId) {

                console.log(
                    "Join rejected: invalid board"
                );

                socket.emit(
                    "join-error",
                    {
                        message:
                            "Invalid board ID."
                    }
                );

                return;
            }


            if (!username) {

                console.log(
                    "Join rejected: username missing"
                );

                socket.emit(
                    "join-error",
                    {
                        message:
                            "Username is required."
                    }
                );

                return;
            }


            // ------------------------------------------------
            // LEAVE PREVIOUS BOARD IF NECESSARY
            // ------------------------------------------------

            if (
                socket.boardId &&
                socket.boardId !== boardId
            ) {

                socket.leave(
                    socket.boardId
                );

            }


            // ------------------------------------------------
            // STORE SOCKET INFORMATION
            // ------------------------------------------------

            socket.boardId =
                boardId;

            socket.username =
                username;


            // ------------------------------------------------
            // GET / CREATE BOARD
            // ------------------------------------------------

            const board =
                getBoard(boardId);


            // ------------------------------------------------
            // JOIN SOCKET.IO ROOM
            // ------------------------------------------------

            socket.join(boardId);


            console.log(
                `${username} joined board ${boardId}`
            );


            // ------------------------------------------------
            // GET CURRENT USERS
            // ------------------------------------------------

            const users =
                getBoardUsers(boardId);

            const userCount =
                users.length;


            // ------------------------------------------------
            // SEND BOARD INFORMATION
            // ------------------------------------------------

            socket.emit(
                "room-joined",
                {

                    boardId: boardId,
    username: username,
    userCount: userCount,
    users: users,

    // IMPORTANT
    canvasStyle: board.canvasStyle,

                    // Current board state
                    boardState: board

                }
            );


            // ------------------------------------------------
            // SEND BOARD STATE SEPARATELY
            // ------------------------------------------------
            //
            // This gives the frontend a clean event to listen
            // to when we update script.js.
            //

            socket.emit(
                "board-state",
                board
            );


            // ------------------------------------------------
            // INFORM OTHER USERS
            // ------------------------------------------------

            socket.to(
                boardId
            ).emit(
                "user-joined",
                {

                    username,

                    userCount,

                    users

                }
            );


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

        }
    );


    // ========================================================
    // CANVAS DRAW
    // ========================================================
    //
    // Existing frontend already sends:
    //
    // socket.emit("canvas-draw", data)
    //
    // So this remains compatible.
    //

    // ============================================================
// CANVAS STYLE SYNC
// ============================================================

socket.on("canvas-style-change", (data) => {

    if (!socket.boardId || !data) {
        return;
    }

    const style =
        typeof data.style === "string"
            ? data.style.trim().toLowerCase()
            : "blank";

    const validStyles = [
        "blank",
        "grid",
        "dots",
        "lines"
    ];

    if (!validStyles.includes(style)) {
        return;
    }

    const boardState = getBoardState(socket.boardId);

    boardState.canvasStyle = style;

    console.log(
        `Canvas style changed: ${socket.boardId} -> ${style}`
    );

    // Send to EVERY OTHER USER in this board
    socket.to(socket.boardId).emit(
        "canvas-style-change",
        {
            style: style
        }
    );
});

    socket.on(
        "canvas-draw",
        (data) => {

            if (
                !socket.boardId ||
                !data
            ) {
                return;
            }


            const drawing =
                sanitizeDrawing(data);

            if (!drawing) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            // ------------------------------------------------
            // CURRENT PAGE
            // ------------------------------------------------

            const pageIndex =
                Number.isInteger(
                    data.pageIndex
                )
                    ? data.pageIndex
                    : board.currentPage;


            // ------------------------------------------------
            // MAKE SURE PAGE EXISTS
            // ------------------------------------------------

            while (
                board.pages.length <= pageIndex
            ) {

                board.pages.push({

                    id:
                        `page-${board.pages.length + 1}`,

                    height: 700,

                    drawings: [],

                    objects: []

                });

            }


            // ------------------------------------------------
            // STORE DRAWING
            // ------------------------------------------------

            board.pages[
                pageIndex
            ].drawings.push(
                drawing
            );


            // ------------------------------------------------
            // UPDATE BOARD
            // ------------------------------------------------

            board.updatedAt =
                Date.now();


            // ------------------------------------------------
            // BROADCAST TO OTHER USERS
            // ------------------------------------------------

            socket.to(
                socket.boardId
            ).emit(
                "canvas-draw",
                {

                    ...drawing,

                    pageIndex

                }
            );

        }
    );


    // ========================================================
    // CANVAS STYLE
    // ========================================================
    //
    // Frontend will use this when the user changes:
    //
    // blank
    // grid
    // dots
    // lines
    //

    socket.on(
        "canvas-style",
        (data) => {

            if (!socket.boardId) {
                return;
            }


            let style = data;

            if (
                data &&
                typeof data === "object"
            ) {

                style =
                    data.style;

            }


            if (
                typeof style !== "string"
            ) {

                return;

            }


            const allowedStyles = [
                "blank",
                "grid",
                "dots",
                "lines"
            ];


            if (
                !allowedStyles.includes(style)
            ) {

                return;

            }


            const board =
                getBoard(
                    socket.boardId
                );


            board.canvasStyle =
                style;

            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "canvas-style",
                {

                    style

                }
            );


            console.log(
                `Canvas style changed: ${socket.boardId} -> ${style}`
            );

        }
    );


    // ========================================================
    // SAVE BOARD STATE (FROM FRONTEND SCHEDULE / AUTO-SAVE)
    // ========================================================

    socket.on(
        "save-board-state",
        (incomingState) => {

            if (!socket.boardId || !incomingState || typeof incomingState !== "object") {
                return;
            }

            const board = getBoard(socket.boardId);

            if (typeof incomingState.title === "string" && incomingState.title.trim()) {
                board.title = incomingState.title.trim();
            }

            if (typeof incomingState.canvasStyle === "string") {
                const allowedStyles = ["blank", "grid", "dots", "lines"];
                if (allowedStyles.includes(incomingState.canvasStyle)) {
                    board.canvasStyle = incomingState.canvasStyle;
                }
            }

            if (typeof incomingState.zoom === "number") {
                board.zoom = Math.max(50, Math.min(200, incomingState.zoom));
            }

            if (Number.isInteger(incomingState.currentPage)) {
                board.currentPage = Math.max(0, incomingState.currentPage);
            }

            if (Array.isArray(incomingState.pages)) {
                board.pages = sanitizePages(incomingState.pages);
            }

            board.updatedAt = Date.now();

            socket.to(socket.boardId).emit("board-state", board);
        }
    );


    // ========================================================
    // DOCUMENT STATE
    // ========================================================
    //
    // Used for:
    //
    // title
    // zoom
    // current page
    // pages
    // canvas style
    //
    // This is the main synchronization event.
    //

    socket.on(
        "document-state",
        (incomingState) => {

            if (!socket.boardId) {
                return;
            }

            if (
                !incomingState ||
                typeof incomingState !== "object"
            ) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            // ------------------------------------------------
            // TITLE
            // ------------------------------------------------

            if (
                typeof incomingState.title ===
                "string"
            ) {

                board.title =
                    incomingState.title;

            }


            // ------------------------------------------------
            // CANVAS STYLE
            // ------------------------------------------------

            if (
                typeof incomingState.canvasStyle ===
                "string"
            ) {

                const allowedStyles = [
                    "blank",
                    "grid",
                    "dots",
                    "lines"
                ];

                if (
                    allowedStyles.includes(
                        incomingState.canvasStyle
                    )
                ) {

                    board.canvasStyle =
                        incomingState.canvasStyle;

                }

            }


            // ------------------------------------------------
            // ZOOM
            // ------------------------------------------------

            if (
                typeof incomingState.zoom ===
                "number"
            ) {

                board.zoom =
                    Math.max(
                        50,
                        Math.min(
                            200,
                            incomingState.zoom
                        )
                    );

            }


            // ------------------------------------------------
            // CURRENT PAGE
            // ------------------------------------------------

            if (
                Number.isInteger(
                    incomingState.currentPage
                )
            ) {

                board.currentPage =
                    Math.max(
                        0,
                        incomingState.currentPage
                    );

            }


            // ------------------------------------------------
            // PAGES
            // ------------------------------------------------

            if (
                Array.isArray(
                    incomingState.pages
                )
            ) {

                board.pages =
                    sanitizePages(
                        incomingState.pages
                    );

            }


            // ------------------------------------------------
            // UPDATE TIME
            // ------------------------------------------------

            board.updatedAt =
                Date.now();


            // ------------------------------------------------
            // BROADCAST
            // ------------------------------------------------

            socket.to(
                socket.boardId
            ).emit(
                "document-state",
                board
            );

        }
    );


    // ========================================================
    // FULL BOARD STATE
    // ========================================================
    //
    // Useful when the frontend wants to explicitly push
    // the complete board.
    //

    socket.on(
        "board-state-update",
        (incomingState) => {

            if (!socket.boardId) {
                return;
            }

            if (
                !incomingState ||
                typeof incomingState !== "object"
            ) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            const sanitized =
                sanitizeBoardState(
                    incomingState,
                    board
                );


            boards.set(
                socket.boardId,
                sanitized
            );


            socket.to(
                socket.boardId
            ).emit(
                "board-state",
                sanitized
            );

        }
    );


    // ========================================================
    // OBJECT ADD
    // ========================================================
    //
    // Text
    // Shape
    // Image
    // Sticky
    // Table
    //

    socket.on(
        "object-add",
        (data) => {

            if (!socket.boardId) {
                return;
            }

            if (
                !data ||
                typeof data !== "object"
            ) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            const pageIndex =
                Number.isInteger(
                    data.pageIndex
                )
                    ? data.pageIndex
                    : board.currentPage;


            while (
                board.pages.length <= pageIndex
            ) {

                board.pages.push({

                    id:
                        `page-${board.pages.length + 1}`,

                    height: 700,

                    drawings: [],

                    objects: []

                });

            }


            const object =
                sanitizeObject(
                    data.object
                );


            if (!object) {
                return;
            }


            board.pages[
                pageIndex
            ].objects.push(
                object
            );


            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "object-add",
                {

                    object,

                    pageIndex

                }
            );

        }
    );


    // ========================================================
    // OBJECT UPDATE
    // ========================================================

    socket.on(
        "object-update",
        (data) => {

            if (!socket.boardId) {
                return;
            }

            if (
                !data ||
                typeof data !== "object"
            ) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            const pageIndex =
                Number.isInteger(
                    data.pageIndex
                )
                    ? data.pageIndex
                    : board.currentPage;


            const objectId =
                data.objectId;


            if (
                !objectId ||
                !board.pages[pageIndex]
            ) {

                return;

            }


            const objectIndex =
                board.pages[
                    pageIndex
                ].objects.findIndex(
                    object =>
                        object.id === objectId
                );


            if (
                objectIndex === -1
            ) {

                return;

            }


            const updatedObject =
                sanitizeObject(
                    data.object
                );


            if (!updatedObject) {
                return;
            }


            board.pages[
                pageIndex
            ].objects[
                objectIndex
            ] =
                updatedObject;


            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "object-update",
                {

                    objectId,

                    object:
                        updatedObject,

                    pageIndex

                }
            );

        }
    );


    // ========================================================
    // OBJECT DELETE
    // ========================================================

    socket.on(
        "object-delete",
        (data) => {

            if (!socket.boardId) {
                return;
            }

            if (
                !data ||
                typeof data !== "object"
            ) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            const pageIndex =
                Number.isInteger(
                    data.pageIndex
                )
                    ? data.pageIndex
                    : board.currentPage;


            if (
                !board.pages[pageIndex]
            ) {

                return;

            }


            board.pages[
                pageIndex
            ].objects =
                board.pages[
                    pageIndex
                ].objects.filter(
                    object =>
                        object.id !==
                        data.objectId
                );


            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "object-delete",
                {

                    objectId:
                        data.objectId,

                    pageIndex

                }
            );

        }
    );


    // ========================================================
    // PAGE CHANGE
    // ========================================================

    socket.on(
        "page-change",
        (data) => {

            if (!socket.boardId) {
                return;
            }


            const pageIndex =
                Number.isInteger(
                    data?.pageIndex
                )
                    ? data.pageIndex
                    : 0;


            const board =
                getBoard(
                    socket.boardId
                );


            if (
                pageIndex < 0 ||
                pageIndex >= board.pages.length
            ) {

                return;

            }


            board.currentPage =
                pageIndex;

            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "page-change",
                {

                    pageIndex

                }
            );

        }
    );


    // ========================================================
    // PAGE ADD
    // ========================================================

    socket.on(
        "page-add",
        (data) => {

            if (!socket.boardId) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            const page =
                {

                    id:
                        `page-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`,

                    height:
                        Number(data?.height) || 700,

                    drawings: [],

                    objects: []

                };


            board.pages.push(
                page
            );


            board.currentPage =
                board.pages.length - 1;


            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "page-add",
                {

                    page,

                    pageIndex:
                        board.pages.length - 1

                }
            );

        }
    );


    // ========================================================
    // PAGE RESIZE / EXTEND
    // ========================================================

    socket.on(
        "page-resize",
        (data) => {

            if (!socket.boardId) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            const pageIndex =
                Number.isInteger(
                    data?.pageIndex
                )
                    ? data.pageIndex
                    : board.currentPage;


            const height =
                Number(data?.height);


            if (
                !Number.isFinite(height) ||
                height < 300 ||
                height > 100000
            ) {

                return;

            }


            if (
                !board.pages[pageIndex]
            ) {

                return;

            }


            board.pages[
                pageIndex
            ].height =
                height;


            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "page-resize",
                {

                    pageIndex,

                    height

                }
            );

        }
    );


    // ========================================================
    // CLEAR CANVAS
    // ========================================================

    socket.on(
        "canvas-clear",
        (data) => {

            if (!socket.boardId) {
                return;
            }


            const board =
                getBoard(
                    socket.boardId
                );


            const pageIndex =
                Number.isInteger(
                    data?.pageIndex
                )
                    ? data.pageIndex
                    : board.currentPage;


            if (
                !board.pages[pageIndex]
            ) {

                return;

            }


            board.pages[
                pageIndex
            ].drawings = [];


            board.updatedAt =
                Date.now();


            socket.to(
                socket.boardId
            ).emit(
                "canvas-clear",
                {

                    pageIndex

                }
            );

        }
    );


    // ========================================================
    // CURSOR MOVEMENT
    // ========================================================

    socket.on(
        "cursor-move",
        (data) => {

            if (!socket.boardId) {
                return;
            }

            if (
                !data ||
                typeof data !== "object"
            ) {
                return;
            }


            const x =
                Number(data.x);

            const y =
                Number(data.y);


            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y)
            ) {

                return;

            }


            socket.to(
                socket.boardId
            ).emit(
                "cursor-move",
                {

                    x,

                    y,

                    visible:
                        data.visible !== false,

                    username:
                        socket.username,

                    socketId:
                        socket.id

                }
            );

        }
    );


    // ========================================================
    // DISCONNECTING
    // ========================================================
    //
    // IMPORTANT:
    // Use "disconnecting", not "disconnect", because the
    // socket is still inside the room at this point.
    //

    socket.on(
        "disconnecting",
        () => {

            const boardId =
                socket.boardId;

            const username =
                socket.username ||
                "Unknown User";


            if (!boardId) {
                return;
            }


            // Get remaining users BEFORE socket leaves
            const room =
                io.sockets.adapter.rooms.get(
                    boardId
                );


            const remainingUsers = [];


            if (room) {

                for (const socketId of room) {

                    if (
                        socketId === socket.id
                    ) {
                        continue;
                    }


                    const userSocket =
                        io.sockets.sockets.get(
                            socketId
                        );


                    if (
                        userSocket?.username
                    ) {

                        remainingUsers.push(
                            userSocket.username
                        );

                    }

                }

            }


            console.log(
                `${username} left board ${boardId}`
            );


            console.log(
                "Remaining users:",
                remainingUsers
            );


            socket.to(
                boardId
            ).emit(
                "user-left",
                {

                    username,

                    userCount:
                        remainingUsers.length,

                    users:
                        remainingUsers

                }
            );

        }
    );


    // ========================================================
    // DISCONNECT
    // ========================================================

    socket.on(
        "disconnect",
        (reason) => {

            console.log(
                `Socket disconnected: ${socket.id}`
            );

            console.log(
                "Reason:",
                reason
            );

        }
    );

});


// ============================================================
// SANITIZE PAGE ARRAY
// ============================================================

function sanitizePages(pages) {

    if (!Array.isArray(pages)) {

        return [
            {
                id: "page-1",
                height: 700,
                drawings: [],
                objects: []
            }
        ];

    }


    return pages.map(
        (page, index) => {

            const safePage =
                page &&
                typeof page === "object"
                    ? page
                    : {};


            const height =
                Number(safePage.height);


            return {

                id:
                    typeof safePage.id === "string"
                        ? safePage.id
                        : `page-${index + 1}`,

                height:
                    Number.isFinite(height)
                        ? Math.max(
                            300,
                            Math.min(
                                height,
                                100000
                            )
                        )
                        : 700,

                canvasData:
                    typeof safePage.canvasData === "string"
                        ? safePage.canvasData
                        : null,

                drawings:
                    Array.isArray(
                        safePage.drawings
                    )
                        ? safePage.drawings
                            .map(
                                sanitizeDrawing
                            )
                            .filter(Boolean)
                        : [],

                objects:
                    Array.isArray(
                        safePage.objects
                    )
                        ? safePage.objects
                            .map(
                                sanitizeObject
                            )
                            .filter(Boolean)
                        : []

            };

        }
    );

}


// ============================================================
// SANITIZE OBJECT
// ============================================================

function sanitizeObject(object) {

    if (
        !object ||
        typeof object !== "object"
    ) {

        return null;

    }


    const clean = {
        ...object
    };


    // --------------------------------------------------------
    // ID
    // --------------------------------------------------------

    if (
        typeof clean.id !== "string" ||
        !clean.id.trim()
    ) {

        clean.id =
            `object-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 9)}`;

    }


    // --------------------------------------------------------
    // OBJECT TYPE
    // --------------------------------------------------------

    if (
        typeof clean.type !== "string"
    ) {

        clean.type = "unknown";

    }


    // --------------------------------------------------------
    // POSITION
    // --------------------------------------------------------

    if (
        clean.x !== undefined
    ) {

        const x =
            Number(clean.x);

        clean.x =
            Number.isFinite(x)
                ? x
                : 0;

    }


    if (
        clean.y !== undefined
    ) {

        const y =
            Number(clean.y);

        clean.y =
            Number.isFinite(y)
                ? y
                : 0;

    }


    return clean;

}


// ============================================================
// SANITIZE COMPLETE BOARD
// ============================================================

function sanitizeBoardState(
    incoming,
    existingBoard
) {

    const board =
        createDefaultBoard(
            existingBoard.boardId
        );


    // --------------------------------------------------------
    // TITLE
    // --------------------------------------------------------

    if (
        typeof incoming.title === "string"
    ) {

        board.title =
            incoming.title;

    }


    // --------------------------------------------------------
    // CANVAS STYLE
    // --------------------------------------------------------

    const validStyles = [
        "blank",
        "grid",
        "dots",
        "lines"
    ];


    if (
        validStyles.includes(
            incoming.canvasStyle
        )
    ) {

        board.canvasStyle =
            incoming.canvasStyle;

    }


    // --------------------------------------------------------
    // ZOOM
    // --------------------------------------------------------

    if (
        typeof incoming.zoom === "number"
    ) {

        board.zoom =
            Math.max(
                50,
                Math.min(
                    200,
                    incoming.zoom
                )
            );

    }


    // --------------------------------------------------------
    // CURRENT PAGE
    // --------------------------------------------------------

    if (
        Number.isInteger(
            incoming.currentPage
        )
    ) {

        board.currentPage =
            Math.max(
                0,
                incoming.currentPage
            );

    }


    // --------------------------------------------------------
    // PAGES
    // --------------------------------------------------------

    board.pages =
        sanitizePages(
            incoming.pages
        );


    if (
        board.currentPage >=
        board.pages.length
    ) {

        board.currentPage =
            board.pages.length - 1;

    }


    board.updatedAt =
        Date.now();


    return board;

}


// ============================================================
// START SERVER
// ============================================================

const PORT = 3000;


server.listen(
    PORT,
    () => {

        console.log(
            "============================================"
        );

        console.log(
            "        LIVE CANVAS SERVER"
        );

        console.log(
            "============================================"
        );

        console.log(
            `Server running at: http://localhost:${PORT}`
        );

        console.log(
            `Boards in memory: ${boards.size}`
        );

        console.log(
            "Socket.IO: READY"
        );

        console.log(
            "============================================"
        );

    }
);