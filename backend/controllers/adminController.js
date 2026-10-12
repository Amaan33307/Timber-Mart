const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Attendance = require("../models/Attendance");

const {
    getTodayDate,
    getMonthKey,
    isValidDateKey,
    isWorkingDay,
    parseDateKey,
    buildMonthlyAttendance
} = require("../utils/attendanceUtils");

const {
    DEPARTMENTS,
    STATUSES,
    clean,
    isValidObjectId,
    validateWorkerFields,
    validatePassword,
    generateWorkerId
} = require("../utils/validation");


const WORKER_FIELDS =
    "name email phone workerId department role status createdAt";


function escapeRegex(text) {

    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

}


// Worker can be looked up by MongoDB _id or by Worker ID (TM-001)
function workerQuery(id) {

    if (isValidObjectId(id)) {
        return { _id: id, role: "worker" };
    }

    if (/^TM-\d+$/i.test(id)) {
        return { workerId: id.toUpperCase(), role: "worker" };
    }

    return null;

}


function toRow(worker, record) {

    return {
        workerMongoId: worker._id,
        workerId: worker.workerId,
        name: worker.name,
        department: worker.department,
        workerStatus: worker.status,
        checkIn: record ? record.checkIn : null,
        checkOut: record ? record.checkOut : null,
        workingHours: record ? record.workingHours || 0 : 0,
        status: record ? record.status : "Absent"
    };

}


// ========================================
// DAILY ATTENDANCE FOR ALL WORKERS
// Used by dashboard + attendance page.
// Workers without a record on a working day
// are counted as Absent.
// ========================================

async function buildDailyAttendance(dateKey) {

    const endOfDay =
        parseDateKey(dateKey);

    endOfDay.setHours(23, 59, 59, 999);


    const records =
        await Attendance.find({ date: dateKey })
            .populate("worker", WORKER_FIELDS)
            .lean();

    const recordByWorker =
        new Map(
            records
                .filter((record) => record.worker)
                .map((record) => [String(record.worker._id), record])
        );


    // Active workers who had joined by that date
    const expectedWorkers =
        await User.find({
            role: "worker",
            status: "active",
            createdAt: { $lte: endOfDay }
        })
        .select(WORKER_FIELDS)
        .lean();


    const workingDay =
        isWorkingDay(dateKey);

    const rows = [];

    const seen = new Set();


    expectedWorkers.forEach((worker) => {

        const id = String(worker._id);

        seen.add(id);

        const record = recordByWorker.get(id);

        if (record) {

            rows.push(toRow(worker, record));

        } else if (workingDay) {

            rows.push(toRow(worker, null));

        }

    });


    // Records of workers who are now inactive
    recordByWorker.forEach((record, id) => {

        if (!seen.has(id)) {
            rows.push(toRow(record.worker, record));
        }

    });


    rows.sort((a, b) => a.name.localeCompare(b.name));


    const present =
        rows.filter((row) => row.status === "Present").length;

    const late =
        rows.filter((row) => row.status === "Late").length;

    const absent =
        rows.filter((row) => row.status === "Absent").length;

    const expected =
        rows.length;

    const attendanceRate =
        expected > 0
            ? Math.round(((present + late) / expected) * 100)
            : 0;


    return {
        date: dateKey,
        isWorkingDay: workingDay,
        rows,
        statistics: {
            expected,
            present,
            late,
            absent,
            attendanceRate
        }
    };

}


// ========================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// ========================================

