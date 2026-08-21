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

    const rect = notebookPage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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

                const tooltip =
                    document.createElement(
                        "span"
                    );

                tooltip.className =
                    "avatar-tooltip";

                tooltip.textContent =
                    cleanName;

                avatar.appendChild(
                    img
                );

                avatar.appendChild(
                    tooltip
                );

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
                myProfileIdx
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

            saveLocalCache();

        }
    );


    socket.on(
        "object-update",
        data => {

            updateObjectFromData(
                data
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

            pointer.style.left =
                `${data.x}px`;

            pointer.style.top =
                `${data.y}px`;

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

    broadcastCursorMove(e);
}


// ============================================================
// DRAW
// ============================================================

function draw(e) {

    if (!isDrawing) {
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

    saveLocalCache();

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

    if (index !== currentPage) {
        saveCurrentPage();
    }

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

        zoom,

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
            const localHasContent = pages.some(p => Boolean(p && p.canvasData));

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
            state.title &&
            state.title.trim() &&
            state.title !== "Study Notes"
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