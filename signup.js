const signupBtn = document.getElementById("signupBtn");
signupBtn.addEventListener("click", function () {
    const name =
            document.getElementById("name")
                .value
                .trim();
    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value.trim();

    if (name ==="" || email === "" || password === "") {
        alert("Please fill all fields.");
        return;
    }
    if (name.length < 2) {

            alert(
                "Name must be at least 2 characters."
            );

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
        name: name,
        email: email,
        password: password
    };

    users.push(newUser);
    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );

    // Auto-login the newly created user and redirect
    const loggedInUser = {
        name: newUser.name,
        email: newUser.email
    };
    localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || 'index.html';
    window.location.href = redirect;
});