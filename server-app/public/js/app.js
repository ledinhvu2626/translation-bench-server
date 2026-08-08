const PAGE_SIZE = 60;

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
};

const ICONS = {
  arrow: '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-1px;margin-left:3px"><path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowLeft: '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-1px;margin-right:3px"><path d="M10 3.5L5.5 8L10 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  comment: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6.8L4 14v-2.5H2.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  suggestion: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5a4 4 0 0 0-2.2 7.3c.4.3.7.8.7 1.3v.4h3v-.4c0-.5.3-1 .7-1.3A4 4 0 0 0 8 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.3 12.5h3.4M6.7 14h2.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  history: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.8V8l2.3 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tm: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.2" y="4.5" width="7" height="7" rx="1.3" stroke="currentColor" stroke-width="1.3"/><rect x="6.8" y="4.5" width="7" height="7" rx="1.3" stroke="currentColor" stroke-width="1.3"/></svg>',
  approve: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M5.3 8.2l1.8 1.8L10.7 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  report: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 2v12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M4 2.8h7l-1.8 2.6L11 8H4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  lockClosed: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 7V4.8a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" stroke-width="1.3"/></svg>',
  lockOpen: '<svg class="ic" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 7V4.8a2.5 2.5 0 0 1 4.8-1.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  bell: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.2a3 3 0 0 0-3 3v1.8c0 .6-.2 1.2-.6 1.7L3 10.2c-.4.5 0 1.3.6 1.3h8.8c.6 0 1-.8.6-1.3l-1.4-1.5a2.6 2.6 0 0 1-.6-1.7V5.2a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
};
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Queued so an overlapping message (e.g. a lock/conflict notice arriving
// right after a save confirmation) is never silently dropped — each waits
// its turn instead of clobbering the one on screen.
let toastQueue = [];
let toastShowing = false;
function toast(msg, opts = {}) {
  toastQueue.push({ msg, opts });
  if (!toastShowing) showNextToast();
}
function showNextToast() {
  const next = toastQueue.shift();
  if (!next) { toastShowing = false; return; }
  toastShowing = true;
  const { msg, opts } = next;
  const t = document.getElementById('toast');
  t.innerHTML = '';
  t.appendChild(document.createTextNode(msg));
  if (opts.actionLabel && opts.onAction) {
    const btn = el('button', { class: 'toast-action', text: opts.actionLabel });
    btn.addEventListener('click', () => {
      clearTimeout(toast._t);
      t.classList.remove('show');
      opts.onAction();
      setTimeout(showNextToast, 220);
    });
    t.appendChild(btn);
  }
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(showNextToast, 220);
  }, opts.duration || 2200);
}

function getEditorName() {
  return AUTH.username || 'anonymous';
}

function applyAdminGating() {
  const role = STATE.projectRole;
  document.body.classList.toggle('is-admin', role === 'admin');
  document.body.classList.toggle('is-reviewer', role === 'admin' || role === 'reviewer');
}

const ROLE_RANK = { translator: 1, reviewer: 2, admin: 3 };
function canModerate() {
  return STATE.projectRole === 'admin';
}

function showConfirm({ title = 'Confirm', message = '', confirmLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmModal');
    const okBtn = document.getElementById('confirmModalOk');
    const cancelBtn = document.getElementById('confirmModalCancel');
    const closeBtn = document.getElementById('confirmModalClose');
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    okBtn.textContent = confirmLabel;
    okBtn.classList.toggle('danger', danger);
    okBtn.classList.toggle('primary', !danger);
    const cleanup = (result) => {
      overlay.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onKeydown = (e) => { if (e.key === 'Escape') cleanup(false); };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeydown);
    overlay.style.display = 'flex';
    okBtn.focus();
  });
}

function showUploadPreview(diffResults) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('uploadPreviewModal');
    const okBtn = document.getElementById('uploadPreviewConfirm');
    const cancelBtn = document.getElementById('uploadPreviewCancel');
    const closeBtn = document.getElementById('uploadPreviewClose');
    renderDiffResults(diffResults, document.getElementById('uploadDiffResults'), {
      emptyText: 'These files match what’s already on the server — no keys would be added, removed, or changed.',
    });
    const cleanup = (result) => {
      overlay.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onKeydown = (e) => { if (e.key === 'Escape') cleanup(false); };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeydown);
    overlay.style.display = 'flex';
    okBtn.focus();
  });
}

function buildJsonHeaders(extra = {}) {
  const headers = { ...(extra.headers || {}) };
  if (AUTH.csrfToken) headers['X-CSRF-Token'] = AUTH.csrfToken;
  if (extra.contentType !== false) headers['Content-Type'] = 'application/json';
  return headers;
}

const AUTH = { username: null, isSiteAdmin: false, csrfToken: null, avatar: null };

async function loadProjectMembers() {
  try {
    const res = await fetch('/api/project/members');
    if (!res.ok) return;
    const data = await res.json();
    STATE.members = data.members || {};
  } catch (e) {}
}

function buildAvatarEl(username, className) {
  const avatarUrl = username === AUTH.username
    ? AUTH.avatar
    : (STATE.avatars && STATE.avatars[username]);
  const wrap = el('div', { class: className || 'mini-avatar' });
  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    wrap.appendChild(img);
  } else {
    wrap.textContent = (username || '?').slice(0, 2).toUpperCase();
  }
  return wrap;
}

function renderProfileMenu() {
  if (!AUTH.username) return;
  const avatarEl = document.getElementById('profileAvatar');
  avatarEl.innerHTML = '';
  if (AUTH.avatar) {
    const img = document.createElement('img');
    img.src = AUTH.avatar;
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = AUTH.username.slice(0, 2).toUpperCase();
  }
  document.getElementById('profileName').textContent = AUTH.username;
  document.getElementById('profileMenuName').textContent = AUTH.username;
  const role = STATE.projectRole;
  document.getElementById('profileMenuRole').textContent =
    (role || 'translator') + (AUTH.isSiteAdmin ? ' \u00b7 site admin' : '');
}

function closeProfileMenu() {
  document.getElementById('profileMenu').classList.remove('open');
  document.getElementById('profileWrap').classList.remove('open');
  document.getElementById('myContribBox').style.display = 'none';
}

async function doSignOut() {
  try { await fetch('/api/logout', { method: 'POST', headers: buildJsonHeaders({ contentType: false }) }); } catch (e) {}
  AUTH.username = null;
  AUTH.isSiteAdmin = false;
  AUTH.csrfToken = null;
  AUTH.avatar = null;
  STATE.projectId = null;
  STATE.projectRole = null;
  closeProfileMenu();
  document.getElementById('teamModal').style.display = 'none';
  document.getElementById('projectPicker').style.display = 'none';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('authPassword').value = '';
  if (location.pathname !== '/') history.pushState(null, '', '/');
}

function initProfileMenu() {
  const wrap = document.getElementById('profileWrap');
  const menu = document.getElementById('profileMenu');
  document.getElementById('profileTrigger').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
    wrap.classList.toggle('open', menu.classList.contains('open'));
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeProfileMenu();
  });

  document.getElementById('signOutBtn').addEventListener('click', doSignOut);
  document.getElementById('projectPickerSignOut').addEventListener('click', doSignOut);
  document.getElementById('switchProjectBtn').addEventListener('click', () => { closeProfileMenu(); showProjectPicker(); });
  document.getElementById('manageTeamBtn').addEventListener('click', () => { closeProfileMenu(); openTeamModal(); });
  document.getElementById('teamModalClose').addEventListener('click', () => {
    document.getElementById('teamModal').style.display = 'none';
  });
  document.getElementById('teamAddBtn').addEventListener('click', () => {
    const username = document.getElementById('teamAddUsername').value;
    const role = document.getElementById('teamAddRole').value;
    if (!username) return;
    setTeamRole(username, role);
  });

  const avatarInput = document.getElementById('avatarInput');
  document.getElementById('changeAvatarBtn').addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    avatarInput.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Image too big \u2014 keep it under 2MB.'); return; }
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: buildJsonHeaders({ contentType: false }),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'could not update avatar');
      AUTH.avatar = data.avatar;
      renderProfileMenu();
      toast('Avatar updated');
    } catch (err) {
      toast(err.message);
    }
  });

  document.getElementById('myContribBtn').addEventListener('click', async () => {
    const box = document.getElementById('myContribBox');
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.textContent = 'loading\u2026';
    try {
      const res = await fetch('/api/profile/contributions');
      const data = await res.json();
      box.innerHTML = '';
      box.appendChild(el('div', {}, [document.createTextNode('Live edits: '), el('b', { text: String(data.currentEdits) })]));
      box.appendChild(el('div', {}, [document.createTextNode('Files touched: '), el('b', { text: String(data.filesTouched) })]));
      box.appendChild(el('div', {}, [document.createTextNode('Total saves logged: '), el('b', { text: String(data.editLogCount) })]));
    } catch (e) {
      box.textContent = 'could not load';
    }
  });

  document.getElementById('newProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newProjectName').value.trim();
    const errEl = document.getElementById('projectPickerError');
    errEl.textContent = '';
    if (!name) return;
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ name }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { errEl.textContent = data.error || 'could not create project'; return; }
      document.getElementById('newProjectName').value = '';
      await enterProject(data.project.id);
    } catch (e) { errEl.textContent = 'Could not reach the server'; }
  });

  document.getElementById('requestProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('requestProjectName').value.trim();
    const errEl = document.getElementById('projectPickerError');
    errEl.textContent = '';
    if (!name) return;
    try {
      const res = await fetch('/api/projects/create-request', { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ name }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { errEl.textContent = data.error || 'could not submit request'; return; }
      document.getElementById('requestProjectName').value = '';
      toast(data.alreadyPending ? 'Already pending review.' : 'Request sent to site admins.');
      await showProjectPicker();
    } catch (e) { errEl.textContent = 'Could not reach the server'; }
  });
}

/* ---- multi-project: picker, switching, team management ---- */

function resetProjectLocalState() {
  STATE.files = {}; STATE.edits = {}; STATE.editsMeta = {}; STATE.comments = {};
  STATE.approvals = {}; STATE.locks = {}; STATE.fileLocks = {}; STATE.fileEditors = {}; STATE.fileLockHeld = null;
  STATE.hiddenFiles = []; STATE.historyCache = {}; STATE.tmCache = {}; STATE.glossary = [];
  STATE.glossaryIndex = []; STATE.activeFile = null; STATE.page = 0; STATE.zenIndex = 0;
  STATE.avatars = {}; STATE.suggestions = {}; STATE.qaDecisions = {};
}

const VALID_TABS = new Set(['dashboard', 'editor', 'contributors', 'compare', 'concordance', 'glossary', 'qa', 'activity', 'notifications']);
const ADMIN_ONLY_TABS = new Set(['compare', 'qa', 'activity']);

function parseRoute() {
  const m = location.pathname.match(/^\/p\/([^/]+)\/([^/]+)\/?$/);
  if (!m) return null;
  return { projectId: decodeURIComponent(m[1]), tab: decodeURIComponent(m[2]) };
}
function pushRoute(projectId, tab) {
  const path = `/p/${encodeURIComponent(projectId)}/${tab}`;
  if (location.pathname !== path) history.pushState({ projectId, tab }, '', path);
}
function replaceRoute(projectId, tab) {
  const path = `/p/${encodeURIComponent(projectId)}/${tab}`;
  if (location.pathname !== path) history.replaceState({ projectId, tab }, '', path);
}

async function proceedAfterAuth() {
  const res = await fetch('/api/projects');
  const data = await res.json().catch(() => ({ projects: [] }));
  STATE.projects = data.projects || [];
  STATE.isSiteAdmin = !!data.isSiteAdmin;

  const route = parseRoute();
  const routeValid = route && STATE.projects.some((p) => p.id === route.projectId && p.role);
  const projectId = routeValid ? route.projectId : data.currentProjectId;
  const hasAccess = projectId && STATE.projects.some((p) => p.id === projectId && p.role);

  if (hasAccess) {
    const tab = routeValid && VALID_TABS.has(route.tab) ? route.tab : 'dashboard';
    await enterProject(projectId, tab, { replace: true });
  } else {
    showProjectPicker();
  }
}

async function showProjectPicker() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('projectPicker').style.display = 'flex';
  if (location.pathname !== '/') history.pushState(null, '', '/');
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    STATE.projects = data.projects || [];
    STATE.isSiteAdmin = !!data.isSiteAdmin;
    STATE.myCreateRequests = data.myCreateRequests || [];
  } catch (e) {}
  renderProjectPickerList();
}

function renderProjectPickerList() {
  const list = document.getElementById('projectPickerList');
  const empty = document.getElementById('projectPickerEmpty');
  list.innerHTML = '';
  if (!STATE.projects.length) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    const nameCounts = {};
    for (const p of STATE.projects) nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
    for (const p of STATE.projects) {
      const initials = p.name.trim().slice(0, 2).toUpperCase() || '?';
      const badge = p.role
        ? { text: p.role, cls: 'role-active' }
        : p.pending
          ? { text: 'requested \u2014 awaiting review', cls: 'role-pending' }
          : { text: 'no access yet', cls: 'role-none' };
      const bodyChildren = [el('div', { class: 'pc-name', text: p.name })];
      if (nameCounts[p.name] > 1) bodyChildren.push(el('div', { class: 'pc-id', text: p.id }));
      bodyChildren.push(el('span', { class: `pc-badge ${badge.cls}`, text: badge.text }));
      const card = el('div', { class: 'project-card' }, [
        el('div', { class: 'project-card-mark', text: initials }),
        el('div', { class: 'project-card-body' }, bodyChildren),
      ]);
      if (p.role) {
        card.appendChild(el('div', { class: 'project-card-arrow', html: ICONS.arrow }));
        card.addEventListener('click', () => enterProject(p.id));
      } else if (p.pending) {
        card.style.cursor = 'default';
        const cancelBtn = el('button', { class: 'btn', text: 'Cancel request' });
        cancelBtn.addEventListener('click', (ev) => { ev.stopPropagation(); cancelJoinRequest(p.id); });
        card.appendChild(cancelBtn);
      } else {
        card.style.cursor = 'default';
        const reqBtn = el('button', { class: 'btn primary', text: 'Request to join' });
        reqBtn.addEventListener('click', (ev) => { ev.stopPropagation(); requestJoinProject(p.id); });
        card.appendChild(reqBtn);
      }
      list.appendChild(card);
    }
  }
  document.getElementById('newProjectBox').style.display = STATE.isSiteAdmin ? 'block' : 'none';
  document.getElementById('createRequestReviewBox').style.display = STATE.isSiteAdmin ? 'block' : 'none';
  document.getElementById('requestProjectBox').style.display = STATE.isSiteAdmin ? 'none' : 'block';
  if (STATE.isSiteAdmin) loadCreateRequestReview();
  renderMyCreateRequests();
}

function renderMyCreateRequests() {
  const box = document.getElementById('myCreateRequestsList');
  box.innerHTML = '';
  const pendingOrRejected = STATE.myCreateRequests.filter((r) => r.status !== 'approved');
  for (const r of pendingOrRejected) {
    const badge = r.status === 'pending'
      ? { text: 'pending review', cls: 'role-pending' }
      : { text: 'rejected', cls: 'role-rejected' };
    box.appendChild(el('div', { class: 'cr-row' }, [
      el('span', { text: r.name }),
      el('span', { class: `pc-badge ${badge.cls}`, text: badge.text }),
    ]));
  }
}

async function loadCreateRequestReview() {
  const box = document.getElementById('createRequestReviewList');
  try {
    const res = await fetch('/api/projects/create-requests');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { box.innerHTML = ''; return; }
    box.innerHTML = '';
    if (!data.requests || !data.requests.length) {
      box.appendChild(el('div', { class: 'cr-row', text: 'No pending requests.' }));
      return;
    }
    for (const r of data.requests) {
      const approveBtn = el('button', { class: 'btn primary', text: 'Approve' });
      approveBtn.addEventListener('click', () => decideCreateRequest(r.id, true));
      const rejectBtn = el('button', { class: 'tr-btn danger', text: 'Reject' });
      rejectBtn.addEventListener('click', () => decideCreateRequest(r.id, false));
      box.appendChild(el('div', { class: 'team-row is-pending' }, [
        el('span', { class: 'tr-name', text: `${r.name} — requested by ${r.requestedBy}` }),
        approveBtn, rejectBtn,
      ]));
    }
  } catch (e) { box.innerHTML = ''; }
}

async function decideCreateRequest(id, approve) {
  try {
    const res = await fetch('/api/projects/create-requests/decide', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ id, approve }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || 'could not update request'); return; }
    toast(approve ? 'Project created.' : 'Request rejected.');
    await showProjectPicker();
  } catch (e) { toast('could not reach server'); }
}

async function requestJoinProject(projectId) {
  const errEl = document.getElementById('projectPickerError');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/projects/request', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ projectId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { errEl.textContent = data.error || 'could not send request'; return; }
    toast('Request sent \u2014 an admin will review it.');
    await showProjectPicker();
  } catch (e) {
    errEl.textContent = 'Could not reach the server';
  }
}

async function cancelJoinRequest(projectId) {
  try {
    await fetch('/api/projects/request/cancel', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ projectId }),
    });
  } catch (e) {}
  await showProjectPicker();
}

let mastheadTitleTimer = null;
function flashMastheadTitle() {
  const titleEl = document.querySelector('.masthead h1');
  if (!titleEl) return;
  clearTimeout(mastheadTitleTimer);
  titleEl.classList.remove('title-hidden');
  titleEl.classList.add('title-enter');
  // Force a reflow so the browser registers the "enter" (offscreen/transparent)
  // state as a real starting point before we remove it — otherwise the two
  // class changes get batched and there's nothing to transition from.
  void titleEl.offsetWidth;
  titleEl.classList.remove('title-enter');
  mastheadTitleTimer = setTimeout(() => titleEl.classList.add('title-hidden'), 3000);
}

async function enterProject(projectId, initialTab, opts = {}) {
  const errEl = document.getElementById('projectPickerError');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/projects/switch', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ projectId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { errEl.textContent = data.error || 'Could not switch project'; return; }
    STATE.projectId = data.projectId;
    STATE.projectRole = data.role;
    applyAdminGating();
    renderProfileMenu();
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('projectPicker').style.display = 'none';
    document.getElementById('mainApp').style.display = '';
    document.getElementById('activeProjectName').textContent = data.name;
    flashMastheadTitle();
    resetProjectLocalState();
    await bootApp();
    activateTab(VALID_TABS.has(initialTab) ? initialTab : 'dashboard', { replace: opts.replace, skipRoute: opts.skipRoute });
  } catch (e) {
    errEl.textContent = 'Could not reach the server';
  }
}

