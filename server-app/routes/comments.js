// routes/comments.js — per-string comment threads (with reactions/mentions)
// and the project glossary.
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const storage = require('../lib/storage');
const { COMMENT_IMAGE_EXT_FOR_MIME, MAX_COMMENT_IMAGE_BYTES } = require('../lib/constants');
const { requireAuth, requireProjectMember, requireProjectReviewer, requireCsrf } = require('../lib/auth-middleware');
const { fileVisibleTo, previewValue, logActivity, extractMentions } = require('../lib/project-state');
const { safeBaseName } = require('../lib/tbx');

const router = express.Router();

const commentImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_COMMENT_IMAGE_BYTES } });

// A comment's `image` field must point at a file this project actually owns —
// otherwise a client could smuggle arbitrary URLs (including javascript:) or
// another project's images into a comment.
const COMMENT_IMAGE_NAME_RE = /^[a-f0-9-]+\.(?:png|jpg|webp|gif)$/i;
function validCommentImageRef(projectId, image) {
  if (typeof image !== 'string') return false;
  const m = image.match(/^\/api\/comments\/image\/([^/]+)\/([^/]+)$/);
  if (!m || m[1] !== projectId || !COMMENT_IMAGE_NAME_RE.test(m[2])) return false;
  return fs.existsSync(path.join(storage.projectPaths(projectId).commentImages, m[2]));
}

router.post('/api/comments/image', requireProjectMember, commentImageUpload.single('image'), requireCsrf, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'expected an image file' });
  const ext = COMMENT_IMAGE_EXT_FOR_MIME[req.file.mimetype];
  if (!ext) return res.status(400).json({ error: 'expected a PNG/JPEG/WEBP/GIF image' });
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(req.pstate.paths.commentImages, name), req.file.buffer);
  res.json({ ok: true, image: `/api/comments/image/${req.projectId}/${name}` });
});

// Not project-scoped via requireProjectMember (that binds to the session's
// *current* project) — a comment image can be viewed from any project the
// requester has a role on, matched by the :projectId in the URL itself.
router.get('/api/comments/image/:projectId/:filename', requireAuth, (req, res) => {
  const { projectId } = req.params;
  if (!storage.projectsMeta[projectId]) return res.status(404).end();
  if (!storage.roleFor(req.session.user.username, projectId)) return res.status(403).end();
  const base = safeBaseName(req.params.filename);
  if (!COMMENT_IMAGE_NAME_RE.test(base)) return res.status(400).end();
  const filePath = path.join(storage.projectPaths(projectId).commentImages, base);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.set('Cache-Control', 'private, max-age=86400');
  res.sendFile(filePath);
});

router.post('/api/comments', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, text, parentId, image } = req.body || {};
  if (!filename || !key || !fileVisibleTo(req, filename)) return res.status(400).json({ error: 'unknown file' });
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (image != null && !validCommentImageRef(req.projectId, image)) {
    return res.status(400).json({ error: 'invalid image reference' });
  }
  if (!trimmed && !image) return res.status(400).json({ error: 'comment text or image required' });
  if (trimmed.length > 2000) return res.status(400).json({ error: 'comment too long' });

  const st = req.pstate;
  const editor = req.session.user.username;
  const mentions = extractMentions(trimmed);

  // Replies are single-level: replying to a reply attaches to that reply's
  // own parent instead, so threads never nest more than one level deep.
  let resolvedParentId = null;
  let replyTo = null;
  if (parentId) {
    const list = st.comments[filename] && st.comments[filename][key];
    const parent = list && list.find((c) => c.id === parentId);
    if (!parent) return res.status(404).json({ error: 'parent comment not found' });
    resolvedParentId = parent.parentId || parent.id;
    // The person being replied to is whoever authored the comment the user
    // actually clicked "reply" on (not necessarily the top-level author once
    // threads are flattened to one level) — that's who gets notified.
    replyTo = parent.author;
  }

  const entry = { id: crypto.randomUUID(), author: editor, text: trimmed, image: image || null, ts: Date.now(), resolved: false, mentions, reactions: {}, parentId: resolvedParentId };
  if (!st.comments[filename]) st.comments[filename] = {};
  if (!st.comments[filename][key]) st.comments[filename][key] = [];
  st.comments[filename][key].push(entry);
  st.save.comments();
  logActivity(st, 'comment_add', editor, { filename, key, valuePreview: previewValue(trimmed), mentions, parentId: resolvedParentId, replyTo });
  res.json({ ok: true, comment: entry });
});

