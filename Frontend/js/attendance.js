// ========================================
// ATTENDANCE SYSTEM (worker)
// Frontend only — the Mongoose schema lives
// in backend/models/Attendance.js
// ========================================

(function () {

    // ========================================
    // ELEMENTS
    // ========================================

    const checkInButton =
        document.getElementById("checkInBtn");

    const checkOutButton =
        document.getElementById("checkOutBtn");

    const monthFilter =
        document.getElementById("monthFilter");

    const statusFilter =
        document.getElementById("statusFilter");

    const exportButton =
        document.getElementById("exportAttendanceBtn");

    const tableBody =
        document.getElementById("attendanceTableBody");

    const emptyMessage =
        document.getElementById("attendanceEmptyMessage");

    const table =
        document.getElementById("attendanceTable");


    let todayRecord = null;

    let currentRows = [];

    let currentMonth = "";


    // ========================================
    // TODAY'S ATTENDANCE
    // ========================================

    async function loadToday() {

        const result =
            await TM.api("/api/attendance/today");

        if (!result.ok) {

            TM.setText("todayStatus", "Unavailable");

            TM.toast(result.data.message || "Unable to load today's attendance.", "error");

            return;

        }

        updateAttendanceUI(result.data.attendance);

    }


    function updateAttendanceUI(attendance) {

        todayRecord = attendance;


        // BUTTONS
        checkInButton.disabled =
            Boolean(attendance && attendance.checkIn);

        checkOutButton.disabled =
            !(attendance && attendance.checkIn && !attendance.checkOut);


        // STATUS
        let status = "Not Checked In";

        if (attendance && attendance.checkIn) {

            status = attendance.checkOut
                ? `${attendance.status} · Done`
                : `${attendance.status} · Working`;

        }

        TM.setText("todayStatus", status);


        // TIMES
        TM.setText(
            "checkInTime",
            attendance ? TM.formatTime(attendance.checkIn) : "--:--"
        );

        TM.setText(
            "checkOutTime",
            attendance ? TM.formatTime(attendance.checkOut) : "--:--"
        );

        updateWorkingHours();

    }


    // Live working hours while checked in
    function updateWorkingHours() {

        if (!todayRecord || !todayRecord.checkIn) {

            TM.setText("workingHours", "--:--");

            return;

        }

        const hours =
            todayRecord.checkOut
                ? todayRecord.workingHours
                : (Date.now() - new Date(todayRecord.checkIn).getTime()) / 3600000;

        const text =
            TM.formatHours(hours);

        TM.setText("workingHours", text === "--" ? "0h 00m" : text);

    }


    // ========================================
    // CHECK IN / CHECK OUT
    // ========================================

    async function markAttendance(type) {

        const button =
            type === "check-in" ? checkInButton : checkOutButton;

        button.disabled = true;

        const result =
            await TM.api(`/api/attendance/${type}`, { method: "POST" });

        if (!result.ok) {

            TM.toast(result.data.message || "Something went wrong.", "error");

            await loadToday();

            return;

        }

        TM.toast(result.data.message);

        updateAttendanceUI(result.data.attendance);

        loadHistory();

    }


    // ========================================
    // HISTORY + STATISTICS
    // ========================================

    function fillMonthOptions(months, selected) {

        if (!monthFilter || monthFilter.dataset.loaded === "true") {
            return;
        }

        monthFilter.innerHTML =
            months.map((month) => `
                <option value="${month}" ${month === selected ? "selected" : ""}>
                    ${TM.formatMonth(month)}
                </option>
            `).join("");

        monthFilter.dataset.loaded = "true";

    }


    async function loadHistory() {

        const params =
            new URLSearchParams();

        if (monthFilter && monthFilter.value) {
            params.set("month", monthFilter.value);
        }

        if (statusFilter && statusFilter.value !== "all") {
            params.set("status", statusFilter.value);
        }


        TM.tableMessage(tableBody, 6, "bi-hourglass-split", "Loading attendance records...");

        table.classList.remove("d-none");

        emptyMessage.classList.add("d-none");


        const result =
            await TM.api("/api/attendance/history?" + params.toString());

        if (!result.ok) {

            TM.tableMessage(tableBody, 6, "bi-exclamation-circle", result.data.message || "Unable to load attendance.");

            return;

        }


        const data = result.data;

        currentMonth = data.month;

        currentRows = data.attendance;

        fillMonthOptions(data.availableMonths, data.month);


        // STATISTICS (whole month, ignores status filter)
        TM.setText("presentDays", data.statistics.presentDays);
        TM.setText("absentDays", data.statistics.absentDays);
        TM.setText("totalWorkingHours", TM.formatTotalHours(data.statistics.totalHours));
        TM.setText("attendanceRate", data.statistics.attendanceRate + "%");

        TM.setText(
            "attendanceRecordDescription",
            `${TM.formatMonth(data.month)} · ${data.attendance.length} record${data.attendance.length === 1 ? "" : "s"}` +
            (data.statistics.lateDays ? ` · ${data.statistics.lateDays} late` : "")
        );


        // TABLE
        if (!currentRows.length) {

            tableBody.innerHTML = "";

            table.classList.add("d-none");

            emptyMessage.classList.remove("d-none");

            return;

        }

        tableBody.innerHTML =
            currentRows.map((row) => `
                <tr>
                    <td>${TM.formatDate(row.date)}</td>
                    <td>${row.day}</td>
                    <td>${row.checkIn ? TM.formatTime(row.checkIn) : "--"}</td>
                    <td>${row.checkOut ? TM.formatTime(row.checkOut) : "--"}</td>
                    <td>${TM.formatHours(row.workingHours)}</td>
                    <td>${TM.statusBadge(row.status)}</td>
                </tr>
            `).join("");

    }


    // ========================================
    // EXPORT (CSV)
    // ========================================

    function exportReport() {

        if (!currentRows.length) {

            TM.toast("There are no records to export.", "info");

            return;

        }

        const rows = [
            ["Date", "Day", "Check In", "Check Out", "Working Hours", "Status"],
            ...currentRows.map((row) => [
                TM.formatDate(row.date),
                row.day,
                row.checkIn ? TM.formatTime(row.checkIn) : "",
                row.checkOut ? TM.formatTime(row.checkOut) : "",
                row.workingHours ? TM.formatHours(row.workingHours) : "",
                row.status
            ])
        ];

        TM.downloadCSV(`attendance-${currentMonth}.csv`, rows);

    }


    // ========================================
    // EVENTS
    // ========================================

    checkInButton.addEventListener("click", () => markAttendance("check-in"));

    checkOutButton.addEventListener("click", () => markAttendance("check-out"));

    if (monthFilter) {
        monthFilter.addEventListener("change", loadHistory);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", loadHistory);
    }

    if (exportButton) {
        exportButton.addEventListener("click", exportReport);
    }


    // ========================================
    // LOAD ON PAGE
    // ========================================

    TM.setText(
        "attendanceDate",
        new Date().toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
    );

    setInterval(updateWorkingHours, 30000);

    loadToday();

    loadHistory();

})();