async function openTeamModal() {
  document.getElementById('teamModalProject').textContent = document.getElementById('activeProjectName').textContent;
  document.getElementById('teamModal').style.display = 'flex';
  const listEl = document.getElementById('teamMembersList');
  listEl.textContent = 'loading\u2026';
  document.getElementById('teamReportsList').innerHTML = '';
  try {
    const res = await fetch('/api/project/members');
    const data = await res.json();
    renderTeamMembers(data.members, data.requests || []);
    renderReportsList(data.reports || []);
    const sel = document.getElementById('teamAddUsername');
    sel.innerHTML = '';
    for (const u of data.allUsernames) sel.appendChild(el('option', { text: u, value: u }));
  } catch (e) {
    listEl.textContent = 'could not load';
  }
}
function renderReportsList(reports) {
  const listEl = document.getElementById('teamReportsList');
  listEl.innerHTML = '';
  if (!reports.length) return;
  listEl.appendChild(el('div', { class: 'team-section-label', text: `Open reports \u00b7 ${reports.length}` }));
  for (const r of reports) {
    const row = el('div', { class: 'report-row' });
    row.appendChild(el('div', { class: 'rr-head' }, [
      el('span', { class: 'rr-who', text: `${r.reporter} \u2192 ${r.targetUser}` }),
      el('span', { class: 'rr-time', text: new Date(r.ts).toLocaleString() }),
    ]));
    row.appendChild(el('div', { class: 'rr-reason', text: r.reason }));
    const resolveBtn = el('button', { class: 'btn rr-resolve', text: 'Mark resolved' });
    resolveBtn.addEventListener('click', () => resolveReport(r.id));
    row.appendChild(resolveBtn);
    listEl.appendChild(row);
  }
}
async function resolveReport(id) {
  try {
    const res = await fetch('/api/reports/resolve', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || 'could not resolve report'); return; }
    openTeamModal();
  } catch (e) { toast('could not reach server'); }
}

/* ---- report a teammate to this project's admins ---- */

let REPORT_TARGET = null;
let REPORT_STRING_REF = null;
function openReportModal(username, filename, key) {
  REPORT_TARGET = username;
  REPORT_STRING_REF = filename && key ? { filename, key } : null;
  document.getElementById('reportTargetName').textContent = username;
  document.getElementById('reportReasonInput').value = '';
  document.getElementById('reportError').textContent = '';
  const ctxLine = document.getElementById('reportContextLine');
  if (REPORT_STRING_REF) {
    ctxLine.textContent = `Re: ${REPORT_STRING_REF.filename} — ${REPORT_STRING_REF.key}`;
    ctxLine.style.display = 'block';
  } else {
    ctxLine.style.display = 'none';
  }
  document.getElementById('reportModal').style.display = 'flex';
}
function closeReportModal() {
  document.getElementById('reportModal').style.display = 'none';
  REPORT_TARGET = null;
  REPORT_STRING_REF = null;
}
async function submitReport() {
  const errEl = document.getElementById('reportError');
  errEl.textContent = '';
  const reason = document.getElementById('reportReasonInput').value.trim();
  if (!reason) { errEl.textContent = 'Please describe what happened.'; return; }
  try {
    const body = { targetUser: REPORT_TARGET, reason };
    if (REPORT_STRING_REF) { body.filename = REPORT_STRING_REF.filename; body.key = REPORT_STRING_REF.key; }
    const res = await fetch('/api/reports', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { errEl.textContent = data.error || 'could not send report'; return; }
    toast('Report sent to project admins');
    closeReportModal();
  } catch (e) {
    errEl.textContent = 'Could not reach the server';
  }
}
function initReportModal() {
  document.getElementById('reportModalClose').addEventListener('click', closeReportModal);
  document.getElementById('reportSubmitBtn').addEventListener('click', submitReport);
}

const HELP_SEEN_KEY = 'seedersHelpSeen';

function initHelpModal() {
  const overlay = document.getElementById('helpModal');
  const btn = document.getElementById('headerHelpBtn');
  const close = () => { overlay.style.display = 'none'; };

  let alreadySeen = true;
  try { alreadySeen = !!localStorage.getItem(HELP_SEEN_KEY); } catch (e) {}
  if (!alreadySeen) btn.classList.add('pulse');

  btn.addEventListener('click', () => {
    overlay.style.display = 'flex';
    btn.classList.remove('pulse');
    try { localStorage.setItem(HELP_SEEN_KEY, '1'); } catch (e) {}
  });
  document.getElementById('helpModalClose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') close();
  });
}

/* ---- who's online + what they're doing (masthead popover) ---- */

function describePresence(u) {
  if (u.key) return `editing ${u.key} in ${u.file}`;
  if (u.file) return `browsing ${u.file}`;
  return 'online';
}

async function loadPresence() {
  const menu = document.getElementById('activeUsersMenu');
  try {
    const res = await fetch('/api/presence');
    if (!res.ok) return;
    const data = await res.json();
    const users = data.users || [];
    menu.innerHTML = '';
    if (!users.length) {
      menu.appendChild(el('div', { class: 'au-empty', text: 'No one else online right now.' }));
      return;
    }
    for (const u of users) {
      menu.appendChild(el('div', { class: 'au-row' }, [
        el('div', { class: 'au-name', text: u.username + (u.username === AUTH.username ? ' (you)' : '') }),
        el('div', { class: 'au-status', text: describePresence(u) }),
      ]));
    }
  } catch (e) {}
}

function initActiveUsersMenu() {
  const wrap = document.getElementById('activeUsersWrap');
  const menu = document.getElementById('activeUsersMenu');
  document.getElementById('activeUsers').addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains('open');
    if (!wasOpen) loadPresence();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) menu.classList.remove('open');
  });
}
function renderTeamMembers(members, requests) {
  const listEl = document.getElementById('teamMembersList');
  listEl.innerHTML = '';
  if (requests.length) {
    listEl.appendChild(el('div', { class: 'team-section-label', text: 'Pending requests' }));
    for (const r of requests) {
      const roleSel = el('select', {});
      for (const role of ['translator', 'reviewer', 'admin']) {
        roleSel.appendChild(el('option', { text: role, value: role }));
      }
      const approveBtn = el('button', { class: 'btn primary', text: 'Approve' });
      approveBtn.addEventListener('click', () => decideRequest(r.username, true, roleSel.value));
      const rejectBtn = el('button', { class: 'tr-btn danger', text: 'Reject' });
      rejectBtn.addEventListener('click', () => decideRequest(r.username, false));
      listEl.appendChild(el('div', { class: 'team-row is-pending' }, [
        buildAvatarEl(r.username),
        el('span', { class: 'tr-name', text: r.username }),
        roleSel, approveBtn, rejectBtn,
      ]));
    }
    listEl.appendChild(el('div', { class: 'team-section-label', text: 'Current team', style: 'margin-top:10px;' }));
  }
  for (const m of members) {
    const roleSel = el('select', {});
    for (const r of ['translator', 'reviewer', 'admin']) {
      const opt = el('option', { text: r, value: r });
      if (r === m.role) opt.selected = true;
      roleSel.appendChild(opt);
    }
    roleSel.addEventListener('change', () => setTeamRole(m.username, roleSel.value));
    const removeBtn = el('button', { class: 'tr-btn danger', text: 'Remove' });
    removeBtn.addEventListener('click', () => setTeamRole(m.username, null));
    listEl.appendChild(el('div', { class: 'team-row' }, [
      buildAvatarEl(m.username),
      el('span', { class: 'tr-name', text: m.username + (m.siteAdmin ? ' (site admin)' : '') }),
      roleSel,
      removeBtn,
    ]));
  }
}
async function decideRequest(username, approve, role) {
  try {
    const res = await fetch('/api/project/requests/decide', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ username, approve, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || 'could not update request'); return; }
    openTeamModal();
  } catch (e) { toast('could not reach server'); }
}
async function setTeamRole(username, role) {
  try {
    const res = await fetch('/api/project/members/role', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ username, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || 'could not update role'); return; }
    openTeamModal();
  } catch (e) { toast('could not reach server'); }
}

async function checkSession() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) return false;
    const data = await res.json();
    AUTH.username = data.username;
    AUTH.isSiteAdmin = !!data.isAdmin;
    AUTH.csrfToken = data.csrfToken || null;
    AUTH.avatar = data.avatar || null;
    return true;
  } catch (e) {
    return false;
  }
}

let authMode = 'login';
function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('authTabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('authTabRegister').classList.toggle('active', mode === 'register');
  document.getElementById('authSubmitBtn').textContent = mode === 'login' ? 'Log in' : 'Create account';
  document.getElementById('authPassword').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  document.getElementById('authSubText').textContent = mode === 'login'
    ? 'Sign in to pick up where you left off.'
    : 'Create an account to start translating.';
  document.getElementById('authError').textContent = '';
}
function initAuthScreen() {
  document.getElementById('authTabLogin').addEventListener('click', () => setAuthMode('login'));
  document.getElementById('authTabRegister').addEventListener('click', () => setAuthMode('register'));
  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const errEl = document.getElementById('authError');
    errEl.textContent = '';
    try {
      const res = await fetch(authMode === 'login' ? '/api/login' : '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.error || 'Something went wrong'; return; }
      AUTH.username = data.username;
      AUTH.isSiteAdmin = !!data.isAdmin;
      AUTH.csrfToken = data.csrfToken || null;
      AUTH.avatar = data.avatar || null;
      renderProfileMenu();
      await proceedAfterAuth();
    } catch (e) {
      errEl.textContent = 'Could not reach the server';
    }
  });
}


function extractTokens(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/%\d+|<[^>]*>/g) || [];
  return matches.slice().sort();
}
function tokensMatch(a, b) {
  const ta = extractTokens(a), tb = extractTokens(b);
  if (ta.length !== tb.length) return false;
  for (let i = 0; i < ta.length; i++) if (ta[i] !== tb[i]) return false;
  return true;
}

function runQaChecks(baseVal, curVal) {
  const issues = [];
  if (typeof curVal !== 'string' || typeof baseVal !== 'string') return issues;

  if (/\b(\p{L}+)(\s+\1)+\b/iu.test(curVal)) issues.push({ code: 'repeat', label: 'repeated word' });

  const stripTokens = (s) => s.replace(/%\d+|<[^>]*>/g, ' ');
  const baseNums = (stripTokens(baseVal).match(/\d+(?:[.,]\d+)?/g) || []).slice().sort();
  const curNums = (stripTokens(curVal).match(/\d+(?:[.,]\d+)?/g) || []).slice().sort();
  if ((baseNums.length || curNums.length) && (baseNums.length !== curNums.length || baseNums.some((n, i) => n !== curNums[i]))) {
    issues.push({ code: 'number', label: curNums.length < baseNums.length ? 'missing number' : 'extra/changed number' });
  }

  const hasBaseTerm = /[.!?:]\s*$/.test(baseVal.trim());
  const hasCurTerm = /[.!?:]\s*$/.test(curVal.trim());
  if (hasBaseTerm !== hasCurTerm) issues.push({ code: 'punct', label: hasBaseTerm ? 'missing end punctuation' : 'extra end punctuation' });

  if (/ {2,}/.test(curVal) && !/ {2,}/.test(baseVal)) issues.push({ code: 'space', label: 'double space' });
  if (curVal.length && curVal !== curVal.trim()) issues.push({ code: 'trim', label: 'stray leading/trailing space' });

  if (baseVal.trim() && curVal.trim()) {
    const ratio = curVal.length / baseVal.length;
    if (ratio > 3) issues.push({ code: 'length', label: 'much longer than source' });
    else if (ratio < 0.25) issues.push({ code: 'length', label: 'much shorter than source' });
  }

  return issues;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildGlossaryIndex() {
  const list = (STATE.glossary || [])
    .filter((g) => g.term && g.translation)
    .slice()
    .sort((a, b) => b.term.length - a.term.length);
  STATE.glossaryIndex = list.map((entry) => ({ entry, regex: new RegExp('\\b' + escapeRegex(entry.term) + '\\b', 'gi') }));
}

function populateUserFilter() {
  const sel = document.getElementById('userFilterSelect');
  const current = sel.value;
  const global = document.getElementById('globalSearchToggle').checked;
  const filenames = global ? Object.keys(STATE.files) : (STATE.activeFile ? [STATE.activeFile] : []);
  const translators = new Set();
  for (const filename of filenames) {
    const metaForFile = STATE.editsMeta && STATE.editsMeta[filename];
    if (!metaForFile) continue;
    for (const meta of Object.values(metaForFile)) {
      if (meta && meta.editor) translators.add(meta.editor);
    }
  }
  const sorted = [...translators].sort((a, b) => a.localeCompare(b));
  const optionsKey = sorted.join('');
  if (sel.dataset.optionsKey === optionsKey) {
    if (current && !translators.has(current)) sel.value = '';
    return;
  }
  sel.dataset.optionsKey = optionsKey;
  sel.innerHTML = '';
  sel.appendChild(el('option', { value: '', text: 'Any translator' }));
  for (const username of sorted) {
    sel.appendChild(el('option', { value: username, text: username }));
  }
  sel.value = translators.has(current) ? current : '';
}

function findGlossaryMatches(baseVal) {
  if (typeof baseVal !== 'string' || !baseVal || !STATE.glossaryIndex || !STATE.glossaryIndex.length) return [];
  const taken = [];
  const hits = [];
  for (const { entry, regex } of STATE.glossaryIndex) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(baseVal))) {
      const start = m.index, end = start + m[0].length;
      if (taken.some((t) => start < t.end && end > t.start)) continue;
      taken.push({ start, end });
      hits.push({ start, end, text: m[0], entry });
    }
  }
  hits.sort((a, b) => a.start - b.start);
  return hits;
}

function glossaryIssues(baseVal, curVal) {
  const matches = findGlossaryMatches(baseVal);
  if (!matches.length) return [];
  const seen = new Set();
  const issues = [];
  const curLower = (curVal || '').toLowerCase();
  for (const { entry } of matches) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    if (!curLower.includes(entry.translation.toLowerCase())) {
      issues.push({ code: 'glossary', label: `missing term "${entry.translation}" for "${entry.term}"` });
    }
  }
  return issues;
}

function allQaIssues(baseVal, curVal) {
  return [...runQaChecks(baseVal, curVal), ...glossaryIssues(baseVal, curVal)];
}

function buildOrigCellContent(baseVal) {
  const text = baseVal ?? '';
  const matches = findGlossaryMatches(text);
  if (!matches.length) return [document.createTextNode(text)];
  const frag = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) frag.push(document.createTextNode(text.slice(cursor, m.start)));
    frag.push(el('mark', { class: 'glossary-hit', title: `glossary: use "${m.entry.translation}"` }, [document.createTextNode(m.text)]));
    cursor = m.end;
  }
  if (cursor < text.length) frag.push(document.createTextNode(text.slice(cursor)));
  return frag;
}

function wordDiff(oldStr, newStr) {
  const a = String(oldStr ?? '').split(/(\s+)/).filter(x => x !== '');
  const b = String(newStr ?? '').split(/(\s+)/).filter(x => x !== '');
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: 'eq', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', text: a[i] }); i++; }
    else { out.push({ type: 'add', text: b[j] }); j++; }
  }
  while (i < n) { out.push({ type: 'del', text: a[i++] }); }
  while (j < m) { out.push({ type: 'add', text: b[j++] }); }
  return out;
}
function buildDiffNode(oldStr, newStr) {
  const wrap = el('div', { class: 'diff-text' });
  for (const p of wordDiff(oldStr, newStr)) {
    if (p.type === 'eq') wrap.appendChild(document.createTextNode(p.text));
    else if (p.type === 'add') wrap.appendChild(el('ins', { text: p.text }));
    else wrap.appendChild(el('del', { text: p.text }));
  }
  return wrap;
}

async function readFileListAsJsonMap(fileList) {
  const out = {};
  for (const f of Array.from(fileList)) {
    if (/\.zip$/i.test(f.name)) {
      const buf = await f.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        const base = entry.name.split('/').pop();
        if (/\.json$/i.test(entry.name)) {
          const text = await entry.async('string');
          addJsonToMap(out, base, text);
        } else if (/\.tbx$/i.test(entry.name)) {
          const text = await entry.async('string');
          addTbxToMap(out, base.replace(/\.tbx$/i, '') + '.tbx.json', text);
        }
      }
    } else if (/\.json$/i.test(f.name)) {
      addJsonToMap(out, f.name, await f.text());
    } else if (/\.tbx$/i.test(f.name)) {
      addTbxToMap(out, f.name.replace(/\.tbx$/i, '') + '.tbx.json', await f.text());
    }
  }
  return out;
}
function addJsonToMap(map, filename, text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  map[filename] = { order: Object.keys(data), baseline: data };
}
function addTbxToMap(map, filename, text) {
  let doc;
  try { doc = new DOMParser().parseFromString(text, 'application/xml'); } catch (e) { return; }
  if (!doc || doc.querySelector('parsererror')) return;
  const out = {};
  const entries = doc.querySelectorAll('termEntry');
  let idx = 0;
  entries.forEach((te) => {
    idx++;
    const id = te.getAttribute('id') || `term_${idx}`;
    const termEl = te.querySelector('term');
    if (!termEl) return;
    const value = (termEl.textContent || '').trim();
    if (!value) return;
    let key = id, n = 1;
    while (Object.prototype.hasOwnProperty.call(out, key)) key = `${id}_${++n}`;
    out[key] = value;
  });
  if (Object.keys(out).length) map[filename] = { order: Object.keys(out), baseline: out };
}

const STATE = {
  projectId: null,
  projectRole: null,
  projects: [],
  isSiteAdmin: false,
  myCreateRequests: [],
  files: {},
  edits: {},
  editsMeta: {},
  comments: {},
  approvals: {},
  locks: {},
  fileLocks: {},
  fileEditors: {},
  fileLockHeld: null,
  hiddenFiles: [],
  historyCache: {},
  tmCache: {},
  glossary: [],
  glossaryIndex: [],
  suggestions: {},
  qaDecisions: {},
  members: {},
  activeFile: null,
  page: 0,
  zenMode: false,
  zenIndex: 0,
};
const pendingSaves = new Map();

function currentValue(filename, key) {
  const e = STATE.edits[filename];
  if (e && Object.prototype.hasOwnProperty.call(e, key)) return e[key];
  return STATE.files[filename].baseline[key];
}

function setCurrentValue(filename, key, val) {
  const baseVal = STATE.files[filename].baseline[key];
  if (!STATE.edits[filename]) STATE.edits[filename] = {};
  if (val === baseVal) delete STATE.edits[filename][key];
  else STATE.edits[filename][key] = val;

  const dKey = filename + '\u0001' + key;
  clearTimeout(pendingSaves.get(dKey));
  pendingSaves.set(dKey, setTimeout(() => {
    saveEditToServer(filename, key, val);
    pendingSaves.delete(dKey);
  }, 500));
}

async function saveEditToServer(filename, key, value) {
  try {
    setSyncState('saving');
    const meta = STATE.editsMeta[filename] && STATE.editsMeta[filename][key];
    const res = await fetch('/api/edit', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, value, knownTs: meta && typeof meta.ts === 'number' ? meta.ts : null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.error === 'file locked by another editor') {
        toast(`This file is locked by ${data.lockedBy} right now \u2014 can't save.`);
        throw new Error(data.error);
      }
      if (res.status === 423) {
        toast(data.error || `Already translated by ${data.lockedBy} \u2014 add a suggestion instead.`);
        await fetchState();
        renderFileList();
        renderTable();
        throw new Error(data.error || 'locked');
      }
      if (res.status === 409) {
        toast('Conflict: another editor saved this key first. Refresh to review.');
        throw new Error(data.error || 'conflict');
      }
      throw new Error(data.error || 'save failed');
    }
    const data = await res.json().catch(() => ({}));
    if (data.qaIssues && data.qaIssues.length) {
      toast(`Saved with QA flag: ${data.qaIssues.map((i) => i.label).join(', ')}`);
    }
    if (!STATE.editsMeta[filename]) STATE.editsMeta[filename] = {};
    STATE.editsMeta[filename][key] = { value, editor: getEditorName(), ts: data.ts || Date.now() };
    setSyncState('synced');
  } catch (e) {
    setSyncState('stale');
  }
}

