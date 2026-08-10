// ============================================================
// LIVE CANVAS - ROOM SELECTION
// ============================================================

// ============================================================
// ELEMENTS
// ============================================================

const soloBtn =
    document.getElementById("soloBtn");

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
// AUTH
// ============================================================

function getLoggedInUser() {

    try {

        return JSON.parse(
            localStorage.getItem("loggedInUser")
        );

    } catch (error) {

        console.error(
            "Could not read loggedInUser:",
            error
        );

        return null;
    }
}


// ============================================================
// REQUIRE LOGIN
// ============================================================

function requireLogin() {

    const user =
        getLoggedInUser();

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
// GENERATE ROOM ID
// ============================================================

function generateRoomId() {

    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

}


// ============================================================
// SOLO ROOM
// ============================================================

if (soloBtn) {

    soloBtn.addEventListener(
        "click",
        () => {

            if (!requireLogin()) {
                return;
            }

            // No room ID = solo mode
            sessionStorage.removeItem(
                "roomId"
            );

            sessionStorage.removeItem(
                "roomUsername"
            );

            console.log(
                "Starting Solo Canvas"
            );

            window.location.href =
                "index.html";

        }
    );

}


// ============================================================
// CREATE ROOM
// ============================================================

if (createRoomBtn) {

    createRoomBtn.addEventListener(
        "click",
        () => {

            if (!requireLogin()) {
                return;
            }

            const roomId =
                generateRoomId();

            // Let backend generate random name
            sessionStorage.setItem(
                "roomUsername",
                ""
            );

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
        () => {

            if (!requireLogin()) {
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
        () => {

            if (!requireLogin()) {
                return;
            }

            if (!roomCode) {
                return;
            }

            const code =
                roomCode.value
                    .trim()
                    .toUpperCase();


            // Validate
            if (!code) {

                alert(
                    "Please enter a room code."
                );

                return;
            }


            // Let backend generate random name
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
        () => {

            if (!requireLogin()) {
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