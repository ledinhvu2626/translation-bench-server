// lib/tbx.js — TBX (TermBase eXchange) import/export support, plus the
// upload-safety helper used alongside it.
const path = require('path');

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
function stripTags(s) {
  return decodeXmlEntities(s.replace(/<[^>]+>/g, '')).trim();
}
function parseTbxToObject(xml) {
  const out = {};
  const termEntryRe = /<termEntry\b([^>]*)>([\s\S]*?)<\/termEntry>/gi;
  let m, idx = 0;
  while ((m = termEntryRe.exec(xml))) {
    idx++;
    const attrs = m[1] || '';
    const body = m[2] || '';
    const idMatch = attrs.match(/\bid="([^"]*)"/);
    const key = (idMatch && idMatch[1]) || `term_${idx}`;
    const termMatch = body.match(/<term\b[^>]*>([\s\S]*?)<\/term>/i);
    if (!termMatch) continue;
    const value = stripTags(termMatch[1]);
    if (!value) continue;
    let finalKey = key, n = 1;
    while (Object.prototype.hasOwnProperty.call(out, finalKey)) finalKey = `${key}_${++n}`;
    out[finalKey] = value;
  }
  return out;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function buildTbx(entries, lang) {
  const body = entries.map((e) => (
    `    <termEntry id="${escapeXml(e.id)}">\n` +
    `      <langSet xml:lang="${escapeXml(lang)}">\n` +
    `        <tig>\n          <term>${escapeXml(e.value)}</term>\n        </tig>\n` +
    `      </langSet>\n    </termEntry>`
  )).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<martif type="TBX" xml:lang="${escapeXml(lang)}">\n  <text>\n    <body>\n${body}\n    </body>\n  </text>\n</martif>\n`;
}

// Strip any directory components / traversal sequences from a client-supplied
// filename before it's used to build a path on disk.
function safeBaseName(name) {
  return path.basename(String(name || '').replace(/\\/g, '/'));
}

module.exports = { decodeXmlEntities, stripTags, parseTbxToObject, escapeXml, buildTbx, safeBaseName };
