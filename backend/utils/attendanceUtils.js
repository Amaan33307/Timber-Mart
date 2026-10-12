const Attendance = require("../models/Attendance");


// ========================================
// ATTENDANCE RULES
// ========================================

// Check-in after 09:15 AM is marked "Late"
const LATE_HOUR = 9;
const LATE_MINUTE = 15;

// Weekly off days (0 = Sunday, 6 = Saturday).
// Workers are not marked absent on these days.
const WEEKLY_OFF_DAYS = [0];

const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];


// ========================================
// DATE HELPERS (server local time)
// ========================================

function toDateKey(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function getTodayDate() {

    return toDateKey(new Date());

}


function isValidDateKey(value) {

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date =
        parseDateKey(value);

    return toDateKey(date) === value;

}


function isValidMonthKey(value) {

    return (
        typeof value === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    );

}


function parseDateKey(key) {

    const [year, month, day] =
        key.split("-").map(Number);

    return new Date(year, month - 1, day);

}


function getMonthKey(date) {

    return toDateKey(date).slice(0, 7);

}


function getMonthRange(monthKey) {

    const [year, month] =
        monthKey.split("-").map(Number);

    const start =
        new Date(year, month - 1, 1);

    const end =
        new Date(year, month, 0);

    return {
        startKey: toDateKey(start),
        endKey: toDateKey(end)
    };

}


function addDays(key, amount) {

    const date =
        parseDateKey(key);

    date.setDate(date.getDate() + amount);

    return toDateKey(date);

}


function isWorkingDay(key) {

    return !WEEKLY_OFF_DAYS.includes(
        parseDateKey(key).getDay()
    );

}


function getDayName(key) {

    return DAY_NAMES[parseDateKey(key).getDay()];

}


// List of every working day between two keys (inclusive)
function getWorkingDays(startKey, endKey) {

    const days = [];

    let current = startKey;

    while (current <= endKey) {

        if (isWorkingDay(current)) {
            days.push(current);
        }

        current = addDays(current, 1);

    }

    return days;

}


// ========================================
// STATUS FOR A CHECK-IN TIME
// ========================================

function getCheckInStatus(date) {

    const hour = date.getHours();
    const minute = date.getMinutes();

    if (
        hour > LATE_HOUR ||
        (hour === LATE_HOUR && minute > LATE_MINUTE)
    ) {
        return "Late";
    }

    return "Present";

}


// ========================================
// MONTHS A WORKER CAN VIEW
// (from joining month to current month)
// ========================================

function getAvailableMonths(joinedAt) {

    const months = [];

    const now = new Date();

    const cursor =
        new Date(now.getFullYear(), now.getMonth(), 1);

    const joined =
        joinedAt ? new Date(joinedAt) : now;

    const first =
        new Date(joined.getFullYear(), joined.getMonth(), 1);

    while (cursor >= first && months.length < 36) {

        months.push(getMonthKey(cursor));

        cursor.setMonth(cursor.getMonth() - 1);

    }

    return months;

}


// ========================================
// MONTHLY ATTENDANCE FOR ONE WORKER
// Real records + Absent rows for missed
// working days (up to yesterday).
// ========================================

async function buildMonthlyAttendance(user, monthKey) {

    const { startKey, endKey } =
        getMonthRange(monthKey);

    const records =
        await Attendance.find({
            worker: user._id,
            date: {
                $gte: startKey,
                $lte: endKey
            }
        })
        .sort({ date: -1 })
        .lean();


    const recordedDates =
        new Set(records.map((record) => record.date));


    // Absent days: working days from joining
    // date (or month start) up to yesterday
    const joinedKey =
        toDateKey(new Date(user.createdAt || Date.now()));

    const yesterdayKey =
        addDays(getTodayDate(), -1);

    const rangeStart =
        joinedKey > startKey ? joinedKey : startKey;

    const rangeEnd =
        yesterdayKey < endKey ? yesterdayKey : endKey;


    const absentDates =
        rangeStart <= rangeEnd
            ? getWorkingDays(rangeStart, rangeEnd)
                .filter((key) => !recordedDates.has(key))
            : [];


    const rows = [

        ...records.map((record) => ({
            id: record._id,
            date: record.date,
            day: getDayName(record.date),
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            workingHours: record.workingHours || 0,
            status: record.status
        })),

        ...absentDates.map((key) => ({
            id: null,
            date: key,
            day: getDayName(key),
            checkIn: null,
            checkOut: null,
            workingHours: 0,
            status: "Absent"
        }))

    ].sort((a, b) => (a.date < b.date ? 1 : -1));


    const presentOnly =
        rows.filter((row) => row.status === "Present").length;

    const late =
        rows.filter((row) => row.status === "Late").length;

    const absent =
        rows.filter((row) => row.status === "Absent").length;

    const attended =
        presentOnly + late;

    const totalHours =
        rows.reduce(
            (sum, row) => sum + (row.workingHours || 0),
            0
        );

    const attendanceRate =
        attended + absent > 0
            ? Math.round((attended / (attended + absent)) * 100)
            : 0;


    return {
        month: monthKey,
        rows,
        statistics: {
            presentDays: attended,
            onTimeDays: presentOnly,
            lateDays: late,
            absentDays: absent,
            totalHours: Number(totalHours.toFixed(2)),
            attendanceRate
        }
    };

}


module.exports = {
    LATE_HOUR,
    LATE_MINUTE,
    WEEKLY_OFF_DAYS,
    toDateKey,
    getTodayDate,
    isValidDateKey,
    isValidMonthKey,
    parseDateKey,
    getMonthKey,
    getMonthRange,
    addDays,
    isWorkingDay,
    getDayName,
    getWorkingDays,
    getCheckInStatus,
    getAvailableMonths,
    buildMonthlyAttendance
};
