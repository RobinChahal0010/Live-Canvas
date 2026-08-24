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

function getSavedBoardCanvasStyle() {

    if (!boardId) {
        return "blank";
    }

    try {

        const savedBoards = JSON.parse(
            localStorage.getItem("savedBoards") || "[]"
        );

        const board = savedBoards.find(
            item => String(item?.id || "").toUpperCase() === String(boardId).toUpperCase()
        );

        return typeof board?.canvasStyle === "string"
            ? board.canvasStyle
            : "blank";

    } catch (error) {

        return "blank";

    }

}

const savedBoardCanvasStyle = getSavedBoardCanvasStyle();

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

const userAvatarBtn =
    document.getElementById("userAvatarBtn");

const userProfileImg =
    document.getElementById("userProfileImg");

const userMenuDropdown =
    document.getElementById("userMenuDropdown");

const userMenuName =
    document.getElementById("userMenuName");

const userMenuEmail =
    document.getElementById("userMenuEmail");

const dropdownLogoutBtn =
    document.getElementById("dropdownLogoutBtn");

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
                "none";
        }

        let profileIdx =
            localStorage.getItem("userProfilePicIdx");

        if (!profileIdx) {
            profileIdx =
                String(Math.floor(Math.random() * 5) + 1);

            localStorage.setItem(
                "userProfilePicIdx",
                profileIdx
            );
        }

        if (userProfileImg) {
            userProfileImg.src =
                `assets/profile/${profileIdx}.png`;
        }

        if (userMenuName) {
            userMenuName.textContent =
                loggedInUser.name || loggedInUser.email || "User";
        }

        if (userMenuEmail) {
            userMenuEmail.textContent =
                loggedInUser.email || "";
        }

        if (userAvatarBtn) {
            userAvatarBtn.style.display =
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
                "none";
        }

    } else {

        if (userAvatarBtn) {
            userAvatarBtn.style.display =
                "none";
        }

        if (welcomeUser) {
            welcomeUser.textContent = "";
            welcomeUser.style.display = "none";
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
// HEADER BUTTONS & DROPDOWN
// ============================================================

userAvatarBtn?.addEventListener(
    "click",
    (e) => {
        e.stopPropagation();
        userMenuDropdown?.classList.toggle("show");
    }
);

document.addEventListener(
    "click",
    (e) => {
        if (userMenuDropdown && !userAvatarBtn?.contains(e.target)) {
            userMenuDropdown.classList.remove("show");
        }
    }
);

loginHeaderBtn?.addEventListener(
    "click",
    () => {
        window.location.href =
            "login.html";
    }
);

signupHeaderBtn?.addEventListener(
    "click",
    () => {
        window.location.href =
            "signup.html";
    }
);

function handleCanvasLogout() {
    localStorage.removeItem(
        "loggedInUser"
    );

    if (socket) {
        socket.disconnect();
    }

    window.location.href =
        "login.html";
}

dropdownLogoutBtn?.addEventListener(
    "click",
    handleCanvasLogout
);

logoutBtn?.addEventListener(
    "click",
    handleCanvasLogout
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

// The canvas bitmap is only the visible viewport.  Content lives in an
// unbounded world coordinate system and is redrawn through this camera.
const WORLD_GRID_SIZE = 28;
let camera = { x: 0, y: 0 };
// Cursor sync is initialized before the canvas tool block, so its shared
// camera scale must live here as well.
let zoom = 100;
let isPanningCanvas = false;
let panStart = null;
const canvasViewport = notebookPage?.parentElement;

const objectLayer =
    document.getElementById("objectLayer");

const canvasPointers =
    document.getElementById("canvasPointers");

const localCanvasPointer =
    document.getElementById("localCanvasPointer");


// ============================================================
// COLLABORATIVE CURSOR COLORS & PALETTE
// ============================================================

const COLLAB_COLORS = [
    "#9900ff", // Boop Purple
    "#ff0080", // Bubble Pink
    "#0070f3", // Vibrant Blue
    "#10b981", // Emerald Green
    "#ff6600", // Orange
    "#8b5cf6", // Violet
    "#06b6d4", // Cyan
    "#ec4899", // Rose
    "#f59e0b"  // Amber
];

function getCollabColor(str) {
    if (!str) return COLLAB_COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return COLLAB_COLORS[hash % COLLAB_COLORS.length];
}

const userAvatarMap = new Map();
let lastKnownUsersList = [];

function getUserAvatarIdx(name, fallbackIdx = 0) {
    if (!name) return 1;
    const clean = name.trim().toLowerCase();

    if (userAvatarMap.has(clean)) {
        return userAvatarMap.get(clean);
    }

    if (
        (loggedInUser && (clean === (loggedInUser.name || "").toLowerCase() || clean === (loggedInUser.email || "").toLowerCase())) ||
        clean === currentUsername.toLowerCase()
    ) {
        let stored = localStorage.getItem("userProfilePicIdx");
        if (!stored) {
            stored = String(Math.floor(Math.random() * 5) + 1);
            localStorage.setItem("userProfilePicIdx", stored);
        }
        userAvatarMap.set(clean, stored);
        return stored;
    }

    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = (hash * 37 + clean.charCodeAt(i) * 19) >>> 0;
    }
    let assigned = ((hash + Number(fallbackIdx || 0)) % 5) + 1;

    const myIdx = Number(localStorage.getItem("userProfilePicIdx") || 1);
    if (assigned === myIdx) {
        assigned = (myIdx % 5) + 1;
    }

    const assignedStr = String(assigned);
    userAvatarMap.set(clean, assignedStr);
    return assignedStr;
}

function syncLocalCursor() {
    if (typeof window.updateLocalCursor === "function") {
        const myCol = getCollabColor(currentUsername);
        window.updateLocalCursor(currentUsername, myCol);
    }
}

syncLocalCursor();

// Broadcast local cursor movement
let lastCursorEmit = 0;
const CURSOR_EMIT_INTERVAL = 25; // 25ms throttle

function broadcastCursorMove(e) {
    if (!notebookPage || !socket || !boardId) return;

    const x = (e.clientX - canvas.getBoundingClientRect().left - camera.x) / (zoom / 100);
    const y = (e.clientY - canvas.getBoundingClientRect().top - camera.y) / (zoom / 100);

    const now = performance.now();
    if (now - lastCursorEmit > CURSOR_EMIT_INTERVAL || (typeof isDrawing !== "undefined" && isDrawing)) {
        lastCursorEmit = now;
        if (socket.connected) {
            socket.emit("cursor-move", {
                x: Math.round(x),
                y: Math.round(y),
                username: currentUsername,
                color: getCollabColor(currentUsername)
            });
        }
    }
}

window.addEventListener("mousemove", broadcastCursorMove, { passive: true });
window.addEventListener("pointermove", broadcastCursorMove, { passive: true });

document.addEventListener("mouseleave", () => {
    if (socket && socket.connected && boardId) {
        socket.emit("cursor-leave");
    }
});


// ============================================================
// COLLABORATORS
// ============================================================

function updateCollaborators(
    users = []
) {

    lastKnownUsersList = users;

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

    collaboratorList.innerHTML = "";

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

    const userMap = new Map();
    const myName = (currentUsername || "").trim().toLowerCase();
    const loggedName = loggedInUser?.name ? loggedInUser.name.trim().toLowerCase() : "";
    const loggedEmail = loggedInUser?.email ? loggedInUser.email.trim().toLowerCase() : "";

    users.forEach((u, idx) => {
        if (!u) return;
        const name = typeof u === "string" ? u.trim() : (u.username || "").trim();
        if (!name) return;
        const cleanLower = name.toLowerCase();

        // Do not show local user's own profile picture in collaborator list
        if (cleanLower === myName || (loggedName && cleanLower === loggedName) || (loggedEmail && cleanLower === loggedEmail)) {
            return;
        }

        let pic = (typeof u === "object" && u.profileIdx) ? String(u.profileIdx) : null;
        if (pic) {
            userAvatarMap.set(cleanLower, pic);
        } else {
            pic = getUserAvatarIdx(name, idx);
        }
        if (!userMap.has(name)) {
            userMap.set(name, pic);
        }
    });

    const uniqueUsersList = Array.from(userMap.entries());
    const maxVisibleUsers = 5;

    uniqueUsersList
        .slice(
            0,
            maxVisibleUsers
        )
        .forEach(
            ([cleanName, picIdx]) => {

                const avatar =
                    document.createElement(
                        "div"
                    );

                avatar.className =
                    "avatar";

                const img =
                    document.createElement(
                        "img"
                    );

                img.src =
                    `assets/profile/${picIdx}.png`;

                img.alt =
                    cleanName;

                img.draggable =
                    false;

                img.className =
                    "avatar-img";

                img.onerror = function () {
                    this.style.display = "none";
                    avatar.textContent =
                        cleanName.charAt(0).toUpperCase();
                };

                avatar.appendChild(
                    img
                );

                avatar.addEventListener("mouseenter", () => {
                    let tip = document.getElementById("avatarGlobalTooltip");
                    if (!tip) {
                        tip = document.createElement("div");
                        tip.id = "avatarGlobalTooltip";
                        document.body.appendChild(tip);
                    }
                    const color = getCollabColor(cleanName);
                    tip.textContent = cleanName;
                    tip.style.background = color;
                    tip.style.boxShadow = `0 6px 20px ${color}66`;
                    const r = avatar.getBoundingClientRect();
                    tip.style.left = (r.left + r.width / 2) + "px";
                    tip.style.top = (r.bottom + 8) + "px";
                    tip.style.transform = "translateX(-50%)";
                    tip.classList.add("visible");
                });

                avatar.addEventListener("mouseleave", () => {
                    const tip = document.getElementById("avatarGlobalTooltip");
                    if (tip) tip.classList.remove("visible");
                });

                collaboratorList.appendChild(
                    avatar
                );

            }
        );

    if (
        uniqueUsersList.length >
        maxVisibleUsers
    ) {

        const more =
            document.createElement(
                "span"
            );

        more.className =
            "avatar more";

        more.textContent =
            `+${uniqueUsersList.length - maxVisibleUsers}`;

        more.title =
            `${uniqueUsersList.length - maxVisibleUsers} more collaborators`;

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

            const myProfileIdx =
                localStorage.getItem("userProfilePicIdx") || "1";

            socket.emit(
                "join-room",
                boardId,
                currentUsername,
                myProfileIdx,
                savedBoardCanvasStyle
            );

            socket.emit(
                "user-profile-sync",
                {
                    username: currentUsername,
                    profileIdx: myProfileIdx
                }
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

            const myProfileIdx =
                localStorage.getItem("userProfilePicIdx") || "1";

            socket.emit(
                "user-profile-sync",
                {
                    username: currentUsername,
                    profileIdx: myProfileIdx
                }
            );

            syncLocalCursor();

            updateCollaborators(
                data.users || []
            );

            // Server may send the existing board
            // immediately when joining.
            if (data.boardState || data.state) {

                applyServerBoardState(
                    data.boardState || data.state
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

    let remoteDrawSaveTimer = null;
    socket.on(
        "canvas-draw",
        data => {

            drawRemoteStroke(
                data
            );

            clearTimeout(remoteDrawSaveTimer);
            remoteDrawSaveTimer = setTimeout(() => {
                saveCurrentPage();
                saveLocalCache();
            }, 300);

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
                data.object || data,
                false
            );

            saveLocalCache();

        }
    );


    socket.on(
        "object-update",
        data => {

            updateObjectFromData(
                data.object || data
            );

            saveLocalCache();

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

            saveLocalCache();

        }
    );


    socket.on(
        "user-profile-sync",
        data => {
            if (data?.username && data?.profileIdx) {
                userAvatarMap.set(data.username.trim().toLowerCase(), String(data.profileIdx));
                if (Array.isArray(lastKnownUsersList) && lastKnownUsersList.length) {
                    updateCollaborators(lastKnownUsersList);
                }
            }
        }
    );


    // ========================================================
    // REMOTE CURSORS
    // ========================================================

    const remoteCursorMap = new Map();

    socket.on(
        "cursor-move",
        data => {

            if (!data?.socketId || !canvasPointers) {
                return;
            }

            let pointer =
                remoteCursorMap.get(data.socketId);

            if (!pointer || !pointer.parentElement) {

                pointer =
                    document.createElement(
                        "div"
                    );

                pointer.id =
                    `pointer-${data.socketId}`;

                pointer.className =
                    "remote-canvas-cursor";

                const userCol =
                    data.color ||
                    getCollabColor(data.username);

                pointer.style.color =
                    userCol;

                pointer.innerHTML = `
                    <svg class="cursor-pointer" viewBox="0 0 24 24" fill="none">
                        <path d="M4.15 2.5 L20.35 11.2 L12.8 12.8 L11.2 20.35 Z" fill="currentColor" stroke="white"
                            stroke-width="1.5" stroke-linejoin="round" />
                    </svg>
                    <div class="cursor-label" style="background-color: ${userCol};">${data.username || "Collaborator"}</div>
                `;

                canvasPointers.appendChild(
                    pointer
                );

                remoteCursorMap.set(
                    data.socketId,
                    pointer
                );

            }

            const userCol =
                data.color ||
                getCollabColor(data.username);

            pointer.style.color =
                userCol;

            const label =
                pointer.querySelector(
                    ".cursor-label"
                );

            if (label) {
                label.style.backgroundColor =
                    userCol;
                label.textContent =
                    data.username ||
                    "Collaborator";
            }

            pointer.dataset.worldX = data.x;
            pointer.dataset.worldY = data.y;

            const scale = zoom / 100;
            pointer.style.left = `${camera.x + data.x * scale}px`;
            pointer.style.top = `${camera.y + data.y * scale}px`;

            pointer.style.display =
                "flex";

            pointer.style.opacity =
                "1";

            if (pointer.fadeTimer) {
                clearTimeout(pointer.fadeTimer);
            }

            pointer.fadeTimer =
                setTimeout(() => {
                    pointer.style.opacity = "0";
                }, 4000);

        }
    );

    socket.on(
        "cursor-leave",
        data => {
            if (!data?.socketId) return;
            const pointer = remoteCursorMap.get(data.socketId);
            if (pointer) {
                pointer.style.display = "none";
            }
        }
    );

    socket.on(
        "user-left",
        data => {
            if (data?.socketId) {
                const pointer = remoteCursorMap.get(data.socketId);
                if (pointer) {
                    pointer.remove();
                    remoteCursorMap.delete(data.socketId);
                }
            }
            updateCollaborators(data?.users || []);
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

const toolSettingsPopover =
    document.getElementById("toolSettingsPopover");

const toolSettingsTitle =
    document.getElementById("toolSettingsTitle");

const toolColorOptions =
    document.getElementById("toolColorOptions");

const toolColorInput =
    document.getElementById("toolColorInput");

const toolWidthInput =
    document.getElementById("toolWidthInput");

const toolWidthValue =
    document.getElementById("toolWidthValue");

const toolWidthControl =
    document.getElementById("toolWidthControl");

document.querySelectorAll(".canvas-toolbar .tool[title]").forEach(button => {
    button.removeAttribute("title");
});

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

// Pointer events give the pen, eraser and highlighter one consistent input
// path for mouse, touch and stylus input.
let activePointerId =
    null;

let undoStack =
    [];

let redoStack =
    [];

const MAX_HISTORY =
    50;

let isApplyingRemoteState =
    false;

let serverReady =
    false;


// ============================================================
// PAGES
// ============================================================

let pages = [
    {
        drawings: [],
        objects: []
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

    // Keep the folder metadata aligned with later style changes so it remains
    // the correct fallback when this board is opened again.
    if (sync && boardId) {

        try {

            const savedBoards = JSON.parse(
                localStorage.getItem("savedBoards") || "[]"
            );

            const board = savedBoards.find(
                item => String(item?.id || "").toUpperCase() === String(boardId).toUpperCase()
            );

            if (board && board.canvasStyle !== currentCanvasStyle) {

                board.canvasStyle = currentCanvasStyle;
                localStorage.setItem(
                    "savedBoards",
                    JSON.stringify(savedBoards)
                );

            }

        } catch (error) {

            console.warn("Could not save the board canvas style:", error);

        }

    }

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

        paperBackground.dataset.backgroundColor = selected.backgroundColor;
        paperBackground.dataset.backgroundImage = selected.backgroundImage;
        updateInfiniteBackground();
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
        boardId ||
        sessionStorage.getItem(
            "currentBoardId"
        );

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

    const rect = canvasViewport?.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect?.width || 1));
    canvas.height = Math.max(1, Math.round(rect?.height || 1));

    if (!camera.initialized) {
        camera.x = canvas.width / 2;
        camera.y = canvas.height / 2;
        camera.initialized = true;
    }

    updateInfiniteBackground();
    renderWorld();
}


function updateInfiniteBackground() {

    if (!paperBackground) return;

    const scale = zoom / 100;
    const size = WORLD_GRID_SIZE * scale;
    const offset = value => ((value % size) + size) % size;

    paperBackground.style.backgroundColor =
        paperBackground.dataset.backgroundColor || "#ffffff";
    paperBackground.style.backgroundImage =
        paperBackground.dataset.backgroundImage || "none";

    if (currentCanvasStyle === "lines") {
        paperBackground.style.backgroundSize = `100% ${size}px`;
        paperBackground.style.backgroundPosition = `0 ${offset(camera.y)}px`;
    } else if (currentCanvasStyle === "grid" || currentCanvasStyle === "dots") {
        paperBackground.style.backgroundSize = `${size}px ${size}px`;
        paperBackground.style.backgroundPosition =
            `${offset(camera.x)}px ${offset(camera.y)}px`;
    } else {
        paperBackground.style.backgroundSize = "auto";
        paperBackground.style.backgroundPosition = "0 0";
    }
}

initializeCanvas();
window.addEventListener("resize", initializeCanvas);


// ============================================================
// HISTORY
// ============================================================

function saveState() {

    if (isApplyingRemoteState) {
        return;
    }

    undoStack.push(
        structuredClone(pages[currentPage]?.drawings || [])
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

function renderSegment(segment) {

    if (!segment) return;

    const tool = segment.tool || "pen";
    let lineWidth = Number(segment.lineWidth || 4);
    let alpha = 1;

    if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        lineWidth *= 2;
    } else if (tool === "highlighter") {
        alpha = 0.28;
        lineWidth *= 3;
    } else if (tool === "lightPen") {
        alpha = 0.18;
        lineWidth *= 1.5;
    }

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = segment.color || "#172033";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
}


function renderWorld() {

    if (!ctx || !canvas) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = zoom / 100;
    ctx.setTransform(scale, 0, 0, scale, camera.x, camera.y);

    const page = pages[currentPage];
    if (page?.legacyImage) {
        ctx.drawImage(page.legacyImage, 0, 0);
    }
    (page?.drawings || []).forEach(renderSegment);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    setupCanvas();
}


// Legacy bitmap boards are kept readable at world origin. New content is
// always stored as world-space drawing operations, never as a canvas bitmap.
function restoreCanvas(data) {
    if (!data) {
        renderWorld();
        return;
    }

    const image = new Image();
    image.onload = () => {
        if (pages[currentPage]) {
            pages[currentPage].legacyImage = image;
        }
        renderWorld();
    };
    image.src = data;
}


// ============================================================
// MOUSE POSITION
// ============================================================

function getMousePosition(e) {

    const rect =
        canvas.getBoundingClientRect();

    const scale = zoom / 100;

    return {

        x: (e.clientX - rect.left - camera.x) / scale,
        y: (e.clientY - rect.top - camera.y) / scale

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

    // Do not let a stroke started with the previous tool bleed into the newly
    // selected tool.
    if (isDrawing) {
        stopDrawing();
    }

    currentTool =
        tool;

    setActiveTool(
        button
    );

    canvas.style.cursor =
        cursor;

    if (notebookPage) {
        notebookPage.classList.toggle(
            "canvas-pan-ready",
            tool === "select"
        );
    }
}


function closeToolSettings() {
    toolSettingsPopover?.classList.remove("show");
    toolSettingsPopover?.setAttribute("aria-hidden", "true");
}


function openToolSettings(tool, button) {
    const isEraser = tool === "eraser";
    const isText = tool === "text";

    activateTool(tool, button, "crosshair");

    if (!toolSettingsPopover || !button) {
        return;
    }

    if (toolSettingsTitle) {
        toolSettingsTitle.textContent =
            `${isEraser ? "Eraser" : isText ? "Text" : tool === "highlighter" ? "Highlighter" : "Pen"} settings`;
    }

    toolColorOptions?.classList.toggle("is-hidden", isEraser);
    toolWidthControl?.classList.toggle("is-hidden", isText);

    if (toolWidthInput && brushSize) {
        toolWidthInput.value = brushSize.value;
    }

    if (toolWidthValue && brushSize) {
        toolWidthValue.textContent = brushSize.value;
    }

    if (toolColorInput && colorPicker) {
        toolColorInput.value = colorPicker.value;
    }

    updateActiveColorSwatch(colorPicker?.value);

    const rect = button.getBoundingClientRect();
    toolSettingsPopover.style.top =
        `${Math.min(window.innerHeight - 180, Math.max(76, rect.top))}px`;
    toolSettingsPopover.classList.add("show");
    toolSettingsPopover.setAttribute("aria-hidden", "false");
}


toolColorOptions?.addEventListener("click", e => {
    const swatch = e.target.closest("button[data-color]");
    if (!swatch || !colorPicker) return;

    colorPicker.value = swatch.dataset.color;
    toolColorInput && (toolColorInput.value = colorPicker.value);
    updateActiveColorSwatch(colorPicker.value);
});

toolColorInput?.addEventListener("input", () => {
    if (colorPicker) colorPicker.value = toolColorInput.value;
    updateActiveColorSwatch(toolColorInput.value);
});

function updateActiveColorSwatch(color) {
    const normalized = color?.toLowerCase();
    document.querySelectorAll(".tool-colors button[data-color]").forEach(swatch => {
        swatch.classList.toggle("is-selected", swatch.dataset.color.toLowerCase() === normalized);
    });

    const isPaletteColor = [...document.querySelectorAll(".tool-colors button[data-color]")]
        .some(swatch => swatch.dataset.color.toLowerCase() === normalized);
    toolColorInput?.closest(".tool-custom-color")?.classList.toggle("is-selected", !isPaletteColor);
}

toolWidthInput?.addEventListener("input", () => {
    if (brushSize) brushSize.value = toolWidthInput.value;
    if (toolWidthValue) toolWidthValue.textContent = toolWidthInput.value;
});

document.addEventListener("pointerdown", e => {
    if (
        toolSettingsPopover?.classList.contains("show") &&
        !toolSettingsPopover.contains(e.target) &&
        !e.target.closest("#drawBtn, #highlighterBtn, #eraserBtn, #textBtn")
    ) {
        closeToolSettings();
    }
});


// ============================================================
// INFINITE CANVAS VIEWPORT
// ============================================================

function updateCanvasViewport() {

    const scale = zoom / 100;

    // DOM objects share exactly the same world-to-screen transform as strokes.
    if (objectLayer) {
        objectLayer.style.transform =
            `translate(${camera.x}px, ${camera.y}px) scale(${scale})`;
    }

    document.querySelectorAll(".remote-canvas-cursor").forEach(pointer => {
        const x = Number(pointer.dataset.worldX);
        const y = Number(pointer.dataset.worldY);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            pointer.style.left = `${camera.x + x * scale}px`;
            pointer.style.top = `${camera.y + y * scale}px`;
        }
    });

    updateInfiniteBackground();
    renderWorld();
}


function panCanvasBy(deltaX, deltaY) {

    camera.x += deltaX;
    camera.y += deltaY;

    updateCanvasViewport();
}


function startCanvasPan(e) {

    if (
        currentTool !== "select" ||
        e.button !== 0 ||
        (
            e.target !== canvas &&
            e.target !== canvasViewport
        )
    ) {
        return;
    }

    isPanningCanvas = true;
    panStart = {
        x: e.clientX,
        y: e.clientY
    };

    notebookPage?.classList.add("is-panning-canvas");
    e.preventDefault();
}


function moveCanvasPan(e) {

    if (!isPanningCanvas || !panStart) {
        return;
    }

    panCanvasBy(
        e.clientX - panStart.x,
        e.clientY - panStart.y
    );

    panStart = {
        x: e.clientX,
        y: e.clientY
    };
}


function stopCanvasPan() {

    if (!isPanningCanvas) {
        return;
    }

    isPanningCanvas = false;
    panStart = null;
    notebookPage?.classList.remove("is-panning-canvas");
}


canvasViewport?.addEventListener("mousedown", startCanvasPan);
window.addEventListener("mousemove", moveCanvasPan);
window.addEventListener("mouseup", stopCanvasPan);

canvasViewport?.addEventListener(
    "touchstart",
    e => {

        if (
            currentTool !== "select" ||
            !e.touches[0] ||
            (e.target !== canvas && e.target !== canvasViewport)
        ) {
            return;
        }

        const touch = e.touches[0];
        isPanningCanvas = true;
        panStart = { x: touch.clientX, y: touch.clientY };
        notebookPage?.classList.add("is-panning-canvas");
    },
    { passive: false }
);

canvasViewport?.addEventListener(
    "touchmove",
    e => {

        if (!isPanningCanvas || !e.touches[0]) {
            return;
        }

        e.preventDefault();
        moveCanvasPan(e.touches[0]);
    },
    { passive: false }
);

canvasViewport?.addEventListener("touchend", stopCanvasPan);
canvasViewport?.addEventListener("touchcancel", stopCanvasPan);

canvasViewport?.addEventListener(
    "wheel",
    e => {

        if (currentTool !== "select") {
            return;
        }

        e.preventDefault();

        const horizontalDelta = e.shiftKey && !e.deltaX
            ? e.deltaY
            : e.deltaX;

        panCanvasBy(-horizontalDelta, -e.deltaY);
    },
    { passive: false }
);


// ============================================================
// TOOL BUTTONS
// ============================================================

drawBtn?.addEventListener(
    "click",
    () => openToolSettings("pen", drawBtn)
);

eraserBtn?.addEventListener(
    "click",
    () => openToolSettings("eraser", eraserBtn)
);

highlighterBtn?.addEventListener(
    "click",
    () => openToolSettings("highlighter", highlighterBtn)
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
    () => openToolSettings("text", textBtn)
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

    activePointerId =
        e.pointerId ?? null;

    if (e.pointerId != null) {
        canvas.setPointerCapture?.(e.pointerId);
    }

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

    broadcastCursorMove(e);
}


// ============================================================
// DRAW
// ============================================================

function draw(e) {

    if (
        !isDrawing ||
        (
            activePointerId != null &&
            e.pointerId != null &&
            e.pointerId !== activePointerId
        )
    ) {
        return;
    }

    broadcastCursorMove(e);

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


    const segment = {
        x1: lastX,
        y1: lastY,
        x2: currentX,
        y2: currentY,
        color,
        lineWidth: Number(brushSize?.value || 4),
        tool: currentTool,
        alpha
    };

    pages[currentPage].drawings ||= [];
    pages[currentPage].drawings.push(segment);
    renderWorld();


    // ========================================================
    // REAL-TIME SOCKET SYNC
    // ========================================================

    if (
        socket?.connected
    ) {

        socket.emit(
            "canvas-draw",
            { ...segment, pageIndex: currentPage }
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

    if (!data) return;

    const pageIndex = Number.isInteger(data.pageIndex)
        ? data.pageIndex
        : currentPage;

    if (!pages[pageIndex]) return;

    pages[pageIndex].drawings ||= [];
    pages[pageIndex].drawings.push(data);

    if (pageIndex === currentPage) renderWorld();
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

    if (
        activePointerId != null &&
        canvas.hasPointerCapture?.(activePointerId)
    ) {
        canvas.releasePointerCapture?.(activePointerId);
    }

    activePointerId =
        null;

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

    saveLocalCache();

    scheduleServerStateSync();
}


// ============================================================
// LIGHT PEN
// ============================================================

function createLightPenStroke(
    points
) {
    // Light-pen opacity is rendered from its world-space segments. A temporary
    // screen-space overlay would drift when the camera moves, so none is used.
    return points;
}


// ============================================================
// CANVAS INPUT
// ============================================================

canvas.addEventListener(
    "pointerdown",
    e => {

        if (e.button !== undefined && e.button !== 0) {
            return;
        }

        e.preventDefault();
        startDrawing(e);
    }
);

canvas.addEventListener(
    "pointermove",
    e => {
        if (isDrawing) {
            e.preventDefault();
        }
        draw(e);
    }
);

canvas.addEventListener(
    "pointerup",
    stopDrawing
);

canvas.addEventListener(
    "pointercancel",
    stopDrawing
);

canvas.addEventListener(
    "lostpointercapture",
    stopDrawing
);





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

        redoStack.push(structuredClone(pages[currentPage]?.drawings || []));

        const previous =
            undoStack.pop();

        pages[currentPage].drawings = previous;
        renderWorld();

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

        undoStack.push(structuredClone(pages[currentPage]?.drawings || []));

        const next =
            redoStack.pop();

        pages[currentPage].drawings = next;
        renderWorld();

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

    pages[currentPage].drawings ||= [];
    pages[currentPage].objects = Array.from(objectLayer?.children || [])
        .filter(element => element.dataset.objectId)
        .map(getObjectData)
        .filter(Boolean);

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

    if (index !== currentPage) {
        saveCurrentPage();
    }

    currentPage =
        index;

    const page = pages[currentPage];
    page.drawings ||= [];
    page.objects ||= [];

    objectLayer.innerHTML = "";
    page.objects.forEach(object => createObjectFromData(object, false));
    if (page.canvasData && !page.legacyImage) {
        restoreCanvas(page.canvasData);
    } else {
        renderWorld();
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

        pages.push({ drawings: [], objects: [] });

        currentPage =
            pages.length - 1;

        loadPage(currentPage, false);

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
        // Kept for backward-compatible UI: the world has no page boundary.
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

    updateCanvasViewport();

}


zoomIn?.addEventListener(
    "click",
    () => {

        setZoom(Math.min(200, zoom + 10));

        updateZoom();

        // Zoom is a viewer preference, not shared board state.
        saveLocalCache();

    }
);


zoomOut?.addEventListener(
    "click",
    () => {

        setZoom(Math.max(50, zoom - 10));

        updateZoom();

        // Zoom is a viewer preference, not shared board state.
        saveLocalCache();

    }
);


function setZoom(nextZoom, anchorX, anchorY) {

    const rect = canvas.getBoundingClientRect();
    const focusX = anchorX ?? rect.width / 2;
    const focusY = anchorY ?? rect.height / 2;
    const oldScale = zoom / 100;
    const worldX = (focusX - camera.x) / oldScale;
    const worldY = (focusY - camera.y) / oldScale;

    zoom = nextZoom;

    const newScale = zoom / 100;
    camera.x = focusX - worldX * newScale;
    camera.y = focusY - worldY * newScale;
}


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

        createInlineTextEditor(position.x, position.y);

    }
);


function createInlineTextEditor(x, y) {
    const element = createTextObject("", x, y, false);
    if (!element) return;

    element.contentEditable = "true";
    element.spellcheck = false;
    element.dataset.isEditing = "true";
    element.style.minWidth = "120px";
    element.style.outline = "2px solid #8b5cf6";
    element.style.borderRadius = "4px";
    element.style.cursor = "text";
    element.focus();

    const finish = () => {
        if (element.dataset.isEditing !== "true") return;

        element.dataset.isEditing = "false";
        const text = element.textContent.trim();
        if (!text) {
            element.remove();
            return;
        }

        element.textContent = text;
        element.contentEditable = "false";
        element.style.minWidth = "";
        element.style.outline = "";
        element.style.cursor = "move";

        if (socket?.connected) {
            socket.emit("object-add", {
                id: element.dataset.objectId,
                type: "text",
                text,
                x,
                y,
                fontSize: "22px",
                fontFamily: "Poppins, sans-serif",
                color: element.style.color
            });
        }

        saveLocalCache();
        scheduleServerStateSync();
        activateTool("select", selectTool, "default");
    };

    element.addEventListener("blur", finish, { once: true });
    element.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            element.textContent = "";
            element.blur();
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            element.blur();
        }
    });
}


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

    const x = Number(
        element.dataset.worldX ?? parseFloat(element.style.left) ?? 0
    );

    const y = Number(
        element.dataset.worldY ?? parseFloat(element.style.top) ?? 0
    );

    return {

        id:
            element.dataset.objectId,

        type:
            element.dataset.type ||
            "object",

        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,

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

let selectedCanvasObject = null;

function selectCanvasObject(element) {
    selectedCanvasObject?.classList.remove("is-selected-object");
    selectedCanvasObject = element;
    selectedCanvasObject?.classList.add("is-selected-object");
}

function deleteSelectedCanvasObject() {
    if (!selectedCanvasObject || !["image", "text", "sticky"].includes(selectedCanvasObject.dataset.type)) return;

    const id = selectedCanvasObject.dataset.objectId;
    selectedCanvasObject.remove();
    selectedCanvasObject = null;

    if (socket?.connected && id) socket.emit("object-delete", { id });
    saveLocalCache();
    scheduleServerStateSync();
}

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

            // Select mode treats sticky notes like every other object: one
            // press selects it and a drag repositions it on the canvas.
            selectCanvasObject(element);

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

            const pointer = getMousePosition(e);
            const scale = zoom / 100;
            const x = pointer.x - (offsetX / scale);
            const y = pointer.y - (offsetY / scale);

            element.dataset.worldX = x;
            element.dataset.worldY = y;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;

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

            // Keep a moved note available after a refresh and include it in
            // the next full board-state synchronization.
            saveLocalCache();
            scheduleServerStateSync();

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

    if (data.type === "sticky") {
        createStickyNote(
            data.text || "",
            Number(data.x) || 0,
            Number(data.y) || 0,
            sync,
            data.id
        );
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

        element.dataset.worldX = Number(data.x);
        element.style.left =
            `${Number(data.x)}px`;

    }

    if (
        data.y !== undefined
    ) {

        element.dataset.worldY = Number(data.y);
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

const shapeColorPicker =
    document.getElementById(
        "shapeColorPicker"
    );

// The picker starts in the left tool rail. Move it to the document layer so
// the rail's scrolling cannot hide it when opened.
if (shapePicker && shapePicker.parentElement !== document.body) {
    document.body.appendChild(shapePicker);
}


shapeBtn?.addEventListener(
    "click",
    e => {

        e.stopPropagation();

        if (!shapePicker) return;

        const opening = !shapePicker.classList.contains("show");
        if (opening) {
            const rect = shapeBtn.getBoundingClientRect();
            shapePicker.style.top = `${Math.min(window.innerHeight - 250, Math.max(76, rect.top))}px`;
        }
        shapePicker.classList.toggle("show", opening);

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
    "pointerdown",
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
    "pointerup",
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

        const shapeWidth = selectedShape === "square"
            ? Math.max(width, height)
            : width;

        const shapeHeight = selectedShape === "square"
            ? shapeWidth
            : height;

        if (
            shapeWidth >= 5 &&
            shapeHeight >= 5
        ) {

            createShape(
                selectedShape,
                x,
                y,
                shapeWidth,
                shapeHeight,
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
        shapeColorPicker?.value ||
        "#000000";

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
// STICKY NOTE
// ============================================================

function createStickyNote(text = "", x = 20, y = 20, sync = true, id = generateObjectId()) {
    if (!objectLayer) return null;

    const note = document.createElement("div");
    note.className = "sticky-note";
    note.textContent = text;
    note.contentEditable = "true";
    note.spellcheck = true;
    note.style.left = `${x}px`;
    note.style.top = `${y}px`;
    note.dataset.type = "sticky";
    note.dataset.objectId = id;
    objectLayer.appendChild(note);

    note.addEventListener("pointerenter", () => {
        note.style.cursor = "text";
    });

    note.addEventListener("input", () => {
        const data = getObjectData(note);
        if (socket?.connected && data) socket.emit("object-update", data);
        saveLocalCache();
        scheduleServerStateSync();
    });

    makeDraggable(note);

    if (sync && socket?.connected) {
        socket.emit("object-add", { id, type: "sticky", text, x, y, width: 180, height: 120 });
    }

    return note;
}

stickyBtn?.addEventListener("click", () => {
    const note = createStickyNote("", 20, 20);
    if (note) note.focus();
});


// ============================================================
// BOARD NAME HELPER
// ============================================================

function getInitialBoardName() {
    let name = sessionStorage.getItem("currentBoardName");
    if (name && name.trim()) return name.trim();

    try {
        const saved = JSON.parse(localStorage.getItem("savedBoards") || "[]");
        const found = saved.find(b => String(b.id || "").toUpperCase() === String(boardId || "").toUpperCase());
        if (found && found.name && found.name.trim()) {
            return found.name.trim();
        }
    } catch (e) {}

    return boardId ? `Board ${boardId}` : "Untitled Board";
}


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

        const currentTitle =
            document.getElementById("documentTitle")?.value ||
            getInitialBoardName();

        const data = {

            boardId,

            pages,

            currentPage,

            zoom,

            title: currentTitle,

            canvasStyle:
                currentCanvasStyle,

            savedAt: Date.now()

        };

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

        if (boardId) {
            try {
                const boards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
                const idx = boards.findIndex(b => b.id === boardId);
                if (idx !== -1) {
                    boards[idx].name = currentTitle;
                    boards[idx].updated = Date.now();
                    localStorage.setItem('savedBoards', JSON.stringify(boards));
                } else {
                    boards.unshift({
                        id: boardId,
                        name: currentTitle,
                        created: Date.now(),
                        updated: Date.now()
                    });
                    localStorage.setItem('savedBoards', JSON.stringify(boards));
                }
            } catch (e) {}
        }

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

    const titleInput =
        document.getElementById(
            "documentTitle"
        );

    if (titleInput && !titleInput.value) {
        titleInput.value = getInitialBoardName();
        resizeDocumentTitle();
    }

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

        if (
            titleInput &&
            data.title &&
            data.title !== "Study Notes"
        ) {

            titleInput.value =
                data.title;
            resizeDocumentTitle();

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

        boardId,

        pages,

        currentPage,

        canvasStyle:
            currentCanvasStyle,

        title:
            document.getElementById(
                "documentTitle"
            )?.value ||
            getInitialBoardName()

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

                socket.emit(
                    "document-state",
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

            const serverHasContent = state.pages.some(p => Boolean(p && (p.canvasData || (p.drawings && p.drawings.length) || (p.objects && p.objects.length))));
            const localHasContent = pages.some(
                p => Boolean(p && (p.canvasData || (p.drawings && p.drawings.length) || (p.objects && p.objects.length)))
            );

            if (serverHasContent || !localHasContent) {
                pages = state.pages;
            }

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
            state.title &&
            state.title.trim() &&
            state.title !== "Study Notes"
        ) {

            titleInput.value =
                state.title;
            resizeDocumentTitle();

        }

        loadPage(
            currentPage,
            false
        );

        updateZoom();

        saveLocalCache();

        if (localHasContent && !serverHasContent) {
            scheduleServerStateSync();
        }

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

        if (key === "delete" || key === "backspace") {
            e.preventDefault();
            deleteSelectedCanvasObject();
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
        resizeDocumentTitle();
        scheduleServerStateSync();

    }
);

function resizeDocumentTitle() {
    const titleInput = document.getElementById("documentTitle");
    if (!titleInput) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const styles = window.getComputedStyle(titleInput);
    context.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
    const text = titleInput.value || titleInput.placeholder || "Board name";
    titleInput.style.width = `${Math.min(260, Math.max(18, Math.ceil(context.measureText(text).width + 8)))}px`;
}

resizeDocumentTitle();


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

// A newly created board has no local cache yet. Apply the style saved with its
// folder while the server creates the board for the first time.
applyCanvasStyle(savedBoardCanvasStyle, false);

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
