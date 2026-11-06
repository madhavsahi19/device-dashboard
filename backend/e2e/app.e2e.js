const { test, expect } = require("@playwright/test");
const {
  AUTH_KEY,
  makeToken,
  prepareDatabase,
  loginAs,
  seedDevices,
  insertDevice,
  closeDatabase,
  fulfillJson,
} = require("./helpers");

const DEVICES_API = /\/api\/devices\?/;
const SUMMARY_API = /\/api\/devices\/summary/;

const PAGES = [
  { name: "dashboard", url: "/index.html" },
  { name: "Device Master", url: "/pages/devices.html" },
];

const rows = (page) => page.locator("#deviceTableBody tr");
const bar = (page) => page.locator("#paginationBar");

test.afterAll(async () => {
  await closeDatabase();
});

test.describe("when logged in", () => {
  test.beforeEach(async ({ page }) => {
    await prepareDatabase();
    await loginAs(page);
  });

  // ---------- Safe rendering ----------
  for (const p of PAGES) {
    test(`XSS payloads are shown as plain text on the ${p.name}`, async ({ page }) => {
      const payload = `<img src=x onerror="window.__xss=1">`;
      await insertDevice({
        name: payload,
        type: "<b>bold</b>",
        address: payload,
        location: payload,
        remarks: "<script>window.__xss=1</script>",
      });

      await page.goto(p.url);
      await expect(page.locator("#deviceTableBody .dev-name")).toHaveText(payload);
      await expect(page.locator("#deviceTableBody")).toContainText("<script>window.__xss=1</script>");
      await expect(page.locator("#deviceTableBody img")).toHaveCount(0);
      await expect(page.locator("#deviceTableBody b")).toHaveCount(0);
      expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    });
  }

  // ---------- Wording ----------
  for (const p of PAGES) {
    test(`${p.name} uses manual-status wording`, async ({ page }) => {
      await insertDevice({ name: "Wording Check" });
      await page.goto(p.url);
      await expect(page.locator("th", { hasText: "Status Set At" })).toBeVisible();
      await expect(page.locator("th", { hasText: "Last Checked" })).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText(/healthy|reachable|uptime/i);
    });
  }

  // ---------- Search ----------
  for (const p of PAGES) {
    test(`search finds devices by name, address and location on the ${p.name}`, async ({ page }) => {
      await insertDevice({ name: "Zebra Switch", address: "10.1.1.1", location: "Annex A" });
      await insertDevice({ name: "Dev Two", address: "172.16.99.9", location: "Annex B" });
      await insertDevice({ name: "Dev Three", address: "10.3.3.3", location: "Basement" });

      await page.goto(p.url);
      await expect(rows(page)).toHaveCount(3);

      const searches = [
        ["Zebra", "Zebra Switch"],       // by name
        ["172.16.99", "Dev Two"],        // by address
        ["Basement", "Dev Three"],       // by location
      ];
      for (const [term, expected] of searches) {
        await page.fill("#searchInput", term);
        await expect(rows(page)).toHaveCount(1);
        await expect(rows(page).first()).toContainText(expected);
      }

      await page.fill("#searchInput", "nothing-matches-this");
      await expect(page.locator("#deviceTableBody .empty-state")).toBeVisible();
    });
  }

  // ---------- Filter and page reset (dashboard) ----------
  test("changing the status filter or the search goes back to page 1", async ({ page }) => {
    await seedDevices(60, (i) => ({ status: i > 55 ? "offline" : "online" }));
    await page.goto("/index.html");

    await expect(bar(page)).toContainText("Page 1 of 2");
    await page.click("#nextPageBtn");
    await expect(bar(page)).toContainText("Page 2 of 2");

    await page.selectOption("#statusFilter", "offline");
    await expect(bar(page)).toContainText("Page 1 of 1");
    await expect(bar(page)).toContainText("Showing 1-5 of 5");
    await expect(rows(page)).toHaveCount(5);

    await page.selectOption("#statusFilter", "all");
    await expect(bar(page)).toContainText("Page 1 of 2");
    await page.click("#nextPageBtn");
    await expect(bar(page)).toContainText("Page 2 of 2");

    await page.fill("#searchInput", "Device 003");
    await expect(bar(page)).toContainText("Page 1 of 1");
    await expect(rows(page)).toHaveCount(1);
  });

  // ---------- Empty data ----------
  for (const p of PAGES) {
    test(`empty database shows an empty state on the ${p.name}`, async ({ page }) => {
      await page.goto(p.url);
      await expect(page.locator("#deviceTableBody .empty-state")).toBeVisible();
      await expect(bar(page)).toContainText("Showing 0-0 of 0");
    });
  }

  test("dashboard cards show zeros for an empty database", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("#cardGrid .stat-card.total .value")).toHaveText("0");
    await expect(page.locator("#cardGrid .stat-card.online .value")).toHaveText("0");
  });

  test("dashboard cards count each status correctly", async ({ page }) => {
    await insertDevice({ status: "online" });
    await insertDevice({ status: "online" });
    await insertDevice({ status: "offline" });
    await insertDevice({ status: "warning" });
    await page.goto("/index.html");

    await expect(page.locator("#cardGrid .stat-card.total .value")).toHaveText("4");
    await expect(page.locator("#cardGrid .stat-card.online .value")).toHaveText("2");
    await expect(page.locator("#cardGrid .stat-card.offline .value")).toHaveText("1");
    await expect(page.locator("#cardGrid .stat-card.warning .value")).toHaveText("1");
    await expect(page.locator("#cardGrid .stat-card.online .sub")).toContainText("50% marked online");
  });

  // ---------- Pagination at 50 / 51 ----------
  for (const p of PAGES) {
    test(`pagination at exactly 50 and 51 devices on the ${p.name}`, async ({ page }) => {
      await seedDevices(50);
      await page.goto(p.url);

      await expect(rows(page)).toHaveCount(50);
      await expect(bar(page)).toContainText("Showing 1-50 of 50");
      await expect(bar(page)).toContainText("Page 1 of 1");
      await expect(page.locator("#nextPageBtn")).toBeDisabled();

      await insertDevice({ name: "Device 051" });
      await page.reload();

      await expect(bar(page)).toContainText("Page 1 of 2");
      await expect(page.locator("#nextPageBtn")).toBeEnabled();
      await page.click("#nextPageBtn");

      await expect(bar(page)).toContainText("Showing 51-51 of 51");
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first()).toContainText("Device 051");
      await expect(page.locator("#prevPageBtn")).toBeEnabled();
    });
  }

  // ---------- Error messages ----------
  for (const p of PAGES) {
    test(`a server error shows a readable message and Retry recovers on the ${p.name}`, async ({ page }) => {
      await insertDevice({ name: "Recovered Device" });

      let failing = true;
      await page.route(DEVICES_API, (route) =>
        failing ? fulfillJson(route, 500, { error: "Database exploded" }) : route.continue()
      );

      await page.goto(p.url);
      await expect(page.locator("#deviceTableBody .empty-state")).toContainText(
        "Could not load devices: Database exploded"
      );

      failing = false;
      await page.locator("#deviceTableBody").getByRole("button", { name: "Retry" }).click();
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first()).toContainText("Recovered Device");
    });

    test(`a network failure shows a readable message on the ${p.name}`, async ({ page }) => {
      await page.route(DEVICES_API, (route) => route.abort());
      await page.goto(p.url);
      await expect(page.locator("#deviceTableBody .empty-state")).toContainText("Cannot reach the server");
    });
  }

  test("dashboard shows an error instead of cards when the summary fails, but the table still loads", async ({ page }) => {
    await insertDevice({ name: "Still Visible" });
    await page.route(SUMMARY_API, (route) => fulfillJson(route, 500, { error: "Summary broke" }));

    await page.goto("/index.html");
    await expect(page.locator("#cardGrid")).toContainText("Could not load the summary and charts: Summary broke");
    await expect(page.locator("#connectionChip")).toContainText("failed to load");
    await expect(rows(page).first()).toContainText("Still Visible");
  });

  // ---------- Stale search responses ----------
  for (const p of PAGES) {
    test(`an older, slower search response does not replace a newer one on the ${p.name}`, async ({ page }) => {
      await insertDevice({ name: "SlowToken device" });
      await insertDevice({ name: "FastToken device" });

      await page.route(DEVICES_API, async (route) => {
        const search = new URL(route.request().url()).searchParams.get("search");
        if (search === "slowtoken") await new Promise((r) => setTimeout(r, 1500));
        await route.continue();
      });

      await page.goto(p.url);
      await expect(rows(page)).toHaveCount(2);

      await page.fill("#searchInput", "slowtoken");
      await page.waitForTimeout(600);            // the slow request is now in flight
      await page.fill("#searchInput", "fasttoken");

      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first()).toContainText("FastToken");

      await page.waitForTimeout(2000);           // give the slow response time to arrive
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first()).toContainText("FastToken");
    });
  }

  // ---------- Deleting the last item on a page ----------
  test("deleting the only item on the last page moves back to the previous page", async ({ page }) => {
    await seedDevices(51);
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/pages/devices.html");
    await page.click("#nextPageBtn");
    await expect(bar(page)).toContainText("Page 2 of 2");
    await expect(rows(page)).toHaveCount(1);

    await rows(page).first().getByTitle("Delete").click();

    await expect(page.locator("#toast")).toContainText("Device removed");
    await expect(bar(page)).toContainText("Page 1 of 1");
    await expect(bar(page)).toContainText("Showing 1-50 of 50");
    await expect(rows(page)).toHaveCount(50);
  });
});

