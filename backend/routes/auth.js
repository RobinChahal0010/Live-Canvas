const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// ============================================================
// SIGNUP
// ============================================================
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Please fill all fields." });
        }
        if (name.trim().length < 3 || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name.trim())) {
            return res.status(400).json({ error: "Name must be at least 3 characters and contain only alphabets and spaces." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Please enter a valid email address." });
        }
        if (
            password.length < 8 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) ||
            !/[!@#$%^&*(),.?":{}|<>]/.test(password)
        ) {
            return res.status(400).json({
                error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            });
        }

        // Check for duplicate email
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: "Account already exists." });
        }

        // Hash password and save
        const hash = await bcrypt.hash(password, 12);
        const user = await new User({ name: name.trim(), email: email.toLowerCase(), password: hash }).save();

        // Issue JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({ token, user: { name: user.name, email: user.email } });

    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ error: "Server error. Please try again." });
    }
});

// ============================================================
// LOGIN
// ============================================================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Please enter email and password." });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Need to get password field (excluded by toJSON)
        const userWithPassword = await User.findOne({ email: email.toLowerCase() }).lean();
        const isMatch = await bcrypt.compare(password, userWithPassword.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({ token, user: { name: user.name, email: user.email } });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Server error. Please try again." });
    }
});

// ============================================================
// ME (protected)
// ============================================================
router.get("/me", verifyToken, (req, res) => {
    return res.status(200).json({ user: { name: req.user.name, email: req.user.email } });
});

// ============================================================
// LOGOUT
// ============================================================
router.post("/logout", (req, res) => {
    return res.status(200).json({ message: "Logged out" });
});

module.exports = router;
