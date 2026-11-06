require("dotenv").config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
  console.error("FATAL: JWT_SECRET is not set in your .env file. The server cannot start without it.");
  process.exit(1);
}
const express = require("express");
const cors = require("cors");
const devicesRouter = require("./routes/devices");
const authRouter = require("./routes/auth");

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:5500")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "This origin is not permitted to access this API" });
  }
  next();
});
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/devices", devicesRouter);

// Unknown URLs get a JSON 404 instead of Express's HTML page
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Catch-all for errors: always JSON, never a stack trace
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;