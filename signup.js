// Signup form: validates a new account, registers it via the backend API, and starts a session.
const signupBtn = document.getElementById("signupBtn");
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

// Displays validation feedback next to the registration form.
function setFormMessage(message, type = "error") {
    const messageBox = document.getElementById("formMessage");
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `form-message ${type}`;
}

// Validates and registers the account when the registration form is submitted.
signupBtn.addEventListener("click", async function () {
    const name =
            document.getElementById("name")
                .value
                .trim();
    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value.trim();

    if (name === "" || email === "" || password === "") {
        setFormMessage("Please fill all fields.");
        return;
    }
    if (name.trim().length < 3 || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name.trim())) {
        setFormMessage("Name must be at least 3 characters and contain only alphabets and spaces.");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormMessage("Please enter a valid email address.");
        return;
    }
    if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
        setFormMessage(
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
        );
        return;
    }

    try {
        const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("loggedInUser", JSON.stringify(data.user)); // display cache only
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect") || "saved.html";
            window.location.href = redirect;
        } else {
            setFormMessage(data.error || "Signup failed.");
        }
    } catch (_) {
        setFormMessage("Could not connect to server. Please try again.");
    }
});
