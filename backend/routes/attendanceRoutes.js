const express = require("express");

const router =
    express.Router();


const {
    getTodayAttendance,
    checkIn,
    checkOut,
    getAttendanceHistory
} =
    require(
        "../controllers/attendanceController"
    );


const {
    requireLogin
} =
    require(
        "../middleware/authMiddleware"
    );


// ========================================
// TODAY'S ATTENDANCE
// ========================================

router.get(
    "/today",
    requireLogin,
    getTodayAttendance
);


// ========================================
// CHECK IN
// ========================================

router.post(
    "/check-in",
    requireLogin,
    checkIn
);


// ========================================
// CHECK OUT
// ========================================

router.post(
    "/check-out",
    requireLogin,
    checkOut
);


// ========================================
// HISTORY
// ========================================

router.get(
    "/history",
    requireLogin,
    getAttendanceHistory
);


module.exports = router;