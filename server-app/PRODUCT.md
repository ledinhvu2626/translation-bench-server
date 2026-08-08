# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Volunteer translators, reviewers, project admins, and a site admin within the "Seeders" community, collaborating on localization for specific game mod/translation projects (current live projects: Project Zomboid, Cyberpunk 2077). Not built for a general/unknown outside audience — the design should fit this community's real workflow.

## Product Purpose

A self-hosted, collaborative translation editor for sharing and reviewing localization files as a team. It lets contributors register, pick a project, edit translation keys, leave suggestions/comments, flag issues, and have reviewers approve changes, with full history and export to ZIP/TBX when work is ready to ship.

## Positioning

Self-hosted and database-free: all state (users, edits, comments, approvals, history, glossary) is stored as plain JSON files on disk, so it can run for a small team without standing up infrastructure a larger SaaS localization platform (e.g. Crowdin/Weblate-class tools) would require. Traded scalability for operational simplicity and easy backup (plain file copy).

## Operating Context

- Multi-project structure: users request/are granted membership per project; roles are site admin, project admin, project reviewer, project member.
- Core editing loop: view source strings, edit translations, lock keys/files while editing to avoid collisions, submit suggestions, apply suggestions, leave comments with reactions, resolve comments.
- Review loop: reviewers approve translations, resolve flagged reports, manage the glossary.
- Reference tooling: translation-memory (TM) search and concordance search against existing translations while working.
- Admin tooling: upload new source files, compare old/new source versions, view activity log, manage user roles, export project as ZIP or TBX.
- Notifications surface relevant activity to each member; profile pages show a user's contribution history and avatar.
- Currently labeled "Alpha" in the live app.

## Capabilities and Constraints

- Node.js/Express server, session-based auth (bcrypt password hashing, express-session), CSRF protection on mutating routes.
- No database — all persistence is JSON files under `data/` (users, edits, comments, approvals, history, glossary, projects, log) plus per-project source files.
- Runs locally (`node server.js`) or via the included Dockerfile/docker-compose; first registered user becomes admin (or via `ADMIN_USERS` env var).
- File uploads handled via multer; exports zipped via jszip.
- Meant for a small team/internal community workflow, explicitly not designed for large multi-tenant SaaS scale.

## Brand Commitments

- Product name: **Seeders Translation Tools** (the live app's `<title>` and favicon/masthead logo, `SeedersT.svg`), currently in **Alpha**. The README/package.json name "Translation Bench" is legacy/internal and not the binding external name.

## Evidence on Hand

- The app already has real, live usage: `data/users.json` holds a substantial registered user base (~100KB), and `data/projects.json` lists real active projects (Project Zomboid, Cyberpunk2077) with real history/log data. This is a live community tool, not a demo or greenfield build — future design and dev work must preserve this existing data and must not disrupt current users' workflows or accounts.
- No other durable constraints, evidence, or brand assets were flagged beyond preserving existing data/accounts.

## Product Principles

1. Protect the existing community's data and workflows — this is a live tool with real contributors, not a blank slate.
2. Favor operational simplicity (no DB, plain files, easy self-host/backup) over scale — that trade-off is intentional, not a gap to "fix."
3. Design for the real roles in play (member, reviewer, project admin, site admin) and the collision-prone, collaborative nature of concurrent translation editing (locking, suggestions, comments).
4. Keep the tool's community/game-localization character rather than genericizing it for an unknown outside audience.