async function publishLock(filename, key) {
  if (!filename || !key) return;
  try {
    const r = await fetch('/api/lock', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key }),
    });
    const data = await r.json().catch(() => ({}));
    if (data && data.conflictWith) {
      toast(`Heads up: ${data.conflictWith} is also editing this string right now.`);
    }
  } catch (e) {}
}

async function releaseLock(filename, key) {
  if (!filename || !key) return;
  try {
    await fetch('/api/unlock', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key }),
    });
  } catch (e) {}
}

async function claimFileLock(filename, isHeartbeat) {
  if (!filename) return;
  try {
    const r = await fetch('/api/lock/file', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      STATE.fileLockHeld = filename;
    } else if (r.status === 409) {
      STATE.fileLockHeld = null;
      if (!isHeartbeat) toast(`Can't lock file \u2014 ${data.lockedBy} already has it locked.`);
    }
  } catch (e) {}
  renderFileLockBtn();
}

async function releaseFileLock(filename) {
  if (!filename) return;
  try {
    await fetch('/api/unlock/file', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename }),
    });
  } catch (e) {}
  if (STATE.fileLockHeld === filename) STATE.fileLockHeld = null;
}

function renderFileLockBtn() {
  const btn = document.getElementById('fileLockBtn');
  if (!btn || !STATE.activeFile) return;
  const heldByMe = STATE.fileLockHeld === STATE.activeFile;
  const otherLock = STATE.fileLocks[STATE.activeFile];
  const heldByOther = otherLock && otherLock.username !== getEditorName();
  btn.classList.toggle('active', heldByMe);
  btn.disabled = !!heldByOther && !heldByMe;
  document.getElementById('fileLockIcon').innerHTML = heldByMe ? ICONS.lockOpen : ICONS.lockClosed;
  document.getElementById('fileLockLabel').textContent = heldByMe ? 'Unlock file' : heldByOther ? `Locked by ${otherLock.username}` : 'Lock file';
  btn.title = heldByMe ? 'Release the lock on this file' : heldByOther ? `Locked by ${otherLock.username} — you can still suggest changes` : "Claim this whole file so others can't edit it while you work";
}

// A visually-hidden aria-live region for state changes that matter to a
// screen-reader user but have no toast of their own \u2014 kept separate from
// #toast so it can announce quietly without the visible pop-in.
function announce(msg) {
  const el = document.getElementById('a11yAnnouncer');
  if (el) el.textContent = msg;
}

let lastSyncState = null;
function setSyncState(state) {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  if (state === 'saving') { dot.classList.add('stale'); label.textContent = 'saving\u2026'; }
  else if (state === 'synced') {
    dot.classList.remove('stale'); label.textContent = 'synced';
    // Only worth announcing if we're recovering from being offline \u2014 the
    // routine saving->synced cycle on every edit would otherwise talk over
    // the user constantly.
    if (lastSyncState === 'stale') announce('Back online \u2014 changes are syncing again.');
  } else {
    dot.classList.add('stale'); label.textContent = 'offline \u2014 retrying';
    if (lastSyncState !== 'stale') announce('Connection lost \u2014 retrying in the background. Your edits are safe.');
  }
  lastSyncState = state === 'saving' ? lastSyncState : state;
}

function editedCount(filename) {
  return STATE.edits[filename] ? Object.keys(STATE.edits[filename]).length : 0;
}
function mismatchCount(filename) {
  const f = STATE.files[filename], e = STATE.edits[filename];
  if (!e) return 0;
  let n = 0;
  for (const key of Object.keys(e)) {
    const tokenBad = !tokensMatch(f.baseline[key], e[key]);
    const qaBad = allQaIssues(f.baseline[key], e[key]).length > 0;
    if (tokenBad || qaBad) n++;
  }
  return n;
}
function fileCommentStats(filename) {
  const c = STATE.comments[filename];
  if (!c) return { total: 0, unresolved: 0 };
  let total = 0, unresolved = 0;
  for (const list of Object.values(c)) {
    total += list.length;
    unresolved += list.filter((x) => !x.resolved).length;
  }
  return { total, unresolved };
}

/* ---------- dashboard tab: bird's-eye project overview ---------- */

function renderDashboard() {
  const list = document.getElementById('dashboardList');
  const search = document.getElementById('dashSearch').value.trim().toLowerCase();
  list.innerHTML = '';

  const names = Object.keys(STATE.files).sort().filter((n) => !search || n.toLowerCase().includes(search));
  if (!names.length) {
    list.appendChild(el('div', { class: 'dash-empty', text: Object.keys(STATE.files).length ? 'No files match this filter.' : 'No source files on the server yet. Use "Upload / update source files" in the Editor tab.' }));
    return;
  }

  for (const name of names) {
    const f = STATE.files[name];
    const total = f.order.length;
    const done = editedCount(name);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const checks = mismatchCount(name);
    const cm = fileCommentStats(name);

    const row = el('div', { class: 'dash-row', onclick: () => openFileInZen(name) });
    const editors = (STATE.fileEditors[name] || []).filter((u) => u !== AUTH.username);
    const fnameCell = [
      el('div', { class: 'dash-fname', text: name }),
      el('div', { class: 'dash-bar' }, [el('div', { style: `width:${pct}%` })]),
    ];
    if (editors.length) {
      fnameCell.push(el('div', { class: 'fediting', title: editors.join(', '), text: `✏ ${editors.join(', ')}` }));
    }
    row.appendChild(el('div', {}, fnameCell));
    row.appendChild(el('div', { class: 'dash-stat', 'data-label': 'Progress', text: pct + '%' }));
    row.appendChild(el('div', { class: 'dash-stat', 'data-label': 'Translated', text: String(done) }));
    row.appendChild(el('div', { class: 'dash-stat', 'data-label': 'Untranslated', text: String(total - done) }));
    row.appendChild(el('div', { class: 'dash-stat' + (checks ? ' warn' : ''), 'data-label': 'Checks', text: String(checks) }));
    row.appendChild(el('div', { class: 'dash-stat' + (cm.unresolved ? ' warn' : ''), 'data-label': 'Comments', text: `${cm.unresolved}/${cm.total}` }));
    list.appendChild(row);
  }
}

function openFileInZen(filename) {
  activateTab('editor');

  STATE.activeFile = filename;
  STATE.page = 0;
  STATE.zenIndex = 0;
  document.getElementById('globalSearchToggle').checked = false;
  document.getElementById('filterSelect').value = 'all';
  document.getElementById('searchBox').value = '';

  if (!STATE.zenMode) {
    STATE.zenMode = true;
    document.getElementById('zenToggleBtn').classList.add('active');
    document.getElementById('tableWrap').style.display = 'none';
    document.getElementById('pager').style.display = 'none';
    document.getElementById('zenWrap').style.display = 'flex';
  }

  renderFileList();
  renderTable();
  focusZenTextarea();
}

function initDashboardTab() {
  let dashSearchDebounce = null;
  document.getElementById('dashSearch').addEventListener('input', () => {
    clearTimeout(dashSearchDebounce);
    dashSearchDebounce = setTimeout(renderDashboard, 150);
  });
}

function flattenEdits(rawEdits) {
  const flat = {};
  for (const [filename, keys] of Object.entries(rawEdits || {})) {
    flat[filename] = {};
    for (const [key, meta] of Object.entries(keys)) flat[filename][key] = meta.value;
  }
  return flat;
}

async function fetchState() {
  const url = STATE.activeFile ? `/api/state?file=${encodeURIComponent(STATE.activeFile)}` : '/api/state';
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error('state fetch failed');
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (data.projectRole && data.projectRole !== STATE.projectRole) {
    STATE.projectRole = data.projectRole;
    applyAdminGating();
    renderProfileMenu();
  }
  STATE.files = data.files;
  STATE.editsMeta = data.edits;
  STATE.edits = flattenEdits(data.edits);
  STATE.comments = data.comments || {};
  STATE.approvals = data.approvals || {};
  STATE.locks = data.locks || {};
  STATE.fileLocks = data.fileLocks || {};
  STATE.fileEditors = data.fileEditors || {};
  document.getElementById('activeUsersCount').textContent =
    typeof data.activeUsers === 'number' ? `${data.activeUsers} active` : '\u2014';
  STATE.hiddenFiles = data.hiddenFiles || [];
  STATE.glossary = data.glossary || [];
  STATE.avatars = data.avatars || {};
  STATE.members = data.members || [];
  STATE.suggestions = data.suggestions || {};
  STATE.qaDecisions = data.qaDecisions || {};
  buildGlossaryIndex();
  populateUserFilter();
  if (!STATE.activeFile) {
    const names = Object.keys(STATE.files).sort();
    if (names.length) STATE.activeFile = names[0];
  }
}

function showSessionExpired() {
  AUTH.username = null;
  AUTH.isSiteAdmin = false;
  STATE.projectId = null;
  STATE.projectRole = null;
  document.getElementById('teamModal').style.display = 'none';
  document.getElementById('projectPicker').style.display = 'none';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('authError').textContent = 'Session expired \u2014 please log in again.';
}

// Dashboard/Contributors/QA/Glossary are read-only report views, often
// scrolled through at length. Rebuilding their DOM every poll tick even when
// nothing they show has changed interrupts that scrolling ("the page keeps
// refreshing"). Skip re-rendering them unless the data they're built from
// actually changed. The Editor tab and file list still re-render every poll
// since they show live locks/presence, which age out on their own.
let LAST_REPORT_SIG = null;
function reportSignatureChanged() {
  const sig = JSON.stringify({
    edits: STATE.editsMeta, comments: STATE.comments, approvals: STATE.approvals,
    suggestions: STATE.suggestions, qaDecisions: STATE.qaDecisions, glossary: STATE.glossary,
    hiddenFiles: STATE.hiddenFiles, members: STATE.members,
  });
  const changed = sig !== LAST_REPORT_SIG;
  LAST_REPORT_SIG = sig;
  return changed;
}

function startPolling() {
  setInterval(async () => {
    if (pendingSaves.size > 0) return;
    if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
    try {
      await fetchState();
      setSyncState('synced');
      renderFileList();
      renderTable();
      const reportChanged = reportSignatureChanged();
      if (reportChanged && document.getElementById('view-contributors').classList.contains('active')) renderContributors();
      if (reportChanged && document.getElementById('view-dashboard').classList.contains('active')) renderDashboard();
      if (reportChanged && document.getElementById('view-qa').classList.contains('active')) renderQaReport();
      if (reportChanged && document.getElementById('view-glossary').classList.contains('active')) renderGlossary();
      if (document.getElementById('view-notifications').classList.contains('active')) loadNotifications();
      if (document.getElementById('activeUsersMenu').classList.contains('open')) loadPresence();
      refreshNotifBadge();
    } catch (e) {
      if (e.status === 401) { showSessionExpired(); return; }
      if (e.status === 400 || e.status === 403) { toast('Lost access to this project \u2014 pick another.'); showProjectPicker(); return; }
      setSyncState('stale');
    }
  }, 12000);
}

function renderFileRow(name) {
  const f = STATE.files[name];
  const total = f.order.length;
  const done = editedCount(name);
  const mism = mismatchCount(name);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const isHidden = STATE.hiddenFiles.includes(name);

  const row = el('div', {
    class: 'file-row' + (name === STATE.activeFile ? ' active' : '') + (isHidden ? ' is-hidden' : ''),
    onclick: () => { STATE.activeFile = name; STATE.page = 0; STATE.zenIndex = 0; renderFileList(); renderTable(); }
  });
  const nameRow = el('div', { class: 'fname-row' });
  nameRow.appendChild(el('div', { class: 'fname' }, [document.createTextNode(name)]));
  if (isHidden) nameRow.appendChild(el('span', { class: 'hidden-badge', text: 'hidden' }));
  const fLock = STATE.fileLocks[name];
  if (fLock && fLock.username !== getEditorName()) {
    nameRow.appendChild(el('span', { class: 'badge lock', title: 'File locked for bulk edits', text: `\u{1F512} ${fLock.username}` }));
  }
  if (STATE.projectRole === 'admin') {
    nameRow.appendChild(el('button', {
      class: 'hide-toggle',
      text: isHidden ? 'unhide' : 'hide',
      title: isHidden ? 'Show this file to everyone again' : 'Hide this file from non-admins',
      onclick: (ev) => { ev.stopPropagation(); toggleFileHidden(name, !isHidden); },
    }));
  }
  row.appendChild(nameRow);
  row.appendChild(el('div', { class: 'fmeta' }, [
    el('span', { text: `${done}/${total}` }),
    mism > 0 ? el('span', { class: 'warn-dot', text: `${mism} \u26A0` }) : el('span', { text: pct + '%' }),
  ]));
  const editors = (STATE.fileEditors[name] || []).filter((u) => u !== AUTH.username);
  if (editors.length) {
    row.appendChild(el('div', { class: 'fediting', title: editors.join(', '), text: `\u270F ${editors.join(', ')}` }));
  }
  row.appendChild(el('div', { class: 'progress-bar' }, [el('div', { style: `width:${pct}%` })]));
  return row;
}

async function toggleFileHidden(filename, hidden) {
  try {
    await fetch('/api/files/hidden', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, hidden }),
    });
    await fetchState();
    renderFileList();
    renderTable();
  } catch (e) {
    toast('Could not update file visibility');
  }
}

function renderFileList() {
  if (STATE.fileLockHeld && STATE.fileLockHeld !== STATE.activeFile) {
    const heldFile = STATE.fileLockHeld;
    STATE.fileLockHeld = null;
    releaseFileLock(heldFile);
  }
  renderFileLockBtn();

  const list = document.getElementById('fileList');
  list.innerHTML = '';
  const names = Object.keys(STATE.files).sort();

  const inProgress = [];
  const doneNames = [];
  for (const name of names) {
    const total = STATE.files[name].order.length;
    const done = editedCount(name);
    (total > 0 && done === total ? doneNames : inProgress).push(name);
  }

  for (const name of inProgress) list.appendChild(renderFileRow(name));
  if (doneNames.length) {
    list.appendChild(el('div', { class: 'file-group-head', text: `Done \u00b7 ${doneNames.length}` }));
    for (const name of doneNames) list.appendChild(renderFileRow(name));
  }

  const fileCount = names.length;
  const totalEntries = names.reduce((s, n) => s + STATE.files[n].order.length, 0);
  const totalDone = names.reduce((s, n) => s + editedCount(n), 0);
  const foot = document.getElementById('sidebarFoot');
  foot.innerHTML = '';
  foot.appendChild(el('div', {}, [document.createTextNode(fileCount ? `${fileCount} files loaded` : 'No source files on the server yet.')]));
  if (fileCount) {
    foot.appendChild(el('div', { style: 'margin-top:4px' }, [document.createTextNode('Total: '), el('b', { text: `${totalDone} / ${totalEntries}` })]));
  }
}

function matchesSearch(text, needle) {
  return typeof text === 'string' && text.toLowerCase().includes(needle);
}

function getComments(filename, key) {
  return (STATE.comments[filename] && STATE.comments[filename][key]) || [];
}
function commentKey(filename, key) { return filename + '\u0001' + key; }
const OPEN_COMMENTS = new Set();
const OPEN_HISTORY = new Set();
const OPEN_SUGGESTIONS = new Set();
const OPEN_REPLY = new Set();

function getSuggestions(filename, key) {
  return (STATE.suggestions[filename] && STATE.suggestions[filename][key]) || [];
}

function gatherRows() {
  const search = document.getElementById('searchBox').value.trim().toLowerCase();
  const filter = document.getElementById('filterSelect').value;
  const userFilter = document.getElementById('userFilterSelect').value;
  const global = document.getElementById('globalSearchToggle').checked;
  const filenames = global ? Object.keys(STATE.files).sort() : (STATE.activeFile ? [STATE.activeFile] : []);
  const rows = [];
  for (const filename of filenames) {
    const f = STATE.files[filename];
    for (const key of f.order) {
      const baseVal = f.baseline[key];
      const curVal = currentValue(filename, key);
      const edited = curVal !== baseVal;
      const rowComments = getComments(filename, key);
      const approval = STATE.approvals[filename] && STATE.approvals[filename][key];
      const lock = STATE.locks[filename] && STATE.locks[filename][key];
      const mentionsMe = rowComments.some((c) => Array.isArray(c.mentions) && c.mentions.includes(AUTH.username));
      const qaIssues = edited ? allQaIssues(baseVal, curVal) : [];
      const meta = STATE.editsMeta[filename] && STATE.editsMeta[filename][key];
      const rowEditor = meta ? meta.editor : null;
      const rowContributors = meta && Array.isArray(meta.contributors) ? meta.contributors : null;
      if (filter === 'untranslated' && edited) continue;
      if (filter === 'edited' && !edited) continue;
      if (filter === 'mismatch' && (!edited || tokensMatch(baseVal, curVal))) continue;
      if (filter === 'qa' && !qaIssues.length) continue;
      if (filter === 'glossary' && !qaIssues.some((i) => i.code === 'glossary')) continue;
      if (filter === 'commented' && !rowComments.length) continue;
      if (filter === 'unresolved' && !rowComments.some((c) => !c.resolved)) continue;
      if (filter === 'mentions' && !mentionsMe) continue;
      if (userFilter && rowEditor !== userFilter) continue;
      if (search && !(matchesSearch(key, search) || matchesSearch(baseVal, search) || matchesSearch(curVal, search))) continue;
      const canEditDirectly = !edited || !rowEditor || rowEditor === AUTH.username || canModerate();
      const rowSuggestions = getSuggestions(filename, key);
      rows.push({ filename, key, baseVal, curVal, edited, editor: rowEditor, contributors: rowContributors, comments: rowComments, approved: !!approval, approvalMeta: approval || null, lock: lock || null, qaIssues, canEditDirectly, suggestions: rowSuggestions });
    }
  }
  return rows;
}

