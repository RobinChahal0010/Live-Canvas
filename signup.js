// Signup form: validates a new account, stores it locally, and starts a session.
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

// Hashes a password before it is persisted, with a small fallback for older browsers.
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

// Validates and stores the account when the registration form is submitted.
signupBtn.addEventListener("click", async function () {
    const name =
            document.getElementById("name")
                .value
                .trim();
    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value.trim();

    if (name ==="" || email === "" || password === "") {
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

    let users = JSON.parse(localStorage.getItem("users")) || [];

    const existingUser = users.find(function(user) {
        return user.email.toLowerCase() === email.toLowerCase();
    });

    if (existingUser) {
        setFormMessage("Account already exists.");
        return;
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
        name: name,
        email: email,
        password: passwordHash
    };

    users.push(newUser);
    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );

    const loggedInUser = {
        name: newUser.name,
        email: newUser.email
    };
    localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || 'saved.html';
    window.location.href = redirect;
});
