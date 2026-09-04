function reserveren(box) {

    window.location.href =
        "reserveren.html?box=" + encodeURIComponent(box);

}


const formulier = document.getElementById("reserveringsForm");

if (formulier) {

    // Controleer of de gebruiker is ingelogd
    if (sessionStorage.getItem("ingelogd") !== "true") {
        window.location.href = "inloggen.html";
    }

    // Lees de gekozen box uit de URL
    const parameters = new URLSearchParams(window.location.search);
    const box = parameters.get("box");

    // Toon de gekozen box
    document.getElementById("gekozenBox").textContent =
        box || "Geen box geselecteerd";

    formulier.addEventListener("submit", function (event) {

        event.preventDefault();

        const naam = localStorage.getItem("naam");

        // Nieuwe toegangscode
        const toegangscode =
            Math.floor(1000 + Math.random() * 9000);

        // Nieuwe reservering opslaan
        localStorage.setItem("reserveringBox", box);
        localStorage.setItem("reserveringCode", toegangscode);

        // Bevestiging
        document.getElementById("bedankt").textContent =
            "Bedankt " + (naam || "gebruiker") +
            "! Je hebt " + box + " gereserveerd.";

        document.getElementById("toegangscode").textContent =
            toegangscode;

        formulier.style.display = "none";

        document.getElementById("bevestiging").style.display = "block";

    });

}

// FAQ openen en sluiten

const faqVragen = document.querySelectorAll(".faq-vraag");

faqVragen.forEach(function (vraag) {

    vraag.addEventListener("click", function () {

        const antwoord = vraag.nextElementSibling;
        const plus = vraag.querySelector("span");

        if (antwoord.style.display === "block") {
            antwoord.style.display = "none";
            plus.textContent = "+";
        } else {
            antwoord.style.display = "block";
            plus.textContent = "−";
        }

    });

});
// Demo login

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const wachtwoord = document.getElementById("loginWachtwoord").value;

        const loginFout = document.getElementById("loginFout");


        // Demo account

        const opgeslagenEmail = localStorage.getItem("email");
        const opgeslagenWachtwoord = localStorage.getItem("wachtwoord");

        if (
            email === opgeslagenEmail &&
            wachtwoord === opgeslagenWachtwoord
        ) {
            sessionStorage.setItem("ingelogd", "true");
            sessionStorage.setItem("ingelogdEmail", email);
            window.location.href = "account.html";
        } else {
            loginFout.textContent =
                "Onjuist e-mailadres of wachtwoord.";
        }

    });

}
// Uitloggen

function uitloggen() {
    sessionStorage.removeItem("ingelogd");
    sessionStorage.removeItem("ingelogdEmail");

    window.location.href = "inloggen.html";

}
// Gegevens tonen op de accountpagina

const accountCode = document.getElementById("accountCode");

if (accountCode) {

    const opgeslagenNaam = localStorage.getItem("naam");
    const opgeslagenEmail = localStorage.getItem("email");
    const opgeslagenBox = localStorage.getItem("reserveringBox");
    const opgeslagenCode = localStorage.getItem("reserveringCode");

    document.getElementById("accountNaam").textContent =
        opgeslagenNaam || "-";

    document.getElementById("accountEmail").textContent =
        opgeslagenEmail || "-";

    document.getElementById("accountBox").textContent =
        opgeslagenBox || "Geen reservering";

    accountCode.textContent =
        opgeslagenCode || "----";
}
// Aanmelden

const aanmeldForm = document.getElementById("aanmeldForm");

if (aanmeldForm) {

    aanmeldForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const naam =
            document.getElementById("aanmeldNaam").value;

        const email =
            document.getElementById("aanmeldEmail").value;

        const wachtwoord =
            document.getElementById("aanmeldWachtwoord").value;

        const herhaalWachtwoord =
            document.getElementById("herhaalWachtwoord").value;

        const melding =
            document.getElementById("aanmeldMelding");


        if (wachtwoord !== herhaalWachtwoord) {

            melding.textContent =
                "De wachtwoorden komen niet overeen.";

            return;
        }


        // Accountgegevens opslaan
        localStorage.setItem("naam", naam);
        localStorage.setItem("email", email);
        localStorage.setItem("wachtwoord", wachtwoord);


        melding.textContent =
            "Account aangemaakt! Je wordt doorgestuurd naar de inlogpagina.";


        setTimeout(function () {
            window.location.href = "inloggen.html";
        }, 1500);

    });

}