/* =========================================
   LIVE ROOM
========================================= */

const urlParams = new URLSearchParams(window.location.search);

const roomId = urlParams.get("room");

console.log("Current Room ID:", roomId);

let socket = null;

let currentUsername = "Guest";


/* =========================================
   CONNECT TO ROOM
========================================= */

if (roomId && typeof io !== "undefined") {

    socket = io();

    socket.on("connect", () => {

        console.log(
            "Connected to LiveCanvas server:",
            socket.id
        );

        socket.emit(
            "join-room",
            roomId,
            currentUsername
        );

    });

    socket.on("room-joined", (data) => {

        console.log(
            "Joined room:",
            data.roomId
        );

        console.log(
            "Users in room:",
            data.userCount
        );

    });

    socket.on("user-joined", (data) => {

        console.log(
            `${data.username} joined the room`
        );

        console.log(
            "Users:",
            data.userCount
        );

    });

    socket.on("user-left", (data) => {

        console.log(
            `${data.username} left the room`
        );

        console.log(
            "Users:",
            data.userCount
        );

    });

}
// ============================================================
// LIVE CANVAS
// Complete Application JavaScript
// ============================================================


// ============================================================
// THEME
// ============================================================

const themeButtons =
    document.querySelectorAll(".theme-color");

const themeStatus =
    document.getElementById("themeStatus");


themeButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        document.body.classList.remove(
            "dark",
            "purple",
            "green",
            "ocean"
        );

        const theme =
            btn.dataset.theme;

        if (theme) {
            document.body.classList.add(theme);
        }

        if (themeStatus) {
            themeStatus.textContent =
                theme || "Light";
        }

        localStorage.setItem(
            "theme",
            theme || ""
        );

    });

});


// Load saved theme

const savedTheme =
    localStorage.getItem("theme");

if (savedTheme) {

    document.body.classList.add(
        savedTheme
    );

    if (themeStatus) {
        themeStatus.textContent =
            savedTheme;
    }

}


// ============================================================
// AUTHENTICATION
// ============================================================

const loginHeaderBtn =
    document.getElementById("loginHeaderBtn");

const signupHeaderBtn =
    document.getElementById("signupHeaderBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const welcomeUser =
    document.getElementById("welcomeUser");


const loggedInUser =
    JSON.parse(
        localStorage.getItem(
            "loggedInUser"
        )
    );


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


// Login

if (loginHeaderBtn) {

    loginHeaderBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "login.html";

        }
    );

}


// Signup

if (signupHeaderBtn) {

    signupHeaderBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "signup.html";

        }
    );

}


// Logout

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "loggedInUser"
            );

            window.location.href =
                "index.html";

        }
    );

}


// ============================================================
// CANVAS
// ============================================================

const canvas =
    document.getElementById(
        "drawingBoard"
    );

const ctx =
    canvas.getContext("2d");


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


const notebookPage =
    document.getElementById(
        "notebookPage"
    );

const objectLayer =
    document.getElementById(
        "objectLayer"
    );


// ============================================================
// STATE
// ============================================================

let currentTool =
    "pen";

let isDrawing =
    false;

let lastX = 0;
let lastY = 0;

let currentStroke = [];


// ============================================================
// HISTORY
// ============================================================

let undoStack = [];
let redoStack = [];

const MAX_HISTORY = 50;


// ============================================================
// CANVAS INITIALIZATION
// ============================================================

function setupCanvas() {

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.lineWidth = 4;

    ctx.strokeStyle =
        "#172033";

    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation =
        "source-over";

}

setupCanvas();


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
            (e.clientX - rect.left)
            *
            (
                canvas.width /
                rect.width
            ),

        y:
            (e.clientY - rect.top)
            *
            (
                canvas.height /
                rect.height
            )

    };

}


// ============================================================
// TOOL ACTIVATION
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


// ============================================================
// PEN
// ============================================================

