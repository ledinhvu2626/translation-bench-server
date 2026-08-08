// routes/edits.js — project state snapshot, presence, translating, locking,
// history, approvals, QA decisions, and suggestions.
const express = require('express');
const crypto = require('crypto');
const storage = require('../lib/storage');
const { ROLE_RANK, MAX_SUGGESTIONS_PER_KEY, PRESENCE_TTL_MS } = require('../lib/constants');
const { requireProjectMember, requireProjectReviewer, requireProjectAdmin, requireCsrf } = require('../lib/auth-middleware');
const {
  fileVisibleTo, previewValue, logActivity, pushHistory, withContributors,
  touchLock, detectConcurrentEditor, clearLock, liveLocksFor,
  touchFileLock, clearFileLock, activeFileLock, liveFileLocksFor,
  touchFilePresence, fileEditorsFor, activeUserCountFor,
} = require('../lib/project-state');
const { computeQaIssues } = require('../lib/qa');

const router = express.Router();

/* ---------------- project-scoped translation api ---------------- */

router.get('/api/state', requireProjectMember, (req, res) => {
  const st = req.pstate;
  const { file } = req.query;
  if (file && fileVisibleTo(req, file)) touchFilePresence(st, file, req.session.user.username);
  const liveLocks = liveLocksFor(st, req);
  const liveFileLocks = liveFileLocksFor(st, req);
  const activeUsers = activeUserCountFor(st);
  const fileEditors = fileEditorsFor(st, req);
  const base = { projectId: req.projectId, projectName: storage.projectsMeta[req.projectId].name, projectRole: req.projectRole, locks: liveLocks, fileLocks: liveFileLocks, activeUsers, fileEditors, glossary: st.glossary, avatars: storage.avatarsForProject(req.projectId), members: storage.membersOfProject(req.projectId) };
  if (req.projectRole === 'admin') {
    return res.json({ ...base, files: st.files, edits: st.edits, comments: st.comments, hiddenFiles: [...st.hiddenFiles], approvals: st.approvals, suggestions: st.suggestions, qaDecisions: st.qaDecisions });
  }
  const visibleFiles = {}, visibleEdits = {}, visibleComments = {}, visibleApprovals = {}, visibleSuggestions = {};
  for (const [name, f] of Object.entries(st.files)) {
    if (st.hiddenFiles.has(name)) continue;
    visibleFiles[name] = f;
    if (st.edits[name]) visibleEdits[name] = st.edits[name];
    if (st.comments[name]) visibleComments[name] = st.comments[name];
    if (st.approvals[name]) visibleApprovals[name] = st.approvals[name];
    if (st.suggestions[name]) visibleSuggestions[name] = st.suggestions[name];
  }
  // QA report tab is admin-only in the UI, so non-admins don't need qaDecisions.
  res.json({ ...base, files: visibleFiles, edits: visibleEdits, comments: visibleComments, hiddenFiles: [], approvals: visibleApprovals, suggestions: visibleSuggestions });
});

// Per-user online list: who's present on this project and, if applicable,
// which file/key they're actively editing right now.
router.get('/api/presence', requireProjectMember, (req, res) => {
  const st = req.pstate;
  const now = Date.now();

  const liveLocks = liveLocksFor(st, req);
  const editingKeyBy = {}; // username -> { filename, key }
  for (const [filename, keys] of Object.entries(liveLocks)) {
    for (const [key, entry] of Object.entries(keys)) {
      editingKeyBy[entry.username] = { filename, key };
    }
  }
  const fileEditors = fileEditorsFor(st, req); // filename -> [username, ...]
  const editingFileBy = {}; // username -> filename
  for (const [filename, names] of Object.entries(fileEditors)) {
    for (const username of names) {
      if (!editingFileBy[username]) editingFileBy[username] = filename;
    }
  }

  const list = Object.entries(st.presence)
    .filter(([, ts]) => now - ts <= PRESENCE_TTL_MS)
    .map(([username, ts]) => {
      const editingKey = editingKeyBy[username] || null;
      return {
        username,
        lastSeen: ts,
        file: editingFileBy[username] || (editingKey ? editingKey.filename : null),
        key: editingKey ? editingKey.key : null,
      };
    })
    .sort((a, b) => b.lastSeen - a.lastSeen);

  res.json({ users: list });
});

