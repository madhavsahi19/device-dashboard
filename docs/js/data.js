const API_BASE = "http://localhost:4000/api";

const DEVICE_TYPES = ["Server", "Network Switch", "Firewall", "Storage", "Database", "Service", "Access Point", "Router", "Other"];

const AUTH_KEY = "devicewatch_auth";

async function loadDevices() {
  const res = await fetch(`${API_BASE}/devices`);
  const rows = await res.json();
  return rows.map(d => ({
    id: d.id,
    name: d.name,
    type: d.type,
    address: d.address,
    location: d.location,
    status: d.status,
    lastChecked: d.last_checked ? d.last_checked.slice(0, 16).replace("T", " ") : "",
    remarks: d.remarks || "",
  }));
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

function getSummary(devices) {
  const total = devices.length;
  const online = devices.filter(d => d.status === "online").length;
  const offline = devices.filter(d => d.status === "offline").length;
  const warning = devices.filter(d => d.status === "warning").length;
  return { total, online, offline, warning };
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