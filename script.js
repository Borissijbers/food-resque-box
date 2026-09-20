// ==========================================
// FOOD RESCUE BOX - SCRIPT.JS
// ==========================================

// ------------------------------------------
// HULPFUNCTIES
// ------------------------------------------

function toonMelding(elementId, bericht, type = "info") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = bericht;
    element.className = `melding ${type}`;
}

function genereerToegangscode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}


// ==========================================
// HOMEPAGE - BOXEN LADEN
// ==========================================

async function laadBoxen() {
    const boxLijst = document.getElementById("boxLijst");

    if (!boxLijst) return;

    boxLijst.innerHTML = "<p>📦 Beschikbare boxen worden geladen...</p>";

    try {
        const { data, error } = await supabaseClient
            .from("boxen")
            .select("*")
            .eq("beschikbaar", true)
            .order("id");

        if (error) {
            console.error("Fout bij ophalen boxen:", error);
            boxLijst.innerHTML =
                "<p>❌ Er ging iets mis bij het laden van de boxen.</p>";
            return;
        }

        if (!data || data.length === 0) {
            boxLijst.innerHTML =
                "<p>Er zijn momenteel geen beschikbare boxen.</p>";
            return;
        }

        boxLijst.innerHTML = "";

        data.forEach(box => {
            const boxElement = document.createElement("div");
            boxElement.className = "box";

            boxElement.innerHTML = `
                <h3>${escapeHtml(box.naam)}</h3>
                <p>📍 ${escapeHtml(box.locatie || "Locatie onbekend")}</p>
                <button onclick="reserveren(${box.id})">
                    Reserveer deze box
                </button>
            `;

            boxLijst.appendChild(boxElement);
        });

    } catch (error) {
        console.error("Onverwachte fout:", error);

        boxLijst.innerHTML =
            "<p>❌ Er ging iets mis. Probeer het later opnieuw.</p>";
    }
}


// ==========================================
// BOX RESERVEREN - DOORSTUREN
// ==========================================

function reserveren(boxId) {
    window.location.href = `reserveren.html?box=${encodeURIComponent(boxId)}`;
}


// ==========================================
// RESERVERINGSPAGINA
// ==========================================

async function laadGekozenBox() {
    const gekozenBoxElement = document.getElementById("gekozenBox");

    if (!gekozenBoxElement) return;

    const urlParams = new URLSearchParams(window.location.search);
    const boxId = urlParams.get("box");

    if (!boxId) {
        gekozenBoxElement.textContent =
            "Geen box geselecteerd.";
        return;
    }

    try {
        const { data: box, error } = await supabaseClient
            .from("boxen")
            .select("*")
            .eq("id", boxId)
            .single();

        if (error || !box) {
            console.error("Box niet gevonden:", error);

            gekozenBoxElement.textContent =
                "Box kon niet worden gevonden.";

            return;
        }

        gekozenBoxElement.textContent =
            `${box.naam} - ${box.locatie || "Locatie onbekend"}`;

    } catch (error) {
        console.error("Fout bij laden gekozen box:", error);

        gekozenBoxElement.textContent =
            "Er ging iets mis bij het laden van de box.";
    }
}


// ==========================================
// RESERVERING AANMAKEN
// ==========================================

