// routes/projects.js — project directory, switching, join/create requests,
// project team management, and member reports.
const express = require('express');
const crypto = require('crypto');
const storage = require('../lib/storage');
const { ROLE_RANK } = require('../lib/constants');
const { requireAuth, requireSiteAdmin, requireProjectAdmin, requireProjectMember, requireCsrf } = require('../lib/auth-middleware');
const { logActivity, fileVisibleTo, previewValue } = require('../lib/project-state');

const router = express.Router();

/* ---- project management ---- */

router.get('/api/projects', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const isSiteAdmin = !!(storage.users[username] && storage.users[username].isAdmin);
  const list = Object.entries(storage.projectsMeta).map(([id, meta]) => {
    const role = storage.roleFor(username, id);
    const pending = !role && !!(storage.P[id] && storage.P[id].requests && storage.P[id].requests[username]);
    return { id, name: meta.name, role: role || null, pending };
  });
  list.sort((a, b) => a.name.localeCompare(b.name));
  const myCreateRequests = storage.projectCreateRequests
    .filter((r) => r.requestedBy === username)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 20);
  res.json({ projects: list, currentProjectId: req.session.currentProjectId || null, isSiteAdmin, myCreateRequests });
});

router.post('/api/projects', requireSiteAdmin, requireCsrf, (req, res) => {
  const { name } = req.body || {};
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return res.status(400).json({ error: 'project name required' });
  const username = req.session.user.username;
  const id = storage.createProject(trimmed, username);
  if (!storage.users[username].projects) storage.users[username].projects = {};
  storage.users[username].projects[id] = 'admin';
  storage.saveUsers();
  res.json({ ok: true, project: { id, name: trimmed, role: 'admin' } });
});

router.post('/api/projects/switch', requireAuth, requireCsrf, (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId || !storage.projectsMeta[projectId]) return res.status(404).json({ error: 'unknown project' });
  const role = storage.roleFor(req.session.user.username, projectId);
  if (!role) return res.status(403).json({ error: 'not a member of this project' });
  req.session.currentProjectId = projectId;
  res.json({ ok: true, projectId, role, name: storage.projectsMeta[projectId].name });
});

// self-serve: any logged-in user can ask to join a project; a project admin
// (or site admin) reviews the request and picks the role.
router.post('/api/projects/request', requireAuth, requireCsrf, (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId || !storage.projectsMeta[projectId]) return res.status(404).json({ error: 'unknown project' });
  const username = req.session.user.username;
  if (storage.roleFor(username, projectId)) return res.status(409).json({ error: 'already have access to this project' });
  const st = storage.P[projectId];
  if (st.requests[username]) return res.json({ ok: true, alreadyPending: true });
  st.requests[username] = { ts: Date.now() };
  st.save.requests();
  logActivity(st, 'join_request', username, {});
  res.json({ ok: true });
});

router.post('/api/projects/request/cancel', requireAuth, requireCsrf, (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId || !storage.projectsMeta[projectId]) return res.status(404).json({ error: 'unknown project' });
  const username = req.session.user.username;
  const st = storage.P[projectId];
  if (st.requests[username]) {
    delete st.requests[username];
    st.save.requests();
  }
  res.json({ ok: true });
});

// self-serve: any logged-in user can propose a brand-new project; a site
// admin reviews it and, on approval, the requester becomes that project's
// admin (not site-wide admin). Distinct from /api/projects/request above,
// which asks to join a project that already exists.
router.post('/api/projects/create-request', requireAuth, requireCsrf, (req, res) => {
  const { name } = req.body || {};
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return res.status(400).json({ error: 'project name required' });
  if (trimmed.length > 80) return res.status(400).json({ error: 'project name too long' });
  const username = req.session.user.username;

  const dup = storage.projectCreateRequests.find((r) => (
    r.requestedBy === username && r.status === 'pending' && r.name.toLowerCase() === trimmed.toLowerCase()
  ));
  if (dup) return res.json({ ok: true, alreadyPending: true });

  const entry = { id: crypto.randomUUID(), name: trimmed, requestedBy: username, ts: Date.now(), status: 'pending' };
  storage.projectCreateRequests.push(entry);
  storage.saveProjectCreateRequests();
  res.json({ ok: true, request: entry });
});

router.get('/api/projects/create-requests', requireSiteAdmin, (req, res) => {
  const requests = storage.projectCreateRequests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.ts - b.ts);
  res.json({ requests });
});

router.post('/api/projects/create-requests/decide', requireSiteAdmin, requireCsrf, (req, res) => {
  const { id, approve } = req.body || {};
  const entry = storage.projectCreateRequests.find((r) => r.id === id);
  if (!entry) return res.status(404).json({ error: 'request not found' });
  if (entry.status !== 'pending') return res.status(409).json({ error: 'request already decided' });
  if (!storage.users[entry.requestedBy]) return res.status(404).json({ error: 'requesting user no longer exists' });

  entry.decidedBy = req.session.user.username;
  entry.decidedAt = Date.now();
  if (approve) {
    const pid = storage.createProject(entry.name, entry.requestedBy);
    if (!storage.users[entry.requestedBy].projects) storage.users[entry.requestedBy].projects = {};
    storage.users[entry.requestedBy].projects[pid] = 'admin';
    storage.saveUsers();
    entry.status = 'approved';
    entry.projectId = pid;
  } else {
    entry.status = 'rejected';
  }
  storage.saveProjectCreateRequests();
  res.json({ ok: true, status: entry.status, projectId: entry.projectId || null });
});

