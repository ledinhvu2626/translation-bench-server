// lib/qa.js — QA checks (server-side, real source of truth).
const QA_PLACEHOLDER_RE = /%\d*\$?[sdfoxX]|\{[^{}]*\}|<[^>]*>/g;

function extractPlaceholders(s) {
  return (String(s || '').match(QA_PLACEHOLDER_RE) || []).slice().sort();
}

function computeQaIssues(baseVal, curVal) {
  const issues = [];
  if (typeof baseVal !== 'string' || typeof curVal !== 'string') return issues;

  const baseTokens = extractPlaceholders(baseVal);
  const curTokens = extractPlaceholders(curVal);
  if (baseTokens.length !== curTokens.length || baseTokens.some((t, i) => t !== curTokens[i])) {
    issues.push({ code: 'mismatch', label: 'placeholder/tag mismatch' });
  }

  if (baseVal.trim() && curVal.trim()) {
    const ratio = curVal.length / baseVal.length;
    if (ratio > 3) issues.push({ code: 'length', label: 'much longer than source' });
    else if (ratio < 0.25) issues.push({ code: 'length', label: 'much shorter than source' });
  }

  return issues;
}

module.exports = { extractPlaceholders, computeQaIssues };
