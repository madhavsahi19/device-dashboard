require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./db/pool");

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log("Usage: node create-user.js <username> <password>");
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = ?",
      [username, hash, hash]
    );
    console.log(`User "${username}" created/updated successfully.`);
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit(0);
})();