const getDashboardData = async (req, res) => {

    try {

        const today = getTodayDate();

        const now = new Date();

        const monthStart =
            new Date(now.getFullYear(), now.getMonth(), 1);


        // WORKER STATISTICS
        const [
            totalWorkers,
            activeWorkers,
            joinedThisMonth
        ] = await Promise.all([
            User.countDocuments({ role: "worker" }),
            User.countDocuments({ role: "worker", status: "active" }),
            User.countDocuments({ role: "worker", createdAt: { $gte: monthStart } })
        ]);


        // TODAY'S ATTENDANCE
        const daily =
            await buildDailyAttendance(today);


        // RECENT WORKERS
        const recentWorkers =
            await User.find({ role: "worker" })
                .sort({ createdAt: -1 })
                .limit(5)
                .select(WORKER_FIELDS);


        return res.json({
            success: true,
            date: today,
            isWorkingDay: daily.isWorkingDay,
            statistics: {
                totalWorkers,
                activeWorkers,
                inactiveWorkers: totalWorkers - activeWorkers,
                joinedThisMonth,
                expectedToday: daily.statistics.expected,
                presentToday: daily.statistics.present,
                lateToday: daily.statistics.late,
                absentToday: daily.statistics.absent,
                attendanceRate: daily.statistics.attendanceRate
            },
            recentWorkers
        });

    } catch (error) {

        console.error("Admin Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load admin dashboard."
        });

    }

};


// ========================================
// GET ALL WORKERS
// GET /api/admin/workers?search=&department=&status=
// ========================================

const getWorkers = async (req, res) => {

    try {

        const filter = { role: "worker" };

        const search =
            clean(req.query.search);

        const department =
            clean(req.query.department);

        const status =
            clean(req.query.status).toLowerCase();


        if (search) {

            const pattern =
                new RegExp(escapeRegex(search), "i");

            filter.$or = [
                { name: pattern },
                { workerId: pattern },
                { phone: pattern },
                { email: pattern }
            ];

            // Phone search ignores spaces / dashes:
            // "98765 43210" finds "+91 9876543210"
            const digits =
                search.replace(/\D/g, "");

            if (digits.length >= 3) {

                filter.$or.push({
                    phone: new RegExp(digits.split("").join("\\D*"))
                });

            }

        }

        if (department && department.toLowerCase() !== "all") {

            const match =
                DEPARTMENTS.find(
                    (item) => item.toLowerCase() === department.toLowerCase()
                );

            if (!match) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid department."
                });

            }

            filter.department = match;

        }

        if (status && status !== "all") {

            if (!STATUSES.includes(status)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid status."
                });

            }

            filter.status = status;

        }


        const workers =
            await User.find(filter)
                .sort({ createdAt: -1 })
                .select(WORKER_FIELDS);


        return res.json({
            success: true,
            count: workers.length,
            workers
        });

    } catch (error) {

        console.error("Admin Workers Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load workers."
        });

    }

};


// ========================================
// GET SINGLE WORKER (+ attendance summary)
// GET /api/admin/workers/:id
// ========================================

const getWorker = async (req, res) => {

    try {

        const query =
            workerQuery(req.params.id);

        if (!query) {

            return res.status(400).json({
                success: false,
                message: "Invalid worker ID."
            });

        }


        const worker =
            await User.findOne(query)
                .select(WORKER_FIELDS);

        if (!worker) {

            return res.status(404).json({
                success: false,
                message: "Worker not found."
            });

        }


        const month =
            getMonthKey(new Date());

        const summary =
            await buildMonthlyAttendance(worker, month);


        return res.json({
            success: true,
            worker,
            attendance: {
                month,
                statistics: summary.statistics,
                recent: summary.rows.slice(0, 7)
            }
        });

    } catch (error) {

        console.error("Get Worker Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load worker."
        });

    }

};


// ========================================
// ADD WORKER
// POST /api/admin/workers
// ========================================

