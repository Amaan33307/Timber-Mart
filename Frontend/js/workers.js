// ========================================
// WORKER DIRECTORY + WORKER DETAILS
// workers.ejs        -> #workersTable
// worker-details.ejs -> #workerDetailsContent
// (Both are admin-only data; workers see a notice.)
// ========================================

(function () {

    const { escapeHtml } = TM;


    // ========================================
    // WORKER DIRECTORY
    // ========================================

    function initDirectory() {

        const tbody = document.getElementById("workersTableBody");
        const workerSearch = document.getElementById("workerSearch");
        const departmentFilter = document.getElementById("departmentFilter");
        const workerStatusFilter = document.getElementById("workerStatusFilter");
        const addWorkerBtn = document.getElementById("addWorkerBtn");

        let workers = [];


        function filterWorkers() {

            const searchValue =
                workerSearch.value.toLowerCase().trim();

            const searchDigits =
                searchValue.replace(/\D/g, "");

            return workers.filter((worker) => {

                const phone =
                    String(worker.phone || "");

                const matchesSearch =
                    !searchValue ||
                    worker.name.toLowerCase().includes(searchValue) ||
                    String(worker.workerId || "").toLowerCase().includes(searchValue) ||
                    phone.toLowerCase().includes(searchValue) ||
                    (searchDigits.length >= 3 && phone.replace(/\D/g, "").includes(searchDigits));

                const matchesDepartment =
                    departmentFilter.value === "all" ||
                    worker.department === departmentFilter.value;

                const matchesStatus =
                    workerStatusFilter.value === "all" ||
                    worker.status === workerStatusFilter.value;

                return matchesSearch && matchesDepartment && matchesStatus;

            });

        }


        function render() {

            const visible = filterWorkers();

            TM.setText(
                "workerCount",
                visible.length === workers.length
                    ? `${workers.length} Worker${workers.length === 1 ? "" : "s"}`
                    : `${visible.length} of ${workers.length} Workers`
            );

            if (!workers.length) {

                TM.tableMessage(tbody, 7, "bi-people", "No workers registered yet.");

                return;

            }

            if (!visible.length) {

                TM.tableMessage(tbody, 7, "bi-search", "No workers match your search or filters.");

                return;

            }

            tbody.innerHTML =
                visible.map((worker) => `
                    <tr>
                        <td>
                            <div class="worker-info">
                                <div class="worker-avatar">${escapeHtml(TM.initials(worker.name))}</div>
                                <div>
                                    <strong>${escapeHtml(worker.name)}</strong>
                                    <small>${escapeHtml(worker.email)}</small>
                                </div>
                            </div>
                        </td>
                        <td>${escapeHtml(worker.workerId)}</td>
                        <td><span class="department-badge">${escapeHtml(worker.department)}</span></td>
                        <td>${escapeHtml(worker.phone)}</td>
                        <td>${TM.workerStatusBadge(worker.status)}</td>
                        <td>${TM.formatDate(worker.createdAt)}</td>
                        <td>
                            <a href="/worker-details?id=${worker._id}" class="view-worker-btn" title="View worker">
                                <i class="bi bi-eye"></i>
                            </a>
                        </td>
                    </tr>
                `).join("");

        }


        async function load() {

            const [workersResult, dashboardResult] =
                await Promise.all([
                    TM.api("/api/admin/workers"),
                    TM.api("/api/admin/dashboard")
                ]);

            if (!workersResult.ok) {

                TM.tableMessage(tbody, 7, "bi-exclamation-circle", workersResult.data.message || "Unable to load workers.");

                return;

            }

            workers = workersResult.data.workers;

            if (dashboardResult.ok) {

                const stats = dashboardResult.data.statistics;

                TM.setText("dirTotalWorkers", stats.totalWorkers);
                TM.setText("dirActiveWorkers", stats.activeWorkers);
                TM.setText("dirWorkingToday", stats.presentToday + stats.lateToday);
                TM.setText("dirAbsentToday", stats.absentToday);

            }

            render();

        }


        workerSearch.addEventListener("input", render);
        departmentFilter.addEventListener("change", render);
        workerStatusFilter.addEventListener("change", render);

        if (addWorkerBtn) {

            addWorkerBtn.addEventListener("click", function () {

                TM.openWorkerModal({ onSaved: load });

            });

        }

        load();

    }


    // ========================================
    // WORKER DETAILS
    // /worker-details?id=<MongoDB id or TM-001>
    // ========================================

    function initDetails() {

        const id =
            new URLSearchParams(window.location.search).get("id");

        const editButton = document.getElementById("editWorkerBtn");
        const statusButton = document.getElementById("deactivateBtn");

        let worker = null;


        function showNotFound(message) {

            document.getElementById("workerDetailsContent").classList.add("d-none");

            document.getElementById("workerNotFound").classList.remove("d-none");

            if (message) {
                TM.setText("workerNotFoundMessage", message);
            }

        }


        function renderWorker() {

            const active = worker.status === "active";

            TM.setText("detailAvatar", TM.initials(worker.name));
            TM.setText("detailName", worker.name);
            TM.setText("detailWorkerIdTop", worker.workerId);
            TM.setText("detailFullName", worker.name);
            TM.setText("detailWorkerId", worker.workerId);
            TM.setText("detailEmail", worker.email);
            TM.setText("detailPhone", worker.phone);
            TM.setText("detailDepartment", worker.department);
            TM.setText("detailDepartmentSide", worker.department);
            TM.setText("detailJoined", TM.formatLongDate(worker.createdAt));
            TM.setText("detailRole", TM.capitalize(worker.role));

            const badge = document.getElementById("detailStatusBadge");

            badge.textContent = active ? "Active" : "Inactive";
            badge.className = `worker-status ${active ? "active" : "inactive"}`;

            ["detailStatusText", "detailAccount"].forEach((elementId) => {

                const element = document.getElementById(elementId);

                element.textContent = active ? "Active" : "Inactive";
                element.className = active ? "active-text" : "inactive-text";

            });

            statusButton.disabled = false;
            editButton.disabled = false;

            statusButton.classList.toggle("activate-btn", !active);

            statusButton.innerHTML = active
                ? '<i class="bi bi-person-x"></i> Deactivate Worker'
                : '<i class="bi bi-person-check"></i> Activate Worker';

            document.title = `${worker.name} | Timber Mart`;

        }


        function renderAttendance(attendance) {

            const stats = attendance.statistics;

            TM.setText("detailSummaryMonth", `${TM.formatMonth(attendance.month)} overview`);
            TM.setText("detailPresent", stats.presentDays);
            TM.setText("detailAbsent", stats.absentDays);
            TM.setText("detailLate", stats.lateDays);
            TM.setText("detailRate", stats.attendanceRate + "%");

            const tbody = document.getElementById("detailRecentBody");

            if (!attendance.recent.length) {

                TM.tableMessage(tbody, 5, "bi-calendar-x", "No attendance records this month.");

                return;

            }

            tbody.innerHTML =
                attendance.recent.map((row) => `
                    <tr>
                        <td>${TM.formatDate(row.date)}</td>
                        <td>${row.checkIn ? TM.formatTime(row.checkIn) : "--"}</td>
                        <td>${row.checkOut ? TM.formatTime(row.checkOut) : "--"}</td>
                        <td>${TM.formatHours(row.workingHours)}</td>
                        <td>${TM.statusBadge(row.status)}</td>
                    </tr>
                `).join("");

        }


        async function load() {

            if (!id) {

                showNotFound("No worker was selected. Please choose a worker from the list.");

                return;

            }

            const result =
                await TM.api("/api/admin/workers/" + encodeURIComponent(id));

            if (!result.ok) {

                showNotFound(result.data.message);

                return;

            }

            worker = result.data.worker;

            renderWorker();

            renderAttendance(result.data.attendance);

        }


        editButton.addEventListener("click", function () {

            if (!worker) {
                return;
            }

            TM.openWorkerModal({
                worker,
                onSaved: function (updated) {

                    worker = updated;

                    renderWorker();

                }
            });

        });


        statusButton.addEventListener("click", async function () {

            if (!worker) {
                return;
            }

            statusButton.disabled = true;

            const updated =
                await TM.setWorkerStatus(
                    worker,
                    worker.status === "active" ? "inactive" : "active"
                );

            if (updated) {
                worker = updated;
            }

            renderWorker();

        });


        load();

    }


    // ========================================
    // START
    // ========================================

    if (document.getElementById("workersTable")) {
        initDirectory();
    }

    if (document.getElementById("workerDetailsContent")) {
        initDetails();
    }

})();
