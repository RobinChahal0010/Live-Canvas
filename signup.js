const signupBtn = document.getElementById("signupBtn");
signupBtn.addEventListener("click", function () {
    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value.trim();

    if (email === "" || password === "") {
        alert("Please fill all fields.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];

    const existingUser = users.find(function(user) {
        return user.email.toLowerCase() === email.toLowerCase();
    });

    if (existingUser) {
        alert(
            "This email is already registered. Please login."
        );
        return;
    }
    const newUser = {
        email: email,
        password: password
    };

    users.push(newUser);
    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );
    alert(
        "Account created successfully!"
    );
    window.location.href = "login.html";
});