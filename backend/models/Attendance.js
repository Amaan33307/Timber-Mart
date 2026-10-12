const mongoose = require("mongoose");

// ========================================
// ATTENDANCE SCHEMA
// ========================================

const attendanceSchema = new mongoose.Schema(
    {
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        workerId: {
            type: String,
            required: true,
            trim: true
        },

        date: {
            type: String,
            required: true
        },

        checkIn: {
            type: Date,
            default: null
        },

        checkOut: {
            type: Date,
            default: null
        },

        workingHours: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["Present", "Late", "Absent"],
            default: "Present"
        }
    },

    {
        timestamps: true
    }
);


// ========================================
// ONE RECORD PER WORKER PER DAY
// ========================================

attendanceSchema.index(
    {
        worker: 1,
        date: 1
    },
    {
        unique: true
    }
);


// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
    "Attendance",
    attendanceSchema
);