function renderRow(r) {
  const mismatch = r.edited && !tokensMatch(r.baseVal, r.curVal);
  const locked = !r.canEditDirectly;
  const othersWork = !locked && r.edited && r.editor && r.editor !== AUTH.username;
  const row = el('div', { class: 'row' + (r.edited ? ' is-edited' : '') + (mismatch ? ' is-mismatch' : '') + (locked ? ' is-locked' : '') + (othersWork ? ' is-others-work' : ''), 'data-row-id': `${r.filename}\u0001${r.key}` });

  const keyCell = el('div', { class: 'keycell' });
  if (document.getElementById('globalSearchToggle').checked) {
    keyCell.appendChild(el('div', { class: 'filebadge', text: r.filename }));
    keyCell.appendChild(document.createElement('br'));
  }
  keyCell.appendChild(document.createTextNode(r.key));
  row.appendChild(keyCell);

  row.appendChild(el('div', { class: 'orig' }, buildOrigCellContent(r.baseVal)));

  const ta = el('textarea', { rows: '1' });
  ta.value = r.curVal ?? '';
  ta.disabled = locked;
  ta.title = locked ? `Already translated by ${r.editor} — use "suggest" below to propose a change` : '';
  ta.addEventListener('focus', () => { publishLock(r.filename, r.key); });
  ta.addEventListener('blur', () => { releaseLock(r.filename, r.key); });
  ta.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      saveEditToServer(r.filename, r.key, ta.value);
      focusNextUntranslatedRow(r.filename, r.key);
    }
  });
  ta.addEventListener('input', () => {
    autoGrow(ta);
    setCurrentValue(r.filename, r.key, ta.value);
    updateStatusCell(row, r.filename, r.key);
    debounceSidebarRefresh();
  });
  row.appendChild(ta);

  const status = el('div', { class: 'status-col' });
  const stateGroup = [];
  if (r.edited) {
    if (r.editor) {
      const others = (r.contributors || []).filter((u) => u !== r.editor);
      const contribSuffix = others.length ? ` +${others.length}` : '';
      const contribTitleSuffix = others.length ? ` · also worked on by ${others.join(', ')}` : '';
      const nameHtml = `<span class="badge-name">${esc(r.editor)}${esc(contribSuffix)}</span>`;
      stateGroup.push(locked
        ? el('div', {
            class: 'badge edited edited-by-badge is-locked',
            title: `Locked — only ${esc(r.editor)} or a reviewer/admin can edit this directly. Use suggest to propose a change.${esc(contribTitleSuffix)}`,
            html: ICONS.lockClosed + `edited by ${nameHtml}`,
          })
        : el('div', { class: 'badge edited edited-by-badge', title: contribTitleSuffix ? `edited by ${r.editor}${contribTitleSuffix}` : '', html: `edited by ${nameHtml}` }));
    } else {
      stateGroup.push(el('div', { class: 'badge edited', text: 'edited' }));
    }
    stateGroup.push(el('div', { class: 'badge ' + (mismatch ? 'mismatch' : 'tokens'), text: mismatch ? 'token mismatch' : 'tokens ok' }));
    if (r.qaIssues && r.qaIssues.length) {
      stateGroup.push(el('div', { class: 'badge qa', title: r.qaIssues.map((i) => i.label).join(', '), text: `qa ⚠ ${r.qaIssues.length}` }));
    }
  } else {
    stateGroup.push(el('div', { class: 'badge untranslated', text: 'untranslated' }));
  }
  status.appendChild(el('div', { class: 'status-group' }, stateGroup));

  const accessGroup = [];
  if (othersWork) {
    accessGroup.push(el('div', { class: 'badge overwrite-warn', title: `Saving here overwrites ${r.editor}'s translation`, text: '⚠ overwrites' }));
  }
  if (r.lock && r.lock.username && r.lock.username !== getEditorName()) {
    accessGroup.push(el('div', { class: 'badge lock', text: `in use · ${r.lock.username}` }));
  }
  if (r.approved) accessGroup.push(el('div', { class: 'badge approved', text: 'approved' }));
  if (accessGroup.length) status.appendChild(el('div', { class: 'status-group' }, accessGroup));

  const unresolvedCount = r.comments.filter((c) => !c.resolved).length;
  const commentClass = r.comments.length ? (unresolvedCount ? ' has-open' : ' has-resolved') : '';
  const commentBtn = el('button', {
    class: 'comment-toggle' + commentClass,
    html: ICONS.comment + '<span>Comment</span>' + (r.comments.length ? `<span class="rm-badge">${r.comments.length}</span>` : ''),
    onclick: () => { toggleComments(r.filename, r.key); },
  });
  const historyBtn = el('button', {
    class: 'history-toggle' + (OPEN_HISTORY.has(historyKey(r.filename, r.key)) ? ' active' : ''),
    html: ICONS.history + '<span>History</span>',
    onclick: () => { toggleHistory(r.filename, r.key); },
  });
  const tmBtn = el('button', {
    class: 'tm-toggle' + (OPEN_TM.has(historyKey(r.filename, r.key)) ? ' active' : ''),
    html: ICONS.tm + '<span>TM</span>',
    title: 'Find similar translated strings',
    onclick: () => { toggleTm(r.filename, r.key, r.baseVal); },
  });
  const suggestionBtn = el('button', {
    class: 'suggestion-toggle' + (r.suggestions.length ? ' has-pending' : '') + (OPEN_SUGGESTIONS.has(historyKey(r.filename, r.key)) ? ' active' : ''),
    html: ICONS.suggestion + '<span>Suggest</span>' + (r.suggestions.length ? `<span class="rm-badge">${r.suggestions.length}</span>` : ''),
    title: locked ? 'Propose a change without overwriting the current translation' : 'View or leave suggestions',
    onclick: () => { toggleSuggestions(r.filename, r.key); },
  });
  const menuItems = [suggestionBtn, el('div', { class: 'row-menu-divider' }), historyBtn, tmBtn];
  if (STATE.projectRole === 'admin' || STATE.projectRole === 'reviewer') {
    menuItems.push(el('button', {
      class: 'approval-toggle' + (r.approved ? ' active' : ''),
      html: ICONS.approve + (r.approved ? '<span>Approved</span>' : '<span>Approve</span>'),
      onclick: () => { toggleApproval(r.filename, r.key); },
    }));
  }
  if (r.edited && r.editor && r.editor !== AUTH.username) {
    menuItems.push(el('div', { class: 'row-menu-divider' }));
    menuItems.push(el('button', {
      class: 'report-link-btn',
      html: ICONS.report + `<span>Report ${esc(r.editor)}'s translation</span>`,
      onclick: () => { openReportModal(r.editor, r.filename, r.key); },
    }));
  }

  const hasFlag = r.suggestions.length > 0;
  const menu = el('div', { class: 'row-menu' }, menuItems);
  const menuBtn = el('button', {
    class: 'row-menu-btn' + (hasFlag ? ' has-flag' : ''),
    text: '⋯',
    title: 'More actions',
    onclick: (e) => {
      e.stopPropagation();
      const wasOpen = menu.classList.contains('open');
      document.querySelectorAll('.row-menu.open').forEach((m) => m.classList.remove('open'));
      if (!wasOpen) menu.classList.add('open');
    },
  });
  status.appendChild(el('div', { class: 'row-actions-visible' }, [commentBtn, el('div', { class: 'row-menu-wrap' }, [menuBtn, menu])]));
  row.appendChild(status);

  requestAnimationFrame(() => autoGrow(ta));
  return row;
}

// A string's comment panel shows on its own once it has comments; this button
// exists for the empty case (reveal it so you can write the first one) and,
// either way, scrolls to and focuses the comment box.
function toggleComments(filename, key) {
  const k = commentKey(filename, key);
  OPEN_COMMENTS.add(k);
  renderTable();
  setTimeout(() => {
    // Table and Zen views both stay in the DOM (CSS-hidden, not removed), so
    // scope the lookup to whichever one is actually on screen.
    const container = document.getElementById(STATE.zenMode ? 'zenWrap' : 'tableWrap');
    const rowEl = container && container.querySelector(`[data-row-id="${k}"]`);
    if (!rowEl) return;
    const panel = rowEl.classList.contains('comment-panel')
      ? rowEl
      : (rowEl.nextElementSibling && rowEl.nextElementSibling.classList.contains('comment-panel')
        ? rowEl.nextElementSibling
        : rowEl.querySelector('.comment-panel'));
    if (!panel) return;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const ta = panel.querySelector('.comment-add textarea');
    if (ta) ta.focus();
  }, 60);
}

function historyKey(filename, key) { return filename + '\u0001' + key; }
function toggleHistory(filename, key) {
  const k = historyKey(filename, key);
  if (OPEN_HISTORY.has(k)) { OPEN_HISTORY.delete(k); renderTable(); return; }
  OPEN_HISTORY.add(k);
  if (!STATE.historyCache[k]) {
    loadHistory(filename, key).then(() => renderTable()).catch(() => renderTable());
  } else {
    renderTable();
  }
}

async function loadHistory(filename, key) {
  const k = historyKey(filename, key);
  try {
    const res = await fetch(`/api/history?filename=${encodeURIComponent(filename)}&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    STATE.historyCache[k] = data.entries || [];
  } catch (e) {
    STATE.historyCache[k] = [];
  }
}

/* ---------- suggestions: propose a change without overwriting the current translation ---------- */

function toggleSuggestions(filename, key) {
  const k = historyKey(filename, key);
  if (OPEN_SUGGESTIONS.has(k)) OPEN_SUGGESTIONS.delete(k); else OPEN_SUGGESTIONS.add(k);
  renderTable();
}

function renderSuggestionsPanel(r) {
  const panel = el('div', { class: 'suggestion-panel' });
  const canApply = r.canEditDirectly;

  if (!r.suggestions.length) {
    panel.appendChild(el('div', { class: 'suggestion-empty', text: 'No suggestions yet.' }));
  }
  for (const s of r.suggestions) {
    const item = el('div', { class: 'suggestion-item' });
    const body = el('div', { class: 'suggestion-body' }, [
      el('div', { class: 'suggestion-meta' }, [
        buildAvatarEl(s.author, 'mini-avatar'),
        el('span', { class: 'sauthor', text: s.author }),
        el('span', { text: new Date(s.ts).toLocaleString() }),
      ]),
      el('div', { class: 'suggestion-text', text: s.value }),
    ]);
    item.appendChild(body);
    const actions = el('div', { class: 'suggestion-actions' });
    if (canApply) {
      actions.appendChild(el('button', { text: 'Apply', onclick: () => applySuggestion(r.filename, r.key, s.id) }));
    }
    if (s.author === AUTH.username || canModerate()) {
      actions.appendChild(el('button', { class: 'danger', text: 'Dismiss', onclick: () => deleteSuggestion(r.filename, r.key, s.id) }));
    }
    item.appendChild(actions);
    panel.appendChild(item);
  }

  const addRow = el('div', { class: 'suggestion-add' });
  const ta = el('textarea', { rows: '1', placeholder: canApply ? 'Leave a suggestion for whoever edits this next…' : 'Suggest a better translation…' });
  ta.value = canApply ? '' : (r.curVal ?? '');
  const submit = () => {
    const text = ta.value.trim();
    if (!text) return;
    submitSuggestion(r.filename, r.key, text);
    ta.value = '';
  };
  addRow.appendChild(ta);
  addRow.appendChild(el('button', { class: 'btn primary', text: 'Suggest', onclick: submit }));
  panel.appendChild(addRow);

  return panel;
}

async function submitSuggestion(filename, key, value) {
  try {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'could not add suggestion');
    await fetchState();
    renderTable();
    toast('Suggestion added');
  } catch (e) {
    toast(e.message);
  }
}

async function applySuggestion(filename, key, id) {
  try {
    const res = await fetch('/api/suggestions/apply', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'could not apply suggestion');
    await fetchState();
    renderTable();
    renderFileList();
    toast('Suggestion applied');
  } catch (e) {
    toast(e.message);
  }
}

async function deleteSuggestion(filename, key, id) {
  try {
    const res = await fetch('/api/suggestions', {
      method: 'DELETE',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'could not remove suggestion');
    await fetchState();
    renderTable();
    if (data.removed) {
      toast('Suggestion dismissed', {
        actionLabel: 'Undo',
        duration: 6000,
        onAction: () => restoreSuggestion(filename, key, data.removed),
      });
    }
  } catch (e) {
    toast(e.message);
  }
}

async function restoreSuggestion(filename, key, suggestion) {
  try {
    const res = await fetch('/api/suggestions/restore', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, suggestion }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'could not restore suggestion');
    await fetchState();
    renderTable();
    toast('Suggestion restored');
  } catch (e) {
    toast('Could not undo: ' + e.message);
  }
}

function renderHistoryPanel(filename, key) {
  const k = historyKey(filename, key);
  const entries = STATE.historyCache[k] || [];
  const panel = el('div', { class: 'history-panel' });
  if (!entries.length) {
    panel.appendChild(el('div', { class: 'history-empty', text: 'No prior versions yet.' }));
    return panel;
  }
  for (const entry of entries) {
    const item = el('div', { class: 'history-item' });
    item.appendChild(el('div', { class: 'hmeta', text: `${entry.editor || 'unknown'} · ${new Date(entry.ts).toLocaleString()}${entry.reverted ? ' · reverted' : ''}` }));
    item.appendChild(el('div', { class: 'comment-text', text: entry.value ?? '' }));
    panel.appendChild(item);
  }
  return panel;
}

const OPEN_TM = new Set();
function toggleTm(filename, key, baseVal) {
  const k = historyKey(filename, key);
  if (OPEN_TM.has(k)) { OPEN_TM.delete(k); renderTable(); return; }
  OPEN_TM.add(k);
  if (!STATE.tmCache[k]) {
    loadTm(filename, key, baseVal).then(() => renderTable()).catch(() => renderTable());
  } else {
    renderTable();
  }
}

async function loadTm(filename, key, baseVal) {
  const k = historyKey(filename, key);
  try {
    const url = `/api/tm/search?q=${encodeURIComponent(baseVal || '')}&file=${encodeURIComponent(filename)}&key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    const data = await res.json();
    STATE.tmCache[k] = data.matches || [];
  } catch (e) {
    STATE.tmCache[k] = [];
  }
}

function renderTmPanel(r) {
  const k = historyKey(r.filename, r.key);
  const matches = STATE.tmCache[k] || [];
  const panel = el('div', { class: 'tm-panel' });
  if (!matches.length) {
    panel.appendChild(el('div', { class: 'tm-empty', text: 'No similar strings found elsewhere in the project yet.' }));
    return panel;
  }
  for (const m of matches) {
    const item = el('div', { class: 'tm-item' });
    item.appendChild(el('div', { class: 'tm-score', text: Math.round(m.score * 100) + '%' }));
    const body = el('div', { class: 'tm-body' }, [
      el('div', { class: 'tm-loc', text: `${m.filename} \u00b7 ${m.key}${m.editor ? ' \u00b7 ' + m.editor : ''}` }),
      el('div', { class: 'tm-src', text: 'src: ' + (m.source ?? '') }),
      el('div', { class: 'tm-tgt', text: m.target ?? '' }),
    ]);
    item.appendChild(body);
    item.appendChild(el('button', {
      class: 'tm-use',
      html: 'Use' + ICONS.arrow,
      onclick: () => insertTmMatch(r.filename, r.key, m.target),
    }));
    panel.appendChild(item);
  }
  return panel;
}

function insertTmMatch(filename, key, value) {
  setCurrentValue(filename, key, value);
  // The row is a plain `.row` in the table view but a `.zen-card` in Zen mode,
  // and only the table view carries a `.status-col` for updateStatusCell to patch.
  // Re-rendering (which already knows how to draw either view) is the one path
  // that works correctly no matter which view is active.
  renderTable();
  const target = document.querySelector(`[data-row-id="${filename}\u0001${key}"]`);
  const ta = target ? target.querySelector('textarea') : document.querySelector('#zenCardWrap textarea');
  if (ta) { ta.focus(); autoGrow(ta); }
  debounceSidebarRefresh();
}

/* ---- @mention autocomplete for comment/reply textareas ---- */

let MENTION_STATE = null; // { textarea, start, end, items, activeIndex }

function closeMentionDropdown() {
  document.getElementById('mentionDropdown').classList.remove('open');
  MENTION_STATE = null;
}

function renderMentionDropdown() {
  const dd = document.getElementById('mentionDropdown');
  dd.innerHTML = '';
  if (!MENTION_STATE || !MENTION_STATE.items.length) { dd.classList.remove('open'); return; }
  MENTION_STATE.items.forEach((username, i) => {
    const item = el('div', { class: 'mention-item' + (i === MENTION_STATE.activeIndex ? ' active' : '') }, [
      buildAvatarEl(username, 'mini-avatar'),
      el('span', { text: username }),
    ]);
    item.addEventListener('mousedown', (e) => { e.preventDefault(); selectMention(username); });
    dd.appendChild(item);
  });
  const rect = MENTION_STATE.textarea.getBoundingClientRect();
  dd.style.left = Math.round(rect.left) + 'px';
  dd.style.top = Math.round(rect.bottom + 4) + 'px';
  dd.classList.add('open');
}

function selectMention(username) {
  const { textarea, start, end } = MENTION_STATE;
  const value = textarea.value;
  const insertion = '@' + username + ' ';
  textarea.value = value.slice(0, start) + insertion + value.slice(end);
  const cursor = start + insertion.length;
  textarea.setSelectionRange(cursor, cursor);
  textarea.focus();
  closeMentionDropdown();
}

function handleMentionInput(textarea) {
  const caret = textarea.selectionStart;
  const uptoCaret = textarea.value.slice(0, caret);
  const match = uptoCaret.match(/(?:^|\s)@([a-zA-Z0-9_.-]{0,32})$/);
  if (!match) { closeMentionDropdown(); return; }
  const query = match[1].toLowerCase();
  const start = caret - match[1].length - 1;
  const items = (STATE.members || [])
    .filter((u) => u !== AUTH.username && u.toLowerCase().startsWith(query))
    .slice(0, 8);
  if (!items.length) { closeMentionDropdown(); return; }
  MENTION_STATE = { textarea, start, end: caret, items, activeIndex: 0 };
  renderMentionDropdown();
}

// Returns true if it consumed the keypress (dropdown open), so the caller's
// own Enter-to-submit handler should skip acting on this keystroke.
function handleMentionKeydown(e, textarea) {
  if (!MENTION_STATE || MENTION_STATE.textarea !== textarea) return false;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    MENTION_STATE.activeIndex = (MENTION_STATE.activeIndex + 1) % MENTION_STATE.items.length;
    renderMentionDropdown();
    return true;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    MENTION_STATE.activeIndex = (MENTION_STATE.activeIndex - 1 + MENTION_STATE.items.length) % MENTION_STATE.items.length;
    renderMentionDropdown();
    return true;
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    selectMention(MENTION_STATE.items[MENTION_STATE.activeIndex]);
    return true;
  }
  if (e.key === 'Escape') {
    closeMentionDropdown();
    return true;
  }
  return false;
}

function attachMentionAutocomplete(textarea) {
  textarea.addEventListener('input', () => handleMentionInput(textarea));
  textarea.addEventListener('blur', () => setTimeout(closeMentionDropdown, 150));
}

function buildCommentActionRow(r, c, { isReply } = {}) {
  const reactions = c.reactions || {};
  let likeCount = 0, dislikeCount = 0;
  for (const rx of Object.values(reactions)) { if (rx === 'like') likeCount++; else if (rx === 'dislike') dislikeCount++; }
  const myReaction = reactions[AUTH.username] || null;
  const row = el('div', { class: 'comment-action-row' }, [
    el('button', {
      class: 'reaction-btn like' + (myReaction === 'like' ? ' active' : ''),
      text: `\u{1F44C} ${likeCount}`,
      onclick: () => reactToComment(r.filename, r.key, c.id, 'like'),
    }),
    el('button', {
      class: 'reaction-btn dislike' + (myReaction === 'dislike' ? ' active' : ''),
      text: `\u{1F44E} ${dislikeCount}`,
      onclick: () => reactToComment(r.filename, r.key, c.id, 'dislike'),
    }),
  ]);
  if (!isReply) {
    row.appendChild(el('button', {
      class: 'comment-action-link reply-link',
      text: 'Reply',
      onclick: () => {
        if (OPEN_REPLY.has(c.id)) OPEN_REPLY.delete(c.id); else OPEN_REPLY.add(c.id);
        renderTable();
      },
    }));
    row.appendChild(el('button', {
      class: 'comment-action-link resolve-link' + (c.resolved ? ' is-resolved' : ''),
      text: c.resolved ? 'Unresolve' : 'Resolve',
      onclick: () => setCommentResolved(r.filename, r.key, c.id, !c.resolved),
    }));
  }
  if (c.author === getEditorName() || STATE.projectRole === 'admin' || STATE.projectRole === 'reviewer') {
    row.appendChild(el('button', { class: 'comment-action-link delete-link', text: 'Delete', onclick: () => deleteComment(r.filename, r.key, c.id) }));
  }
  if (c.author !== AUTH.username) {
    row.appendChild(el('button', { class: 'comment-action-link report-link', text: 'Report', onclick: () => openReportModal(c.author) }));
  }
  return row;
}