async function maakReservering() {
    const urlParams = new URLSearchParams(window.location.search);
    const boxId = urlParams.get("box");

    if (!boxId) {
        toonMelding(
            "reserveringMelding",
            "❌ Er is geen box geselecteerd.",
            "error"
        );
        return;
    }

    try {
        // --------------------------------------
        // 1. CONTROLEREN OF GEBRUIKER INGELOGD IS
        // --------------------------------------

        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            toonMelding(
                "reserveringMelding",
                "❌ Je moet eerst ingelogd zijn om een reservering te maken.",
                "error"
            );

            setTimeout(() => {
                window.location.href = "account.html";
            }, 1500);

            return;
        }


        // --------------------------------------
        // 2. BOX OPHALEN
        // --------------------------------------

        const { data: nieuweBox, error: boxError } =
            await supabaseClient
                .from("boxen")
                .select("*")
                .eq("id", boxId)
                .single();

        if (boxError || !nieuweBox) {
            console.error("Box ophalen mislukt:", boxError);

            toonMelding(
                "reserveringMelding",
                "❌ Deze box bestaat niet.",
                "error"
            );

            return;
        }


        // --------------------------------------
        // 3. CONTROLEREN OF BOX NOG BESCHIKBAAR IS
        // --------------------------------------

        if (!nieuweBox.beschikbaar) {
            toonMelding(
                "reserveringMelding",
                "❌ Deze box is inmiddels al gereserveerd.",
                "error"
            );

            return;
        }


        // --------------------------------------
        // 4. BESTAANDE RESERVERINGEN OPHALEN
        // --------------------------------------

        const {
            data: oudeReserveringen,
            error: oudeReserveringenError
        } = await supabaseClient
            .from("reserveringen")
            .select("id, box_id")
            .eq("gebruiker_id", user.id);

        if (oudeReserveringenError) {
            console.error(
                "Oude reserveringen ophalen mislukt:",
                oudeReserveringenError
            );

            toonMelding(
                "reserveringMelding",
                "❌ Kon je bestaande reservering niet controleren.",
                "error"
            );

            return;
        }


        // --------------------------------------
        // 5. OUDE RESERVERINGEN VERWIJDEREN
        //    EN OUDE BOXEN WEER BESCHIKBAAR MAKEN
        // --------------------------------------

        if (oudeReserveringen && oudeReserveringen.length > 0) {

            for (const oudeReservering of oudeReserveringen) {

                // Oude box weer beschikbaar maken
                if (oudeReservering.box_id) {

                    const { error: boxUpdateError } =
                        await supabaseClient
                            .from("boxen")
                            .update({
                                beschikbaar: true
                            })
                            .eq("id", oudeReservering.box_id);

                    if (boxUpdateError) {
                        console.error(
                            "Oude box beschikbaar maken mislukt:",
                            boxUpdateError
                        );
                    }
                }
            }


            // Oude reserveringen verwijderen
            const { error: deleteError } =
                await supabaseClient
                    .from("reserveringen")
                    .delete()
                    .eq("gebruiker_id", user.id);

            if (deleteError) {
                console.error(
                    "Oude reserveringen verwijderen mislukt:",
                    deleteError
                );

                toonMelding(
                    "reserveringMelding",
                    "❌ Je oude reservering kon niet worden verwijderd.",
                    "error"
                );

                return;
            }
        }


        // --------------------------------------
        // 6. NIEUWE 4-CIJFERIGE CODE MAKEN
        // --------------------------------------

        const toegangscode = genereerToegangscode();


        // --------------------------------------
        // 7. NIEUWE RESERVERING OPSLAAN
        // --------------------------------------

        const {
            data: reservering,
            error: reserveringError
        } = await supabaseClient
            .from("reserveringen")
            .insert({
                gebruiker_id: user.id,
                box_id: nieuweBox.id,
                toegangscode: toegangscode
            })
            .select()
            .single();

        if (reserveringError) {
            console.error(
                "Reservering maken mislukt:",
                reserveringError
            );

            toonMelding(
                "reserveringMelding",
                "❌ Reservering maken mislukt.",
                "error"
            );

            return;
        }


        // --------------------------------------
        // 8. BOX OP NIET BESCHIKBAAR ZETTEN
        // --------------------------------------

        const { error: beschikbaarError } =
            await supabaseClient
                .from("boxen")
                .update({
                    beschikbaar: false
                })
                .eq("id", nieuweBox.id);

        if (beschikbaarError) {
            console.error(
                "Box beschikbaarheid aanpassen mislukt:",
                beschikbaarError
            );

            // Proberen de reservering weer te verwijderen
            await supabaseClient
                .from("reserveringen")
                .delete()
                .eq("id", reservering.id);

            toonMelding(
                "reserveringMelding",
                "❌ De box kon niet worden vastgezet. Probeer opnieuw.",
                "error"
            );

            return;
        }


        // --------------------------------------
        // 9. SUCCES
        // --------------------------------------

        toonMelding(
            "reserveringMelding",
            `✅ Reservering gelukt! Je toegangscode is: ${toegangscode}`,
            "success"
        );

        // Extra code-element als dit op de pagina aanwezig is
        const codeElement = document.getElementById("toegangscode");

        if (codeElement) {
            codeElement.textContent = toegangscode;
        }


        // Na enkele seconden naar accountpagina
        setTimeout(() => {
            window.location.href = "account.html";
        }, 3000);

    } catch (error) {
        console.error("Onverwachte fout bij reserveren:", error);

        toonMelding(
            "reserveringMelding",
            "❌ Er ging iets onverwachts mis.",
            "error"
        );
    }
}


// ==========================================
// ACCOUNT PAGINA
// ==========================================

