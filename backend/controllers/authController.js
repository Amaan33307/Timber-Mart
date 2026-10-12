const bcrypt = require("bcryptjs");

const User = require("../models/User");

const {
    validateWorkerFields,
    validatePassword,
    generateWorkerId,
    clean
} = require("../utils/validation");


const ONE_DAY = 1000 * 60 * 60 * 24;


// ========================================
// SESSION HELPERS
// ========================================

function sessionUser(user) {

    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        workerId: user.workerId,
        role: user.role,
        department: user.department
    };

}


// New session id on login (prevents session fixation)
function startSession(req, user, remember) {

    return new Promise((resolve, reject) => {

        req.session.regenerate((error) => {

            if (error) {
                return reject(error);
            }

            req.session.user = sessionUser(user);

            req.session.cookie.maxAge =
                remember ? ONE_DAY * 30 : ONE_DAY;

            req.session.save((saveError) => {

                if (saveError) {
                    return reject(saveError);
                }

                resolve();

            });

        });

    });

}


function homeFor(user) {

    return user.role === "admin"
        ? "/admin-dashboard"
        : "/dashboard";

}


function publicUser(user) {

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        workerId: user.workerId,
        department: user.department,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
    };

}


// ========================================
// REGISTER USER
// ========================================

const registerUser = async (req, res) => {

    try {

        const body = req.body || {};


        // ========================================
        // VALIDATION
        // ========================================

        const { data, error } =
            validateWorkerFields(body);

        if (error) {

            return res.status(400).json({
                success: false,
                message: error
            });

        }


        const passwordError =
            validatePassword(body.password);

        if (passwordError) {

            return res.status(400).json({
                success: false,
                message: passwordError
            });

        }


        if (
            body.confirmPassword !== undefined &&
            body.confirmPassword !== body.password
        ) {

            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });

        }


        // ========================================
        // CHECK EXISTING USER
        // ========================================

        const existingUser =
            await User.findOne({ email: data.email });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "An account with this email already exists."
            });

        }


        // ========================================
        // HASH PASSWORD
        // ========================================

        const hashedPassword =
            await bcrypt.hash(body.password, 10);


        // ========================================
        // CREATE USER (with Worker ID)
        // Retries if two people register at once
        // ========================================

        let user = null;

        for (let attempt = 0; attempt < 3 && !user; attempt++) {

            try {

                user = await User.create({
                    ...data,
                    password: hashedPassword,
                    workerId: await generateWorkerId(),
                    role: "worker",
                    status: "active"
                });

            } catch (createError) {

                const workerIdTaken =
                    createError.code === 11000 &&
                    createError.keyPattern &&
                    createError.keyPattern.workerId;

                if (!workerIdTaken) {
                    throw createError;
                }

            }

        }

        if (!user) {
            throw new Error("Could not generate a Worker ID.");
        }


        // ========================================
        // LOG THE NEW WORKER IN
        // ========================================

        await startSession(req, user, false);


        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            workerId: user.workerId,
            redirect: "/dashboard"
        });

    } catch (error) {

        console.error("Registration Error:", error);

        if (error.code === 11000) {

            return res.status(400).json({
                success: false,
                message: "An account with this email already exists."
            });

        }

        return res.status(500).json({
            success: false,
            message: "Server error during registration."
        });

    }

};


// ========================================
// LOGIN USER
// ========================================

const loginUser = async (req, res) => {

    try {

        const body = req.body || {};

        const email =
            clean(body.email).toLowerCase();

        const password =
            typeof body.password === "string" ? body.password : "";


        // ========================================
        // VALIDATION
        // ========================================

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });

        }


        // ========================================
        // FIND USER
        // ========================================

        const user =
            await User.findOne({ email });

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }


        // ========================================
        // COMPARE PASSWORD
        // ========================================

        const passwordMatch =
            await bcrypt.compare(password, user.password);

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }


        // ========================================
        // CHECK STATUS
        // ========================================

        if (user.status !== "active") {

            return res.status(403).json({
                success: false,
                message: "This account is inactive. Please contact the administrator."
            });

        }


        // ========================================
        // CREATE SESSION
        // ========================================

        const remember =
            body.remember === true ||
            body.remember === "on" ||
            body.remember === "true";

        await startSession(req, user, remember);


        return res.json({
            success: true,
            message: "Login successful.",
            redirect: homeFor(user)
        });

    } catch (error) {

        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during login."
        });

    }

};


// ========================================
// LOGOUT
// ========================================

const logoutUser = (req, res) => {

    if (!req.session) {
        return res.json({ success: true, redirect: "/" });
    }

    req.session.destroy((error) => {

        if (error) {

            console.error("Logout Error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to logout."
            });

        }

        res.clearCookie("connect.sid");

        return res.json({
            success: true,
            redirect: "/"
        });

    });

};


// ========================================
// CURRENT USER
// ========================================

const getCurrentUser = (req, res) => {

    return res.json({
        success: true,
        user: publicUser(req.currentUser)
    });

};


// ========================================
// UPDATE OWN PROFILE (name, email, phone)
// Department and role can only be changed by admin.
// ========================================

const updateProfile = async (req, res) => {

    try {

        const { data, error } =
            validateWorkerFields(req.body || {}, {
                requireDepartment: false
            });

        if (error) {

            return res.status(400).json({
                success: false,
                message: error
            });

        }


        const emailTaken =
            await User.findOne({
                email: data.email,
                _id: { $ne: req.currentUser._id }
            });

        if (emailTaken) {

            return res.status(400).json({
                success: false,
                message: "This email is already used by another account."
            });

        }


        const user =
            await User.findByIdAndUpdate(
                req.currentUser._id,
                {
                    name: data.name,
                    email: data.email,
                    phone: data.phone
                },
                { returnDocument: "after", runValidators: true }
            );


        req.session.user = sessionUser(user);


        return res.json({
            success: true,
            message: "Profile updated successfully.",
            user: publicUser(user)
        });

    } catch (error) {

        console.error("Update Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update profile."
        });

    }

};


// ========================================
// CHANGE PASSWORD
// ========================================

const changePassword = async (req, res) => {

    try {

        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body || {};


        if (!currentPassword || !newPassword) {

            return res.status(400).json({
                success: false,
                message: "Please fill all password fields."
            });

        }


        const passwordError =
            validatePassword(newPassword);

        if (passwordError) {

            return res.status(400).json({
                success: false,
                message: passwordError
            });

        }


        if (
            confirmPassword !== undefined &&
            confirmPassword !== newPassword
        ) {

            return res.status(400).json({
                success: false,
                message: "New passwords do not match."
            });

        }


        const user =
            await User.findById(req.currentUser._id);

        const matches =
            await bcrypt.compare(currentPassword, user.password);

        if (!matches) {

            return res.status(400).json({
                success: false,
                message: "Current password is incorrect."
            });

        }


        user.password =
            await bcrypt.hash(newPassword, 10);

        await user.save();


        return res.json({
            success: true,
            message: "Password updated successfully."
        });

    } catch (error) {

        console.error("Change Password Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update password."
        });

    }

};


// ========================================
// EXPORT
// ========================================

module.exports = {

    registerUser,

    loginUser,

    logoutUser,

    getCurrentUser,

    updateProfile,

    changePassword

};
