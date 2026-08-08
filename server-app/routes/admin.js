// routes/admin.js — source file upload, exports (ZIP/JSON/TBX), and
// site-admin cross-project user management.
const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const storage = require('../lib/storage');
const { ROLE_RANK } = require('../lib/constants');
const { requireProjectAdmin, requireSiteAdmin, requireCsrf } = require('../lib/auth-middleware');
const { logActivity } = require('../lib/project-state');
const { buildTbx, parseTbxToObject, safeBaseName } = require('../lib/tbx');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/api/upload', requireProjectAdmin, upload.array('files'), requireCsrf, async (req, res) => {
  const st = req.pstate;
  try {
    const processed = [];
    for (const f of req.files || []) {
      const lower = f.originalname.toLowerCase();
      if (lower.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(f.buffer);
        for (const entry of Object.values(zip.files)) {
          if (entry.dir) continue;
          const base = safeBaseName(entry.name.split('/').pop());
          if (/\.json$/i.test(entry.name)) {
            const text = await entry.async('string');
            JSON.parse(text);
            await storage.safeWriteFile(path.join(st.paths.source, base), text);
            processed.push(base);
          } else if (/\.tbx$/i.test(entry.name)) {
            const text = await entry.async('string');
            const obj = parseTbxToObject(text);
            if (!Object.keys(obj).length) throw new Error(`No <termEntry> terms found in ${base}`);
            const outName = base.replace(/\.tbx$/i, '') + '.tbx.json';
            await storage.safeWriteFile(path.join(st.paths.source, outName), JSON.stringify(obj, null, 4));
            processed.push(outName);
          }
        }
      } else if (lower.endsWith('.json')) {
        const safeName = safeBaseName(f.originalname);
        const text = f.buffer.toString('utf8');
        JSON.parse(text);
        await storage.safeWriteFile(path.join(st.paths.source, safeName), text);
        processed.push(safeName);
      } else if (lower.endsWith('.tbx')) {
        const safeName = safeBaseName(f.originalname);
        const text = f.buffer.toString('utf8');
        const obj = parseTbxToObject(text);
        if (!Object.keys(obj).length) throw new Error(`No <termEntry> terms found in ${safeName}`);
        const outName = safeName.replace(/\.tbx$/i, '') + '.tbx.json';
        await storage.safeWriteFile(path.join(st.paths.source, outName), JSON.stringify(obj, null, 4));
        processed.push(outName);
      }
    }
    storage.loadProjectSourceFiles(st);
    logActivity(st, 'upload', req.session.user.username, { files: processed });
    res.json({ ok: true, files: Object.keys(st.files) });
  } catch (e) {
    res.status(400).json({ error: 'Could not process upload: ' + e.message });
  }
});

router.get('/api/export', requireProjectAdmin, async (req, res) => {
  const st = req.pstate;
  const zip = new JSZip();
  for (const [filename, f] of Object.entries(st.files)) {
    const out = {};
    for (const key of f.order) {
      const e = st.edits[filename] && st.edits[filename][key];
      out[key] = e ? e.value : f.baseline[key];
    }
    zip.file(filename, JSON.stringify(out, null, 4));
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  logActivity(st, 'export', req.session.user.username, {});
  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename="${req.projectId}_export.zip"`);
  res.send(buf);
});

router.get('/api/export/all/tbx', requireProjectAdmin, async (req, res) => {
  const st = req.pstate;
  const lang = ((req.query.lang || 'en').toString().slice(0, 16)) || 'en';
  const zip = new JSZip();
  for (const [filename, f] of Object.entries(st.files)) {
    const entries = f.order.map((key) => {
      const e = st.edits[filename] && st.edits[filename][key];
      return { id: key, value: e ? e.value : f.baseline[key] };
    });
    zip.file(filename.replace(/\.json$/i, '') + '.tbx', buildTbx(entries, lang));
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  logActivity(st, 'export_tbx_all', req.session.user.username, {});
  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename="${req.projectId}_export_tbx.zip"`);
  res.send(buf);
});

