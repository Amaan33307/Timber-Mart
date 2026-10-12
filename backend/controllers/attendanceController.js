const Attendance = require("../models/Attendance");

const {
    getTodayDate,
    getMonthKey,
    isValidMonthKey,
    isWorkingDay,
    getCheckInStatus,
    getAvailableMonths,
    buildMonthlyAttendance
} = require("../utils/attendanceUtils");


const STATUS_FILTERS = ["Present", "Late", "Absent"];


// Attendance is only recorded for workers
function rejectNonWorker(req, res) {

    if (req.currentUser.role !== "worker") {

        res.status(403).json({
            success: false,
            message: "Attendance is only recorded for workers."
        });

        return true;

    }

    return false;

}


// ========================================
// GET TODAY'S ATTENDANCE
// ========================================

const getTodayAttendance = async (req, res) => {

    try {

        const today = getTodayDate();

        const attendance =
            await Attendance.findOne({
                worker: req.currentUser._id,
                date: today
            });


        return res.json({
            success: true,
            date: today,
            isWorkingDay: isWorkingDay(today),
            attendance: attendance
        });

    } catch (error) {

        console.error("Get Today Attendance Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch today's attendance."
        });

    }

};


// ========================================
// CHECK IN
// ========================================

const checkIn = async (req, res) => {

    try {

        if (rejectNonWorker(req, res)) {
            return;
        }

        const user = req.currentUser;

        const today = getTodayDate();


        // Check if already checked in
        const existing =
            await Attendance.findOne({
                worker: user._id,
                date: today
            });

        if (existing && existing.checkIn) {

            return res.status(400).json({
                success: false,
                message: "You have already checked in today."
            });

        }


        const now = new Date();

        // Late after 9:15 AM
        const status = getCheckInStatus(now);


        let attendance;

        if (!existing) {

            attendance =
                new Attendance({
                    worker: user._id,
                    workerId: user.workerId,
                    date: today,
                    checkIn: now,
                    status: status
                });

        } else {

            attendance = existing;
            attendance.checkIn = now;
            attendance.status = status;

        }


        await attendance.save();


        return res.status(201).json({
            success: true,
            message:
                status === "Late"
                    ? "Checked in successfully (marked Late)."
                    : "Checked in successfully.",
            attendance: attendance
        });

    } catch (error) {

        // Two quick clicks: unique index (worker + date)
        if (error.code === 11000) {

            return res.status(400).json({
                success: false,
                message: "You have already checked in today."
            });

        }

        console.error("Check In Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to check in."
        });

    }

};


// ========================================
// CHECK OUT
// ========================================

const checkOut = async (req, res) => {

    try {

        if (rejectNonWorker(req, res)) {
            return;
        }

        const attendance =
            await Attendance.findOne({
                worker: req.currentUser._id,
                date: getTodayDate()
            });


        // NO RECORD / NO CHECK IN
        if (!attendance || !attendance.checkIn) {

            return res.status(400).json({
                success: false,
                message: "You have not checked in today."
            });

        }


        // ALREADY CHECKED OUT
        if (attendance.checkOut) {

            return res.status(400).json({
                success: false,
                message: "You have already checked out today."
            });

        }


        const now = new Date();

        // WORKING HOURS
        const hours =
            (now.getTime() - attendance.checkIn.getTime()) /
            (1000 * 60 * 60);

        attendance.checkOut = now;

        attendance.workingHours =
            Number(hours.toFixed(2));

        await attendance.save();


        return res.json({
            success: true,
            message: "Checked out successfully.",
            attendance: attendance
        });

    } catch (error) {

        console.error("Check Out Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to check out."
        });

    }

};


// ========================================
// ATTENDANCE HISTORY
// GET /api/attendance/history?month=2026-08&status=Late
// ========================================

const getAttendanceHistory = async (req, res) => {

    try {

        const month =
            req.query.month || getMonthKey(new Date());

        const status =
            req.query.status || "all";


        if (!isValidMonthKey(month)) {

            return res.status(400).json({
                success: false,
                message: "Invalid month. Use the format YYYY-MM."
            });

        }

        if (status !== "all" && !STATUS_FILTERS.includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid status filter."
            });

        }


        const result =
            await buildMonthlyAttendance(req.currentUser, month);

        const attendance =
            status === "all"
                ? result.rows
                : result.rows.filter((row) => row.status === status);


        return res.json({
            success: true,
            month: result.month,
            status,
            availableMonths: getAvailableMonths(req.currentUser.createdAt),
            statistics: result.statistics,
            attendance
        });

    } catch (error) {

        console.error("Attendance History Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch attendance history."
        });

    }

};


// ========================================
// EXPORT
// ========================================

module.exports = {

    getTodayAttendance,

    checkIn,

    checkOut,

    getAttendanceHistory

};
