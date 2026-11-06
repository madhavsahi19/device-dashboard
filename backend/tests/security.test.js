process.env.NODE_ENV = "test";
require("dotenv").config({ path: ".env.test", override: true });

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");
const pool = require("../db/pool");
const { resetDatabase, createTestUser, closeDatabase } = require("./setup");

const ALLOWED_ORIGIN = "http://127.0.0.1:5500";
const validDevice = { name: "Test", type: "Server", address: "1.1.1.1", location: "Room A" };

function makeToken() {
  return jwt.sign({ username: "madhav" }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

let token;
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  await resetDatabase();
  await createTestUser("madhav", "password123");
  token = makeToken();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

describe("Authentication on every devices endpoint", () => {
  test.each([
    ["GET", "/api/devices"],
    ["GET", "/api/devices/summary"],
    ["GET", "/api/devices/types"],
    ["POST", "/api/devices"],
    ["DELETE", "/api/devices/1"],
  ])("%s %s without a token returns 401", async (method, url) => {
    const res = await request(app)[method.toLowerCase()](url);
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

describe("Token checks", () => {
  test("a garbage token returns 403", async () => {
    const res = await request(app).get("/api/devices").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(403);
  });

  test("an expired token returns 403", async () => {
    const expired = jwt.sign(
      { username: "madhav", exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET
    );
    const res = await request(app).get("/api/devices").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(403);
  });

  test("a token signed with a different secret returns 403", async () => {
    const forged = jwt.sign({ username: "madhav" }, "some-other-secret");
    const res = await request(app).get("/api/devices").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(403);
  });

  test("unauthorized DELETE does not delete anything", async () => {
    const created = await request(app).post("/api/devices").set(auth()).send(validDevice);
    const res = await request(app).delete(`/api/devices/${created.body.id}`);
    expect(res.status).toBe(401);

    const list = await request(app).get("/api/devices").set(auth());
    expect(list.body.total).toBe(1);
  });
});

describe("Exact Bearer header parsing", () => {
  test.each([
    ["lowercase scheme", () => `bearer ${token}`],
    ["a different scheme", () => `Basic ${token}`],
    ["the token with no scheme", () => token],
    ["the scheme with no token", () => "Bearer"],
    ["two tokens", () => `Bearer ${token} extra`],
    ["a double space", () => `Bearer  ${token}`],
  ])("rejects %s with 401", async (name, header) => {
    const res = await request(app).get("/api/devices").set("Authorization", header());
    expect(res.status).toBe(401);
  });

  test("accepts the exact format", async () => {
    const res = await request(app).get("/api/devices").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("CORS", () => {
  test("a disallowed origin gets a JSON 403", async () => {
    const res = await request(app)
      .get("/api/devices")
      .set(auth())
      .set("Origin", "http://evil.example");

    expect(res.status).toBe(403);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.error).toBeDefined();
  });

  test("an allowed origin is accepted and echoed back", async () => {
    const res = await request(app)
      .get("/api/devices")
      .set(auth())
      .set("Origin", ALLOWED_ORIGIN);

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
  });

  test("a request with no Origin header is accepted", async () => {
    const res = await request(app).get("/api/devices").set(auth());
    expect(res.status).toBe(200);
  });
});

describe("Invalid IDs and pagination", () => {
  test.each(["0", "-1", "1.5", "abc", "1abc", "99999999999999999999"])(
    "DELETE /api/devices/%s returns 400",
    async (id) => {
      const res = await request(app).delete(`/api/devices/${id}`).set(auth());
      expect(res.status).toBe(400);
    }
  );

  test.each([
    "page=1.5", "page=1e2", "page=99999999999999999999",
    "limit=1.5", "limit=abc", "limit=-5",
  ])("GET with %s returns 400", async (query) => {
    const res = await request(app).get(`/api/devices?${query}`).set(auth());
    expect(res.status).toBe(400);
  });
});

describe("Field length boundaries", () => {
  test.each([
    ["name", 100],
    ["address", 255],
    ["location", 100],
  ])("%s accepts exactly the maximum and rejects one more", async (field, max) => {
    const ok = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, [field]: "a".repeat(max) });
    expect(ok.status).toBe(201);

    const tooLong = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, [field]: "a".repeat(max + 1) });
    expect(tooLong.status).toBe(400);
  });

  test("remarks accept 500 characters and reject 501", async () => {
    const ok = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, remarks: "a".repeat(500) });
    expect(ok.status).toBe(201);

    const tooLong = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, remarks: "a".repeat(501) });
    expect(tooLong.status).toBe(400);
  });

  test.each([
    ["type as a number", { type: 5 }],
    ["address as an object", { address: { a: 1 } }],
    ["location as an array", { location: ["x"] }],
    ["status as a number", { status: 1 }],
    ["remarks as a number", { remarks: 99 }],
  ])("rejects %s with 400", async (name, override) => {
    const res = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, ...override });
    expect(res.status).toBe(400);
  });
});

describe("Consistent JSON errors", () => {
  test("malformed JSON returns a JSON 400, not an HTML page", async () => {
    const res = await request(app)
      .post("/api/devices")
      .set(auth())
      .set("Content-Type", "application/json")
      .send("{ this is not json");

    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.text).not.toMatch(/<html|at .*\.js:\d+/i);
  });

  test("an unknown URL returns a JSON 404", async () => {
    const res = await request(app).get("/api/nothing-here");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});

describe("Database failures", () => {
  const secret = "secret internal detail";

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test.each([
    ["GET", "/api/devices"],
    ["GET", "/api/devices/summary"],
    ["GET", "/api/devices/types"],
    ["DELETE", "/api/devices/1"],
  ])("%s %s returns a generic 500 when the database fails", async (method, url) => {
    jest.spyOn(pool, "query").mockRejectedValueOnce(new Error(secret));
    const res = await request(app)[method.toLowerCase()](url).set(auth());

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });

  test("POST returns a generic 500 when the database fails", async () => {
    jest.spyOn(pool, "query").mockRejectedValueOnce(new Error(secret));
    const res = await request(app).post("/api/devices").set(auth()).send(validDevice);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });

  test("login returns a generic 500 when the database fails", async () => {
    jest.spyOn(pool, "query").mockRejectedValueOnce(new Error(secret));
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "madhav", password: "password123" });

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });
});