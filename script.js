function reserveren(box) {

    window.location.href =
        "reserveren.html?box=" + encodeURIComponent(box);

}


const formulier = document.getElementById("reserveringsForm");

if (formulier) {

    formulier.addEventListener("submit", function (event) {

        event.preventDefault();

        const naam = document.getElementById("naam").value;
        const email = document.getElementById("email").value;
        const box = document.getElementById("box").value;


        // Willekeurige 4-cijferige toegangscode
        const toegangscode =
            Math.floor(1000 + Math.random() * 9000);


        document.getElementById("bedankt").textContent =
            "Bedankt " + naam +
            "! Je hebt " + box +
            " gereserveerd.";


        document.getElementById("toegangscode").textContent =
            toegangscode;


        formulier.style.display = "none";

        document.getElementById("bevestiging").style.display = "block";

    });

}