router.post('/api/edit', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, value, knownTs } = req.body || {};
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  if (typeof value !== 'string') return res.status(400).json({ error: 'value must be a string' });

  const st = req.pstate;
  const editor = req.session.user.username;
  const fLock = activeFileLock(st, filename);
  if (fLock && fLock.username !== editor) {
    return res.status(409).json({ error: 'file locked by another editor', lockedBy: fLock.username, since: fLock.ts });
  }

  const baseVal = st.files[filename].baseline[key];
  const existing = st.edits[filename] && st.edits[filename][key];

  // Once a string has a translation, only the person who wrote it (or an
  // admin) may change it directly. Anyone else — including reviewers — has
  // to go through /api/suggestions instead of silently overwriting it.
  if (existing && existing.editor !== editor && ROLE_RANK[req.projectRole] < ROLE_RANK.admin) {
    return res.status(423).json({
      error: `Already translated by ${existing.editor} — add a suggestion instead of editing directly.`,
      locked: true,
      lockedBy: existing.editor,
    });
  }

  const priorTs = existing ? existing.ts : null;
  const clientKnownTs = (typeof knownTs === 'number') ? knownTs : null;

  if (existing && existing.editor !== editor && priorTs !== clientKnownTs) {
    return res.status(409).json({
      error: 'conflict',
      current: { value: existing.value, editor: existing.editor, ts: existing.ts },
    });
  }

  if (!st.edits[filename]) st.edits[filename] = {};
  // Preserve the original translator's credit when an admin overrides someone
  // else's translation — editor stays the credited translator, lastModifiedBy
  // (only set when it differs) records who actually made this change.
  const creditedEditor = existing ? existing.editor : editor;
  const isOverride = editor !== creditedEditor;
  let newTs = null;
  let qaIssues = [];
  if (value === baseVal) {
    if (st.edits[filename][key]) {
      delete st.edits[filename][key];
      logActivity(st, 'clear', editor, { filename, key });
      pushHistory(st, filename, key, { value: baseVal, editor, ts: Date.now(), reverted: true });
    }
  } else {
    newTs = Date.now();
    qaIssues = computeQaIssues(baseVal, value);
    const rec = { value, editor: creditedEditor, ts: newTs, qaIssues, contributors: withContributors(existing, creditedEditor, editor) };
    if (isOverride) rec.lastModifiedBy = editor;
    st.edits[filename][key] = rec;
    logActivity(st, 'edit', editor, {
      filename, key, valuePreview: previewValue(value),
      qaIssues: qaIssues.length ? qaIssues.map((i) => i.code) : undefined,
      editor: creditedEditor,
      lastModifiedBy: isOverride ? editor : undefined,
    });
    pushHistory(st, filename, key, { value, editor: creditedEditor, lastModifiedBy: isOverride ? editor : undefined, ts: newTs });
  }
  if (st.approvals[filename] && st.approvals[filename][key]) {
    delete st.approvals[filename][key];
    st.save.approvals();
  }
  clearLock(st, filename, key, editor);
  st.save.edits();
  res.json({ ok: true, ts: newTs, qaIssues });
});

router.post('/api/lock', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key } = req.body || {};
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  const st = req.pstate;
  const editor = req.session.user.username;
  const fLock = activeFileLock(st, filename);
  if (fLock && fLock.username !== editor) {
    return res.status(409).json({ error: 'file locked by another editor', lockedBy: fLock.username, since: fLock.ts });
  }
  const conflictWith = detectConcurrentEditor(st, filename, key, editor);
  if (conflictWith) {
    logActivity(st, 'concurrent_edit', editor, { filename, key, otherEditor: conflictWith });
  }
  touchLock(st, filename, key, editor);
  res.json({ ok: true, conflictWith: conflictWith || null });
});
router.post('/api/unlock', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key } = req.body || {};
  if (!filename || !key) return res.status(400).json({ error: 'missing filename/key' });
  clearLock(req.pstate, filename, key, req.session.user.username);
  res.json({ ok: true });
});

router.post('/api/lock/file', requireProjectMember, requireCsrf, (req, res) => {
  const { filename } = req.body || {};
  if (!filename || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  const st = req.pstate;
  const editor = req.session.user.username;
  const existing = activeFileLock(st, filename);
  if (existing && existing.username !== editor) {
    return res.status(409).json({ error: 'file locked', lockedBy: existing.username, since: existing.ts });
  }
  touchFileLock(st, filename, editor);
  logActivity(st, 'file_lock', editor, { filename });
  res.json({ ok: true });
});
router.post('/api/unlock/file', requireProjectMember, requireCsrf, (req, res) => {
  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'missing filename' });
  clearFileLock(req.pstate, filename, req.session.user.username);
  logActivity(req.pstate, 'file_unlock', req.session.user.username, { filename });
  res.json({ ok: true });
});

router.get('/api/history', requireProjectMember, (req, res) => {
  const { filename, key } = req.query;
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  const st = req.pstate;
  const list = (st.history[filename] && st.history[filename][key]) || [];
  res.json({ entries: [...list].reverse() });
});