const EXPANDED_REPLIES = new Set();

function renderCommentsPanel(r) {
  const panel = el('div', { class: 'comment-panel' });
  const topLevel = r.comments.filter((c) => !c.parentId);
  const repliesByParent = {};
  for (const c of r.comments) {
    if (!c.parentId) continue;
    if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = [];
    repliesByParent[c.parentId].push(c);
  }
  for (const c of topLevel) {
    const item = el('div', { class: 'comment-item' + (c.resolved ? ' resolved' : '') });
    item.appendChild(buildAvatarEl(c.author, 'mini-avatar comment-avatar comment-avatar-col'));
    const body = el('div', { class: 'comment-body' });
    body.appendChild(el('div', { class: 'comment-header' }, [
      el('span', { class: 'cauthor', text: c.author }),
      el('span', { class: 'ctime', text: new Date(c.ts).toLocaleString() }),
    ]));
    const mentionsYou = Array.isArray(c.mentions) && c.mentions.includes(AUTH.username);
    if (mentionsYou) body.appendChild(el('div', { class: 'comment-text', text: '↳ mentions you' }));
    body.appendChild(el('div', { class: 'comment-text', text: c.text }));
    body.appendChild(buildCommentActionRow(r, c));
    item.appendChild(body);
    panel.appendChild(item);

    const replies = repliesByParent[c.id] || [];
    if (replies.length && !EXPANDED_REPLIES.has(c.id)) {
      panel.appendChild(el('button', {
        class: 'comment-view-replies',
        text: `\u{1F4AC} View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`,
        onclick: () => { EXPANDED_REPLIES.add(c.id); renderTable(); },
      }));
    }
    if (replies.length && EXPANDED_REPLIES.has(c.id)) {
      panel.appendChild(el('button', {
        class: 'comment-view-replies',
        text: '\u{1F4AC} Hide replies',
        onclick: () => { EXPANDED_REPLIES.delete(c.id); renderTable(); },
      }));
    }

    for (const reply of (EXPANDED_REPLIES.has(c.id) ? replies : [])) {
      const rItem = el('div', { class: 'comment-item is-reply' });
      rItem.appendChild(buildAvatarEl(reply.author, 'mini-avatar comment-avatar comment-avatar-col'));
      const rBody = el('div', { class: 'comment-body' });
      rBody.appendChild(el('div', { class: 'comment-header' }, [
        el('span', { class: 'cauthor', text: reply.author }),
        el('span', { class: 'ctime', text: new Date(reply.ts).toLocaleString() }),
      ]));
      const replyMentionsYou = Array.isArray(reply.mentions) && reply.mentions.includes(AUTH.username);
      if (replyMentionsYou) rBody.appendChild(el('div', { class: 'comment-text', text: '↳ mentions you' }));
      rBody.appendChild(el('div', { class: 'comment-text', text: reply.text }));
      rBody.appendChild(buildCommentActionRow(r, reply, { isReply: true }));
      rItem.appendChild(rBody);

      panel.appendChild(rItem);
    }

    if (OPEN_REPLY.has(c.id)) {
      const replyBox = el('div', { class: 'comment-reply-box' });
      const rta = el('textarea', { rows: '1', placeholder: `Reply to ${c.author}…` });
      const submitReply = () => {
        const text = rta.value.trim();
        if (!text) return;
        addComment(r.filename, r.key, text, c.id);
        OPEN_REPLY.delete(c.id);
      };
      rta.addEventListener('keydown', (e) => {
        if (handleMentionKeydown(e, rta)) return;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); }
      });
      attachMentionAutocomplete(rta);
      replyBox.appendChild(rta);
      replyBox.appendChild(el('button', { class: 'btn primary', text: 'Reply', onclick: submitReply }));
      panel.appendChild(replyBox);
    }
  }

  const addRow = el('div', { class: 'comment-add' });
  const ta = el('textarea', { rows: '1', placeholder: 'Flag an issue with this line\u2026' });
  const submit = () => {
    const text = ta.value.trim();
    if (!text) return;
    addComment(r.filename, r.key, text);
    ta.value = '';
  };
  ta.addEventListener('keydown', (e) => {
    if (handleMentionKeydown(e, ta)) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  attachMentionAutocomplete(ta);
  addRow.appendChild(ta);
  addRow.appendChild(el('button', { class: 'btn primary', text: 'Comment', onclick: submit }));
  panel.appendChild(addRow);

  return panel;
}

async function reactToComment(filename, key, id, reaction) {
  try {
    await fetch('/api/comments/react', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, id, reaction }),
    });
    await fetchState();
    renderTable();
  } catch (e) {
    toast('Could not update reaction');
  }
}

async function addComment(filename, key, text, parentId) {
  try {
    await fetch('/api/comments', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, text, parentId: parentId || null }),
    });
    await fetchState();
    renderTable();
  } catch (e) {
    toast('Could not post comment');
  }
}
async function setCommentResolved(filename, key, id, resolved) {
  try {
    await fetch('/api/comments/resolve', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, id, resolved }),
    });
    await fetchState();
    renderTable();
  } catch (e) {
    toast('Could not update comment');
  }
}
async function deleteComment(filename, key, id) {
  try {
    const res = await fetch('/api/comments', {
      method: 'DELETE',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'could not delete comment');
    await fetchState();
    renderTable();
    if (data.removed && data.removed.length) {
      const count = data.removed.length;
      toast(count > 1 ? `Comment deleted (with ${count - 1} ${count === 2 ? 'reply' : 'replies'})` : 'Comment deleted', {
        actionLabel: 'Undo',
        duration: 6000,
        onAction: () => restoreComments(filename, key, data.removed),
      });
    }
  } catch (e) {
    toast('Could not delete comment');
  }
}

async function restoreComments(filename, key, comments) {
  try {
    const res = await fetch('/api/comments/restore', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, comments }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'could not restore comment');
    await fetchState();
    renderTable();
    toast(comments.length > 1 ? 'Comment and replies restored' : 'Comment restored');
  } catch (e) {
    toast('Could not undo: ' + e.message);
  }
}

async function toggleApproval(filename, key) {
  try {
    await fetch('/api/approve', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ filename, key, approved: !STATE.approvals[filename]?.[key] }),
    });
    await fetchState();
    renderTable();
  } catch (e) {
    toast('Could not update approval');
  }
}

function updateStatusCell(rowNode, filename, key) {
  const baseVal = STATE.files[filename].baseline[key];
  const curVal = currentValue(filename, key);
  const edited = curVal !== baseVal;
  const mismatch = edited && !tokensMatch(baseVal, curVal);
  const approval = STATE.approvals[filename] && STATE.approvals[filename][key];
  const lock = STATE.locks[filename] && STATE.locks[filename][key];
  rowNode.classList.toggle('is-edited', edited);
  rowNode.classList.toggle('is-mismatch', mismatch);
  const status = rowNode.querySelector('.status-col');
  const menuWrap = status.querySelector('.row-menu-wrap');
  status.innerHTML = '';
  const stateGroup = [];
  if (edited) {
    stateGroup.push(el('div', { class: 'badge edited edited-by-badge', html: `edited by <span class="badge-name">${esc(getEditorName() || 'anonymous')}</span>` }));
    stateGroup.push(el('div', { class: 'badge ' + (mismatch ? 'mismatch' : 'tokens'), text: mismatch ? 'token mismatch' : 'tokens ok' }));
    const qaIssues = allQaIssues(baseVal, curVal);
    if (qaIssues.length) {
      stateGroup.push(el('div', { class: 'badge qa', title: qaIssues.map((i) => i.label).join(', '), text: `qa \u26A0 ${qaIssues.length}` }));
    }
  } else {
    stateGroup.push(el('div', { class: 'badge untranslated', text: 'untranslated' }));
  }
  status.appendChild(el('div', { class: 'status-group' }, stateGroup));

  const accessGroup = [];
  if (lock && lock.username && lock.username !== getEditorName()) accessGroup.push(el('div', { class: 'badge lock', text: `in use · ${lock.username}` }));
  if (approval) accessGroup.push(el('div', { class: 'badge approved', text: 'approved' }));
  if (accessGroup.length) status.appendChild(el('div', { class: 'status-group' }, accessGroup));
  if (menuWrap) status.appendChild(menuWrap);
}

function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
}

function focusNextUntranslatedRow(filename, key) {
  const rows = gatherRows();
  const currentIndex = rows.findIndex((row) => row.filename === filename && row.key === key);
  if (currentIndex < 0) return;
  const next = rows.slice(currentIndex + 1).find((row) => !row.edited);
  if (!next) return;
  const target = document.querySelector(`[data-row-id="${next.filename}\u0001${next.key}"]`);
  if (target) {
    const ta = target.querySelector('textarea');
    if (ta) { ta.focus(); ta.select(); }
  }
}

let sidebarRefreshTimer = null;
function debounceSidebarRefresh() {
  clearTimeout(sidebarRefreshTimer);
  sidebarRefreshTimer = setTimeout(renderFileList, 500);
}

function renderTable() {
  syncFilterSegmentedUI('filterSegmented', 'filterMoreWrap', 'filterMoreMenu', 'filterSelect');
  populateUserFilter();
  if (STATE.zenMode) { renderZen(); return; }
  const wrap = document.getElementById('tableWrap');
  const pager = document.getElementById('pager');
  const statPill = document.getElementById('fileStat');
  wrap.innerHTML = '';

  if (!Object.keys(STATE.files).length) {
    wrap.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'glyph', text: '\u201c\u201d' }),
      el('p', { text: 'No source files on the server yet. Use "Upload / update source files" on the left to add the translation JSON files.' }),
    ]));
    pager.style.display = 'none';
    statPill.textContent = '';
    return;
  }
  if (!STATE.activeFile && !document.getElementById('globalSearchToggle').checked) {
    wrap.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'glyph', text: '\u2192' }),
      el('p', { text: 'Pick a file from the left to start editing, or check "all files" to search across everything.' }),
    ]));
    pager.style.display = 'none';
    statPill.textContent = '';
    return;
  }

  const rows = gatherRows();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  STATE.page = Math.min(STATE.page, totalPages - 1);
  const startIdx = STATE.page * PAGE_SIZE;
  const pageRows = rows.slice(startIdx, startIdx + PAGE_SIZE);

  if (!pageRows.length) {
    wrap.appendChild(el('div', { class: 'empty-state' }, [el('div', { class: 'glyph', text: '\u2014' }), el('p', { text: 'No entries match this search and filter.' })]));
  } else {
    for (const r of pageRows) {
      wrap.appendChild(renderRow(r));
      if (r.comments.length || OPEN_COMMENTS.has(commentKey(r.filename, r.key))) wrap.appendChild(renderCommentsPanel(r));
      if (OPEN_HISTORY.has(historyKey(r.filename, r.key))) wrap.appendChild(renderHistoryPanel(r.filename, r.key));
      if (OPEN_TM.has(historyKey(r.filename, r.key))) wrap.appendChild(renderTmPanel(r));
      if (r.suggestions.length || OPEN_SUGGESTIONS.has(historyKey(r.filename, r.key))) wrap.appendChild(renderSuggestionsPanel(r));
    }
  }

  statPill.innerHTML = '';
  statPill.appendChild(document.createTextNode(`${rows.length} matching \u00b7 showing ${pageRows.length ? startIdx + 1 : 0}\u2013${startIdx + pageRows.length}`));

  pager.style.display = 'flex';
  pager.innerHTML = '';
  const prevBtn = el('button', { html: ICONS.arrowLeft + 'Prev', onclick: () => { STATE.page = Math.max(0, STATE.page - 1); renderTable(); } });
  prevBtn.disabled = STATE.page === 0;
  const nextBtn = el('button', { html: 'Next' + ICONS.arrow, onclick: () => { STATE.page = Math.min(totalPages - 1, STATE.page + 1); renderTable(); } });
  nextBtn.disabled = STATE.page >= totalPages - 1;

  const jumpToPage = () => {
    let n = parseInt(pageInput.value, 10);
    if (!Number.isFinite(n)) return;
    n = Math.max(1, Math.min(totalPages, n));
    STATE.page = n - 1;
    renderTable();
  };
  const pageInput = el('input', { class: 'page-input', type: 'text', inputmode: 'numeric', value: String(STATE.page + 1) });
  pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); jumpToPage(); }
  });
  pageInput.addEventListener('blur', jumpToPage);

  pager.appendChild(prevBtn);
  pager.appendChild(el('span', { text: 'page' }));
  pager.appendChild(pageInput);
  pager.appendChild(el('span', { text: `/ ${totalPages}` }));
  pager.appendChild(nextBtn);
}

/* ---------- zen mode: one string at a time ---------- */

function renderZen() {
  document.getElementById('tableWrap').style.display = 'none';
  document.getElementById('pager').style.display = 'none';
  document.getElementById('zenWrap').style.display = 'flex';

  const cardWrap = document.getElementById('zenCardWrap');
  const posInput = document.getElementById('zenPosInput');
  const posTotal = document.getElementById('zenPosTotal');
  const progress = document.getElementById('zenFileProgress');
  const firstBtn = document.getElementById('zenFirstBtn');
  const prevBtn = document.getElementById('zenPrevBtn');
  const nextBtn = document.getElementById('zenNextBtn');
  const lastBtn = document.getElementById('zenLastBtn');

  const rows = gatherRows();

  if (!rows.length) {
    cardWrap.innerHTML = '';
    cardWrap.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'glyph', text: '\u2014' }),
      el('p', { text: Object.keys(STATE.files).length ? 'No entries match this search and filter.' : 'No source files on the server yet.' }),
    ]));
    posInput.value = '0';
    posTotal.textContent = '/ 0';
    progress.innerHTML = '';
    firstBtn.disabled = prevBtn.disabled = nextBtn.disabled = lastBtn.disabled = true;
    return;
  }

  STATE.zenIndex = Math.max(0, Math.min(STATE.zenIndex, rows.length - 1));
  const r = rows[STATE.zenIndex];

  posInput.value = String(STATE.zenIndex + 1);
  posTotal.textContent = '/ ' + rows.length;
  firstBtn.disabled = prevBtn.disabled = STATE.zenIndex === 0;
  nextBtn.disabled = lastBtn.disabled = STATE.zenIndex >= rows.length - 1;

  const f = STATE.files[r.filename];
  const total = f.order.length;
  const done = editedCount(r.filename);
  const pct = total ? Math.round((done / total) * 100) : 0;
  progress.innerHTML = '';
  progress.appendChild(el('span', { text: r.filename }));
  progress.appendChild(el('div', { class: 'zen-progress-bar' }, [el('div', { style: `width:${pct}%` })]));
  progress.appendChild(el('div', { class: 'zen-progress-pct', text: pct + '%' }));

  cardWrap.innerHTML = '';
  cardWrap.appendChild(buildZenCard(r));
}

function buildZenCard(r) {
  const locked = !r.canEditDirectly;
  const othersWork = !locked && r.edited && r.editor && r.editor !== AUTH.username;
  const card = el('div', { class: 'zen-card zen-anim' + (locked ? ' is-locked' : ''), 'data-row-id': commentKey(r.filename, r.key) });

  const srcBlock = el('div', { class: 'zen-block' });
  srcBlock.appendChild(el('div', { class: 'zen-block-label' }, [
    el('span', { text: 'Source' }),
    el('span', { class: 'zen-key', text: r.key }),
  ]));
  srcBlock.appendChild(el('div', { class: 'zen-source-text' }, buildOrigCellContent(r.baseVal)));
  card.appendChild(srcBlock);

  const tgtBlock = el('div', { class: 'zen-block zen-target' + (othersWork ? ' is-others-work' : '') });
  tgtBlock.appendChild(el('div', { class: 'zen-block-label' }, [el('span', { text: r.filename })]));
  const ta = el('textarea', {});
  ta.value = r.curVal ?? '';
  ta.disabled = locked;
  ta.title = locked ? `Already translated by ${r.editor} \u2014 use "suggest" below to propose a change` : '';

  const badges = el('div', { class: 'zen-badges' });
  const renderBadges = () => {
    badges.innerHTML = '';
    const curVal = currentValue(r.filename, r.key);
    const edited = curVal !== r.baseVal;
    const mismatch = edited && !tokensMatch(r.baseVal, curVal);
    if (edited) {
      badges.appendChild(el('div', { class: 'badge edited edited-by-badge', html: `edited by <span class="badge-name">${esc(getEditorName() || 'anonymous')}</span>` }));
      badges.appendChild(el('div', { class: 'badge ' + (mismatch ? 'mismatch' : 'tokens'), text: mismatch ? 'token mismatch' : 'tokens ok' }));
      const qa = allQaIssues(r.baseVal, curVal);
      if (qa.length) badges.appendChild(el('div', { class: 'badge qa', title: qa.map((i) => i.label).join(', '), text: `qa \u26A0 ${qa.length}` }));
    } else {
      badges.appendChild(el('div', { class: 'badge untranslated', text: 'untranslated' }));
    }
    if (locked) {
      badges.appendChild(el('div', { class: 'badge suggest-lock', title: 'Only the translator or a reviewer/admin can edit this directly', html: ICONS.lockClosed + '<span>locked \u2014 suggest only</span>' }));
    }
    if (othersWork) {
      badges.appendChild(el('div', { class: 'badge overwrite-warn', title: `Saving here overwrites ${r.editor}'s translation`, text: '\u26a0 overwrites' }));
    }
  };
  renderBadges();

  ta.addEventListener('focus', () => { publishLock(r.filename, r.key); });
  ta.addEventListener('blur', () => { releaseLock(r.filename, r.key); });
  ta.addEventListener('input', () => {
    autoGrow(ta);
    setCurrentValue(r.filename, r.key, ta.value);
    renderBadges();
    debounceSidebarRefresh();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); saveEditToServer(r.filename, r.key, ta.value); zenNext(); }
  });
  tgtBlock.appendChild(ta);
  tgtBlock.appendChild(badges);
  card.appendChild(tgtBlock);

  const actions = el('div', { class: 'zen-actions' });
  actions.appendChild(el('button', { class: 'btn primary', html: 'Save &amp; Next' + ICONS.arrow, onclick: () => { saveEditToServer(r.filename, r.key, ta.value); zenNext(); } }));
  actions.appendChild(el('button', { class: 'btn ghost', text: 'Save & Stay', onclick: () => { saveEditToServer(r.filename, r.key, ta.value); toast('Saved'); } }));
  actions.appendChild(el('button', { class: 'btn ghost', html: 'Skip' + ICONS.arrow, onclick: () => { zenNext(); } }));
  card.appendChild(actions);

  const toolrow = el('div', { class: 'zen-toolrow' });
  const unresolvedCount = r.comments.filter((c) => !c.resolved).length;
  const commentClass = r.comments.length ? (unresolvedCount ? ' has-open' : ' has-resolved') : '';
  toolrow.appendChild(el('button', {
    class: 'comment-toggle' + commentClass,
    html: ICONS.comment + '<span>Comment</span>' + (r.comments.length ? `<span class="rm-badge">${r.comments.length}</span>` : ''),
    onclick: () => { toggleComments(r.filename, r.key); },
  }));
  toolrow.appendChild(el('button', {
    class: 'suggestion-toggle' + (r.suggestions.length ? ' has-pending' : '') + (OPEN_SUGGESTIONS.has(historyKey(r.filename, r.key)) ? ' active' : ''),
    html: ICONS.suggestion + '<span>Suggest</span>' + (r.suggestions.length ? `<span class="rm-badge">${r.suggestions.length}</span>` : ''),
    onclick: () => { toggleSuggestions(r.filename, r.key); },
  }));
  toolrow.appendChild(el('div', { class: 'zen-toolrow-sep' }));
  toolrow.appendChild(el('button', {
    class: 'history-toggle' + (OPEN_HISTORY.has(historyKey(r.filename, r.key)) ? ' active' : ''),
    html: ICONS.history + '<span>history</span>',
    onclick: () => { toggleHistory(r.filename, r.key); },
  }));
  toolrow.appendChild(el('button', {
    class: 'tm-toggle' + (OPEN_TM.has(historyKey(r.filename, r.key)) ? ' active' : ''),
    html: ICONS.tm + '<span>TM</span>',
    onclick: () => { toggleTm(r.filename, r.key, r.baseVal); },
  }));
  if (STATE.projectRole === 'admin' || STATE.projectRole === 'reviewer') {
    toolrow.appendChild(el('button', {
      class: 'approval-toggle' + (r.approved ? ' active' : ''),
      html: ICONS.approve + (r.approved ? '<span>approved</span>' : '<span>approve</span>'),
      onclick: () => { toggleApproval(r.filename, r.key); },
    }));
  }
  card.appendChild(toolrow);

  if (r.comments.length || OPEN_COMMENTS.has(commentKey(r.filename, r.key))) card.appendChild(renderCommentsPanel(r));
  if (OPEN_HISTORY.has(historyKey(r.filename, r.key))) card.appendChild(renderHistoryPanel(r.filename, r.key));
  if (OPEN_TM.has(historyKey(r.filename, r.key))) card.appendChild(renderTmPanel(r));
  if (r.suggestions.length || OPEN_SUGGESTIONS.has(historyKey(r.filename, r.key))) card.appendChild(renderSuggestionsPanel(r));

  requestAnimationFrame(() => { autoGrow(ta); card.classList.remove('zen-anim'); });
  return card;
}

