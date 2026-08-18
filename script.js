// ============================================================
// LIVE CANVAS - COMPLETE SCRIPT
// BOARD + AUTH + SOCKET + CANVAS + TOOLS + SHAPES + PAGES
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
    const storedUser = localStorage.getItem("loggedInUser");

    if (storedUser) {
        loggedInUser = JSON.parse(storedUser);
    }
} catch (error) {
    console.error("Could not read loggedInUser:", error);
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
// AUTH UI
// ============================================================

function updateAuthUI() {

    if (loggedInUser) {

        if (welcomeUser) {
            welcomeUser.textContent =
                `Hi, ${loggedInUser.name || "User"} 👋`;
        }

        if (loginHeaderBtn) {
            loginHeaderBtn.style.display = "none";
        }

        if (signupHeaderBtn) {
            signupHeaderBtn.style.display = "none";
        }

        if (logoutBtn) {
            logoutBtn.style.display = "block";
        }

    } else {

        if (welcomeUser) {
            welcomeUser.textContent = "";
        }

        if (loginHeaderBtn) {
            loginHeaderBtn.style.display = "block";
        }

        if (signupHeaderBtn) {
            signupHeaderBtn.style.display = "block";
        }

        if (logoutBtn) {
            logoutBtn.style.display = "none";
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

if (loginHeaderBtn) {

    loginHeaderBtn.addEventListener("click", () => {

        window.location.href = "home.html";

    });

}


if (signupHeaderBtn) {

    signupHeaderBtn.addEventListener("click", () => {

        window.location.href = "signup.html";

    });

}


if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

        localStorage.removeItem("loggedInUser");

        

        if (socket) {
            socket.disconnect();
        }

        window.location.href = "login.html";

    });

}


// ============================================================
// COLLABORATORS
// ============================================================

function updateCollaborators(users = []) {

    const collaborators =
        document.getElementById("collaborators");

    const collaboratorList =
        document.getElementById("collaboratorList");

    if (!collaborators || !collaboratorList) {
        return;
    }

    collaboratorList
        .querySelectorAll(".avatar")
        .forEach(avatar => avatar.remove());

    if (!boardId) {

    collaborators.style.display = "none";
    return;

}

    collaborators.style.display = "flex";

    if (!Array.isArray(users)) {
        return;
    }

    const maxVisibleUsers = 4;

    users
        .slice(0, maxVisibleUsers)
        .forEach(username => {

            if (
                !username ||
                typeof username !== "string"
            ) {
                return;
            }

            const cleanName = username.trim();

            if (!cleanName) {
                return;
            }

            const avatar =
                document.createElement("span");

            avatar.className = "avatar";

            avatar.textContent =
                cleanName.charAt(0).toUpperCase();

            avatar.title = cleanName;

            collaboratorList.appendChild(avatar);

        });


    if (users.length > maxVisibleUsers) {

        const more =
            document.createElement("span");

        more.className = "avatar more";

        more.textContent =
            `+${users.length - maxVisibleUsers}`;

        more.title =
            `${users.length - maxVisibleUsers} more collaborators`;

        collaboratorList.appendChild(more);

    }

}


// ============================================================
// SOCKET.IO
// ============================================================

if (
    boardId &&
    loggedInUser &&
    typeof io === "function"
) {

    console.log("Connecting to board:", boardId);

    socket = io("http://127.0.0.1:3000");


    socket.on("connect", () => {

        console.log(
            "Connected to server:",
            socket.id
        );

        socket.emit(
            "join-room",
            boardId,
            loggedInUser.name || "User"
        );

    });


    socket.on("room-joined", data => {

    console.log("BOARD JOINED:", data);

    currentUsername =
        data.username ||
        loggedInUser.name ||
        "User";

    updateCollaborators(
        data.users || []
    );

});


    socket.on("user-joined", data => {

        console.log(
            `${data.username} joined`
        );

        updateCollaborators(
            data.users || []
        );

    });


    socket.on("user-left", data => {

        console.log(
            `${data.username} left`
        );

        updateCollaborators(
            data.users || []
        );

    });


    socket.on("connect_error", error => {

        console.error(
            "Socket connection failed:",
            error
        );

    });

}


// ============================================================
// SHARE ROOM
// ============================================================

const shareBtn =
    document.getElementById("shareBtn");

const boardCodeBtn =
    document.getElementById("boardCodeBtn");

const boardCodeElement =
    document.getElementById("boardCode");

if (boardCodeElement) {
    boardCodeElement.textContent = boardId || "Unavailable";
}

if (boardCodeBtn) {
    boardCodeBtn.addEventListener("click", async () => {
        if (!boardId) {
            return;
        }

        try {
            await navigator.clipboard.writeText(boardId);
            boardCodeBtn.textContent = "Copied";
            setTimeout(() => {
                boardCodeBtn.innerHTML = `Code: <span id="boardCode">${boardId}</span>`;
            }, 1200);
        } catch (error) {
            console.error("Could not copy board code:", error);
        }
    });
}

if (shareBtn) {

    shareBtn.addEventListener("click", async () => {

        if (!boardId) {
            alert("Board not found.");
            return;
        }

        const shareUrl =
            `${window.location.origin}${window.location.pathname}?board=${encodeURIComponent(boardId)}`;

        const shareMessage =
            `You have been invited to collaborate\nBoard code: ${boardId}\n${shareUrl}`;

        try {

            if (navigator.share) {

                await navigator.share({
                    title: "LiveCanvas Board",
                    text: shareMessage,
                    url: shareUrl
                });

            } else {

                await navigator.clipboard.writeText(
                    shareMessage
                );

            }

        } catch (error) {

            console.log("Share cancelled.");

        }

    });

}


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

const remotePointers = new Map();
const localPointerColor =
    pointerColors[Math.floor(Math.random() * pointerColors.length)];

function getPointerColor(socketId) {
    if (!remotePointers.has(socketId)) {
        const color = pointerColors[
            remotePointers.size % pointerColors.length
        ];
        remotePointers.set(socketId, { color });
    }
    return remotePointers.get(socketId).color;
}

function updatePointer(pointer, data, color) {
    pointer.style.left = `${data.x}px`;
    pointer.style.top = `${data.y}px`;
    pointer.style.setProperty("--pointer-color", color);
    pointer.dataset.username = data.username || "User";
    pointer.style.display = data.visible ? "block" : "none";
}

if (notebookPage && localCanvasPointer) {
    notebookPage.addEventListener("mousemove", event => {
        const bounds = notebookPage.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const data = { x, y, visible: true };

        updatePointer(
            localCanvasPointer,
            { ...data, username: currentUsername },
            localPointerColor
        );

        if (socket?.connected) {
            socket.emit("cursor-move", data);
        }
    });

    notebookPage.addEventListener("mouseleave", () => {
        localCanvasPointer.style.display = "none";
        if (socket?.connected) {
            socket.emit("cursor-move", { x: 0, y: 0, visible: false });
        }
    });
}

if (socket && canvasPointers) {
    socket.on("cursor-move", data => {
        if (!data?.socketId) return;

        let pointer = document.getElementById(`pointer-${data.socketId}`);
        if (!pointer) {
            pointer = document.createElement("div");
            pointer.id = `pointer-${data.socketId}`;
            pointer.className = "canvas-pointer remote-canvas-pointer";
            canvasPointers.appendChild(pointer);
        }

        updatePointer(pointer, data, getPointerColor(data.socketId));
    });
}


// ============================================================
// CANVAS SAFETY
// ============================================================

if (!canvas || !ctx || !notebookPage) {

    console.warn(
        "Canvas elements not found. Auth/header mode only."
    );

} else {


// ============================================================
// TOOL BUTTONS
// ============================================================

const drawBtn =
    document.getElementById("drawBtn");

const eraserBtn =
    document.getElementById("eraserBtn");

const highlighterBtn =
    document.getElementById("highlighterBtn");

const lightPenBtn =
    document.getElementById("lightPenBtn");

const selectTool =
    document.getElementById("selectTool");

const shapeBtn =
    document.getElementById("shapeBtn");

const textBtn =
    document.getElementById("textBtn");

const imageBtn =
    document.getElementById("imageBtn");

const stickyBtn =
    document.getElementById("stickyBtn");

const tableBtn =
    document.getElementById("tableBtn");


// ============================================================
// CONTROLS
// ============================================================

const colorPicker =
    document.getElementById("colorPicker");

const brushSize =
    document.getElementById("brushSize");

const undoBtn =
    document.getElementById("undoBtn");

const redoBtn =
    document.getElementById("redoBtn");

const clearBtn =
    document.getElementById("clearBtn");


// ============================================================
// PAGE CONTROLS
// ============================================================

const addPageBtn =
    document.getElementById("addPageBtn");

const previousPage =
    document.getElementById("previousPage");

const nextPage =
    document.getElementById("nextPage");

const extendPageBtn =
    document.getElementById("extendPageBtn");

const pageNumber =
    document.getElementById("pageNumber");


// ============================================================
// ZOOM
// ============================================================

const zoomIn =
    document.getElementById("zoomIn");

const zoomOut =
    document.getElementById("zoomOut");

const zoomValue =
    document.getElementById("zoomValue");


// ============================================================
// STATE
// ============================================================

let currentTool = "pen";

let isDrawing = false;

let lastX = 0;
let lastY = 0;

let currentStroke = [];

let undoStack = [];
let redoStack = [];

const MAX_HISTORY = 50;

let zoom = 100;


// ============================================================
// PAGES
// ============================================================

let pages = [

    {
        canvasData: null,
        height: 700
    }

];

let currentPage = 0;


// ============================================================
// CANVAS STYLE
// ============================================================

const VALID_CANVAS_STYLES = [
    "blank",
    "grid",
    "dots",
    "lines"
];

let currentCanvasStyle = "lines";


function normalizeCanvasStyle(style) {

    const safeStyle =
        typeof style === "string"
            ? style.trim().toLowerCase()
            : "lines";

    if (safeStyle === "plain") {
        return "blank";
    }

    return VALID_CANVAS_STYLES.includes(safeStyle)
        ? safeStyle
        : "lines";
}


function applyCanvasStyle(style) {

    currentCanvasStyle =
        normalizeCanvasStyle(style);

    notebookPage.setAttribute(
        "data-canvas-style",
        currentCanvasStyle
    );

    if (!paperBackground) {
        return;
    }

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


// ============================================================
// DOCUMENT KEY
// ============================================================

function getDocumentKey() {

    const currentBoardId =
        sessionStorage.getItem("currentBoardId") ||
        boardId;

    if (!currentBoardId) {
        return null;
    }

    return `liveCanvasDocument_${currentBoardId}`;
}


// ============================================================
// RESTORE STYLE
// ============================================================

function restoreCanvasStyleFromBoard() {

    const pendingCanvasStyle =
        sessionStorage.getItem("currentCanvasStyle");

    if (pendingCanvasStyle) {

        applyCanvasStyle(
            pendingCanvasStyle
        );

        sessionStorage.removeItem(
            "currentCanvasStyle"
        );

    }

    const storedBoardId =
        sessionStorage.getItem("currentBoardId");

    if (storedBoardId) {

        try {

            const savedBoards =
                JSON.parse(
                    localStorage.getItem(
                        "savedBoards"
                    ) || "[]"
                );

            const matchingBoard =
                savedBoards.find(
                    board =>
                        board.id === storedBoardId
                );

            if (matchingBoard) {

                applyCanvasStyle(
                    matchingBoard.canvasStyle ||
                    matchingBoard.template ||
                    "blank"
                );

                const titleInput =
                    document.getElementById(
                        "documentTitle"
                    );

                if (
                    titleInput &&
                    matchingBoard.name
                ) {

                    titleInput.value =
                        matchingBoard.name;

                }

                return;
            }

        } catch (error) {

            console.warn(
                "Could not restore board:",
                error
            );

        }

    }


    const documentKey =
        getDocumentKey();

    try {

        const savedDocument =
            JSON.parse(
                localStorage.getItem(
                    documentKey
                ) || "null"
            );

        if (
            savedDocument &&
            savedDocument.canvasStyle
        ) {

            applyCanvasStyle(
                savedDocument.canvasStyle
            );

            const titleInput =
                document.getElementById(
                    "documentTitle"
                );

            if (
                titleInput &&
                savedDocument.title
            ) {

                titleInput.value =
                    savedDocument.title;

            }

            return;
        }

    } catch (error) {

        console.warn(
            "Could not restore document:",
            error
        );

    }

    applyCanvasStyle("blank");
}


// ============================================================
// CANVAS SETUP
// ============================================================

function setupCanvas() {

    ctx.lineCap = "round";

    ctx.lineJoin = "round";

    ctx.lineWidth = 4;

    ctx.strokeStyle = "#172033";

    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation =
        "source-over";
}


// ============================================================
// INITIALIZE CANVAS
// ============================================================

function initializeCanvas() {

    const height =
        notebookPage.offsetHeight || 700;

    canvas.width =
        notebookPage.clientWidth || 1000;

    canvas.height =
        height;

    canvas.style.width = "100%";

    canvas.style.height = "100%";

    setupCanvas();
}


initializeCanvas();

restoreCanvasStyleFromBoard();


// ============================================================
// HISTORY
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

    const image = new Image();

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

    image.src = data;
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
        .forEach(btn => {

            btn.classList.remove(
                "active-tool"
            );

        });

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

    currentTool = tool;

    setActiveTool(button);

    canvas.style.cursor = cursor;

}


// ============================================================
// TOOL BUTTONS
// ============================================================

drawBtn?.addEventListener(
    "click",
    () => activateTool(
        "pen",
        drawBtn,
        "crosshair"
    )
);


eraserBtn?.addEventListener(
    "click",
    () => activateTool(
        "eraser",
        eraserBtn,
        "crosshair"
    )
);


highlighterBtn?.addEventListener(
    "click",
    () => activateTool(
        "highlighter",
        highlighterBtn,
        "crosshair"
    )
);


lightPenBtn?.addEventListener(
    "click",
    () => activateTool(
        "lightPen",
        lightPenBtn,
        "crosshair"
    )
);


selectTool?.addEventListener(
    "click",
    () => activateTool(
        "select",
        selectTool,
        "default"
    )
);


textBtn?.addEventListener(
    "click",
    () => activateTool(
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

    isDrawing = true;

    const position =
        getMousePosition(e);

    lastX = position.x;
    lastY = position.y;

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


    if (currentTool === "pen") {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha = 1;

        ctx.strokeStyle =
            colorPicker?.value ||
            "#172033";

        ctx.lineWidth =
            Number(
                brushSize?.value || 4
            );

    }


    else if (
        currentTool === "highlighter"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha = 0.28;

        ctx.strokeStyle =
            colorPicker?.value ||
            "#ffff00";

        ctx.lineWidth =
            Number(
                brushSize?.value || 4
            ) * 3;

    }


    else if (
        currentTool === "lightPen"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha = 0.18;

        ctx.strokeStyle =
            colorPicker?.value ||
            "#ffffff";

        ctx.lineWidth =
            Number(
                brushSize?.value || 4
            ) * 1.5;

    }


    else if (
        currentTool === "eraser"
    ) {

        ctx.globalCompositeOperation =
            "destination-out";

        ctx.globalAlpha = 1;

        ctx.lineWidth =
            Number(
                brushSize?.value || 4
            ) * 2;

    }


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


    // SOCKET DRAW
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
                        brushSize?.value || 4
                    ),

                tool: currentTool

            }
        );

    }


    lastX = currentX;
    lastY = currentY;

}


