// ============================================================
// LIVE CANVAS - ROOM + AUTH + CANVAS + TOOLS
// ============================================================


// ============================================================
// ROOM / SOCKET
// ============================================================

const urlParams =
    new URLSearchParams(window.location.search);

const roomId =
    urlParams.get("room");

let socket = null;

console.log("================================");
console.log("LIVE CANVAS");
console.log("Current URL:", window.location.href);
console.log("Current Room ID:", roomId);
console.log("================================");


// ============================================================
// AUTHENTICATION
// ============================================================

let loggedInUser = null;

try {

    loggedInUser =
        JSON.parse(
            localStorage.getItem("loggedInUser")
        );

} catch (error) {

    console.error(
        "Could not read loggedInUser:",
        error
    );

    loggedInUser = null;
}


const welcomeUser =
    document.getElementById("welcomeUser");

const loginHeaderBtn =
    document.getElementById("loginHeaderBtn");

const signupHeaderBtn =
    document.getElementById("signupHeaderBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// ============================================================
// HEADER AUTH UI
// ============================================================

function updateAuthUI() {

    if (loggedInUser) {

        if (welcomeUser) {

            welcomeUser.textContent =
                `Hi, ${loggedInUser.name} 👋`;
        }

        if (loginHeaderBtn) {

            loginHeaderBtn.style.display =
                "none";
        }

        if (signupHeaderBtn) {

            signupHeaderBtn.style.display =
                "none";
        }

        if (logoutBtn) {

            logoutBtn.style.display =
                "block";
        }

    } else {

        if (welcomeUser) {

            welcomeUser.textContent =
                "";
        }

        if (loginHeaderBtn) {

            loginHeaderBtn.style.display =
                "block";
        }

        if (signupHeaderBtn) {

            signupHeaderBtn.style.display =
                "block";
        }

        if (logoutBtn) {

            logoutBtn.style.display =
                "none";
        }
    }
}

updateAuthUI();

console.log(
    "Logged In User:",
    loggedInUser
);


// ============================================================
// CURRENT USER NAME
// ============================================================

// IMPORTANT:
// No random username.
// Name comes directly from signup.

let currentUsername =
    loggedInUser?.name || "User";

console.log(
    "Current User Name:",
    currentUsername
);


// ============================================================
// ROOM AUTH CHECK
// ============================================================

if (roomId && !loggedInUser) {

    console.log(
        "Room detected but user is NOT logged in."
    );

    const redirectUrl =
        window.location.pathname +
        window.location.search;

    window.location.href =
        "login.html?redirect=" +
        encodeURIComponent(redirectUrl);
}


// ============================================================
// CONNECT TO SOCKET.IO ROOM
// ============================================================

if (
    roomId &&
    loggedInUser &&
    typeof io === "function"
) {

    console.log(
        "Connecting to room:",
        roomId
    );

    socket = io();


    // ========================================================
    // SOCKET CONNECT
    // ========================================================

    socket.on(
        "connect",
        () => {

            console.log(
                "Connected to server:",
                socket.id
            );


            // Send REAL signup name
            // No random username

            socket.emit(
                "join-room",
                roomId,
                loggedInUser.name
            );

        }
    );


    // ========================================================
    // ROOM JOINED
    // ========================================================

    socket.on(
        "room-joined",
        data => {

            console.log(
                "Successfully joined room:",
                data.roomId
            );

            console.log(
                "User:",
                data.username
            );

            console.log(
                "Users in room:",
                data.userCount
            );

        }
    );


    // ========================================================
    // USER JOINED
    // ========================================================

    socket.on(
        "user-joined",
        data => {

            console.log(
                `${data.username} joined the room`
            );

            console.log(
                "Users:",
                data.userCount
            );

        }
    );


    // ========================================================
    // USER LEFT
    // ========================================================

    socket.on(
        "user-left",
        data => {

            console.log(
                `${data.username} left the room`
            );

            console.log(
                "Users:",
                data.userCount
            );

        }
    );


    // ========================================================
    // CONNECTION ERROR
    // ========================================================

    socket.on(
        "connect_error",
        error => {

            console.error(
                "Socket connection failed:",
                error
            );

        }
    );
}



// ============================================================
// HEADER BUTTONS
// ============================================================

if (loginHeaderBtn) {

    loginHeaderBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "login.html";

        }
    );
}


if (signupHeaderBtn) {

    signupHeaderBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "signup.html";

        }
    );
}


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "loggedInUser"
            );

            // Old username storage completely removed
            sessionStorage.removeItem(
                "roomUsername"
            );

            window.location.href =
                "login.html";

        }
    );
}
// ============================================================
// SHARE ROOM
// ============================================================

const shareBtn =
    document.getElementById("shareBtn");

if (shareBtn) {

    shareBtn.addEventListener(
        "click",
        async () => {

            if (!roomId) {

                alert(
                    "You are currently in Solo mode."
                );

                return;
            }

            const shareText =
                `Join my LiveCanvas room!\n\nRoom Code: ${roomId}`;

            try {

                if (navigator.share) {

                    await navigator.share({

                        title: "LiveCanvas Room",

                        text: shareText

                    });

                } else {

                    await navigator.clipboard.writeText(
                        roomId
                    );

                    alert(
                        `Room code copied!\n\n${roomId}`
                    );
                }

            } catch (error) {

                console.log(
                    "Share cancelled."
                );

            }

        }
    );
}