function zenNext() { STATE.zenIndex += 1; renderZen(); focusZenTextarea(); }
function zenPrev() { STATE.zenIndex = Math.max(0, STATE.zenIndex - 1); renderZen(); focusZenTextarea(); }
function zenFirst() { STATE.zenIndex = 0; renderZen(); focusZenTextarea(); }
function zenLast() { STATE.zenIndex = Math.max(0, gatherRows().length - 1); renderZen(); focusZenTextarea(); }
function focusZenTextarea() {
  requestAnimationFrame(() => {
    const ta = document.querySelector('#zenCardWrap textarea');
    if (ta) { ta.focus(); const v = ta.value; ta.setSelectionRange(v.length, v.length); }
  });
}

function toggleZenMode() {
  STATE.zenMode = !STATE.zenMode;
  document.getElementById('zenToggleBtn').classList.toggle('active', STATE.zenMode);
  if (STATE.zenMode) {
    document.getElementById('tableWrap').style.display = 'none';
    document.getElementById('pager').style.display = 'none';
    document.getElementById('zenWrap').style.display = 'flex';
  } else {
    document.getElementById('zenWrap').style.display = 'none';
    document.getElementById('tableWrap').style.display = '';
  }
  renderTable();
  if (STATE.zenMode) focusZenTextarea();
}

function initZenTab() {
  document.getElementById('zenToggleBtn').addEventListener('click', toggleZenMode);
  document.getElementById('zenFirstBtn').addEventListener('click', zenFirst);
  document.getElementById('zenPrevBtn').addEventListener('click', zenPrev);
  document.getElementById('zenNextBtn').addEventListener('click', zenNext);
  document.getElementById('zenLastBtn').addEventListener('click', zenLast);
  const posInput = document.getElementById('zenPosInput');
  const jump = () => {
    const rows = gatherRows();
    let n = parseInt(posInput.value, 10);
    if (!Number.isFinite(n)) return;
    n = Math.max(1, Math.min(Math.max(rows.length, 1), n));
    STATE.zenIndex = n - 1;
    renderZen();
  };
  posInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); jump(); } });
  posInput.addEventListener('blur', jump);
}

/* A segmented row of buttons for the most-used filter values, plus a "More"
   overflow dropdown for the rest — backed by a hidden <select> so every
   existing consumer that reads/sets that select's .value keeps working
   unchanged. syncFilterSegmentedUI() re-syncs the visible buttons whenever
   the select's value changes some other way (e.g. jumpToEntry resetting it). */
function syncFilterSegmentedUI(wrapId, moreWrapId, moreMenuId, selectId) {
  const wrap = document.getElementById(wrapId);
  const moreWrap = document.getElementById(moreWrapId);
  const moreMenu = document.getElementById(moreMenuId);
  const value = document.getElementById(selectId).value;
  let matchedInMenu = false;
  wrap.querySelectorAll('[data-filter]').forEach((btn) => {
    const isActive = btn.dataset.filter === value;
    btn.classList.toggle('active', isActive);
    if (isActive && moreMenu.contains(btn)) matchedInMenu = true;
  });
  moreWrap.classList.toggle('has-active-child', matchedInMenu);
}

function initFilterSegmented(wrapId, moreWrapId, moreBtnId, moreMenuId, selectId) {
  const wrap = document.getElementById(wrapId);
  const moreWrap = document.getElementById(moreWrapId);
  const moreBtn = document.getElementById(moreBtnId);
  const moreMenu = document.getElementById(moreMenuId);
  const select = document.getElementById(selectId);

  wrap.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      select.value = btn.dataset.filter;
      select.dispatchEvent(new Event('change'));
      syncFilterSegmentedUI(wrapId, moreWrapId, moreMenuId, selectId);
      moreMenu.classList.remove('open');
      moreWrap.classList.remove('open');
    });
  });

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle('open');
    moreWrap.classList.toggle('open', moreMenu.classList.contains('open'));
  });
  document.addEventListener('click', (e) => {
    if (!moreWrap.contains(e.target)) {
      moreMenu.classList.remove('open');
      moreWrap.classList.remove('open');
    }
  });

  syncFilterSegmentedUI(wrapId, moreWrapId, moreMenuId, selectId);
}

function initEditorTab() {
  initFilterSegmented('filterSegmented', 'filterMoreWrap', 'filterMoreBtn', 'filterMoreMenu', 'filterSelect');
  const fileInput = document.getElementById('fileInput');
  document.getElementById('loadBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    const newMap = await readFileListAsJsonMap(e.target.files);
    const diffResults = diffFileSet(STATE.files || {}, newMap);
    const ok = await showUploadPreview(diffResults);
    if (!ok) { fileInput.value = ''; return; }
    const fd = new FormData();
    for (const f of e.target.files) fd.append('files', f);
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: buildJsonHeaders({ contentType: false }), body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'upload failed');
      await fetchState();
      renderFileList();
      renderTable();
      toast('Source files updated for everyone');
    } catch (err) {
      toast('Upload failed: ' + err.message);
    }
    fileInput.value = '';
  });

  let searchDebounce = null;
  document.getElementById('searchBox').addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => { STATE.page = 0; STATE.zenIndex = 0; renderTable(); }, 180);
  });
  document.getElementById('filterSelect').addEventListener('change', () => { STATE.page = 0; STATE.zenIndex = 0; renderTable(); });
  document.getElementById('userFilterSelect').addEventListener('change', () => { STATE.page = 0; STATE.zenIndex = 0; renderTable(); });
  document.getElementById('globalSearchToggle').addEventListener('change', () => { STATE.page = 0; STATE.zenIndex = 0; renderTable(); });
  const exportDropdown = document.getElementById('exportDropdown');
  const exportMenu = document.getElementById('exportMenu');
  document.getElementById('exportMenuToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!exportDropdown.contains(e.target)) exportMenu.classList.remove('open');
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportMenu.classList.remove('open');
    window.location.href = '/api/export';
  });
  document.getElementById('exportFileBtn').addEventListener('click', () => {
    exportMenu.classList.remove('open');
    if (!STATE.activeFile) return;
    window.location.href = '/api/export/' + encodeURIComponent(STATE.activeFile);
  });
  document.getElementById('exportTbxBtn').addEventListener('click', () => {
    exportMenu.classList.remove('open');
    if (!STATE.activeFile) return;
    window.location.href = '/api/export/' + encodeURIComponent(STATE.activeFile) + '/tbx';
  });

  document.getElementById('fileLockBtn').addEventListener('click', async () => {
    const filename = STATE.activeFile;
    if (!filename) return;
    if (STATE.fileLockHeld === filename) {
      await releaseFileLock(filename);
    } else {
      await claimFileLock(filename);
    }
    renderFileLockBtn();
  });

  setInterval(() => {
    if (STATE.fileLockHeld) claimFileLock(STATE.fileLockHeld, true);
  }, 15000);
  window.addEventListener('beforeunload', () => {
    if (STATE.fileLockHeld) {
      navigator.sendBeacon && navigator.sendBeacon('/api/unlock/file', new Blob(
        [JSON.stringify({ filename: STATE.fileLockHeld })], { type: 'application/json' }
      ));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      STATE.page = Math.min(Math.max(1, Math.ceil(gatherRows().length / PAGE_SIZE)) - 1, STATE.page + 1);
      renderTable();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      STATE.page = Math.max(0, STATE.page - 1);
      renderTable();
    }
  });
}

const COMPARE = { old: null, new: null };

function initCompareTab() {
  const oldInput = document.getElementById('oldInput');
  const newInput = document.getElementById('newInput');
  document.getElementById('loadOldBtn').addEventListener('click', () => oldInput.click());
  document.getElementById('loadNewBtn').addEventListener('click', () => newInput.click());
  oldInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    COMPARE.old = await readFileListAsJsonMap(e.target.files);
    document.getElementById('oldCount').textContent = `${Object.keys(COMPARE.old).length} files ready`;
    updateDiffBtn();
  });
  newInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    COMPARE.new = await readFileListAsJsonMap(e.target.files);
    document.getElementById('newCount').textContent = `${Object.keys(COMPARE.new).length} files ready`;
    updateDiffBtn();
  });
  document.getElementById('runDiffBtn').addEventListener('click', runDiff);
}
function updateDiffBtn() {
  document.getElementById('runDiffBtn').disabled = !(COMPARE.old && COMPARE.new);
}
function diffFileSet(oldMap, newMap) {
  const filenames = Array.from(new Set([...Object.keys(oldMap), ...Object.keys(newMap)])).sort();
  const results = [];
  for (const filename of filenames) {
    const oldF = oldMap[filename], newF = newMap[filename];
    const added = [], removed = [], changed = [];
    if (!oldF && newF) { for (const k of newF.order) added.push({ key: k, val: newF.baseline[k] }); }
    else if (oldF && !newF) { for (const k of oldF.order) removed.push({ key: k, val: oldF.baseline[k] }); }
    else {
      const oldKeys = new Set(oldF.order), newKeys = new Set(newF.order);
      for (const k of newF.order) if (!oldKeys.has(k)) added.push({ key: k, val: newF.baseline[k] });
      for (const k of oldF.order) if (!newKeys.has(k)) removed.push({ key: k, val: oldF.baseline[k] });
      for (const k of newF.order) if (oldKeys.has(k) && oldF.baseline[k] !== newF.baseline[k]) changed.push({ key: k, oldVal: oldF.baseline[k], newVal: newF.baseline[k] });
    }
    if (added.length || removed.length || changed.length) results.push({ filename, added, removed, changed });
  }
  return results;
}
function renderDiffResults(results, container, opts = {}) {
  const CAP = opts.cap || 300;
  container.innerHTML = '';
  const totalAdd = results.reduce((s, r) => s + r.added.length, 0);
  const totalDel = results.reduce((s, r) => s + r.removed.length, 0);
  const totalChg = results.reduce((s, r) => s + r.changed.length, 0);
  container.appendChild(el('div', { class: 'diff-summary' }, [
    el('span', { class: 'add', text: `+${totalAdd} added` }),
    el('span', { class: 'del', text: `-${totalDel} removed` }),
    el('span', { class: 'chg', text: `~${totalChg} changed` }),
  ]));
  if (!results.length) {
    container.appendChild(el('p', { style: 'color:var(--ink-faint);font-size:12.5px;', text: opts.emptyText || 'No differences found between the two sets.' }));
    return { totalAdd, totalDel, totalChg };
  }
  for (const r of results) {
    const body = el('div', { class: 'diff-file-body' });
    for (const a of r.added.slice(0, CAP)) body.appendChild(el('div', { class: 'diff-row' }, [el('div', { class: 'dkey' }, [el('span', { class: 'dtag add', text: 'added' }), document.createTextNode(a.key)]), el('div', { class: 'diff-text', text: a.val ?? '' })]));
    for (const rem of r.removed.slice(0, CAP)) body.appendChild(el('div', { class: 'diff-row' }, [el('div', { class: 'dkey' }, [el('span', { class: 'dtag del', text: 'removed' }), document.createTextNode(rem.key)]), el('div', { class: 'diff-text', text: rem.val ?? '' })]));
    for (const c of r.changed.slice(0, CAP)) {
      const rowEl = el('div', { class: 'diff-row' }, [el('div', { class: 'dkey' }, [el('span', { class: 'dtag chg', text: 'changed' }), document.createTextNode(c.key)])]);
      rowEl.appendChild(buildDiffNode(c.oldVal, c.newVal));
      body.appendChild(rowEl);
    }
    const shownTotal = Math.min(r.added.length, CAP) + Math.min(r.removed.length, CAP) + Math.min(r.changed.length, CAP);
    const actualTotal = r.added.length + r.removed.length + r.changed.length;
    if (actualTotal > shownTotal) body.appendChild(el('div', { class: 'diff-row', style: 'color:var(--ink-faint);font-style:italic;', text: `\u2026 ${actualTotal - shownTotal} more not shown (capped at ${CAP} per category)` }));
    const head = el('div', { class: 'diff-file-head' }, [
      el('span', { text: r.filename }),
      el('span', { class: 'counts' }, [
        r.added.length ? el('span', { class: 'add', text: `+${r.added.length}` }) : null,
        r.removed.length ? el('span', { class: 'del', text: `-${r.removed.length}` }) : null,
        r.changed.length ? el('span', { class: 'chg', text: `~${r.changed.length}` }) : null,
      ]),
    ]);
    head.addEventListener('click', () => body.classList.toggle('open'));
    container.appendChild(el('div', { class: 'diff-file' }, [head, body]));
  }
  return { totalAdd, totalDel, totalChg };
}
function runDiff() {
  const results = diffFileSet(COMPARE.old, COMPARE.new);
  renderDiffResults(results, document.getElementById('compareResults'));
}

function computeContributorStats() {
  const perEditor = {};
  let totalEdited = 0;
  for (const [filename, keys] of Object.entries(STATE.editsMeta || {})) {
    for (const [key, meta] of Object.entries(keys)) {
      const editor = (meta.editor || 'anonymous').trim() || 'anonymous';
      if (!perEditor[editor]) perEditor[editor] = { total: 0, perFile: {}, entries: [] };
      const approved = !!(STATE.approvals[filename] && STATE.approvals[filename][key]);
      const entry = { filename, key, value: meta.value, ts: meta.ts || 0, lastModifiedBy: meta.lastModifiedBy || null, approved };
      perEditor[editor].total++;
      if (!perEditor[editor].perFile[filename]) perEditor[editor].perFile[filename] = [];
      perEditor[editor].perFile[filename].push(entry);
      perEditor[editor].entries.push(entry);
      totalEdited++;
    }
  }
  return { perEditor, totalEdited };
}

function bucketEditsByDay(entries, days) {
  const counts = {};
  const buckets = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    buckets.push(dayKey);
    counts[dayKey] = 0;
  }
  for (const e of entries) {
    if (!e.ts) continue;
    const dayKey = new Date(e.ts).toISOString().slice(0, 10);
    if (dayKey in counts) counts[dayKey]++;
  }
  return buckets.map((date) => ({ date, count: counts[date] }));
}

const CONTRIB_SELECTED = new Set();

async function contribBulkApprove(keys, approved) {
  const items = keys.map((k) => {
    const i = k.indexOf(String.fromCharCode(1));
    return { filename: k.slice(0, i), key: k.slice(i + 1), approved };
  });
  if (!items.length) return;
  const label = approved ? 'Approve' : 'Unapprove';
  const ok = await showConfirm({
    title: `${label} ${items.length} ${items.length === 1 ? 'key' : 'keys'}?`,
    message: approved
      ? 'These translations will be marked reviewer-approved.'
      : 'Approval will be removed from these translations.',
    confirmLabel: label,
  });
  if (!ok) return;
  try {
    const res = await fetch('/api/approve/bulk', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'failed');
    for (const it of items) {
      if (!STATE.approvals[it.filename]) STATE.approvals[it.filename] = {};
      if (it.approved) STATE.approvals[it.filename][it.key] = { approver: AUTH.username, ts: Date.now() };
      else delete STATE.approvals[it.filename][it.key];
    }
    for (const k of keys) CONTRIB_SELECTED.delete(k);
    renderContributors();
    if (document.getElementById('view-editor').classList.contains('active')) renderTable();
    toast(`${data.applied ?? items.length} ${label.toLowerCase()}d`);
  } catch (e) {
    toast('Could not update approvals: ' + e.message);
  }
}

function renderContribGraph(entries) {
  const days = bucketEditsByDay(entries, 30);
  const max = Math.max(1, ...days.map((d) => d.count));
  const graph = el('div', { class: 'contrib-graph' });
  for (const d of days) {
    const heightPct = d.count ? Math.max(Math.round((d.count / max) * 100), 6) : 2;
    graph.appendChild(el('div', {
      class: 'bar',
      style: `height:${heightPct}%`,
      title: `${d.date}: ${d.count} edit${d.count === 1 ? '' : 's'}`,
    }));
  }
  return graph;
}

const OPEN_CONTRIB = new Set();
const OPEN_CONTRIB_FILES = new Set();

