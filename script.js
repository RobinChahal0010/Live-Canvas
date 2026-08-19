// ============================================================
// LIVECANVAS - COMPLETE COLLABORATIVE SCRIPT
// ============================================================
// SERVER = SOURCE OF TRUTH
// localStorage = LOCAL CACHE / FALLBACK
//
// Supported:
// - Authentication UI
// - Board sharing
// - Collaborators
// - Real-time drawing
// - Real-time cursor
// - Canvas style sync
// - Full board state sync
// - Pages
// - Extend page
// - Undo / Redo
// - Zoom
// - Text
// - Shapes
// - Images
// - Sticky notes
// - Tables
// - Keyboard shortcuts
// ============================================================


// ============================================================
// BOARD
// ============================================================

const urlParams = new URLSearchParams(window.location.search);

const boardId =
    urlParams.get("board") ||
    sessionStorage.getItem("currentBoardId");

let socket = null;

console.log("================================");
console.log("LIVE CANVAS");
console.log("Current URL:", window.location.href);
console.log("Board ID:", boardId);
console.log("================================");


// ============================================================
// AUTHENTICATION
// ============================================================

let loggedInUser = null;

try {

    const storedUser =
        localStorage.getItem("loggedInUser");

    if (storedUser) {
        loggedInUser = JSON.parse(storedUser);
    }

} catch (error) {

    console.error(
        "Could not read loggedInUser:",
        error
    );

    loggedInUser = null;
}


// ============================================================
// AUTH ELEMENTS
// ============================================================

const welcomeUser =
    document.getElementById("welcomeUser");

const loginHeaderBtn =
    document.getElementById("loginHeaderBtn");

const signupHeaderBtn =
    document.getElementById("signupHeaderBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// ============================================================
// AUTH UI
// ============================================================

function updateAuthUI() {

    if (loggedInUser) {

        if (welcomeUser) {

            welcomeUser.textContent =
                `Hi, ${loggedInUser.name || "User"} 👋`;

            welcomeUser.style.display =
                "block";
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
            welcomeUser.textContent = "";
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


// ============================================================
// CURRENT USER
// ============================================================

let currentUsername =
    loggedInUser?.name || "User";


// ============================================================
// HEADER BUTTONS
// ============================================================

loginHeaderBtn?.addEventListener(
    "click",
    () => {

        window.location.href =
            "home.html";

    }
);


signupHeaderBtn?.addEventListener(
    "click",
    () => {

        window.location.href =
            "signup.html";

    }
);


logoutBtn?.addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            "loggedInUser"
        );

        if (socket) {
            socket.disconnect();
        }

        window.location.href =
            "login.html";

    }
);


// ============================================================
// CANVAS ELEMENTS
// ============================================================

const canvas =
    document.getElementById("drawingBoard");

const ctx =
    canvas
        ? canvas.getContext("2d")
        : null;

const notebookPage =
    document.getElementById("notebookPage");

const paperBackground =
    document.querySelector(".paper-background");

const objectLayer =
    document.getElementById("objectLayer");

const canvasPointers =
    document.getElementById("canvasPointers");

const localCanvasPointer =
    document.getElementById("localCanvasPointer");


// ============================================================
// POINTER COLORS
// ============================================================

const pointerColors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899"
];

const remotePointers =
    new Map();

const localPointerColor =
    pointerColors[
        Math.floor(
            Math.random() *
            pointerColors.length
        )
    ];


// ============================================================
// POINTER HELPERS
// ============================================================

function getPointerColor(socketId) {

    if (!remotePointers.has(socketId)) {

        const color =
            pointerColors[
                remotePointers.size %
                pointerColors.length
            ];

        remotePointers.set(
            socketId,
            { color }
        );
    }

    return remotePointers.get(
        socketId
    ).color;
}


function updatePointer(
    pointer,
    data,
    color
) {

    if (!pointer || !data) {
        return;
    }

    pointer.style.left =
        `${data.x}px`;

    pointer.style.top =
        `${data.y}px`;

    pointer.style.setProperty(
        "--pointer-color",
        color
    );

    pointer.dataset.username =
        data.username ||
        "User";

    pointer.style.display =
        data.visible
            ? "block"
            : "none";
}


// ============================================================
// COLLABORATORS
// ============================================================

function updateCollaborators(
    users = []
) {

    const collaborators =
        document.getElementById(
            "collaborators"
        );

    const collaboratorList =
        document.getElementById(
            "collaboratorList"
        );

    if (
        !collaborators ||
        !collaboratorList
    ) {
        return;
    }

    collaboratorList
        .querySelectorAll(".avatar")
        .forEach(
            avatar => avatar.remove()
        );

    if (!boardId) {

        collaborators.style.display =
            "none";

        return;
    }

    collaborators.style.display =
        "flex";

    if (!Array.isArray(users)) {
        return;
    }

    const maxVisibleUsers = 4;

    users
        .slice(
            0,
            maxVisibleUsers
        )
        .forEach(
            username => {

                if (
                    !username ||
                    typeof username !==
                    "string"
                ) {
                    return;
                }

                const cleanName =
                    username.trim();

                if (!cleanName) {
                    return;
                }

                const avatar =
                    document.createElement(
                        "span"
                    );

                avatar.className =
                    "avatar";

                avatar.textContent =
                    cleanName
                        .charAt(0)
                        .toUpperCase();

                avatar.title =
                    cleanName;

                collaboratorList.appendChild(
                    avatar
                );

            }
        );

    if (
        users.length >
        maxVisibleUsers
    ) {

        const more =
            document.createElement(
                "span"
            );

        more.className =
            "avatar more";

        more.textContent =
            `+${users.length - maxVisibleUsers}`;

        more.title =
            `${users.length - maxVisibleUsers} more collaborators`;

        collaboratorList.appendChild(
            more
        );
    }
}


