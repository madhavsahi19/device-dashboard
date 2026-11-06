process.env.NODE_ENV = "test";
require("dotenv").config({ path: ".env.test", override: true });

const request = require("supertest");
const app = require("../server");
const { resetDatabase, createTestUser, closeDatabase } = require("./setup");

describe("Authentication", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("rejects login with wrong password", async () => {
    await createTestUser("madhav", "correctpassword");

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "madhav", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test("rejects login for a username that does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nobody", password: "whatever" });

    expect(res.status).toBe(401);
  });

  test("accepts login with correct credentials and returns a token", async () => {
    await createTestUser("madhav", "correctpassword");

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "madhav", password: "correctpassword" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.username).toBe("madhav");
  });

  test("rejects adding a device without a valid login token", async () => {
    const res = await request(app)
      .post("/api/devices")
      .send({ name: "Test", type: "Server", address: "1.1.1.1", location: "Room" });

    expect(res.status).toBe(401);
  });
});
afterAll(async () => {
  await closeDatabase();
});