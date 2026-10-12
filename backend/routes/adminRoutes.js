const express = require("express");

const router =
    express.Router();


const {
    getDashboardData,
    getWorkers,
    getWorker,
    createWorker,
    updateWorker,
    updateWorkerStatus,
    getAttendance
} =
    require(
        "../controllers/adminController"
    );


const {
    requireAdmin
} =
    require(
        "../middleware/authMiddleware"
    );


// ========================================
// EVERY ADMIN API REQUIRES AN ADMIN SESSION
// ========================================

router.use(requireAdmin);


// ========================================
// DASHBOARD
// ========================================

router.get(
    "/dashboard",
    getDashboardData
);


// ========================================
// WORKERS
// ========================================

router.get(
    "/workers",
    getWorkers
);

router.post(
    "/workers",
    createWorker
);

router.get(
    "/workers/:id",
    getWorker
);

router.put(
    "/workers/:id",
    updateWorker
);

router.patch(
    "/workers/:id/status",
    updateWorkerStatus
);


// ========================================
// ATTENDANCE
// ========================================

router.get(
    "/attendance",
    getAttendance
);


// ========================================
// EXPORT
// ========================================

module.exports = router;