async function laadAccount() {

    const accountBox = document.getElementById("accountBox");
    const accountCode = document.getElementById("accountCode");
    const annuleerKnop = document.getElementById("annuleerReservering");

    if (!accountBox && !accountCode && !annuleerKnop) {
        return;
    }


    // --------------------------------------
    // GEBRUIKER OPHALEN
    // --------------------------------------

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {

        if (accountBox) {
            accountBox.textContent =
                "Je bent niet ingelogd.";
        }

        if (accountCode) {
            accountCode.textContent = "-";
        }

        return;
    }


    // --------------------------------------
    // NAAM EN E-MAIL TONEN
    // --------------------------------------

    const accountNaam = document.getElementById("accountNaam");
    const accountEmail = document.getElementById("accountEmail");

    if (accountNaam) {
        accountNaam.textContent =
            user.user_metadata?.naam || "Gebruiker";
    }

    if (accountEmail) {
        accountEmail.textContent =
            user.email || "";
    }


    // --------------------------------------
    // HUIDIGE RESERVERING OPHALEN
    // --------------------------------------

    const {
        data: reserveringen,
        error: reserveringError
    } = await supabaseClient
        .from("reserveringen")
        .select(`
            id,
            toegangscode,
            box_id,
            aangemaakt_op,
            boxen (
                id,
                naam,
                locatie
            )
        `)
        .eq("gebruiker_id", user.id)
        .order("aangemaakt_op", {
            ascending: false
        })
        .limit(1);

    if (reserveringError) {
        console.error(
            "Reservering ophalen mislukt:",
            reserveringError
        );

        if (accountBox) {
            accountBox.textContent =
                "Kon reservering niet laden.";
        }

        return;
    }


    // --------------------------------------
    // GEEN RESERVERING
    // --------------------------------------

    if (!reserveringen || reserveringen.length === 0) {

        if (accountBox) {
            accountBox.textContent =
                "Je hebt momenteel geen reservering.";
        }

        if (accountCode) {
            accountCode.textContent = "-";
        }

        if (annuleerKnop) {
            annuleerKnop.style.display = "none";
        }

        return;
    }


    // --------------------------------------
    // RESERVERING TONEN
    // --------------------------------------

    const reservering = reserveringen[0];

    if (accountBox) {

        if (reservering.boxen) {
            accountBox.textContent =
                `${reservering.boxen.naam} - ${reservering.boxen.locatie || "Locatie onbekend"}`;
        } else {
            accountBox.textContent =
                "Box niet gevonden";
        }
    }

    if (accountCode) {
        accountCode.textContent =
            reservering.toegangscode || "-";
    }

    if (annuleerKnop) {
        annuleerKnop.style.display = "block";

        // Voorkomen dat er meerdere event listeners ontstaan
        annuleerKnop.onclick = () => {
            annuleerReservering(reservering.id);
        };
    }
}


// ==========================================
// RESERVERING ANNULEREN
// ==========================================

async function annuleerReservering(reserveringId) {

    if (!reserveringId) {
        return;
    }


    const bevestiging = confirm(
        "Weet je zeker dat je deze reservering wilt annuleren?"
    );

    if (!bevestiging) {
        return;
    }


    try {

        // --------------------------------------
        // INGLOGDE GEBRUIKER OPHALEN
        // --------------------------------------

        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            alert("Je bent niet ingelogd.");
            return;
        }


        // --------------------------------------
        // RESERVERING OPHALEN
        // --------------------------------------

        const {
            data: reservering,
            error: reserveringError
        } = await supabaseClient
            .from("reserveringen")
            .select("id, box_id")
            .eq("id", reserveringId)
            .eq("gebruiker_id", user.id)
            .single();

        if (reserveringError || !reservering) {
            console.error(
                "Reservering ophalen mislukt:",
                reserveringError
            );

            alert(
                "De reservering kon niet worden gevonden."
            );

            return;
        }


        // --------------------------------------
        // BOX WEER BESCHIKBAAR MAKEN
        // --------------------------------------

        if (reservering.box_id) {

            const { error: boxError } =
                await supabaseClient
                    .from("boxen")
                    .update({
                        beschikbaar: true
                    })
                    .eq("id", reservering.box_id);

            if (boxError) {
                console.error(
                    "Box beschikbaar maken mislukt:",
                    boxError
                );

                alert(
                    "De box kon niet opnieuw beschikbaar worden gemaakt."
                );

                return;
            }
        }


        // --------------------------------------
        // RESERVERING VERWIJDEREN
        // --------------------------------------

        const { error: deleteError } =
            await supabaseClient
                .from("reserveringen")
                .delete()
                .eq("id", reserveringId)
                .eq("gebruiker_id", user.id);

        if (deleteError) {
            console.error(
                "Reservering verwijderen mislukt:",
                deleteError
            );

            alert(
                "De reservering kon niet worden geannuleerd."
            );

            return;
        }


        // --------------------------------------
        // PAGINA OPNIEUW LADEN
        // --------------------------------------

        alert("✅ Je reservering is geannuleerd.");

        window.location.reload();

    } catch (error) {

        console.error(
            "Onverwachte fout bij annuleren:",
            error
        );

        alert(
            "Er ging iets mis bij het annuleren."
        );
    }
}


// ==========================================
// INLOGGEN
// ==========================================

