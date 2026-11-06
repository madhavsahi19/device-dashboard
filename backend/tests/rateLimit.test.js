const express = require("express");
const request = require("supertest");
const { createLoginLimiter } = require("../middleware/loginLimiter");

describe("login rate limiting", () => {
  function buildApp(limit) {
    const app = express();
    app.use(express.json());
    app.post("/login", createLoginLimiter({ limit }), (req, res) => {
      if (req.body.password === "correct") {
        return res.json({ token: "ok" });
      }
      res.status(401).json({ error: "Invalid username or password" });
    });
    return app;
  }

  test("returns 429 with JSON error after too many failed logins", async () => {
    const app = buildApp(3);

    for (let i = 0; i < 3; i++) {
      await request(app).post("/login").send({ password: "wrong" }).expect(401);
    }

    const res = await request(app).post("/login").send({ password: "wrong" }).expect(429);
    expect(res.body.error).toMatch(/too many/i);
    expect(res.headers["retry-after"]).toBeDefined();
  });

  test("successful logins do not count toward the limit", async () => {
    const app = buildApp(2);

    for (let i = 0; i < 5; i++) {
      await request(app).post("/login").send({ password: "correct" }).expect(200);
    }
  });
});