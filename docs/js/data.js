// dummy data for now, will replace with real API calls once backend is ready

const SEED_DEVICES = [
  { id: 1, name: "Core Switch 01", type: "Network Switch", address: "10.0.1.1", location: "Server Room A", status: "online", lastChecked: "2026-07-19 14:32", remarks: "Primary core switch, dual uplink" },
  { id: 2, name: "Auth API", type: "Service", address: "https://auth.internal.local", location: "AWS ap-south-1", status: "online", lastChecked: "2026-07-19 14:33", remarks: "Login + token service" },
  { id: 3, name: "Payment Gateway", type: "Service", address: "https://pay.internal.local", location: "AWS ap-south-1", status: "warning", lastChecked: "2026-07-19 14:30", remarks: "Elevated response time (620ms avg)" },
  { id: 4, name: "Firewall Edge", type: "Firewall", address: "10.0.0.1", location: "Server Room A", status: "online", lastChecked: "2026-07-19 14:33", remarks: "" },
  { id: 5, name: "Backup NAS", type: "Storage", address: "10.0.2.15", location: "Server Room B", status: "offline", lastChecked: "2026-07-19 12:05", remarks: "No response since 12:05, checking power" },
  { id: 6, name: "DB Primary (MySQL)", type: "Database", address: "10.0.3.10", location: "Server Room B", status: "online", lastChecked: "2026-07-19 14:34", remarks: "Master node" },
  { id: 7, name: "DB Replica (MySQL)", type: "Database", address: "10.0.3.11", location: "Server Room B", status: "online", lastChecked: "2026-07-19 14:34", remarks: "Read replica" },
  { id: 8, name: "CI/CD Runner", type: "Server", address: "10.0.4.22", location: "Server Room A", status: "warning", lastChecked: "2026-07-19 14:20", remarks: "Disk usage at 88%" },
  { id: 9, name: "Notification Service", type: "Service", address: "https://notify.internal.local", location: "AWS ap-south-1", status: "online", lastChecked: "2026-07-19 14:35", remarks: "" },
  { id: 10, name: "Guest WiFi AP-3", type: "Access Point", address: "10.0.5.33", location: "Floor 2 - East Wing", status: "offline", lastChecked: "2026-07-19 09:12", remarks: "Reported by facilities, ticket #442" },
  { id: 11, name: "Monitoring Server", type: "Server", address: "10.0.4.5", location: "Server Room A", status: "online", lastChecked: "2026-07-19 14:35", remarks: "Runs this dashboard's future backend" },
  { id: 12, name: "Print Server", type: "Server", address: "10.0.6.8", location: "Floor 1 - Admin", status: "online", lastChecked: "2026-07-19 14:18", remarks: "" },
];

const DEVICE_TYPES = ["Server", "Network Switch", "Firewall", "Storage", "Database", "Service", "Access Point", "Router", "Other"];

const STORAGE_KEY = "devicewatch_devices";
const AUTH_KEY = "devicewatch_auth";

function loadDevices() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DEVICES));
    return [...SEED_DEVICES];
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [...SEED_DEVICES];
  }
}

function saveDevices(devices) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

function addDevice(device) {
  const devices = loadDevices();
  const nextId = devices.length ? Math.max(...devices.map(d => d.id)) + 1 : 1;
  const now = new Date();
  const formatted = now.toISOString().slice(0, 16).replace("T", " ");

  const newDevice = {
    id: nextId,
    name: device.name,
    type: device.type,
    address: device.address,
    location: device.location,
    status: device.status || "online",
    lastChecked: formatted,
    remarks: device.remarks || "",
  };

  devices.push(newDevice);
  saveDevices(devices);
  return newDevice;
}

function deleteDevice(id) {
  const devices = loadDevices().filter(d => d.id !== id);
  saveDevices(devices);
}

function resetToSeed() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DEVICES));
}

function getSummary(devices) {
  const total = devices.length;
  const online = devices.filter(d => d.status === "online").length;
  const offline = devices.filter(d => d.status === "offline").length;
  const warning = devices.filter(d => d.status === "warning").length;
  return { total, online, offline, warning };
}

// fake login, no real backend yet
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

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "/login.html";
  }
}
