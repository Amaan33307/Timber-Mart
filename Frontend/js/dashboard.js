// ========================================
// WORKER DASHBOARD
// Uses /api/attendance/today and /history
// ========================================

(function () {

    const checkInBtn =
        document.getElementById("checkInBtn");

    const checkOutBtn =
        document.getElementById("checkOutBtn");

    let todayRecord = null;


    // ================================
    // DATE + GREETING
    // ================================

    function updateDate() {

        TM.setText(
            "currentDate",
            new Date().toLocaleDateString("en-GB", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
        );

        const hour = new Date().getHours();

        TM.setText(
            "greetingText",
            hour < 12
                ? "Good Morning"
                : hour < 17
                    ? "Good Afternoon"
                    : "Good Evening"
        );

    }


    // ================================
    // LIVE CLOCK
    // ================================

    function updateClock() {

        TM.setText(
            "liveTime",
            new Date().toLocaleTimeString("en-IN", { hour12: true }).toUpperCase()
        );

        updateWorkingHours();

    }


    function updateWorkingHours() {

        if (!todayRecord || !todayRecord.checkIn) {

            TM.setText("workingHoursText", "Record your working hours");

            return;

        }

        if (todayRecord.checkOut) {

            TM.setText(
                "workingHoursText",
                `Worked ${TM.formatHours(todayRecord.workingHours)} today`
            );

            return;

        }

        const hours =
            (Date.now() - new Date(todayRecord.checkIn).getTime()) / 3600000;

        TM.setText(
            "workingHoursText",
            `Working for ${TM.formatHours(hours) === "--" ? "0h 00m" : TM.formatHours(hours)}`
        );

    }


    // ================================
    // TODAY'S ATTENDANCE
    // ================================

    function renderToday(attendance) {

        todayRecord = attendance;

        let status = "Not Checked In";

        if (attendance && attendance.checkIn && !attendance.checkOut) {
            status = attendance.status === "Late" ? "Working · Late" : "Working";
        }

        if (attendance && attendance.checkOut) {
            status = attendance.status === "Late" ? "Completed · Late" : "Completed";
        }

        TM.setText("attendanceStatus", status);

        TM.setText(
            "checkInTime",
            attendance ? TM.formatTime(attendance.checkIn) : "--:--"
        );

        TM.setText(
            "checkOutTime",
            attendance ? TM.formatTime(attendance.checkOut) : "--:--"
        );

        checkInBtn.disabled =
            Boolean(attendance && attendance.checkIn);

        checkOutBtn.disabled =
            !(attendance && attendance.checkIn && !attendance.checkOut);

        updateWorkingHours();

    }


    async function loadToday() {

        const result =
            await TM.api("/api/attendance/today");

        if (!result.ok) {

            TM.setText("attendanceStatus", "Unavailable");

            TM.toast(result.data.message || "Unable to load today's attendance.", "error");

            return;

        }

        const notice =
            document.getElementById("weeklyOffNotice");

        if (notice) {
            notice.classList.toggle("d-none", result.data.isWorkingDay !== false);
        }

        renderToday(result.data.attendance);

    }


    // ================================
    // CHECK IN / CHECK OUT
    // ================================

    async function markAttendance(type) {

        const button =
            type === "check-in" ? checkInBtn : checkOutBtn;

        button.disabled = true;

        const result =
            await TM.api(`/api/attendance/${type}`, { method: "POST" });

        if (!result.ok) {

            TM.toast(result.data.message || "Something went wrong.", "error");

            await loadToday();

            return;

        }

        TM.toast(result.data.message);

        renderToday(result.data.attendance);

        loadHistory();

    }


    // ================================
    // RECENT ATTENDANCE + MONTH COUNT
    // ================================

    async function loadHistory() {

        const tbody =
            document.getElementById("recentAttendanceBody");

        const result =
            await TM.api("/api/attendance/history");

        if (!result.ok) {

            TM.tableMessage(tbody, 5, "bi-exclamation-circle", result.data.message || "Unable to load attendance.");

            return;

        }

        TM.setText(
            "monthPresentDays",
            `${result.data.statistics.presentDays} Days`
        );

        const rows =
            result.data.attendance.slice(0, 5);

        if (!rows.length) {

            TM.tableMessage(tbody, 5, "bi-calendar-x", "No attendance records yet. Check in to get started.");

            return;

        }

        tbody.innerHTML =
            rows.map((row) => `
                <tr>
                    <td>${TM.formatDate(row.date)}</td>
                    <td>${row.checkIn ? TM.formatTime(row.checkIn) : "--"}</td>
                    <td>${row.checkOut ? TM.formatTime(row.checkOut) : "--"}</td>
                    <td>${TM.formatHours(row.workingHours)}</td>
                    <td>${TM.statusBadge(row.status)}</td>
                </tr>
            `).join("");

    }


    // ================================
    // START
    // ================================

    checkInBtn.addEventListener("click", () => markAttendance("check-in"));

    checkOutBtn.addEventListener("click", () => markAttendance("check-out"));

    updateDate();

    updateClock();

    setInterval(updateClock, 1000);

    loadToday();

    loadHistory();

})();