router.post('/api/approve', requireProjectReviewer, requireCsrf, (req, res) => {
  const { filename, key, approved } = req.body || {};
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  const st = req.pstate;
  if (!st.approvals[filename]) st.approvals[filename] = {};
  if (approved) {
    st.approvals[filename][key] = { approver: req.session.user.username, ts: Date.now() };
    logActivity(st, 'approve', req.session.user.username, { filename, key });
  } else if (st.approvals[filename][key]) {
    delete st.approvals[filename][key];
    logActivity(st, 'unapprove', req.session.user.username, { filename, key });
  }
  st.save.approvals();
  res.json({ ok: true });
});

router.post('/api/approve/bulk', requireProjectReviewer, requireCsrf, (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items array required' });
  if (items.length > 500) return res.status(400).json({ error: 'too many items (max 500 per request)' });

  const st = req.pstate;
  const approver = req.session.user.username;
  const results = [];
  let applied = 0;
  for (const item of items) {
    const { filename, key, approved } = item || {};
    if (!filename || !key || !fileVisibleTo(req, filename)) {
      results.push({ filename, key, ok: false, error: 'unknown file' });
      continue;
    }
    if (!st.approvals[filename]) st.approvals[filename] = {};
    if (approved) {
      st.approvals[filename][key] = { approver, ts: Date.now() };
      logActivity(st, 'approve', approver, { filename, key });
    } else if (st.approvals[filename][key]) {
      delete st.approvals[filename][key];
      logActivity(st, 'unapprove', approver, { filename, key });
    }
    applied++;
    results.push({ filename, key, ok: true });
  }
  st.save.approvals();
  res.json({ ok: true, applied, results });
});

/* ---- QA report review: admins triage flagged entries (token mismatch,
   glossary miss, formatting, etc — see computeQaIssues / client-side
   allQaIssues) as ignored (false positive / not worth fixing) or approved
   (flag is legit but intentional), so they drop out of the open QA queue.
   Decisions are per filename+key and don't change the translation itself. ---- */

router.post('/api/qa/decide', requireProjectAdmin, requireCsrf, (req, res) => {
  const { filename, key, decision } = req.body || {};
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  if (decision !== 'ignore' && decision !== 'approve' && decision !== null) {
    return res.status(400).json({ error: 'decision must be "ignore", "approve", or null to reopen' });
  }
  const st = req.pstate;
  const reviewer = req.session.user.username;
  if (decision === null) {
    if (st.qaDecisions[filename]) {
      delete st.qaDecisions[filename][key];
      if (!Object.keys(st.qaDecisions[filename]).length) delete st.qaDecisions[filename];
    }
    logActivity(st, 'qa_reopen', reviewer, { filename, key });
  } else {
    if (!st.qaDecisions[filename]) st.qaDecisions[filename] = {};
    st.qaDecisions[filename][key] = { status: decision === 'approve' ? 'approved' : 'ignored', by: reviewer, ts: Date.now() };
    logActivity(st, decision === 'approve' ? 'qa_approve' : 'qa_ignore', reviewer, { filename, key });
  }
  st.save.qaDecisions();
  res.json({ ok: true, decision: (st.qaDecisions[filename] && st.qaDecisions[filename][key]) || null });
});

/* ---- suggestions: once a string is translated, other translators can only propose a change ---- */

router.post('/api/suggestions', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, value } = req.body || {};
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return res.status(400).json({ error: 'suggestion text required' });
  if (trimmed.length > 4000) return res.status(400).json({ error: 'suggestion too long' });

  const st = req.pstate;
  const author = req.session.user.username;
  const entry = { id: crypto.randomUUID(), author, value: trimmed, ts: Date.now() };
  if (!st.suggestions[filename]) st.suggestions[filename] = {};
  if (!st.suggestions[filename][key]) st.suggestions[filename][key] = [];
  st.suggestions[filename][key].push(entry);
  if (st.suggestions[filename][key].length > MAX_SUGGESTIONS_PER_KEY) {
    st.suggestions[filename][key] = st.suggestions[filename][key].slice(-MAX_SUGGESTIONS_PER_KEY);
  }
  st.save.suggestions();
  logActivity(st, 'suggestion_add', author, { filename, key, valuePreview: previewValue(trimmed) });
  res.json({ ok: true, suggestion: entry });
});

