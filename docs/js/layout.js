// builds the sidebar + topbar so it doesn't have to be repeated on every page

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "index.html", icon: iconGrid() },
  { key: "devices", label: "Device Master", href: "pages/devices.html", icon: iconServer() },
];

function iconGrid() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`;
}
function iconServer() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r="0.8" fill="currentColor"/><circle cx="7" cy="17" r="0.8" fill="currentColor"/></svg>`;
}
function iconLogout() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
}

function renderShell({ active, title, desc, basePath = "" }) {
  const user = getCurrentUser();
  const safeUsername = user && user.username ? escapeHtml(user.username) : "";
  const initials = safeUsername ? safeUsername.slice(0, 2).toUpperCase() : "MD";

  const sidebarMount = document.getElementById("sidebarMount");
  if (sidebarMount) {
    sidebarMount.innerHTML = `
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-dot"></span>
          <span>DeviceWatch</span>
        </div>
        <nav>
          ${NAV_ITEMS.map(item => `
            <a class="nav-item ${item.key === active ? "active" : ""}" href="${basePath}${item.href}">
              ${item.icon}
              <span class="label-text">${item.label}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <div class="who">
            <span class="avatar">${initials}</span>
            <span class="label-text">${safeUsername || "Guest"}</span>
          </div>
          <a href="#" class="logout-link label-text" id="logoutLink">${iconLogout()} Log out</a>
        </div>
      </aside>
    `;
    const logoutLink = document.getElementById("logoutLink");
    if (logoutLink) {
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
        window.location.href = `${basePath}login.html`;
      });
    }
  }

  const topbarMount = document.getElementById("topbarMount");
  if (topbarMount) {
    topbarMount.innerHTML = `
      <div class="topbar">
        <div>
          <h1>${title}</h1>
          <div class="desc">${desc}</div>
        </div>
        <div class="topbar-right">
          <div class="live-chip" id="connectionChip"><span class="live-dot"></span> Manual status &middot; Checking connection...</div>
        </div>
      </div>
    `;
  }
}