// ============================================================
// SOCKET CONNECTION
// ============================================================

if (
    boardId &&
    typeof io === "function"
) {

    console.log(
        "Connecting to board:",
        boardId
    );

    socket =
        io(
            window.location.origin,
            {
                transports: [
                    "websocket",
                    "polling"
                ]
            }
        );


    // ========================================================
    // CONNECT
    // ========================================================

    socket.on(
        "connect",
        () => {

            console.log(
                "Connected:",
                socket.id
            );

            socket.emit(
                "join-room",
                boardId,
                currentUsername
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
                "ROOM JOINED:",
                data
            );

            currentUsername =
                data.username ||
                currentUsername;

            updateCollaborators(
                data.users || []
            );

            // Server may send the existing board
            // immediately when joining.
            if (data.state) {

                applyServerBoardState(
                    data.state
                );

            }

            if (data.canvasData) {

                applyServerCanvasData(
                    data.canvasData
                );

            }

             if (data.canvasStyle) {

        console.log(
            "Received board canvas style:",
            data.canvasStyle
        );

        if (typeof applyCanvasStyle === "function") {

            applyCanvasStyle(
                data.canvasStyle
            );

        }
    }

            if (data.pages) {

                applyServerPages(
                    data.pages,
                    data.currentPage,
                    data.zoom,
                    data.canvasStyle
                );

            }

        }
    );


    // ========================================================
    // FULL BOARD STATE
    // ========================================================

    socket.on(
        "board-state",
        data => {

            console.log(
                "Received board state"
            );

            if (!data) {
                return;
            }

            applyServerBoardState(
                data
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
                `${data?.username || "User"} joined`
            );

            updateCollaborators(
                data?.users || []
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
                `${data?.username || "User"} left`
            );

            updateCollaborators(
                data?.users || []
            );

        }
    );

    // ============================================================
// RECEIVE CANVAS STYLE FROM OTHER USERS
// ============================================================

socket.on(
    "canvas-style-change",
    data => {

        if (!data || !data.style) {
            return;
        }

        console.log(
            "Remote canvas style:",
            data.style
        );

        if (
            typeof applyCanvasStyle === "function"
        ) {

            applyCanvasStyle(
                data.style
            );

        }

    }
);

    // ========================================================
    // REAL-TIME DRAW
    // ========================================================

    socket.on(
        "canvas-draw",
        data => {

            drawRemoteStroke(
                data
            );

        }
    );


    // ========================================================
    // REMOTE CANVAS SNAPSHOT
    // ========================================================

    socket.on(
        "canvas-state",
        data => {

            if (!data) {
                return;
            }

            if (data.canvasData) {

                applyServerCanvasData(
                    data.canvasData
                );

            }

        }
    );


    // ========================================================
    // REMOTE STYLE
    // ========================================================

    socket.on(
        "canvas-style",
        data => {

            const style =
                typeof data === "string"
                    ? data
                    : data?.style;

            if (style) {

                applyCanvasStyle(
                    style
                );

                saveLocalCache();

            }

        }
    );


    // ========================================================
    // REMOTE PAGES
    // ========================================================

    socket.on(
        "pages-update",
        data => {

            if (!data) {
                return;
            }

            applyServerPages(
                data.pages,
                data.currentPage,
                data.zoom,
                data.canvasStyle
            );

        }
    );


    // ========================================================
    // REMOTE OBJECT
    // ========================================================

    socket.on(
        "object-add",
        data => {

            if (!data) {
                return;
            }

            createObjectFromData(
                data,
                false
            );

        }
    );


    socket.on(
        "object-update",
        data => {

            updateObjectFromData(
                data
            );

        }
    );


    socket.on(
        "object-delete",
        data => {

            if (!data?.id) {
                return;
            }

            const element =
                document.querySelector(
                    `[data-object-id="${data.id}"]`
                );

            element?.remove();

        }
    );


    // ========================================================
    // REMOTE CURSOR
    // ========================================================

    socket.on(
        "cursor-move",
        data => {

            if (!data?.socketId) {
                return;
            }

            let pointer =
                document.getElementById(
                    `pointer-${data.socketId}`
                );

            if (!pointer) {

                pointer =
                    document.createElement(
                        "div"
                    );

                pointer.id =
                    `pointer-${data.socketId}`;

                pointer.className =
                    "canvas-pointer remote-canvas-pointer";

                canvasPointers?.appendChild(
                    pointer
                );

            }

            updatePointer(
                pointer,
                data,
                getPointerColor(
                    data.socketId
                )
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


    // ========================================================
    // DISCONNECT
    // ========================================================

    socket.on(
        "disconnect",
        reason => {

            console.log(
                "Disconnected:",
                reason
            );

        }
    );

}


// ============================================================
// SHARE ROOM
// ============================================================

const shareBtn =
    document.getElementById(
        "shareBtn"
    );

const boardCodeBtn =
    document.getElementById(
        "boardCodeBtn"
    );

const boardCodeElement =
    document.getElementById(
        "boardCode"
    );


if (boardCodeElement) {

    boardCodeElement.textContent =
        boardId || "Unavailable";

}


boardCodeBtn?.addEventListener(
    "click",
    async () => {

        if (!boardId) {
            return;
        }

        try {

            await navigator.clipboard.writeText(
                boardId
            );

            boardCodeBtn.textContent =
                "Copied";

            setTimeout(
                () => {

                    boardCodeBtn.innerHTML =
                        `Code: <span id="boardCode">${boardId}</span>`;

                },
                1200
            );

        } catch (error) {

            console.error(
                "Could not copy board code:",
                error
            );

        }

    }
);


shareBtn?.addEventListener(
    "click",
    async () => {

        if (!boardId) {

            alert(
                "Board not found."
            );

            return;
        }

        const shareUrl =
            `${window.location.origin}${window.location.pathname}?board=${encodeURIComponent(boardId)}`;

        const shareMessage =
            `You have been invited to collaborate\nBoard code: ${boardId}\n${shareUrl}`;

        try {

            if (
                navigator.share
            ) {

                await navigator.share(
                    {
                        title:
                            "LiveCanvas Board",

                        text:
                            shareMessage,

                        url:
                            shareUrl
                    }
                );

            } else {

                await navigator.clipboard.writeText(
                    shareMessage
                );

                alert(
                    "Share link copied!"
                );

            }

        } catch (error) {

            console.log(
                "Share cancelled."
            );

        }

    }
);


// ============================================================
// CANVAS SAFETY
// ============================================================

if (
    !canvas ||
    !ctx ||
    !notebookPage
) {

    console.warn(
        "Canvas elements not found."
    );

} else {


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
// CONTROLS
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
// ZOOM
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

let undoStack =
    [];

let redoStack =
    [];

const MAX_HISTORY =
    50;

let zoom =
    100;

let isApplyingRemoteState =
    false;

let serverReady =
    false;


// ============================================================
// PAGES
// ============================================================

let pages = [
    {
        canvasData: null,
        height: 700
    }
];

let currentPage =
    0;


// ============================================================
// CANVAS STYLE
// ============================================================

const VALID_CANVAS_STYLES = [
    "blank",
    "grid",
    "dots",
    "lines"
];

let currentCanvasStyle =
    "blank";


// ============================================================
// NORMALIZE STYLE
// ============================================================

function normalizeCanvasStyle(
    style
) {

    const safeStyle =
        typeof style === "string"
            ? style
                .trim()
                .toLowerCase()
            : "blank";

    if (
        safeStyle === "plain"
    ) {
        return "blank";
    }

    return VALID_CANVAS_STYLES.includes(
        safeStyle
    )
        ? safeStyle
        : "blank";
}


// ============================================================
// APPLY CANVAS STYLE
// ============================================================

function applyCanvasStyle(style, sync = true) {

    currentCanvasStyle =
        normalizeCanvasStyle(style);

    notebookPage.setAttribute(
        "data-canvas-style",
        currentCanvasStyle
    );

    if (paperBackground) {

        const styles = {

            blank: {
                backgroundColor: "#fff",
                backgroundImage: "none",
                backgroundSize: "auto"
            },

            grid: {
                backgroundColor: "#fffdf5",
                backgroundImage:
                    "linear-gradient(rgba(120,155,190,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(120,155,190,0.16) 1px, transparent 1px)",
                backgroundSize: "24px 24px"
            },

            dots: {
                backgroundColor: "#fffdf5",
                backgroundImage:
                    "radial-gradient(circle, rgba(120,155,190,0.35) 1.25px, transparent 1.35px)",
                backgroundSize: "22px 22px"
            },

            lines: {
                backgroundColor: "#fffdf5",
                backgroundImage:
                    "repeating-linear-gradient(to bottom, rgba(120,155,190,0.18) 0, rgba(120,155,190,0.18) 1px, transparent 1px, transparent 28px)",
                backgroundSize: "100% 28px"
            }

        };

        const selected =
            styles[currentCanvasStyle] ||
            styles.lines;

        paperBackground.style.backgroundColor =
            selected.backgroundColor;

        paperBackground.style.backgroundImage =
            selected.backgroundImage;

        paperBackground.style.backgroundSize =
            selected.backgroundSize;

        paperBackground.style.backgroundPosition =
            "0 0";
    }


    // Only the USER who changes the style sends it.
    if (
        sync &&
        socket &&
        socket.connected &&
        socket.boardId
    ) {

        socket.emit(
            "canvas-style-change",
            {
                style: currentCanvasStyle
            }
        );

    }
}

// ============================================================
// DOCUMENT KEY
// ============================================================

function getDocumentKey() {

    const id =
        sessionStorage.getItem(
            "currentBoardId"
        ) ||
        boardId;

    if (!id) {
        return null;
    }

    return (
        `liveCanvasDocument_${id}`
    );
}


// ============================================================
// CANVAS SETUP
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


// ============================================================
// INITIALIZE CANVAS
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
// HISTORY
// ============================================================

function saveState() {

    if (isApplyingRemoteState) {
        return;
    }

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

function restoreCanvas(
    data
) {

    if (!data) {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        setupCanvas();

        return;
    }

    const image =
        new Image();

    image.onload =
        () => {

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
// MOUSE POSITION
// ============================================================

function getMousePosition(e) {

    const rect =
        canvas.getBoundingClientRect();

    return {

        x:
            (e.clientX - rect.left) *
            (
                canvas.width /
                rect.width
            ),

        y:
            (e.clientY - rect.top) *
            (
                canvas.height /
                rect.height
            )

    };
}


// ============================================================
// ACTIVE TOOL
// ============================================================

function setActiveTool(
    button
) {

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


function activateTool(
    tool,
    button,
    cursor = "crosshair"
) {

    currentTool =
        tool;

    setActiveTool(
        button
    );

    canvas.style.cursor =
        cursor;
}


// ============================================================
// TOOL BUTTONS
// ============================================================

drawBtn?.addEventListener(
    "click",
    () =>
        activateTool(
            "pen",
            drawBtn,
            "crosshair"
        )
);

eraserBtn?.addEventListener(
    "click",
    () =>
        activateTool(
            "eraser",
            eraserBtn,
            "crosshair"
        )
);

highlighterBtn?.addEventListener(
    "click",
    () =>
        activateTool(
            "highlighter",
            highlighterBtn,
            "crosshair"
        )
);

lightPenBtn?.addEventListener(
    "click",
    () =>
        activateTool(
            "lightPen",
            lightPenBtn,
            "crosshair"
        )
);

selectTool?.addEventListener(
    "click",
    () =>
        activateTool(
            "select",
            selectTool,
            "default"
        )
);

textBtn?.addEventListener(
    "click",
    () =>
        activateTool(
            "text",
            textBtn,
            "text"
        )
);


// ============================================================
// DRAW START
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


    let color =
        colorPicker?.value ||
        "#172033";

    let lineWidth =
        Number(
            brushSize?.value ||
            4
        );

    let alpha =
        1;

    let composite =
        "source-over";


    if (
        currentTool ===
        "highlighter"
    ) {

        alpha =
            0.28;

        lineWidth *= 3;

    }


    if (
        currentTool ===
        "lightPen"
    ) {

        alpha =
            0.18;

        lineWidth *= 1.5;

        color =
            colorPicker?.value ||
            "#ffffff";

    }


    if (
        currentTool ===
        "eraser"
    ) {

        composite =
            "destination-out";

        alpha =
            1;

        lineWidth *= 2;

    }


    ctx.globalCompositeOperation =
        composite;

    ctx.globalAlpha =
        alpha;

    ctx.strokeStyle =
        color;

    ctx.lineWidth =
        lineWidth;

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


    // ========================================================
    // REAL-TIME SOCKET SYNC
    // ========================================================

    if (
        socket?.connected
    ) {

        socket.emit(
            "canvas-draw",
            {

                x1: lastX,
                y1: lastY,

                x2: currentX,
                y2: currentY,

                color: color,

                lineWidth: Number(
                    brushSize?.value ||
                    4
                ),

                tool:
                    currentTool,

                alpha:
                    alpha

            }
        );

    }


    lastX =
        currentX;

    lastY =
        currentY;
}


// ============================================================
// REMOTE DRAW
// ============================================================

function drawRemoteStroke(
    data
) {

    if (
        !data ||
        !ctx
    ) {
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
            (
                data.lineWidth ||
                4
            ) * 2;

    }

    else if (
        data.tool ===
        "highlighter"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            data.alpha ??
            0.28;

        ctx.lineWidth =
            (
                data.lineWidth ||
                4
            ) * 3;

    }

    else if (
        data.tool ===
        "lightPen"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            data.alpha ??
            0.18;

        ctx.lineWidth =
            (
                data.lineWidth ||
                4
            ) * 1.5;

    }

    else {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            data.alpha ??
            1;

        ctx.lineWidth =
            data.lineWidth ||
            4;

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

    currentStroke = [];

    saveCurrentPage();

    scheduleServerStateSync();
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
        tempCanvas.getContext(
            "2d"
        );

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

    setTimeout(
        () => {

            tempCanvas.style.transition =
                "opacity 0.9s ease";

            tempCanvas.style.opacity =
                "0";

            setTimeout(
                () =>
                    tempCanvas.remove(),
                900
            );

        },
        2000
    );
}


// ============================================================
// CANVAS EVENTS
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
// TOUCH
// ============================================================

canvas.addEventListener(
    "touchstart",
    e => {

        e.preventDefault();

        if (e.touches[0]) {

            startDrawing(
                e.touches[0]
            );

        }

    },
    {
        passive: false
    }
);


canvas.addEventListener(
    "touchmove",
    e => {

        e.preventDefault();

        if (e.touches[0]) {

            draw(
                e.touches[0]
            );

        }

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
// CURSOR SYNC
// ============================================================

if (
    notebookPage &&
    localCanvasPointer
) {

    notebookPage.addEventListener(
        "mousemove",
        event => {

            const bounds =
                notebookPage.getBoundingClientRect();

            const x =
                event.clientX -
                bounds.left;

            const y =
                event.clientY -
                bounds.top;

            updatePointer(
                localCanvasPointer,
                {
                    x,
                    y,
                    visible: true,
                    username:
                        currentUsername
                },
                localPointerColor
            );

            if (
                socket?.connected
            ) {

                socket.emit(
                    "cursor-move",
                    {
                        x,
                        y,
                        visible: true,
                        username:
                            currentUsername
                    }
                );

            }

        }
    );


    notebookPage.addEventListener(
        "mouseleave",
        () => {

            localCanvasPointer.style.display =
                "none";

            socket?.emit(
                "cursor-move",
                {
                    x: 0,
                    y: 0,
                    visible: false,
                    username:
                        currentUsername
                }
            );

        }
    );

}


// ============================================================
// COLOR
// ============================================================

colorPicker?.addEventListener(
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


// ============================================================
// UNDO
// ============================================================

undoBtn?.addEventListener(
    "click",
    () => {

        if (
            !undoStack.length
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

        scheduleServerStateSync();

    }
);


// ============================================================
// REDO
// ============================================================

redoBtn?.addEventListener(
    "click",
    () => {

        if (
            !redoStack.length
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

        scheduleServerStateSync();

    }
);


// ============================================================
// CLEAR
// ============================================================

clearBtn?.addEventListener(
    "click",
    () => {

        saveState();

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        setupCanvas();

        saveCurrentPage();

        scheduleServerStateSync();

    }
);


// ============================================================
// SAVE PAGE
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

function loadPage(
    index,
    notifyServer = true
) {

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

    if (
        page.canvasData
    ) {

        restoreCanvas(
            page.canvasData
        );

    }

    updatePageNumber();

    if (
        notifyServer &&
        !isApplyingRemoteState
    ) {

        scheduleServerStateSync();

    }

}


// ============================================================
// PAGE NUMBER
// ============================================================

function updatePageNumber() {

    if (pageNumber) {

        pageNumber.textContent =
            `${currentPage + 1} / ${pages.length}`;

    }

}


// ============================================================
// ADD PAGE
// ============================================================

addPageBtn?.addEventListener(
    "click",
    () => {

        saveCurrentPage();

        pages.push(
            {
                canvasData: null,
                height: 700
            }
        );

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

        scheduleServerStateSync();

    }
);


// ============================================================
// PREVIOUS PAGE
// ============================================================

previousPage?.addEventListener(
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


// ============================================================
// NEXT PAGE
// ============================================================

nextPage?.addEventListener(
    "click",
    () => {

        if (
            currentPage <
            pages.length - 1
        ) {

            loadPage(
                currentPage + 1
            );

        } else {

            addPageBtn?.click();

        }

    }
);


// ============================================================
// EXTEND PAGE
// ============================================================

extendPageBtn?.addEventListener(
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

        scheduleServerStateSync();

    }
);


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


zoomIn?.addEventListener(
    "click",
    () => {

        zoom =
            Math.min(
                200,
                zoom + 10
            );

        updateZoom();

        scheduleServerStateSync();

    }
);


zoomOut?.addEventListener(
    "click",
    () => {

        zoom =
            Math.max(
                50,
                zoom - 10
            );

        updateZoom();

        scheduleServerStateSync();

    }
);


// ============================================================
// TEXT TOOL
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
            position.y,
            true
        );

        activateTool(
            "select",
            selectTool,
            "default"
        );

    }
);


// ============================================================
// OBJECT ID
// ============================================================

function generateObjectId() {

    return (
        `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 10)}`
    );

}


// ============================================================
// TEXT OBJECT
// ============================================================

function createTextObject(
    text,
    x,
    y,
    sync = true
) {

    if (!objectLayer) {
        return null;
    }

    const id =
        generateObjectId();

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

    element.style.padding =
        "4px 8px";

    element.style.cursor =
        "move";

    element.style.pointerEvents =
        "auto";

    element.dataset.type =
        "text";

    element.dataset.objectId =
        id;

    objectLayer.appendChild(
        element
    );

    makeDraggable(
        element
    );

    if (
        sync &&
        socket?.connected
    ) {

        socket.emit(
            "object-add",
            {
                id,
                type: "text",
                text,
                x,
                y,
                fontSize:
                    "22px",
                fontFamily:
                    "Poppins, sans-serif",
                color:
                    element.style.color
            }
        );

    }

    return element;
}


// ============================================================
// OBJECT DATA
// ============================================================

function getObjectData(
    element
) {

    if (!element) {
        return null;
    }

    const rect =
        objectLayer.getBoundingClientRect();

    const elementRect =
        element.getBoundingClientRect();

    const x =
        elementRect.left -
        rect.left;

    const y =
        elementRect.top -
        rect.top;

    return {

        id:
            element.dataset.objectId,

        type:
            element.dataset.type ||
            "object",

        x,
        y,

        width:
            element.offsetWidth,

        height:
            element.offsetHeight,

        text:
            element.textContent,

        color:
            element.style.color,

        fontSize:
            element.style.fontSize

    };

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
                `${
                    e.clientX -
                    parentRect.left -
                    offsetX
                }px`;

            element.style.top =
                `${
                    e.clientY -
                    parentRect.top -
                    offsetY
                }px`;

        }
    );


    document.addEventListener(
        "mouseup",
        () => {

            if (
                !dragging
            ) {
                return;
            }

            dragging =
                false;

            const data =
                getObjectData(
                    element
                );

            if (
                data &&
                socket?.connected
            ) {

                socket.emit(
                    "object-update",
                    data
                );

            }

        }
    );

}


// ============================================================
// APPLY REMOTE OBJECT
// ============================================================

function createObjectFromData(
    data,
    sync = false
) {

    if (!data?.id) {
        return;
    }

    const existing =
        document.querySelector(
            `[data-object-id="${data.id}"]`
        );

    if (existing) {
        return;
    }


    if (
        data.type ===
        "text"
    ) {

        const element =
            createTextObject(
                data.text || "",
                Number(data.x) || 0,
                Number(data.y) || 0,
                sync
            );

        if (element) {

            element.dataset.objectId =
                data.id;

            if (data.color) {
                element.style.color =
                    data.color;
            }

            if (data.fontSize) {
                element.style.fontSize =
                    data.fontSize;
            }

        }

        return;
    }


    const element =
        document.createElement(
            "div"
        );

    element.dataset.objectId =
        data.id;

    element.dataset.type =
        data.type ||
        "object";

    element.style.position =
        "absolute";

    element.style.left =
        `${Number(data.x) || 0}px`;

    element.style.top =
        `${Number(data.y) || 0}px`;

    element.style.width =
        `${Number(data.width) || 150}px`;

    element.style.height =
        `${Number(data.height) || 100}px`;

    element.style.cursor =
        "move";

    element.style.pointerEvents =
        "auto";

    objectLayer.appendChild(
        element
    );

    makeDraggable(
        element
    );

}


// ============================================================
// UPDATE REMOTE OBJECT
// ============================================================

function updateObjectFromData(
    data
) {

    if (!data?.id) {
        return;
    }

    const element =
        document.querySelector(
            `[data-object-id="${data.id}"]`
        );

    if (!element) {
        return;
    }

    if (
        data.x !== undefined
    ) {

        element.style.left =
            `${Number(data.x)}px`;

    }

    if (
        data.y !== undefined
    ) {

        element.style.top =
            `${Number(data.y)}px`;

    }

    if (
        data.width !== undefined
    ) {

        element.style.width =
            `${Number(data.width)}px`;

    }

    if (
        data.height !== undefined
    ) {

        element.style.height =
            `${Number(data.height)}px`;

    }

}


// ============================================================
// SHAPE SYSTEM
// ============================================================

let selectedShape =
    null;

const shapePicker =
    document.getElementById(
        "shapePicker"
    );

const closeShapePicker =
    document.getElementById(
        "closeShapePicker"
    );


shapeBtn?.addEventListener(
    "click",
    e => {

        e.stopPropagation();

        shapePicker?.classList.toggle(
            "show"
        );

    }
);


closeShapePicker?.addEventListener(
    "click",
    () => {

        shapePicker?.classList.remove(
            "show"
        );

    }
);


document
    .querySelectorAll(
        ".shape-option"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    selectedShape =
                        button.dataset.shape;

                    shapePicker?.classList.remove(
                        "show"
                    );

                    activateTool(
                        "shape",
                        shapeBtn,
                        "crosshair"
                    );

                }
            );

        }
    );


// ============================================================
// SHAPE START
// ============================================================

let shapeStart =
    null;


canvas.addEventListener(
    "mousedown",
    e => {

        if (
            currentTool !==
            "shape" ||
            !selectedShape
        ) {
            return;
        }

        shapeStart =
            getMousePosition(e);

    }
);


// ============================================================
// SHAPE END
// ============================================================

canvas.addEventListener(
    "mouseup",
    e => {

        if (
            currentTool !==
            "shape" ||
            !shapeStart ||
            !selectedShape
        ) {

            shapeStart =
                null;

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
                selectedShape,
                x,
                y,
                width,
                height,
                true
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
    shapeType,
    x,
    y,
    width,
    height,
    sync = true
) {

    if (!objectLayer) {
        return;
    }

    const id =
        generateObjectId();

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

    shape.style.boxSizing =
        "border-box";

    const color =
        colorPicker?.value ||
        "#172033";

    shape.style.border =
        `2px solid ${color}`;

    shape.style.cursor =
        "move";

    shape.style.pointerEvents =
        "auto";

    shape.dataset.type =
        shapeType;

    shape.dataset.shape =
        shapeType;

    shape.dataset.objectId =
        id;


    if (
        shapeType ===
        "circle"
    ) {

        shape.style.borderRadius =
            "50%";

    }

    else if (
        shapeType ===
        "diamond"
    ) {

        shape.style.transform =
            "rotate(45deg)";

    }

    else if (
        shapeType ===
        "triangle"
    ) {

        shape.style.border =
            "none";

        shape.style.width =
            "0px";

        shape.style.height =
            "0px";

        shape.style.borderLeft =
            `${width / 2}px solid transparent`;

        shape.style.borderRight =
            `${width / 2}px solid transparent`;

        shape.style.borderBottom =
            `${height}px solid ${color}`;

    }

    else if (
        shapeType ===
        "parallelogram"
    ) {

        shape.style.transform =
            "skewX(-20deg)";

    }

    else if (
        shapeType ===
        "heart"
    ) {

        shape.style.borderRadius =
            "50% 50% 0 0";

        shape.style.transform =
            "rotate(45deg)";

    }


    objectLayer.appendChild(
        shape
    );

    makeDraggable(
        shape
    );


    if (
        sync &&
        socket?.connected
    ) {

        socket.emit(
            "object-add",
            {
                id,
                type:
                    shapeType,

                shape:
                    shapeType,

                x,
                y,
                width,
                height,

                color
            }
        );

    }

}


// ============================================================
// IMAGE
// ============================================================

imageBtn?.addEventListener(
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
                            event.target.result,
                            true
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


// ============================================================
// CREATE IMAGE
// ============================================================

function createImageObject(
    src,
    sync = true
) {

    if (!objectLayer) {
        return;
    }

    const id =
        generateObjectId();

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

    image.dataset.type =
        "image";

    image.dataset.objectId =
        id;

    objectLayer.appendChild(
        image
    );

    makeDraggable(
        image
    );


    if (
        sync &&
        socket?.connected
    ) {

        socket.emit(
            "object-add",
            {
                id,
                type: "image",
                src,
                x: 150,
                y: 200,
                width: 250
            }
        );

    }

}


// ============================================================
// TABLE
// ============================================================

tableBtn?.addEventListener(
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
            columns,
            true
        );

    }
);


// ============================================================
// CREATE TABLE
// ============================================================

function createTable(
    rows,
    columns,
    sync = true
) {

    if (!objectLayer) {
        return;
    }

    const id =
        generateObjectId();

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

    table.dataset.type =
        "table";

    table.dataset.objectId =
        id;


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


    if (
        sync &&
        socket?.connected
    ) {

        socket.emit(
            "object-add",
            {
                id,
                type: "table",
                rows,
                columns,
                x: 200,
                y: 300
            }
        );

    }

}


// ============================================================
// STICKY NOTE
// ============================================================

stickyBtn?.addEventListener(
    "click",
    () => {

        if (!objectLayer) {
            return;
        }

        const text =
            prompt(
                "Enter sticky note:",
                "Write something..."
            );

        if (
            !text ||
            !text.trim()
        ) {
            return;
        }

        const id =
            generateObjectId();

        const note =
            document.createElement(
                "div"
            );

        note.textContent =
            text.trim();

        note.style.position =
            "absolute";

        note.style.left =
            "250px";

        note.style.top =
            "150px";

        note.style.width =
            "180px";

        note.style.minHeight =
            "120px";

        note.style.padding =
            "18px";

        note.style.background =
            "#fff3a6";

        note.style.boxShadow =
            "0 5px 15px rgba(0,0,0,0.15)";

        note.style.borderRadius =
            "8px";

        note.style.cursor =
            "move";

        note.style.pointerEvents =
            "auto";

        note.dataset.type =
            "sticky";

        note.dataset.objectId =
            id;

        objectLayer.appendChild(
            note
        );

        makeDraggable(
            note
        );


        if (
            socket?.connected
        ) {

            socket.emit(
                "object-add",
                {
                    id,
                    type: "sticky",
                    text:
                        text.trim(),
                    x: 250,
                    y: 150
                }
            );

        }

    }
);


// ============================================================
// SAVE LOCAL CACHE
// ============================================================

function saveLocalCache() {

    const key =
        getDocumentKey();

    if (!key) {
        return;
    }

    try {

        saveCurrentPage();

        const data = {

            pages,

            currentPage,

            zoom,

            title:
                document.getElementById(
                    "documentTitle"
                )?.value ||
                "Study Notes",

            canvasStyle:
                currentCanvasStyle

        };

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

    } catch (error) {

        console.warn(
            "Local cache failed:",
            error
        );

    }

}


// ============================================================
// LOAD LOCAL CACHE
// ============================================================

function loadLocalCache() {

    const key =
        getDocumentKey();

    if (!key) {
        return false;
    }

    try {

        const saved =
            localStorage.getItem(
                key
            );

        if (!saved) {
            return false;
        }

        const data =
            JSON.parse(saved);

        if (
            Array.isArray(
                data.pages
            ) &&
            data.pages.length
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

        if (
            data.canvasStyle
        ) {

            applyCanvasStyle(
                data.canvasStyle
            );

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

        loadPage(
            currentPage,
            false
        );

        updateZoom();

        return true;

    } catch (error) {

        console.warn(
            "Could not load local cache:",
            error
        );

        return false;

    }

}


// ============================================================
// SERVER STATE
// ============================================================

function getBoardState() {

    saveCurrentPage();

    return {

        pages,

        currentPage,

        zoom,

        canvasStyle:
            currentCanvasStyle,

        title:
            document.getElementById(
                "documentTitle"
            )?.value ||
            "Study Notes"

    };

}


// ============================================================
// SERVER STATE SYNC
// ============================================================

let syncTimer =
    null;


function scheduleServerStateSync() {

    saveLocalCache();

    if (
        !socket?.connected ||
        !serverReady ||
        isApplyingRemoteState
    ) {
        return;
    }

    clearTimeout(
        syncTimer
    );

    syncTimer =
        setTimeout(
            () => {

                const state =
                    getBoardState();

                socket.emit(
                    "save-board-state",
                    state
                );

            },
            250
        );

}


// ============================================================
// APPLY SERVER STATE
// ============================================================

function applyServerBoardState(
    state
) {

    if (!state) {
        return;
    }

    isApplyingRemoteState =
        true;

    try {

        if (
            Array.isArray(
                state.pages
            ) &&
            state.pages.length
        ) {

            pages =
                state.pages;

        }

        if (
            typeof state.currentPage ===
            "number"
        ) {

            currentPage =
                Math.min(
                    Math.max(
                        state.currentPage,
                        0
                    ),
                    pages.length - 1
                );

        }

        if (
            typeof state.zoom ===
            "number"
        ) {

            zoom =
                Math.min(
                    200,
                    Math.max(
                        50,
                        state.zoom
                    )
                );

        }

        if (
            state.canvasStyle
        ) {

            applyCanvasStyle(
                state.canvasStyle
            );

        }

        const titleInput =
            document.getElementById(
                "documentTitle"
            );

        if (
            titleInput &&
            state.title
        ) {

            titleInput.value =
                state.title;

        }

        loadPage(
            currentPage,
            false
        );

        updateZoom();

        saveLocalCache();

    } finally {

        isApplyingRemoteState =
            false;

    }

}


// ============================================================
// APPLY SERVER CANVAS
// ============================================================

function applyServerCanvasData(
    canvasData
) {

    if (!canvasData) {
        return;
    }

    if (
        !pages[currentPage]
    ) {
        return;
    }

    isApplyingRemoteState =
        true;

    pages[currentPage].canvasData =
        canvasData;

    restoreCanvas(
        canvasData
    );

    isApplyingRemoteState =
        false;

    saveLocalCache();

}


// ============================================================
// APPLY SERVER PAGES
// ============================================================

function applyServerPages(
    serverPages,
    serverCurrentPage,
    serverZoom,
    serverStyle
) {

    if (
        !Array.isArray(
            serverPages
        ) ||
        !serverPages.length
    ) {
        return;
    }

    isApplyingRemoteState =
        true;

    pages =
        serverPages;

    if (
        typeof serverCurrentPage ===
        "number"
    ) {

        currentPage =
            Math.min(
                Math.max(
                    serverCurrentPage,
                    0
                ),
                pages.length - 1
            );

    }

    if (
        typeof serverZoom ===
        "number"
    ) {

        zoom =
            Math.min(
                200,
                Math.max(
                    50,
                    serverZoom
                )
            );

    }

    if (serverStyle) {

        applyCanvasStyle(
            serverStyle
        );

    }

    loadPage(
        currentPage,
        false
    );

    updateZoom();

    isApplyingRemoteState =
        false;

    saveLocalCache();

}


// ============================================================
// SERVER READY
// ============================================================

if (socket) {

    socket.on(
        "board-ready",
        () => {

            serverReady =
                true;

            console.log(
                "Server board is ready."
            );

        }
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

        if (
            e.ctrlKey &&
            !e.shiftKey &&
            key === "z"
        ) {

            e.preventDefault();

            undoBtn?.click();

            return;

        }


        if (
            e.ctrlKey &&
            key === "y"
        ) {

            e.preventDefault();

            redoBtn?.click();

            return;

        }


        if (
            e.ctrlKey &&
            e.shiftKey &&
            key === "z"
        ) {

            e.preventDefault();

            redoBtn?.click();

            return;

        }


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


        if (key === "p") {
            drawBtn?.click();
        }

        if (key === "e") {
            eraserBtn?.click();
        }

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
// DOCUMENT TITLE SYNC
// ============================================================

const documentTitle =
    document.getElementById(
        "documentTitle"
    );

documentTitle?.addEventListener(
    "input",
    () => {

        scheduleServerStateSync();

    }
);


// ============================================================
// OPTIONAL STYLE SELECTORS
// ============================================================
//
// If your HTML contains:
// .canvas-style-option
//
// with:
// data-style="lines"
// data-style="grid"
// data-style="dots"
// data-style="blank"
//
// they will automatically work.
//

document
    .querySelectorAll(
        "[data-canvas-style]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const style =
                        button.dataset.canvasStyle;

                    applyCanvasStyle(
                        style
                    );

                    if (
                        socket?.connected
                    ) {

                        socket.emit(
                            "canvas-style",
                            {
                                style:
                                    currentCanvasStyle
                            }
                        );

                    }

                    scheduleServerStateSync();

                }
            );

        }
    );


// ============================================================
// AUTO SAVE LOCAL + SERVER
// ============================================================

setInterval(
    () => {

        saveLocalCache();

        if (
            socket?.connected &&
            serverReady
        ) {

            scheduleServerStateSync();

        }

    },
    10000
);


// ============================================================
// SAVE BEFORE LEAVE
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {

        saveLocalCache();

        if (
            socket?.connected &&
            serverReady
        ) {

            try {

                socket.emit(
                    "save-board-state",
                    getBoardState()
                );

            } catch (error) {

                console.warn(
                    "Could not send final state:",
                    error
                );

            }

        }

    }
);


// ============================================================
// INITIAL LOCAL LOAD
// ============================================================
//
// Important:
// This is ONLY a fallback.
// Once server sends board-state,
// server data overwrites this.
//

loadLocalCache();

updatePageNumber();

updateZoom();


// ============================================================
// DONE
// ============================================================

console.log(
    "LiveCanvas initialized successfully 🚀"
);

} // END CANVAS SAFETY