const createWorker = async (req, res) => {

    try {

        const body = req.body || {};

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


        const exists =
            await User.findOne({ email: data.email });

        if (exists) {

            return res.status(400).json({
                success: false,
                message: "An account with this email already exists."
            });

        }


        const worker =
            await User.create({
                ...data,
                password: await bcrypt.hash(body.password, 10),
                workerId: await generateWorkerId(),
                role: "worker",
                status: "active"
            });


        return res.status(201).json({
            success: true,
            message: `Worker ${worker.workerId} added successfully.`,
            worker: await User.findById(worker._id).select(WORKER_FIELDS)
        });

    } catch (error) {

        console.error("Create Worker Error:", error);

        if (error.code === 11000) {

            return res.status(400).json({
                success: false,
                message: "A worker with this email or Worker ID already exists. Please try again."
            });

        }

        return res.status(500).json({
            success: false,
            message: "Unable to add worker."
        });

    }

};


// ========================================
// EDIT WORKER
// PUT /api/admin/workers/:id
// ========================================

const updateWorker = async (req, res) => {

    try {

        if (!isValidObjectId(req.params.id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid worker ID."
            });

        }


        const body = req.body || {};

        const { data, error } =
            validateWorkerFields(body);

        if (error) {

            return res.status(400).json({
                success: false,
                message: error
            });

        }


        const emailTaken =
            await User.findOne({
                email: data.email,
                _id: { $ne: req.params.id }
            });

        if (emailTaken) {

            return res.status(400).json({
                success: false,
                message: "This email is already used by another account."
            });

        }


        const update = { ...data };


        // Optional password reset by admin
        if (body.password) {

            const passwordError =
                validatePassword(body.password);

            if (passwordError) {

                return res.status(400).json({
                    success: false,
                    message: passwordError
                });

            }

            update.password =
                await bcrypt.hash(body.password, 10);

        }


        const worker =
            await User.findOneAndUpdate(
                { _id: req.params.id, role: "worker" },
                update,
                { returnDocument: "after", runValidators: true }
            )
            .select(WORKER_FIELDS);

        if (!worker) {

            return res.status(404).json({
                success: false,
                message: "Worker not found."
            });

        }


        return res.json({
            success: true,
            message: "Worker updated successfully.",
            worker
        });

    } catch (error) {

        console.error("Update Worker Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update worker."
        });

    }

};


// ========================================
// UPDATE WORKER STATUS
// PATCH /api/admin/workers/:id/status
// ========================================

const updateWorkerStatus = async (req, res) => {

    try {

        if (!isValidObjectId(req.params.id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid worker ID."
            });

        }


        const { status } = req.body || {};

        if (!STATUSES.includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid worker status."
            });

        }


        const worker =
            await User.findOneAndUpdate(
                { _id: req.params.id, role: "worker" },
                { status },
                { returnDocument: "after" }
            )
            .select(WORKER_FIELDS);

        if (!worker) {

            return res.status(404).json({
                success: false,
                message: "Worker not found."
            });

        }


        return res.json({
            success: true,
            message:
                status === "active"
                    ? `${worker.name} has been activated.`
                    : `${worker.name} has been deactivated.`,
            worker
        });

    } catch (error) {

        console.error("Update Worker Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update worker status."
        });

    }

};


// ========================================
// GET ATTENDANCE FOR A DATE
// GET /api/admin/attendance?date=2026-08-19
// ========================================

const getAttendance = async (req, res) => {

    try {

        const today = getTodayDate();

        const date =
            req.query.date || today;


        if (!isValidDateKey(date)) {

            return res.status(400).json({
                success: false,
                message: "Invalid date. Use the format YYYY-MM-DD."
            });

        }

        if (date > today) {

            return res.status(400).json({
                success: false,
                message: "Attendance cannot be viewed for a future date."
            });

        }


        const daily =
            await buildDailyAttendance(date);


        return res.json({
            success: true,
            date,
            isWorkingDay: daily.isWorkingDay,
            statistics: daily.statistics,
            attendance: daily.rows
        });

    } catch (error) {

        console.error("Admin Attendance Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load attendance."
        });

    }

};


// ========================================
// EXPORT
// ========================================

module.exports = {

    getDashboardData,

    getWorkers,

    getWorker,

    createWorker,

    updateWorker,

    updateWorkerStatus,

    getAttendance

};