test.describe("session handling", () => {
  test.beforeEach(async () => {
    await prepareDatabase();
  });

  async function setStoredLogin(page, value) {
    await page.goto("/login.html");
    await page.evaluate(([key, val]) => localStorage.setItem(key, val), [AUTH_KEY, value]);
  }

  const storedLogin = (page) => page.evaluate((key) => localStorage.getItem(key), AUTH_KEY);

  for (const p of PAGES) {
    test(`the ${p.name} redirects to login when nobody is logged in`, async ({ page }) => {
      await page.goto(p.url);
      await expect(page).toHaveURL(/\/login\.html$/);
    });

    test(`the ${p.name} clears an invalid token and redirects to login`, async ({ page }) => {
      await setStoredLogin(page, JSON.stringify({ username: "madhav", token: "garbage" }));
      await page.goto(p.url);
      await expect(page).toHaveURL(/\/login\.html$/);
      expect(await storedLogin(page)).toBeNull();
    });

    test(`the ${p.name} clears an expired token and redirects to login`, async ({ page }) => {
      await setStoredLogin(page, JSON.stringify({ username: "madhav", token: makeToken({ expired: true }) }));
      await page.goto(p.url);
      await expect(page).toHaveURL(/\/login\.html$/);
      expect(await storedLogin(page)).toBeNull();
    });

    test(`the ${p.name} survives malformed login data in localStorage`, async ({ page }) => {
      await setStoredLogin(page, "{this is not json");
      await page.goto(p.url);
      await expect(page).toHaveURL(/\/login\.html$/);
      expect(await storedLogin(page)).toBeNull();
    });
  }
});