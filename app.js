const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");

// ========================================
// ROUTES
// ========================================

const authRoutes =
    require("./backend/routes/authRoutes");

const attendanceRoutes =
    require("./backend/routes/attendanceRoutes");

const adminRoutes =
    require("./backend/routes/adminRoutes");

// ========================================
// MIDDLEWARE
// ========================================

const {
    requireLogin,
    requireAdmin
} =
    require(
        "./backend/middleware/authMiddleware"
    );

// ========================================
// APP
// ========================================

const app =
    express();

const PORT =
    process.env.PORT || 3000;

// ========================================
// MONGODB
// ========================================

const MONGO_URI =
    "mongodb://127.0.0.1:27017/timber_mart";

// ========================================
// EJS
// ========================================

app.set(
    "view engine",
    "ejs"
);

app.set(
    "views",
    path.join(
        __dirname,
        "Frontend",
        "pages"
    )
);

// ========================================
// BODY PARSER
// ========================================

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.json()
);

// ========================================
// SESSION
// ========================================

app.use(
    session({

        secret:
            process.env.SESSION_SECRET ||
            "timber-mart-development-secret",

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            sameSite:
                "lax",

            maxAge:
                1000 *
                60 *
                60 *
                24

        }

    })
);

// ========================================
// STATIC FILES
// ========================================

app.use(
    express.static(
        path.join(
            __dirname,
            "Frontend"
        )
    )
);

// ========================================
// VIEW DEFAULTS
// (navbar / sidebar read these)
// ========================================

app.use(
    (req, res, next) => {

        res.locals.currentUser =
            null;

        res.locals.currentPath =
            req.path;

        next();

    }
);

// ========================================
// API ROUTES
// ========================================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/attendance",
    attendanceRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

// Unknown API routes return JSON, not HTML
app.use(
    "/api",
    (req, res) => {

        res.status(404).json({
            success: false,
            message: "API route not found."
        });

    }
);

// ========================================
// HELPERS
// ========================================

function homeFor(user) {

    return user && user.role === "admin"
        ? "/admin-dashboard"
        : "/dashboard";

}

// ========================================
// LOGIN
// ========================================

app.get(
    "/",
    (req, res) => {

        if (req.session.user) {

            return res.redirect(
                homeFor(req.session.user)
            );

        }

        res.render("login");

    }
);

// ========================================
// REGISTER
// ========================================

app.get(
    "/register",
    (req, res) => {

        if (req.session.user) {

            return res.redirect(
                homeFor(req.session.user)
            );

        }

        res.render("register");

    }
);

// ========================================
// WORKER DASHBOARD
// ========================================

app.get(
    "/dashboard",
    requireLogin,
    (req, res) => {

        if (req.currentUser.role === "admin") {
            return res.redirect("/admin-dashboard");
        }

        res.render("dashboard");

    }
);

// ========================================
// ATTENDANCE PAGE
// ========================================

app.get(
    "/attendance",
    requireLogin,
    (req, res) => {

        if (req.currentUser.role === "admin") {
            return res.redirect("/admin-attendance");
        }

        res.render("attendance");

    }
);

// ========================================
// PROFILE
// ========================================

app.get(
    "/profile",
    requireLogin,
    (req, res) => {

        res.render(
            "profile",
            { user: req.currentUser }
        );

    }
);

// ========================================
// WORKERS
// ========================================

app.get(
    "/workers",
    requireLogin,
    (req, res) => {

        res.render("workers");

    }
);

// ========================================
// WORKER DETAILS
// ========================================

app.get(
    "/worker-details",
    requireLogin,
    (req, res) => {

        res.render("worker-details");

    }
);

// ========================================
// SETTINGS
// ========================================

app.get(
    "/settings",
    requireLogin,
    (req, res) => {

        res.render(
            "settings",
            { user: req.currentUser }
        );

    }
);

// ========================================
// ADMIN DASHBOARD
// ========================================

app.get(
    "/admin-dashboard",
    requireAdmin,
    (req, res) => {

        res.render(
            "admin-dashboard"
        );

    }
);

// ========================================
// ADMIN WORKERS
// ========================================

app.get(
    "/admin-workers",
    requireAdmin,
    (req, res) => {

        res.render(
            "admin-workers"
        );

    }
);

// ========================================
// ADMIN ATTENDANCE
// ========================================

app.get(
    "/admin-attendance",
    requireAdmin,
    (req, res) => {

        res.render(
            "admin-attendance"
        );

    }
);

// ========================================
// 404
// ========================================

app.use(
    (req, res) => {

        res.status(404).send(`

            <h1>
                404 - Page Not Found
            </h1>

            <p>
                The page you are looking for
                does not exist.
            </p>

            <a href="/">
                Go to Login
            </a>

        `);

    }
);

// ========================================
// ERROR HANDLER
// ========================================

app.use(
    (error, req, res, next) => {

        if (res.headersSent) {
            return next(error);
        }

        // Invalid JSON body
        if (error.type === "entity.parse.failed") {

            return res.status(400).json({
                success: false,
                message: "Invalid request data."
            });

        }

        console.error(
            "Server Error:",
            error
        );

        if (req.originalUrl.startsWith("/api/")) {

            return res.status(500).json({
                success: false,
                message: "Server error. Please try again."
            });

        }

        res.status(500).send(`
            <h1>500 - Server Error</h1>
            <p>Something went wrong. Please try again.</p>
            <a href="/">Go to Login</a>
        `);

    }
);

// ========================================
// START SERVER (after MongoDB connects)
// ========================================

mongoose
    .connect(MONGO_URI)
    .then(() => {

        console.log(
            "MongoDB connected successfully."
        );

        app.listen(
            PORT,
            () => {

                console.log(
                    "Timber Mart running at " +
                    `http://localhost:${PORT}`
                );

            }
        );

    })
    .catch((error) => {

        console.error(
            "MongoDB connection error:",
            error.message
        );

        console.error(
            "Make sure MongoDB is running on 127.0.0.1:27017"
        );

        process.exit(1);

    });