// ============================================================
// CANVAS ELEMENTS
// ============================================================

const canvas =
    document.getElementById(
        "drawingBoard"
    );

const ctx =
    canvas
        ? canvas.getContext("2d")
        : null;

const notebookPage =
    document.getElementById(
        "notebookPage"
    );

const paperBackground =
    document.querySelector(
        ".paper-background"
    );

const objectLayer =
    document.getElementById(
        "objectLayer"
    );


// ============================================================
// TOOL BUTTONS
// ============================================================

const drawBtn =
    document.getElementById(
        "drawBtn"
    );

const eraserBtn =
    document.getElementById(
        "eraserBtn"
    );

const highlighterBtn =
    document.getElementById(
        "highlighterBtn"
    );

const lightPenBtn =
    document.getElementById(
        "lightPenBtn"
    );

const selectTool =
    document.getElementById(
        "selectTool"
    );

const shapeBtn =
    document.getElementById(
        "shapeBtn"
    );

const textBtn =
    document.getElementById(
        "textBtn"
    );

const imageBtn =
    document.getElementById(
        "imageBtn"
    );

const stickyBtn =
    document.getElementById(
        "stickyBtn"
    );

const tableBtn =
    document.getElementById(
        "tableBtn"
    );


// ============================================================
// CANVAS CONTROLS
// ============================================================

const colorPicker =
    document.getElementById(
        "colorPicker"
    );

const brushSize =
    document.getElementById(
        "brushSize"
    );

const undoBtn =
    document.getElementById(
        "undoBtn"
    );

const redoBtn =
    document.getElementById(
        "redoBtn"
    );

const clearBtn =
    document.getElementById(
        "clearBtn"
    );


// ============================================================
// PAGE CONTROLS
// ============================================================

const addPageBtn =
    document.getElementById(
        "addPageBtn"
    );

const previousPage =
    document.getElementById(
        "previousPage"
    );

const nextPage =
    document.getElementById(
        "nextPage"
    );

const extendPageBtn =
    document.getElementById(
        "extendPageBtn"
    );

const pageNumber =
    document.getElementById(
        "pageNumber"
    );


// ============================================================
// ZOOM CONTROLS
// ============================================================

const zoomIn =
    document.getElementById(
        "zoomIn"
    );

const zoomOut =
    document.getElementById(
        "zoomOut"
    );

const zoomValue =
    document.getElementById(
        "zoomValue"
    );


// ============================================================
// SAFETY CHECK
// ============================================================

