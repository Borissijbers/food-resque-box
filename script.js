function reserveren(box) {

    window.location.href =
        "reserveren.html?box=" + encodeURIComponent(box);

}
// ==================================================
// RESERVERING OPSLAAN IN SUPABASE
// ==================================================

const formulier =
    document.getElementById("reserveringsForm");

if (formulier) {

    async function controleerGebruiker() {

        const {
            data: { user }
        } = await supabaseClient.auth.getUser();

        if (!user) {
            window.location.href = "inloggen.html";
            return null;
        }

        return user;
    }

    const parameters =
        new URLSearchParams(window.location.search);

    const boxNaam = parameters.get("box");

    const gekozenBox =
        document.getElementById("gekozenBox");

    if (gekozenBox) {
        gekozenBox.textContent =
            boxNaam || "Geen box geselecteerd";
    }

    formulier.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const user =
                await controleerGebruiker();

            if (!user) return;

            if (!boxNaam) {
                alert("Er is geen Food Rescue Box geselecteerd.");
                return;
            }

            // Zoek de gekozen box op in Supabase
            const {
                data: box,
                error: boxError
            } = await supabaseClient
                .from("boxen")
                .select("id, naam")
                .eq("naam", boxNaam)
                .single();

            if (boxError || !box) {

                console.error(
                    "Box niet gevonden:",
                    boxError
                );

                alert(
                    "Deze Food Rescue Box kon niet worden gevonden."
                );

                return;
            }

            // Maak een willekeurige 4-cijferige toegangscode
            const toegangscode =
                Math.floor(
                    1000 + Math.random() * 9000
                ).toString();

            // Sla reservering op in Supabase
            const {
                error: reserveringError
            } = await supabaseClient
                .from("reserveringen")
                .insert({
                    gebruiker_id: user.id,
                    box_id: box.id,
                    toegangscode: toegangscode
                });

            if (reserveringError) {

                console.error(
                    "Reserveringsfout:",
                    reserveringError
                );

                alert(
                    "De reservering kon niet worden opgeslagen."
                );

                return;
            }

            // Toon bevestiging
            const bedankt =
                document.getElementById("bedankt");

            const code =
                document.getElementById("toegangscode");

            if (bedankt) {
                bedankt.textContent =
                    "Bedankt! Je hebt " +
                    box.naam +
                    " gereserveerd.";
            }

            if (code) {
                code.textContent =
                    toegangscode;
            }

            formulier.style.display = "none";

            const bevestiging =
                document.getElementById("bevestiging");

            if (bevestiging) {
                bevestiging.style.display = "block";
            }
        }
    );
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
// ==================================================
// INLOGGEN MET SUPABASE AUTH
// ==================================================

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document.getElementById(
                    "loginEmail"
                ).value;

            const wachtwoord =
                document.getElementById(
                    "loginWachtwoord"
                ).value;

            const loginFout =
                document.getElementById(
                    "loginFout"
                );


            const { data, error } =
                await supabaseClient.auth.signInWithPassword({

                    email: email,

                    password: wachtwoord

                });


            if (error) {

                console.error(
                    "Inlogfout:",
                    error
                );

                loginFout.textContent =
                    "Onjuist e-mailadres of wachtwoord.";

                return;

            }


            // Gebruiker is ingelogd
            sessionStorage.setItem(
                "ingelogd",
                "true"
            );

            sessionStorage.setItem(
                "ingelogdEmail",
                data.user.email
            );


            // Naar accountpagina
            window.location.href =
                "account.html";

        }
    );

}
// Uitloggen

function uitloggen() {
    sessionStorage.removeItem("ingelogd");
    sessionStorage.removeItem("ingelogdEmail");

    window.location.href = "inloggen.html";

}
// Gegevens tonen op de accountpagina

// ==================================================
// ACCOUNTGEGEVENS UIT SUPABASE
// ==================================================

async function laadAccount() {

    const accountCode =
        document.getElementById("accountCode");

    if (!accountCode) return;

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "inloggen.html";
        return;
    }

    const naam =
        user.user_metadata?.naam || "Gebruiker";

    const email =
        user.email || "-";

    document.getElementById("accountNaam").textContent =
        naam;

    document.getElementById("accountEmail").textContent =
        email;

    const {
        data: reserveringen,
        error: reserveringError
    } = await supabaseClient
        .from("reserveringen")
        .select(`
            id,
            toegangscode,
            aangemaakt_op,
            boxen (
                id,
                naam,
                inhoud
            )
        `)
        .eq("gebruiker_id", user.id)
        .order("aangemaakt_op", {
            ascending: false
        })
        .limit(1);

    if (reserveringError) {

        console.error(
            "Fout bij laden reservering:",
            reserveringError
        );

        document.getElementById("accountBox").textContent =
            "Reservering kon niet worden geladen.";

        accountCode.textContent = "----";

        return;
    }

    const annuleerKnop =
        document.getElementById("annuleerReservering");

    if (!reserveringen || reserveringen.length === 0) {

        document.getElementById("accountBox").textContent =
            "Geen reservering";

        accountCode.textContent =
            "----";

        if (annuleerKnop) {
            annuleerKnop.style.display = "none";
        }

        return;
    }

    const reservering =
        reserveringen[0];

    document.getElementById("accountBox").textContent =
        reservering.boxen?.naam || "Onbekende box";

    accountCode.textContent =
        reservering.toegangscode;

    if (annuleerKnop) {

        annuleerKnop.style.display = "inline-block";

        annuleerKnop.onclick =
            function () {
                annuleerReservering(reservering.id);
            };
    }
}


