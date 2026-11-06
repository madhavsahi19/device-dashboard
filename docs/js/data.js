const API_BASE = window.API_BASE || "http://localhost:4000/api";

const DEVICE_TYPES = ["Server", "Network Switch", "Firewall", "Storage", "Database", "Service", "Access Point", "Router", "Other"];

const AUTH_KEY = "devicewatch_auth";

// Where to send the user when their login is missing or has expired.
// Each page sets this through requireAuth().
let loginRedirectPath = "login.html";

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user || typeof user.token !== "string" || typeof user.username !== "string") {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return user;
  } catch {
    try { localStorage.removeItem(AUTH_KEY); } catch {}
    return null;
  }
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

function logout() {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}

function requireAuth(loginPath = "login.html") {
  loginRedirectPath = loginPath;
  if (!isLoggedIn()) {
    window.location.href = loginPath;
  }
}

async function readError(res, fallback) {
  const body = await res.json().catch(() => ({}));
  return body.error || fallback;
}

// fetch() with the login token attached. On 401/403 it clears the login and
// sends the user to the login page. Network failures get a readable message.
async function authFetch(url, options = {}) {
  const user = getCurrentUser();
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "Authorization": `Bearer ${user ? user.token : ""}`,
      },
    });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }

  if (res.status === 401 || res.status === 403) {
    logout();
    window.location.href = loginRedirectPath;
    throw new Error("Your session has ended. Please log in again.");
  }

  return res;
}

async function loadDevices({ page = 1, limit = 50, search = "", status = "all" } = {}) {
  const params = new URLSearchParams({ page, limit, search, status });
  const res = await authFetch(`${API_BASE}/devices?${params.toString()}`);
  if (!res.ok) throw new Error(await readError(res, "Failed to load devices"));

  const data = await res.json();
  if (!data || !Array.isArray(data.devices)) {
    throw new Error("The server sent an unexpected response");
  }

  const devices = data.devices.map(d => ({
    id: d.id,
    name: d.name,
    type: d.type,
    address: d.address,
    location: d.location,
    status: d.status,
    statusSetAt: d.status_set_at ? String(d.status_set_at).slice(0, 16).replace("T", " ") : "",
    remarks: d.remarks || "",
  }));
  return { devices, total: data.total, page: data.page, limit: data.limit };
}

async function loadTypeSummary() {
  const res = await authFetch(`${API_BASE}/devices/types`);
  if (!res.ok) throw new Error(await readError(res, "Failed to load device types"));
  return res.json();
}

async function loadSummary() {
  const res = await authFetch(`${API_BASE}/devices/summary`);
  if (!res.ok) throw new Error(await readError(res, "Failed to load summary"));
  return res.json();
}

async function addDevice(device) {
  const res = await authFetch(`${API_BASE}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to add device"));
  return res.json();
}

async function deleteDevice(id) {
  const res = await authFetch(`${API_BASE}/devices/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readError(res, "Failed to delete device"));
}

async function login(username, password) {
  let res;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }

  if (!res.ok) throw new Error(await readError(res, "Login failed"));

  const data = await res.json();
  localStorage.setItem(AUTH_KEY, JSON.stringify({ username: data.username, token: data.token }));
  return true;
}