if (
    !canvas ||
    !ctx ||
    !notebookPage
) {

    console.error(
        "Canvas elements not found."
    );

} else {


// ============================================================
// STATE
// ============================================================

let currentTool =
    "pen";

let isDrawing =
    false;

let lastX =
    0;

let lastY =
    0;

let currentStroke =
    [];


// ============================================================
// HISTORY
// ============================================================

let undoStack =
    [];

let redoStack =
    [];

const MAX_HISTORY =
    50;


// ============================================================
// PAGE SYSTEM
// ============================================================

let pages = [

    {
        canvasData: null,
        height: 700
    }

];

let currentPage =
    0;

const VALID_CANVAS_STYLES = ["blank", "grid", "dots", "lines"];

let currentCanvasStyle = "lines";

function normalizeCanvasStyle(style) {
    const safeStyle = typeof style === "string" ? style.trim().toLowerCase() : "lines";

    if (safeStyle === "plain") {
        return "blank";
    }

    return VALID_CANVAS_STYLES.includes(safeStyle) ? safeStyle : "lines";
}

function applyCanvasStyle(style) {
    currentCanvasStyle = normalizeCanvasStyle(style);

    if (notebookPage) {
        notebookPage.setAttribute("data-canvas-style", currentCanvasStyle);
    }

    if (!paperBackground) return;

    const styleMap = {
        blank: {
            backgroundColor: '#fff',
            backgroundImage: 'none',
            backgroundSize: 'auto'
        },
        grid: {
            backgroundColor: '#fffdf5',
            backgroundImage: 'linear-gradient(rgba(120, 155, 190, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 155, 190, 0.16) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
        },
        dots: {
            backgroundColor: '#fffdf5',
            backgroundImage: 'radial-gradient(circle, rgba(120, 155, 190, 0.35) 1.25px, transparent 1.35px)',
            backgroundSize: '22px 22px'
        },
        lines: {
            backgroundColor: '#fffdf5',
            backgroundImage: 'repeating-linear-gradient(to bottom, rgba(120, 155, 190, 0.18) 0, rgba(120, 155, 190, 0.18) 1px, transparent 1px, transparent 28px)',
            backgroundSize: '100% 28px'
        }
    };

    const selectedStyle = styleMap[currentCanvasStyle] || styleMap.lines;

    paperBackground.style.backgroundColor = selectedStyle.backgroundColor;
    paperBackground.style.backgroundImage = selectedStyle.backgroundImage;
    paperBackground.style.backgroundSize = selectedStyle.backgroundSize;
    paperBackground.style.backgroundPosition = '0 0';
}

function getDocumentKey() {
    const boardId = sessionStorage.getItem("currentBoardId");
    if (boardId) {
        return `liveCanvasDocument_${boardId}`;
    }

    return roomId ? `liveCanvasDocument_${roomId}` : "liveCanvasDocument_solo";
}

function restoreCanvasStyleFromBoard() {
    const pendingCanvasStyle = sessionStorage.getItem("currentCanvasStyle");

    if (pendingCanvasStyle) {
        applyCanvasStyle(pendingCanvasStyle);
        sessionStorage.removeItem("currentCanvasStyle");
        return;
    }

    const storedBoardId = sessionStorage.getItem("currentBoardId");

    if (storedBoardId) {
        try {
            const savedBoards = JSON.parse(localStorage.getItem("savedBoards") || "[]");
            const matchingBoard = savedBoards.find(board => board.id === storedBoardId);

            if (matchingBoard) {
                applyCanvasStyle(matchingBoard.canvasStyle || matchingBoard.template || "blank");
                return;
            }
        } catch (error) {
            console.warn("Could not restore saved board style:", error);
        }
    }

    const documentKey = getDocumentKey();

    try {
        const savedDocument = JSON.parse(localStorage.getItem(documentKey) || "null");

        if (savedDocument && savedDocument.canvasStyle) {
            applyCanvasStyle(savedDocument.canvasStyle);
            return;
        }
    } catch (error) {
        console.warn("Could not restore document canvas style:", error);
    }

    applyCanvasStyle("blank");
}


// ============================================================
// ZOOM
// ============================================================

let zoom =
    100;


// ============================================================
// CANVAS INITIALIZATION
// ============================================================

function setupCanvas() {

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.lineWidth =
        4;

    ctx.strokeStyle =
        "#172033";

    ctx.globalAlpha =
        1;

    ctx.globalCompositeOperation =
        "source-over";
}

setupCanvas();
restoreCanvasStyleFromBoard();


// ============================================================
// CANVAS RESIZE
// ============================================================

function resizeCanvasHeight(height) {

    if (
        !height ||
        height < 100
    ) {

        height = 700;
    }

    const oldData =
        canvas.toDataURL();

    canvas.width =
        notebookPage.clientWidth ||
        1000;

    canvas.height =
        height;

    canvas.style.width =
        "100%";

    canvas.style.height =
        "100%";

    setupCanvas();

    if (oldData) {

        const image =
            new Image();

        image.onload = () => {

            ctx.drawImage(
                image,
                0,
                0
            );

        };

        image.src =
            oldData;
    }
}


// ============================================================
// INITIAL CANVAS SIZE
// ============================================================

function initializeCanvas() {

    const height =
        notebookPage.offsetHeight ||
        700;

    canvas.width =
        notebookPage.clientWidth ||
        1000;

    canvas.height =
        height;

    canvas.style.width =
        "100%";

    canvas.style.height =
        "100%";

    setupCanvas();
}

initializeCanvas();


// ============================================================
// SAVE CANVAS STATE
// ============================================================

function saveState() {

    undoStack.push(
        canvas.toDataURL()
    );

    if (
        undoStack.length >
        MAX_HISTORY
    ) {

        undoStack.shift();
    }

    redoStack = [];
}


// ============================================================
// RESTORE CANVAS
// ============================================================

function restoreCanvas(data) {

    if (!data) {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        return;
    }

    const image =
        new Image();

    image.onload = () => {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.drawImage(
            image,
            0,
            0
        );

        setupCanvas();
    };

    image.src =
        data;
}


// ============================================================
// MOUSE / TOUCH POSITION
// ============================================================

function getMousePosition(e) {

    const rect =
        canvas.getBoundingClientRect();

    return {

        x:
            (e.clientX - rect.left) *
            (canvas.width / rect.width),

        y:
            (e.clientY - rect.top) *
            (canvas.height / rect.height)

    };
}


// ============================================================
// ACTIVE TOOL
// ============================================================

function setActiveTool(button) {

    document
        .querySelectorAll(
            ".canvas-toolbar .tool"
        )
        .forEach(
            btn => {

                btn.classList.remove(
                    "active-tool"
                );

            }
        );

    if (button) {

        button.classList.add(
            "active-tool"
        );
    }
}


// ============================================================
// TOOL HELPERS
// ============================================================

function activateTool(
    tool,
    button,
    cursor
) {

    currentTool =
        tool;

    setActiveTool(
        button
    );

    canvas.style.cursor =
        cursor ||
        "crosshair";
}


// ============================================================
// PEN
// ============================================================

if (drawBtn) {

    drawBtn.addEventListener(
        "click",
        () => {

            activateTool(
                "pen",
                drawBtn,
                "crosshair"
            );

        }
    );
}


// ============================================================
// HIGHLIGHTER
// ============================================================

if (highlighterBtn) {

    highlighterBtn.addEventListener(
        "click",
        () => {

            activateTool(
                "highlighter",
                highlighterBtn,
                "crosshair"
            );

        }
    );
}


// ============================================================
// LIGHT PEN
// ============================================================

if (lightPenBtn) {

    lightPenBtn.addEventListener(
        "click",
        () => {

            activateTool(
                "lightPen",
                lightPenBtn,
                "crosshair"
            );

        }
    );
}


// ============================================================
// ERASER
// ============================================================

if (eraserBtn) {

    eraserBtn.addEventListener(
        "click",
        () => {

            activateTool(
                "eraser",
                eraserBtn,
                "crosshair"
            );

        }
    );
}


// ============================================================
// SELECT
// ============================================================

if (selectTool) {

    selectTool.addEventListener(
        "click",
        () => {

            activateTool(
                "select",
                selectTool,
                "default"
            );

        }
    );
}


// ============================================================
// START DRAWING
// ============================================================

function startDrawing(e) {

    if (
        currentTool === "select" ||
        currentTool === "text" ||
        currentTool === "shape"
    ) {

        return;
    }

    isDrawing =
        true;

    const position =
        getMousePosition(e);

    lastX =
        position.x;

    lastY =
        position.y;

    currentStroke = [

        {
            x: lastX,
            y: lastY
        }

    ];

    saveState();

    ctx.beginPath();

    ctx.moveTo(
        lastX,
        lastY
    );
}


// ============================================================
// DRAW
// ============================================================

function draw(e) {

    if (!isDrawing) {
        return;
    }

    const position =
        getMousePosition(e);

    const currentX =
        position.x;

    const currentY =
        position.y;

    currentStroke.push({

        x: currentX,
        y: currentY

    });


    // --------------------------------------------------------
    // PEN
    // --------------------------------------------------------

    if (
        currentTool === "pen"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            1;

        ctx.strokeStyle =
            colorPicker?.value ||
            "#172033";

        ctx.lineWidth =
            Number(
                brushSize?.value ||
                4
            );
    }


    // --------------------------------------------------------
    // HIGHLIGHTER
    // --------------------------------------------------------

    else if (
        currentTool ===
        "highlighter"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            0.28;

        ctx.strokeStyle =
            colorPicker?.value ||
            "#ffff00";

        ctx.lineWidth =
            Number(
                brushSize?.value ||
                4
            ) * 3;
    }


    // --------------------------------------------------------
    // LIGHT PEN
    // --------------------------------------------------------

    else if (
        currentTool ===
        "lightPen"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            0.18;

        ctx.strokeStyle =
            colorPicker?.value ||
            "#ffffff";

        ctx.lineWidth =
            Number(
                brushSize?.value ||
                4
            ) * 1.5;
    }


    // --------------------------------------------------------
    // ERASER
    // --------------------------------------------------------

    else if (
        currentTool ===
        "eraser"
    ) {

        ctx.globalCompositeOperation =
            "destination-out";

        ctx.globalAlpha =
            1;

        ctx.lineWidth =
            Number(
                brushSize?.value ||
                4
            ) * 2;
    }


    // --------------------------------------------------------
    // DRAW
    // --------------------------------------------------------

    ctx.beginPath();

    ctx.moveTo(
        lastX,
        lastY
    );

    ctx.lineTo(
        currentX,
        currentY
    );

    ctx.stroke();


    // --------------------------------------------------------
    // SEND TO OTHER USERS
    // --------------------------------------------------------

    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "canvas-draw",
            {

                x1: lastX,
                y1: lastY,

                x2: currentX,
                y2: currentY,

                color:
                    colorPicker?.value ||
                    "#172033",

                lineWidth:
                    Number(
                        brushSize?.value ||
                        4
                    ),

                tool:
                    currentTool

            }
        );
    }


    lastX =
        currentX;

    lastY =
        currentY;
}