// ==================================================
// RESERVERING ANNULEREN
// ==================================================

async function annuleerReservering(reserveringId) {

    const bevestiging =
        confirm(
            "Weet je zeker dat je deze reservering wilt annuleren?"
        );

    if (!bevestiging) return;

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "inloggen.html";
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("reserveringen")
        .delete()
        .eq("id", reserveringId)
        .eq("gebruiker_id", user.id);

    if (error) {

        console.error(
            "Fout bij annuleren:",
            error
        );

        document.getElementById(
            "annuleerMelding"
        ).textContent =
            "❌ De reservering kon niet worden geannuleerd.";

        return;
    }

    document.getElementById(
        "annuleerMelding"
    ).textContent =
        "✅ Je reservering is geannuleerd.";

    document.getElementById(
        "accountBox"
    ).textContent =
        "Geen reservering";

    document.getElementById(
        "accountCode"
    ).textContent =
        "----";

    const annuleerKnop =
        document.getElementById(
            "annuleerReservering"
        );

    if (annuleerKnop) {
        annuleerKnop.style.display = "none";
    }
}

laadAccount();
// Aanmelden

// ==================================================
// AANMELDEN MET SUPABASE AUTH
// ==================================================

const aanmeldForm =
    document.getElementById("aanmeldForm");

if (aanmeldForm) {

    aanmeldForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const naam =
                document.getElementById(
                    "aanmeldNaam"
                ).value.trim();

            const email =
                document.getElementById(
                    "aanmeldEmail"
                ).value.trim();

            const wachtwoord =
                document.getElementById(
                    "aanmeldWachtwoord"
                ).value;

            const herhaalWachtwoord =
                document.getElementById(
                    "herhaalWachtwoord"
                ).value;

            const melding =
                document.getElementById(
                    "aanmeldMelding"
                );


            // Controleer of de wachtwoorden hetzelfde zijn
            if (wachtwoord !== herhaalWachtwoord) {

                melding.textContent =
                    "De wachtwoorden komen niet overeen.";

                return;
            }


            // Account aanmaken in Supabase Auth
            const { data, error } =
                await supabaseClient.auth.signUp({

                    email: email,

                    password: wachtwoord,

                    options: {
                        data: {
                            naam: naam
                        }
                    }

                });


            // Controleer op een fout
            if (error) {

                console.error(
                    "Aanmeldfout:",
                    error
                );

                melding.textContent =
                    "Er ging iets mis: " +
                    error.message;

                return;
            }


            // Controleren of Supabase een gebruiker heeft aangemaakt
            console.log(
                "Nieuwe gebruiker:",
                data.user
            );


            melding.textContent =
                "Account aangemaakt! Je kunt nu inloggen.";

            aanmeldForm.reset();

        }
    );

}
async function laadBoxen() {

    const boxLijst = document.getElementById("boxLijst");

    // Alleen uitvoeren als de boxLijst op deze pagina bestaat
    if (!boxLijst) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("boxen")
        .select("*")
        .eq("beschikbaar", true)
        .order("id");

    if (error) {
        console.error("Fout bij laden van boxen:", error);

        boxLijst.innerHTML =
            "<p>❌ De boxen konden niet worden geladen.</p>";

        return;
    }

    console.log("Boxen uit Supabase:", data);

    if (data.length === 0) {
        boxLijst.innerHTML =
            "<p>Er zijn momenteel geen beschikbare boxen.</p>";

        return;
    }

    boxLijst.innerHTML = "";

    data.forEach(function (box) {

        const boxElement = document.createElement("div");
        boxElement.className = "box";

        boxElement.innerHTML = `
            <h3>${box.naam}</h3>

            <p>${box.inhoud}</p>

            <p>
                Beschikbaar vandaag
            </p>

            <button onclick="reserveren('${box.naam}')">
                Reserveren
            </button>
        `;

        boxLijst.appendChild(boxElement);
    });
}

laadBoxen();