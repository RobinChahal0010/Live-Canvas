const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

function loadJwtSecret() {
    if (process.env.JWT_SECRET?.trim()) {
        return process.env.JWT_SECRET.trim();
    }

    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be set in the production environment.");
    }

    const secretPath = path.join(__dirname, ".jwt-secret");

    try {
        const existingSecret = fs.readFileSync(secretPath, "utf8").trim();
        if (existingSecret) return existingSecret;
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }

    const generatedSecret = crypto.randomBytes(48).toString("base64url");

    try {
        fs.writeFileSync(secretPath, generatedSecret, { flag: "wx", mode: 0o600 });
        console.warn("Generated a persistent development JWT secret in backend/.jwt-secret.");
        return generatedSecret;
    } catch (error) {
        if (error.code !== "EEXIST") throw error;
        return fs.readFileSync(secretPath, "utf8").trim();
    }
}

module.exports = { JWT_SECRET: loadJwtSecret() };