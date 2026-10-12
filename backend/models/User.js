const mongoose = require("mongoose");


// ========================================
// USER SCHEMA
// ========================================

const userSchema = new mongoose.Schema(

    {

        name: {
            type: String,
            required: true,
            trim: true
        },


        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },


        phone: {
            type: String,
            required: true,
            trim: true
        },


        password: {
            type: String,
            required: true
        },


        workerId: {
            type: String,
            unique: true,
            sparse: true
        },


        department: {
            type: String,
            default: "Carpentry"
        },


        role: {
            type: String,
            enum: ["worker", "admin"],
            default: "worker"
        },


        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }

    },


    {
        timestamps: true
    }

);


// ========================================
// EXPORT MODEL
// ========================================

module.exports = mongoose.model("User", userSchema);