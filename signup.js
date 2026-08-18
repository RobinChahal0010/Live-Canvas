const signupBtn = document.getElementById("signupBtn");

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
    if (name.length < 2) {
        setFormMessage("Name must be at least 2 characters.");
        return;
    }

    if (password.length < 6) {
        setFormMessage("Password must be at least 6 characters.");
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