---
name: Seeders Translation Tools
description: A precise, unshowy dark-mode control room for reviewing and approving community game-localization edits.
colors:
  ink: "#f4f7ff"
  ink-dim: "#aab8d1"
  ink-faint: "#7f8fa8"
  bg: "#07111f"
  bg-raised: "#0d1729"
  bg-panel: "#111c2f"
  bg-well: "#0a1222"
  line: "#22344f"
  line-soft: "#172642"
  accent: "#4d7cff"
  accent-dim: "#2552c7"
  ok: "#2fd4c5"
  ok-dim: "#1a6f6a"
  warn: "#f5b14d"
  warn-dim: "#6e5023"
  err: "#ff6f7f"
  err-dim: "#6c3340"
  edited: "#77a8ff"
  edited-dim: "#2f477d"
  on-accent: "#fff2e0"
typography:
  display:
    fontFamily: "'Spectral', Georgia, serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.2px"
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.4px"
  body:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  micro: "2px"
  sm: "3px"
  compact: "4px"
  md: "6px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent-dim}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent-dim}"
    note: "fill stays flat; hover signals via border color + glow shadow + lift, not a background change — kept off the light full-strength accent so on-accent text stays WCAG AA (accent-dim clears 6:1, full accent does not)"
  button-ghost:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
  button-ghost-hover:
    textColor: "{colors.accent}"
  input-text:
    backgroundColor: "{colors.bg-well}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
  badge:
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.micro}"
    padding: "2px 6px"
  menu-item:
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.compact}"
    padding: "8px 10px"
---

# Design System: Seeders Translation Tools

## Overview

**Creative North Star: "The Night Watch Terminal"**

This is a quiet, focused control room for overnight and volunteer-shift translation work, not a marketing surface. The palette is a near-black ink-blue (`#07111f`) lit only by a cold electric-blue accent, so the whole interface reads as a dim console you sit at during a long editing session rather than a page you visit. Precision comes first: sharp, small corners throughout (a four-tier radius scale, 2 to 6px, each tier tied to what it marks), dense monospace labels on every badge and tab, and color reserved strictly as a state signal (edited, locked, flagged, approved) rather than decoration. The one indulgence is an italic serif reserved for a handful of headings and empty-state glyphs — a scholarly, editorial voice breaking through the otherwise technical surface, present exactly where the product is naming itself or an absence, and nowhere else.

The system is precise and unshowy by intent: information density and legibility at speed outrank visual flourish. Nothing decorative is present without a job — the only animated element in the whole system is a slow gradient sweep on the header subtitle, and it exists to say "this is alive," not to entertain.

**Key Characteristics:**
- Near-black ink-blue surfaces with a single cold-blue accent, used sparingly
- Monospace (IBM Plex Mono) for all labels, tabs, badges, and metadata; sans (IBM Plex Sans) for body copy and inputs; italic serif (Spectral) reserved for display headings only
- Sharp, consistent 3px radius on nearly every interactive control
- Color is a state signal (edited / locked / flagged / approved / error), never a mood choice
- Flat by default; shadow appears only on floating overlays (menus, modals, dropdowns)

## Colors

A near-monochrome ink-blue base carries the whole system; color only enters to mark state, not to decorate.

### Primary
- **Signal Blue** (`#4d7cff`): the one accent. Active tabs, active states, primary links, focus borders, the project-switcher chevron. Used sparingly — its rarity is what makes "something needs your attention" legible.
- **Signal Blue, Dimmed** (`#2552c7`): primary button fill and accent borders at rest; the full-strength `#4d7cff` is reserved for hover/active so the accent has headroom to brighten on interaction.

### Secondary
- **Confirm Teal** (`#2fd4c5`) / **Confirm Teal, Dimmed** (`#1a6f6a`): approvals, sync-online dot, completion progress bars. Reads as "done, safe, in sync."
- **Alert Amber** (`#f5b14d`) / **Alert Amber, Dimmed** (`#6e5023`): warnings, locks, pending suggestions, stale-sync state, flagged QA issues. Reads as "needs a look, not broken." The dimmed variant borders amber elements at rest, matching the dim-border convention already used by Confirm Teal and Error Rose.
- **Error Rose** (`#ff6f7f`) / **Error Rose, Dimmed** (`#6c3340`): mismatches, destructive actions, unresolved reports. Reads as "broken, blocking."

