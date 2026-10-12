// ========================================
// CREATE (OR RESET) AN ADMIN ACCOUNT
//
// Usage:
//   npm run create-admin -- "Admin Name" admin@timbermart.com yourPassword 9876543210
//
// If the email already exists, that account is
// promoted to admin, activated and given the new password.
// ========================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const {
    isValidEmail,
    validatePassword
} = require("../utils/validation");


const MONGO_URI =
    "mongodb://127.0.0.1:27017/timber_mart";


async function main() {

    const [
        name = "Timber Mart Admin",
        email,
        password,
        phone = "0000000000"
    ] = process.argv.slice(2);


    if (!email || !password) {

        console.log(
            "\nUsage: npm run create-admin -- \"Admin Name\" admin@email.com password [phone]\n"
        );

        process.exit(1);

    }

    if (!isValidEmail(email)) {

        console.log("Please enter a valid email address.");

        process.exit(1);

    }

    const passwordError =
        validatePassword(password);

    if (passwordError) {

        console.log(passwordError);

        process.exit(1);

    }


    await mongoose.connect(MONGO_URI);


    const hashed =
        await bcrypt.hash(password, 10);

    const existing =
        await User.findOne({ email: email.toLowerCase() });


    if (existing) {

        existing.name = name;
        existing.role = "admin";
        existing.status = "active";
        existing.password = hashed;

        await existing.save();

        console.log(`Updated ${existing.email} — it is now an active admin account.`);

    } else {

        await User.create({
            name,
            email: email.toLowerCase(),
            phone,
            password: hashed,
            department: "Production",
            role: "admin",
            status: "active"
        });

        console.log(`Admin account created for ${email.toLowerCase()}.`);

    }


    await mongoose.disconnect();

}


main().catch(async (error) => {

    console.error("Could not create admin:", error.message);

    await mongoose.disconnect();

    process.exit(1);

});
