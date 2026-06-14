// ── DEFAULT DATA ──────────────────────────────────────────────────────────────
const STEP_COUNT = 9; // Steps 0-8

function defaultStepData(i) {
  return {
    title: `Step ${i}: (Click "Edit Step" to name)`,
    subtitle: 'No subtitle yet',
    desc: 'Add a description for this step using the Edit Step button.',
    note: '',
    instructions: '',
    checklist: [],
    resources: [],
    completed: false,
  };
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let state = {
  projectTitle: 'My Project Title',
  currentStep: 0,
  steps: Array.from({length: STEP_COUNT}, (_, i) => defaultStepData(i)),
};

function loadState() {
  try {
    const saved = localStorage.getItem('lms_state');
    if (saved) state = JSON.parse(saved);
    // Ensure all steps exist (for forward compatibility)
    while (state.steps.length < STEP_COUNT) {
      state.steps.push(defaultStepData(state.steps.length));
    }
  } catch(e) {}
}

function saveState() {
  // Capture live editable content before saving
  const pane = document.getElementById(`pane-${state.currentStep}`);
  if (pane) {
    const zone = pane.querySelector('.editable-zone');
    if (zone) state.steps[state.currentStep].instructions = zone.innerHTML;
  }
  document.getElementById('projectTitle').value &&
    (state.projectTitle = document.getElementById('projectTitle').value);
  localStorage.setItem('lms_state', JSON.stringify(state));
}

// ── BUILD UI ──────────────────────────────────────────────────────────────────
function buildRail() {
  const rail = document.getElementById('rail');
  const header = rail.querySelector('.rail-header');
  rail.innerHTML = '';
  rail.appendChild(header);

  state.steps.forEach((step, i) => {
    const item = document.createElement('div');
    item.className = 'step-item' +
      (i === state.currentStep ? ' active' : '') +
      (step.completed ? ' completed' : '');
    item.setAttribute('data-step', i);
    item.onclick = () => goToStep(i);
    item.innerHTML = `
      <div class="step-num">${i}</div>
      <div class="step-meta">
        <div class="step-title">${escHtml(step.title)}</div>
        <div class="step-subtitle">${escHtml(step.subtitle)}</div>
      </div>
      <svg class="step-check" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="var(--teal)" opacity="0.2"/>
        <path d="M4.5 8.5l2.5 2.5 4-5" stroke="var(--teal)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    rail.appendChild(item);
  });
}

function buildPanes() {
  const area = document.getElementById('contentArea');
  area.innerHTML = '';
  state.steps.forEach((step, i) => {
    const pane = document.createElement('div');
    pane.className = 'step-pane' + (i === state.currentStep ? ' visible' : '');
    pane.id = `pane-${i}`;
    pane.innerHTML = buildPaneHTML(step, i);
    area.appendChild(pane);
    // Bind checklist events
    bindChecklist(i);
    // Toolbar
    bindToolbar(i);
  });
}

function buildPaneHTML(step, i) {
  const isFirst = i === 0;
  const isLast  = i === STEP_COUNT - 1;
  const doneClass = step.completed ? 'completed-badge' : '';
  const doneLabel = step.completed ? '✓ Completed' : `Step ${i}`;

  const checklistHTML = step.checklist.map((item, ci) => `
    <li class="${item.done ? 'done' : ''}" data-ci="${ci}">
      <input type="checkbox" id="chk-${i}-${ci}" ${item.done ? 'checked' : ''}/>
      <label for="chk-${i}-${ci}">${escHtml(item.text)}</label>
      <button onclick="removeCheckItem(${i},${ci})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 4px;" title="Remove">×</button>
    </li>`).join('');

  const resourcesHTML = step.resources.map((r, ri) => `
    <div class="resource-item">
      <div class="resource-icon">🔗</div>
      <div class="resource-text">
        <div class="resource-name">${escHtml(r.name)}</div>
        <a href="${escHtml(r.url)}" target="_blank" rel="noopener" class="resource-url" style="color:var(--teal);font-size:11px;">${escHtml(r.url)}</a>
      </div>
      <button class="resource-del" onclick="removeResource(${i},${ri})" title="Remove">×</button>
    </div>`).join('');

  return `
    <div class="step-header">
      <div class="step-badge ${doneClass}">${doneLabel}</div>
      <div class="step-header-text">
        <h1>${escHtml(step.title)}</h1>
        <div class="step-desc">${escHtml(step.desc)}</div>
      </div>
    </div>

    ${step.note ? `
    <div class="block">
      <div class="callout">
        <div class="callout-label">📌 Instructor Note</div>
        ${escHtml(step.note)}
      </div>
    </div>` : ''}

    <div class="block">
      <div class="block-label">Instructions & Content</div>
      <div class="toolbar" id="toolbar-${i}">
        <button class="tool-btn" data-cmd="bold"><b>B</b></button>
        <button class="tool-btn" data-cmd="italic"><i>I</i></button>
        <button class="tool-btn" data-cmd="underline"><u>U</u></button>
        <button class="tool-btn" data-cmd="insertOrderedList">1.</button>
        <button class="tool-btn" data-cmd="insertUnorderedList">•</button>
        <button class="tool-btn" data-cmd="formatBlock|h3">H3</button>
        <button class="tool-btn" data-cmd="formatBlock|p">¶</button>
        <button class="tool-btn" onclick="insertCodeBlock(${i})">{ }</button>
        <button class="tool-btn" data-cmd="removeFormat">✕ fmt</button>
      </div>
      <div
        class="editable-zone"
        id="editor-${i}"
        contenteditable="true"
        data-placeholder="Add your step instructions, code snippets, explanations, and content here..."
      >${step.instructions || ''}</div>
    </div>

    <div class="block">
      <div class="block-label">Task Checklist</div>
      <div class="editable-zone" style="padding:6px 12px;min-height:auto;">
        <ul class="checklist" id="checklist-${i}">${checklistHTML}</ul>
        <div class="add-item-row">
          <input class="add-item-input" id="newItem-${i}" type="text" placeholder="Add a task..."/>
          <button class="btn btn-ghost" onclick="addCheckItem(${i})" style="padding:7px 12px;">+ Add</button>
        </div>
      </div>
    </div>

    <div class="block">
      <div class="block-label">Resources & Links</div>
      <div class="resource-list" id="resources-${i}">${resourcesHTML}</div>
      <div class="add-resource-form">
        <input id="resName-${i}" type="text" placeholder="Link name"/>
        <input id="resUrl-${i}" type="url" placeholder="https://"/>
        <button class="btn btn-ghost" onclick="addResource(${i})" style="padding:7px 12px;">+ Add</button>
      </div>
    </div>

    <div class="step-footer">
      <button class="mark-complete-btn ${step.completed ? 'is-done' : ''}" id="markBtn-${i}" onclick="toggleComplete(${i})">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
          <path d="M5 8.5l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${step.completed ? 'Completed ✓' : 'Mark as Complete'}
      </button>
      <div class="nav-btns">
        ${!isFirst ? `<button class="btn btn-ghost" onclick="goToStep(${i-1})">← Previous</button>` : ''}
        ${!isLast  ? `<button class="btn btn-primary" onclick="goToStep(${i+1})">Next Step →</button>` : ''}
      </div>
    </div>`;
}

function bindChecklist(stepIdx) {
  const list = document.getElementById(`checklist-${stepIdx}`);
  if (!list) return;
  list.querySelectorAll('input[type="checkbox"]').forEach((chk, ci) => {
    chk.addEventListener('change', () => {
      state.steps[stepIdx].checklist[ci].done = chk.checked;
      const li = chk.closest('li');
      li.classList.toggle('done', chk.checked);
      saveState();
    });
  });
  const inp = document.getElementById(`newItem-${stepIdx}`);
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') addCheckItem(stepIdx); });
}

function bindToolbar(stepIdx) {
  const toolbar = document.getElementById(`toolbar-${stepIdx}`);
  const editor  = document.getElementById(`editor-${stepIdx}`);
  if (!toolbar || !editor) return;
  toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      const [cmd, val] = btn.dataset.cmd.split('|');
      document.execCommand(cmd, false, val || null);
      editor.focus();
    });
  });
  editor.addEventListener('input', () => {
    state.steps[stepIdx].instructions = editor.innerHTML;
    saveState();
  });
}

function insertCodeBlock(stepIdx) {
  const editor = document.getElementById(`editor-${stepIdx}`);
  editor.focus();
  document.execCommand('insertHTML', false,
    '<pre style="background:rgba(0,0,0,0.3);border:1px solid #2A4060;border-radius:6px;padding:12px 14px;font-family:monospace;font-size:13px;margin:10px 0;overflow-x:auto;white-space:pre-wrap;">// paste code here</pre><p><br></p>');
  state.steps[stepIdx].instructions = editor.innerHTML;
  saveState();
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function goToStep(idx) {
  // Save current editor content
  const oldPane = document.getElementById(`pane-${state.currentStep}`);
  if (oldPane) {
    const zone = oldPane.querySelector('.editable-zone[contenteditable]');
    if (zone) state.steps[state.currentStep].instructions = zone.innerHTML;
  }
  saveState();

  state.currentStep = idx;
  document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('visible'));
  document.querySelectorAll('.step-item').forEach(item => {
    item.classList.remove('active');
    if (parseInt(item.dataset.step) === idx) item.classList.add('active');
  });
  const pane = document.getElementById(`pane-${idx}`);
  if (pane) pane.classList.add('visible');
  window.scrollTo({top: 0, behavior: 'smooth'});
  saveState();
}

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
function addCheckItem(stepIdx) {
  const inp = document.getElementById(`newItem-${stepIdx}`);
  const text = inp.value.trim();
  if (!text) return;
  state.steps[stepIdx].checklist.push({text, done: false});
  inp.value = '';
  refreshPane(stepIdx);
  saveState();
}

function removeCheckItem(stepIdx, ci) {
  state.steps[stepIdx].checklist.splice(ci, 1);
  refreshPane(stepIdx);
  saveState();
}

// ── RESOURCES ─────────────────────────────────────────────────────────────────
function addResource(stepIdx) {
  const name = document.getElementById(`resName-${stepIdx}`).value.trim();
  const url  = document.getElementById(`resUrl-${stepIdx}`).value.trim();
  if (!name || !url) { showToast('Enter both a name and a URL.'); return; }
  state.steps[stepIdx].resources.push({name, url});
  document.getElementById(`resName-${stepIdx}`).value = '';
  document.getElementById(`resUrl-${stepIdx}`).value  = '';
  refreshPane(stepIdx);
  saveState();
}

function removeResource(stepIdx, ri) {
  state.steps[stepIdx].resources.splice(ri, 1);
  refreshPane(stepIdx);
  saveState();
}

// ── COMPLETE ──────────────────────────────────────────────────────────────────
function toggleComplete(stepIdx) {
  state.steps[stepIdx].completed = !state.steps[stepIdx].completed;
  const btn = document.getElementById(`markBtn-${stepIdx}`);
  if (btn) {
    btn.classList.toggle('is-done', state.steps[stepIdx].completed);
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 8.5l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${state.steps[stepIdx].completed ? 'Completed ✓' : 'Mark as Complete'}`;
  }
  const badge = document.querySelector(`#pane-${stepIdx} .step-badge`);
  if (badge) {
    badge.className = 'step-badge' + (state.steps[stepIdx].completed ? ' completed-badge' : '');
    badge.textContent = state.steps[stepIdx].completed ? '✓ Completed' : `Step ${stepIdx}`;
  }
  // update rail
  document.querySelectorAll('.step-item').forEach(item => {
    if (parseInt(item.dataset.step) === stepIdx) {
      item.classList.toggle('completed', state.steps[stepIdx].completed);
    }
  });
  updateProgress();
  saveState();
  showToast(state.steps[stepIdx].completed ? `Step ${stepIdx} marked complete!` : `Step ${stepIdx} unmarked`);
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────
function updateProgress() {
  const done = state.steps.filter(s => s.completed).length;
  const total = state.steps.length;
  document.getElementById('progressText').textContent = `${done} / ${total}`;
  document.getElementById('overallBarFill').style.width = `${(done/total)*100}%`;
}

// ── STEP EDIT MODAL ───────────────────────────────────────────────────────────
function openStepEditModal() {
  const step = state.steps[state.currentStep];
  document.getElementById('editTitle').value    = step.title;
  document.getElementById('editSubtitle').value = step.subtitle;
  document.getElementById('editDesc').value     = step.desc;
  document.getElementById('editNote').value     = step.note || '';
  openModal('stepEditModal');
}

function saveStepEdit() {
  const i = state.currentStep;
  state.steps[i].title    = document.getElementById('editTitle').value.trim() || state.steps[i].title;
  state.steps[i].subtitle = document.getElementById('editSubtitle').value.trim();
  state.steps[i].desc     = document.getElementById('editDesc').value.trim();
  state.steps[i].note     = document.getElementById('editNote').value.trim();
  closeModal('stepEditModal');
  refreshPane(i);
  buildRail();
  showToast('Step updated!');
  saveState();
}

// ── REFRESH PANE (partial re-render) ─────────────────────────────────────────
function refreshPane(idx) {
  const pane = document.getElementById(`pane-${idx}`);
  if (!pane) return;
  const wasVisible = pane.classList.contains('visible');
  pane.innerHTML = buildPaneHTML(state.steps[idx], idx);
  if (wasVisible) pane.classList.add('visible');
  bindChecklist(idx);
  bindToolbar(idx);
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────────
function openExportModal() {
  saveState();
  document.getElementById('exportText').value = JSON.stringify(state, null, 2);
  openModal('exportModal');
}

function copyExport() {
  navigator.clipboard.writeText(document.getElementById('exportText').value)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Select all and copy manually.'));
}

function openImportModal() {
  document.getElementById('importText').value = '';
  openModal('importModal');
}

function doImport() {
  try {
    const data = JSON.parse(document.getElementById('importText').value);
    if (!data.steps || !Array.isArray(data.steps)) throw new Error();
    state = data;
    localStorage.setItem('lms_state', JSON.stringify(state));
    closeModal('importModal');
    init();
    showToast('LMS imported!');
  } catch(e) {
    showToast('Invalid JSON — check and try again.');
  }
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── PROJECT TITLE ─────────────────────────────────────────────────────────────
document.getElementById('projectTitle').addEventListener('change', e => {
  state.projectTitle = e.target.value;
  saveState();
});

// ── INIT ──────────────────────────────────────────────────────────────────────
function init() {
  document.getElementById('projectTitle').value = state.projectTitle;
  buildRail();
  buildPanes();
  updateProgress();
  // Re-bind modal click-outside after rebuild
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.onclick = e => { if (e.target === overlay) overlay.classList.remove('open'); };
  });
}

loadState();
init();