if (drawBtn) {

    drawBtn.addEventListener(
        "click",
        () => {

            currentTool =
                "pen";

            setActiveTool(
                drawBtn
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

            currentTool =
                "highlighter";

            setActiveTool(
                highlighterBtn
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

            currentTool =
                "lightPen";

            setActiveTool(
                lightPenBtn
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

            currentTool =
                "eraser";

            setActiveTool(
                eraserBtn
            );

        }
    );

}


// ============================================================
// SELECT TOOL
// ============================================================

if (selectTool) {

    selectTool.addEventListener(
        "click",
        () => {

            currentTool =
                "select";

            setActiveTool(
                selectTool
            );

        }
    );

}


// ============================================================
// START DRAWING
// ============================================================

function startDrawing(e) {

    if (
        currentTool ===
        "select"
    ) {
        return;
    }


    if (
        currentTool ===
        "text"
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


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";


    // ========================================================
    // PEN
    // ========================================================

    if (
        currentTool ===
        "pen"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            1;

        ctx.strokeStyle =
            colorPicker.value;

        ctx.lineWidth =
            Number(
                brushSize.value
            );

    }


    // ========================================================
    // HIGHLIGHTER
    // ========================================================

    else if (
        currentTool ===
        "highlighter"
    ) {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            0.28;

        ctx.strokeStyle =
            colorPicker.value;

        ctx.lineWidth =
            Number(
                brushSize.value
            ) * 3;

    }


    // ========================================================
    // LIGHT PEN
    // ========================================================

    else if (
        currentTool ===
        "lightPen"
    ) {

        /*
         * Light Pen is intentionally subtle.
         * The actual temporary stroke is created
         * separately when the drawing ends.
         */

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            0.18;

        ctx.strokeStyle =
            colorPicker.value;

        ctx.lineWidth =
            Number(
                brushSize.value
            ) * 1.5;

    }


    // ========================================================
    // ERASER
    // ========================================================

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
                brushSize.value
            ) * 2;

    }


    // ========================================================
    // DRAW
    // ========================================================

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


    lastX =
        currentX;

    lastY =
        currentY;

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


    /*
     * Light Pen:
     *
     * Normal temporary preview is removed
     * and a dedicated fading stroke appears.
     */

    if (
        currentTool ===
        "lightPen"
    ) {

        eraseLastLightPenPreview();

        createLightPenStroke(
            currentStroke
        );

    }


    ctx.globalAlpha =
        1;

    ctx.globalCompositeOperation =
        "source-over";


    currentStroke = [];

}


// ============================================================
// LIGHT PEN PREVIEW CLEANUP
// ============================================================

function eraseLastLightPenPreview() {

    /*
     * The actual temporary light pen stroke
     * is drawn on its own overlay.
     *
     * No action required here because the
     * permanent canvas only receives the
     * subtle preview.
     */

}


// ============================================================
// CREATE TEMPORARY LIGHT PEN
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
        colorPicker.value;

    tempCtx.lineWidth =
        Number(
            brushSize.value
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


    // ========================================================
    // HOLD FOR 2 SECONDS
    // ========================================================

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

        const touch =
            e.touches[0];

        startDrawing(
            touch
        );

    }
);


canvas.addEventListener(
    "touchmove",
    e => {

        e.preventDefault();

        const touch =
            e.touches[0];

        draw(
            touch
        );

    }
);


canvas.addEventListener(
    "touchend",
    e => {

        e.preventDefault();

        stopDrawing();

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

                currentTool =
                    "pen";

                setActiveTool(
                    drawBtn
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
                undoStack.length ===
                0
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
                redoStack.length ===
                0
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

        }
    );

}


// ============================================================
// PAGE SYSTEM
// ============================================================

let pages = [];

let currentPage =
    0;


// Create first page

pages.push({

    canvasData: null,
    height: 700

});


// ============================================================
// SAVE CURRENT PAGE
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


    currentPage =
        index;


    const page =
        pages[currentPage];


    notebookPage.style.height =
        page.height + "px";


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

    const pageNumber =
        document.getElementById(
            "pageNumber"
        );


    if (pageNumber) {

        pageNumber.textContent =
            `${currentPage + 1} / ∞`;

    }

}


// ============================================================
// ADD PAGE
// ============================================================

const addPageBtn =
    document.getElementById(
        "addPageBtn"
    );


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


            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );


            notebookPage.style.height =
                "700px";


            updatePageNumber();

        }
    );

}


// ============================================================
// PREVIOUS PAGE
// ============================================================

const previousPage =
    document.getElementById(
        "previousPage"
    );


if (previousPage) {

    previousPage.addEventListener(
        "click",
        () => {

            if (
                currentPage >
                0
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

const nextPage =
    document.getElementById(
        "nextPage"
    );


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

            } else {

                addPageBtn.click();

            }

        }
    );

}


// ============================================================
// EXTEND PAGE
// ============================================================

const extendPageBtn =
    document.getElementById(
        "extendPageBtn"
    );


if (extendPageBtn) {

    extendPageBtn.addEventListener(
        "click",
        () => {

            const newHeight =
                notebookPage.offsetHeight +
                500;


            notebookPage.style.height =
                newHeight + "px";


            canvas.height =
                newHeight;


            canvas.style.height =
                "100%";


            pages[currentPage].height =
                newHeight;

        }
    );

}


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


let zoom =
    100;


function updateZoom() {

    if (zoomValue) {

        zoomValue.textContent =
            `${zoom}%`;

    }


    notebookPage.style.transform =
        `scale(${zoom / 100})`;

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

            currentTool =
                "text";

            setActiveTool(
                textBtn
            );

            canvas.style.cursor =
                "text";

        }
    );

}


// ============================================================
// CREATE TEXT
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
            text.trim() === ""
        ) {
            return;
        }


        createTextObject(
            text,
            position.x,
            position.y
        );

    }
);