### Tertiary
- **Edited Sky** (`#77a8ff`) / **Edited Sky, Dimmed** (`#2f477d`): a distinct lighter blue used only to mark "this string has an unsaved or locally-edited change," kept visually separate from Signal Blue so "active/focused" and "edited" never get confused at a glance.

### Neutral
- **Void** (`#07111f`): the base app background.
- **Well** (`#0a1222`): recessed surfaces — text inputs, textareas, the space "below" the panel level.
- **Raised** (`#0d1729`): slightly raised surfaces — buttons at rest, the masthead gradient's dark end.
- **Panel** (`#111c2f`): the most raised surface — sidebars, cards, modals, dropdown menus.
- **Line** (`#22344f`) / **Line, Soft** (`#172642`): borders. `line` divides major regions (masthead, tabs, sidebar); `line-soft` divides rows and minor internal seams.
- **Ink** (`#f4f7ff`): primary text.
- **Ink, Dim** (`#aab8d1`): secondary text, default icon/button color at rest.
- **Ink, Faint** (`#7f8fa8`): tertiary text, placeholders, metadata, timestamps.

### Named Rules
**The One Accent Rule.** Signal Blue is the only color allowed to mean "interactive/focused." Every other color (teal, amber, rose, edited-sky) means a specific translation-workflow state and nothing else. Never repurpose a state color for a generic UI accent.

**The Dim-at-Rest Rule.** Accent and state colors default to their `-dim` variant for fills and borders at rest, and jump to full strength only on hover, active, or focus. This is what gives the flat, dark surface room to visibly react.

## Typography

**Display Font:** Spectral (italic, 500–600 weight), with Georgia/serif fallback
**Body Font:** IBM Plex Sans, with system-ui fallback
**Label/Mono Font:** IBM Plex Mono, with ui-monospace fallback

