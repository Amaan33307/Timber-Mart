// ========================================
// LOGIN FORM
// ========================================

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const loginButton =
    document.getElementById("loginButton");


function setLoginLoading(isLoading) {

    loginButton.disabled = isLoading;

    loginButton.innerHTML = isLoading
        ? `<span>Logging in...</span>
           <i class="bi bi-arrow-repeat"></i>`
        : `<span>Login</span>
           <i class="bi bi-arrow-right"></i>`;

}


// ========================================
// LOGIN
// ========================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const formData =
                new FormData(loginForm);

            const email =
                String(formData.get("email") || "").trim();

            const password =
                String(formData.get("password") || "");

            const remember =
                formData.get("remember") === "on";


            if (!email || !password) {

                showLoginMessage(
                    "Please enter email and password.",
                    "error"
                );

                return;

            }


            setLoginLoading(true);

            showLoginMessage("", "");


            try {

                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify({
                                email,
                                password,
                                remember
                            })
                        }
                    );


                const data =
                    await response.json();


                // SUCCESS
                if (data.success) {

                    showLoginMessage(
                        "Login successful. Redirecting...",
                        "success"
                    );

                    window.location.href =
                        data.redirect;

                    return;

                }


                // ERROR
                showLoginMessage(
                    data.message || "Unable to log in.",
                    "error"
                );

            } catch (error) {

                console.error("Login Error:", error);

                showLoginMessage(
                    "Unable to connect to server.",
                    "error"
                );

            }


            setLoginLoading(false);

        }
    );

}


// ========================================
// MESSAGE
// ========================================

function showLoginMessage(message, type) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent =
        message;

    loginMessage.className =
        "login-message " + type;

}


// ========================================
// FORGOT PASSWORD
// Passwords are reset by the administrator
// ========================================

const forgotPasswordLink =
    document.getElementById("forgotPasswordLink");

if (forgotPasswordLink) {

    forgotPasswordLink.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            showLoginMessage(
                "Please contact your Timber Mart administrator to reset your password.",
                "success"
            );

        }
    );

}


// ========================================
// PASSWORD TOGGLE
// ========================================

const togglePassword =
    document.getElementById("togglePassword");

const loginPassword =
    document.getElementById("loginPassword");


if (
    togglePassword &&
    loginPassword
) {

    togglePassword.addEventListener(
        "click",
        function () {

            if (loginPassword.type === "password") {

                loginPassword.type = "text";

                this.innerHTML =
                    '<i class="bi bi-eye-slash"></i>';

            } else {

                loginPassword.type = "password";

                this.innerHTML =
                    '<i class="bi bi-eye"></i>';

            }

        }
    );

}
