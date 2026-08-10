// ============================================================
// LIVE CANVAS ROOM
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
// AUTH
// ============================================================

function getLoggedInUser() {

    try {

        return JSON.parse(
            localStorage.getItem("loggedInUser")
        );

    } catch (error) {

        return null;

    }

}


function requireLogin() {

    const user = getLoggedInUser();

    if (!user) {

        const redirect =
            window.location.pathname +
            window.location.search;

        window.location.href =
            "login.html?redirect=" +
            encodeURIComponent(redirect);

        return false;
    }

    return true;
}


// ============================================================
// GET ROOM USERNAME
// ============================================================

function getRoomUsername() {

    const user = getLoggedInUser();

    if (!user) {
        return "";
    }

    const username = prompt(
        "Choose your room name (optional):",
        user.name || ""
    );

    if (
        username === null ||
        username.trim() === ""
    ) {

        // Backend will generate random name
        return "";

    }

    return username.trim();
}


// ============================================================
// SOLO
// ============================================================

if (soloBtn) {

    soloBtn.addEventListener("click", () => {

        if (!requireLogin()) {
            return;
        }

        // Login required even for Solo
        window.location.href = "index.html";

    });

}


// ============================================================
// CREATE ROOM
// ============================================================

if (createRoomBtn) {

    createRoomBtn.addEventListener("click", () => {

        if (!requireLogin()) {
            return;
        }

        const roomId =
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

        // Empty username
        // Backend will generate random username
        sessionStorage.setItem(
            "roomUsername",
            ""
        );

        sessionStorage.setItem(
            "roomId",
            roomId
        );

        if (createdRoom) {
            createdRoom.style.display = "block";
        }

        // Show ONLY room code
        if (roomLink) {
            roomLink.value = roomId;
        }

        console.log(
            "Created Room:",
            roomId
        );

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

    joinBtn.addEventListener("click", () => {

        if (!requireLogin()) {
            return;
        }

        const code =
            roomCode.value
                .trim()
                .toUpperCase();


        // Validate room code
        if (!code) {

            alert(
                "Please enter a room code."
            );

            return;
        }


        // Empty username
        // Backend generates random name
        sessionStorage.setItem(
            "roomUsername",
            ""
        );


        sessionStorage.setItem(
            "roomId",
            code
        );


        console.log(
            "Joining Room:",
            code
        );


        // Enter room
        window.location.href =
            `index.html?room=${encodeURIComponent(code)}`;

    });

}


// ============================================================
// COPY ROOM CODE
// ============================================================

if (copyRoomBtn) {

    copyRoomBtn.addEventListener(
        "click",
        async () => {

            const roomId =
                sessionStorage.getItem("roomId");

            if (!roomId) {
                return;
            }

            try {

                await navigator.clipboard.writeText(
                    roomId
                );

                copyRoomBtn.textContent =
                    "Copied ✓";

                setTimeout(() => {

                    copyRoomBtn.textContent =
                        "Copy Code";

                }, 1500);

            } catch (error) {

                console.error(
                    "Copy failed:",
                    error
                );

            }

        }
    );

}

// ============================================================
// ENTER CREATED ROOM
// ============================================================

if (enterRoomBtn) {

    enterRoomBtn.addEventListener(
        "click",
        () => {

            const roomId =
                sessionStorage.getItem(
                    "roomId"
                );


            if (!roomId) {

                alert(
                    "Room not created."
                );

                return;
            }


            window.location.href =
                `index.html?room=${encodeURIComponent(roomId)}`;

        }
    );

}