// ========================================
// ADMIN PAGES
// admin-dashboard  -> #adminDashboardPage
// admin-workers    -> #adminWorkersPage
// admin-attendance -> #adminAttendancePage
// ========================================

(function () {

    const { escapeHtml } = TM;


    function workerCell(name, workerId) {

        return `
            <div class="admin-worker-info">
                <div class="worker-avatar">${escapeHtml(TM.initials(name))}</div>
                <strong>
                    ${escapeHtml(name)}
                    ${workerId ? `<span class="tm-subtext">${escapeHtml(workerId)}</span>` : ""}
                </strong>
            </div>
        `;

    }


    // ========================================
    // ADMIN DASHBOARD
    // ========================================

    async function initDashboard() {

        TM.setText(
            "adminDate",
            new Date().toLocaleDateString("en-GB", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
        );


        const result =
            await TM.api("/api/admin/dashboard");

        const recentBody =
            document.getElementById("recentWorkersBody");

        if (!result.ok) {

            TM.tableMessage(recentBody, 5, "bi-exclamation-circle", result.data.message || "Unable to load dashboard.");

            TM.toast(result.data.message || "Unable to load dashboard.", "error");

            return;

        }


        const stats = result.data.statistics;

        const expected = stats.expectedToday;

        const percent = (value) =>
            expected > 0 ? Math.round((value / expected) * 100) : 0;


        // STAT CARDS
        TM.setText("statTotalWorkers", stats.totalWorkers);

        TM.setText(
            "statTotalWorkersNote",
            `${stats.activeWorkers} active` +
            (stats.joinedThisMonth ? ` · +${stats.joinedThisMonth} this month` : "")
        );

        TM.setText("statPresentToday", stats.presentToday);
        TM.setText("statPresentNote", `${percent(stats.presentToday)}% on time`);

        TM.setText("statAbsentToday", stats.absentToday);
        TM.setText("statAbsentNote", `${percent(stats.absentToday)}% of workers`);

        TM.setText("statLateToday", stats.lateToday);
        TM.setText("statLateNote", stats.lateToday ? "Needs attention" : "No late arrivals");


        // OVERVIEW
        TM.setText("overviewRate", stats.attendanceRate + "%");
        TM.setText("overviewPresent", stats.presentToday);
        TM.setText("overviewAbsent", stats.absentToday);
        TM.setText("overviewLate", stats.lateToday);

        TM.setText(
            "overviewSubtitle",
            `${stats.presentToday + stats.lateToday} of ${expected} active workers checked in`
        );

        const ring = document.getElementById("overviewRing");

        if (ring) {
            ring.style.setProperty("--rate", stats.attendanceRate);
        }

        const notice = document.getElementById("adminWeeklyOffNotice");

        if (notice) {
            notice.classList.toggle("d-none", result.data.isWorkingDay !== false);
        }


        // RECENT WORKERS
        const workers = result.data.recentWorkers;

        if (!workers.length) {

            TM.tableMessage(recentBody, 5, "bi-people", "No workers have registered yet.");

            return;

        }

        recentBody.innerHTML =
            workers.map((worker) => `
                <tr>
                    <td>
                        <a href="/worker-details?id=${worker._id}" class="text-reset">
                            ${workerCell(worker.name)}
                        </a>
                    </td>
                    <td>${escapeHtml(worker.workerId)}</td>
                    <td>${escapeHtml(worker.department)}</td>
                    <td>${TM.formatDate(worker.createdAt)}</td>
                    <td>${TM.workerStatusBadge(worker.status)}</td>
                </tr>
            `).join("");

    }


    // ========================================
    // ADMIN WORKERS
    // ========================================

    function initWorkers() {

        const tbody = document.getElementById("adminWorkersBody");
        const search = document.getElementById("adminWorkerSearch");
        const department = document.getElementById("adminWorkerDepartment");
        const status = document.getElementById("adminWorkerStatus");
        const addButton = document.getElementById("adminAddWorker");

        let workers = [];


        function matches(worker) {

            const term =
                search.value.toLowerCase().trim();

            const termDigits =
                term.replace(/\D/g, "");

            const phoneDigits =
                String(worker.phone || "").replace(/\D/g, "");

            const searchMatch =
                !term ||
                worker.name.toLowerCase().includes(term) ||
                String(worker.workerId || "").toLowerCase().includes(term) ||
                String(worker.phone || "").toLowerCase().includes(term) ||
                (termDigits.length >= 3 && phoneDigits.includes(termDigits));

            const departmentMatch =
                department.value === "all" ||
                worker.department === department.value;

            const statusMatch =
                status.value === "all" ||
                worker.status === status.value;

            return searchMatch && departmentMatch && statusMatch;

        }


        function render() {

            const visible = workers.filter(matches);

            TM.setText(
                "adminWorkerCount",
                visible.length === workers.length
                    ? `${workers.length} Worker${workers.length === 1 ? "" : "s"}`
                    : `${visible.length} of ${workers.length} Workers`
            );

            if (!workers.length) {

                TM.tableMessage(tbody, 6, "bi-people", "No workers yet. Click \"Add Worker\" to create one.");

                return;

            }

            if (!visible.length) {

                TM.tableMessage(tbody, 6, "bi-search", "No workers match your search or filters.");

                return;

            }

            tbody.innerHTML =
                visible.map((worker) => {

                    const active = worker.status === "active";

                    return `
                        <tr>
                            <td>${workerCell(worker.name)}</td>
                            <td>${escapeHtml(worker.workerId)}</td>
                            <td>${escapeHtml(worker.department)}</td>
                            <td>${escapeHtml(worker.phone)}</td>
                            <td>${TM.workerStatusBadge(worker.status)}</td>
                            <td>
                                <div class="tm-row-actions">
                                    <a
                                        href="/worker-details?id=${worker._id}"
                                        class="view-worker-btn"
                                        title="View worker"
                                    >
                                        <i class="bi bi-eye"></i>
                                    </a>
                                    <button
                                        type="button"
                                        class="status-toggle-btn ${active ? "" : "activate"}"
                                        data-toggle-status="${worker._id}"
                                        title="${active ? "Deactivate worker" : "Activate worker"}"
                                    >
                                        <i class="bi ${active ? "bi-person-x" : "bi-person-check"}"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;

                }).join("");

        }


        async function load() {

            const result =
                await TM.api("/api/admin/workers");

            if (!result.ok) {

                TM.tableMessage(tbody, 6, "bi-exclamation-circle", result.data.message || "Unable to load workers.");

                return;

            }

            workers = result.data.workers;

            render();

        }


        tbody.addEventListener("click", async function (event) {

            const button =
                event.target.closest("[data-toggle-status]");

            if (!button) {
                return;
            }

            const worker =
                workers.find((item) => item._id === button.dataset.toggleStatus);

            if (!worker) {
                return;
            }

            button.disabled = true;

            const updated =
                await TM.setWorkerStatus(
                    worker,
                    worker.status === "active" ? "inactive" : "active"
                );

            button.disabled = false;

            if (updated) {

                Object.assign(worker, updated);

                render();

            }

        });


        search.addEventListener("input", render);
        department.addEventListener("change", render);
        status.addEventListener("change", render);


        addButton.addEventListener("click", function () {

            TM.openWorkerModal({ onSaved: load });

        });


        load();

    }


    // ========================================
    // ADMIN ATTENDANCE
    // ========================================

    function initAttendance() {

        const tbody = document.getElementById("adminAttendanceBody");
        const dateInput = document.getElementById("adminAttendanceDate");
        const department = document.getElementById("adminDepartmentFilter");
        const status = document.getElementById("adminAttendanceFilter");
        const exportButton = document.getElementById("exportAttendance");

        let rows = [];

        let loadedDate = "";


        function visibleRows() {

            return rows.filter((row) =>
                (department.value === "all" || row.department === department.value) &&
                (status.value === "all" || row.status === status.value)
            );

        }


        function render() {

            const visible = visibleRows();

            if (!rows.length) {

                TM.tableMessage(tbody, 6, "bi-calendar-x", "No attendance for this date.");

                return;

            }

            if (!visible.length) {

                TM.tableMessage(tbody, 6, "bi-funnel", "No records match the selected filters.");

                return;

            }

            tbody.innerHTML =
                visible.map((row) => `
                    <tr>
                        <td>
                            <a href="/worker-details?id=${row.workerMongoId}" class="text-reset">
                                ${workerCell(row.name, row.workerId)}
                            </a>
                        </td>
                        <td>${escapeHtml(row.department)}</td>
                        <td>${row.checkIn ? TM.formatTime(row.checkIn) : "--"}</td>
                        <td>${row.checkOut ? TM.formatTime(row.checkOut) : (row.checkIn ? "Working" : "--")}</td>
                        <td>${TM.formatHours(row.workingHours)}</td>
                        <td>${TM.statusBadge(row.status)}</td>
                    </tr>
                `).join("");

        }


        async function load() {

            const date =
                dateInput.value || TM.todayKey();

            TM.tableMessage(tbody, 6, "bi-hourglass-split", "Loading attendance...");

            const result =
                await TM.api("/api/admin/attendance?date=" + encodeURIComponent(date));

            if (!result.ok) {

                rows = [];

                TM.tableMessage(tbody, 6, "bi-exclamation-circle", result.data.message || "Unable to load attendance.");

                TM.toast(result.data.message || "Unable to load attendance.", "error");

                return;

            }


            const data = result.data;

            rows = data.attendance;

            loadedDate = data.date;


            TM.setText("attStatPresent", data.statistics.present);
            TM.setText("attStatAbsent", data.statistics.absent);
            TM.setText("attStatLate", data.statistics.late);
            TM.setText("attStatRate", data.statistics.attendanceRate + "%");

            TM.setText(
                "attendanceTableTitle",
                data.date === TM.todayKey() ? "Today's Attendance Records" : "Attendance Records"
            );

            TM.setText(
                "attendanceTableDate",
                `${TM.formatLongDate(data.date)} · ${data.statistics.expected} worker${data.statistics.expected === 1 ? "" : "s"}`
            );

            document
                .getElementById("attendanceWeeklyOffNotice")
                .classList.toggle("d-none", data.isWorkingDay !== false);

            render();

        }


        function exportReport() {

            const visible = visibleRows();

            if (!visible.length) {

                TM.toast("There are no records to export.", "info");

                return;

            }

            TM.downloadCSV(
                `timber-mart-attendance-${loadedDate}.csv`,
                [
                    ["Date", "Worker ID", "Worker", "Department", "Check In", "Check Out", "Hours", "Status"],
                    ...visible.map((row) => [
                        loadedDate,
                        row.workerId,
                        row.name,
                        row.department,
                        row.checkIn ? TM.formatTime(row.checkIn) : "",
                        row.checkOut ? TM.formatTime(row.checkOut) : "",
                        row.workingHours ? TM.formatHours(row.workingHours) : "",
                        row.status
                    ])
                ]
            );

        }


        dateInput.value = TM.todayKey();
        dateInput.max = TM.todayKey();

        dateInput.addEventListener("change", load);
        department.addEventListener("change", render);
        status.addEventListener("change", render);
        exportButton.addEventListener("click", exportReport);

        load();

    }


    // ========================================
    // START
    // ========================================

    if (document.getElementById("adminDashboardPage")) {
        initDashboard();
    }

    if (document.getElementById("adminWorkersPage")) {
        initWorkers();
    }

    if (document.getElementById("adminAttendancePage")) {
        initAttendance();
    }

})();
