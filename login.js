const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

    loginBtn.addEventListener("click", function () {

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value.trim();


        // ========================================================
        // VALIDATION
        // ========================================================

        if (email === "" || password === "") {

            alert("Please enter email and password.");

            return;
        }


        // ========================================================
        // GET USERS
        // ========================================================

        const users =
            JSON.parse(
                localStorage.getItem("users")
            ) || [];


        // ========================================================
        // FIND USER
        // ========================================================

        const user =
            users.find(function (user) {

                return (
                    user.email.toLowerCase() ===
                    email.toLowerCase()
                ) &&
                user.password === password;

            });


        // ========================================================
        // INVALID LOGIN
        // ========================================================

        if (!user) {

            alert(
                "Invalid email or password."
            );

            return;
        }


        // ========================================================
        // SAVE LOGGED-IN USER
        // ========================================================

        const loggedInUser = {
            name: user.name,
            email: user.email
        };


        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(loggedInUser)
        );



        // Always send user to Saved Boards after login
        window.location.href = "saved.html";

    });

}