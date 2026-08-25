const API_BASE = "http://localhost:4000/api";

const DEVICE_TYPES = ["Server", "Network Switch", "Firewall", "Storage", "Database", "Service", "Access Point", "Router", "Other"];

const AUTH_KEY = "devicewatch_auth";

async function loadDevices({ page = 1, limit = 50, search = "", status = "all" } = {}) {
  const params = new URLSearchParams({ page, limit, search, status });
  const res = await fetch(`${API_BASE}/devices?${params.toString()}`);
  const data = await res.json();
  const devices = data.devices.map(d => ({
    id: d.id,
    name: d.name,
    type: d.type,
    address: d.address,
    location: d.location,
    status: d.status,
    lastChecked: d.last_checked ? d.last_checked.slice(0, 16).replace("T", " ") : "",
    remarks: d.remarks || "",
  }));
  return { devices, total: data.total, page: data.page, limit: data.limit };
}

async function loadTypeSummary() {
  const res = await fetch(`${API_BASE}/devices/types`);
  return res.json();
}

async function loadSummary() {
  const res = await fetch(`${API_BASE}/devices/summary`);
  return res.json();
}

async function addDevice(device) {
  const res = await fetch(`${API_BASE}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
  return res.json();
}

async function deleteDevice(id) {
  await fetch(`${API_BASE}/devices/${id}`, { method: "DELETE" });
}

function fakeLogin(username, password) {
  if (username.trim().length > 0 && password.trim().length > 0) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ username, loggedInAt: new Date().toISOString() }));
    return true;
  }
  return false;
}

function isLoggedIn() {
  return !!localStorage.getItem(AUTH_KEY);
}

function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
}

function requireAuth(loginPath = "login.html") {
  if (!isLoggedIn()) {
    window.location.href = loginPath;
  }
}