function createTextObject(
    text,
    x,
    y
) {

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
        colorPicker.value;


    element.style.background =
        "transparent";


    element.style.padding =
        "4px 8px";


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
// DRAG OBJECT
// ============================================================

function makeDraggable(
    element
) {

    let dragging =
        false;

    let offsetX = 0;
    let offsetY = 0;


    element.addEventListener(
        "mousedown",
        e => {

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
                `${e.clientX - parentRect.left - offsetX}px`;


            element.style.top =
                `${e.clientY - parentRect.top - offsetY}px`;

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
// SHAPES
// ============================================================

if (shapeBtn) {

    shapeBtn.addEventListener(
        "click",
        () => {

            currentTool =
                "shape";

            setActiveTool(
                shapeBtn
            );

            canvas.style.cursor =
                "crosshair";

        }
    );

}


// Shape drawing

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
            width < 5 ||
            height < 5
        ) {

            shapeStart =
                null;

            return;

        }


        createShape(
            x,
            y,
            width,
            height
        );


        shapeStart =
            null;

    }
);


function createShape(
    x,
    y,
    width,
    height
) {

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
        `2px solid ${colorPicker.value}`;


    shape.style.borderRadius =
        "8px";


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
// STICKY NOTE
// ============================================================

if (stickyBtn) {

    stickyBtn.addEventListener(
        "click",
        () => {

            currentTool =
                "sticky";

            setActiveTool(
                stickyBtn
            );


            createStickyNote(
                150,
                150
            );

        }
    );

}


function createStickyNote(
    x,
    y
) {

    const note =
        document.createElement(
            "div"
        );


    note.className =
        "live-sticky-note";


    note.contentEditable =
        "true";


    note.innerHTML =
        "Write your note...";


    note.style.position =
        "absolute";


    note.style.left =
        `${x}px`;


    note.style.top =
        `${y}px`;


    note.style.width =
        "180px";


    note.style.minHeight =
        "130px";


    note.style.padding =
        "18px";


    note.style.background =
        "#fff1a8";


    note.style.boxShadow =
        "0 8px 20px rgba(0,0,0,0.12)";


    note.style.borderRadius =
        "5px";


    note.style.fontFamily =
        "Poppins, sans-serif";


    note.style.color =
        "#4b4630";


    note.style.outline =
        "none";


    note.style.cursor =
        "move";


    note.style.pointerEvents =
        "auto";


    objectLayer.appendChild(
        note
    );


    makeDraggable(
        note
    );


    note.focus();

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


            input.click();


            input.addEventListener(
                "change",
                () => {

                    const file =
                        input.files[0];


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

        }
    );

}


// ============================================================
// CREATE IMAGE
// ============================================================

function createImageObject(
    src
) {

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
                !columns
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


function createTable(
    rows,
    columns
) {

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
        "#fff";


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
// SELECT TOOL
// ============================================================

if (selectTool) {

    selectTool.addEventListener(
        "click",
        () => {

            currentTool =
                "select";

            setActiveTool(
                selectTool
            );


            canvas.style.cursor =
                "default";

        }
    );

}


// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener(
    "keydown",
    e => {

        // Ctrl + Z

        if (
            e.ctrlKey &&
            e.key.toLowerCase() === "z"
        ) {

            e.preventDefault();

            if (undoBtn) {
                undoBtn.click();
            }

        }


        // Ctrl + Y

        if (
            e.ctrlKey &&
            e.key.toLowerCase() === "y"
        ) {

            e.preventDefault();

            if (redoBtn) {
                redoBtn.click();
            }

        }


        // P = Pen

        if (
            e.key.toLowerCase() === "p" &&
            !e.ctrlKey
        ) {

            if (drawBtn) {
                drawBtn.click();
            }

        }


        // E = Eraser

        if (
            e.key.toLowerCase() === "e" &&
            !e.ctrlKey
        ) {

            if (eraserBtn) {
                eraserBtn.click();
            }

        }


        // H = Highlighter

        if (
            e.key.toLowerCase() === "h" &&
            !e.ctrlKey
        ) {

            if (highlighterBtn) {
                highlighterBtn.click();
            }

        }

    }
);


// ============================================================
// DEFAULT TOOL
// ============================================================

if (drawBtn) {

    setActiveTool(
        drawBtn
    );

}


// ============================================================
// INITIAL PAGE
// ============================================================

updatePageNumber();


// ============================================================
// SAVE DOCUMENT LOCALLY
// ============================================================

function saveDocument() {

    saveCurrentPage();


    const documentData = {

        pages: pages,

        currentPage:
            currentPage,

        zoom:
            zoom,

        title:
            document.getElementById(
                "documentTitle"
            )?.value || "Study Notes"

    };


    localStorage.setItem(
        "liveCanvasDocument",
        JSON.stringify(
            documentData
        )
    );

}


// ============================================================
// LOAD DOCUMENT LOCALLY
// ============================================================

function loadDocument() {

    const saved =
        localStorage.getItem(
            "liveCanvasDocument"
        );


    if (!saved) {
        return;
    }


    try {

        const data =
            JSON.parse(
                saved
            );


        if (
            data.pages &&
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
                    data.currentPage,
                    pages.length - 1
                );

        }


        if (
            typeof data.zoom ===
            "number"
        ) {

            zoom =
                data.zoom;

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
            currentPage
        );


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
// LOAD
// ============================================================

loadDocument();


// ============================================================
// DONE
// ============================================================

console.log(
    "LiveCanvas initialized successfully 🚀"
);