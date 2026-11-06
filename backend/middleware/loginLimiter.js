const rateLimit = require("express-rate-limit");

function createLoginLimiter({ windowMs, limit } = {}) {
  return rateLimit({
    windowMs: windowMs ?? 15 * 60 * 1000, // 15 minutes
    limit: limit ?? (Number(process.env.LOGIN_RATE_LIMIT) || 10),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only failed logins count
    handler: (req, res) => {
      res.status(429).json({
        error: "Too many login attempts. Please try again later.",
      });
    },
  });
}

module.exports = { createLoginLimiter, loginLimiter: createLoginLimiter() };