// ============================================================
// RECEIVE DRAW
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


            if (data.tool === "eraser") {

                ctx.globalCompositeOperation =
                    "destination-out";

                ctx.globalAlpha = 1;

                ctx.lineWidth =
                    (data.lineWidth || 4) * 2;

            }

            else if (
                data.tool === "highlighter"
            ) {

                ctx.globalCompositeOperation =
                    "source-over";

                ctx.globalAlpha = 0.28;

                ctx.lineWidth =
                    (data.lineWidth || 4) * 3;

            }

            else if (
                data.tool === "lightPen"
            ) {

                ctx.globalCompositeOperation =
                    "source-over";

                ctx.globalAlpha = 0.18;

                ctx.lineWidth =
                    (data.lineWidth || 4) * 1.5;

            }

            else {

                ctx.globalCompositeOperation =
                    "source-over";

                ctx.globalAlpha = 1;

                ctx.lineWidth =
                    data.lineWidth || 4;

            }


            ctx.strokeStyle =
                data.color ||
                "#172033";

            ctx.lineCap = "round";

            ctx.lineJoin = "round";

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

    isDrawing = false;

    ctx.closePath();

    if (
        currentTool === "lightPen"
    ) {

        createLightPenStroke(
            currentStroke
        );

    }

    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation =
        "source-over";

    currentStroke = [];

}


