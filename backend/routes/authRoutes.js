const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateProfile,
    changePassword
} = require("../controllers/authController");

const {
    requireLogin
} = require("../middleware/authMiddleware");


// ========================================
// REGISTER
// ========================================

router.post(
    "/register",
    registerUser
);


// ========================================
// LOGIN
// ========================================

router.post(
    "/login",
    loginUser
);


// ========================================
// LOGOUT
// ========================================

router.post(
    "/logout",
    logoutUser
);


// ========================================
// CURRENT USER / ACCOUNT SETTINGS
// ========================================

router.get(
    "/me",
    requireLogin,
    getCurrentUser
);

router.put(
    "/profile",
    requireLogin,
    updateProfile
);

router.put(
    "/password",
    requireLogin,
    changePassword
);


// ========================================
// EXPORT
// ========================================

module.exports = router;
