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

        if(theme){
            document.body.classList.add(theme);
        }

        themeStatus.textContent = theme || "Light";

        localStorage.setItem("theme", theme);

    });

});

const savedTheme = localStorage.getItem("theme");

if(savedTheme){

    document.body.classList.add(savedTheme);

    themeStatus.textContent = savedTheme;

}