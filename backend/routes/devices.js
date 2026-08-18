const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM devices ORDER BY id");
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