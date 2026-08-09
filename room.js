// ============================================================
// LIVE CANVAS ROOM
// ============================================================

const loggedInUser = JSON.parse(
    localStorage.getItem("loggedInUser")
);

// ============================================================
// ELEMENTS
// ============================================================

const soloBtn = document.getElementById("soloBtn");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");

const joinSection = document.getElementById("joinSection");
const roomCode = document.getElementById("roomCode");
const joinBtn = document.getElementById("joinBtn");

const createdRoom = document.getElementById("createdRoom");
const roomLink = document.getElementById("roomLink");
const copyRoomBtn = document.getElementById("copyRoomBtn");
const enterRoomBtn = document.getElementById("enterRoomBtn");

// ============================================================
// SOLO MODE
// ============================================================

if (soloBtn) {

    soloBtn.addEventListener("click", () => {

        // No login required
        window.location.href = "index.html";

    });

}

// ============================================================
// AUTH CHECK
// ============================================================

function requireLogin() {

    if (!loggedInUser) {

        alert(
            "Please login to use collaborative rooms."
        );

        window.location.href =
            "login.html?redirect=room.html";

        return false;
    }

    return true;
}

// ============================================================
// GET ROOM USERNAME
// ============================================================

function getRoomUsername() {

    if (!loggedInUser) {
        return null;
    }

    // User can choose their room name
    const username = prompt(
        "Choose your room name (optional):",
        loggedInUser.name || ""
    );

    // Empty / cancelled → backend will generate random name
    if (!username || !username.trim()) {
        return null;
    }

    return username.trim();
}

// ============================================================
// CREATE ROOM
// ============================================================

if (createRoomBtn) {

    createRoomBtn.addEventListener("click", async () => {

        if (!requireLogin()) {
            return;
        }

        const username = getRoomUsername();

        try {

            const response = await fetch(
                "/api/rooms/create",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username: username
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                alert(
                    data.message ||
                    "Could not create room."
                );

                return;
            }

            // Save room information temporarily
            sessionStorage.setItem(
                "roomUsername",
                data.username
            );

            sessionStorage.setItem(
                "roomId",
                data.roomId
            );

            // Show generated room
            if (createdRoom) {
                createdRoom.style.display = "block";
            }

            if (roomLink) {
                roomLink.value =
                    `${window.location.origin}/index.html?room=${data.roomId}`;
            }

        } catch (error) {

            console.error(error);

            alert(
                "Server is not running."
            );

        }

    });

}

// ============================================================
// JOIN ROOM BUTTON
// ============================================================

if (joinRoomBtn) {

    joinRoomBtn.addEventListener("click", () => {

        if (!requireLogin()) {
            return;
        }

        if (joinSection) {
            joinSection.style.display = "block";
        }

    });

}

// ============================================================
// JOIN ROOM
// ============================================================

if (joinBtn) {

    joinBtn.addEventListener("click", async () => {

        if (!requireLogin()) {
            return;
        }

        const code =
            roomCode.value.trim();

        if (!code) {

            alert(
                "Please enter a room code."
            );

            return;
        }

        const username =
            getRoomUsername();

        try {

            const response = await fetch(
                `/api/rooms/${encodeURIComponent(code)}`
            );

            const data =
                await response.json();

            if (!response.ok) {

                alert(
                    data.message ||
                    "Room not found."
                );

                return;
            }

            sessionStorage.setItem(
                "roomUsername",
                username || data.username
            );

            sessionStorage.setItem(
                "roomId",
                code
            );

            window.location.href =
                `index.html?room=${encodeURIComponent(code)}`;

        } catch (error) {

            console.error(error);

            alert(
                "Server is not running."
            );

        }

    });

}

// ============================================================
// COPY ROOM LINK
// ============================================================

if (copyRoomBtn) {

    copyRoomBtn.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(
                roomLink.value
            );

            copyRoomBtn.textContent =
                "Copied ✓";

            setTimeout(() => {

                copyRoomBtn.textContent =
                    "Copy Link";

            }, 1500);

        } catch (error) {

            console.error(error);

        }

    });

}

// ============================================================
// ENTER CREATED ROOM
// ============================================================

if (enterRoomBtn) {

    enterRoomBtn.addEventListener("click", () => {

        const roomId =
            sessionStorage.getItem("roomId");

        if (!roomId) {
            return;
        }

        window.location.href =
            `index.html?room=${encodeURIComponent(roomId)}`;

    });

}