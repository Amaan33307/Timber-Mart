// ========================================
// TIMBER MART — SHARED HELPERS
// Loaded on every dashboard page (header.ejs).
// Everything lives on window.TM.
// ========================================

(function () {

    const DEPARTMENTS = [
        "Carpentry",
        "Polishing",
        "Finishing",
        "Production",
        "Warehouse"
    ];


    // ========================================
    // TEXT / FORMAT HELPERS
    // ========================================

    function escapeHtml(value) {

        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    }


    function initials(name) {

        return String(name || "?")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("");

    }


    // "2026-08-18" -> Date (local)
    function parseDateKey(key) {

        const [year, month, day] =
            String(key).split("-").map(Number);

        return new Date(year, month - 1, day);

    }


    function todayKey() {

        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");

    }


    // 08:42 AM
    function formatTime(value) {

        if (!value) {
            return "--:--";
        }

        return new Date(value).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).toUpperCase();

    }


    // 18 Aug 2026  (accepts "2026-08-18" or a date)
    function formatDate(value) {

        if (!value) {
            return "--";
        }

        const date =
            typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
                ? parseDateKey(value)
                : new Date(value);

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    }


    // 18 August 2026
    function formatLongDate(value) {

        if (!value) {
            return "--";
        }

        const date =
            typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
                ? parseDateKey(value)
                : new Date(value);

        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    }


    // "2026-08" -> August 2026
    function formatMonth(monthKey) {

        const [year, month] =
            monthKey.split("-").map(Number);

        return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric"
        });

    }


    // 8.82 -> "8h 49m"
    function formatHours(hours) {

        if (!hours || hours <= 0) {
            return "--";
        }

        const totalMinutes =
            Math.round(hours * 60);

        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;

        return `${h}h ${String(m).padStart(2, "0")}m`;

    }


    // 176.5 -> "176h 30m" (for totals; shows 0h when empty)
    function formatTotalHours(hours) {

        if (!hours || hours <= 0) {
            return "0h";
        }

        const totalMinutes =
            Math.round(hours * 60);

        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;

        return m ? `${h}h ${m}m` : `${h}h`;

    }


    function statusBadge(status) {

        const classes = {
            Present: "present",
            Late: "late",
            Absent: "absent"
        };

        return `<span class="status-badge ${classes[status] || ""}">${escapeHtml(status)}</span>`;

    }


    function workerStatusBadge(status) {

        const active = status === "active";

        return `<span class="worker-status ${active ? "active" : "inactive"}">${active ? "Active" : "Inactive"}</span>`;

    }


    function capitalize(text) {

        text = String(text || "");

        return text.charAt(0).toUpperCase() + text.slice(1);

    }


    // ========================================
    // API WRAPPER
    // Always resolves to { ok, status, data }.
    // A 401 (session expired) sends the user to login.
    // ========================================

    async function api(url, options = {}) {

        const settings = {
            method: options.method || "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin"
        };

        if (options.body !== undefined) {

            settings.headers["Content-Type"] = "application/json";

            settings.body = JSON.stringify(options.body);

        }


        let response;

        try {

            response = await fetch(url, settings);

        } catch (error) {

            return {
                ok: false,
                status: 0,
                data: {
                    success: false,
                    message: "Unable to connect to the server. Please check your connection."
                }
            };

        }


        let data = {};

        try {

            data = await response.json();

        } catch (error) {

            data = {
                success: false,
                message: "Unexpected response from the server."
            };

        }


        if (response.status === 401 && !options.allowUnauthorized) {

            window.location.href = "/";

        }


        return {
            ok: response.ok && data.success !== false,
            status: response.status,
            data
        };

    }


    // ========================================
    // TOAST MESSAGES
    // ========================================

    function toast(message, type = "success") {

        let container =
            document.getElementById("tmToastContainer");

        if (!container) {

            container = document.createElement("div");
            container.id = "tmToastContainer";
            container.className = "tm-toast-container";

            document.body.appendChild(container);

        }


        const icons = {
            success: "bi-check-circle",
            error: "bi-exclamation-circle",
            info: "bi-info-circle"
        };


        const item = document.createElement("div");

        item.className = `tm-toast ${type}`;

        item.setAttribute("role", "status");

        item.innerHTML =
            `<i class="bi ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;

        container.appendChild(item);


        setTimeout(() => {

            item.classList.add("hide");

            setTimeout(() => item.remove(), 300);

        }, 3800);

    }


    // ========================================
    // TABLE STATES
    // ========================================

    function tableMessage(tbody, columns, icon, message) {

        if (!tbody) {
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="${columns}" class="tm-table-message">
                    <i class="bi ${icon}"></i>
                    <span>${escapeHtml(message)}</span>
                </td>
            </tr>
        `;

    }


    function setText(id, value) {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }

    }


    // ========================================
    // CSV DOWNLOAD
    // ========================================

    function downloadCSV(filename, rows) {

        const csv =
            rows
                .map((row) =>
                    row
                        .map((cell) => `"${String(cell === null || cell === undefined ? "" : cell).replace(/"/g, '""')}"`)
                        .join(",")
                )
                .join("\r\n");

        const blob =
            new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });

        const link =
            document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    }


    // ========================================
    // LOGOUT  (any element with data-logout)
    // ========================================

    async function logout() {

        await api("/api/auth/logout", {
            method: "POST",
            allowUnauthorized: true
        });

        window.location.replace("/");

    }


    document.addEventListener("click", function (event) {

        const trigger =
            event.target.closest("[data-logout]");

        if (!trigger) {
            return;
        }

        event.preventDefault();

        logout();

    });


    // ========================================
    // ADD / EDIT WORKER MODAL (admin)
    // TM.openWorkerModal({ worker, onSaved })
    // ========================================

    function openWorkerModal(options = {}) {

        const worker = options.worker || null;

        const editing = Boolean(worker);


        const old = document.getElementById("tmWorkerModal");

        if (old) {
            old.remove();
        }


        const departmentOptions =
            DEPARTMENTS.map((department) => `
                <option value="${department}" ${worker && worker.department === department ? "selected" : ""}>
                    ${department}
                </option>
            `).join("");


        const wrapper = document.createElement("div");

        wrapper.innerHTML = `
            <div class="modal fade tm-modal" id="tmWorkerModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <form class="modal-content" id="tmWorkerForm" novalidate>

                        <div class="modal-header">
                            <div>
                                <h5 class="modal-title">${editing ? "Edit Worker" : "Add Worker"}</h5>
                                <p>${editing
                                    ? `Update details for ${escapeHtml(worker.workerId || "")}`
                                    : "A Worker ID will be generated automatically."}</p>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>

                        <div class="modal-body">

                            <div class="tm-form-message" id="tmWorkerFormMessage"></div>

                            <div class="row g-3">

                                <div class="col-12">
                                    <label class="form-label">Full Name</label>
                                    <input class="form-control" name="name" required value="${escapeHtml(worker ? worker.name : "")}">
                                </div>

                                <div class="col-md-6">
                                    <label class="form-label">Email Address</label>
                                    <input class="form-control" type="email" name="email" required value="${escapeHtml(worker ? worker.email : "")}">
                                </div>

                                <div class="col-md-6">
                                    <label class="form-label">Phone Number</label>
                                    <input class="form-control" type="tel" name="phone" required value="${escapeHtml(worker ? worker.phone : "")}">
                                </div>

                                <div class="col-md-6">
                                    <label class="form-label">Department</label>
                                    <select class="form-select" name="department" required>
                                        <option value="">Select department</option>
                                        ${departmentOptions}
                                    </select>
                                </div>

                                <div class="col-md-6">
                                    <label class="form-label">${editing ? "New Password" : "Password"}</label>
                                    <input class="form-control" type="password" name="password" autocomplete="new-password"
                                        placeholder="${editing ? "Leave blank to keep" : "At least 6 characters"}" ${editing ? "" : "required"}>
                                </div>

                            </div>

                        </div>

                        <div class="modal-footer">
                            <button type="button" class="tm-btn-light" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="tm-btn-primary" id="tmWorkerSave">
                                ${editing ? "Save Changes" : "Add Worker"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper.firstElementChild);


        const modalElement = document.getElementById("tmWorkerModal");
        const form = document.getElementById("tmWorkerForm");
        const message = document.getElementById("tmWorkerFormMessage");
        const saveButton = document.getElementById("tmWorkerSave");

        const modal = new bootstrap.Modal(modalElement);


        form.addEventListener("submit", async function (event) {

            event.preventDefault();

            const values =
                Object.fromEntries(new FormData(form).entries());

            if (editing && !values.password) {
                delete values.password;
            }


            saveButton.disabled = true;

            message.className = "tm-form-message";


            const result = await api(
                editing
                    ? `/api/admin/workers/${worker._id}`
                    : "/api/admin/workers",
                {
                    method: editing ? "PUT" : "POST",
                    body: values
                }
            );


            saveButton.disabled = false;


            if (!result.ok) {

                message.textContent =
                    result.data.message || "Unable to save worker.";

                message.className = "tm-form-message error";

                return;

            }


            modal.hide();

            toast(result.data.message || "Worker saved.");

            if (typeof options.onSaved === "function") {
                options.onSaved(result.data.worker);
            }

        });


        modalElement.addEventListener("hidden.bs.modal", function () {

            modalElement.remove();

        });


        modal.show();

    }


    // ========================================
    // ACTIVATE / DEACTIVATE WORKER (admin)
    // ========================================

    async function setWorkerStatus(worker, status) {

        const action =
            status === "inactive" ? "deactivate" : "activate";

        const confirmed =
            window.confirm(
                `Are you sure you want to ${action} ${worker.name} (${worker.workerId})?` +
                (status === "inactive"
                    ? "\n\nThey will be signed out and will not be able to log in."
                    : "")
            );

        if (!confirmed) {
            return null;
        }


        const result =
            await api(`/api/admin/workers/${worker._id}/status`, {
                method: "PATCH",
                body: { status }
            });

        if (!result.ok) {

            toast(result.data.message || "Unable to update worker status.", "error");

            return null;

        }

        toast(result.data.message);

        return result.data.worker;

    }


    // ========================================
    // EXPORT
    // ========================================

    window.TM = {
        DEPARTMENTS,
        escapeHtml,
        initials,
        parseDateKey,
        todayKey,
        formatTime,
        formatDate,
        formatLongDate,
        formatMonth,
        formatHours,
        formatTotalHours,
        statusBadge,
        workerStatusBadge,
        capitalize,
        api,
        toast,
        tableMessage,
        setText,
        downloadCSV,
        logout,
        openWorkerModal,
        setWorkerStatus
    };

})();