// project-scoped team management — a project admin manages just their own game's roster
router.get('/api/project/members', requireProjectAdmin, (req, res) => {
  const pid = req.projectId;
  const st = req.pstate;
  const members = Object.entries(storage.users)
    .map(([username, u]) => ({ username, role: storage.roleFor(username, pid), siteAdmin: !!u.isAdmin }))
    .filter(m => m.role);
  members.sort((a, b) => a.username.localeCompare(b.username));
  const requests = Object.entries(st.requests)
    .map(([username, r]) => ({ username, ts: r.ts }))
    .sort((a, b) => a.ts - b.ts);
  const reports = (st.reports || [])
    .filter((r) => r.status !== 'resolved')
    .sort((a, b) => b.ts - a.ts);
  const allUsernames = Object.keys(storage.users).filter((username) => !storage.roleFor(username, pid)).sort();
  res.json({ members, requests, allUsernames, reports });
});

router.post('/api/project/requests/decide', requireProjectAdmin, requireCsrf, (req, res) => {
  const { username, approve, role } = req.body || {};
  const st = req.pstate;
  if (!st.requests[username]) return res.status(404).json({ error: 'no pending request from this user' });
  delete st.requests[username];
  st.save.requests();
  if (approve) {
    const u = storage.users[username];
    if (!u) return res.status(404).json({ error: 'unknown user' });
    const grantedRole = role && ROLE_RANK[role] ? role : 'translator';
    if (!u.projects) u.projects = {};
    u.projects[req.projectId] = grantedRole;
    storage.saveUsers();
    logActivity(st, 'request_approved', req.session.user.username, { targetUser: username, role: grantedRole });
  } else {
    logActivity(st, 'request_rejected', req.session.user.username, { targetUser: username });
  }
  res.json({ ok: true });
});

router.post('/api/project/members/role', requireProjectAdmin, requireCsrf, (req, res) => {
  const { username, role } = req.body || {};
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  if (role && !ROLE_RANK[role]) return res.status(400).json({ error: 'role must be translator, reviewer, or admin' });
  if (!u.projects) u.projects = {};
  if (role) u.projects[req.projectId] = role; else delete u.projects[req.projectId];
  storage.saveUsers();
  logActivity(req.pstate, role ? 'member_role_set' : 'member_removed', req.session.user.username, { targetUser: username, role: role || null });
  res.json({ ok: true });
});

/* ---- reports: flag a bad-actor teammate to this project's admins ---- */

router.post('/api/reports', requireProjectMember, requireCsrf, (req, res) => {
  const { reason, filename, key } = req.body || {};
  let { targetUser } = req.body || {};
  const st = req.pstate;
  const reporter = req.session.user.username;

  // Reporting from inside the editor: filename+key identify the string, and
  // targetUser (if not explicitly given) is derived from its current translator.
  let stringRef = null;
  if (filename || key) {
    if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
    const existing = st.edits[filename] && st.edits[filename][key];
    if (!targetUser && existing) targetUser = existing.editor;
    stringRef = { filename, key };
  }

  if (!targetUser || targetUser === reporter || !storage.roleFor(targetUser, req.projectId)) {
    return res.status(400).json({ error: 'unknown project member' });
  }
  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  if (!trimmed) return res.status(400).json({ error: 'a reason is required' });
  if (trimmed.length > 1000) return res.status(400).json({ error: 'reason too long' });

  const entry = {
    id: crypto.randomUUID(), reporter, targetUser, reason: trimmed, ts: Date.now(), status: 'open',
    ...(stringRef ? { filename: stringRef.filename, key: stringRef.key } : {}),
  };
  if (!st.reports) st.reports = [];
  st.reports.push(entry);
  st.save.reports();
  logActivity(st, 'user_report', reporter, {
    targetUser, reasonPreview: previewValue(trimmed),
    filename: stringRef ? stringRef.filename : undefined,
    key: stringRef ? stringRef.key : undefined,
  });
  res.json({ ok: true });
});

router.post('/api/reports/resolve', requireProjectAdmin, requireCsrf, (req, res) => {
  const { id } = req.body || {};
  const st = req.pstate;
  const r = (st.reports || []).find((x) => x.id === id);
  if (!r) return res.status(404).json({ error: 'report not found' });
  r.status = 'resolved';
  r.resolvedBy = req.session.user.username;
  r.resolvedAt = Date.now();
  st.save.reports();
  logActivity(st, 'report_resolved', req.session.user.username, { targetUser: r.targetUser });
  res.json({ ok: true });
});

module.exports = router;
