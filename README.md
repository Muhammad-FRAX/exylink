# Exylink Application

Exylink is a tool for injecting Excel and CSV files into databases. It can also act as a middleman between your spreadsheets and your databases — usable through the web UI or fully headless via API keys for automation pipelines.

What makes it special: It's lightweight and works fully headless. Use curl commands with an API key for automation in tools like n8n or cron jobs—no browser required. Save your database connections and table settings (like sheet names or ranges) once, and reuse them anytime for quick, repeatable uploads.

Currently Supports **PostgreSQL**, **MySQL**, **SQLite**, and **SQL Server**.

## **Enjoy!**

## Architecture

```
frontend/   →  React + Vite + Tailwind CSS
backend/    →  Node.js + Express + Sequelize
database    →  SQLite (internal app state)
```

The backend connects to **external** target databases on behalf of the user to inject spreadsheet data. The internal SQLite database only stores app configuration (users, connections, presets, API keys).

---

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd app

# Backend
cd backend
cp .env.example .env    # edit JWT_SECRET for production
npm install

# Frontend
cd ../frontend
cp .env.example .env    # optional: set VITE_API_URL
npm install
```

### 2. Start development servers

Open two terminals:

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 3. Login

Open `http://localhost:3000` in your browser.

Default admin credentials:

```
Username: admin
Password: Welcome@123
```

Change the admin password immediately after first login.

---

## Quick Start (Docker)

### 1. Build and run

```bash
# Set a strong JWT secret
export JWT_SECRET=your_strong_random_secret_here

docker compose up --build -d
```

The app is available at `http://localhost:5000`.

### 2. Persistent data

The SQLite database is stored in a Docker volume (`exylink-data`). Your data survives container restarts and rebuilds.

### 3. Environment variables

| Variable         | Default                            | Description                   |
| ---------------- | ---------------------------------- | ----------------------------- |
| `JWT_SECRET`     | `change_this_secret_in_production` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d`                               | Token expiry duration         |
| `PORT`           | `5000`                             | Server port                   |
| `CORS_ORIGIN`    | `*`                                | Allowed CORS origin(s)        |

---

## Production (Non-docker)

Use this method if you want to run the app directly on a server (without docker).In this case you would need to set up an environment variable:

```
ENV NODE_ENV=production
```

or

```
NODE_ENV=production node src/server.js  //when running the server
```

Since this variable is only set automatically in the Dockerfile, and you need to apply it so the app can function in production mode and serve the frontend files as intented with the express server.

---

## How to Use

### Step 1 — Create a Database Connection

Go to **Data Connections** in the sidebar.

1. Click **Add Connection**
2. Fill in your target database credentials (host, port, username, password, database name)
3. Click **Test Connection** to verify it works
4. Click **Save Connection**

Supported dialects: PostgreSQL, MySQL, SQLite, SQL Server.

### Step 2 — Create a Table Configuration (Preset)

Go to **Table Configs** in the sidebar.

1. Click **New Setup**
2. Give it a label (e.g., "Monthly Sales Upload")
3. Select the database connection you created
4. Set the **target table name** — the table that will receive the data
5. Optionally set a specific **sheet name**, **cell range**, or toggle **has headers**
6. Click **Create Configuration Entry**

The preset ID shown on each card can be used for API automation.

### Step 3 — Upload a Spreadsheet

Go to **Home** (Data Ingestion) in the sidebar.

**Using a Preset:**

1. Select your file (.xlsx, .xls, or .csv)
2. Choose a preset from the dropdown
3. Click **Start Ingestion**

**Using Manual Config:**

1. Select your file
2. Switch to the **Manual Entry** tab
3. Enter the target table name and database credentials
4. Click **Start Ingestion**

### Step 4 — Review Duplicates

If duplicates or conflicts are found, a modal appears showing:

- How many rows are **new** (will be inserted)
- How many rows are **updates** (same ID, different values — will overwrite)
- How many rows are **exact duplicates** (will be skipped)
- A scrollable table showing the actual duplicate rows that won't be processed

You can **confirm** to proceed or **cancel** to abort.

---

## Headless API Usage (Automation)

The main reason this app exists: **you don't need to open the UI**. Use API keys to push files from scripts, cron jobs, or CI/CD pipelines.

### Step 1 — Generate an API Key

Go to **API Keys** in the sidebar → **New Key** → copy the key (shown only once).

### Step 2 — Send files via cURL

**Mode A — Using a saved preset:**

```bash
curl -X POST http://localhost:5000/api/external/ingest \
  -H "X-API-Key: exy_your_key_here" \
  -F "file=@sales-data.xlsx" \
  -F "preset_id=YOUR_PRESET_UUID"
