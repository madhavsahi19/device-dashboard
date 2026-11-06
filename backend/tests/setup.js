const bcrypt = require("bcryptjs");
const pool = require("../db/pool");

async function resetDatabase() {
  const [rows] = await pool.query("SELECT DATABASE() as db");
  const dbName = rows[0].db;
  if (!dbName || !dbName.toLowerCase().includes("test")) {
    throw new Error(`Refusing to wipe database "${dbName}" — it doesn't look like a test database. Check .env.test.`);
  }
  await pool.query("DELETE FROM devices");
  await pool.query("ALTER TABLE devices AUTO_INCREMENT = 1");
  await pool.query("DELETE FROM users");
}

async function createTestUser(username = "testuser", password = "testpass123") {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    [username, hash]
  );
  return { username, password };
}

async function insertDevice(overrides = {}) {
  const device = {
    name: "Test Device",
    type: "Server",
    address: "10.0.0.1",
    location: "Test Room",
    status: "online",
    remarks: null,
    ...overrides,
  };
  const [result] = await pool.query(
    "INSERT INTO devices (name, type, address, location, status, status_set_at, remarks) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
    [device.name, device.type, device.address, device.location, device.status, device.remarks]
  );
  return result.insertId;
}

async function closeDatabase() {
  await pool.end();
}

module.exports = { resetDatabase, createTestUser, insertDevice, closeDatabase };