// ============================================================
// LIGHT PEN
// ============================================================

function createLightPenStroke(points) {

    if (
        !points ||
        points.length < 2
    ) {
        return;
    }

    const tempCanvas =
        document.createElement("canvas");

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCanvas.style.position =
        "absolute";

    tempCanvas.style.left = "0";
    tempCanvas.style.top = "0";

    tempCanvas.style.width = "100%";
    tempCanvas.style.height = "100%";

    tempCanvas.style.pointerEvents =
        "none";

    tempCanvas.style.zIndex = "20";

    const tempCtx =
        tempCanvas.getContext("2d");

    tempCtx.lineCap = "round";
    tempCtx.lineJoin = "round";

    tempCtx.strokeStyle =
        colorPicker?.value ||
        "#ffffff";

    tempCtx.lineWidth =
        Number(
            brushSize?.value || 4
        ) * 2;

    tempCtx.globalAlpha = 0.48;

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

    setTimeout(() => {

        tempCanvas.style.transition =
            "opacity 0.9s ease";

        tempCanvas.style.opacity = "0";

        setTimeout(
            () => tempCanvas.remove(),
            900
        );

    }, 2000);

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
// COLOR
// ============================================================

colorPicker?.addEventListener(
    "input",
    () => {

        if (
            currentTool === "eraser"
        ) {

            activateTool(
                "pen",
                drawBtn
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

        if (!undoStack.length) {
            return;
        }

        redoStack.push(
            canvas.toDataURL()
        );

        const previous =
            undoStack.pop();

        restoreCanvas(previous);

        saveCurrentPage();

    }
);


// ============================================================
// REDO
// ============================================================

redoBtn?.addEventListener(
    "click",
    () => {

        if (!redoStack.length) {
            return;
        }

        undoStack.push(
            canvas.toDataURL()
        );

        const next =
            redoStack.pop();

        restoreCanvas(next);

        saveCurrentPage();

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

        saveCurrentPage();

    }
);


// ============================================================
// SAVE PAGE
// ============================================================

function saveCurrentPage() {

    if (!pages[currentPage]) {
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

    currentPage = index;

    const page =
        pages[currentPage];

    notebookPage.style.height =
        `${page.height || 700}px`;

    canvas.width =
        notebookPage.clientWidth || 1000;

    canvas.height =
        page.height || 700;

    canvas.style.width = "100%";
    canvas.style.height = "100%";

    setupCanvas();

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    if (page.canvasData) {

        const image = new Image();

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

addPageBtn?.addEventListener(
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
            notebookPage.clientWidth || 1000;

        canvas.height = 700;

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


// ============================================================
// PREVIOUS PAGE
// ============================================================

previousPage?.addEventListener(
    "click",
    () => {

        if (currentPage > 0) {

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
            document.createElement("canvas");

        oldCanvas.width =
            canvas.width;

        oldCanvas.height =
            canvas.height;

        const oldCtx =
            oldCanvas.getContext("2d");

        oldCtx.drawImage(
            canvas,
            0,
            0
        );

        notebookPage.style.height =
            `${newHeight}px`;

        canvas.width =
            notebookPage.clientWidth || 1000;

        canvas.height =
            newHeight;

        canvas.style.width = "100%";
        canvas.style.height = "100%";

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

    }
);


// ============================================================
// TEXT TOOL
// ============================================================

canvas.addEventListener(
    "click",
    e => {

        if (
            currentTool !== "text"
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
// TEXT OBJECT
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
        document.createElement("div");

    element.textContent = text;

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

    element.dataset.type = "text";

    objectLayer.appendChild(
        element
    );

    makeDraggable(element);

}


// ============================================================
// DRAG OBJECT
// ============================================================

function makeDraggable(element) {

    let dragging = false;

    let offsetX = 0;
    let offsetY = 0;


    element.addEventListener(
        "mousedown",
        e => {

            if (
                currentTool !== "select"
            ) {
                return;
            }

            dragging = true;

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

            dragging = false;

        }
    );

}


// ============================================================
// SHAPE SYSTEM
// ============================================================

let selectedShape = null;

const shapePicker =
    document.getElementById("shapePicker");

const closeShapePicker =
    document.getElementById("closeShapePicker");


// ============================================================
// OPEN SHAPE PICKER
// ============================================================

shapeBtn?.addEventListener(
    "click",
    e => {

        e.stopPropagation();

        if (shapePicker) {

            shapePicker.classList.toggle(
                "show"
            );

        }

    }
);


// ============================================================
// CLOSE SHAPE PICKER
// ============================================================

closeShapePicker?.addEventListener(
    "click",
    () => {

        shapePicker?.classList.remove(
            "show"
        );

    }
);


// ============================================================
// SHAPE OPTIONS
// ============================================================

document
    .querySelectorAll(".shape-option")
    .forEach(button => {

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

                console.log(
                    "Selected shape:",
                    selectedShape
                );

            }
        );

    });


// ============================================================
// SHAPE START
// ============================================================

let shapeStart = null;


canvas.addEventListener(
    "mousedown",
    e => {

        if (
            currentTool !== "shape" ||
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
            currentTool !== "shape" ||
            !shapeStart ||
            !selectedShape
        ) {

            shapeStart = null;
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
                height
            );

        }

        shapeStart = null;

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
    height
) {

    if (!objectLayer) {
        return;
    }

    const shape =
        document.createElement("div");

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

    shape.style.border =
        `2px solid ${
            colorPicker?.value ||
            "#172033"
        }`;

    shape.style.cursor =
        "move";

    shape.style.pointerEvents =
        "auto";

    shape.dataset.type =
        shapeType;

    shape.dataset.shape =
        shapeType;


    // ========================================================
    // SHAPE STYLING
    // ========================================================

    if (shapeType === "circle") {

        shape.style.borderRadius =
            "50%";

    }

    else if (shapeType === "diamond") {

        shape.style.transform =
            "rotate(45deg)";

    }

    else if (shapeType === "triangle") {

        shape.style.border = "none";

        shape.style.width =
            "0px";

        shape.style.height =
            "0px";

        shape.style.borderLeft =
            `${width / 2}px solid transparent`;

        shape.style.borderRight =
            `${width / 2}px solid transparent`;

        shape.style.borderBottom =
            `${height}px solid ${
                colorPicker?.value ||
                "#172033"
            }`;

    }

    else if (shapeType === "parallelogram") {

        shape.style.transform =
            "skewX(-20deg)";

    }

    else if (shapeType === "heart") {

        shape.style.borderRadius =
            "50% 50% 0 0";

        shape.style.transform =
            "rotate(45deg)";

    }


    objectLayer.appendChild(
        shape
    );

    makeDraggable(shape);

}


// ============================================================
// IMAGE
// ============================================================

imageBtn?.addEventListener(
    "click",
    () => {

        const input =
            document.createElement("input");

        input.type = "file";

        input.accept = "image/*";

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

                reader.readAsDataURL(file);

            }
        );

        input.click();

    }
);


// ============================================================
// CREATE IMAGE
// ============================================================

function createImageObject(src) {

    if (!objectLayer) {
        return;
    }

    const image =
        document.createElement("img");

    image.src = src;

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

    makeDraggable(image);

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
            columns
        );

    }
);


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
        document.createElement("table");

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

    makeDraggable(table);

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

        const note =
            document.createElement("div");

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

        objectLayer.appendChild(
            note
        );

        makeDraggable(note);

    }
);


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
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
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
// SAVE DOCUMENT
// ============================================================

function saveDocument() {

    saveCurrentPage();

    const titleInput =
        document.getElementById(
            "documentTitle"
        );

    const documentData = {

        pages,

        currentPage,

        zoom,

        title:
            titleInput?.value ||
            "Study Notes",

        canvasStyle:
            currentCanvasStyle

    };

    const documentKey =
        getDocumentKey();

    try {

        localStorage.setItem(
            documentKey,
            JSON.stringify(documentData)
        );

    } catch (error) {

        console.error(
            "Could not save document:",
            error
        );
        if (!documentKey) {
    console.warn("No board ID. Document not saved.");
    return;
}

    }

}


// ============================================================
// LOAD DOCUMENT
// ============================================================

function loadDocument() {

    const documentKey =
        getDocumentKey();

    const saved =
        localStorage.getItem(
            documentKey
        );

    if (!saved) {
        updatePageNumber();
        updateZoom();
        return;
    }
        if (!documentKey) {
    updatePageNumber();
    updateZoom();
    return;
}

    try {

        const data =
            JSON.parse(saved);


        if (
            Array.isArray(data.pages) &&
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


        if (data.canvasStyle) {

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


        const page =
            pages[currentPage];

        notebookPage.style.height =
            `${page.height || 700}px`;

        canvas.width =
            notebookPage.clientWidth || 1000;

        canvas.height =
            page.height || 700;

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

            image.onload =
                () => {

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
// SAVE BEFORE LEAVE
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {

        saveDocument();

    }
);


// ============================================================
// LOAD
// ============================================================

loadDocument();


// ============================================================
// DONE
// ============================================================

console.log(
    "LiveCanvas initialized successfully 🚀"
);

} // END CANVAS SAFETY CHECK