// ============================================================
// RECEIVE DRAWING
// ============================================================

if (socket) {

    socket.on(
        "canvas-draw",
        data => {

            if (!data) {
                return;
            }

            ctx.save();

            ctx.beginPath();

            ctx.moveTo(
                data.x1,
                data.y1
            );

            ctx.lineTo(
                data.x2,
                data.y2
            );


            if (
                data.tool ===
                "eraser"
            ) {

                ctx.globalCompositeOperation =
                    "destination-out";

                ctx.globalAlpha =
                    1;

                ctx.lineWidth =
                    (data.lineWidth || 4) * 2;

            }

            else if (
                data.tool ===
                "highlighter"
            ) {

                ctx.globalCompositeOperation =
                    "source-over";

                ctx.globalAlpha =
                    0.28;

                ctx.lineWidth =
                    (data.lineWidth || 4) * 3;

            }

            else if (
                data.tool ===
                "lightPen"
            ) {

                ctx.globalCompositeOperation =
                    "source-over";

                ctx.globalAlpha =
                    0.18;

                ctx.lineWidth =
                    (data.lineWidth || 4) * 1.5;

            }

            else {

                ctx.globalCompositeOperation =
                    "source-over";

                ctx.globalAlpha =
                    1;

                ctx.lineWidth =
                    data.lineWidth || 4;

            }


            ctx.strokeStyle =
                data.color ||
                "#172033";

            ctx.lineCap =
                "round";

            ctx.lineJoin =
                "round";

            ctx.stroke();

            ctx.restore();

        }
    );
}


