// lib/storage.js — atomic file persistence + the users/projects "database"
// (all in-memory, backed by plain JSON files under data/).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  PROJECTS_DIR, PROJECTS_META_PATH, USERS_PATH, AVATARS_DIR, PROJECT_CREATE_REQUESTS_PATH,
} = require('./constants');

fs.mkdirSync(PROJECTS_DIR, { recursive: true });
fs.mkdirSync(AVATARS_DIR, { recursive: true });
if (!fs.existsSync(PROJECTS_META_PATH)) fs.writeFileSync(PROJECTS_META_PATH, '{}');
if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, '{}');
if (!fs.existsSync(PROJECT_CREATE_REQUESTS_PATH)) fs.writeFileSync(PROJECT_CREATE_REQUESTS_PATH, '[]');

/* ---------------- atomic file operations ---------------- */

async function safeWriteFile(filePath, data) {
  const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.promises.writeFile(tmpPath, data, 'utf8');
  await fs.promises.rename(tmpPath, filePath);
}

function makeSaver(getFilePath, getData, delay) {
  let timer = null, inFlight = false, pending = false;
  async function persist() {
    if (inFlight) { pending = true; return; }
    inFlight = true;
    try {
      await safeWriteFile(getFilePath(), JSON.stringify(getData(), null, 2));
    } catch (e) {
      console.error('Failed to persist', getFilePath(), e);
    } finally {
      inFlight = false;
      if (pending) { pending = false; schedule(); }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(persist, delay); }
  return schedule;
}

/* ---------------- users (top-level, span all projects) ---------------- */
// users[username] = { passwordHash, isAdmin (site-wide super-admin), avatar,
//                      createdAt, projects: { projectId: 'translator'|'reviewer'|'admin' } }

let users = {};
function loadUsers() {
  try { users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')); } catch (e) { users = {}; }
}
function saveUsers() {
  safeWriteFile(USERS_PATH, JSON.stringify(users, null, 2)).catch(e => console.error('Failed to save users:', e));
}
function roleFor(username, projectId) {
  const u = users[username];
  if (!u) return null;
  if (u.isAdmin) return 'admin'; // site admin = admin on every project
  return (u.projects && u.projects[projectId]) || null;
}
// Small username -> avatar map for everyone with access to a project, so any
// member (not just admins) can render avatars next to comments/edits.
function avatarsForProject(projectId) {
  const out = {};
  for (const [username, u] of Object.entries(users)) {
    if (u.avatar && roleFor(username, projectId)) out[username] = u.avatar;
  }
  return out;
}
// Every username with access to a project, for @mention autocomplete —
// unlike avatarsForProject this isn't limited to people who set an avatar.
function membersOfProject(projectId) {
  return Object.keys(users).filter((username) => roleFor(username, projectId)).sort();
}

/* ---------------- projects: metadata + per-project state ---------------- */

let projectsMeta = {}; // id -> { name, createdAt, createdBy }
const P = {};          // id -> live in-memory project state

function loadProjectsMeta() {
  try { projectsMeta = JSON.parse(fs.readFileSync(PROJECTS_META_PATH, 'utf8')); } catch (e) { projectsMeta = {}; }
}
function saveProjectsMeta() {
  safeWriteFile(PROJECTS_META_PATH, JSON.stringify(projectsMeta, null, 2)).catch(e => console.error('Failed to save projects.json:', e));
}

// Requests to create a brand-new project (distinct from st.requests, which
// are requests to join a project that already exists) — { id, name,
// requestedBy, ts, status: 'pending'|'approved'|'rejected' }.
let projectCreateRequests = [];
function loadProjectCreateRequests() {
  try {
    const r = JSON.parse(fs.readFileSync(PROJECT_CREATE_REQUESTS_PATH, 'utf8'));
    projectCreateRequests = Array.isArray(r) ? r : [];
  } catch (e) { projectCreateRequests = []; }
}
function saveProjectCreateRequests() {
  safeWriteFile(PROJECT_CREATE_REQUESTS_PATH, JSON.stringify(projectCreateRequests, null, 2)).catch(e => console.error('Failed to save project-create-requests.json:', e));
}
function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'project';
}
function projectPaths(id) {
  const dir = path.join(PROJECTS_DIR, id);
  return {
    dir,
    source: path.join(dir, 'source'),
    edits: path.join(dir, 'edits.json'),
    comments: path.join(dir, 'comments.json'),
    log: path.join(dir, 'log.json'),
    hidden: path.join(dir, 'hidden.json'),
    history: path.join(dir, 'history.json'),
    approvals: path.join(dir, 'approvals.json'),
    glossary: path.join(dir, 'glossary.json'),
    requests: path.join(dir, 'requests.json'),
    suggestions: path.join(dir, 'suggestions.json'),
    reports: path.join(dir, 'reports.json'),
    qaDecisions: path.join(dir, 'qa-decisions.json'),
  };
}
function ensureProjectFiles(id) {
  const p = projectPaths(id);
  fs.mkdirSync(p.source, { recursive: true });
  if (!fs.existsSync(p.edits)) fs.writeFileSync(p.edits, '{}');
  if (!fs.existsSync(p.comments)) fs.writeFileSync(p.comments, '{}');
  if (!fs.existsSync(p.log)) fs.writeFileSync(p.log, '[]');
  if (!fs.existsSync(p.hidden)) fs.writeFileSync(p.hidden, '[]');
  if (!fs.existsSync(p.history)) fs.writeFileSync(p.history, '{}');
  if (!fs.existsSync(p.approvals)) fs.writeFileSync(p.approvals, '{}');
  if (!fs.existsSync(p.glossary)) fs.writeFileSync(p.glossary, '[]');
  if (!fs.existsSync(p.requests)) fs.writeFileSync(p.requests, '{}');
  if (!fs.existsSync(p.suggestions)) fs.writeFileSync(p.suggestions, '{}');
  if (!fs.existsSync(p.reports)) fs.writeFileSync(p.reports, '[]');
  if (!fs.existsSync(p.qaDecisions)) fs.writeFileSync(p.qaDecisions, '{}');
}

function loadProjectSourceFiles(st) {
  st.files = {};
  for (const name of fs.readdirSync(st.paths.source)) {
    if (!name.endsWith('.json')) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(st.paths.source, name), 'utf8'));
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        st.files[name] = { order: Object.keys(data), baseline: data };
      }
    } catch (e) {
      console.warn('Skipping invalid source file:', name, e.message);
    }
  }
}

