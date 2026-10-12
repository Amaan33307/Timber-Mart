const User = require("../models/User");


// ========================================
// HELPERS
// ========================================

function isApiRequest(req) {

    return req.originalUrl.startsWith("/api/");

}


function accessDeniedPage(user) {

    const home =
        user && user.role === "admin"
            ? "/admin-dashboard"
            : "/dashboard";

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Access Denied | Timber Mart</title>
            <style>
                body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
                       background:#FAF7F4; color:#403229; font-family:Arial, Helvetica, sans-serif; }
                .box { text-align:center; padding:40px; background:#fff; border:1px solid #E6DDD4; border-radius:14px; max-width:420px; margin:16px; }
                h1 { color:#6B4226; font-size:26px; margin:0 0 10px; }
                p { color:#95887D; font-size:14px; margin:0 0 24px; }
                a { display:inline-block; padding:11px 20px; background:#6B4226; color:#fff; border-radius:8px; text-decoration:none; font-size:13px; }
            </style>
        </head>
        <body>
            <div class="box">
                <h1>403 - Access Denied</h1>
                <p>You do not have permission to view this page. Admin access is required.</p>
                <a href="${home}">Go to Dashboard</a>
            </div>
        </body>
        </html>
    `;

}


function denyLogin(req, res, message) {

    if (isApiRequest(req)) {

        return res.status(401).json({
            success: false,
            message: message || "Please log in to continue."
        });

    }

    return res.redirect("/");

}


// ========================================
// CHECK LOGIN
// Re-checks the database on every request so
// a deactivated worker is signed out at once.
// ========================================

const requireLogin = async (req, res, next) => {

    try {

        if (!req.session || !req.session.user) {
            return denyLogin(req, res);
        }


        const user =
            await User.findById(req.session.user.id)
                .select("-password")
                .lean();


        if (!user || user.status !== "active") {

            return req.session.destroy(() => {

                denyLogin(
                    req,
                    res,
                    "Your account is inactive. Please contact the administrator."
                );

            });

        }


        // Keep session data in sync with the database
        req.session.user = {
            id: String(user._id),
            name: user.name,
            email: user.email,
            workerId: user.workerId,
            role: user.role,
            department: user.department
        };

        req.currentUser = user;

        res.locals.currentUser = user;


        // Do not let the browser cache protected pages,
        // so "Back" after logout does not show them.
        res.set("Cache-Control", "no-store");

        next();

    } catch (error) {

        console.error("Auth Middleware Error:", error);

        if (isApiRequest(req)) {

            return res.status(500).json({
                success: false,
                message: "Server error. Please try again."
            });

        }

        return res.redirect("/");

    }

};


// ========================================
// CHECK ADMIN
// ========================================

const requireAdmin = (req, res, next) => {

    requireLogin(req, res, () => {

        if (req.currentUser.role !== "admin") {

            if (isApiRequest(req)) {

                return res.status(403).json({
                    success: false,
                    message: "Access denied. Admin access is required."
                });

            }

            return res.status(403).send(
                accessDeniedPage(req.currentUser)
            );

        }

        next();

    });

};


// ========================================
// EXPORT
// ========================================

module.exports = {

    requireLogin,

    requireAdmin

};
