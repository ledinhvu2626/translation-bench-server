---
target: public/index.html
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-04T22-46-20Z
slug: public-index-html
---
Method: dual-agent (A: design-review agent · B: detector + browser-evidence agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Saves are silent on success; Export ZIP is a bare `location.href` navigate with zero confirmation |
| 2 | Match System / Real World | 4 | Copy speaks the community's own voice; QA labels are plain-language |
| 3 | User Control and Freedom | 2 | No Escape-to-close on any modal/dropdown; suggestion "Dismiss" is instant, irreversible, no undo |
| 4 | Consistency and Standards | 3 | Toggle-pill pattern reused well, undercut by state-color drift (below) |
| 5 | Error Prevention | 2 | No confirm before destructive suggestion-dismiss; upload confirm is generic, no diff preview |
| 6 | Recognition Rather Than Recall | 2 | Row's `⋯` menu hides 6 actions behind an icon with only a `title` tooltip |
| 7 | Flexibility and Efficiency | 2 | Real accelerators exist (Ctrl+Enter, Zen mode) but undiscoverable — no shortcut legend, no bulk actions |
| 8 | Aesthetic and Minimalist Design | 3 | Density mostly controlled; `.status-col` can stack up to 8 simultaneous badges per row |
| 9 | Error Recovery | 3 | Toasts are specific and actionable, but errors are transient with no persistent in-row error marker |
| 10 | Help and Documentation | 1 | Zero onboarding, no icon glossary, no help entry point anywhere |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** The macro identity genuinely lands — near-black base, one sparing accent, mono-for-metadata/sans-for-content discipline, the serif-is-rare rule (5 uses in ~4,000 lines, zero leaks into badges or data rows), and shadow-only-on-overlays (exactly 3 `box-shadow` declarations, all matching the documented value) are all held with real rigor. But the tinted-background layer of the state-color system quietly reverts to an off-brand palette: rose-state elements tint with rust `rgba(201,106,85,…)`, teal-state elements tint with sage `rgba(127,174,111,…)`, and edited-state elements tint with dusty cyan `rgba(94,147,163,…)` — none derive from the actual CSS variables. `.badge.lock` disagrees with itself on three axes (amber text, blue border, a fourth off-palette mustard background). Reads like a pre-"Night Watch" earthy palette swapped at the token level but never migrated in components that still hardcode literal rgba tints.

**Deterministic scan:** 69 findings, all advisory/quality: 17 color, 20 radius, 32 font-size, all in public/index.html cross-referenced against DESIGN.md's token frontmatter. Independently, the live browser overlay (detect.js injected into the running app) found 22 additional anti-patterns: radial-spotlight-glow, multiple undersized-ui-text (below 11px floor), all-caps-body, clipped-overflow-container, gpt-thin-border-wide-shadow (x2), tiny-text (x4), ai-color-palette ("cyan neon text on dark background", x2 — likely the same dusty-cyan edited-state tint flagged independently by the design review).

**Where they agree, strongly:** Both assessments converged on the exact same lines without seeing each other's output — L308/315/320/321/452/453/653/654 (off-palette rgba tints) and L99/139/191/560/779 (undocumented recurring 4px radius) were flagged by both the mechanical scanner and the design-director read.

**False positives in the raw 69:** #fff2e0 (L155, 282) and the shadow rgba (L95, 131, 554) are documented in DESIGN.md's components block/prose, just not in the top-level colors map the checker diffs against. Badge 2px radius (12 occurrences) matches DESIGN.md's prose but not its rounded token scale — a doc gap, not a code bug. Real drift count is closer to ~50, not 69.

**Scoping caveat on the live overlay:** the app pre-renders all views into the DOM and toggles visibility via CSS rather than conditional mounting, so some of the 22 live findings are against off-screen markup, not strictly the visible login screen. No unauthorized access occurred — Assessment B never logged in.

## Overall Impression

This is a system that got the hard part right (a genuinely distinctive, disciplined dark-console identity, not a generic dark-mode-SaaS reskin) and lost the easy part: a layer of hardcoded, off-palette color values that quietly contradict the very token system the rest of the file respects. The bigger structural risk isn't visual — six unsegmented actions sit behind one icon at the single most-repeated interaction point in the app, and there's zero onboarding for a tool with real workflow complexity.

## What's Working

1. The inline-panel pattern (comments/suggestions/history/TM) shares one exact visual grammar across four different data types.
2. Row-level state-color semantics are correct where it counts — amber-vs-rose split between "QA flag" and "mismatch" gives an instant, correct severity read.
3. The serif-is-rare rule has zero violations across the whole file.

## Priority Issues

**[P1] Hardcoded off-palette RGBA state tints contradict their own border/text color**
Why it matters: DESIGN.md's own top rule is that a badge's border and background must agree on one state color. Rust/sage/dusty-cyan tints and a self-contradicting `.badge.lock` are direct, confirmed violations — detector and design review independently flagged the same lines.
Fix: Replace hardcoded state-tint rgba with values derived from the matching CSS variable (or precompute `--err-10`/`--ok-10`/`--edited-10`/`--warn-10`), fix `.badge.lock`'s border to `var(--warn)`.
Suggested command: /impeccable polish

**[P1] Row-menu and Zen toolrow put 5-6 unsegmented actions at one decision point**
Why it matters: Clearest cognitive-load failure, at the most-repeated interaction in the app. Zen mode's toolrow re-exposes nearly the same action set as table mode.
Fix: Split row-menu into two visual groups (collaborate vs. review), or drop "save" since autosave covers it.
Suggested command: /impeccable layout

**[P2] Modal-card radius and shadow don't match DESIGN.md's own card spec**
Why it matters: `.modal-card` uses the 3px control radius instead of documented 6px, and has zero box-shadow despite DESIGN.md naming the modal overlay as sharing the one overlay shadow.
Fix: `border-radius:6px` + `box-shadow:0 8px 24px rgba(0,0,0,0.35)` on `.modal-card`.
Suggested command: /impeccable polish

**[P2] No Escape-to-close on any modal or dropdown**
Why it matters: Zero Escape handlers anywhere in the script; every overlay is mouse-dismiss-only, a real gap for the keyboard-heavy power-user persona this tool is built for.
Fix: One delegated keydown listener that closes whichever overlay is open.
Suggested command: /impeccable harden

**[P3] Locked-string interaction gives no active feedback on first contact**
Why it matters: A disabled textarea communicates "why" only via hover tooltip and a small badge; nothing fires on click. Exact first-contact valley moment for a new translator.
Fix: Wrap row/zen-target in a click handler that toasts the same "locked by X" copy already computed for the tooltip.
Suggested command: /impeccable clarify

## Persona Red Flags

**Alex (Power User):** Every secondary action behind a 2-click menu with no keyboard equivalent. No bulk actions anywhere. Zen mode's Ctrl+Enter accelerator has zero discovery path.

**Sam (Accessibility):** Zero ARIA/role attributes anywhere. Focus state is a subtle border-color shift between two dark desaturated blues with outline:none, no secondary cue. No Escape support forces mouse-only dismissal.

**Jordan (First-Timer):** Auth screen is clean and low-friction. But post-login, the row-menu's icon set has zero onboarding or glossary. The first likely dead-end (locked string, no feedback) erodes trust early.

## Minor Observations

- `.zen-block-label .zen-key` and `.glossary-row .gterm` use mono for arguably-a-term rather than pure metadata.
- No RTL/dir handling, but the community's evident working language (Vietnamese) makes this a non-issue for the real audience.
- Long-string handling is applied consistently across every text surface.
- `runQaChecks`'s length-ratio heuristic is a quiet, genuinely useful piece of translator aid.

## Questions to Consider

- Was there ever a lint pass for hardcoded rgba() state tints, or did this ship because nobody diffed pixel values against the token sheet?
- Zen mode still exposes 5 of 6 row-actions as a persistent toolrow — is it actually "one thing at a time," or the same IA at a bigger font?
- A single row can carry 5 independent badge states simultaneously — would a unified "needs attention" indicator serve reviewers better than five badges to cross-reference?
