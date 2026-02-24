const fs = require("fs");
const path = require("path");

function loadJSON(filename) {
    const filePath = path.join(__dirname, "..", "data", filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Data file not found: ${filename}`);
    }

    const raw = fs.readFileSync(filePath, "utf-8");

    try {
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(`Invalid JSON in data file: ${filename}`);
    }
}

module.exports = { loadJSON };
