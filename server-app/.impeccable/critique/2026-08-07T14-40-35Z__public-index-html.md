---
target: public/index.html
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-07T14-40-35Z
slug: public-index-html
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector+browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sync dot + lock/conflict toasts work; single-slot toast drops overlapping messages |
| 2 | Match System / Real World | 3 | Domain terms (TM, QA, glossary) explained in-app for volunteer translators, not devs |
| 3 | User Control and Freedom | 3 | Cancel request + Esc-to-close modals exist; no visible undo for QA bulk approve/ignore |
| 4 | Consistency and Standards | 3 | Signature panel pattern is genuinely identical across 4 data types; docked for focus-state gaps |
| 5 | Error Prevention | 4 | Upload-preview modal diffs shared source files before letting an admin overwrite them |
| 6 | Recognition Rather Than Recall | 3 | Badges/status externalize state; active filters are visible |
| 7 | Flexibility and Efficiency | 3 | Zen mode, shortcuts, TM search, bulk QA actions; no saved filter presets |
| 8 | Aesthetic and Minimalist Design | 3 | Editor toolbar stacks ~9 control clusters in one row |
| 9 | Error Recovery | 4 | Named, specific error copy ("locked by {user}", "Conflict: refresh to review") |
| 10 | Help and Documentation | 4 | Real in-app Help modal with glossary + shortcuts, appropriately not n/a'd for this dense tool |
| **Total** | | **33/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: This is authored, not templated. "Night Watch Terminal" shows up concretely in code — Plex Mono reserved for badges/tabs/metadata, Spectral italic confined to auth headline and empty-state glyphs, the state-color vocabulary (edited/warn/err/ok + accent) applied with real discipline. Domain vocabulary (TM, QA issue, glossary miss, lock vs. suggest vs. approve) is explained in a Help modal aimed at volunteer translators, not developers. One real gap: DESIGN.md names the masthead subtitle's gradient sweep as the system's entire motion budget, but `.subtitle`/`@keyframes subtitleGlow` in `app.css:72-89` have no matching node in the shipped `index.html`.

**Deterministic scan**: `detect.mjs` on `index.html` alone found nothing. Scanning `public/` surfaced 103 findings in `app.css`: 39 design-system-font-size, 31 design-system-radius, 30 design-system-color (advisory), plus 3 warnings — side-tab border (`app.css:880`), gradient-text (`app.css:77`), layout-transition on max-width/margin-left (`app.css:53`). Live browser injection found 54 anti-patterns independently, including ~30 undersized-ui-text instances (9-10.5px labels), a low-contrast finding at exactly the DESIGN.md accent pairing (`#fff2e0` on `#4d7cff`, 3.4:1 vs 4.5:1 needed), and a skipped-heading (h1 to h3, no h2).

**Visual overlays**: injection succeeded; console reported 54 anti-patterns, largest clusters undersized text and thin-border/wide-shadow combos. No overlay left running; critique dev server and tab were closed after evidence gathering.

## Overall Impression

A genuinely specific, disciplined design system that mostly delivers on its own brief — the signature panel mechanic and the upload-diff guardrail are real craft. But the build has drifted from its own doc: the system's one motion cue never shipped, and its own primary-button color pairing fails contrast. Keyboard focus is nearly invisible system-wide, the single biggest usability gap for non-mouse users.

## What's Working

1. The signature comment/suggestion/TM/history panel mechanic — identical structure across four data types, what makes the system read as systematic rather than bolted-on.
2. `#uploadPreviewModal`'s diff-before-replace pattern — real error prevention on the highest-stakes shared action (admin overwriting everyone's source files).
3. Plain-language error copy: "This file is locked by {user} right now," "Conflict: another editor saved this key first. Refresh to review."

## Priority Issues

**[P0] Keyboard focus is nearly invisible across the app**
- Why it matters: `app.css` strips default focus outlines on nearly every input/button/tab/row; most interactive classes define no focus style at all, only hover. A keyboard-only or screen-reader user cannot see where they are.
- Fix: system-wide `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` applied to every interactive class.
- Suggested command: /impeccable audit, then /impeccable polish

**[P1] Primary button text fails contrast against DESIGN.md's own accent color**
- Why it matters: detector confirmed `#fff2e0` on `#4d7cff` at 3.4:1, below WCAG AA 4.5:1 floor — the primary CTA pairing DESIGN.md specifies.
- Fix: darken accent fill or adjust button text token to clear 4.5:1.
- Suggested command: /impeccable audit

**[P1] DESIGN.md's signature "alive" cue was never shipped**
- Why it matters: masthead subtitle gradient-sweep is dead CSS, no matching node in index.html. DESIGN.md calls this the system's entire motion budget.
- Fix: either add the missing `.subtitle` element, or update DESIGN.md to drop the claim.
- Suggested command: /impeccable document or /impeccable animate

**[P1] ~30 instances of sub-11px functional text**
- Why it matters: column headers, form labels, filter labels (9-10.5px) sit below a legible floor, confirmed across every view.
- Fix: raise the label tier's floor size in app.css, or tighten CSS to match DESIGN.md's stated 10-13px band.
- Suggested command: /impeccable typeset

**[P2] Project-picker text-truncation bug (reproduced live, both assessments confirmed)**
- Why it matters: `.pc-name` clips when badge state changes width; also two picker entries both named "Project Zomboid" with no distinguishing metadata.
- Fix: reflow truncation logic on badge state change; add disambiguating identifier to project cards.
- Suggested command: /impeccable layout

## Persona Red Flags

**Sam (Accessibility/keyboard-only)**: P0 focus-visibility gap is the biggest failure. "Request to join -> Cancel request" state change fires no aria-live announcement; toast has no role="status" and overwrites innerHTML rather than queuing.

**Alex (Power user)**: Zen mode/shortcuts/bulk QA serve them well, but 6 of 10 editor filter states live two clicks deep in "More" with no pinning or keyboard-jump.

**Riley (Stress tester)**: Two identically-named, identically-badged "Project Zomboid" picker entries with no distinguishing metadata — confirmed independently by both assessments.

## Minor Observations

- Single-slot toast risks dropping a safety-critical message.
- Zen mode intentionally jumps to 15px type, breaking the documented 10-13px band; DESIGN.md doesn't name this exception.
- prefers-reduced-motion respected for badge-bump/pulse but not subtitleGlow (moot until that element ships).
- Sidebar upload hint hard-codes `<br><br>` instead of CSS spacing.
- app.css:880 side-tab border and app.css:53 layout-transition flagged as warnings worth a look.

## Questions to Consider

1. DESIGN.md's "One Accent Rule" says Signal Blue is the only color allowed to mean "interactive/focused" — why does shipped focus-visible styling cover only 2 of dozens of interactive classes?
2. Zen mode is the product's actual emotional thesis — why is it an opt-in icon buried among ten toolbar controls rather than the default?
3. Is the masthead gradient-sweep animation a deliberate cut or something that never got wired up?
