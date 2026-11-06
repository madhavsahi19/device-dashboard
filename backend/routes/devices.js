const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const authenticateToken = require("../middleware/auth");
const { parseId, parsePagination, validateDevice, STATUSES } = require("../middleware/validate");

router.get("/", authenticateToken, async (req, res) => {
  try {
        const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const search = req.query.search === undefined ? "" : req.query.search;
    if (typeof search !== "string" || search.length > 100) {
      return res.status(400).json({ error: "search must be text of at most 100 characters" });
    }

    const status = req.query.status === undefined ? "all" : req.query.status;
    if (status !== "all" && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be "all" or one of: ${STATUSES.join(", ")}` });
    }
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
    console.error(err);
    res.status(500).json({ error: "Something went wrong while loading data" });
  }
});

router.get("/types", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT type, COUNT(*) as count FROM devices GROUP BY type");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while loading data" });
  }
});

router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT status, COUNT(*) as count FROM devices GROUP BY status");
    const summary = { total: 0, online: 0, offline: 0, warning: 0 };
    rows.forEach(r => {
      summary[r.status] = r.count;
      summary.total += r.count;
    });
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while loading data" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { errors, value } = validateDevice(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join("; ") });
    }

    const [result] = await pool.query(
      "INSERT INTO devices (name, type, address, location, status, status_set_at, remarks) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
      [value.name, value.type, value.address, value.location, value.status, value.remarks]
    );
    const [rows] = await pool.query("SELECT * FROM devices WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong while saving the device" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
        const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "Invalid device ID" });
    }

    const [existing] = await pool.query("SELECT id FROM devices WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    await pool.query("DELETE FROM devices WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Something went wrong while deleting the device" });
  }
});

module.exports = router;