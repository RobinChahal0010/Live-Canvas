// ===========================
// THEME
// ===========================

const themeButtons = document.querySelectorAll(".theme-color");
const themeStatus = document.getElementById("themeStatus");

themeButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        document.body.classList.remove(
            "dark",
            "purple",
            "green",
            "ocean"
        );

        const theme = btn.dataset.theme;

        if (theme) {
            document.body.classList.add(theme);
        }

        if (themeStatus) {
            themeStatus.textContent = theme || "Light";
        }

        localStorage.setItem("theme", theme);

    });

});


// Load saved theme

const savedTheme = localStorage.getItem("theme");

if (savedTheme) {

    document.body.classList.add(savedTheme);

    if (themeStatus) {
        themeStatus.textContent = savedTheme;
    }

}


// ===========================
// AUTHENTICATION
// ===========================

const loginHeaderBtn =
    document.getElementById("loginHeaderBtn");

const signupHeaderBtn =
    document.getElementById("signupHeaderBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const welcomeUser =
    document.getElementById("welcomeUser");


// Get logged in user

const loggedInUser =
    JSON.parse(localStorage.getItem("loggedInUser"));


// ===========================
// USER LOGGED IN
// ===========================

if (loggedInUser) {

    welcomeUser.textContent =
        `Hi, ${loggedInUser.name} 👋`;

    loginHeaderBtn.style.display = "none";

    signupHeaderBtn.style.display = "none";

    logoutBtn.style.display = "block";

}


// ===========================
// USER NOT LOGGED IN
// ===========================

else {

    welcomeUser.textContent = "";

    loginHeaderBtn.style.display = "block";

    signupHeaderBtn.style.display = "block";

    logoutBtn.style.display = "none";

}


// ===========================
// LOGIN BUTTON
// ===========================

loginHeaderBtn.addEventListener("click", () => {

    window.location.href = "login.html";

});


// ===========================
// SIGNUP BUTTON
// ===========================

signupHeaderBtn.addEventListener("click", () => {

    window.location.href = "signup.html";

});


// ===========================
// LOGOUT
// ===========================

logoutBtn.addEventListener("click", () => {

    localStorage.removeItem("loggedInUser");

    window.location.href = "index.html";

});