# Changelog

All notable user-facing changes to Seeders Translation Tools are recorded here,
newest first, reconstructed from past release builds.

## Unreleased — 08/08/2026

### Added
- Automatic backups: the entire `data/` directory (translations, comments, avatars) is zipped every 6 hours, keeping the last 28 snapshots (~7 days), so a bad edit or accidental delete can be recovered from disk instead of lost.
- Comments can now include an attached image (PNG/JPEG/WEBP/GIF, up to 5MB), not just text — useful for sharing in-game screenshots alongside a note. Click an attached image to view it full-size.
- An in-app "What's new" panel (the megaphone icon in the top bar) so updates are visible without reading server logs or diffing files.
- The login screen now shows the app version before you sign in.

### Changed
- `server.js` was split into separate `routes/` and `lib/` modules. No behavior change, but worth knowing if you're used to finding things in one giant file.

### Fixed
- **Security:** `POST /api/comments/restore` (the "Undo" action after deleting a comment) accepted client-supplied comment content, including the `author` field, for every comment in a batch after only checking the top-level one. This allowed any project member to post content that appeared to come from another member. Undo now replays a server-held record of exactly what was deleted, identified by a one-time token, instead of trusting anything the client sends back.

## v0.2.2 — 06/08/2026

### Added
- QA triage: flagged issues (placeholder/tag mismatches, translations far longer or shorter than the source) can now be marked "ignored" or "approved" by a project admin, so resolved or false-positive flags stop cluttering the open QA queue.
- Undo for deleted suggestions, in addition to the existing undo for deleted comments.
- The full list of project members is now available for @mention autocomplete, even for members who haven't set an avatar yet.

### Changed
- Avatar upload switched from a base64 JSON payload (≤300KB) to a real file upload (≤2MB), served as static files. You can now also remove your avatar entirely instead of only replacing it.
- Notifications were narrowed to only fire when someone @mentions you or replies directly to you, instead of on any comment/suggestion/reaction activity on a file you can see — much less noise.

### Fixed
- Button hover color adjusted so hover text meets accessibility contrast guidelines (the previous hover fill was too light against the text).

## v0.2.1 — 05/08/2026

### Added
- Non-admins can now request that a brand-new project be created; a site admin approves or rejects the request, and the requester is automatically made that project's admin on approval.
- User reporting: any member can report another user (optionally attached to a specific string), and a project admin can resolve the report.
- A live presence view showing who's online right now and what they're currently editing, separate from the existing "active users" count.
- Bulk approve/unapprove for translated strings (up to 500 at once), instead of one at a time.
- Suggestions: once someone has translated a string, other translators can no longer overwrite it directly — they submit a suggestion that the current translator (or a reviewer/admin) can apply or reject.
- Comment reactions (like/dislike) and single-level threaded replies to comments.
- Self-service account controls: change your own password and log yourself out of all other sessions.
- Site-admin tools to reset a user's password, disable an account, or force-logout a user's other sessions.

### Changed
- Deep links like `/p/<project>/<tab>` now survive a page refresh instead of dropping back to the project list.

## v0.2 — 04/08/2026

### Added
- The app now supports multiple translation projects instead of just one. Each project has its own files, edits, comments, history, and approvals, with per-project roles (translator/reviewer/admin) instead of one global role.
- Project creation and project switching, plus a request/approve flow for joining an existing project.
- A notification feed for activity on files you have access to.
- Project admins can manage their own project's member list and roles without needing site-admin access.

## v0.1 — 04/08/2026

Initial tracked build: single-project translation review tool with source file import, per-string editing with locking, comments, edit history, approvals, a glossary, and a site-wide admin/translator/reviewer role model.
