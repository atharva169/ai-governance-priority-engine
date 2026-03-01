const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const users = require("../auth/users");
const { sessions } = require("../auth/middleware");
const statesData = require("../data/states-constituencies.json");

const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
    const { username, password, state, constituency } = req.body;

    if (!username || !password || !state || !constituency) {
        return res.status(400).json({
            error: "All fields are required: username, password, state, constituency",
        });
    }

    // Find user by username
    const user = users.find((u) => u.username === username);

    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify geographic assignment matches
    if (user.state !== state || user.constituency !== constituency) {
        return res.status(403).json({
            error: "User is not assigned to the selected state/constituency",
        });
    }

    // Create session token
    const token = uuidv4();
    sessions.set(token, user.id);

    // Return token and safe user info (no passwordHash)
    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            role: user.role,
            state: user.state,
            stateName: user.stateName,
            constituency: user.constituency,
            constituencyName: user.constituencyName,
        },
    });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        sessions.delete(token);
    }
    res.json({ message: "Logged out successfully" });
});

// GET /api/auth/states — returns states & constituencies for the login form
router.get("/states", (req, res) => {
    res.json(statesData);
});

module.exports = router;
