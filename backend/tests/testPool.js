const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.test"), override: true });

const mysql = require("mysql2/promise");

if (!process.env.DB_NAME || !process.env.DB_NAME.toLowerCase().includes("test")) {
  throw new Error(`Refusing to start tests: DB_NAME is "${process.env.DB_NAME}", not a test database.`);
}

const testPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

module.exports = testPool;