const loginBtn = document.getElementById("loginBtn");

function setFormMessage(message, type = "error") {
    const messageBox = document.getElementById("formMessage");
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `form-message ${type}`;
}

async function hashPassword(password) {
    const text = password.trim();
    if (typeof crypto !== "undefined" && crypto.subtle) {
        const buffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

if (loginBtn) {

    loginBtn.addEventListener("click", async function () {

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value.trim();

        if (email === "" || password === "") {
            setFormMessage("Please enter email and password.");
            return;
        }

        const users = JSON.parse(localStorage.getItem("users")) || [];

        const inputHash = await hashPassword(password);
        const user = users.find(function (user) {
            return user.email.toLowerCase() === email.toLowerCase();
        });

        if (!user) {
            setFormMessage("No account exists. Create a new one.");
            return;
        }

        const storedPassword = user.password || user.passwordHash || "";
        const isPasswordValid = storedPassword === inputHash || storedPassword === password;

        if (!isPasswordValid) {
            setFormMessage("Invalid email or password.");
            return;
        }

        if (storedPassword !== inputHash) {
            user.password = inputHash;
            delete user.passwordHash;
            localStorage.setItem("users", JSON.stringify(users));
        }

        const loggedInUser = {
            name: user.name,
            email: user.email
        };

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(loggedInUser)
        );

        window.location.href = "saved.html";

    });

}