```

**Mode B — Manual connection params:**

```bash
curl -X POST http://localhost:5000/api/external/ingest \
  -H "X-API-Key: exy_your_key_here" \
  -F "file=@sales-data.xlsx" \
  -F "target_table_name=sales_data" \
  -F "dialect=postgres" \
  -F "host=db.example.com" \
  -F "port=5432" \
  -F "username=myuser" \
  -F "password=mypass" \
  -F "database_name=analytics"
```

### Response

```json
{
  "success": true,
  "preset": "Monthly Sales",
  "targetTable": "sales_data",
  "stats": {
    "totalRows": 150,
    "inserted": 120,
    "updated": 10,
    "skipped": 20
  }
}
```

### Optional parameters (both modes)

| Field               | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `sheet_name`        | Which sheet to read (default: first sheet)            |
| `cell_range`        | Specific range like `A1:Z500` (default: entire sheet) |
| `has_headers`       | `true` or `false` (default: `true`)                   |
| `target_table_name` | Override the preset's target table                    |

---

## Duplicate Detection

When data is uploaded, Exylink compares incoming rows against existing rows in the target table:

1. **Exact duplicate** — all column values match an existing row → **skipped**
2. **ID conflict** — same `id` value but different data → **updated** (overwritten)
3. **New row** — no match found → **inserted**

Detection uses hash-based comparison on columns that exist in both the spreadsheet and the target table. Data is inserted in chunks of 500 rows for performance with large files.

If the target table doesn't exist yet, it is created automatically with TEXT columns based on the spreadsheet headers.

---

## User Management

Exylink has two roles:

- **Admin** — full access: manage users, see all connections/presets, CRUD everything
- **Visitor** — can create their own connections, presets, and API keys; upload files; see only their own data

Admins can create users, change passwords, activate/deactivate accounts, and assign roles from the **Users** page.

---

## Project Structure

```
app/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/      # Auth + API key middleware
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # Express routers
│   │   └── services/        # Excel processing, import engine, file upload
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Sidebar
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Home, DataConnections, Tables, Users, ApiKeys, Login
│   │   └── services/       # Axios API client
│   └── package.json
├── Dockerfile
├── docker-compose.yaml
└── README.md
```

---

## API Endpoints

### Auth

| Method | Path              | Description              |
| ------ | ----------------- | ------------------------ |
| POST   | `/api/auth/login` | Login, returns JWT       |
| GET    | `/api/auth/me`    | Get current user profile |

### Files (JWT required)

| Method | Path                           | Description                        |
| ------ | ------------------------------ | ---------------------------------- |
| POST   | `/api/v1/files`                | Upload + stage (detect duplicates) |
| POST   | `/api/v1/files/:jobId/confirm` | Confirm staged job                 |
| DELETE | `/api/v1/files/:jobId`         | Cancel staged job                  |

### Connections (JWT required)

| Method | Path                       | Description       |
| ------ | -------------------------- | ----------------- |
| GET    | `/api/v1/connections`      | List connections  |
| POST   | `/api/v1/connections`      | Create connection |
| PUT    | `/api/v1/connections/:id`  | Update connection |
| DELETE | `/api/v1/connections/:id`  | Delete connection |
| POST   | `/api/v1/connections/test` | Test connection   |

### Table Configs (JWT required)

| Method | Path                         | Description   |
| ------ | ---------------------------- | ------------- |
| GET    | `/api/v1/table-mappings`     | List presets  |
| POST   | `/api/v1/table-mappings`     | Create preset |
| DELETE | `/api/v1/table-mappings/:id` | Delete preset |

### API Keys (JWT required)

| Method | Path                          | Description |
| ------ | ----------------------------- | ----------- |
| GET    | `/api/v1/api-keys`            | List keys   |
| POST   | `/api/v1/api-keys`            | Create key  |
| PATCH  | `/api/v1/api-keys/:id/revoke` | Revoke key  |
| DELETE | `/api/v1/api-keys/:id`        | Delete key  |

### External Ingest (API Key required)

| Method | Path                   | Description          |
| ------ | ---------------------- | -------------------- |
| POST   | `/api/external/ingest` | Upload + auto-ingest |

### System

| Method | Path          | Description  |
| ------ | ------------- | ------------ |
| GET    | `/api/health` | Health check |

---

## Tech Stack

- **Backend:** Node.js, Express 5, Sequelize, ExcelJS, Multer
- **Frontend:** React 19, Vite, Tailwind CSS 4, Framer Motion, Lucide Icons
- **Database Drivers:** pg, mysql2, sqlite3
- **Auth:** JWT (bcryptjs for hashing, SHA-256 for API keys)

---

## Creator

Built by **Mohamed Ali (Frax)**.

Found a bug? Have a feature idea? Want to contribute?

- GitHub: [@Frax](https://github.com/Muhammad-FRAX)
- Open an issue or pull request on this repository — all feedback and contributions are welcome.