// ============================================================
// STOP DRAWING
// ============================================================

function stopDrawing() {

    if (!isDrawing) {
        return;
    }

    isDrawing =
        false;

    ctx.closePath();

    if (
        currentTool ===
        "lightPen"
    ) {

        createLightPenStroke(
            currentStroke
        );
    }

    ctx.globalAlpha =
        1;

    ctx.globalCompositeOperation =
        "source-over";

    currentStroke =
        [];
}


// ============================================================
// LIGHT PEN
// ============================================================

function createLightPenStroke(
    points
) {

    if (
        !points ||
        points.length < 2
    ) {

        return;
    }

    const tempCanvas =
        document.createElement(
            "canvas"
        );

    tempCanvas.width =
        canvas.width;

    tempCanvas.height =
        canvas.height;

    tempCanvas.style.position =
        "absolute";

    tempCanvas.style.left =
        "0";

    tempCanvas.style.top =
        "0";

    tempCanvas.style.width =
        "100%";

    tempCanvas.style.height =
        "100%";

    tempCanvas.style.pointerEvents =
        "none";

    tempCanvas.style.zIndex =
        "20";


    const tempCtx =
        tempCanvas.getContext("2d");

    tempCtx.lineCap =
        "round";

    tempCtx.lineJoin =
        "round";

    tempCtx.strokeStyle =
        colorPicker?.value ||
        "#ffffff";

    tempCtx.lineWidth =
        Number(
            brushSize?.value ||
            4
        ) * 2;

    tempCtx.globalAlpha =
        0.48;

    tempCtx.beginPath();


    points.forEach(
        (point, index) => {

            if (index === 0) {

                tempCtx.moveTo(
                    point.x,
                    point.y
                );

            } else {

                tempCtx.lineTo(
                    point.x,
                    point.y
                );
            }

        }
    );


    tempCtx.stroke();

    notebookPage.appendChild(
        tempCanvas
    );


    // Stay visible for 2 seconds

    setTimeout(
        () => {

            tempCanvas.style.transition =
                "opacity 0.9s ease";

            tempCanvas.style.opacity =
                "0";


            setTimeout(
                () => {

                    tempCanvas.remove();

                },
                900
            );

        },
        2000
    );
}


// ============================================================
// MOUSE EVENTS
// ============================================================

canvas.addEventListener(
    "mousedown",
    startDrawing
);

canvas.addEventListener(
    "mousemove",
    draw
);

canvas.addEventListener(
    "mouseup",
    stopDrawing
);

canvas.addEventListener(
    "mouseleave",
    stopDrawing
);


// ============================================================
// TOUCH EVENTS
// ============================================================

canvas.addEventListener(
    "touchstart",
    e => {

        e.preventDefault();

        if (!e.touches[0]) {
            return;
        }

        startDrawing(
            e.touches[0]
        );

    },
    {
        passive: false
    }
);


canvas.addEventListener(
    "touchmove",
    e => {

        e.preventDefault();

        if (!e.touches[0]) {
            return;
        }

        draw(
            e.touches[0]
        );

    },
    {
        passive: false
    }
);


canvas.addEventListener(
    "touchend",
    e => {

        e.preventDefault();

        stopDrawing();

    },
    {
        passive: false
    }
);


// ============================================================
// COLOR
// ============================================================

if (colorPicker) {

    colorPicker.addEventListener(
        "input",
        () => {

            if (
                currentTool ===
                "eraser"
            ) {

                activateTool(
                    "pen",
                    drawBtn,
                    "crosshair"
                );
            }

        }
    );
}


// ============================================================
// UNDO
// ============================================================

if (undoBtn) {

    undoBtn.addEventListener(
        "click",
        () => {

            if (
                undoStack.length === 0
            ) {

                return;
            }

            redoStack.push(
                canvas.toDataURL()
            );

            const previous =
                undoStack.pop();

            restoreCanvas(
                previous
            );

            saveCurrentPage();

        }
    );
}


// ============================================================
// REDO
// ============================================================

if (redoBtn) {

    redoBtn.addEventListener(
        "click",
        () => {

            if (
                redoStack.length === 0
            ) {

                return;
            }

            undoStack.push(
                canvas.toDataURL()
            );

            const next =
                redoStack.pop();

            restoreCanvas(
                next
            );

            saveCurrentPage();

        }
    );
}


// ============================================================
// CLEAR
// ============================================================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        () => {

            saveState();

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            saveCurrentPage();

        }
    );
}


// ============================================================
// SAVE CURRENT PAGE
// ============================================================

function saveCurrentPage() {

    if (
        !pages[currentPage]
    ) {

        return;
    }

    pages[currentPage].canvasData =
        canvas.toDataURL();

    pages[currentPage].height =
        notebookPage.offsetHeight;
}


// ============================================================
// LOAD PAGE
// ============================================================

