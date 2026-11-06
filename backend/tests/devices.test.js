process.env.NODE_ENV = "test";
require("dotenv").config({ path: ".env.test", override: true });

const request = require("supertest");
const app = require("../server");
const jwt = require("jsonwebtoken");
const { resetDatabase, createTestUser, insertDevice, closeDatabase } = require("./setup");

function makeToken(username = "madhav") {
  return jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

describe("Device validation", () => {
  let token;

  beforeEach(async () => {
    await resetDatabase();
    await createTestUser("madhav", "password123");
    token = makeToken();
  });

  test("rejects a device with no name", async () => {
    const res = await request(app)
      .post("/api/devices")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", type: "Server", address: "1.1.1.1", location: "Room A" });

    expect(res.status).toBe(400);
  });

  test("rejects a device with an invalid status", async () => {
    const res = await request(app)
      .post("/api/devices")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test", type: "Server", address: "1.1.1.1", location: "Room A", status: "banana" });

    expect(res.status).toBe(400);
  });

  test("accepts a valid device and stores it correctly", async () => {
    const res = await request(app)
      .post("/api/devices")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Core Switch", type: "Network Switch", address: "10.0.0.1", location: "Server Room" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Core Switch");
    expect(res.body.status).toBe("online");
  });

  test("deleting a device that does not exist returns 404", async () => {
    const res = await request(app)
      .delete("/api/devices/99999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("Search and pagination", () => {
  let token;

  beforeEach(async () => {
    await resetDatabase();
    await createTestUser("madhav", "password123");
    token = makeToken();
    await insertDevice({ name: "Core Firewall", type: "Firewall", location: "Room A" });
    await insertDevice({ name: "Edge Firewall", type: "Firewall", location: "Room B" });
    await insertDevice({ name: "Main Server", type: "Server", location: "Room A" });
  });

  test("search only returns matching devices", async () => {
    const res = await request(app)
      .get("/api/devices?search=Firewall")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.devices.every(d => d.name.includes("Firewall"))).toBe(true);
  });

  test("pagination returns the correct number of results per page", async () => {
    const res = await request(app)
      .get("/api/devices?limit=2&page=1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.devices.length).toBe(2);
    expect(res.body.total).toBe(3);
  });

  test("page 2 returns different devices than page 1", async () => {
    const page1 = await request(app)
      .get("/api/devices?limit=2&page=1")
      .set("Authorization", `Bearer ${token}`);
    const page2 = await request(app)
      .get("/api/devices?limit=2&page=2")
      .set("Authorization", `Bearer ${token}`);

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    const page1Ids = page1.body.devices.map(d => d.id);
    const page2Ids = page2.body.devices.map(d => d.id);

    expect(page1Ids).not.toEqual(page2Ids);
  });
});

describe("Deleting the last item on a page", () => {
  let token;

  beforeEach(async () => {
    await resetDatabase();
    await createTestUser("madhav", "password123");
    token = makeToken();
  });

  test("deleting the only device on the last page leaves an empty, valid result", async () => {
    const id1 = await insertDevice({ name: "Device 1" });
    const id2 = await insertDevice({ name: "Device 2" });

    let page2 = await request(app)
      .get(`/api/devices?limit=1&page=2`)
      .set("Authorization", `Bearer ${token}`);
    expect(page2.body.devices.length).toBe(1);
    expect(page2.body.devices[0].id).toBe(id2);

    await request(app)
      .delete(`/api/devices/${id2}`)
      .set("Authorization", `Bearer ${token}`);

    page2 = await request(app)
      .get(`/api/devices?limit=1&page=2`)
      .set("Authorization", `Bearer ${token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.total).toBe(1);
    expect(page2.body.devices.length).toBe(0);
    expect(Array.isArray(page2.body.devices)).toBe(true);
  });
});

describe("Strict input validation", () => {
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const validDevice = { name: "Test", type: "Server", address: "1.1.1.1", location: "Room A" };

  beforeEach(async () => {
    await resetDatabase();
    await createTestUser("madhav", "password123");
    token = makeToken();
  });

  test("POST with a non-text name returns 400, not 500", async () => {
    const res = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, name: 12345 });
    expect(res.status).toBe(400);
  });

  test("POST with a whitespace-only name returns 400", async () => {
    const res = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, name: "     " });
    expect(res.status).toBe(400);
  });

  test("POST with a name over 100 characters returns 400", async () => {
    const res = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, name: "a".repeat(101) });
    expect(res.status).toBe(400);
  });

  test("POST with an unknown device type returns 400", async () => {
    const res = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, type: "Toaster" });
    expect(res.status).toBe(400);
  });

  test("POST trims spaces before saving", async () => {
    const res = await request(app).post("/api/devices").set(auth())
      .send({ ...validDevice, name: "  Padded  " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Padded");
  });

  test("DELETE with a malformed ID like 1abc returns 400", async () => {
    const res = await request(app).delete("/api/devices/1abc").set(auth());
    expect(res.status).toBe(400);
  });

  test("GET with page=abc, page=0 or limit=101 returns 400", async () => {
    for (const query of ["page=abc", "page=0", "page=-1", "limit=101", "limit=0"]) {
      const res = await request(app).get(`/api/devices?${query}`).set(auth());
      expect(res.status).toBe(400);
    }
  });

  test("GET with an invalid status filter returns 400", async () => {
    const res = await request(app).get("/api/devices?status=banana").set(auth());
    expect(res.status).toBe(400);
  });

  test("GET with a repeated search parameter returns 400", async () => {
    const res = await request(app).get("/api/devices?search=a&search=b").set(auth());
    expect(res.status).toBe(400);
  });
});
afterAll(async () => {
  await closeDatabase();
});