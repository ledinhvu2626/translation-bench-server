# Translation Bench

A self-hosted translation editor for sharing and reviewing localization files.
The app runs as a Node.js/Express server and stores its data as JSON files in the local data directory, so no database is required.

## What it does

- Lets users register and log in with their own username/password.
- Stores source translation files from the data/source folder.
- Saves edits, comments, approvals, history, and user metadata as JSON files on disk.
- Supports review workflows with approvals and reviewer/admin roles.
- Includes export options for ZIP and TBX files.
- Includes a compare-versions workflow for checking differences between old/new source files.

## Requirements

- Node.js 18 or newer
- A terminal with access to the project folder

## Run locally

From the project folder:

```bash
cd server-app
npm install
node server.js
```

Then open:

```text
http://localhost:3000
```

On first visit, register the first account. The first registered user becomes an admin.

### Optional environment variables

```bash
PORT=3000
SESSION_SECRET=replace-this-with-a-long-random-string
ADMIN_USERS=alice,bob
```

Example on Windows PowerShell:

```powershell
cd C:\path\to\translation-bench-server\server-app
npm install
$env:PORT="3000"
$env:SESSION_SECRET="replace-this-with-a-long-random-string"
node server.js
```

## Run with Docker

```bash
docker compose up -d --build
```

Then open:

```text
http://localhost:3000
```

The Docker setup uses the same app and data folder. You can configure SESSION_SECRET and other settings in docker-compose.yml or a .env file.

## Data and backups

The app stores data in the following files under the data folder:

- data/source/*.json — the base translation source files
- data/edits.json — saved translation edits
- data/comments.json — comments attached to keys
- data/approvals.json — approval state
- data/history.json — edit history
- data/users.json — registered accounts

These are plain JSON files, so backups can be made with standard file copy or archive tools.

## Notes

- This app is meant for a small team or internal workflow, not a large multi-tenant SaaS deployment.
- The server uses local JSON files rather than a database, so it is simple to deploy but less scalable than a full database-backed system.
- If you want the app to keep running after you close the terminal, use a process manager such as PM2 or run it in Docker.