function loadPage(index) {

    if (
        index < 0 ||
        index >= pages.length
    ) {

        return;
    }

    saveCurrentPage();

    currentPage =
        index;

    const page =
        pages[currentPage];


    notebookPage.style.height =
        `${page.height}px`;

    canvas.width =
        notebookPage.clientWidth ||
        1000;

    canvas.height =
        page.height;

    canvas.style.width =
        "100%";

    canvas.style.height =
        "100%";

    setupCanvas();


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    if (page.canvasData) {

        const image =
            new Image();

        image.onload = () => {

            ctx.drawImage(
                image,
                0,
                0
            );

            setupCanvas();
        };

        image.src =
            page.canvasData;
    }


    updatePageNumber();
}


// ============================================================
// PAGE NUMBER
// ============================================================

function updatePageNumber() {

    if (pageNumber) {

        pageNumber.textContent =
            `${currentPage + 1} / ∞`;
    }
}


// ============================================================
// ADD PAGE
// ============================================================

if (addPageBtn) {

    addPageBtn.addEventListener(
        "click",
        () => {

            saveCurrentPage();

            pages.push({

                canvasData: null,
                height: 700

            });

            currentPage =
                pages.length - 1;

            notebookPage.style.height =
                "700px";

            canvas.width =
                notebookPage.clientWidth ||
                1000;

            canvas.height =
                700;

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            setupCanvas();

            updatePageNumber();

        }
    );
}


// ============================================================
// PREVIOUS PAGE
// ============================================================

if (previousPage) {

    previousPage.addEventListener(
        "click",
        () => {

            if (
                currentPage > 0
            ) {

                loadPage(
                    currentPage - 1
                );
            }

        }
    );
}


// ============================================================
// NEXT PAGE
// ============================================================

if (nextPage) {

    nextPage.addEventListener(
        "click",
        () => {

            if (
                currentPage <
                pages.length - 1
            ) {

                loadPage(
                    currentPage + 1
                );

            } else if (addPageBtn) {

                addPageBtn.click();
            }

        }
    );
}


// ============================================================
// EXTEND PAGE
// ============================================================

if (extendPageBtn) {

    extendPageBtn.addEventListener(
        "click",
        () => {

            saveCurrentPage();

            const oldHeight =
                notebookPage.offsetHeight;

            const newHeight =
                oldHeight + 500;


            const oldCanvas =
                document.createElement(
                    "canvas"
                );

            oldCanvas.width =
                canvas.width;

            oldCanvas.height =
                canvas.height;


            const oldCtx =
                oldCanvas.getContext(
                    "2d"
                );

            oldCtx.drawImage(
                canvas,
                0,
                0
            );


            notebookPage.style.height =
                `${newHeight}px`;

            canvas.width =
                notebookPage.clientWidth ||
                1000;

            canvas.height =
                newHeight;

            canvas.style.width =
                "100%";

            canvas.style.height =
                "100%";

            setupCanvas();


            ctx.drawImage(
                oldCanvas,
                0,
                0
            );


            pages[currentPage].height =
                newHeight;

            pages[currentPage].canvasData =
                canvas.toDataURL();

        }
    );
}


// ============================================================
// ZOOM
// ============================================================

function updateZoom() {

    if (zoomValue) {

        zoomValue.textContent =
            `${zoom}%`;
    }

    notebookPage.style.transform =
        `scale(${zoom / 100})`;

    notebookPage.style.transformOrigin =
        "top center";
}


if (zoomIn) {

    zoomIn.addEventListener(
        "click",
        () => {

            zoom =
                Math.min(
                    200,
                    zoom + 10
                );

            updateZoom();

        }
    );
}


if (zoomOut) {

    zoomOut.addEventListener(
        "click",
        () => {

            zoom =
                Math.max(
                    50,
                    zoom - 10
                );

            updateZoom();

        }
    );
}


// ============================================================
// TEXT TOOL
// ============================================================

if (textBtn) {

    textBtn.addEventListener(
        "click",
        () => {

            activateTool(
                "text",
                textBtn,
                "text"
            );

        }
    );
}


// ============================================================
// CREATE TEXT ON CANVAS
// ============================================================

canvas.addEventListener(
    "click",
    e => {

        if (
            currentTool !==
            "text"
        ) {

            return;
        }

        const position =
            getMousePosition(e);

        const text =
            prompt(
                "Enter your text:"
            );

        if (
            !text ||
            !text.trim()
        ) {

            return;
        }

        createTextObject(
            text.trim(),
            position.x,
            position.y
        );

        activateTool(
            "select",
            selectTool,
            "default"
        );

    }
);


// ============================================================
// CREATE TEXT OBJECT
// ============================================================

function createTextObject(
    text,
    x,
    y
) {

    if (!objectLayer) {
        return;
    }

    const element =
        document.createElement(
            "div"
        );

    element.textContent =
        text;

    element.style.position =
        "absolute";

    element.style.left =
        `${x}px`;

    element.style.top =
        `${y}px`;

    element.style.fontSize =
        "22px";

    element.style.fontFamily =
        "Poppins, sans-serif";

    element.style.color =
        colorPicker?.value ||
        "#172033";

    element.style.background =
        "transparent";

    element.style.padding =
        "4px 8px";

    element.style.cursor =
        "move";

    element.style.pointerEvents =
        "auto";

    element.dataset.type =
        "text";

    objectLayer.appendChild(
        element
    );

    makeDraggable(
        element
    );
}


