const path = require('path');

const PORT = process.env.PORT || 3000;

// Single source of truth for the version shown in the UI (login screen,
// masthead) — read once from package.json instead of being hand-typed in
// multiple places in the frontend, where copies can silently drift apart.
const APP_VERSION = require('../package.json').version;

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const PROJECTS_META_PATH = path.join(DATA_DIR, 'projects.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const AVATARS_DIR = path.join(DATA_DIR, 'avatars');
const PROJECT_CREATE_REQUESTS_PATH = path.join(DATA_DIR, 'project-create-requests.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const MAX_LOG_ENTRIES = 5000;
const MAX_HISTORY_PER_KEY = 20;
const MAX_SUGGESTIONS_PER_KEY = 10;
const LOCK_TTL_MS = 20000;
const FILE_LOCK_TTL_MS = 40000; // component-level lock, renewed by client heartbeat
const PRESENCE_TTL_MS = 30000; // counted as "active" if seen within this window
const ROLE_RANK = { translator: 1, reviewer: 2, admin: 3 };

const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const BACKUP_RETENTION = 28; // ~7 days of snapshots at the 6h cadence above

module.exports = {
  PORT, APP_VERSION,
  DATA_DIR, PROJECTS_DIR, PROJECTS_META_PATH, USERS_PATH, AVATARS_DIR, PROJECT_CREATE_REQUESTS_PATH, BACKUPS_DIR,
  MAX_LOG_ENTRIES, MAX_HISTORY_PER_KEY, MAX_SUGGESTIONS_PER_KEY, LOCK_TTL_MS, FILE_LOCK_TTL_MS, PRESENCE_TTL_MS,
  ROLE_RANK, BACKUP_INTERVAL_MS, BACKUP_RETENTION,
};
