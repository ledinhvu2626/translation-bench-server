// lib/project-state.js — per-project helpers: history, locks, presence,
// activity log, and comment @mention extraction.
const crypto = require('crypto');
const { LOCK_TTL_MS, FILE_LOCK_TTL_MS, PRESENCE_TTL_MS, MAX_HISTORY_PER_KEY, MAX_LOG_ENTRIES } = require('./constants');
const storage = require('./storage');

// The edit record's `editor` field stays pinned to whoever is credited as the
// translator (see the override-preserving logic at each call site) even after
// suggestions from other people get applied on top of it. `contributors`
// tracks everyone who actually touched the string, in first-touched order, so
// the persisted edits.json isn't limited to showing a single name.
function withContributors(existingRec, ...usernames) {
  const list = existingRec && Array.isArray(existingRec.contributors)
    ? existingRec.contributors.slice()
    : (existingRec && existingRec.editor ? [existingRec.editor] : []);
  for (const u of usernames) {
    if (u && !list.includes(u)) list.push(u);
  }
  return list;
}

function pushHistory(st, filename, key, entry) {
  if (!st.history[filename]) st.history[filename] = {};
  if (!st.history[filename][key]) st.history[filename][key] = [];
  st.history[filename][key].push(entry);
  if (st.history[filename][key].length > MAX_HISTORY_PER_KEY) {
    st.history[filename][key] = st.history[filename][key].slice(-MAX_HISTORY_PER_KEY);
  }
  st.save.history();
}

function touchLock(st, filename, key, username) {
  if (!st.locks[filename]) st.locks[filename] = {};
  st.locks[filename][key] = { username, ts: Date.now() };
}
function detectConcurrentEditor(st, filename, key, username) {
  const entry = st.locks[filename] && st.locks[filename][key];
  if (!entry) return null;
  if (entry.username === username) return null;
  if (Date.now() - entry.ts > LOCK_TTL_MS) return null;
  return entry.username;
}
function clearLock(st, filename, key, username) {
  const entry = st.locks[filename] && st.locks[filename][key];
  if (entry && entry.username === username) delete st.locks[filename][key];
}
function liveLocksFor(st, req) {
  const now = Date.now();
  const isAdmin = req.projectRole === 'admin';
  const out = {};
  for (const [filename, keys] of Object.entries(st.locks)) {
    if (st.hiddenFiles.has(filename) && !isAdmin) continue;
    for (const [key, entry] of Object.entries(keys)) {
      if (now - entry.ts > LOCK_TTL_MS) continue;
      if (!out[filename]) out[filename] = {};
      out[filename][key] = entry;
    }
  }
  return out;
}

function touchFileLock(st, filename, username) {
  st.fileLocks[filename] = { username, ts: Date.now() };
}
function clearFileLock(st, filename, username) {
  const entry = st.fileLocks[filename];
  if (entry && entry.username === username) delete st.fileLocks[filename];
}
function activeFileLock(st, filename) {
  const entry = st.fileLocks[filename];
  if (!entry) return null;
  if (Date.now() - entry.ts > FILE_LOCK_TTL_MS) return null;
  return entry;
}
function liveFileLocksFor(st, req) {
  const now = Date.now();
  const isAdmin = req.projectRole === 'admin';
  const out = {};
  for (const [filename, entry] of Object.entries(st.fileLocks)) {
    if (st.hiddenFiles.has(filename) && !isAdmin) continue;
    if (now - entry.ts > FILE_LOCK_TTL_MS) continue;
    out[filename] = entry;
  }
  return out;
}

function touchProjectPresence(st, username) {
  st.presence[username] = Date.now();
}
function activeUserCountFor(st) {
  const now = Date.now();
  let n = 0;
  for (const ts of Object.values(st.presence)) {
    if (now - ts <= PRESENCE_TTL_MS) n++;
  }
  return n;
}

function touchFilePresence(st, filename, username) {
  if (!st.filePresence[filename]) st.filePresence[filename] = {};
  st.filePresence[filename][username] = Date.now();
}
function fileEditorsFor(st, req) {
  const now = Date.now();
  const isAdmin = req.projectRole === 'admin';
  const out = {};
  for (const [filename, users] of Object.entries(st.filePresence)) {
    if (st.hiddenFiles.has(filename) && !isAdmin) continue;
    const active = Object.entries(users)
      .filter(([, ts]) => now - ts <= PRESENCE_TTL_MS)
      .map(([username]) => username);
    if (active.length) out[filename] = active;
  }
  return out;
}

function fileVisibleTo(req, filename) {
  const st = req.pstate;
  if (!st.files[filename]) return false;
  if (st.hiddenFiles.has(filename) && req.projectRole !== 'admin') return false;
  return true;
}

function previewValue(v) {
  if (typeof v !== 'string') return '';
  return v.length > 140 ? v.slice(0, 140) + '…' : v;
}

function logActivity(st, type, editor, extra = {}) {
  const entry = { id: crypto.randomUUID(), ts: Date.now(), type, editor, ...extra };
  st.log.push(entry);
  if (st.log.length > MAX_LOG_ENTRIES) st.log.splice(0, st.log.length - MAX_LOG_ENTRIES);
  st.save.log();
  return entry;
}

function extractMentions(text) {
  const found = new Set();
  const re = /@([a-zA-Z0-9_.-]{2,32})/g;
  let m;
  while ((m = re.exec(text))) {
    if (storage.users[m[1]]) found.add(m[1]);
  }
  return [...found];
}

module.exports = {
  withContributors, pushHistory,
  touchLock, detectConcurrentEditor, clearLock, liveLocksFor,
  touchFileLock, clearFileLock, activeFileLock, liveFileLocksFor,
  touchProjectPresence, activeUserCountFor,
  touchFilePresence, fileEditorsFor,
  fileVisibleTo, previewValue, logActivity, extractMentions,
};
