// ===========================
// THEME
// ===========================

const themeButtons = document.querySelectorAll(".theme-color");
const themeStatus = document.getElementById("themeStatus");

themeButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        document.body.classList.remove(
            "dark",
            "purple",
            "green",
            "ocean"
        );

        const theme = btn.dataset.theme;

        if (theme) {
            document.body.classList.add(theme);
        }

        if (themeStatus) {
            themeStatus.textContent = theme || "Light";
        }

        localStorage.setItem("theme", theme);

    });

});


// Load saved theme

const savedTheme = localStorage.getItem("theme");

if (savedTheme) {

    document.body.classList.add(savedTheme);

    if (themeStatus) {
        themeStatus.textContent = savedTheme;
    }

}


// ===========================
// AUTHENTICATION
// ===========================

const loginHeaderBtn =
    document.getElementById("loginHeaderBtn");

const signupHeaderBtn =
    document.getElementById("signupHeaderBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const welcomeUser =
    document.getElementById("welcomeUser");


// Get logged in user

const loggedInUser =
    JSON.parse(localStorage.getItem("loggedInUser"));


// ===========================
// USER LOGGED IN
// ===========================

if (loggedInUser) {

    welcomeUser.textContent =
        `Hi, ${loggedInUser.name} 👋`;

    loginHeaderBtn.style.display = "none";

    signupHeaderBtn.style.display = "none";

    logoutBtn.style.display = "block";

}


// ===========================
// USER NOT LOGGED IN
// ===========================

else {

    welcomeUser.textContent = "";

    loginHeaderBtn.style.display = "block";

    signupHeaderBtn.style.display = "block";

    logoutBtn.style.display = "none";

}


// ===========================
// LOGIN BUTTON
// ===========================

loginHeaderBtn.addEventListener("click", () => {

    window.location.href = "login.html";

});


// ===========================
// SIGNUP BUTTON
// ===========================

signupHeaderBtn.addEventListener("click", () => {

    window.location.href = "signup.html";

});


// ===========================
// LOGOUT
// ===========================

logoutBtn.addEventListener("click", () => {

    localStorage.removeItem("loggedInUser");

    window.location.href = "index.html";

});

const canvas = document.getElementById("drawingBoard");
const ctx = canvas.getContext("2d");

const drawBtn = document.getElementById("drawBtn");
const eraserBtn = document.getElementById("eraserBtn");
const highlighterBtn = document.getElementById("highlighterBtn");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");


// ===============================
// TOOL STATE
// ===============================

let currentTool = "pen";
let isDrawing = false;

let lastX = 0;
let lastY = 0;


// ===============================
// UNDO / REDO
// ===============================

let undoStack = [];
let redoStack = [];


// Save current canvas state
function saveState() {

    undoStack.push(canvas.toDataURL());

    // Prevent unlimited memory usage
    if (undoStack.length > 50) {
        undoStack.shift();
    }

    redoStack = [];
}


// Restore canvas from image
function restoreCanvas(data) {

    const image = new Image();

    image.onload = function () {

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
    };

    image.src = data;
}


// ===============================
// CANVAS POSITION
// ===============================

function getMousePosition(e) {

    const rect = canvas.getBoundingClientRect();

    return {

        x:
            (e.clientX - rect.left)
            * (canvas.width / rect.width),

        y:
            (e.clientY - rect.top)
            * (canvas.height / rect.height)

    };
}


// ===============================
// START DRAWING
// ===============================

function startDrawing(e) {

    isDrawing = true;

    const position = getMousePosition(e);

    lastX = position.x;
    lastY = position.y;

    saveState();

    ctx.beginPath();

    ctx.moveTo(
        lastX,
        lastY
    );
}


// ===============================
// DRAW
// ===============================

function draw(e) {

    if (!isDrawing) {
        return;
    }

    const position = getMousePosition(e);

    const currentX = position.x;
    const currentY = position.y;


    // -------------------------------
    // TOOL SETTINGS
    // -------------------------------

    ctx.lineWidth = brushSize.value;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";


    // PEN
    if (currentTool === "pen") {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha = 1;

        ctx.strokeStyle =
            colorPicker.value;
    }


    // HIGHLIGHTER
    else if (currentTool === "highlighter") {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha = 0.25;

        ctx.strokeStyle =
            colorPicker.value;

        ctx.lineWidth =
            brushSize.value * 3;
    }


    // ERASER
    else if (currentTool === "eraser") {

        ctx.globalCompositeOperation =
            "destination-out";

        ctx.globalAlpha = 1;

        ctx.lineWidth =
            brushSize.value * 2;
    }


    // -------------------------------
    // DRAW LINE
    // -------------------------------

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


    lastX = currentX;
    lastY = currentY;
}


// ===============================
// STOP DRAWING
// ===============================

function stopDrawing() {

    if (!isDrawing) {
        return;
    }

    isDrawing = false;

    ctx.closePath();

    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation =
        "source-over";
}


// ===============================
// TOOL SELECTION
// ===============================

drawBtn.addEventListener(
    "click",
    function () {

        currentTool = "pen";

        setActiveTool(drawBtn);
    }
);


highlighterBtn.addEventListener(
    "click",
    function () {

        currentTool = "highlighter";

        setActiveTool(highlighterBtn);
    }
);


eraserBtn.addEventListener(
    "click",
    function () {

        currentTool = "eraser";

        setActiveTool(eraserBtn);
    }
);


// ===============================
// ACTIVE TOOL UI
// ===============================

function setActiveTool(button) {

    document
        .querySelectorAll(
            "#drawBtn, #eraserBtn, #highlighterBtn"
        )
        .forEach(btn => {

            btn.classList.remove(
                "active-tool"
            );

        });

    button.classList.add(
        "active-tool"
    );
}


// Default tool
setActiveTool(drawBtn);


// ===============================
// MOUSE EVENTS
// ===============================

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


// ===============================
// TOUCH EVENTS
// ===============================

canvas.addEventListener(
    "touchstart",
    function (e) {

        e.preventDefault();

        const touch = e.touches[0];

        startDrawing(touch);

    }
);


canvas.addEventListener(
    "touchmove",
    function (e) {

        e.preventDefault();

        const touch = e.touches[0];

        draw(touch);

    }
);


canvas.addEventListener(
    "touchend",
    function (e) {

        e.preventDefault();

        stopDrawing();

    }
);


// ===============================
// COLOR
// ===============================

colorPicker.addEventListener(
    "input",
    function () {

        if (currentTool === "eraser") {

            currentTool = "pen";

            setActiveTool(drawBtn);

        }

    }
);


// ===============================
// UNDO
// ===============================

undoBtn.addEventListener(
    "click",
    function () {

        if (undoStack.length === 0) {
            return;
        }

        redoStack.push(
            canvas.toDataURL()
        );

        const previousState =
            undoStack.pop();

        restoreCanvas(
            previousState
        );

    }
);


// ===============================
// REDO
// ===============================

redoBtn.addEventListener(
    "click",
    function () {

        if (redoStack.length === 0) {
            return;
        }

        undoStack.push(
            canvas.toDataURL()
        );

        const nextState =
            redoStack.pop();

        restoreCanvas(
            nextState
        );

    }
);


// ===============================
// CLEAR
// ===============================

clearBtn.addEventListener(
    "click",
    function () {

        saveState();

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

    }
);