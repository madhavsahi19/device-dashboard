// NODE_ENV must be set before anything loads the database pool,
// so the tests use .env.test and never the real database.
process.env.NODE_ENV = "test";

const jwt = require("jsonwebtoken");
const { resetDatabase, createTestUser, insertDevice, closeDatabase } = require("../tests/setup");

const AUTH_KEY = "devicewatch_auth";

function makeToken({ expired = false } = {}) {
  const payload = { username: "madhav" };
  if (expired) payload.exp = Math.floor(Date.now() / 1000) - 60;
  return jwt.sign(payload, process.env.JWT_SECRET, expired ? undefined : { expiresIn: "1h" });
}

async function prepareDatabase() {
  await resetDatabase();
  await createTestUser("madhav", "password123");
}

// Puts a valid login in localStorage before every page load
async function loginAs(page) {
  const value = JSON.stringify({ username: "madhav", token: makeToken() });
  await page.addInitScript(([key, val]) => localStorage.setItem(key, val), [AUTH_KEY, value]);
}

async function seedDevices(count, extra = () => ({})) {
  for (let i = 1; i <= count; i++) {
    await insertDevice({
      name: `Device ${String(i).padStart(3, "0")}`,
      address: `10.0.0.${i}`,
      location: "Test Room",
      ...extra(i),
    });
  }
}

// Fake API responses need CORS headers, or the browser rejects them
const CORS = {
  "access-control-allow-origin": "http://127.0.0.1:5500",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
};

async function fulfillJson(route, status, body) {
  if (route.request().method() === "OPTIONS") {
    return route.fulfill({ status: 204, headers: CORS });
  }
  return route.fulfill({
    status,
    headers: CORS,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

module.exports = {
  AUTH_KEY,
  makeToken,
  prepareDatabase,
  loginAs,
  seedDevices,
  insertDevice,
  closeDatabase,
  fulfillJson,
};