// ============================================================
// DRAG OBJECT
// ============================================================

function makeDraggable(
    element
) {

    let dragging =
        false;

    let offsetX =
        0;

    let offsetY =
        0;


    element.addEventListener(
        "mousedown",
        e => {

            if (
                currentTool !==
                "select"
            ) {

                return;
            }

            dragging =
                true;

            const rect =
                element.getBoundingClientRect();

            offsetX =
                e.clientX -
                rect.left;

            offsetY =
                e.clientY -
                rect.top;

            e.stopPropagation();

            e.preventDefault();

        }
    );


    document.addEventListener(
        "mousemove",
        e => {

            if (!dragging) {
                return;
            }

            const parentRect =
                objectLayer.getBoundingClientRect();

            element.style.left =
                `${e.clientX -
                    parentRect.left -
                    offsetX}px`;

            element.style.top =
                `${e.clientY -
                    parentRect.top -
                    offsetY}px`;

        }
    );


    document.addEventListener(
        "mouseup",
        () => {

            dragging =
                false;

        }
    );
}


// ============================================================
// SHAPE TOOL
// ============================================================

if (shapeBtn) {

    shapeBtn.addEventListener(
        "click",
        () => {

            activateTool(
                "shape",
                shapeBtn,
                "crosshair"
            );

        }
    );
}


let shapeStart =
    null;


canvas.addEventListener(
    "mousedown",
    e => {

        if (
            currentTool !==
            "shape"
        ) {

            return;
        }

        shapeStart =
            getMousePosition(e);

    }
);


canvas.addEventListener(
    "mouseup",
    e => {

        if (
            currentTool !==
            "shape" ||
            !shapeStart
        ) {

            return;
        }

        const end =
            getMousePosition(e);

        const x =
            Math.min(
                shapeStart.x,
                end.x
            );

        const y =
            Math.min(
                shapeStart.y,
                end.y
            );

        const width =
            Math.abs(
                end.x -
                shapeStart.x
            );

        const height =
            Math.abs(
                end.y -
                shapeStart.y
            );


        if (
            width >= 5 &&
            height >= 5
        ) {

            createShape(
                x,
                y,
                width,
                height
            );
        }

        shapeStart =
            null;

        activateTool(
            "select",
            selectTool,
            "default"
        );

    }
);


// ============================================================
// CREATE SHAPE
// ============================================================

function createShape(
    x,
    y,
    width,
    height
) {

    if (!objectLayer) {
        return;
    }

    const shape =
        document.createElement(
            "div"
        );

    shape.style.position =
        "absolute";

    shape.style.left =
        `${x}px`;

    shape.style.top =
        `${y}px`;

    shape.style.width =
        `${width}px`;

    shape.style.height =
        `${height}px`;

    shape.style.border =
        `2px solid ${
            colorPicker?.value ||
            "#172033"
        }`;

    shape.style.borderRadius =
        "8px";

    shape.style.boxSizing =
        "border-box";

    shape.style.pointerEvents =
        "auto";

    shape.style.cursor =
        "move";

    objectLayer.appendChild(
        shape
    );

    makeDraggable(
        shape
    );
}





// ============================================================
// IMAGE TOOL
// ============================================================

if (imageBtn) {

    imageBtn.addEventListener(
        "click",
        () => {

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "file";

            input.accept =
                "image/*";


            input.addEventListener(
                "change",
                () => {

                    const file =
                        input.files?.[0];

                    if (!file) {
                        return;
                    }

                    const reader =
                        new FileReader();

                    reader.onload =
                        event => {

                            createImageObject(
                                event.target.result
                            );

                        };

                    reader.readAsDataURL(
                        file
                    );

                }
            );

            input.click();

        }
    );
}


// ============================================================
// CREATE IMAGE
// ============================================================

function createImageObject(
    src
) {

    if (!objectLayer) {
        return;
    }

    const image =
        document.createElement(
            "img"
        );

    image.src =
        src;

    image.style.position =
        "absolute";

    image.style.left =
        "150px";

    image.style.top =
        "200px";

    image.style.width =
        "250px";

    image.style.maxWidth =
        "400px";

    image.style.borderRadius =
        "10px";

    image.style.boxShadow =
        "0 5px 20px rgba(0,0,0,0.12)";

    image.style.cursor =
        "move";

    image.style.pointerEvents =
        "auto";

    objectLayer.appendChild(
        image
    );

    makeDraggable(
        image
    );
}


// ============================================================
// TABLE
// ============================================================

if (tableBtn) {

    tableBtn.addEventListener(
        "click",
        () => {

            const rows =
                Number(
                    prompt(
                        "Number of rows:",
                        "3"
                    )
                );

            const columns =
                Number(
                    prompt(
                        "Number of columns:",
                        "3"
                    )
                );


            if (
                !rows ||
                !columns ||
                rows < 1 ||
                columns < 1
            ) {

                return;
            }

            createTable(
                rows,
                columns
            );

        }
    );
}


// ============================================================
// CREATE TABLE
// ============================================================

