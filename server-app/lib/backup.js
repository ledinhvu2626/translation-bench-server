// lib/backup.js — periodic full snapshot of data/ (JSON "database" + avatars)
// into timestamped zips under data/backups/, with rolling retention.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { DATA_DIR, BACKUPS_DIR, BACKUP_INTERVAL_MS, BACKUP_RETENTION } = require('./constants');

function timestampForFilename(d = new Date()) {
  return d.toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
}

// Recursively adds everything under dir into the zip, skipping the backups
// folder itself so snapshots don't nest inside later snapshots.
function addDirToZip(zip, dir, base) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.join(base, name).replace(/\\/g, '/');
    if (full === BACKUPS_DIR) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      addDirToZip(zip, full, rel);
    } else {
      zip.file(rel, fs.readFileSync(full));
    }
  }
}

async function runBackup() {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const zip = new JSZip();
  addDirToZip(zip, DATA_DIR, '');
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = path.join(BACKUPS_DIR, `backup-${timestampForFilename()}.zip`);
  const tmpPath = `${outPath}.tmp`;
  fs.writeFileSync(tmpPath, buf);
  fs.renameSync(tmpPath, outPath);
  pruneOldBackups();
  return outPath;
}

function pruneOldBackups() {
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter((f) => /^backup-.*\.zip$/.test(f))
    .sort(); // timestamped names sort chronologically
  const excess = files.length - BACKUP_RETENTION;
  for (let i = 0; i < excess; i++) {
    fs.unlinkSync(path.join(BACKUPS_DIR, files[i]));
  }
}

// Runs an initial backup shortly after boot, then every BACKUP_INTERVAL_MS.
function scheduleBackups() {
  const kickoff = setTimeout(() => {
    runBackup().catch((e) => console.error('Backup failed:', e));
  }, 60 * 1000);
  kickoff.unref();
  const timer = setInterval(() => {
    runBackup().catch((e) => console.error('Backup failed:', e));
  }, BACKUP_INTERVAL_MS);
  timer.unref();
  return timer;
}

module.exports = { runBackup, pruneOldBackups, scheduleBackups };