router.get('/api/export/:filename/tbx', requireProjectAdmin, (req, res) => {
  const { filename } = req.params;
  const st = req.pstate;
  const f = st.files[filename];
  if (!f) return res.status(404).json({ error: 'unknown file' });
  const lang = ((req.query.lang || 'en').toString().slice(0, 16)) || 'en';
  const entries = f.order.map((key) => {
    const e = st.edits[filename] && st.edits[filename][key];
    return { id: key, value: e ? e.value : f.baseline[key] };
  });
  const xml = buildTbx(entries, lang);
  logActivity(st, 'export_tbx', req.session.user.username, { filename });
  const outName = filename.replace(/\.json$/i, '').replace(/"/g, '') + '.tbx';
  res.set('Content-Type', 'application/xml');
  res.set('Content-Disposition', `attachment; filename="${outName}"`);
  res.send(xml);
});

router.get('/api/export/:filename', requireProjectAdmin, (req, res) => {
  const { filename } = req.params;
  const st = req.pstate;
  const f = st.files[filename];
  if (!f) return res.status(404).json({ error: 'unknown file' });
  const out = {};
  for (const key of f.order) {
    const e = st.edits[filename] && st.edits[filename][key];
    out[key] = e ? e.value : f.baseline[key];
  }
  logActivity(st, 'export_file', req.session.user.username, { filename });
  res.set('Content-Type', 'application/json');
  res.set('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  res.send(JSON.stringify(out, null, 4));
});

/* ---- site admin: cross-project user/role overview ---- */

router.get('/api/admin/users', requireSiteAdmin, (req, res) => {
  const list = Object.entries(storage.users).map(([username, u]) => ({
    username, isAdmin: !!u.isAdmin, avatar: u.avatar || null, createdAt: u.createdAt, projects: u.projects || {},
  })).sort((a, b) => a.username.localeCompare(b.username));
  const projects = Object.entries(storage.projectsMeta).map(([id, m]) => ({ id, name: m.name }));
  res.json({ users: list, projects });
});

router.post('/api/admin/users/role', requireSiteAdmin, requireCsrf, (req, res) => {
  const { username, projectId, role } = req.body || {};
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  if (!storage.projectsMeta[projectId]) return res.status(404).json({ error: 'unknown project' });
  if (role && !ROLE_RANK[role]) return res.status(400).json({ error: 'role must be translator, reviewer, or admin' });
  if (!u.projects) u.projects = {};
  if (role) u.projects[projectId] = role; else delete u.projects[projectId];
  storage.saveUsers();
  res.json({ ok: true });
});

// Admin-initiated password reset: generates a temp password, flags the
// account so the frontend can prompt a change on next login, and kicks the
// user out of any sessions they currently hold.
router.post('/api/admin/users/reset-password', requireSiteAdmin, requireCsrf, async (req, res) => {
  const { username } = req.body || {};
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  const tempPassword = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
  u.passwordHash = await bcrypt.hash(tempPassword, 10);
  u.mustChangePassword = true;
  u.sessionVersion = (u.sessionVersion || 0) + 1;
  storage.saveUsers();
  res.json({ ok: true, tempPassword });
});

router.post('/api/admin/users/disable', requireSiteAdmin, requireCsrf, (req, res) => {
  const { username, disabled } = req.body || {};
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  u.disabled = !!disabled;
  if (u.disabled) u.sessionVersion = (u.sessionVersion || 0) + 1;
  storage.saveUsers();
  res.json({ ok: true, disabled: u.disabled });
});

router.post('/api/admin/users/logout-everywhere', requireSiteAdmin, requireCsrf, (req, res) => {
  const { username } = req.body || {};
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  u.sessionVersion = (u.sessionVersion || 0) + 1;
  storage.saveUsers();
  res.json({ ok: true });
});

module.exports = router;