function renderContributors() {
  const summary = document.getElementById('contribSummary');
  const list = document.getElementById('contribList');
  const scrollTop = list.scrollTop;
  summary.innerHTML = '';
  list.innerHTML = '';

  const { perEditor, totalEdited } = computeContributorStats();
  const names = Object.keys(perEditor).sort((a, b) => perEditor[b].total - perEditor[a].total);

  summary.appendChild(el('div', {}, [document.createTextNode('Translators: '), el('b', { text: String(names.length) })]));
  summary.appendChild(el('div', {}, [document.createTextNode('Total keys translated: '), el('b', { text: String(totalEdited) })]));

  if (!names.length) {
    list.appendChild(el('div', { class: 'contrib-empty', text: 'No translated entries yet.' }));
    return;
  }

  for (const name of names) {
    const data = perEditor[name];
    const pct = totalEdited ? Math.round((data.total / totalEdited) * 100) : 0;

    const bodyOpen = OPEN_CONTRIB.has(name);
    const body = el('div', { class: 'contrib-body' + (bodyOpen ? ' open' : '') });
    body.appendChild(renderContribGraph(data.entries));

    const fileNames = Object.keys(data.perFile).sort((a, b) => data.perFile[b].length - data.perFile[a].length);
    for (const fname of fileNames) {
      const fileEntries = data.perFile[fname].slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
      const fileKey = name + '' + fname;
      const keyListOpen = OPEN_CONTRIB_FILES.has(fileKey);
      const keyList = el('div', { class: 'contrib-key-list' + (keyListOpen ? ' open' : '') });

      const entryKeys = fileEntries.map((e) => historyKey(fname, e.key));
      const rowCheckboxes = [];
      const selectAllCb = el('input', { type: 'checkbox', class: 'row-check' });
      const countEl = el('span', { class: 'contrib-bulk-count' });
      const unapproveBtn = el('button', { class: 'btn', text: 'Unapprove selected' });
      const approveBtn = el('button', { class: 'btn primary', text: 'Approve selected' });
      function refreshBulkBar() {
        const selected = entryKeys.filter((k) => CONTRIB_SELECTED.has(k));
        selectAllCb.checked = entryKeys.length > 0 && selected.length === entryKeys.length;
        selectAllCb.indeterminate = selected.length > 0 && selected.length < entryKeys.length;
        countEl.textContent = selected.length ? `${selected.length} selected` : `${entryKeys.length} key${entryKeys.length === 1 ? '' : 's'}`;
        approveBtn.disabled = selected.length === 0;
        unapproveBtn.disabled = selected.length === 0;
      }
      selectAllCb.addEventListener('change', () => {
        if (selectAllCb.checked) entryKeys.forEach((k) => CONTRIB_SELECTED.add(k));
        else entryKeys.forEach((k) => CONTRIB_SELECTED.delete(k));
        rowCheckboxes.forEach((cb, i) => { cb.checked = CONTRIB_SELECTED.has(entryKeys[i]); });
        refreshBulkBar();
      });
      approveBtn.addEventListener('click', () => contribBulkApprove(entryKeys.filter((k) => CONTRIB_SELECTED.has(k)), true));
      unapproveBtn.addEventListener('click', () => contribBulkApprove(entryKeys.filter((k) => CONTRIB_SELECTED.has(k)), false));
      refreshBulkBar();

      const bulkBar = el('div', { class: 'contrib-key-bulk reviewer-only' }, [
        el('label', { class: 'toolbar-toggle' }, [
          selectAllCb,
          el('span', { class: 'tg-box', html: '<svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1.5 5.2L4 7.7L8.5 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
          document.createTextNode('Select all'),
        ]),
        countEl,
        unapproveBtn,
        approveBtn,
      ]);
      keyList.appendChild(bulkBar);

      fileEntries.forEach((entry, i) => {
        const entryKey = entryKeys[i];
        const cb = el('input', { type: 'checkbox', class: 'row-check reviewer-only' });
        cb.checked = CONTRIB_SELECTED.has(entryKey);
        cb.addEventListener('change', () => {
          if (cb.checked) CONTRIB_SELECTED.add(entryKey); else CONTRIB_SELECTED.delete(entryKey);
          refreshBulkBar();
        });
        rowCheckboxes.push(cb);
        keyList.appendChild(el('div', { class: 'contrib-key-row' }, [
          cb,
          el('span', { class: 'ckey', text: entry.key, title: entry.key }),
          el('span', { class: 'cval', text: entry.value, title: entry.value }),
          entry.approved ? el('span', { class: 'badge approved', text: 'approved' }) : null,
          el('span', { class: 'cts', text: entry.ts ? new Date(entry.ts).toLocaleDateString() : '' }),
          el('button', { class: 'qfix', html: 'Open' + ICONS.arrow, onclick: () => jumpToEntry(fname, entry.key) }),
        ]));
      });
      const fileRow = el('div', { class: 'contrib-file-row' }, [
        el('span', { text: fname }),
        el('span', { text: `${fileEntries.length} key${fileEntries.length === 1 ? '' : 's'}` }),
      ]);
      fileRow.addEventListener('click', () => {
        if (OPEN_CONTRIB_FILES.has(fileKey)) OPEN_CONTRIB_FILES.delete(fileKey); else OPEN_CONTRIB_FILES.add(fileKey);
        keyList.classList.toggle('open');
      });
      body.appendChild(fileRow);
      body.appendChild(keyList);
    }

    const head = el('div', { class: 'contrib-head' }, [
      el('div', { class: 'cname', text: name }),
      el('div', { class: 'cbar' }, [el('div', { style: `width:${pct}%` })]),
      el('div', { class: 'cpct', text: pct + '%' }),
      el('div', { class: 'ccount', text: `${data.total} keys \u00b7 ${fileNames.length} files` }),
    ]);
    head.addEventListener('click', () => {
      if (OPEN_CONTRIB.has(name)) OPEN_CONTRIB.delete(name); else OPEN_CONTRIB.add(name);
      body.classList.toggle('open');
    });

    list.appendChild(el('div', { class: 'contrib-row' }, [head, body]));
  }

  list.scrollTop = scrollTop;
}

let LOG_ENTRIES = [];

async function loadActivityLog() {
  const list = document.getElementById('activityList');
  list.innerHTML = '';
  list.appendChild(el('div', { class: 'contrib-empty', text: 'Loading\u2026' }));
  try {
    const res = await fetch('/api/log?limit=1000');
    if (!res.ok) throw new Error('log fetch failed');
    const data = await res.json();
    LOG_ENTRIES = data.entries || [];
    renderActivityLog();
  } catch (e) {
    list.innerHTML = '';
    list.appendChild(el('div', { class: 'contrib-empty', text: 'Could not load the activity log.' }));
  }
}

function describeLogEntry(e) {
  switch (e.type) {
    case 'edit': return { action: 'edited', detail: [el('span', { class: 'lkey', text: e.key }), document.createTextNode(': ' + (e.valuePreview || ''))] };
    case 'clear': return { action: 'reverted', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'upload': return { action: 'uploaded', detail: [document.createTextNode((e.files || []).join(', ') || '(no files)')] };
    case 'export': return { action: 'exported', detail: [document.createTextNode('full ZIP export')] };
    case 'comment_add': return { action: e.parentId ? 'replied to a comment' : 'commented', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'comment_delete': return { action: 'deleted comment', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'comment_restore': return { action: 'restored a deleted comment', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'comment_react': return { action: `reacted (${e.reaction === 'dislike' ? '\u{1F44E}' : '\u{1F44C}'})`, detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'glossary_add': return { action: 'added glossary term', detail: [document.createTextNode(`${e.term} -> ${e.translation}`)] };
    case 'glossary_update': return { action: 'updated glossary term', detail: [document.createTextNode(`${e.term} -> ${e.translation}`)] };
    case 'glossary_delete': return { action: 'deleted glossary term', detail: [document.createTextNode(e.term || '')] };
    case 'suggestion_add': return { action: 'suggested a change', detail: [el('span', { class: 'lkey', text: e.key }), document.createTextNode(': ' + (e.valuePreview || ''))] };
    case 'suggestion_apply': return { action: 'applied a suggestion', detail: [el('span', { class: 'lkey', text: e.key }), document.createTextNode(e.targetUser ? ` (from ${e.targetUser})` : '')] };
    case 'suggestion_reject': return { action: 'dismissed a suggestion', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'suggestion_restore': return { action: 'restored a dismissed suggestion', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'user_report': return { action: 'reported a user', detail: [document.createTextNode(`${e.targetUser}: ${e.reasonPreview || ''}`)] };
    case 'report_resolved': return { action: 'resolved a report', detail: [document.createTextNode(e.targetUser || '')] };
    case 'qa_ignore': return { action: 'ignored a QA flag', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'qa_approve': return { action: 'approved a QA flag', detail: [el('span', { class: 'lkey', text: e.key })] };
    case 'qa_reopen': return { action: 'reopened a QA flag', detail: [el('span', { class: 'lkey', text: e.key })] };
    default: return { action: e.type || 'unknown', detail: [] };
  }
}

function renderActivityLog() {
  const list = document.getElementById('activityList');
  const search = document.getElementById('logSearch').value.trim().toLowerCase();
  list.innerHTML = '';

  const filtered = LOG_ENTRIES.filter((e) => {
    if (!search) return true;
    const hay = [e.editor, e.filename, e.key, e.valuePreview, e.term, e.translation, (e.files || []).join(' ')].join(' ').toLowerCase();
    return hay.includes(search);
  });

  if (!filtered.length) {
    list.appendChild(el('div', { class: 'contrib-empty', text: 'No matching activity.' }));
    return;
  }

  for (const e of filtered) {
    const { action, detail } = describeLogEntry(e);
    list.appendChild(el('div', { class: 'log-row' }, [
      el('div', { class: 'ltime', text: new Date(e.ts).toLocaleString() }),
      el('div', { class: 'luser', text: e.editor || 'system' }),
      el('div', { class: 'laction', text: action }),
      el('div', { class: 'ldetail' }, detail),
    ]));
  }
}

function initActivityTab() {
  document.getElementById('logRefreshBtn').addEventListener('click', loadActivityLog);
  let logSearchDebounce = null;
  document.getElementById('logSearch').addEventListener('input', () => {
    clearTimeout(logSearchDebounce);
    logSearchDebounce = setTimeout(renderActivityLog, 180);
  });
}

/* ---------------- notifications: what other people did while you weren't looking ---------------- */

let NOTIF_ENTRIES = [];
let NOTIF_UNREAD = 0;

async function loadNotifications() {
  const list = document.getElementById('notifList');
  list.innerHTML = '';
  list.appendChild(el('div', { class: 'contrib-empty', text: 'Loading\u2026' }));
  try {
    const res = await fetch('/api/notifications?limit=200');
    if (!res.ok) throw new Error('notifications fetch failed');
    const data = await res.json();
    NOTIF_ENTRIES = data.entries || [];
    NOTIF_UNREAD = data.unreadCount || 0;
    renderNotifications();
    renderNotifPopover();
    markNotificationsSeen();
  } catch (e) {
    list.innerHTML = '';
    list.appendChild(el('div', { class: 'contrib-empty', text: 'Could not load notifications.' }));
  }
}

/* What to show as the prominent, "this is the actual content" line on a
   notification card \u2014 independent of describeLogEntry's detail array, which
   is tuned for the compact single-line Activity Log and leans on repeating
   the key (already shown separately here via .notif-loc). */
function notifHighlightText(e) {
  switch (e.type) {
    case 'comment_add':
    case 'comment_react':
    case 'suggestion_add':
    case 'suggestion_apply':
    case 'edit':
      return e.valuePreview || '';
    case 'glossary_add':
    case 'glossary_update':
      return e.term ? `${e.term} \u2192 ${e.translation || ''}` : '';
    case 'glossary_delete':
      return e.term || '';
    case 'user_report':
      return e.reasonPreview || '';
    default:
      return '';
  }
}

function buildNotifCard(e, onNavigate) {
  const { action } = describeLogEntry(e);
  const cardClass = 'notif-card' + (e.unread ? ' is-unread' : '') + ((e.mentionsYou || e.repliedToYou) ? ' is-mention' : '');
  const card = el('div', { class: cardClass });
  card.appendChild(buildAvatarEl(e.editor || '?', 'mini-avatar notif-avatar'));
  const main = el('div', { class: 'notif-main' });
  const line1 = el('div', { class: 'notif-line1' }, [
    el('span', { class: 'notif-user', text: e.editor || 'system' }),
    el('span', { class: 'notif-action', text: action }),
  ]);
  if (e.mentionsYou) line1.appendChild(el('span', { class: 'notif-mention-tag', text: '@you' }));
  else if (e.repliedToYou) line1.appendChild(el('span', { class: 'notif-mention-tag', text: 'reply' }));
  line1.appendChild(el('span', { class: 'notif-time', text: new Date(e.ts).toLocaleString() }));
  main.appendChild(line1);

  const highlight = notifHighlightText(e);
  if (highlight) main.appendChild(el('div', { class: 'notif-highlight', text: highlight }));
  if (e.filename) main.appendChild(el('div', { class: 'notif-loc', text: `${e.filename}${e.key ? ' \u00b7 ' + e.key : ''}` }));

  const actions = el('div', { class: 'notif-actions' });
  if (e.filename && e.key) {
    const jumpOpts = e.type === 'suggestion_add' ? { openSuggestions: true } : undefined;
    actions.appendChild(el('button', { class: 'notif-open-btn', html: 'Open' + ICONS.arrow, onclick: () => { if (onNavigate) onNavigate(); jumpToEntry(e.filename, e.key, jumpOpts); } }));
  }
  if (e.editor && e.editor !== AUTH.username) {
    actions.appendChild(el('button', { class: 'report-link-btn', text: 'Report', onclick: () => { if (onNavigate) onNavigate(); openReportModal(e.editor); } }));
  }
  if (actions.children.length) main.appendChild(actions);

  card.appendChild(main);
  return card;
}

let NOTIF_FILTER = 'all';

function renderNotifications() {
  const list = document.getElementById('notifList');
  const summary = document.getElementById('notifSummary');
  list.innerHTML = '';
  summary.innerHTML = '';

  const entries = NOTIF_FILTER === 'mentions'
    ? NOTIF_ENTRIES.filter((e) => e.mentionsYou || e.repliedToYou)
    : NOTIF_ENTRIES;

  if (NOTIF_ENTRIES.length) {
    if (NOTIF_UNREAD > 0) {
      summary.appendChild(el('span', { class: 'unread-count', text: `${NOTIF_UNREAD} unread` }));
      summary.appendChild(document.createTextNode(`of ${NOTIF_ENTRIES.length} total`));
    } else {
      summary.appendChild(document.createTextNode(`${NOTIF_ENTRIES.length} recent update${NOTIF_ENTRIES.length === 1 ? '' : 's'}`));
    }
  }
  if (!entries.length) {
    list.appendChild(el('div', { class: 'notif-empty-state' }, [
      el('div', { class: 'glyph', text: '\u2014' }),
      el('p', {
        text: NOTIF_FILTER === 'mentions'
          ? 'No mentions or replies yet \u2014 you\u2019ll see it here when someone @mentions you or replies to one of your comments.'
          : 'Nothing yet \u2014 you\u2019ll see it here when someone @mentions you or replies to one of your comments.',
      }),
    ]));
    return;
  }
  for (const e of entries) list.appendChild(buildNotifCard(e));
}

const NOTIF_POPOVER_LIMIT = 8;
function renderNotifPopover() {
  const list = document.getElementById('notifPopoverList');
  const summary = document.getElementById('notifPopoverSummary');
  list.innerHTML = '';
  summary.textContent = NOTIF_UNREAD > 0 ? `${NOTIF_UNREAD} unread` : '';
  if (!NOTIF_ENTRIES.length) {
    list.appendChild(el('div', { class: 'notif-empty-state' }, [
      el('p', { text: 'Nothing yet.' }),
    ]));
    return;
  }
  for (const e of NOTIF_ENTRIES.slice(0, NOTIF_POPOVER_LIMIT)) {
    list.appendChild(buildNotifCard(e, closeNotifPopover));
  }
}

function closeNotifPopover() {
  document.getElementById('notifPopover').classList.remove('open');
}
function initNotifPopover() {
  const wrap = document.getElementById('notifPopoverWrap');
  const popover = document.getElementById('notifPopover');
  document.getElementById('headerNotifBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = popover.classList.contains('open');
    if (!wasOpen) loadNotifications();
    popover.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeNotifPopover();
  });
  document.getElementById('notifPopoverSeeAll').addEventListener('click', () => {
    closeNotifPopover();
    activateTab('notifications');
  });
}

async function markNotificationsSeen() {
  try {
    await fetch('/api/notifications/seen', { method: 'POST', headers: buildJsonHeaders() });
  } catch (e) {}
  NOTIF_UNREAD = 0;
  NOTIF_LAST_KNOWN_UNREAD = 0;
  const headerBadge = document.getElementById('headerNotifBadge');
  headerBadge.style.display = 'none';
  headerBadge.textContent = '';
  const tabBadge = document.getElementById('tabNotifBadge');
  tabBadge.style.display = 'none';
  tabBadge.textContent = '';
}

function bumpBadge(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

let NOTIF_LAST_KNOWN_UNREAD = null;
let NOTIF_LAST_TOAST_TS = null;

function popMentionToasts(entries) {
  const onNotifTab = document.getElementById('view-notifications').classList.contains('active');
  const fresh = entries.filter((e) => e.unread && e.ts > NOTIF_LAST_TOAST_TS).sort((a, b) => a.ts - b.ts);
  let toasted = false;
  if (fresh.length && !onNotifTab) {
    const last = fresh[fresh.length - 1];
    const msg = fresh.length > 1
      ? `${last.editor} and ${fresh.length - 1} other${fresh.length > 2 ? 's' : ''} mentioned you`
      : last.repliedToYou && !last.mentionsYou
        ? `${last.editor} replied to you in ${last.filename}`
        : `${last.editor} mentioned you in ${last.filename}`;
    toast(msg, { actionLabel: 'View', onAction: () => activateTab('notifications'), duration: 4000 });
    toasted = true;
  }
  if (fresh.length) NOTIF_LAST_TOAST_TS = fresh[fresh.length - 1].ts;
  return toasted;
}

async function refreshNotifBadge() {
  try {
    const res = await fetch('/api/notifications?limit=10');
    if (!res.ok) return;
    const data = await res.json();
    const onNotifTab = document.getElementById('view-notifications').classList.contains('active');
    const text = data.unreadCount > 99 ? '99+' : String(data.unreadCount);
    const grew = NOTIF_LAST_KNOWN_UNREAD !== null && data.unreadCount > NOTIF_LAST_KNOWN_UNREAD;
    NOTIF_LAST_KNOWN_UNREAD = data.unreadCount;

    let mentionToasted = false;
    if (NOTIF_LAST_TOAST_TS === null) {
      // First load: don't toast a backlog of pre-existing unread notifications.
      NOTIF_LAST_TOAST_TS = data.entries.reduce((max, e) => Math.max(max, e.ts), data.lastSeen || 0);
    } else {
      mentionToasted = popMentionToasts(data.entries);
    }
    // A mention/reply already spoke for itself via the toast above; only
    // announce the plain count bump (approvals, non-mention comments, etc.)
    // when nothing more specific already told the user.
    if (grew && !onNotifTab && !mentionToasted) {
      announce(`${data.unreadCount} unread notification${data.unreadCount === 1 ? '' : 's'}.`);
    }

    const headerBadge = document.getElementById('headerNotifBadge');
    const showHeader = !onNotifTab && data.unreadCount > 0;
    headerBadge.style.display = showHeader ? 'inline-block' : 'none';
    headerBadge.textContent = showHeader ? text : '';
    if (grew && showHeader) bumpBadge(headerBadge);

    const tabBadge = document.getElementById('tabNotifBadge');
    const showTab = !onNotifTab && data.unreadCount > 0;
    tabBadge.style.display = showTab ? 'inline-block' : 'none';
    tabBadge.textContent = showTab ? text : '';
    if (grew && showTab) bumpBadge(tabBadge);
  } catch (e) {}
}

function initNotifTab() {
  document.getElementById('notifRefreshBtn').addEventListener('click', loadNotifications);
  document.querySelectorAll('#notifFilterSegmented .fseg-btn[data-notiffilter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      NOTIF_FILTER = btn.dataset.notiffilter;
      document.querySelectorAll('#notifFilterSegmented .fseg-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderNotifications();
    });
  });
}

function collectQaFlaggedRows() {
  const out = [];
  for (const [filename, f] of Object.entries(STATE.files)) {
    const e = STATE.edits[filename];
    if (!e) continue;
    for (const key of Object.keys(e)) {
      const baseVal = f.baseline[key];
      const curVal = e[key];
      const tokenBad = !tokensMatch(baseVal, curVal);
      const qa = allQaIssues(baseVal, curVal);
      if (!tokenBad && !qa.length) continue;
      const codes = tokenBad ? [{ code: 'mismatch', label: 'token mismatch' }, ...qa] : qa;
      const decision = (STATE.qaDecisions[filename] && STATE.qaDecisions[filename][key]) || null;
      out.push({ filename, key, baseVal, curVal, codes, decision });
    }
  }
  out.sort((a, b) => a.filename.localeCompare(b.filename) || a.key.localeCompare(b.key));
  return out;
}

const QA_SELECTED = new Set();

function pruneQaSelection(allRows) {
  const openKeys = new Set(allRows.filter((r) => !r.decision).map((r) => historyKey(r.filename, r.key)));
  for (const k of Array.from(QA_SELECTED)) if (!openKeys.has(k)) QA_SELECTED.delete(k);
}

function updateQaBulkBar(visibleRows) {
  const selectableKeys = visibleRows.filter((r) => !r.decision).map((r) => historyKey(r.filename, r.key));
  const selectAllEl = document.getElementById('qaSelectAll');
  selectAllEl.disabled = selectableKeys.length === 0;
  selectAllEl.checked = selectableKeys.length > 0 && selectableKeys.every((k) => QA_SELECTED.has(k));
  selectAllEl.indeterminate = !selectAllEl.checked && selectableKeys.some((k) => QA_SELECTED.has(k));
  selectAllEl.onchange = () => {
    if (selectAllEl.checked) selectableKeys.forEach((k) => QA_SELECTED.add(k));
    else selectableKeys.forEach((k) => QA_SELECTED.delete(k));
    renderQaReport();
  };
  const count = QA_SELECTED.size;
  document.getElementById('qaBulkCount').textContent = count
    ? `${count} selected`
    : (selectableKeys.length ? `${selectableKeys.length} open in this view` : 'Nothing to select');
  document.getElementById('qaBulkApproveBtn').disabled = count === 0;
  document.getElementById('qaBulkIgnoreBtn').disabled = count === 0;
}

function renderQaReport() {
  const list = document.getElementById('qaList');
  const summary = document.getElementById('qaSummary');
  const search = document.getElementById('qaSearch').value.trim().toLowerCase();
  const typeFilter = document.getElementById('qaTypeFilter').value;
  const showResolved = document.getElementById('qaShowResolved').checked;
  list.innerHTML = '';

  const allRows = collectQaFlaggedRows();
  pruneQaSelection(allRows);

  let rows = allRows;
  const openCount = rows.filter((r) => !r.decision).length;
  const totalFlagged = rows.length;
  if (!showResolved) rows = rows.filter((r) => !r.decision);
  if (typeFilter !== 'all') rows = rows.filter((r) => r.codes.some((c) => c.code === typeFilter));
  if (search) rows = rows.filter((r) => (r.filename + ' ' + r.key + ' ' + (r.baseVal || '') + ' ' + (r.curVal || '')).toLowerCase().includes(search));

  summary.textContent = showResolved
    ? `${rows.length} of ${totalFlagged} flagged entries \u00b7 ${openCount} open`
    : (rows.length === openCount
      ? `${openCount} open ${openCount === 1 ? 'entry' : 'entries'}`
      : `${rows.length} of ${openCount} open entries (filtered)`);

  updateQaBulkBar(rows);

  if (!rows.length) {
    list.appendChild(el('div', { class: 'contrib-empty', text: totalFlagged ? 'Nothing matches this filter.' : 'No flagged entries \u2014 clean.' }));
    return;
  }

  for (const r of rows) {
    const rowKey = historyKey(r.filename, r.key);
    const row = el('div', { class: 'qa-row' + (r.decision ? ' is-decided' : '') });
    const checkCell = el('div', { class: 'row-check-cell' });
    if (!r.decision) {
      const cb = el('input', { type: 'checkbox', class: 'row-check' });
      cb.checked = QA_SELECTED.has(rowKey);
      cb.addEventListener('change', () => {
        if (cb.checked) QA_SELECTED.add(rowKey); else QA_SELECTED.delete(rowKey);
        updateQaBulkBar(rows);
      });
      checkCell.appendChild(cb);
    }
    row.appendChild(checkCell);
    row.appendChild(el('div', {}, [
      el('div', { class: 'qfile', text: r.filename }),
      el('div', { class: 'qkey', text: r.key }),
    ]));
    const issuesWrap = el('div', { class: 'qissues' });
    for (const c of r.codes) issuesWrap.appendChild(el('span', { class: 'badge ' + (c.code === 'mismatch' ? 'mismatch' : c.code === 'glossary' ? 'glossary' : 'qa'), text: c.label }));
    if (r.decision) {
      const isApproved = r.decision.status === 'approved';
      issuesWrap.appendChild(el('span', {
        class: 'badge ' + (isApproved ? 'approved' : 'untranslated'),
        title: `${isApproved ? 'approved' : 'ignored'} by ${r.decision.by}`,
        text: isApproved ? 'approved' : 'ignored',
      }));
    }
    row.appendChild(issuesWrap);
    row.appendChild(el('div', { class: 'qtext' }, [
      document.createTextNode('src: ' + (r.baseVal ?? '')),
      document.createElement('br'),
      document.createTextNode('cur: '),
      el('span', { class: 'qcur', text: r.curVal ?? '' }),
    ]));
    const actions = el('div', { class: 'qa-row-actions' });
    actions.appendChild(el('button', { class: 'qfix', html: 'Open' + ICONS.arrow, onclick: () => jumpToEntry(r.filename, r.key) }));
    if (r.decision) {
      actions.appendChild(el('button', { class: 'btn ghost', text: 'Reopen', onclick: () => decideQaFlag(r.filename, r.key, null) }));
    } else {
      actions.appendChild(el('button', { class: 'btn ghost', text: 'Ignore', onclick: () => decideQaFlag(r.filename, r.key, 'ignore') }));
      actions.appendChild(el('button', { class: 'btn primary', text: 'Approve', onclick: () => decideQaFlag(r.filename, r.key, 'approve') }));
    }
    row.appendChild(actions);
    list.appendChild(row);
  }
}

async function bulkDecideQa(decision) {
  const items = Array.from(QA_SELECTED).map((k) => {
    const i = k.indexOf(String.fromCharCode(1));
    return { filename: k.slice(0, i), key: k.slice(i + 1) };
  });
  if (!items.length) return;
  const label = decision === 'approve' ? 'Approve' : 'Ignore';
  const ok = await showConfirm({
    title: `${label} ${items.length} flagged ${items.length === 1 ? 'entry' : 'entries'}?`,
    message: `Each will be marked ${decision === 'approve' ? 'approved' : 'ignored'} and drop out of the open QA queue. Any of these can be reopened individually afterward.`,
    confirmLabel: label,
  });
  if (!ok) return;
  const results = await Promise.allSettled(items.map((it) => fetch('/api/qa/decide', {
    method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ filename: it.filename, key: it.key, decision }),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'failed');
    if (!STATE.qaDecisions[it.filename]) STATE.qaDecisions[it.filename] = {};
    STATE.qaDecisions[it.filename][it.key] = data.decision;
  })));
  const failed = results.filter((r) => r.status === 'rejected').length;
  QA_SELECTED.clear();
  renderQaReport();
  toast(failed
    ? `${items.length - failed} of ${items.length} updated \u2014 ${failed} failed`
    : `${items.length} ${label.toLowerCase()}d`);
}

async function decideQaFlag(filename, key, decision) {
  try {
    const res = await fetch('/api/qa/decide', {
      method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ filename, key, decision }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || 'could not update QA flag'); return; }
    if (data.decision) {
      if (!STATE.qaDecisions[filename]) STATE.qaDecisions[filename] = {};
      STATE.qaDecisions[filename][key] = data.decision;
    } else if (STATE.qaDecisions[filename]) {
      delete STATE.qaDecisions[filename][key];
    }
    renderQaReport();
  } catch (e) { toast('could not reach server'); }
}

function jumpToEntry(filename, key, opts) {
  activateTab('editor');

  STATE.activeFile = filename;
  STATE.page = 0; STATE.zenIndex = 0;
  document.getElementById('globalSearchToggle').checked = false;
  document.getElementById('filterSelect').value = 'all';
  document.getElementById('searchBox').value = key;

  if (opts && opts.openSuggestions) OPEN_SUGGESTIONS.add(historyKey(filename, key));

  renderFileList();
  renderTable();

  setTimeout(() => {
    const target = filename + '\u0001' + key;
    const rowEl = Array.from(document.querySelectorAll('.row')).find((n) => n.getAttribute('data-row-id') === target);
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      rowEl.style.outline = '2px solid var(--accent)';
      setTimeout(() => { rowEl.style.outline = ''; }, 1600);
    }
  }, 60);
}

function initQaTab() {
  initFilterSegmented('qaTypeSegmented', 'qaTypeMoreWrap', 'qaTypeMoreBtn', 'qaTypeMoreMenu', 'qaTypeFilter');
  document.getElementById('qaRefreshBtn').addEventListener('click', renderQaReport);
  document.getElementById('qaTypeFilter').addEventListener('change', renderQaReport);
  document.getElementById('qaShowResolved').addEventListener('change', renderQaReport);
  document.getElementById('qaBulkApproveBtn').addEventListener('click', () => bulkDecideQa('approve'));
  document.getElementById('qaBulkIgnoreBtn').addEventListener('click', () => bulkDecideQa('ignore'));
  let qaSearchDebounce = null;
  document.getElementById('qaSearch').addEventListener('input', () => {
    clearTimeout(qaSearchDebounce);
    qaSearchDebounce = setTimeout(renderQaReport, 180);
  });
}

/* ---------- concordance tab ---------- */

function highlightQuery(text, query) {
  const t = text ?? '';
  if (!query) return [document.createTextNode(t)];
  const idx = t.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return [document.createTextNode(t)];
  const frag = [];
  if (idx > 0) frag.push(document.createTextNode(t.slice(0, idx)));
  frag.push(el('mark', { text: t.slice(idx, idx + query.length) }));
  if (idx + query.length < t.length) frag.push(document.createTextNode(t.slice(idx + query.length)));
  return frag;
}

async function runConcordanceSearch() {
  const q = document.getElementById('concordanceSearch').value.trim();
  const summary = document.getElementById('concordanceSummary');
  const list = document.getElementById('concordanceList');
  list.innerHTML = '';
  if (!q) { summary.textContent = ''; return; }
  summary.textContent = 'Searching\u2026';
  try {
    const res = await fetch('/api/concordance?q=' + encodeURIComponent(q));
    const data = await res.json();
    renderConcordanceResults(data.matches || [], q);
  } catch (e) {
    summary.textContent = '';
    list.appendChild(el('div', { class: 'contrib-empty', text: 'Could not search the project.' }));
  }
}

function renderConcordanceResults(matches, q) {
  const summary = document.getElementById('concordanceSummary');
  const list = document.getElementById('concordanceList');
  list.innerHTML = '';
  summary.textContent = matches.length
    ? `${matches.length} match${matches.length === 1 ? '' : 'es'}${matches.length >= 300 ? ' (showing first 300)' : ''}`
    : 'No matches.';
  for (const m of matches) {
    const row = el('div', { class: 'concordance-row' });
    row.appendChild(el('div', {}, [
      el('div', { class: 'qfile', text: m.filename }),
      el('div', { class: 'qkey', text: m.key }),
    ]));
    row.appendChild(el('div', { class: 'qtext' }, [
      document.createTextNode('src: '),
      ...highlightQuery(m.source, q),
      document.createElement('br'),
      document.createTextNode('tgt: '),
      el('span', { class: 'qcur' }, highlightQuery(m.target, q)),
    ]));
    row.appendChild(el('button', { class: 'qfix', html: 'Open' + ICONS.arrow, onclick: () => jumpToEntry(m.filename, m.key) }));
    list.appendChild(row);
  }
}

function initConcordanceTab() {
  document.getElementById('concordanceSearchBtn').addEventListener('click', runConcordanceSearch);
  document.getElementById('concordanceSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); runConcordanceSearch(); }
  });
}

let EDITING_GLOSSARY_ID = null;

function renderGlossary() {
  const list = document.getElementById('glossaryList');
  const summary = document.getElementById('glossarySummary');
  const search = document.getElementById('glossarySearch').value.trim().toLowerCase();
  list.innerHTML = '';

  const all = STATE.glossary || [];
  const terms = all
    .filter((g) => !search || (g.term + ' ' + g.translation + ' ' + (g.note || '')).toLowerCase().includes(search))
    .slice()
    .sort((a, b) => a.term.localeCompare(b.term));

  summary.textContent = terms.length === all.length
    ? `${all.length} ${all.length === 1 ? 'term' : 'terms'}`
    : `${terms.length} of ${all.length} terms`;

  if (!terms.length) {
    list.appendChild(el('div', { class: 'contrib-empty', text: all.length ? 'No terms match this search.' : 'No glossary terms yet.' }));
    return;
  }

  for (const g of terms) {
    if (EDITING_GLOSSARY_ID === g.id) {
      list.appendChild(renderGlossaryEditRow(g));
      continue;
    }
    const row = el('div', { class: 'glossary-row' }, [
      el('div', { class: 'gterm', text: g.term }),
      el('div', { class: 'gtranslation', text: g.translation }),
      el('div', { class: 'gnote', text: g.note || '' }),
      el('div', { class: 'gactions' }, [
        el('button', { class: 'reviewer-only', text: 'Edit', onclick: () => { EDITING_GLOSSARY_ID = g.id; renderGlossary(); } }),
        el('button', { class: 'reviewer-only', text: 'Delete', onclick: () => deleteGlossaryTerm(g.id, g.term) }),
      ]),
    ]);
    list.appendChild(row);
  }
}

function renderGlossaryEditRow(g) {
  const termInput = el('input', {});
  termInput.value = g.term;
  const translationInput = el('input', {});
  translationInput.value = g.translation;
  const noteInput = el('input', {});
  noteInput.value = g.note || '';

  const save = () => updateGlossaryTerm(g.id, termInput.value, translationInput.value, noteInput.value);

  return el('div', { class: 'glossary-row editing' }, [
    el('div', { class: 'gedit-inputs' }, [termInput, translationInput, noteInput]),
    el('div', { class: 'gactions' }, [
      el('button', { text: 'Save', onclick: save }),
      el('button', { text: 'Cancel', onclick: () => { EDITING_GLOSSARY_ID = null; renderGlossary(); } }),
    ]),
  ]);
}

async function addGlossaryTerm(term, translation, note) {
  try {
    const res = await fetch('/api/glossary', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ term, translation, note }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'add failed');
    await fetchState();
    renderGlossary();
    renderFileList();
    if (document.getElementById('view-editor').classList.contains('active')) renderTable();
    toast('Glossary term added');
  } catch (e) {
    toast('Could not add term: ' + e.message);
  }
}

async function updateGlossaryTerm(id, term, translation, note) {
  const termTrim = term.trim(), translationTrim = translation.trim();
  if (!termTrim || !translationTrim) { toast('Term and translation required'); return; }
  try {
    const res = await fetch('/api/glossary/update', {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ id, term: termTrim, translation: translationTrim, note }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'update failed');
    EDITING_GLOSSARY_ID = null;
    await fetchState();
    renderGlossary();
    renderFileList();
    if (document.getElementById('view-editor').classList.contains('active')) renderTable();
    toast('Glossary term updated');
  } catch (e) {
    toast('Could not update term: ' + e.message);
  }
}

async function deleteGlossaryTerm(id, term) {
  const ok = await showConfirm({ title: 'Delete glossary term?', message: `“${term}” will no longer be enforced or highlighted anywhere in the project.`, confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  try {
    const res = await fetch('/api/glossary', {
      method: 'DELETE',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'delete failed'); }
    await fetchState();
    renderGlossary();
    renderFileList();
    if (document.getElementById('view-editor').classList.contains('active')) renderTable();
    toast('Glossary term deleted');
  } catch (e) {
    toast('Could not delete term: ' + e.message);
  }
}

function initGlossaryTab() {
  document.getElementById('glossaryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const termInput = document.getElementById('glossaryTermInput');
    const translationInput = document.getElementById('glossaryTranslationInput');
    const noteInput = document.getElementById('glossaryNoteInput');
    const term = termInput.value.trim(), translation = translationInput.value.trim(), note = noteInput.value.trim();
    if (!term || !translation) return;
    addGlossaryTerm(term, translation, note).then(() => {
      termInput.value = '';
      translationInput.value = '';
      noteInput.value = '';
      termInput.focus();
    });
  });
  let glossarySearchDebounce = null;
  document.getElementById('glossarySearch').addEventListener('input', () => {
    clearTimeout(glossarySearchDebounce);
    glossarySearchDebounce = setTimeout(renderGlossary, 180);
  });
}

function activateTab(tab, opts = {}) {
  if (!VALID_TABS.has(tab)) tab = 'dashboard';
  if (ADMIN_ONLY_TABS.has(tab) && STATE.projectRole !== 'admin') tab = 'dashboard';

  document.querySelectorAll('.tab-btn[data-tab]').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('view-' + tab).classList.add('active');

  if (tab === 'contributors') renderContributors();
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'activity') loadActivityLog();
  if (tab === 'qa') renderQaReport();
  if (tab === 'glossary') renderGlossary();
  if (tab === 'notifications') loadNotifications();

  const insideMore = btn && document.getElementById('moreTabsMenu').contains(btn);
  document.getElementById('tabsMore').classList.toggle('has-active-child', !!insideMore);
  document.getElementById('moreTabsMenu').classList.remove('open');
  document.getElementById('tabsMore').classList.remove('open');

  STATE.currentTab = tab;
  if (STATE.projectId && !opts.skipRoute) {
    if (opts.replace) replaceRoute(STATE.projectId, tab);
    else pushRoute(STATE.projectId, tab);
  }
}

function initTabs() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
  document.getElementById('mastheadHomeBtn').addEventListener('click', () => activateTab('dashboard'));
}

