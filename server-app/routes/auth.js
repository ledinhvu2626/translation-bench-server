// routes/auth.js — registration/login/session + profile (password, avatar,
// contributions).
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const storage = require('../lib/storage');
const { AVATARS_DIR, APP_VERSION } = require('../lib/constants');
const {
  ADMIN_USERNAMES, USERNAME_RE,
  requireAuth, requireCsrf, requireProjectMember,
  loginRateLimited, recordLoginFailure, clearLoginAttempts,
} = require('../lib/auth-middleware');

const router = express.Router();

// Unauthenticated on purpose — the login screen needs to show a version
// before anyone's signed in.
router.get('/api/version', (req, res) => {
  res.json({ version: APP_VERSION });
});

/* ---- auth endpoints ---- */

router.get('/api/me', requireAuth, (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  const u = storage.users[req.session.user.username];
  res.json({
    username: req.session.user.username,
    isAdmin: !!(u && u.isAdmin),
    avatar: (u && u.avatar) || null,
    csrfToken: req.session.csrfToken,
    mustChangePassword: !!(u && u.mustChangePassword),
  });
});

router.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  const uname = (username || '').trim();
  if (!USERNAME_RE.test(uname)) {
    return res.status(400).json({ error: 'username must be 2-32 chars: letters, numbers, _ . -' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  if (storage.users[uname]) return res.status(409).json({ error: 'username already taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  const isAdmin = ADMIN_USERNAMES.includes(uname);
  storage.users[uname] = { passwordHash, isAdmin, avatar: null, createdAt: Date.now(), projects: {}, sessionVersion: 0 };
  storage.saveUsers();

  req.session.user = { username: uname, sv: 0 };
  req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.json({ username: uname, isAdmin, avatar: null, csrfToken: req.session.csrfToken, mustChangePassword: false });
});

router.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const uname = (username || '').trim();
  const rateLimitKey = `${req.ip}:${uname}`;
  if (loginRateLimited(rateLimitKey)) {
    return res.status(429).json({ error: 'too many login attempts — try again later' });
  }
  const u = storage.users[uname];
  if (!u) { recordLoginFailure(rateLimitKey); return res.status(401).json({ error: 'invalid username or password' }); }
  if (u.disabled) return res.status(403).json({ error: 'account disabled' });
  const ok = await bcrypt.compare(password || '', u.passwordHash);
  if (!ok) { recordLoginFailure(rateLimitKey); return res.status(401).json({ error: 'invalid username or password' }); }
  clearLoginAttempts(rateLimitKey);
  const sv = u.sessionVersion || 0;
  req.session.user = { username: uname, sv };
  req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.json({ username: uname, isAdmin: !!u.isAdmin, avatar: u.avatar || null, csrfToken: req.session.csrfToken, mustChangePassword: !!u.mustChangePassword });
});

router.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.post('/api/profile/password', requireAuth, requireCsrf, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const username = req.session.user.username;
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  const ok = await bcrypt.compare(currentPassword || '', u.passwordHash);
  if (!ok) return res.status(401).json({ error: 'current password is incorrect' });
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'new password must be at least 6 characters' });
  }
  u.passwordHash = await bcrypt.hash(newPassword, 10);
  delete u.mustChangePassword;
  storage.saveUsers();
  res.json({ ok: true });
});

// Invalidate every other session for this account (bumps sessionVersion, then
// re-stamps the current session so the caller stays logged in).
router.post('/api/profile/logout-everywhere', requireAuth, requireCsrf, (req, res) => {
  const username = req.session.user.username;
  const u = storage.users[username];
  if (!u) return res.status(404).json({ error: 'unknown user' });
  u.sessionVersion = (u.sessionVersion || 0) + 1;
  storage.saveUsers();
  req.session.user.sv = u.sessionVersion;
  res.json({ ok: true });
});

/* ---- profile: avatar + contributions (contributions scoped to active project) ---- */

const AVATAR_EXT_FOR_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

function clearAvatarFiles(username) {
  for (const ext of Object.values(AVATAR_EXT_FOR_MIME)) {
    const p = path.join(AVATARS_DIR, `${username}.${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

router.post('/api/profile/avatar', requireAuth, avatarUpload.single('avatar'), requireCsrf, (req, res) => {
  const username = req.session.user.username;
  if (!storage.users[username]) return res.status(404).json({ error: 'unknown user' });
  if (!req.file) return res.status(400).json({ error: 'expected an image file' });
  const ext = AVATAR_EXT_FOR_MIME[req.file.mimetype];
  if (!ext) return res.status(400).json({ error: 'expected a PNG/JPEG/WEBP/GIF image' });
  clearAvatarFiles(username);
  fs.writeFileSync(path.join(AVATARS_DIR, `${username}.${ext}`), req.file.buffer);
  const avatar = `/avatars/${username}.${ext}?v=${Date.now()}`;
  storage.users[username].avatar = avatar;
  storage.saveUsers();
  res.json({ ok: true, avatar });
});

router.delete('/api/profile/avatar', requireAuth, requireCsrf, (req, res) => {
  const username = req.session.user.username;
  if (storage.users[username]) {
    delete storage.users[username].avatar;
    storage.saveUsers();
  }
  clearAvatarFiles(username);
  res.json({ ok: true, avatar: null });
});

router.get('/api/profile/contributions', requireProjectMember, (req, res) => {
  const username = req.session.user.username;
  const st = req.pstate;
  let currentEdits = 0;
  const filesTouched = new Set();
  for (const [filename, keys] of Object.entries(st.edits)) {
    for (const meta of Object.values(keys)) {
      if (meta.editor === username) {
        currentEdits++;
        filesTouched.add(filename);
      }
    }
  }
  let editLogCount = 0, approvalCount = 0;
  for (const entry of st.log) {
    if (entry.editor !== username) continue;
    if (entry.type === 'edit') editLogCount++;
    if (entry.type === 'approve') approvalCount++;
  }
  res.json({ username, projectId: req.projectId, currentEdits, filesTouched: filesTouched.size, editLogCount, approvalCount });
});

module.exports = router;