function loadProjectState(id) {
  const paths = projectPaths(id);
  const st = {
    id, paths,
    files: {}, edits: {}, comments: {}, log: [],
    hiddenFiles: new Set(), history: {}, approvals: {}, glossary: [],
    locks: {}, fileLocks: {}, presence: {}, requests: {},
    suggestions: {}, reports: [], filePresence: {}, qaDecisions: {},
  };
  loadProjectSourceFiles(st);
  try { st.edits = JSON.parse(fs.readFileSync(paths.edits, 'utf8')); } catch (e) { st.edits = {}; }
  try { st.comments = JSON.parse(fs.readFileSync(paths.comments, 'utf8')); } catch (e) { st.comments = {}; }
  try { const l = JSON.parse(fs.readFileSync(paths.log, 'utf8')); st.log = Array.isArray(l) ? l : []; } catch (e) { st.log = []; }
  try { const h = JSON.parse(fs.readFileSync(paths.hidden, 'utf8')); st.hiddenFiles = new Set(Array.isArray(h) ? h : []); } catch (e) { st.hiddenFiles = new Set(); }
  try { st.history = JSON.parse(fs.readFileSync(paths.history, 'utf8')); } catch (e) { st.history = {}; }
  try { st.approvals = JSON.parse(fs.readFileSync(paths.approvals, 'utf8')); } catch (e) { st.approvals = {}; }
  try { const g = JSON.parse(fs.readFileSync(paths.glossary, 'utf8')); st.glossary = Array.isArray(g) ? g : []; } catch (e) { st.glossary = []; }
  try { st.requests = JSON.parse(fs.readFileSync(paths.requests, 'utf8')); } catch (e) { st.requests = {}; }
  try { st.suggestions = JSON.parse(fs.readFileSync(paths.suggestions, 'utf8')); } catch (e) { st.suggestions = {}; }
  try { const rp = JSON.parse(fs.readFileSync(paths.reports, 'utf8')); st.reports = Array.isArray(rp) ? rp : []; } catch (e) { st.reports = []; }
  try { st.qaDecisions = JSON.parse(fs.readFileSync(paths.qaDecisions, 'utf8')); } catch (e) { st.qaDecisions = {}; }

  st.save = {
    edits: makeSaver(() => paths.edits, () => st.edits, 600),
    comments: makeSaver(() => paths.comments, () => st.comments, 400),
    log: makeSaver(() => paths.log, () => st.log, 400),
    hidden: makeSaver(() => paths.hidden, () => [...st.hiddenFiles], 400),
    history: makeSaver(() => paths.history, () => st.history, 500),
    approvals: makeSaver(() => paths.approvals, () => st.approvals, 400),
    glossary: makeSaver(() => paths.glossary, () => st.glossary, 400),
    requests: makeSaver(() => paths.requests, () => st.requests, 300),
    suggestions: makeSaver(() => paths.suggestions, () => st.suggestions, 400),
    reports: makeSaver(() => paths.reports, () => st.reports, 400),
    qaDecisions: makeSaver(() => paths.qaDecisions, () => st.qaDecisions, 400),
  };
  return st;
}

function createProject(name, creator) {
  let id = slugify(name), n = 1;
  while (projectsMeta[id]) id = `${slugify(name)}-${++n}`;
  projectsMeta[id] = { name: name.trim(), createdAt: Date.now(), createdBy: creator };
  saveProjectsMeta();
  ensureProjectFiles(id);
  P[id] = loadProjectState(id);
  return id;
}

/* ---------------- boot: load everything ---------------- */

loadUsers();
loadProjectsMeta();
loadProjectCreateRequests();
for (const id of Object.keys(projectsMeta)) {
  ensureProjectFiles(id);
  P[id] = loadProjectState(id);
}

module.exports = {
  safeWriteFile, makeSaver,
  // users/projectsMeta/projectCreateRequests get fully reassigned by their
  // load*() functions, so these are exported as getters — a plain property
  // copied at require time would go stale after the next reload.
  get users() { return users; },
  loadUsers, saveUsers, roleFor, avatarsForProject, membersOfProject,
  get projectsMeta() { return projectsMeta; },
  P, // never reassigned wholesale (only P[id] = ... mutations), safe to export directly
  loadProjectsMeta, saveProjectsMeta,
  get projectCreateRequests() { return projectCreateRequests; },
  loadProjectCreateRequests, saveProjectCreateRequests,
  slugify, projectPaths, ensureProjectFiles, loadProjectSourceFiles, loadProjectState, createProject,
};
