const mongoose = require("mongoose");

const User = require("../models/User");


// ========================================
// ALLOWED VALUES
// ========================================

const DEPARTMENTS = [
    "Carpentry",
    "Polishing",
    "Finishing",
    "Production",
    "Warehouse"
];

const STATUSES = ["active", "inactive"];

const MIN_PASSWORD_LENGTH = 6;


// ========================================
// VALIDATORS
// ========================================

function clean(value) {

    return typeof value === "string"
        ? value.trim()
        : "";

}


function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

}


function isValidPhone(phone) {

    const digits =
        phone.replace(/\D/g, "");

    return (
        /^[0-9+\-\s()]+$/.test(phone) &&
        digits.length >= 10 &&
        digits.length <= 15
    );

}


function isValidObjectId(id) {

    return mongoose.isValidObjectId(id);

}


// Validates name / email / phone / department.
// Returns { data, error }.
function validateWorkerFields(body, options = {}) {

    const data = {
        name: clean(body.name),
        email: clean(body.email).toLowerCase(),
        phone: clean(body.phone),
        department: clean(body.department)
    };

    if (!data.name || !data.email || !data.phone) {
        return { error: "Please fill all required fields." };
    }

    if (data.name.length < 2 || data.name.length > 60) {
        return { error: "Name must be between 2 and 60 characters." };
    }

    if (!isValidEmail(data.email)) {
        return { error: "Please enter a valid email address." };
    }

    if (!isValidPhone(data.phone)) {
        return { error: "Please enter a valid phone number (10–15 digits)." };
    }

    if (options.requireDepartment === false) {

        delete data.department;

    } else if (!DEPARTMENTS.includes(data.department)) {

        return { error: "Please select a valid department." };

    }

    return { data };

}


function validatePassword(password) {

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (password.length > 100) {
        return "Password is too long.";
    }

    return null;

}


// ========================================
// WORKER ID  (TM-001, TM-002, ...)
// Uses the highest existing number so IDs
// are never reused.
// ========================================

async function generateWorkerId() {

    const users =
        await User.find({
            workerId: { $regex: /^TM-\d+$/ }
        })
        .select("workerId")
        .lean();

    const highest =
        users.reduce((max, user) => {

            const number =
                parseInt(user.workerId.slice(3), 10);

            return number > max ? number : max;

        }, 0);

    return "TM-" + String(highest + 1).padStart(3, "0");

}


module.exports = {
    DEPARTMENTS,
    STATUSES,
    MIN_PASSWORD_LENGTH,
    clean,
    isValidEmail,
    isValidPhone,
    isValidObjectId,
    validateWorkerFields,
    validatePassword,
    generateWorkerId
};
