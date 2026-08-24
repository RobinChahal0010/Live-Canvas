// Login form: validates credentials stored locally and starts the user session.
const loginBtn = document.getElementById("loginBtn");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const eyeIcon = document.getElementById("eyeIcon");

togglePassword.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.src = "assets/eye.png";
        eyeIcon.alt = "Hide password";
    } else {
        passwordInput.type = "password";
        eyeIcon.src = "assets/eye-off.png";
        eyeIcon.alt = "Show password";
    }
});

// Displays validation and authentication feedback next to the form.
function setFormMessage(message, type = "error") {
    const messageBox = document.getElementById("formMessage");
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `form-message ${type}`;
}

// Hashes a password before comparison, with a small fallback for older browsers.
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

// Submits the login form only when the page includes its button.
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