router.post('/api/comments/resolve', requireProjectReviewer, requireCsrf, (req, res) => {
  const { filename, key, id, resolved } = req.body || {};
  const st = req.pstate;
  if (!filename || !fileVisibleTo(req, filename)) return res.status(404).json({ error: 'comment not found' });
  const list = st.comments[filename] && st.comments[filename][key];
  const c = list && list.find((c) => c.id === id);
  if (!c) return res.status(404).json({ error: 'comment not found' });
  c.resolved = !!resolved;
  st.save.comments();
  logActivity(st, c.resolved ? 'comment_resolve' : 'comment_unresolve', req.session.user.username, { filename, key });
  res.json({ ok: true });
});

// Like / dislike a comment. One reaction per user per comment; sending the
// same reaction again clears it, sending the other one switches it.
router.post('/api/comments/react', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, id, reaction } = req.body || {};
  if (reaction !== 'like' && reaction !== 'dislike' && reaction != null) {
    return res.status(400).json({ error: 'reaction must be like, dislike, or null' });
  }
  const st = req.pstate;
  if (!filename || !fileVisibleTo(req, filename)) return res.status(404).json({ error: 'comment not found' });
  const list = st.comments[filename] && st.comments[filename][key];
  const c = list && list.find((c) => c.id === id);
  if (!c) return res.status(404).json({ error: 'comment not found' });
  if (!c.reactions) c.reactions = {};

  const username = req.session.user.username;
  const current = c.reactions[username] || null;
  if (!reaction || current === reaction) {
    delete c.reactions[username];
  } else {
    c.reactions[username] = reaction;
  }
  st.save.comments();

  if (reaction && current !== reaction) {
    logActivity(st, 'comment_react', username, { filename, key, targetUser: c.author, reaction, valuePreview: previewValue(c.text) });
  }

  let likes = 0, dislikes = 0;
  for (const r of Object.values(c.reactions)) { if (r === 'like') likes++; else if (r === 'dislike') dislikes++; }
  res.json({ ok: true, likes, dislikes, myReaction: c.reactions[username] || null });
});

// Short-lived server-held undo buffer for comment deletes. The client's
// "Undo" toast only ever gets back an opaque deleteId — never asked to
// resubmit the comment content itself — so restore always replays exactly
// what the server actually deleted, and can never be used to plant forged
// content (e.g. someone else's name on a comment they didn't write).
const RECENT_DELETES = new Map(); // deleteId -> { projectId, filename, key, comments, deletedBy, expiresAt }
const DELETE_UNDO_TTL_MS = 5 * 60 * 1000;
function pruneRecentDeletes() {
  const now = Date.now();
  for (const [id, rec] of RECENT_DELETES) if (rec.expiresAt < now) RECENT_DELETES.delete(id);
}

router.delete('/api/comments', requireProjectMember, requireCsrf, (req, res) => {
  const { filename, key, id } = req.body || {};
  const st = req.pstate;
  if (!filename || !fileVisibleTo(req, filename)) return res.status(404).json({ error: 'comment not found' });
  const list = st.comments[filename] && st.comments[filename][key];
  const idx = list ? list.findIndex((c) => c.id === id) : -1;
  if (idx === -1) return res.status(404).json({ error: 'comment not found' });
  const c = list[idx];
  const editor = req.session.user.username;
  const isOwner = c.author === editor;
  const canModerate = req.projectRole === 'admin' || req.projectRole === 'reviewer';
  if (!isOwner && !canModerate) return res.status(403).json({ error: 'you can only delete your own comments' });

  // Deleting a top-level comment takes its replies with it.
  const idsToRemove = new Set([id]);
  if (!c.parentId) {
    for (const reply of list) if (reply.parentId === id) idsToRemove.add(reply.id);
  }
  const removed = list.filter((x) => idsToRemove.has(x.id));
  st.comments[filename][key] = list.filter((x) => !idsToRemove.has(x.id));
  if (!st.comments[filename][key].length) delete st.comments[filename][key];
  st.save.comments();
  logActivity(st, 'comment_delete', editor, { filename, key });

  pruneRecentDeletes();
  const deleteId = crypto.randomUUID();
  RECENT_DELETES.set(deleteId, {
    projectId: req.projectId, filename, key, comments: removed,
    deletedBy: editor, expiresAt: Date.now() + DELETE_UNDO_TTL_MS,
  });
  // The client holds a short-lived undo window after a delete; this lets it
  // repost the exact same comment(s) — including the original author and
  // thread structure — instead of the undo re-creating them under whoever
  // clicked "Undo".
  res.json({ ok: true, removed, deleteId });
});

