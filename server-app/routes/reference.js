// routes/reference.js — translation memory / concordance search, the
// personal @mention notification feed, and the admin activity log.
const express = require('express');
const storage = require('../lib/storage');
const { MAX_LOG_ENTRIES } = require('../lib/constants');
const { requireProjectMember, requireProjectAdmin, requireCsrf } = require('../lib/auth-middleware');
const { fileVisibleTo } = require('../lib/project-state');
const { similarity } = require('../lib/translation-memory');

const router = express.Router();

/* ---- translation memory: fuzzy match + concordance (any project member) ---- */

router.get('/api/tm/search', requireProjectMember, (req, res) => {
  const q = (req.query.q || '').toString();
  const excludeFile = req.query.file;
  const excludeKey = req.query.key;
  const minScore = 0.4;
  if (!q.trim()) return res.json({ matches: [] });
  const st = req.pstate;
  const qLower = q.toLowerCase();
  const results = [];
  for (const [filename, f] of Object.entries(st.files)) {
    if (!fileVisibleTo(req, filename)) continue;
    for (const key of f.order) {
      if (filename === excludeFile && key === excludeKey) continue;
      const src = f.baseline[key] || '';
      if (!src) continue;
      // cheap length pre-filter before paying for full Levenshtein
      const lenRatio = Math.min(src.length, q.length) / Math.max(src.length, q.length, 1);
      if (lenRatio < 0.4) continue;
      const score = similarity(qLower, src.toLowerCase());
      if (score < minScore) continue;
      const e = st.edits[filename] && st.edits[filename][key];
      results.push({ filename, key, source: src, target: e ? e.value : src, score, editor: e ? e.editor : null });
    }
  }
  results.sort((a, b) => b.score - a.score);
  res.json({ matches: results.slice(0, 20) });
});

router.get('/api/concordance', requireProjectMember, (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ matches: [] });
  const st = req.pstate;
  const qLower = q.toLowerCase();
  const results = [];
  for (const [filename, f] of Object.entries(st.files)) {
    if (!fileVisibleTo(req, filename)) continue;
    for (const key of f.order) {
      const src = f.baseline[key] || '';
      const e = st.edits[filename] && st.edits[filename][key];
      const target = e ? e.value : src;
      const inSrc = src.toLowerCase().includes(qLower);
      const inTgt = target.toLowerCase().includes(qLower);
      if (!inSrc && !inTgt) continue;
      results.push({ filename, key, source: src, target, matchIn: inSrc && inTgt ? 'both' : inSrc ? 'source' : 'target', editor: e ? e.editor : null });
      if (results.length >= 300) break;
    }
    if (results.length >= 300) break;
  }
  res.json({ matches: results });
});

// Personal notification feed: comments that are actually *about* this
// member — either they were @mentioned, or someone directly replied to a
// comment of theirs. This is intentionally narrow (not a broadcast of all
// comment/suggestion/reaction activity on visible files): you only get
// pinged for things directed at you. Unlike /api/log (admin-only, whole
// history), this is scoped to what a translator/reviewer should reasonably
// want a heads-up about.
router.get('/api/notifications', requireProjectMember, (req, res) => {
  const st = req.pstate;
  const username = req.session.user.username;
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 100;
  limit = Math.min(limit, 300);

  const u = storage.users[username];
  const lastSeen = (u && u.notifSeen && u.notifSeen[req.projectId]) || 0;

  const relevant = st.log.filter((e) => (
    e.type === 'comment_add' && e.editor !== username && fileVisibleTo(req, e.filename) &&
    ((Array.isArray(e.mentions) && e.mentions.includes(username)) || e.replyTo === username)
  ));
  const entries = relevant.slice(-limit).reverse().map((e) => ({
    ...e,
    mentionsYou: Array.isArray(e.mentions) && e.mentions.includes(username),
    repliedToYou: e.replyTo === username,
    unread: e.ts > lastSeen,
  }));
  const unreadCount = relevant.reduce((n, e) => n + (e.ts > lastSeen ? 1 : 0), 0);
  res.json({ entries, unreadCount, lastSeen });
});

router.post('/api/notifications/seen', requireProjectMember, requireCsrf, (req, res) => {
  const username = req.session.user.username;
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  if (!u.notifSeen) u.notifSeen = {};
  u.notifSeen[req.projectId] = Date.now();
  storage.saveUsers();
  res.json({ ok: true, seenAt: u.notifSeen[req.projectId] });
});

router.get('/api/log', requireProjectAdmin, (req, res) => {
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 500;
  limit = Math.min(limit, MAX_LOG_ENTRIES);
  const entries = req.pstate.log.slice(-limit).reverse();
  res.json({ entries });
});

module.exports = router;
