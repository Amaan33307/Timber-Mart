// ========================================
// SETTINGS
// ========================================

(function () {

    // ========================================
    // SETTINGS NAVIGATION
    // ========================================

    const settingsButtons =
        document.querySelectorAll(".settings-menu-item[data-section]");

    const settingsSections =
        document.querySelectorAll(".settings-section");


    settingsButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            settingsButtons.forEach((item) => item.classList.remove("active"));

            settingsSections.forEach((section) => section.classList.remove("active"));

            this.classList.add("active");

            const selectedSection =
                document.getElementById(this.dataset.section);

            if (selectedSection) {
                selectedSection.classList.add("active");
            }

        });

    });


    function showMessage(elementId, message, type) {

        const element =
            document.getElementById(elementId);

        element.textContent = message;

        element.className = `tm-form-message ${type}`;

    }


    // ========================================
    // ACCOUNT FORM  ->  PUT /api/auth/profile
    // ========================================

    const accountForm =
        document.getElementById("accountForm");

    accountForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const button =
            document.getElementById("accountSaveBtn");

        const values =
            Object.fromEntries(new FormData(accountForm).entries());

        button.disabled = true;

        const result =
            await TM.api("/api/auth/profile", {
                method: "PUT",
                body: values
            });

        button.disabled = false;

        if (!result.ok) {

            showMessage("accountMessage", result.data.message || "Unable to update profile.", "error");

            return;

        }

        const user = result.data.user;

        showMessage("accountMessage", result.data.message, "success");

        TM.setText("settingsName", user.name);
        TM.setText("settingsAvatar", TM.initials(user.name));

        // Keep the navbar in sync
        const navName = document.querySelector(".nav-user strong");
        const navAvatar = document.querySelector(".nav-avatar");

        if (navName) { navName.textContent = user.name; }
        if (navAvatar) { navAvatar.textContent = TM.initials(user.name); }

    });


    // ========================================
    // PASSWORD FORM  ->  PUT /api/auth/password
    // ========================================

    const passwordForm =
        document.getElementById("passwordForm");

    passwordForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const values =
            Object.fromEntries(new FormData(passwordForm).entries());

        if (!values.currentPassword || !values.newPassword || !values.confirmPassword) {

            showMessage("passwordMessage", "Please fill all password fields.", "error");

            return;

        }

        if (values.newPassword.length < 6) {

            showMessage("passwordMessage", "New password must be at least 6 characters.", "error");

            return;

        }

        if (values.newPassword !== values.confirmPassword) {

            showMessage("passwordMessage", "New passwords do not match.", "error");

            return;

        }


        const button =
            document.getElementById("passwordSaveBtn");

        button.disabled = true;

        const result =
            await TM.api("/api/auth/password", {
                method: "PUT",
                body: values
            });

        button.disabled = false;

        if (!result.ok) {

            showMessage("passwordMessage", result.data.message || "Unable to update password.", "error");

            return;

        }

        passwordForm.reset();

        showMessage("passwordMessage", result.data.message, "success");

    });


    // ========================================
    // NOTIFICATION PREFERENCES (this browser)
    // ========================================

    const STORAGE_KEY = "tm-notification-preferences";

    function readPreferences() {

        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (error) {
            return {};
        }

    }

    function savePreferences(preferences) {

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            return true;
        } catch (error) {
            return false;
        }

    }


    const preferences = readPreferences();

    document.querySelectorAll("[data-preference]").forEach(function (toggle) {

        const key = toggle.dataset.preference;

        if (typeof preferences[key] === "boolean") {
            toggle.checked = preferences[key];
        }

        toggle.addEventListener("change", function () {

            preferences[key] = toggle.checked;

            if (savePreferences(preferences)) {
                TM.toast("Notification preference saved.");
            }

        });

    });

})();
