// ============================================================
// LIVE CANVAS - ROOM SELECTION
// ============================================================

// ============================================================
// ELEMENTS
// ============================================================

const createRoomBtn =
    document.getElementById("createRoomBtn");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");

const joinSection =
    document.getElementById("joinSection");

const roomCode =
    document.getElementById("roomCode");

const joinBtn =
    document.getElementById("joinBtn");

const createdRoom =
    document.getElementById("createdRoom");

const roomLink =
    document.getElementById("roomLink");

const copyRoomBtn =
    document.getElementById("copyRoomBtn");

const enterRoomBtn =
    document.getElementById("enterRoomBtn");


// ============================================================
// REQUIRE LOGIN (server-verified)
// ============================================================

async function requireLogin() {
    const token = localStorage.getItem("token");
    if (!token) {
        const redirect =
            window.location.pathname +
            window.location.search;
        window.location.href =
            "login.html?redirect=" +
            encodeURIComponent(redirect);
        return false;
    }
    try {
        const response = await fetch("/api/auth/me", {
            headers: { Authorization: "Bearer " + token }
        });
        if (response.ok) return true;
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");
        const redirect =
            window.location.pathname +
            window.location.search;
        window.location.href =
            "login.html?redirect=" +
            encodeURIComponent(redirect);
        return false;
    } catch (_) {
        return false;
    }
}


// ============================================================
// GENERATE ROOM ID
// ============================================================

function generateRoomId() {

    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
}


// ============================================================
// CREATE ROOM
// ============================================================

if (createRoomBtn) {

    createRoomBtn.addEventListener(
        "click",
        async () => {

            if (!await requireLogin()) {
                return;
            }

            const roomId =
                generateRoomId();

            // Save room ID only
            sessionStorage.setItem(
                "roomId",
                roomId
            );

            console.log(
                "Created Room:",
                roomId
            );

            if (createdRoom) {

                createdRoom.style.display =
                    "block";

            }

            if (roomLink) {

                roomLink.value =
                    roomId;

            }

        }
    );
}


// ============================================================
// SHOW JOIN SECTION
// ============================================================

if (joinRoomBtn) {

    joinRoomBtn.addEventListener(
        "click",
        async () => {

            if (!await requireLogin()) {
                return;
            }

            if (joinSection) {

                joinSection.style.display =
                    "block";

            }

            if (roomCode) {

                roomCode.focus();

            }

        }
    );
}


// ============================================================
// JOIN ROOM
// ============================================================

if (joinBtn) {

    joinBtn.addEventListener(
        "click",
        async () => {

            if (!await requireLogin()) {
                return;
            }

            if (!roomCode) {
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


            // Save room ID only
            sessionStorage.setItem(
                "roomId",
                code
            );

            console.log(
                "Joining Room:",
                code
            );


            // Open canvas
            window.location.href =
                `index.html?room=${encodeURIComponent(code)}`;

        }
    );
}


// ============================================================
// COPY ROOM CODE
// ============================================================

if (copyRoomBtn) {

    copyRoomBtn.addEventListener(
        "click",
        async () => {

            const roomId =
                sessionStorage.getItem(
                    "roomId"
                );

            if (!roomId) {

                alert(
                    "No room available."
                );

                return;
            }


            try {

                await navigator.clipboard.writeText(
                    roomId
                );

                copyRoomBtn.textContent =
                    "Copied ✓";


                setTimeout(
                    () => {

                        copyRoomBtn.textContent =
                            "Copy Code";

                    },
                    1500
                );

            } catch (error) {

                console.error(
                    "Copy failed:",
                    error
                );

                // Fallback
                if (roomLink) {

                    roomLink.select();

                    document.execCommand(
                        "copy"
                    );

                }

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
        async () => {

            if (!await requireLogin()) {
                return;
            }

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


            console.log(
                "Entering Room:",
                roomId
            );


            window.location.href =
                `index.html?room=${encodeURIComponent(roomId)}`;

        }
    );
}
