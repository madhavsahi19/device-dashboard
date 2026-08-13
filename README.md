# DeviceWatch

A simple dashboard to monitor devices and services (servers, network gear,
APIs) from one screen — status, location, and last-checked time in one place.

This is the frontend part of the project, built with plain HTML, CSS and
JavaScript. It currently runs on dummy data (stored in the browser via
localStorage) since the backend and database aren't connected yet — that's
the next part of the project.

## Pages

- `public/login.html` — login screen (dummy auth, any username/password works)
- `public/index.html` — main dashboard: summary cards, charts, device table
- `public/pages/devices.html` — Device Master page to add/remove devices

## How to run

Open a terminal in the `public` folder and start a local server:

```
cd public
python3 -m http.server 5500
```

Then open `http://localhost:5500/login.html` in your browser.

(You can also just open `login.html` directly with the Live Server extension
in VS Code.)

## What's next

- Build the Node.js + Express backend and connect it instead of localStorage
- Set up a MySQL database and move the dummy data into it
- Add real health checks so device status updates automatically
