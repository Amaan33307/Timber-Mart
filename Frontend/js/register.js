// ========================================
// REGISTER FORM
// ========================================

const registerForm =
    document.getElementById("registerForm");

const registerMessage =
    document.getElementById("registerMessage");

const registerButton =
    document.getElementById("registerButton");


function setRegisterLoading(isLoading) {

    registerButton.disabled = isLoading;

    registerButton.innerHTML = isLoading
        ? `<span>Creating Account...</span>
           <i class="bi bi-arrow-repeat"></i>`
        : `<span>Create Account</span>
           <i class="bi bi-arrow-right"></i>`;

}


// ========================================
// REGISTER
// ========================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const formData =
                new FormData(registerForm);

            const payload = {
                name: String(formData.get("name") || "").trim(),
                email: String(formData.get("email") || "").trim(),
                phone: String(formData.get("phone") || "").trim(),
                department: String(formData.get("department") || ""),
                password: String(formData.get("password") || ""),
                confirmPassword: document.getElementById("confirmPassword").value
            };


            // ========================================
            // CLIENT-SIDE CHECKS
            // (the server validates everything again)
            // ========================================

            if (!payload.department) {

                showRegisterMessage("Please select your department.", "error");

                return;

            }

            if (payload.password.length < 6) {

                showRegisterMessage("Password must be at least 6 characters.", "error");

                return;

            }

            if (payload.password !== payload.confirmPassword) {

                showRegisterMessage("Passwords do not match.", "error");

                return;

            }


            setRegisterLoading(true);


            try {

                const response =
                    await fetch(
                        "/api/auth/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify(payload)
                        }
                    );


                const data =
                    await response.json();


                // SUCCESS
                if (data.success) {

                    showRegisterMessage(
                        `Account created! Your Worker ID is ${data.workerId}. Redirecting...`,
                        "success"
                    );

                    setTimeout(function () {

                        window.location.href =
                            data.redirect || "/dashboard";

                    }, 1400);

                    return;

                }


                // ERROR
                showRegisterMessage(
                    data.message || "Unable to create account.",
                    "error"
                );

            } catch (error) {

                console.error("Registration Error:", error);

                showRegisterMessage(
                    "Unable to connect to server.",
                    "error"
                );

            }


            setRegisterLoading(false);

        }
    );

}


// ========================================
// MESSAGE
// ========================================

function showRegisterMessage(message, type) {

    if (!registerMessage) {
        return;
    }

    registerMessage.textContent =
        message;

    registerMessage.className =
        "login-message " + type;

}


// ========================================
// PASSWORD TOGGLES
// ========================================

function setupPasswordToggle(buttonId, inputId) {

    const button =
        document.getElementById(buttonId);

    const input =
        document.getElementById(inputId);

    if (!button || !input) {
        return;
    }

    button.addEventListener("click", function () {

        const show =
            input.type === "password";

        input.type =
            show ? "text" : "password";

        this.innerHTML = show
            ? '<i class="bi bi-eye-slash"></i>'
            : '<i class="bi bi-eye"></i>';

    });

}

setupPasswordToggle("toggleRegisterPassword", "registerPassword");

setupPasswordToggle("toggleConfirmPassword", "confirmPassword");
