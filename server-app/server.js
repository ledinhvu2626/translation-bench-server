// server.js — multi-project translation hub. Thin bootstrap: wires up
// middleware and mounts the route modules under routes/. Shared state and
// helpers live under lib/ (see lib/storage.js for the in-memory "database").
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const { PORT, AVATARS_DIR, APP_VERSION } = require('./lib/constants');
const { SESSION_SECRET } = require('./lib/auth-middleware');
require('./lib/storage'); // boots (loads users/projects/state) as a side effect of require
const { scheduleBackups } = require('./lib/backup');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 30 },
}));

app.use(require('./routes/auth'));
app.use(require('./routes/projects'));
app.use(require('./routes/edits'));
app.use(require('./routes/comments'));
app.use(require('./routes/reference'));
app.use(require('./routes/admin'));

app.use('/avatars', express.static(AVATARS_DIR, { maxAge: '30d' }));
// index:false — index.html is served by the catch-all below (with the
// version injected server-side) instead of being handed out as-is here.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const INDEX_HTML_PATH = path.join(__dirname, 'public', 'index.html');
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Client-side router (project/tab deep links like /p/:projectId/:tab) needs
// index.html served for any non-API GET so refresh/direct-navigation works.
// The version placeholders get filled in here — server-rendered once per
// request, so the browser never has to fetch it separately or risk showing
// a stale/placeholder value if its cached JS is out of date.
app.get(/^\/(?!api\/).*/, (req, res) => {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8')
    .replace('<span id="appVersionAuth">&hellip;</span>', `<span id="appVersionAuth">${escapeHtml(APP_VERSION)}</span>`)
    .replace('<span id="appVersionMasthead">&hellip;</span>', `<span id="appVersionMasthead">${escapeHtml(APP_VERSION)}</span>`);
  res.set('Content-Type', 'text/html; charset=UTF-8');
  res.send(html);
});

app.listen(PORT, () => {
  const { projectsMeta } = require('./lib/storage');
  console.log(`Translation Bench running on port ${PORT} — ${Object.keys(projectsMeta).length} project(s) loaded`);
});
scheduleBackups();