**Character:** A technical monospace/sans pairing carries nearly the entire interface — legible, dense, unemotional. The italic serif is a deliberate rupture: it appears only where the product speaks in its own voice (the masthead title, the login screen's headline, empty-state glyphs, dropzone headings), never in a data-dense view.

### Hierarchy
- **Display** (600 weight, italic, 22px, line-height 1.2): the masthead `<h1>` and the auth-screen headline. The only large type in the system.
- **Title** (500 weight, italic, 16px): dropzone and empty-state sub-headings — the serif voice at smaller scale.
- **Body** (400 weight, 12.5–13px, line-height 1.5): all input text, textareas, source/target translation text, comment and suggestion bodies.
- **Label** (500 weight, 9.5–11px — 9.5px is the system-wide floor, nothing renders smaller, uppercase where used, letter-spacing 0.4–1.2px, IBM Plex Mono): tab labels, badges, metadata rows, timestamps, section headers (`.file-group-head`, `.dash-header`), status pills.

### Named Rules
**The Serif-Is-Rare Rule.** Spectral italic appears only on headings and empty-state glyphs — never on a button, a badge, or a data row. If a use of the serif isn't naming the product or naming an absence, it's the wrong font.

**The Mono-Is-Metadata Rule.** IBM Plex Mono marks anything that is a label, a state, a timestamp, or a piece of machine-adjacent data (a key path, a diff tag, a file name). Prose that a human wrote — comments, translation text, glossary notes — stays in the sans body font even inside the same panel.

## Layout

The shell is a fixed-height flex column: a slim masthead, a tab bar, then a flex-1 view area that fills the remaining viewport (`min-height:600px` floor). Inside the editor view, a fixed 250px sidebar sits left of a flex-1 main column — the one persistent split-pane in the system. Every other view (dashboard, activity, glossary, concordance, contributors) is a single scrolling column with a toolbar pinned above a dense list or table-like grid.

Density is high throughout: row padding runs 6–12px, gaps 4–14px, and text sizes stay in the 10–13px band outside the Display tier. Tables lean on CSS grid with fixed pixel columns for metadata (timestamps, filenames, scores) and a `1fr` column for the variable content (source text, translated text, log detail). Below 760px the editor's sidebar collapses to a horizontal strip above the content and the translation row's grid drops to a single column — a content reflow, not a redesign.

## Elevation & Depth

Hybrid: the base UI is flat — panels are distinguished purely by the neutral tonal ramp (void → well → raised → panel), not by shadow. Shadow is reserved as a structural signal that something is floating above the document flow: dropdown menus (`.tabs-more-menu`, `.profile-menu`, `.row-menu`) and the modal overlay all share one shadow, `var(--shadow-overlay)`. Nothing at rest in the main layout casts a shadow.

### Shadow Vocabulary
- **Overlay** (`--shadow-overlay: 0 8px 24px rgba(0,0,0,0.35)`): the only shadow in the system. Used exclusively on floating/absolute-positioned overlays (dropdown menus, modal cards) to separate them from the page beneath.

### Named Rules
**The Flat-Until-Floating Rule.** Nothing in the normal document flow gets a shadow. Shadow exists solely to mark "this element is floating above everything else," so its presence is itself an affordance — if you see the shadow, you know you're looking at a dismissible overlay.

## Shapes

Four radii, each tied to what it marks — nothing decorative, nothing arbitrary:
- **Micro** (`--radius-micro`, 2px): badges, status pills, tags/diff-tags, checkboxes, progress-bar tracks, highlight marks — the smallest interactive or informational chip in the system.
- **Control** (`--radius`, 3px): the default — buttons, inputs, tabs-more items, toolbar controls.
- **Compact** (`--radius-compact`, 4px): menu items and dropdown/list rows (`.profile-menu-item`, `.au-row`, `.mention-item`, `.row-menu` items, `.report-row`) — one step up from a control, still reads as "a line in a list," not "a card."
- **Card** (`--radius-md`-equivalent, 6px): modal cards, the auth card, notification cards, zen-mode blocks — just enough to read as "a card" rather than "a control."

Avatars and status dots are fully circular (`border-radius:50%`). Progress-bar tracks (`.progress-bar`, `.dash-bar`, `.zen-progress-bar`, `.contrib-head .cbar`) are the one exception that scales outside this fixed set — each keeps radius at roughly half its own height so it stays a capsule regardless of thickness, rather than pulling a fixed token. There is no soft/rounded aesthetic anywhere in the system; every radius is small and functional, never decorative.

## Components

### Buttons
- **Shape:** 3px radius (`--radius`) everywhere; zen-mode action buttons step up to 6px to match the larger card scale they sit in.
- **Primary** (`.btn.primary`): `background: var(--accent-dim)` (#2552c7), text `var(--on-accent)` (#fff2e0), padding `7px 12px`, IBM Plex Sans 12px. Fill stays flat on hover — border brightens to full `var(--accent)`, a glow shadow and a 1px lift signal interactivity instead. (Full-strength `var(--accent)` never hosts `--on-accent` text: at that lightness the pairing falls to 3.4:1, below the 4.5:1 AA floor, so hover brightens everything except the fill.)
- **Ghost/Default** (`.btn`): `background: var(--bg-raised)`, 1px `var(--line)` border, text `var(--ink-dim)`. Hover: border and text shift to `var(--accent-dim)`/`var(--accent)` — background never changes on hover, only the border/text signal interactivity.
- **Disabled:** `opacity: 0.4`, cursor default. No color change beyond opacity.
- **Toggle pills** (`.comment-toggle`, `.tm-toggle`, `.suggestion-toggle`, etc.): borderless-background mono-label buttons that borrow state colors directly — amber border/text when something is pending, teal when resolved, full accent when active.

### Badges / Status Pills
- **Style:** IBM Plex Mono, 9.5px floor (`--radius-micro` tier, see Shapes), uppercase, 2px radius, 1px border matching the state color, background is that color at ~10% opacity (e.g. `rgba(245,177,77,0.1)` for warn).
- **States:** `untranslated` (neutral outline), `edited` (Edited Sky), `mismatch`/error (Error Rose), `qa` (Alert Amber, `cursor:help`), `glossary` (Signal Blue, `cursor:help`), `approved` (Confirm Teal).

### Cards / Containers (Panels, Modals)
- **Corner Style:** 6px radius.
- **Background:** `var(--bg-panel)`, the most-raised neutral tone.
- **Shadow Strategy:** only when floating (see Elevation & Depth) — a static in-flow card (contributor row, notification card) has no shadow, only a `1px solid var(--line)` border.
- **Internal Padding:** 12–18px depending on density (compact list rows vs. modal cards).

### Inputs / Fields
- **Style:** `background: var(--bg-well)` (the recessed neutral), `1px solid var(--line)`, 3px radius, IBM Plex Sans body text.
- **Focus:** border shifts to `var(--accent-dim)`, no glow/ring — a quiet, single-property state change consistent with the flat-by-default philosophy.
- **Disabled:** `opacity: 0.65`, background stays `var(--bg-well)`; a disabled-but-locked textarea additionally gets a `var(--warn)` border to distinguish "read-only because locked by someone else" from plain disabled.

### Navigation
- **Tabs** (`.tab-btn`): borderless, IBM Plex Mono uppercase 12px, `var(--ink-faint)` at rest, `var(--ink-dim)` on hover, `var(--accent)` with a 2px bottom border when active. Overflow tabs collapse into a `.tabs-more` dropdown that inherits the same active-color logic on its toggle.
- **Sidebar file list:** each row gets a 2px left border, transparent at rest, `var(--accent)` when the file is active, with a subtle `var(--bg-raised)` background wash on hover/active.

### Suggestion / History / TM Panels (Signature Component)
A recurring "inline panel" pattern: suggestions, translation-memory matches, and edit history all render as a `var(--bg-well)` panel nested directly beneath a translation row, bordered in `var(--line-soft)`, with a negative top margin so it visually attaches to the row above it. Each is a vertical list of items separated by `1px solid var(--line-soft)` dividers, IBM Plex Mono metadata line first (author, timestamp) then sans-serif body text. This is the system's core "expand for detail without leaving the row" mechanic — used identically across three different data types, which is what makes it feel systematic rather than bolted on.

### Comment Thread (Signature Component)
Comments render inside the same `var(--bg-well)` inline panel, but the individual item follows an avatar-anchored pattern instead of the mono-metadata-line format above: a `.mini-avatar` sits left of a body column with a bold sans author name + faint mono timestamp on one line, the comment text below, then an action row where every control — reaction counts, Reply, Resolve, Delete, Report — is a plain-weight text link (no border, no fill, underline + accent color only on hover). Replies collapse behind a "View N replies" link by default, indented under the parent's avatar column. The pattern reads as a familiar comment thread without importing any rounded-bubble chrome — action links stay flat and sharp like the rest of the system, they just drop the boxed-button treatment used elsewhere.

## Do's and Don'ts

### Do:
- **Do** keep every state signal (edited, locked, flagged, approved, mismatch) tied to its one fixed color across the whole app — a badge, a border, and a toggle pill for "mismatch" must always agree on Error Rose.
- **Do** default accent and state colors to their `-dim` variant at rest, reserving full-strength color for hover/active/focus.
- **Do** keep the italic Spectral serif confined to headings and empty-state glyphs; everything else is mono or sans.
- **Do** use the four-tier radius scale — 2px micro (badges/tags/marks), 3px control, 4px compact (menu items/dropdown rows), 6px card — and reach for `var(--radius-micro)`/`var(--radius-compact)` instead of a new literal; don't introduce a fifth value without reason.

### Don't:
- **Don't** add a shadow to anything in normal document flow — shadow is reserved to mean "this is a floating overlay."
- **Don't** introduce a new accent hue for a one-off feature; extend meaning from the existing seven-color state vocabulary (accent, ok, warn, err, edited, plus their dim variants) instead.
- **Don't** put prose a human wrote (comments, translation text, glossary notes) in the monospace font — mono is for labels and metadata only, never for content.
- **Don't** round corners past 6px or add soft/large-radius "friendly" shapes; the system's precision comes partly from staying sharp.
- **Don't** put `--on-accent` text on full-strength `var(--accent)` — the pairing fails WCAG AA. It's only safe on `-dim` fills (accent-dim, err-dim); full-strength accent backgrounds pair with `var(--bg)` instead (see `.zen-toggle.active`, `#fileLockBtn.active`).
