// lib/auth-middleware.js — session auth, CSRF, project-role gating, and
// login rate limiting.
const crypto = require('crypto');
const storage = require('./storage');
const { ROLE_RANK } = require('./constants');
const { touchProjectPresence } = require('./project-state');

const ADMIN_USERNAMES = (process.env.ADMIN_USERS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET not set — using a random secret.');
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,32}$/;

// A session is valid only while it matches the user's current sessionVersion
// and the account isn't disabled — bumping sessionVersion (logout-everywhere,
// force-disable) invalidates every other session without a session-store scan.
function validSession(req) {
  if (!req.session || !req.session.user) return false;
  const u = storage.users[req.session.user.username];
  if (!u || u.disabled) return false;
  const sv = u.sessionVersion || 0;
  if ((req.session.user.sv || 0) !== sv) return false;
  return true;
}

function requireAuth(req, res, next) {
  if (validSession(req)) return next();
  res.status(401).json({ error: 'not authenticated' });
}
function requireSiteAdmin(req, res, next) {
  if (!validSession(req)) return res.status(401).json({ error: 'not authenticated' });
  const u = storage.users[req.session.user.username];
  if (!u.isAdmin) return res.status(403).json({ error: 'site admin only' });
  next();
}
// Project-scoped middleware factory: checks membership + minimum role on the
// session's currently-selected project, and attaches req.projectId/projectRole/pstate.
function projectMiddleware(minRole) {
  return function (req, res, next) {
    if (!validSession(req)) return res.status(401).json({ error: 'not authenticated' });
    const pid = req.session.currentProjectId;
    if (!pid || !storage.projectsMeta[pid]) return res.status(400).json({ error: 'no active project selected' });
    const role = storage.roleFor(req.session.user.username, pid);
    if (!role) return res.status(403).json({ error: 'not a member of this project' });
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) return res.status(403).json({ error: `${minRole} or higher required for this project` });
    req.projectId = pid;
    req.projectRole = role;
    req.pstate = storage.P[pid];
    touchProjectPresence(req.pstate, req.session.user.username);
    next();
  };
}
const requireProjectMember = projectMiddleware('translator');
const requireProjectReviewer = projectMiddleware('reviewer');
const requireProjectAdmin = projectMiddleware('admin');

/* ---------------- login rate limiting (in-memory, per ip+username) ---------------- */

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX = 5;
const loginAttempts = new Map(); // "ip:username" -> [timestamp, ...]

function loginRateLimited(key) {
  const now = Date.now();
  const arr = (loginAttempts.get(key) || []).filter((ts) => now - ts < LOGIN_RATE_LIMIT_WINDOW_MS);
  loginAttempts.set(key, arr);
  return arr.length >= LOGIN_RATE_LIMIT_MAX;
}
function recordLoginFailure(key) {
  const arr = loginAttempts.get(key) || [];
  arr.push(Date.now());
  loginAttempts.set(key, arr);
}
function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}

function requireCsrf(req, res, next) {
  const headerToken = req.get('X-CSRF-Token');
  if (!req.session || !req.session.csrfToken || !headerToken || headerToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'missing or invalid CSRF token' });
  }
  next();
}

module.exports = {
  ADMIN_USERNAMES, SESSION_SECRET, USERNAME_RE,
  validSession, requireAuth, requireSiteAdmin,
  projectMiddleware, requireProjectMember, requireProjectReviewer, requireProjectAdmin,
  loginRateLimited, recordLoginFailure, clearLoginAttempts,
  requireCsrf,
};
