const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", function () {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (email === "" || password === "") {
        alert("Please enter email and password.");
        return;
    }

    const users = JSON.parse( localStorage.getItem("users")) || [];

    const user = users.find(function(user) {
        return (
            user.email.toLowerCase() ===
            email.toLowerCase()
        )
        &&
        user.password === password;
    });

    if (!user) {
        alert(
            "Invalid email or password."
        );
        return;
    }

    const loggedInUser = {
        name: user.name,
        email: user.email
    };
    localStorage.setItem(
        "loggedInUser",
        JSON.stringify(loggedInUser)
    );

    alert(
        `Welcome ${user.name}!`
    );
    window.location.href = "index.html";
});