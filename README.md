# DeviceWatch

A dashboard for keeping an inventory of devices and services (servers, network
gear, APIs), with each one's status and location on a single screen.

Status is entered by hand when a device is added. "Status Set At" shows when
that status was recorded. There is no automated health checking (ping/HTTP
checks).

## Stack

- Frontend: plain HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MySQL 8
- Auth: JWT login, passwords hashed with bcrypt, login rate limiting
- Tests: Jest + Supertest (API), Playwright (browser)

Requirements: a current Node.js LTS release (20 or newer recommended) and MySQL 8.

## Project structure

```
device-dashboard/
├── docs/                      # Frontend
│   ├── login.html
│   ├── index.html             # Dashboard
│   ├── pages/devices.html     # Device Master (add/remove devices)
│   ├── css/style.css
│   └── js/
│       ├── config.js          # Backend URL (edit if not on localhost:4000)
│       ├── data.js            # API calls, login handling
│       └── layout.js          # Shared sidebar/header
├── backend/
│   ├── server.js
│   ├── playwright.config.js
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login
│   │   └── devices.js         # /api/devices endpoints
│   ├── middleware/
│   │   ├── auth.js            # Checks the Bearer token
│   │   ├── validate.js        # Input validation
│   │   └── loginLimiter.js    # Login rate limiting
│   ├── db/pool.js             # MySQL connection
│   ├── create-user.js         # Creates a login account
│   ├── tests/                 # API tests (Jest)
│   ├── e2e/                   # Browser tests (Playwright)
│   ├── .env.example
│   └── .env.test.example
└── database/
    ├── schema.sql             # Creates the app database
    └── test-setup.sql         # Creates the test database
```

## Setup from a fresh checkout

### 1. Database

```
mysql -u root -p < database/schema.sql
```

This creates the `devicewatch` database with the `users` and `devices` tables.

### 2. Backend

```
cd backend
npm install
```

Copy `.env.example` to `.env` (`copy .env.example .env` on Windows,
`cp .env.example .env` on macOS/Linux) and fill in real values:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=devicewatch
DB_PORT=3306
JWT_SECRET=any_long_random_string
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
PORT=4000
```

- `JWT_SECRET` is required. The server refuses to start without it.
- `PORT` is optional and defaults to 4000.
- `LOGIN_RATE_LIMIT` is optional (failed logins allowed per 15 minutes, default 10).

Create a login account:

```
node create-user.js <username> <password>
```

Start the server:

```
npm start
```

You should see `Backend running on http://localhost:4000`.

### 3. Frontend

Serve the `docs` folder on port 5500. Use any one of these, run from the project root:

```
# Option A: VS Code Live Server extension
#   Open docs/login.html and click "Go Live" (default port 5500)

# Option B: Node
npx http-server docs -p 5500 -a 127.0.0.1

# Option C: Python
python -m http.server 5500 --bind 127.0.0.1 --directory docs
```

Then open http://127.0.0.1:5500/login.html and log in with the account from step 2.

### CORS

The backend only accepts browser requests from origins listed in
`ALLOWED_ORIGINS`. The match is exact (scheme, host and port), and
`127.0.0.1` and `localhost` count as different origins:

```
# 127.0.0.1 only
ALLOWED_ORIGINS=http://127.0.0.1:5500

# both
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

Requests from any other origin get a `403` JSON response. Restart the backend
after changing `.env`.

### Using a different port

If you change `PORT`, also edit `window.API_BASE` in `docs/js/config.js` to
`http://localhost:<PORT>/api`.

## API

Every `/api/devices` endpoint requires the header `Authorization: Bearer <token>`
(exactly that format). The token comes from the login response and expires after 8 hours.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Log in, returns a token |
| GET | `/api/devices` | Yes | List devices (`page`, `limit` 1-100, `search`, `status`) |
| GET | `/api/devices/summary` | Yes | Counts per status |
| GET | `/api/devices/types` | Yes | Counts per device type |
| POST | `/api/devices` | Yes | Add a device |
| DELETE | `/api/devices/:id` | Yes | Delete a device |

Errors are always JSON in the form `{ "error": "message" }`:
`400` invalid input, `401` missing or malformed token, `403` invalid or expired
token or disallowed origin, `404` not found, `429` too many login attempts,
`500` server error (details are logged, never sent to the client).

Validation rules: `name` up to 100 characters, `type` one of Server, Network
Switch, Firewall, Storage, Database, Service, Access Point, Router or Other,
`address` up to 255, `location` up to 100, `status` online, offline or warning,
`remarks` up to 500. IDs and pages must be positive whole numbers.

Login is limited to 10 failed attempts per IP address per 15 minutes. The
counter is kept in memory, so it resets when the server restarts.

## Running the tests

The tests use a separate MySQL database, so your real data is never touched.

1. Make sure MySQL is running.
2. Create the test database: `mysql -u root -p < database/test-setup.sql`
3. In `backend/`, copy `.env.test.example` to `.env.test` and fill in `DB_PASSWORD` and `JWT_SECRET`.
4. In `backend/`:

```
npm install
npm test
```

### Browser tests

```
cd backend
npx playwright install chromium     # first time only
npm run test:e2e
```

The browser tests start their own backend (on the test database) and a static
server for `docs/`. Ports 4000 and 5500 must be free, so stop your own backend
and Live Server first. They need an internet connection, because the dashboard
loads Chart.js from a CDN.

## Troubleshooting

- **"Cannot reach the server" or "Failed to fetch":** the backend is not running, or the
  page's origin is not in `ALLOWED_ORIGINS`.
- **Redirected back to the login page:** the login expired (8 hours) or was removed. Log in again.
- **"Too many login attempts":** wait 15 minutes or restart the backend.

## Known limitations

- Status is entered manually and is not checked automatically.
- The login rate limit is in memory and is per server process.
- Production dependencies have no known vulnerabilities (`npm audit --omit=dev`).
  Remaining advisories are in Jest's tooling and affect development only.