router.post('/api/suggestions/apply', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, id } = req.body || {};
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  const st = req.pstate;
  const list = st.suggestions[filename] && st.suggestions[filename][key];
  const sug = list && list.find((s) => s.id === id);
  if (!sug) return res.status(404).json({ error: 'suggestion not found' });

  const editor = req.session.user.username;
  const existing = st.edits[filename] && st.edits[filename][key];
  const isOwner = !existing || existing.editor === editor;
  const canModerate = ROLE_RANK[req.projectRole] >= ROLE_RANK.admin;
  if (!isOwner && !canModerate) {
    return res.status(403).json({ error: 'only the current translator or a reviewer can apply suggestions' });
  }

  const baseVal = st.files[filename].baseline[key];
  const value = sug.value;
  if (!st.edits[filename]) st.edits[filename] = {};
  const creditedEditor = existing ? existing.editor : editor;
  const isOverride = editor !== creditedEditor;
  if (value === baseVal) {
    delete st.edits[filename][key];
    logActivity(st, 'clear', editor, { filename, key });
    pushHistory(st, filename, key, { value: baseVal, editor, ts: Date.now(), reverted: true });
  } else {
    const ts = Date.now();
    const qaIssues = computeQaIssues(baseVal, value);
    const rec = { value, editor: creditedEditor, ts, qaIssues, contributors: withContributors(existing, creditedEditor, editor, sug.author) };
    if (isOverride) rec.lastModifiedBy = editor;
    st.edits[filename][key] = rec;
    pushHistory(st, filename, key, { value, editor: creditedEditor, lastModifiedBy: isOverride ? editor : undefined, ts });
  }
  if (st.approvals[filename] && st.approvals[filename][key]) {
    delete st.approvals[filename][key];
    st.save.approvals();
  }
  st.save.edits();

  st.suggestions[filename][key] = list.filter((s) => s.id !== id);
  if (!st.suggestions[filename][key].length) delete st.suggestions[filename][key];
  st.save.suggestions();

  logActivity(st, 'suggestion_apply', editor, { filename, key, targetUser: sug.author, valuePreview: previewValue(value) });
  res.json({ ok: true });
});

router.delete('/api/suggestions', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, id } = req.body || {};
  const st = req.pstate;
  if (!filename || !fileVisibleTo(req, filename)) return res.status(404).json({ error: 'suggestion not found' });
  const list = st.suggestions[filename] && st.suggestions[filename][key];
  const idx = list ? list.findIndex((s) => s.id === id) : -1;
  if (idx === -1) return res.status(404).json({ error: 'suggestion not found' });
  const sug = list[idx];
  const editor = req.session.user.username;
  const canModerate = ROLE_RANK[req.projectRole] >= ROLE_RANK.admin;
  if (sug.author !== editor && !canModerate) return res.status(403).json({ error: 'you can only remove your own suggestions' });
  list.splice(idx, 1);
  if (!list.length) delete st.suggestions[filename][key];
  st.save.suggestions();
  logActivity(st, 'suggestion_reject', editor, { filename, key, targetUser: sug.author });
  res.json({ ok: true, removed: sug });
});

router.post('/api/suggestions/restore', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, suggestion } = req.body || {};
  if (!filename || !key || !suggestion || !fileVisibleTo(req, filename)) {
    return res.status(400).json({ error: 'invalid restore payload' });
  }
  const editor = req.session.user.username;
  const canModerate = ROLE_RANK[req.projectRole] >= ROLE_RANK.admin;
  const isOwner = suggestion.author === editor;
  if (!isOwner && !canModerate) return res.status(403).json({ error: 'not allowed to restore this' });
  if (typeof suggestion.id !== 'string' || typeof suggestion.author !== 'string' ||
      typeof suggestion.value !== 'string' || suggestion.value.length > 4000) {
    return res.status(400).json({ error: 'invalid suggestion payload' });
  }
  const st = req.pstate;
  if (!st.suggestions[filename]) st.suggestions[filename] = {};
  if (!st.suggestions[filename][key]) st.suggestions[filename][key] = [];
  const list = st.suggestions[filename][key];
  if (list.some((s) => s.id === suggestion.id)) return res.json({ ok: true, restored: false });
  list.push({
    id: suggestion.id,
    author: suggestion.author,
    value: suggestion.value,
    ts: typeof suggestion.ts === 'number' ? suggestion.ts : Date.now(),
  });
  if (list.length > MAX_SUGGESTIONS_PER_KEY) st.suggestions[filename][key] = list.slice(-MAX_SUGGESTIONS_PER_KEY);
  st.save.suggestions();
  logActivity(st, 'suggestion_restore', editor, { filename, key });
  res.json({ ok: true, restored: true });
});

router.post('/api/files/hidden', requireProjectAdmin, requireCsrf, (req, res) => {
  const { filename, hidden } = req.body || {};
  const st = req.pstate;
  if (!filename || !st.files[filename]) return res.status(400).json({ error: 'unknown file' });
  const nowHidden = !!hidden;
  const wasHidden = st.hiddenFiles.has(filename);
  if (nowHidden) st.hiddenFiles.add(filename); else st.hiddenFiles.delete(filename);
  if (wasHidden !== nowHidden) {
    st.save.hidden();
    logActivity(st, nowHidden ? 'hide_file' : 'unhide_file', req.session.user.username, { filename });
  }
  res.json({ ok: true, hidden: nowHidden });
});

module.exports = router;