function initTabsMore() {
  const wrap = document.getElementById('tabsMore');
  const menu = document.getElementById('moreTabsMenu');
  document.getElementById('moreTabsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
    wrap.classList.toggle('open', menu.classList.contains('open'));
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      menu.classList.remove('open');
      wrap.classList.remove('open');
    }
  });
}

async function bootApp() {
  if (!bootApp._initedOnce) {
    bootApp._initedOnce = true;
    initTabs();
    initDashboardTab();
    initEditorTab();
    initZenTab();
    initCompareTab();
    initActivityTab();
    initNotifTab();
    initQaTab();
    initGlossaryTab();
    initConcordanceTab();
    document.addEventListener('click', () => {
      document.querySelectorAll('.row-menu.open').forEach((m) => m.classList.remove('open'));
    });
    startPolling();
  }
  try {
    await fetchState();
    setSyncState('synced');
  } catch (e) {
    setSyncState('stale');
    toast('Could not reach the server');
  }
  renderFileList();
  renderTable();
  renderDashboard();
  refreshNotifBadge();
}

window.addEventListener('popstate', () => {
  if (!STATE.projectId) return;
  const route = parseRoute();
  if (!route) return;
  if (route.projectId === STATE.projectId) {
    activateTab(route.tab, { skipRoute: true });
  } else if (STATE.projects.some((p) => p.id === route.projectId && p.role)) {
    enterProject(route.projectId, route.tab, { skipRoute: true });
  }
});

(async function init() {
  initAuthScreen();
  initProfileMenu();
  initTabsMore();
  initReportModal();
  initHelpModal();
  initActiveUsersMenu();
  initNotifPopover();
  const loggedIn = await checkSession();
  if (loggedIn) {
    await proceedAfterAuth();
  }
})();
