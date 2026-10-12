// ========================================
// LOAD .env FILE
// Reads KEY=value lines from the .env file in the
// project folder into process.env (no extra package).
// Values already set (e.g. on Vercel) are not replaced.
// ========================================

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", "..", ".env");

if (fs.existsSync(envPath)) {

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {

        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) continue;

        const index = trimmed.indexOf("=");

        if (index === -1) continue;

        const key = trimmed.slice(0, index).trim();

        let value = trimmed.slice(index + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }

    }

}