async function login() {

    const emailInput = document.getElementById("loginEmail");
    const wachtwoordInput = document.getElementById("loginWachtwoord");

    if (!emailInput || !wachtwoordInput) {
        return;
    }

    const email = emailInput.value.trim();
    const wachtwoord = wachtwoordInput.value;

    if (!email || !wachtwoord) {
        toonMelding(
            "loginMelding",
            "Vul je e-mailadres en wachtwoord in.",
            "error"
        );

        return;
    }


    try {

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: wachtwoord
            });

        if (error) {

            console.error(
                "Inloggen mislukt:",
                error
            );

            toonMelding(
                "loginMelding",
                "❌ E-mailadres of wachtwoord is onjuist.",
                "error"
            );

            return;
        }


        toonMelding(
            "loginMelding",
            "✅ Je bent succesvol ingelogd!",
            "success"
        );


        // Als er een box geselecteerd is,
        // ga naar reserveringspagina
        const urlParams =
            new URLSearchParams(window.location.search);

        const boxId = urlParams.get("box");

        setTimeout(() => {

            if (boxId) {
                window.location.href =
                    `reserveren.html?box=${encodeURIComponent(boxId)}`;
            } else {
                window.location.href =
                    "account.html";
            }

        }, 1000);

    } catch (error) {

        console.error(
            "Onverwachte login fout:",
            error
        );

        toonMelding(
            "loginMelding",
            "❌ Er ging iets mis bij het inloggen.",
            "error"
        );
    }
}


// ==========================================
// ACCOUNT AANMAKEN
// ==========================================

async function registreer() {

    const naamInput =
        document.getElementById("registreerNaam");

    const emailInput =
        document.getElementById("registreerEmail");

    const wachtwoordInput =
        document.getElementById("registreerWachtwoord");


    if (
        !naamInput ||
        !emailInput ||
        !wachtwoordInput
    ) {
        return;
    }


    const naam =
        naamInput.value.trim();

    const email =
        emailInput.value.trim();

    const wachtwoord =
        wachtwoordInput.value;


    if (!naam || !email || !wachtwoord) {

        toonMelding(
            "registreerMelding",
            "Vul alle velden in.",
            "error"
        );

        return;
    }


    if (wachtwoord.length < 6) {

        toonMelding(
            "registreerMelding",
            "Je wachtwoord moet minimaal 6 tekens bevatten.",
            "error"
        );

        return;
    }


    try {

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


        if (error) {

            console.error(
                "Registreren mislukt:",
                error
            );

            toonMelding(
                "registreerMelding",
                `❌ ${error.message}`,
                "error"
            );

            return;
        }


        toonMelding(
            "registreerMelding",
            "✅ Account aangemaakt!",
            "success"
        );


        // Supabase kan e-mailbevestiging vereisen.
        if (data.user && !data.session) {

            toonMelding(
                "registreerMelding",
                "✅ Account aangemaakt! Controleer je e-mail om je account te bevestigen.",
                "success"
            );

            return;
        }


        setTimeout(() => {
            window.location.href = "account.html";
        }, 1000);


    } catch (error) {

        console.error(
            "Onverwachte registratie fout:",
            error
        );

        toonMelding(
            "registreerMelding",
            "❌ Er ging iets mis bij het registreren.",
            "error"
        );
    }
}


// ==========================================
// UITLOGGEN
// ==========================================

async function logout() {

    try {

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {
            console.error(
                "Uitloggen mislukt:",
                error
            );

            return;
        }

        window.location.href = "index.html";

    } catch (error) {

        console.error(
            "Onverwachte logout fout:",
            error
        );
    }
}


// ==========================================
// HTML VEILIG MAKEN
// ==========================================

function escapeHtml(tekst) {

    if (tekst === null || tekst === undefined) {
        return "";
    }

    return String(tekst)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// EVENT LISTENERS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // Homepage
    laadBoxen();


    // Reserveringspagina
    laadGekozenBox();


    // Accountpagina
    laadAccount();


    // --------------------------------------
    // RESERVERINGSFORMULIER
    // --------------------------------------

    const reserveringsForm =
        document.getElementById("reserveringsForm");

    if (reserveringsForm) {

        reserveringsForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                await maakReservering();
            }
        );
    }


    // --------------------------------------
    // LOGIN FORMULIER
    // --------------------------------------

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                await login();
            }
        );
    }


    // --------------------------------------
    // REGISTRATIE FORMULIER
    // --------------------------------------

    const registratieForm =
        document.getElementById("registratieForm");

    if (registratieForm) {

        registratieForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                await registreer();
            }
        );
    }


    // --------------------------------------
    // LOGOUT KNOP
    // --------------------------------------

    const logoutKnop =
        document.getElementById("logoutKnop");

    if (logoutKnop) {

        logoutKnop.addEventListener(
            "click",
            async () => {

                await logout();
            }
        );
    }

});