function createTable(
    rows,
    columns
) {

    if (!objectLayer) {
        return;
    }

    const table =
        document.createElement(
            "table"
        );

    table.style.position =
        "absolute";

    table.style.left =
        "200px";

    table.style.top =
        "300px";

    table.style.borderCollapse =
        "collapse";

    table.style.background =
        "#ffffff";

    table.style.pointerEvents =
        "auto";

    table.style.cursor =
        "move";


    for (
        let r = 0;
        r < rows;
        r++
    ) {

        const row =
            table.insertRow();

        for (
            let c = 0;
            c < columns;
            c++
        ) {

            const cell =
                row.insertCell();

            cell.textContent =
                "Cell";

            cell.contentEditable =
                "true";

            cell.style.border =
                "1px solid #999";

            cell.style.padding =
                "10px 15px";

            cell.style.minWidth =
                "70px";
        }
    }


    objectLayer.appendChild(
        table
    );

    makeDraggable(
        table
    );
}


// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener(
    "keydown",
    e => {

        const key =
            e.key.toLowerCase();


        // Ctrl + Z

        if (
            e.ctrlKey &&
            !e.shiftKey &&
            key === "z"
        ) {

            e.preventDefault();

            undoBtn?.click();

            return;
        }


        // Ctrl + Y

        if (
            e.ctrlKey &&
            key === "y"
        ) {

            e.preventDefault();

            redoBtn?.click();

            return;
        }


        // Ctrl + Shift + Z

        if (
            e.ctrlKey &&
            e.shiftKey &&
            key === "z"
        ) {

            e.preventDefault();

            redoBtn?.click();

            return;
        }


        // Don't trigger shortcuts while typing

        const target =
            e.target;

        if (
            target &&
            (
                target.tagName ===
                    "INPUT" ||

                target.tagName ===
                    "TEXTAREA" ||

                target.isContentEditable
            )
        ) {

            return;
        }


        // P = Pen

        if (key === "p") {

            drawBtn?.click();
        }


        // E = Eraser

        if (key === "e") {

            eraserBtn?.click();
        }


        // H = Highlighter

        if (key === "h") {

            highlighterBtn?.click();
        }

    }
);


// ============================================================
// DEFAULT TOOL
// ============================================================

if (drawBtn) {

    activateTool(
        "pen",
        drawBtn,
        "crosshair"
    );
}


// ============================================================
// PAGE NUMBER
// ============================================================

updatePageNumber();


// ============================================================
// SAVE DOCUMENT
// ============================================================

function saveDocument() {

    saveCurrentPage();

    const titleInput =
        document.getElementById(
            "documentTitle"
        );

    const documentData = {

        pages:
            pages,

        currentPage:
            currentPage,

        zoom:
            zoom,

        title:
            titleInput?.value ||
            "Study Notes",

        canvasStyle:
            currentCanvasStyle

    };

    const documentKey = getDocumentKey();

    localStorage.setItem(
        documentKey,
        JSON.stringify(documentData)
    );
}


// ============================================================
// LOAD DOCUMENT
// ============================================================

function loadDocument() {

    const documentKey = getDocumentKey();

    const saved =
        localStorage.getItem(documentKey);

    if (!saved) {
        return;
    }


    try {

        const data =
            JSON.parse(saved);


        if (
            Array.isArray(
                data.pages
            ) &&
            data.pages.length > 0
        ) {

            pages =
                data.pages;
        }


        if (
            typeof data.currentPage ===
            "number"
        ) {

            currentPage =
                Math.min(
                    Math.max(
                        data.currentPage,
                        0
                    ),
                    pages.length - 1
                );
        }


        if (
            typeof data.zoom ===
            "number"
        ) {

            zoom =
                Math.min(
                    200,
                    Math.max(
                        50,
                        data.zoom
                    )
                );
        }

        if (data.canvasStyle) {
            applyCanvasStyle(data.canvasStyle);
        }


        const titleInput =
            document.getElementById(
                "documentTitle"
            );


        if (
            titleInput &&
            data.title
        ) {

            titleInput.value =
                data.title;
        }


        const page =
            pages[currentPage];


        notebookPage.style.height =
            `${page.height || 700}px`;

        canvas.width =
            notebookPage.clientWidth ||
            1000;

        canvas.height =
            page.height ||
            700;

        canvas.style.width =
            "100%";

        canvas.style.height =
            "100%";

        setupCanvas();


        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        if (page.canvasData) {

            const image =
                new Image();

            image.onload = () => {

                ctx.drawImage(
                    image,
                    0,
                    0
                );

                setupCanvas();
            };

            image.src =
                page.canvasData;
        }


        updatePageNumber();

        updateZoom();

    } catch (error) {

        console.error(
            "Could not load LiveCanvas:",
            error
        );
    }
}


// ============================================================
// AUTO SAVE
// ============================================================

setInterval(
    () => {

        saveDocument();

    },
    10000
);


// ============================================================
// SAVE BEFORE LEAVING
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {

        saveDocument();

    }
);


// ============================================================
// LOAD SAVED DOCUMENT
// ============================================================

loadDocument();


// ============================================================
// DONE
// ============================================================

console.log(
    "LiveCanvas initialized successfully 🚀"
);

} // END CANVAS SAFETY CHECK