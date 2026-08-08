---
target: public/index.html
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-05T02-43-26Z
slug: public-index-html
---
Method: dual-agent (A: design-review agent · B: detector + browser-evidence agent), re-critique after the polish/layout fixes

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sync dot/toasts/autosave all present; a locked textarea gives zero feedback on click (disabled elements don't fire click) |
| 2 | Match System / Real World | 3 | Domain language (lock, suggest, TM, glossary miss) fits the translator audience |
| 3 | User Control and Freedom | 2 | No Escape closes any menu/modal anywhere; no click-outside wired for the two modals either |
| 4 | Consistency and Standards | 2 | Token contract still violated on 6+ warn badges plus a new accent/teal mismatch on `.zen-progress-pct`; destructive actions bypass the app's own modal for native `confirm()` |
| 5 | Error Prevention | 3 | File-locking prevents collisions; overwrite-warn badge warns before clobbering someone's work |
| 6 | Recognition Rather Than Recall | 3 | Status badges are persistent; but lock/overwrite/QA detail is hover-only `title`, invisible to keyboard/touch |
| 7 | Flexibility and Efficiency | 3 | Zen mode, Ctrl+Enter, arrow-key paging serve power users; row-menu has no keyboard path and no shortcut legend |
| 8 | Aesthetic and Minimalist Design | 3 | Night Watch Terminal identity reads clearly and consistently even where color tokens slipped |
| 9 | Error Recovery | 3 | Toasts are specific; native `confirm()` + no undo means a mis-click on delete is unrecoverable |
| 10 | Help and Documentation | 1 | Zero onboarding, zero shortcut legend, zero ARIA |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** The token infrastructure now exists (`--ok-rgb`, `--warn-rgb`, `--err-rgb`, `--edited-rgb`, `--warn-dim`) and is correctly consumed by the four badge classes named in the original critique, `.modal-card`, `.diff-text`, and `.dtag.chg` — all independently verified via computed-style inspection in a live browser, not just source reading. That part is real.

But the rollout stopped roughly halfway. Six more warn/amber elements (`.badge.qa`, `.badge.suggest-lock`, `.badge.overwrite-warn`, `.pc-badge.role-pending`, `.team-row.is-pending`, `.report-row`) still hardcode the literal `rgba(245,177,77,...)` instead of the `--warn-rgb` token that now sits in the same file. No `--accent-rgb` token was ever added, so `.badge.glossary` and `.orig mark.glossary-hit` — both accent-colored as a state meaning — have no token to point at even if someone tried. And a genuine *new* mismatch was found: `.zen-progress-pct` sets teal text/border (`--ok`/`--ok-dim`) but an accent-blue background (`rgba(77,124,255,0.1)`) — the exact "badge border/background/text must agree" violation the original review was built around, in a spot the fix pass never audited.

**Why the detector didn't catch the leftover badges:** all six still-literal warn/accent values happen to exactly match their token's real RGB — `rgba(245,177,77,x)` *is* `--warn`, `rgba(77,124,255,x)` *is* `--accent`. The mechanical scanner only flags colors that don't match any documented hex; it can't see "correct value, wrong expression" (hardcoded instead of `var()`), so this class of drift is invisible to it by construction. That's exactly why both a detector pass and an independent design read are still necessary — they catch different failure modes, and this round proved it.

**Deterministic scan:** 62 findings (down from 69): 10 color (down from 17 — the 7 fixed lines dropped off), 20 radius (unchanged), 32 font-size (unchanged). Cross-checked against DESIGN.md, at least 8 of the 62 are false positives (4 color: the documented overlay shadow value and the documented `#fff2e0` button-primary text; at least 4 radius: badge-family elements matching DESIGN.md's separately-documented `2px` badge radius) — adjusted genuine count is closer to **54**. Layout-scope scan: clean, 0 findings.

**Live overlay:** 24 anti-pattern findings on injection, several independently re-confirmed as scoped to the pre-rendered-but-hidden DOM (7 flagged text nodes checked directly, all had `offsetParent: null`) rather than the visible login screen — same scoping caveat as the first critique round, now directly verified rather than inferred.

**Verified-correct via live computed styles (not just source):** `.badge.approved/.lock/.mismatch/.edited` all resolve to exactly their documented color/border/background triads; `.dtag.chg` border resolves to the new `warn-dim` (not the old wrong `accent-dim`); both filter selects have real, styled `<optgroup>`s (3 each); `.modal-card` resolves to 6px radius + the documented overlay shadow. These are confirmed fixes, not claims.

## Overall Impression

Real progress — 25→26/40, 69→62 raw findings (54 adjusted), and every fix from the prior session that was checked directly in a live browser held up. But the color-token fix was applied by pattern-matching the four classes named in the original report rather than by auditing every warn/accent usage in the file, so it's already produced a "six-fixed, six-missed" split plus one brand-new instance of the exact bug it was meant to eliminate (`.zen-progress-pct`). The system's structural gaps — zero ARIA anywhere, no Escape-to-close on any overlay, destructive actions dropping into native `confirm()` instead of the app's own modal — are unchanged from the first pass; none of them were in scope for the fixes applied so far.

## What's Working

1. Row-menu and Zen-toolrow regrouping is real and functional, not cosmetic — verified in the actual JS build order with a genuine divider element, both groups at 2-3 items.
2. `<optgroup>` grouping on both filter selects is functional and visibly styled (confirmed 3 groups each, with dark-theme optgroup/option colors, not default browser styling).
3. Shadow discipline is airtight system-wide — every `box-shadow` in the file (4 total) sits on a floating overlay, none in normal document flow, and `.modal-card`'s fix specifically is verified correct.

## Priority Issues

**[P1] The color-token fix covers roughly half of what it needed to**
Why it matters: `.badge.qa`, `.badge.suggest-lock`, `.badge.overwrite-warn`, `.pc-badge.role-pending`, `.team-row.is-pending`, `.report-row` still hardcode `rgba(245,177,77,...)` instead of `rgba(var(--warn-rgb),...)`, and no `--accent-rgb` token exists for `.badge.glossary`/`mark.glossary-hit`. A future re-tune of warn or accent silently orphans these elements — the fix protects only the four classes explicitly named in the original report, not the pattern itself.
Fix: sweep every literal `rgba(245,177,77,` and `rgba(77,124,255,` in the stylesheet, convert to the RGB-tuple form, and add `--accent-rgb:77,124,255`.
Suggested command: /impeccable polish

**[P1] `.zen-progress-pct` has a live border/text/background mismatch**
Why it matters: teal text/border (`--ok`/`--ok-dim`) with an accent-blue background (`rgba(77,124,255,0.1)`) — the exact badge-contract violation the original review was built around, newly discovered because the prior fix pass audited only the elements the critique had named, not the whole file.
Fix: change background to `rgba(var(--ok-rgb),0.1)`.
Suggested command: /impeccable polish

**[P1] Destructive actions drop out of the app's own chrome into native `confirm()`**
Why it matters: sign-out, delete-comment, bulk file upload affecting the whole team, and delete-glossary-term all use the browser's unstyled `confirm()` instead of the `.modal-card` component already built and used elsewhere in the app. These are exactly the moments a self-hosted community tool most needs to reassure a volunteer that an irreversible action is understood — and it's a jarring tonal break against an otherwise disciplined visual system.
Fix: route these four actions through `.modal-card` with the specific consequence spelled out in copy.
Suggested command: /impeccable harden

**[P1] Zero ARIA and no Escape-to-close, confirmed still true**
Why it matters: no `aria-*`, `role`, or `tabindex` exists anywhere in the file; the only keydown handler covers arrow-key pagination. Every dropdown and both modals are mouse-only to dismiss. For a dense power-user editor with a persistent-focus population of reviewers doing long sessions, this isn't an edge case.
Fix: a global Escape handler that closes whatever overlay is open, plus `role="menu"`/`aria-expanded` on the row-menu and profile-menu triggers.
Suggested command: /impeccable harden

**[P2] Locked-string click still gives no active feedback**
Why it matters: unchanged from the original critique — `ta.disabled = locked` means a click on a locked field fires nothing at all, no toast, no cue beyond a border color and a hover-only tooltip. This is the first-contact moment for the product's core "collision-prone collaborative editing" premise.
Fix: wrap the disabled field in a click listener that toasts the same "locked by X" copy already computed for the tooltip.
Suggested command: /impeccable clarify

## Persona Red Flags

**Sam (Accessibility):** Zero ARIA anywhere, no Escape-to-close, and lock/overwrite/QA explanations are hover-only tooltips — a keyboard-only or screen-reader user cannot discover why a field is disabled or close a stuck dropdown without a mouse.

**Riley (Stress-Tester):** Would find the `.zen-progress-pct` color mismatch and the six still-literal warn badges within minutes of opening devtools — exactly the kind of visible inconsistency a stress-tester is primed to catch, and it directly undercuts the "we fixed the token system" claim.

**Jordan (First-Timer):** The native `confirm()` popups on sign-out/delete will read as unfinished the first time they appear, clashing with the otherwise-polished custom chrome everywhere else in an app labeled "Alpha" that otherwise looks more finished than that.

## Minor Observations

- `.badge.glossary`'s CSS has no corresponding JS instantiation found anywhere in the file — likely dead CSS, or glossary-miss issues render through `.badge.qa` instead and this rule is vestigial.
- The `@media (max-width:760px)` rule flattens both `.status-col` and `.status-group` back to `flex-direction:row`, which un-does the two-group separation on narrow viewports — the grouping fix doesn't survive the documented mobile reflow breakpoint.
- Stray radius values beyond the documented 3px/6px/2px(badge) scale remain: 4px (dropdown-menu items, team-row, report-row), 5px, 8px, 12px — unchanged from the first critique, never in scope for either fix pass.

## Questions to Consider

- If the warn-rgb token exists specifically to prevent off-palette drift, was the fix done by searching for "the four named classes" rather than searching for every `rgba(245,177,77` in the file?
- Was accent deliberately excluded from the RGB-tuple token contract, or simply missed — and if excluded, does DESIGN.md's own "badge border/background/text must agree" rule not apply to the glossary state?
- Given the product's whole premise is protecting people's work from being clobbered in concurrent editing, is a browser-native `confirm()` really sufficient reassurance for an irreversible delete?
