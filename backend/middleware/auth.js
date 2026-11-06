const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Access token required" });
  }

  const match = /^Bearer (\S+)$/.exec(authHeader);
  if (!match) {
    return res.status(401).json({ error: "Authorization header must be in the format: Bearer <token>" });
  }

  const token = match[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;