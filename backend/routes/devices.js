const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "all";

    let where = "WHERE (name LIKE ? OR address LIKE ? OR location LIKE ?)";
    const params = [`%${search}%`, `%${search}%`, `%${search}%`];

    if (status !== "all") {
      where += " AND status = ?";
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM devices ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM devices ${where} ORDER BY id LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ devices: rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/types", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT type, COUNT(*) as count FROM devices GROUP BY type");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT status, COUNT(*) as count FROM devices GROUP BY status");
    const summary = { total: 0, online: 0, offline: 0, warning: 0 };
    rows.forEach(r => {
      summary[r.status] = r.count;
      summary.total += r.count;
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, address, location, status, remarks } = req.body;
    const [result] = await pool.query(
      "INSERT INTO devices (name, type, address, location, status, last_checked, remarks) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
      [name, type, address, location, status || "online", remarks || null]
    );
    const [rows] = await pool.query("SELECT * FROM devices WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM devices WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;