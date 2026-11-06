process.env.NODE_ENV = "test";

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.js",
  workers: 1,            // all tests share one test database
  fullyParallel: false,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5500",
    headless: true,
  },
  webServer: [
    {
      // Backend, pointed at the TEST database through NODE_ENV=test
      command: "node server.js",
      port: 4000,
      env: { ...process.env, NODE_ENV: "test", PORT: "4000" },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      // Serves the docs/ folder on the origin the backend allows
      command: "node e2e/static-server.js",
      port: 5500,
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});