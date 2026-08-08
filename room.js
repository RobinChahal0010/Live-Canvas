const soloBtn = document.getElementById("soloBtn");

const createRoomBtn =
    document.getElementById("createRoomBtn");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");

const joinSection =
    document.getElementById("joinSection");

const joinBtn =
    document.getElementById("joinBtn");

const roomCode =
    document.getElementById("roomCode");

const createdRoom =
    document.getElementById("createdRoom");

const roomLink =
    document.getElementById("roomLink");

const copyRoomBtn =
    document.getElementById("copyRoomBtn");

const enterRoomBtn =
    document.getElementById("enterRoomBtn");

let currentRoom = null;


/* =========================
   WORK SOLO
========================= */

soloBtn.addEventListener("click", () => {

    window.location.href = "index.html";

});


/* =========================
   CREATE ROOM
========================= */

createRoomBtn.addEventListener("click", () => {

    currentRoom = generateRoomCode();

    const link =
        `${window.location.origin}/index.html?room=${currentRoom}`;

    roomLink.value = link;

    createdRoom.style.display = "block";

});


/* =========================
   JOIN ROOM UI
========================= */

joinRoomBtn.addEventListener("click", () => {

    joinSection.style.display = "block";

    roomCode.focus();

});


/* =========================
   JOIN ROOM
========================= */

joinBtn.addEventListener("click", () => {

    const code =
        roomCode.value.trim();

    if (!code) {

        alert("Please enter a room code.");

        return;

    }

    window.location.href =
        `index.html?room=${encodeURIComponent(code)}`;

});


/* =========================
   COPY LINK
========================= */

copyRoomBtn.addEventListener("click", async () => {

    await navigator.clipboard.writeText(
        roomLink.value
    );

    copyRoomBtn.textContent = "Copied ✓";

    setTimeout(() => {

        copyRoomBtn.textContent = "Copy Link";

    }, 1500);

});


/* =========================
   ENTER CREATED ROOM
========================= */

enterRoomBtn.addEventListener("click", () => {

    window.location.href =
        `index.html?room=${currentRoom}`;

});


/* =========================
   ROOM CODE
========================= */

function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {

        code += chars[
            Math.floor(
                Math.random() * chars.length
            )
        ];

    }

    return code;

}