router.post('/api/comments/restore', requireProjectMember, requireCsrf, (req, res) => {
  const { deleteId } = req.body || {};
  pruneRecentDeletes();
  const rec = typeof deleteId === 'string' ? RECENT_DELETES.get(deleteId) : null;
  if (!rec || rec.projectId !== req.projectId) {
    return res.status(404).json({ error: 'nothing to restore — the undo window may have expired' });
  }
  const editor = req.session.user.username;
  const canModerate = req.projectRole === 'admin' || req.projectRole === 'reviewer';
  if (rec.deletedBy !== editor && !canModerate) return res.status(403).json({ error: 'not allowed to restore this' });
  RECENT_DELETES.delete(deleteId);

  const { filename, key } = rec;
  const st = req.pstate;
  if (!fileVisibleTo(req, filename)) return res.status(404).json({ error: 'unknown file' });
  if (!st.comments[filename]) st.comments[filename] = {};
  const list = st.comments[filename][key] || (st.comments[filename][key] = []);
  const existingIds = new Set(list.map((c) => c.id));
  let restored = 0;
  for (const c of rec.comments) {
    if (existingIds.has(c.id)) continue;
    list.push({
      id: c.id,
      author: c.author,
      text: c.text,
      image: validCommentImageRef(req.projectId, c.image) ? c.image : null,
      ts: typeof c.ts === 'number' ? c.ts : Date.now(),
      parentId: typeof c.parentId === 'string' ? c.parentId : null,
      mentions: Array.isArray(c.mentions) ? c.mentions.filter((m) => typeof m === 'string') : [],
      reactions: (c.reactions && typeof c.reactions === 'object') ? c.reactions : {},
      resolved: !!c.resolved,
    });
    restored++;
  }
  if (!restored) return res.json({ ok: true, restored: 0 });
  list.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  st.save.comments();
  logActivity(st, 'comment_restore', editor, { filename, key });
  res.json({ ok: true, restored });
});

/* ---- glossary (reviewer or admin, scoped to active project) ---- */

router.post('/api/glossary', requireProjectReviewer, requireCsrf, (req, res) => {
  const { term, translation, note } = req.body || {};
  const t = typeof term === 'string' ? term.trim() : '';
  const tr = typeof translation === 'string' ? translation.trim() : '';
  if (!t || !tr) return res.status(400).json({ error: 'term and translation are required' });

  const st = req.pstate;
  const entry = {
    id: crypto.randomUUID(), term: t, translation: tr,
    note: typeof note === 'string' ? note.trim() : '',
    addedBy: req.session.user.username, ts: Date.now(),
  };
  st.glossary.push(entry);
  st.save.glossary();
  logActivity(st, 'glossary_add', req.session.user.username, { term: t, translation: tr });
  res.json({ ok: true, entry });
});

router.post('/api/glossary/update', requireProjectReviewer, requireCsrf, (req, res) => {
  const { id, term, translation, note } = req.body || {};
  const st = req.pstate;
  const entry = st.glossary.find((g) => g.id === id);
  if (!entry) return res.status(404).json({ error: 'term not found' });

  const t = typeof term === 'string' ? term.trim() : '';
  const tr = typeof translation === 'string' ? translation.trim() : '';
  if (!t || !tr) return res.status(400).json({ error: 'term and translation are required' });

  entry.term = t;
  entry.translation = tr;
  entry.note = typeof note === 'string' ? note.trim() : '';
  st.save.glossary();
  logActivity(st, 'glossary_update', req.session.user.username, { id, term: t, translation: tr });
  res.json({ ok: true, entry });
});

router.delete('/api/glossary', requireProjectReviewer, requireCsrf, (req, res) => {
  const { id } = req.body || {};
  const st = req.pstate;
  const idx = st.glossary.findIndex((g) => g.id === id);
  if (idx === -1) return res.status(404).json({ error: 'term not found' });

  const removed = st.glossary.splice(idx, 1)[0];
  st.save.glossary();
  logActivity(st, 'glossary_delete', req.session.user.username, { term: removed.term });
  res.json({ ok: true });
});

module.exports = router;
