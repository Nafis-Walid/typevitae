/**
 * TypeVitae — Google Stitch Minimalist Frontend Architecture
 * Pure ES6 + Vanilla JavaScript (Zero build step, maximum deterministic speed)
 */

// Application State
const State = {
  currentProfileId: 'default_nafis',
  currentProfile: null,
  availableProfiles: [],
  presets: {},
  activePreset: 'master',
  expandedSections: new Set(['career_objective', 'education', 'experience', 'skills']),
  zoomLevel: 100,
  isCompiling: false,
  isSaving: false,
  currentTab: 'live' // 'live', 'pdf', 'tex'
};

// Fallback Presets Definition
const DEFAULT_PRESETS = {
  master: {
    name: 'Full Master (Comprehensive)',
    enabledSections: ['career_objective', 'education', 'research_interests', 'publications', 'experience', 'projects', 'teaching', 'skills', 'awards', 'volunteer', 'references'],
    objectiveProfiles: [
      'Embedded Software Engineering (Industry)',
      'Academic & Higher Education (Lecturer in CSE)',
      'Hardware Systems & Processor Architecture (VLSI)',
      'Human-Computer Interaction (HCI & Social Impact)'
    ]
  },
  industry: {
    name: 'Industry SWE / Embedded (2-Page)',
    enabledSections: ['career_objective', 'education', 'experience', 'projects', 'skills', 'awards'],
    objectiveProfiles: [
      'Embedded Software Engineering (Industry)',
      'Hardware Systems & Processor Architecture (VLSI)'
    ]
  },
  academic: {
    name: 'Academic / Faculty (2-Page)',
    enabledSections: ['career_objective', 'education', 'research_interests', 'publications', 'teaching', 'skills', 'references'],
    objectiveProfiles: [
      'Academic & Higher Education (Lecturer in CSE)',
      'Human-Computer Interaction (HCI & Social Impact)'
    ]
  },
  compact: {
    name: 'Compact Executive (1-Page)',
    enabledSections: ['career_objective', 'education', 'experience', 'projects', 'skills'],
    objectiveProfiles: [
      'Embedded Software Engineering (Industry)'
    ]
  }
};

// DOM Elements
const DOM = {
  profileSelect: document.getElementById('profileSelect'),
  btnSaveProfile: document.getElementById('btnSaveProfile'),
  btnCompile: document.getElementById('btnCompile'),
  compileSpinner: document.getElementById('compileSpinner'),
  compileIcon: document.getElementById('compileIcon'),
  latencyBadge: document.getElementById('latencyBadge'),
  latencyText: document.getElementById('latencyText'),
  latencyDot: document.getElementById('latencyDot'),
  
  // Header inputs
  hdrName: document.getElementById('hdrName'),
  hdrEmail: document.getElementById('hdrEmail'),
  hdrPhone: document.getElementById('hdrPhone'),
  hdrAddress: document.getElementById('hdrAddress'),
  hdrLinkedin: document.getElementById('hdrLinkedin'),
  hdrLinkedinLabel: document.getElementById('hdrLinkedinLabel'),
  hdrGithub: document.getElementById('hdrGithub'),
  hdrGithubLabel: document.getElementById('hdrGithubLabel'),
  hdrIncludePhoto: document.getElementById('hdrIncludePhoto'),
  photoPreviewImg: document.getElementById('photoPreviewImg'),
  photoPlaceholder: document.getElementById('photoPlaceholder'),
  photoFileInput: document.getElementById('photoFileInput'),
  btnUploadPhoto: document.getElementById('btnUploadPhoto'),

  // Sections
  sectionsList: document.getElementById('sectionsList'),
  sectionCountBadge: document.getElementById('sectionCountBadge'),
  btnAddCustomSectionTop: document.getElementById('btnAddCustomSectionTop'),
  btnAddCustomSectionBottom: document.getElementById('btnAddCustomSectionBottom'),

  // Preview Tabs & Views
  tabLivePreview: document.getElementById('tabLivePreview'),
  tabPdfPreview: document.getElementById('tabPdfPreview'),
  tabTexSource: document.getElementById('tabTexSource'),
  liveResumeWrapper: document.getElementById('liveResumeWrapper'),
  liveResumeContainer: document.getElementById('liveResumeContainer'),
  pdfViewerWrapper: document.getElementById('pdfViewerWrapper'),
  pdfFrame: document.getElementById('pdfFrame'),
  texSourceWrapper: document.getElementById('texSourceWrapper'),
  texSourceCode: document.getElementById('texSourceCode'),

  // Actions
  btnPrintResume: document.getElementById('btnPrintResume'),
  btnOpenOverleaf: document.getElementById('btnOpenOverleaf'),
  btnExportTex: document.getElementById('btnExportTex'),
  btnCopyTex: document.getElementById('btnCopyTex'),
  btnOpenSystem: document.getElementById('btnOpenSystem'),
  btnRefreshPdf: document.getElementById('btnRefreshPdf'),

  compilingOverlay: document.getElementById('compilingOverlay'),
  errorDrawer: document.getElementById('errorDrawer'),
  errorLogContent: document.getElementById('errorLogContent'),
  btnDismissError: document.getElementById('btnDismissError'),
  zoomLevelText: document.getElementById('zoomLevelText'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnFitWidth: document.getElementById('btnFitWidth'),
  btnZoomReset: document.getElementById('btnZoomReset'),

  // Modals
  addSectionModal: document.getElementById('addSectionModal'),
  customSectionTitle: document.getElementById('customSectionTitle'),
  customSectionType: document.getElementById('customSectionType'),
  btnConfirmAddSection: document.getElementById('btnConfirmAddSection'),
  btnCancelAddSection: document.getElementById('btnCancelAddSection'),
  btnCloseSectionModal: document.getElementById('btnCloseSectionModal'),

  newProfileModal: document.getElementById('newProfileModal'),
  newProfileName: document.getElementById('newProfileName'),
  cloneCurrentProfile: document.getElementById('cloneCurrentProfile'),
  btnConfirmNewProfile: document.getElementById('btnConfirmNewProfile'),
  btnCancelNewProfile: document.getElementById('btnCancelNewProfile'),
  btnCloseProfileModal: document.getElementById('btnCloseProfileModal'),

  toastContainer: document.getElementById('toastContainer')
};

// Utilities: Safe escaping for HTML attributes
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Toast Notifications
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  
  const icon = type === 'error'
    ? '<span class="text-red-400">✕</span>'
    : '<span class="text-emerald-400">✓</span>';

  toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
  DOM.toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Initialize Application
async function init() {
  setupEventListeners();
  await loadPresets();
  await loadProfilesList();
  await loadProfile('default_nafis');
}

// Setup Event Listeners
function setupEventListeners() {
  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Cmd+S or Ctrl+S: Save Profile
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveProfile();
    }
    // Cmd+Enter or Ctrl+Enter: Compile & Build
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      compileProfile();
    }
    // Cmd+P or Ctrl+P: Print / Save Vector PDF
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      printResume();
    }
  });

  // Action Buttons
  DOM.btnCompile.addEventListener('click', () => compileProfile());
  DOM.btnSaveProfile.addEventListener('click', () => saveProfile());
  if (DOM.btnOpenSystem) DOM.btnOpenSystem.addEventListener('click', () => openInNativePreview());
  if (DOM.btnRefreshPdf) DOM.btnRefreshPdf.addEventListener('click', () => refreshPdfFrame());

  // View Tabs
  if (DOM.tabLivePreview) DOM.tabLivePreview.addEventListener('click', () => switchTab('live'));
  if (DOM.tabPdfPreview) DOM.tabPdfPreview.addEventListener('click', () => switchTab('pdf'));
  if (DOM.tabTexSource) DOM.tabTexSource.addEventListener('click', () => switchTab('tex'));

  // Header & Export Actions
  if (DOM.btnPrintResume) DOM.btnPrintResume.addEventListener('click', () => printResume());
  if (DOM.btnOpenOverleaf) DOM.btnOpenOverleaf.addEventListener('click', () => openInOverleaf());
  if (DOM.btnExportTex) DOM.btnExportTex.addEventListener('click', () => exportTexSource());
  if (DOM.btnCopyTex) DOM.btnCopyTex.addEventListener('click', () => copyTexSource());

  // Zoom Controls
  DOM.btnZoomIn.addEventListener('click', () => adjustZoom(10));
  DOM.btnZoomOut.addEventListener('click', () => adjustZoom(-10));
  DOM.btnZoomReset.addEventListener('click', () => setZoom(100));
  DOM.btnFitWidth.addEventListener('click', () => setZoom(115));

  // Profile Selection
  DOM.profileSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      openNewProfileModal();
      DOM.profileSelect.value = State.currentProfileId;
    } else {
      loadProfile(val);
    }
  });

  // Presets Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      applyPreset(presetKey);
    });
  });

  // Header Field Bindings
  const headerFields = [
    { el: DOM.hdrName, prop: 'name' },
    { el: DOM.hdrEmail, prop: 'email' },
    { el: DOM.hdrPhone, prop: 'phone' },
    { el: DOM.hdrAddress, prop: 'address' },
    { el: DOM.hdrLinkedin, prop: 'linkedin' },
    { el: DOM.hdrLinkedinLabel, prop: 'linkedinLabel' },
    { el: DOM.hdrGithub, prop: 'github' },
    { el: DOM.hdrGithubLabel, prop: 'githubLabel' }
  ];

  headerFields.forEach(({ el, prop }) => {
    if (!el) return;
    el.addEventListener('input', (e) => {
      if (State.currentProfile && State.currentProfile.header) {
        State.currentProfile.header[prop] = e.target.value;
        scheduleLiveUpdate();
      }
    });
  });

  // Include Photo Checkbox
  DOM.hdrIncludePhoto.addEventListener('change', (e) => {
    if (State.currentProfile && State.currentProfile.header) {
      State.currentProfile.header.includePhoto = e.target.checked;
      scheduleLiveUpdate();
    }
  });

  // Photo Upload
  DOM.btnUploadPhoto.addEventListener('click', () => DOM.photoFileInput.click());
  DOM.photoFileInput.addEventListener('change', handlePhotoUpload);

  // Add Custom Section Modals
  DOM.btnAddCustomSectionTop.addEventListener('click', openAddSectionModal);
  DOM.btnAddCustomSectionBottom.addEventListener('click', openAddSectionModal);
  DOM.btnCloseSectionModal.addEventListener('click', closeAddSectionModal);
  DOM.btnCancelAddSection.addEventListener('click', closeAddSectionModal);
  DOM.btnConfirmAddSection.addEventListener('click', handleCreateCustomSection);

  // New Profile Modals
  DOM.btnCloseProfileModal.addEventListener('click', closeNewProfileModal);
  DOM.btnCancelNewProfile.addEventListener('click', closeNewProfileModal);
  DOM.btnConfirmNewProfile.addEventListener('click', handleCreateNewProfile);

  // Dismiss Error Log
  DOM.btnDismissError.addEventListener('click', () => {
    DOM.errorDrawer.classList.add('hidden');
  });

  // Event Delegation for Sections List
  DOM.sectionsList.addEventListener('click', handleSectionDelegatedClick);
  DOM.sectionsList.addEventListener('input', (e) => {
    handleSectionDelegatedInput(e);
    scheduleLiveUpdate();
  });
  DOM.sectionsList.addEventListener('change', (e) => {
    handleSectionDelegatedChange(e);
    scheduleLiveUpdate();
  });
}

// Zoom Management
function adjustZoom(delta) {
  setZoom(Math.min(200, Math.max(50, State.zoomLevel + delta)));
}

function setZoom(level) {
  State.zoomLevel = level;
  DOM.zoomLevelText.textContent = `${level}%`;
  const scale = level / 100;
  DOM.pdfViewerWrapper.style.transform = `scale(${scale})`;
}

// Presets Loading
async function loadPresets() {
  try {
    const res = await fetch('/api/presets');
    if (res.ok) {
      State.presets = await res.json();
    } else {
      State.presets = DEFAULT_PRESETS;
    }
  } catch {
    State.presets = DEFAULT_PRESETS;
  }
}

// Profiles List Loading with offline/Cloudflare Pages resiliency
async function loadProfilesList() {
  try {
    const res = await fetch('/api/profiles');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.profiles)) {
        State.availableProfiles = data.profiles;
        renderProfileSelectOptions();
        return;
      }
    }
    throw new Error('Fallback to local storage');
  } catch (err) {
    const localProfiles = JSON.parse(localStorage.getItem('typevitae_custom_profiles') || '[]');
    State.availableProfiles = [
      { id: 'default_nafis', name: 'Master Profile (Md Nafis Walid)' },
      ...localProfiles
    ];
    renderProfileSelectOptions();
  }
}

function renderProfileSelectOptions() {
  DOM.profileSelect.innerHTML = '';
  
  State.availableProfiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name || p.id} (${p.id})`;
    if (p.id === State.currentProfileId) opt.selected = true;
    DOM.profileSelect.appendChild(opt);
  });

  // Active workspace option
  const activeOpt = document.createElement('option');
  activeOpt.value = 'active';
  activeOpt.textContent = 'Active Workspace (Uncommitted)';
  if (State.currentProfileId === 'active') activeOpt.selected = true;
  DOM.profileSelect.appendChild(activeOpt);

  // New Profile prompt
  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '+ New Profile...';
  DOM.profileSelect.appendChild(newOpt);
}

// Load Specific Profile with 3-tier fallback (API -> LocalStorage -> default_profile.json)
async function loadProfile(profileId) {
  try {
    const res = await fetch(`/api/profile?id=${encodeURIComponent(profileId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.header) {
        State.currentProfileId = profileId;
        State.currentProfile = data;
        State.activePreset = data.activePreset || 'master';
        localStorage.setItem(`typevitae_profile_${profileId}`, JSON.stringify(data));
        renderAll();
        showToast(`Loaded profile: ${profileId}`);
        return;
      }
    }
    throw new Error('API unavailable');
  } catch (err) {
    // Tier 2: Check browser LocalStorage
    const cached = localStorage.getItem(`typevitae_profile_${profileId}`);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        State.currentProfileId = profileId;
        State.currentProfile = data;
        State.activePreset = data.activePreset || 'master';
        renderAll();
        showToast(`Loaded profile from browser storage: ${profileId}`);
        return;
      } catch (e) {}
    }

    // Tier 3: Fetch static default_profile.json
    try {
      const staticRes = await fetch('default_profile.json');
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        State.currentProfileId = profileId;
        State.currentProfile = staticData;
        State.activePreset = staticData.activePreset || 'master';
        localStorage.setItem(`typevitae_profile_${profileId}`, JSON.stringify(staticData));
        renderAll();
        showToast('Loaded default profile (Cloud Mode)');
        return;
      }
    } catch (e) {}

    showToast(`Failed to load profile ${profileId}`, 'error');
  }
}

// Save Current Profile (Local-First + Server Sync)
async function saveProfile() {
  if (!State.currentProfile || State.isSaving) return;
  State.isSaving = true;
  DOM.btnSaveProfile.disabled = true;

  // Persist locally first
  try {
    localStorage.setItem(`typevitae_profile_${State.currentProfileId}`, JSON.stringify(State.currentProfile));
  } catch (e) {}

  try {
    const res = await fetch(`/api/profile?id=${encodeURIComponent(State.currentProfileId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.currentProfile, null, 2)
    });

    if (res.ok) {
      showToast('Profile saved to disk (Cmd+S)');
    } else {
      showToast('Saved to browser storage (Cloud Mode)');
    }
  } catch (err) {
    showToast('Saved to browser storage (Cloud Mode)');
  } finally {
    State.isSaving = false;
    DOM.btnSaveProfile.disabled = false;
  }
}

// Compile & Build PDF (Dual-Mode: Local pdfTeX + Cloud Instant Live Preview)
async function compileProfile() {
  if (State.isCompiling) return;
  State.isCompiling = true;

  // UI Updates: Loading state
  DOM.btnCompile.disabled = true;
  DOM.compileSpinner.classList.remove('hidden');
  DOM.compileIcon.classList.add('hidden');
  DOM.compilingOverlay.classList.remove('hidden');
  DOM.compilingOverlay.classList.add('flex');
  DOM.latencyDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
  DOM.latencyText.textContent = 'Building...';

  // Instant client-side render
  renderLiveResume();
  updateTexSourceView();

  const t0 = performance.now();

  try {
    const res = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.currentProfile)
    });

    if (res.ok) {
      const result = await res.json();
      const elapsed = Math.round(performance.now() - t0);

      if (result.success) {
        const latency = result.latencyMs || elapsed;
        DOM.latencyDot.className = 'w-2 h-2 rounded-full bg-emerald-500 pulse-dot';
        DOM.latencyText.textContent = `${latency}ms`;
        DOM.errorDrawer.classList.add('hidden');
        
        refreshPdfFrame();
        showToast(`⚡ Built in ${latency}ms (pdfTeX)`);
        return;
      } else {
        DOM.latencyDot.className = 'w-2 h-2 rounded-full bg-red-500';
        DOM.latencyText.textContent = 'Error';
        displayCompileError(result.error || result.log || 'Compilation failed');
        showToast('LaTeX build failed', 'error');
        return;
      }
    }
    throw new Error('Cloud mode');
  } catch (err) {
    // Fallback for Cloudflare Pages / Offline: Instant Live View
    DOM.latencyDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    DOM.latencyText.textContent = 'Cloud Mode';
    DOM.errorDrawer.classList.add('hidden');
    switchTab('live');
    showToast('Live Web Resume & LaTeX Source Updated');
  } finally {
    State.isCompiling = false;
    DOM.btnCompile.disabled = false;
    DOM.compileSpinner.classList.add('hidden');
    DOM.compileIcon.classList.remove('hidden');
    DOM.compilingOverlay.classList.add('hidden');
    DOM.compilingOverlay.classList.remove('flex');
  }
}

function displayCompileError(errorText) {
  DOM.errorLogContent.textContent = errorText;
  DOM.errorDrawer.classList.remove('hidden');
}

function refreshPdfFrame() {
  const timestamp = Date.now();
  DOM.pdfFrame.src = `/api/pdf?t=${timestamp}#toolbar=0&navpanes=0`;
}

// Tab Switching
function switchTab(tab) {
  State.currentTab = tab;
  if (!DOM.tabLivePreview || !DOM.tabPdfPreview || !DOM.tabTexSource) return;

  const activeBtnClass = 'px-2 py-0.5 text-[11px] font-semibold rounded bg-neutral-800 text-white transition';
  const inactiveBtnClass = 'px-2 py-0.5 text-[11px] font-medium rounded text-neutral-400 hover:text-white transition';

  DOM.tabLivePreview.className = tab === 'live' ? activeBtnClass : inactiveBtnClass;
  DOM.tabPdfPreview.className = tab === 'pdf' ? activeBtnClass : inactiveBtnClass;
  DOM.tabTexSource.className = tab === 'tex' ? activeBtnClass : inactiveBtnClass;

  if (tab === 'live') {
    DOM.liveResumeWrapper.classList.remove('hidden');
    DOM.pdfViewerWrapper.classList.add('hidden');
    DOM.pdfViewerWrapper.classList.remove('flex');
    DOM.texSourceWrapper.classList.add('hidden');
    DOM.texSourceWrapper.classList.remove('flex');
    renderLiveResume();
  } else if (tab === 'pdf') {
    DOM.liveResumeWrapper.classList.add('hidden');
    DOM.pdfViewerWrapper.classList.remove('hidden');
    DOM.pdfViewerWrapper.classList.add('flex');
    DOM.texSourceWrapper.classList.add('hidden');
    DOM.texSourceWrapper.classList.remove('flex');
    refreshPdfFrame();
  } else if (tab === 'tex') {
    DOM.liveResumeWrapper.classList.add('hidden');
    DOM.pdfViewerWrapper.classList.add('hidden');
    DOM.pdfViewerWrapper.classList.remove('flex');
    DOM.texSourceWrapper.classList.remove('hidden');
    DOM.texSourceWrapper.classList.add('flex');
    updateTexSourceView();
  }
}

// Print / Save as PDF
function printResume() {
  switchTab('live');
  setTimeout(() => window.print(), 100);
}

// Open directly in Overleaf (Cloud LaTeX)
function openInOverleaf() {
  const tex = generateClientLatex(State.currentProfile, State.activePreset);
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.overleaf.com/docs';
  form.target = '_blank';

  const snipInput = document.createElement('input');
  snipInput.type = 'hidden';
  snipInput.name = 'snip';
  snipInput.value = tex;
  form.appendChild(snipInput);

  const nameInput = document.createElement('input');
  nameInput.type = 'hidden';
  nameInput.name = 'snip_name';
  nameInput.value = 'TypeVitae_CV.tex';
  form.appendChild(nameInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  showToast('Opening Overleaf Cloud LaTeX ↗');
}

// Download .tex source file
function exportTexSource() {
  const tex = generateClientLatex(State.currentProfile, State.activePreset);
  const blob = new Blob([tex], { type: 'text/x-tex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (State.currentProfile?.header?.name || 'TypeVitae').replace(/\s+/g, '_');
  a.href = url;
  a.download = `${safeName}_CV.tex`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloaded LaTeX source (.tex)');
}

// Copy LaTeX to Clipboard
function copyTexSource() {
  const tex = generateClientLatex(State.currentProfile, State.activePreset);
  navigator.clipboard.writeText(tex).then(() => {
    showToast('LaTeX source copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

// Debounced live update
let liveUpdateTimer = null;
function scheduleLiveUpdate() {
  if (liveUpdateTimer) clearTimeout(liveUpdateTimer);
  liveUpdateTimer = setTimeout(() => {
    renderLiveResume();
    updateTexSourceView();
  }, 100);
}

// Open in Native macOS Preview.app
async function openInNativePreview() {
  try {
    const res = await fetch('/api/open-system', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Opened in macOS Preview.app');
    } else {
      showToast(data.error || 'Failed to open Preview', 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Photo Upload Handler (Local Server + In-Browser DataURL Cloud Fallback)
async function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    DOM.photoPreviewImg.src = evt.target.result;
    DOM.photoPreviewImg.classList.remove('hidden');
    DOM.photoPlaceholder.classList.add('hidden');

    if (State.currentProfile && State.currentProfile.header) {
      State.currentProfile.header.photoDataUrl = evt.target.result;
      State.currentProfile.header.photoPath = 'photo.png';
      State.currentProfile.header.includePhoto = true;
      DOM.hdrIncludePhoto.checked = true;
      renderLiveResume();
      updateTexSourceView();
    }
  };
  reader.readAsDataURL(file);

  try {
    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'image/png' },
      body: file
    });

    if (res.ok) {
      showToast('Candidate photo saved to server & profile');
    } else {
      showToast('Candidate photo updated in browser (Cloud Mode)');
    }
  } catch (err) {
    showToast('Candidate photo updated in browser (Cloud Mode)');
  }
}

// Apply Preset
function applyPreset(presetKey) {
  const preset = State.presets[presetKey] || DEFAULT_PRESETS[presetKey];
  if (!preset || !State.currentProfile) return;

  State.activePreset = presetKey;
  State.currentProfile.activePreset = presetKey;

  // Toggle sections based on preset
  if (Array.isArray(State.currentProfile.sections)) {
    State.currentProfile.sections.forEach(sec => {
      sec.enabled = preset.enabledSections.includes(sec.id);

      // Handle objectives if section is career_objective
      if (sec.id === 'career_objective' && Array.isArray(sec.profiles)) {
        sec.profiles.forEach(p => {
          p.enabled = preset.objectiveProfiles ? preset.objectiveProfiles.includes(p.name) : true;
        });
      }
    });
  }

  updatePresetButtonsUI();
  renderSections();
  renderLiveResume();
  updateTexSourceView();
  showToast(`Preset activated: ${preset.name || presetKey}`);
}

function updatePresetButtonsUI() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.dataset.preset === State.activePreset) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Full Re-render
function renderAll() {
  renderHeader();
  updatePresetButtonsUI();
  renderSections();
  renderLiveResume();
  updateTexSourceView();
}

// Render Header Card
function renderHeader() {
  const hdr = State.currentProfile?.header || {};

  DOM.hdrName.value = hdr.name || '';
  DOM.hdrEmail.value = hdr.email || '';
  DOM.hdrPhone.value = hdr.phone || '';
  DOM.hdrAddress.value = hdr.address || '';
  DOM.hdrLinkedin.value = hdr.linkedin || '';
  DOM.hdrLinkedinLabel.value = hdr.linkedinLabel || 'LinkedIn';
  DOM.hdrGithub.value = hdr.github || '';
  DOM.hdrGithubLabel.value = hdr.githubLabel || 'GitHub';
  DOM.hdrIncludePhoto.checked = Boolean(hdr.includePhoto);

  // Photo
  if (hdr.photoDataUrl || hdr.photoPath) {
    DOM.photoPreviewImg.src = hdr.photoDataUrl || `photo.png?t=${Date.now()}`;
    DOM.photoPreviewImg.classList.remove('hidden');
    DOM.photoPlaceholder.classList.add('hidden');
  } else {
    DOM.photoPreviewImg.classList.add('hidden');
    DOM.photoPlaceholder.classList.remove('hidden');
  }
}

// =========================================================================
// Client-Side LaTeX Engine & Live Resume Renderers
// =========================================================================

function escapeLatexClient(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function generateClientLatex(profile, presetKey = 'master') {
  if (!profile || !profile.header) return '% No profile loaded';

  const hdr = profile.header;
  const name = escapeLatexClient(hdr.name || 'Curriculum Vitae');
  const email = escapeLatexClient(hdr.email || '');
  const phone = escapeLatexClient(hdr.phone || '');
  const address = escapeLatexClient(hdr.address || '');
  const linkedin = hdr.linkedin || '';
  const linkedinLabel = escapeLatexClient(hdr.linkedinLabel || 'LinkedIn');
  const github = hdr.github || '';
  const githubLabel = escapeLatexClient(hdr.githubLabel || 'GitHub');

  const preset = State.presets[presetKey] || DEFAULT_PRESETS[presetKey] || DEFAULT_PRESETS.master;
  const allowedSections = new Set(preset.enabledSections || []);

  let sectionsLatex = '';
  const sections = profile.sections || [];

  for (const sec of sections) {
    if (sec.enabled === false || !allowedSections.has(sec.id)) continue;
    const secTitle = escapeLatexClient(sec.title || sec.id);

    if (sec.type === 'profiles') {
      const activeObj = (sec.profiles || []).find(p => p.enabled !== false && (!preset.objectiveProfiles || preset.objectiveProfiles.includes(p.name)));
      if (activeObj && activeObj.text) {
        sectionsLatex += `\n\\section{${secTitle}}\n\\noindent\\carrObj{${escapeLatexClient(activeObj.text)}}\n`;
      }
    } else if (sec.type === 'items_degree') {
      sectionsLatex += `\n\\section{${secTitle}}\n`;
      for (const item of (sec.items || [])) {
        const deg = escapeLatexClient(item.degree || '');
        const inst = escapeLatexClient(item.institution || '');
        const dates = escapeLatexClient(item.dates || '');
        const grade = escapeLatexClient(item.grade || '');
        const details = escapeLatexClient(item.details || '');
        sectionsLatex += `\\edu{${deg}}{${inst}}{${dates}}{${grade}}{${details}}\n`;
      }
    } else if (sec.type === 'experience') {
      sectionsLatex += `\n\\section{${secTitle}}\n`;
      for (const item of (sec.items || [])) {
        const role = escapeLatexClient(item.role || '');
        const comp = escapeLatexClient(item.company || '');
        const dates = escapeLatexClient(item.dates || '');
        const bullets = (item.bullets || []).filter(b => b.trim()).map(b => `  \\item ${escapeLatexClient(b)}`).join('\n');
        sectionsLatex += `\\profExp{${role}}{${comp}}{${dates}}{\n\\begin{itemize}\n${bullets}\n\\end{itemize}\n}\n`;
      }
    } else if (sec.type === 'projects') {
      sectionsLatex += `\n\\section{${secTitle}}\n`;
      for (const item of (sec.items || [])) {
        const pTitle = escapeLatexClient(item.title || '');
        const tools = escapeLatexClient(item.tools || '');
        const link = item.link || '';
        const bullets = (item.bullets || []).filter(b => b.trim()).map(b => `  \\item ${escapeLatexClient(b)}`).join('\n');
        sectionsLatex += `\\project{${pTitle}}{${tools}}{\\href{${link}}{${link}}}{\n\\begin{itemize}\n${bullets}\n\\end{itemize}\n}\n`;
      }
    } else if (sec.type === 'publications') {
      sectionsLatex += `\n\\section{${secTitle}}\n\\begin{enumerate}\n`;
      for (const item of (sec.items || [])) {
        const authors = escapeLatexClient(item.authors || '');
        const pTitle = escapeLatexClient(item.title || '');
        const venue = escapeLatexClient(item.venue || '');
        const year = escapeLatexClient(item.year || '');
        const doi = item.doi ? `\\href{${item.doi}}{${escapeLatexClient(item.doi)}}` : '';
        sectionsLatex += `  \\item ${authors} (${year}). \\textbf{${pTitle}}. \\textit{${venue}}. ${doi}\n`;
      }
      sectionsLatex += `\\end{enumerate}\n`;
    } else if (sec.type === 'skills') {
      sectionsLatex += `\n\\section{${secTitle}}\n\\begin{itemize}[leftmargin=*]\n`;
      for (const cat of (sec.categories || [])) {
        const cName = escapeLatexClient(cat.category || '');
        const cItems = Array.isArray(cat.items) ? cat.items.map(escapeLatexClient).join(', ') : escapeLatexClient(cat.items || '');
        sectionsLatex += `  \\item \\textbf{${cName}:} ${cItems}\n`;
      }
      sectionsLatex += `\\end{itemize}\n`;
    } else if (sec.type === 'awards') {
      sectionsLatex += `\n\\section{${secTitle}}\n`;
      for (const item of (sec.items || [])) {
        const aTitle = escapeLatexClient(item.title || '');
        const org = escapeLatexClient(item.organization || '');
        const dates = escapeLatexClient(item.dates || '');
        const note = escapeLatexClient(item.note || '');
        sectionsLatex += `\\award{${aTitle}}{${org}}{${dates}}{${note}}\n`;
      }
    } else if (sec.type === 'volunteer') {
      sectionsLatex += `\n\\section{${secTitle}}\n`;
      for (const item of (sec.items || [])) {
        const role = escapeLatexClient(item.role || '');
        const org = escapeLatexClient(item.organization || '');
        const dates = escapeLatexClient(item.dates || '');
        const bullets = (item.bullets || []).filter(b => b.trim()).map(b => `  \\item ${escapeLatexClient(b)}`).join('\n');
        sectionsLatex += `\\activity{${role}}{${org}}{${dates}}{\n\\begin{itemize}\n${bullets}\n\\end{itemize}\n}\n`;
      }
    } else {
      sectionsLatex += `\n\\section{${secTitle}}\n\\noindent ${escapeLatexClient(sec.text || '')}\n`;
    }
  }

  const headerCommand = hdr.includePhoto
    ? `\\cvheaderwithphoto{${name}}{${email}}{${phone}}{${address}}{${linkedin}}{${linkedinLabel}}{${github}}{${githubLabel}}{photo.png}`
    : `\\cvheader{${name}}{${email}}{${phone}}{${address}}{${linkedin}}{${linkedinLabel}}{${github}}{${githubLabel}}`;

  return `% =========================================================================
% TypeVitae CV Operating System - Deterministic Typographic Document
% Preset: ${preset.name || presetKey} | Client-Side Engine
% =========================================================================

\\documentclass[10pt,a4paper]{article}

% ATS-Friendly Glyphs & Unicode Mapping
\\input{glyphtounicode}
\\pdfgentounicode=1

% Core Typographic Style
\\usepackage{typevitae}
\\renewcommand{\\familydefault}{\\sfdefault}
\\geometry{top=1.3cm, bottom=1.3cm, left=1.2cm, right=1.2cm}

% ATS / PDF Semantic Tagging & Metadata
\\hypersetup{
  pdftitle={${name} - Curriculum Vitae},
  pdfauthor={${name}},
  pdfsubject={Curriculum Vitae / Professional Resume},
  pdfkeywords={Curriculum Vitae, Resume, Engineering, TypeVitae},
  pdfcreator={TypeVitae Monochrome Studio},
  hidelinks
}

\\begin{document}

${headerCommand}
${sectionsLatex}
\\end{document}
`;
}

function updateTexSourceView() {
  if (!DOM.texSourceCode) return;
  DOM.texSourceCode.textContent = generateClientLatex(State.currentProfile, State.activePreset);
}

function renderLiveResume() {
  if (!DOM.liveResumeContainer || !State.currentProfile) return;

  const profile = State.currentProfile;
  const hdr = profile.header || {};
  const preset = State.presets[State.activePreset] || DEFAULT_PRESETS[State.activePreset] || DEFAULT_PRESETS.master;
  const allowedSections = new Set(preset.enabledSections || []);

  const photoSrc = hdr.photoDataUrl || (hdr.photoPath ? 'photo.png' : '');

  // Header HTML
  let headerHtml = `
    <div class="cv-page">
      <div class="flex items-start justify-between gap-6 pb-2 border-b-2 border-black">
        <div class="flex-1">
          <h1 class="cv-header-name">${escapeHtml(hdr.name || 'Your Name')}</h1>
          <div class="cv-contact-bar">
            ${hdr.email ? `<span>✉ <a href="mailto:${escapeHtml(hdr.email)}">${escapeHtml(hdr.email)}</a></span>` : ''}
            ${hdr.phone ? `<span>☎ ${escapeHtml(hdr.phone)}</span>` : ''}
            ${hdr.address ? `<span>📍 ${escapeHtml(hdr.address)}</span>` : ''}
            ${hdr.linkedin ? `<span>in <a href="${escapeHtml(hdr.linkedin)}" target="_blank">${escapeHtml(hdr.linkedinLabel || 'LinkedIn')}</a></span>` : ''}
            ${hdr.github ? `<span>⌨ <a href="${escapeHtml(hdr.github)}" target="_blank">${escapeHtml(hdr.githubLabel || 'GitHub')}</a></span>` : ''}
          </div>
        </div>
        ${hdr.includePhoto && photoSrc ? `
          <div class="shrink-0">
            <img src="${escapeHtml(photoSrc)}" alt="Photo" class="w-20 h-20 rounded-full object-cover border-2 border-black shadow-sm">
          </div>
        ` : ''}
      </div>
  `;

  // Sections HTML
  let sectionsHtml = '<div class="space-y-4 pt-1">';
  const sections = profile.sections || [];

  for (const sec of sections) {
    if (sec.enabled === false || !allowedSections.has(sec.id)) continue;

    sectionsHtml += `
      <section class="cv-section">
        <h2 class="cv-section-title">${escapeHtml(sec.title || sec.id)}</h2>
    `;

    if (sec.type === 'profiles') {
      const activeObj = (sec.profiles || []).find(p => p.enabled !== false && (!preset.objectiveProfiles || preset.objectiveProfiles.includes(p.name)));
      if (activeObj && activeObj.text) {
        sectionsHtml += `<p class="text-[12px] text-neutral-800 leading-relaxed">${escapeHtml(activeObj.text)}</p>`;
      }
    } else if (sec.type === 'items_degree') {
      sectionsHtml += `<div class="space-y-2">`;
      for (const item of (sec.items || [])) {
        sectionsHtml += `
          <div class="cv-item">
            <div class="cv-item-header">
              <div>
                <span class="cv-item-title">${escapeHtml(item.degree || '')}</span>
                ${item.institution ? ` — <span class="cv-item-org">${escapeHtml(item.institution)}</span>` : ''}
              </div>
              <span class="cv-item-meta">${escapeHtml(item.dates || '')}</span>
            </div>
            ${item.grade ? `<div class="text-[11.5px] font-mono text-neutral-600 mt-0.5">${escapeHtml(item.grade)}</div>` : ''}
            ${item.details ? `<div class="text-[11.5px] text-neutral-700 mt-0.5">${escapeHtml(item.details)}</div>` : ''}
          </div>
        `;
      }
      sectionsHtml += `</div>`;
    } else if (sec.type === 'experience') {
      sectionsHtml += `<div class="space-y-3">`;
      for (const item of (sec.items || [])) {
        sectionsHtml += `
          <div class="cv-item">
            <div class="cv-item-header">
              <div>
                <span class="cv-item-title">${escapeHtml(item.role || '')}</span>
                ${item.company ? `, <span class="cv-item-org">${escapeHtml(item.company)}</span>` : ''}
              </div>
              <span class="cv-item-meta">${escapeHtml(item.dates || '')}</span>
            </div>
            ${item.bullets && item.bullets.length ? `
              <ul class="cv-bullets">
                ${item.bullets.filter(b => b.trim()).map(b => `<li class="cv-bullet">${escapeHtml(b)}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }
      sectionsHtml += `</div>`;
    } else if (sec.type === 'projects') {
      sectionsHtml += `<div class="space-y-2.5">`;
      for (const item of (sec.items || [])) {
        sectionsHtml += `
          <div class="cv-item">
            <div class="cv-item-header">
              <div>
                <span class="cv-item-title">${escapeHtml(item.title || '')}</span>
                ${item.tools ? `<span class="text-[11px] font-mono text-neutral-500 ml-1.5">[${escapeHtml(item.tools)}]</span>` : ''}
              </div>
              <span class="cv-item-meta">${escapeHtml(item.dates || '')}</span>
            </div>
            ${item.bullets && item.bullets.length ? `
              <ul class="cv-bullets">
                ${item.bullets.filter(b => b.trim()).map(b => `<li class="cv-bullet">${escapeHtml(b)}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }
      sectionsHtml += `</div>`;
    } else if (sec.type === 'publications') {
      sectionsHtml += `<ol class="list-decimal pl-5 space-y-1.5 text-[11.5px]">`;
      for (const item of (sec.items || [])) {
        sectionsHtml += `
          <li class="leading-relaxed">
            ${escapeHtml(item.authors || '')} (${escapeHtml(item.year || '')}).
            <strong>${escapeHtml(item.title || '')}</strong>.
            <em>${escapeHtml(item.venue || '')}</em>.
            ${item.doi ? `<a href="${escapeHtml(item.doi)}" target="_blank" class="underline font-mono text-[11px] ml-1">${escapeHtml(item.doi)}</a>` : ''}
          </li>
        `;
      }
      sectionsHtml += `</ol>`;
    } else if (sec.type === 'skills') {
      sectionsHtml += `<div class="cv-skills-grid">`;
      for (const cat of (sec.categories || [])) {
        const cItems = Array.isArray(cat.items) ? cat.items.join(', ') : (cat.items || '');
        sectionsHtml += `
          <div class="cv-skill-row">
            <span class="cv-skill-label">${escapeHtml(cat.category || '')}:</span>
            <span class="cv-skill-values">${escapeHtml(cItems)}</span>
          </div>
        `;
      }
      sectionsHtml += `</div>`;
    } else if (sec.type === 'awards') {
      sectionsHtml += `<div class="space-y-1.5">`;
      for (const item of (sec.items || [])) {
        sectionsHtml += `
          <div class="cv-item">
            <div class="cv-item-header">
              <span class="cv-item-title">${escapeHtml(item.title || '')}</span>
              <span class="cv-item-meta">${escapeHtml(item.dates || '')}</span>
            </div>
            <div class="text-[11.5px] text-neutral-600">${escapeHtml(item.organization || '')} ${item.note ? `— ${escapeHtml(item.note)}` : ''}</div>
          </div>
        `;
      }
      sectionsHtml += `</div>`;
    } else if (sec.type === 'volunteer') {
      sectionsHtml += `<div class="space-y-2">`;
      for (const item of (sec.items || [])) {
        sectionsHtml += `
          <div class="cv-item">
            <div class="cv-item-header">
              <span class="cv-item-title">${escapeHtml(item.role || '')}</span>
              <span class="cv-item-meta">${escapeHtml(item.dates || '')}</span>
            </div>
            <div class="text-[11.5px] text-neutral-600">${escapeHtml(item.organization || '')}</div>
            ${item.bullets && item.bullets.length ? `
              <ul class="cv-bullets">
                ${item.bullets.filter(b => b.trim()).map(b => `<li class="cv-bullet">${escapeHtml(b)}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }
      sectionsHtml += `</div>`;
    } else {
      sectionsHtml += `<p class="text-[12px] text-neutral-800 leading-relaxed whitespace-pre-line">${escapeHtml(sec.text || '')}</p>`;
    }

    sectionsHtml += `</section>`;
  }

  sectionsHtml += '</div></div>';
  DOM.liveResumeContainer.innerHTML = headerHtml + sectionsHtml;
}

// Render Sections Manager
function renderSections() {
  const sections = State.currentProfile?.sections || [];
  DOM.sectionCountBadge.textContent = `${sections.length} Sections`;
  DOM.sectionsList.innerHTML = '';

  sections.forEach((sec, index) => {
    const isExpanded = State.expandedSections.has(sec.id);
    const card = document.createElement('div');
    card.className = `stitch-card ${!sec.enabled ? 'disabled-card' : ''}`;
    card.dataset.sectionIndex = index;
    card.dataset.sectionId = sec.id;

    // Header HTML
    const headerHtml = `
      <div class="section-header ${isExpanded ? 'expanded' : ''}" data-action="toggle-accordion" data-index="${index}">
        <div class="flex items-center gap-2.5 min-w-0">
          <!-- Reorder buttons -->
          <div class="flex flex-col gap-0.5 shrink-0" onclick="event.stopPropagation();">
            <button class="btn-icon !w-5 !h-4 !rounded-[3px] text-[10px] reorder-btn hover:bg-neutral-200" data-action="move-up" data-index="${index}" title="Move Section Up" ${index === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn-icon !w-5 !h-4 !rounded-[3px] text-[10px] reorder-btn hover:bg-neutral-200" data-action="move-down" data-index="${index}" title="Move Section Down" ${index === sections.length - 1 ? 'disabled' : ''}>▼</button>
          </div>

          <!-- Enable Checkbox -->
          <input type="checkbox" class="stitch-checkbox" data-action="toggle-section" data-index="${index}" ${sec.enabled ? 'checked' : ''} onclick="event.stopPropagation();" title="Include in LaTeX build">

          <!-- Section Title & Type Badge -->
          <div class="flex items-center gap-2 truncate">
            <span class="font-bold text-xs text-stitch-black truncate">${escapeHtml(sec.title || sec.id)}</span>
            <span class="badge-mono !text-[9px] uppercase tracking-wider shrink-0">${escapeHtml(sec.type || 'SECTION')}</span>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0" onclick="event.stopPropagation();">
          <button class="btn-icon btn-icon-danger !w-6 !h-6" data-action="delete-section" data-index="${index}" title="Delete Section">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
          <div class="text-stitch-gray400 text-xs px-1 cursor-pointer" data-action="toggle-accordion" data-index="${index}">
            ${isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>
    `;

    // Body HTML
    let bodyHtml = `<div class="section-body ${isExpanded ? '' : 'collapsed'}">`;
    bodyHtml += renderSectionContent(sec, index);
    bodyHtml += `</div>`;

    card.innerHTML = headerHtml + bodyHtml;
    DOM.sectionsList.appendChild(card);
  });
}

// Render Inner Content of a Section
function renderSectionContent(sec, secIndex) {
  let html = `
    <div class="space-y-3">
      <!-- Section Title Edit -->
      <div class="flex items-center gap-2 pb-2 border-b border-stitch-gray100">
        <label class="stitch-label !mb-0 shrink-0">Section Title:</label>
        <input type="text" class="stitch-input stitch-input-sm" data-action="edit-section-title" data-sec-idx="${secIndex}" value="${escapeHtml(sec.title || '')}">
      </div>
  `;

  switch (sec.type) {
    case 'profiles': // Career Objectives
      html += renderCareerObjectives(sec, secIndex);
      break;

    case 'items_degree': // Education
      html += renderEducationItems(sec, secIndex);
      break;

    case 'experience': // Experience
      html += renderExperienceItems(sec, secIndex);
      break;

    case 'projects': // Projects
      html += renderProjectItems(sec, secIndex);
      break;

    case 'publications': // Publications
      html += renderPublicationItems(sec, secIndex);
      break;

    case 'teaching': // Teaching
      html += renderTeachingItems(sec, secIndex);
      break;

    case 'skills': // Skills categories
      html += renderSkillsCategories(sec, secIndex);
      break;

    case 'awards': // Awards
      html += renderAwardItems(sec, secIndex);
      break;

    case 'volunteer': // Volunteer
      html += renderVolunteerItems(sec, secIndex);
      break;

    case 'text': // Freeform text
    default:
      html += `
        <div>
          <label class="stitch-label">Text Content</label>
          <textarea class="stitch-textarea" data-action="edit-section-text" data-sec-idx="${secIndex}" rows="4">${escapeHtml(sec.text || '')}</textarea>
        </div>
      `;
      break;
  }

  html += `</div>`;
  return html;
}

// 1. Career Objectives Renderer
function renderCareerObjectives(sec, secIndex) {
  const profiles = sec.profiles || [];
  let html = `<div class="space-y-2.5">`;

  profiles.forEach((p, pIdx) => {
    html += `
      <div class="item-card ${!p.enabled ? 'opacity-50' : ''}">
        <div class="flex items-center justify-between pb-2 border-b border-stitch-gray200 mb-2">
          <label class="flex items-center gap-2 text-xs font-semibold text-stitch-black cursor-pointer">
            <input type="checkbox" class="stitch-checkbox" data-action="toggle-profile-item" data-sec-idx="${secIndex}" data-item-idx="${pIdx}" ${p.enabled ? 'checked' : ''}>
            <span>Include in CV</span>
          </label>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-profile-item" data-sec-idx="${secIndex}" data-item-idx="${pIdx}" title="Delete Objective">✕</button>
        </div>
        <div class="space-y-2">
          <div>
            <label class="stitch-label">Objective Track / Target Role</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-profile-name" data-sec-idx="${secIndex}" data-item-idx="${pIdx}" value="${escapeHtml(p.name || '')}">
          </div>
          <div>
            <label class="stitch-label">Statement</label>
            <textarea class="stitch-textarea !min-h-[50px]" data-action="edit-profile-text" data-sec-idx="${secIndex}" data-item-idx="${pIdx}">${escapeHtml(p.text || '')}</textarea>
          </div>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-profile-item" data-sec-idx="${secIndex}">
      + Add Career Objective Track
    </button>
  </div>`;
  return html;
}

// 2. Education Renderer
function renderEducationItems(sec, secIndex) {
  const items = sec.items || [];
  let html = `<div class="space-y-2.5">`;

  items.forEach((item, itemIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <span class="font-bold text-[11px] text-stitch-gray700 uppercase">Degree Entry #${itemIdx + 1}</span>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-degree-item" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" title="Delete Degree">✕</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div class="sm:col-span-2">
            <label class="stitch-label">Degree Title</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-degree-field" data-field="degree" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.degree || '')}">
          </div>
          <div class="sm:col-span-2">
            <label class="stitch-label">Institution / Location</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-degree-field" data-field="institution" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.institution || '')}">
          </div>
          <div>
            <label class="stitch-label">Dates</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-degree-field" data-field="dates" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.dates || '')}">
          </div>
          <div>
            <label class="stitch-label">Grade / CGPA</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-degree-field" data-field="grade" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.grade || '')}">
          </div>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-degree-item" data-sec-idx="${secIndex}">
      + Add Education / Degree
    </button>
  </div>`;
  return html;
}

// 3. Experience Renderer
function renderExperienceItems(sec, secIndex) {
  const items = sec.items || [];
  let html = `<div class="space-y-3">`;

  items.forEach((item, itemIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <span class="font-bold text-[11px] text-stitch-gray700 uppercase">Position #${itemIdx + 1}</span>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-experience-item" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" title="Delete Position">✕</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label class="stitch-label">Role / Title</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-exp-field" data-field="role" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.role || '')}">
          </div>
          <div>
            <label class="stitch-label">Company / Organization</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-exp-field" data-field="company" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.company || '')}">
          </div>
          <div class="sm:col-span-2">
            <label class="stitch-label">Dates / Duration</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-exp-field" data-field="dates" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.dates || '')}">
          </div>
        </div>

        <!-- Bullets -->
        <div class="space-y-1.5 pt-2 border-t border-stitch-gray200">
          <label class="stitch-label">Impact &amp; Responsibilities (Bullets)</label>
          ${renderBullets(item.bullets, secIndex, itemIdx, 'exp')}
          <button class="btn-secondary !text-[11px] !py-0.5 !px-2 mt-1" data-action="add-bullet" data-type="exp" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}">
            + Add Bullet
          </button>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-experience-item" data-sec-idx="${secIndex}">
      + Add Experience Entry
    </button>
  </div>`;
  return html;
}

// 4. Projects Renderer
function renderProjectItems(sec, secIndex) {
  const items = sec.items || [];
  let html = `<div class="space-y-3">`;

  items.forEach((item, itemIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <span class="font-bold text-[11px] text-stitch-gray700 uppercase">Project #${itemIdx + 1}</span>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-project-item" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" title="Delete Project">✕</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label class="stitch-label">Project Name</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-project-field" data-field="name" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.name || '')}">
          </div>
          <div>
            <label class="stitch-label">Project URL / Link</label>
            <input type="text" class="stitch-input stitch-input-sm font-mono text-[11px]" data-action="edit-project-field" data-field="url" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.url || '')}">
          </div>
        </div>

        <!-- Bullets -->
        <div class="space-y-1.5 pt-2 border-t border-stitch-gray200">
          <label class="stitch-label">Technical Achievements &amp; Scope</label>
          ${renderBullets(item.bullets, secIndex, itemIdx, 'project')}
          <button class="btn-secondary !text-[11px] !py-0.5 !px-2 mt-1" data-action="add-bullet" data-type="project" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}">
            + Add Bullet
          </button>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-project-item" data-sec-idx="${secIndex}">
      + Add Project Entry
    </button>
  </div>`;
  return html;
}

// 5. Publications Renderer
function renderPublicationItems(sec, secIndex) {
  const items = sec.items || [];
  let html = `<div class="space-y-2.5">`;

  items.forEach((item, itemIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <span class="font-bold text-[11px] text-stitch-gray700 uppercase">Paper #${itemIdx + 1}</span>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-publication-item" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" title="Delete Publication">✕</button>
        </div>
        <div class="space-y-2">
          <div>
            <label class="stitch-label">Paper Title</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-pub-field" data-field="title" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.title || '')}">
          </div>
          <div>
            <label class="stitch-label">Authors</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-pub-field" data-field="authors" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.authors || '')}">
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="sm:col-span-2">
              <label class="stitch-label">Venue / Conference</label>
              <input type="text" class="stitch-input stitch-input-sm" data-action="edit-pub-field" data-field="venue" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.venue || '')}">
            </div>
            <div>
              <label class="stitch-label">Year</label>
              <input type="text" class="stitch-input stitch-input-sm" data-action="edit-pub-field" data-field="year" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.year || '')}">
            </div>
          </div>
          <div>
            <label class="stitch-label">Author Name to Bold (Highlight)</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-pub-field" data-field="highlightAuthor" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.highlightAuthor || '')}">
          </div>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-publication-item" data-sec-idx="${secIndex}">
      + Add Publication
    </button>
  </div>`;
  return html;
}

// 6. Teaching Renderer
function renderTeachingItems(sec, secIndex) {
  const items = sec.items || [];
  let html = `<div class="space-y-3">`;

  items.forEach((item, itemIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <span class="font-bold text-[11px] text-stitch-gray700 uppercase">Teaching Entry #${itemIdx + 1}</span>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-teaching-item" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" title="Delete Entry">✕</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label class="stitch-label">Role</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-teaching-field" data-field="role" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.role || '')}">
          </div>
          <div>
            <label class="stitch-label">Institution / Platform</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-teaching-field" data-field="institution" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.institution || '')}">
          </div>
          <div class="sm:col-span-2">
            <label class="stitch-label">Dates</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-teaching-field" data-field="dates" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.dates || '')}">
          </div>
        </div>

        <!-- Bullets -->
        <div class="space-y-1.5 pt-2 border-t border-stitch-gray200">
          <label class="stitch-label">Pedagogy &amp; Courses Taught</label>
          ${renderBullets(item.bullets, secIndex, itemIdx, 'teaching')}
          <button class="btn-secondary !text-[11px] !py-0.5 !px-2 mt-1" data-action="add-bullet" data-type="teaching" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}">
            + Add Bullet
          </button>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-teaching-item" data-sec-idx="${secIndex}">
      + Add Teaching Entry
    </button>
  </div>`;
  return html;
}

// 7. Skills Renderer
function renderSkillsCategories(sec, secIndex) {
  const categories = sec.categories || [];
  let html = `<div class="space-y-3">`;

  categories.forEach((cat, catIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <div class="flex items-center gap-2 flex-1 mr-2">
            <label class="stitch-label !mb-0 shrink-0">Category:</label>
            <input type="text" class="stitch-input stitch-input-sm font-semibold" data-action="edit-skill-cat-title" data-sec-idx="${secIndex}" data-cat-idx="${catIdx}" value="${escapeHtml(cat.title || '')}">
          </div>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-skill-cat" data-sec-idx="${secIndex}" data-cat-idx="${catIdx}" title="Delete Category">✕</button>
        </div>

        <!-- Skill Rows in this category -->
        <div class="space-y-2">
          ${(cat.items || []).map((sk, skIdx) => `
            <div class="flex items-center gap-2 bg-white p-2 rounded border border-stitch-gray200">
              <input type="text" class="stitch-input stitch-input-sm !w-1/3" placeholder="Label (e.g. Languages)" data-action="edit-skill-item" data-field="label" data-sec-idx="${secIndex}" data-cat-idx="${catIdx}" data-sk-idx="${skIdx}" value="${escapeHtml(sk.label || '')}">
              <input type="text" class="stitch-input stitch-input-sm flex-1" placeholder="Skills (e.g. C, C++, Python)" data-action="edit-skill-item" data-field="value" data-sec-idx="${secIndex}" data-cat-idx="${catIdx}" data-sk-idx="${skIdx}" value="${escapeHtml(sk.value || '')}">
              <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-skill-item" data-sec-idx="${secIndex}" data-cat-idx="${catIdx}" data-sk-idx="${skIdx}">✕</button>
            </div>
          `).join('')}

          <button class="btn-secondary !text-[11px] !py-0.5 !px-2" data-action="add-skill-item" data-sec-idx="${secIndex}" data-cat-idx="${catIdx}">
            + Add Skill Line
          </button>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-skill-category" data-sec-idx="${secIndex}">
      + Add Skill Category Group
    </button>
  </div>`;
  return html;
}

// 8. Awards Renderer
function renderAwardItems(sec, secIndex) {
  const items = sec.items || [];
  let html = `<div class="space-y-2.5">`;

  items.forEach((item, itemIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <span class="font-bold text-[11px] text-stitch-gray700 uppercase">Award #${itemIdx + 1}</span>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-award-item" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" title="Delete Award">✕</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label class="stitch-label">Award Title</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-award-field" data-field="title" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.title || '')}">
          </div>
          <div>
            <label class="stitch-label">Organization / Issuer</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-award-field" data-field="organization" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.organization || '')}">
          </div>
        </div>

        <!-- Bullets -->
        <div class="space-y-1.5 pt-2 border-t border-stitch-gray200">
          <label class="stitch-label">Recognition Details</label>
          ${renderBullets(item.bullets, secIndex, itemIdx, 'award')}
          <button class="btn-secondary !text-[11px] !py-0.5 !px-2 mt-1" data-action="add-bullet" data-type="award" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}">
            + Add Bullet
          </button>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-award-item" data-sec-idx="${secIndex}">
      + Add Award Entry
    </button>
  </div>`;
  return html;
}

// 9. Volunteer Renderer
function renderVolunteerItems(sec, secIndex) {
  const items = sec.items || [];
  let html = `<div class="space-y-2.5">`;

  items.forEach((item, itemIdx) => {
    html += `
      <div class="item-card">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-stitch-gray200">
          <span class="font-bold text-[11px] text-stitch-gray700 uppercase">Activity #${itemIdx + 1}</span>
          <button class="btn-icon btn-icon-danger !w-5 !h-5" data-action="delete-volunteer-item" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" title="Delete Activity">✕</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label class="stitch-label">Role</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-vol-field" data-field="role" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.role || '')}">
          </div>
          <div>
            <label class="stitch-label">Dates</label>
            <input type="text" class="stitch-input stitch-input-sm" data-action="edit-vol-field" data-field="dates" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" value="${escapeHtml(item.dates || '')}">
          </div>
        </div>

        <!-- Bullets -->
        <div class="space-y-1.5 pt-2 border-t border-stitch-gray200">
          <label class="stitch-label">Description / Organization</label>
          ${renderBullets(item.bullets, secIndex, itemIdx, 'volunteer')}
          <button class="btn-secondary !text-[11px] !py-0.5 !px-2 mt-1" data-action="add-bullet" data-type="volunteer" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}">
            + Add Bullet
          </button>
        </div>
      </div>
    `;
  });

  html += `
    <button class="btn-secondary !text-xs !py-1 w-full" data-action="add-volunteer-item" data-sec-idx="${secIndex}">
      + Add Volunteer Entry
    </button>
  </div>`;
  return html;
}

// Bullets Renderer Helper
function renderBullets(bullets, secIndex, itemIdx, type) {
  if (!Array.isArray(bullets) || bullets.length === 0) {
    return `<div class="text-[11px] text-stitch-gray400 italic">No bullet points added yet.</div>`;
  }

  return bullets.map((bullet, bIdx) => `
    <div class="flex items-start gap-1.5">
      <span class="text-xs text-stitch-gray400 pt-1">•</span>
      <textarea class="stitch-textarea !min-h-[38px] !py-1 !text-xs flex-1" data-action="edit-bullet" data-type="${type}" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" data-b-idx="${bIdx}">${escapeHtml(bullet)}</textarea>
      <button class="btn-icon btn-icon-danger !w-5 !h-5 mt-1" data-action="delete-bullet" data-type="${type}" data-sec-idx="${secIndex}" data-item-idx="${itemIdx}" data-b-idx="${bIdx}" title="Delete Bullet">✕</button>
    </div>
  `).join('');
}

// Delegated Event Handlers for Sections Manager
function handleSectionDelegatedClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const secIdx = parseInt(target.dataset.secIdx ?? target.dataset.index, 10);
  const itemIdx = parseInt(target.dataset.itemIdx, 10);
  const catIdx = parseInt(target.dataset.catIdx, 10);
  const bIdx = parseInt(target.dataset.bIdx, 10);
  const type = target.dataset.type;

  const sections = State.currentProfile?.sections;
  if (!sections) return;

  switch (action) {
    // Accordion Toggle
    case 'toggle-accordion': {
      const sec = sections[secIdx];
      if (sec) {
        if (State.expandedSections.has(sec.id)) {
          State.expandedSections.delete(sec.id);
        } else {
          State.expandedSections.add(sec.id);
        }
        renderSections();
      }
      break;
    }

    // Reorder Sections
    case 'move-up': {
      if (secIdx > 0) {
        const temp = sections[secIdx];
        sections[secIdx] = sections[secIdx - 1];
        sections[secIdx - 1] = temp;
        renderSections();
      }
      break;
    }
    case 'move-down': {
      if (secIdx < sections.length - 1) {
        const temp = sections[secIdx];
        sections[secIdx] = sections[secIdx + 1];
        sections[secIdx + 1] = temp;
        renderSections();
      }
      break;
    }

    // Delete Entire Section
    case 'delete-section': {
      if (confirm(`Are you sure you want to delete section "${sections[secIdx]?.title}"?`)) {
        sections.splice(secIdx, 1);
        renderSections();
      }
      break;
    }

    // Profile Objectives CRUD
    case 'add-profile-item': {
      if (!sections[secIdx].profiles) sections[secIdx].profiles = [];
      sections[secIdx].profiles.push({
        name: 'New Objective Track',
        enabled: true,
        text: 'Career objective statement...'
      });
      renderSections();
      break;
    }
    case 'delete-profile-item': {
      sections[secIdx].profiles.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Education CRUD
    case 'add-degree-item': {
      if (!sections[secIdx].items) sections[secIdx].items = [];
      sections[secIdx].items.push({
        degree: 'Degree Title',
        dates: 'Start -- End',
        institution: 'University / College',
        grade: 'CGPA: 4.00'
      });
      renderSections();
      break;
    }
    case 'delete-degree-item': {
      sections[secIdx].items.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Experience CRUD
    case 'add-experience-item': {
      if (!sections[secIdx].items) sections[secIdx].items = [];
      sections[secIdx].items.push({
        role: 'Job Role',
        company: 'Company Name',
        dates: 'Month, Year -- Present',
        bullets: ['Accomplished task or led initiative...']
      });
      renderSections();
      break;
    }
    case 'delete-experience-item': {
      sections[secIdx].items.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Projects CRUD
    case 'add-project-item': {
      if (!sections[secIdx].items) sections[secIdx].items = [];
      sections[secIdx].items.push({
        name: 'Project Name',
        url: 'https://github.com/...',
        bullets: ['Implemented feature using technology stack...']
      });
      renderSections();
      break;
    }
    case 'delete-project-item': {
      sections[secIdx].items.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Publications CRUD
    case 'add-publication-item': {
      if (!sections[secIdx].items) sections[secIdx].items = [];
      sections[secIdx].items.push({
        authors: 'Author One, Author Two',
        highlightAuthor: 'Author One',
        title: 'Title of Research Paper',
        venue: 'International Conference / Journal',
        year: '2026'
      });
      renderSections();
      break;
    }
    case 'delete-publication-item': {
      sections[secIdx].items.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Teaching CRUD
    case 'add-teaching-item': {
      if (!sections[secIdx].items) sections[secIdx].items = [];
      sections[secIdx].items.push({
        role: 'Lecturer / Teaching Assistant',
        institution: 'University / Academy',
        dates: '2024 -- Present',
        bullets: ['Conducted laboratory and lecture sessions...']
      });
      renderSections();
      break;
    }
    case 'delete-teaching-item': {
      sections[secIdx].items.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Skills Category CRUD
    case 'add-skill-category': {
      if (!sections[secIdx].categories) sections[secIdx].categories = [];
      sections[secIdx].categories.push({
        title: 'New Skill Category',
        items: [{ label: 'Domain', value: 'Skill 1, Skill 2' }]
      });
      renderSections();
      break;
    }
    case 'delete-skill-cat': {
      sections[secIdx].categories.splice(catIdx, 1);
      renderSections();
      break;
    }
    case 'add-skill-item': {
      const cat = sections[secIdx].categories[catIdx];
      if (!cat.items) cat.items = [];
      cat.items.push({ label: 'Tools', value: 'Git, Docker, Linux' });
      renderSections();
      break;
    }
    case 'delete-skill-item': {
      const skIdx = parseInt(target.dataset.skIdx, 10);
      sections[secIdx].categories[catIdx].items.splice(skIdx, 1);
      renderSections();
      break;
    }

    // Awards CRUD
    case 'add-award-item': {
      if (!sections[secIdx].items) sections[secIdx].items = [];
      sections[secIdx].items.push({
        title: 'Award / Honor Name',
        organization: 'Granting Organization',
        bullets: ['Honored for excellence in...']
      });
      renderSections();
      break;
    }
    case 'delete-award-item': {
      sections[secIdx].items.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Volunteer CRUD
    case 'add-volunteer-item': {
      if (!sections[secIdx].items) sections[secIdx].items = [];
      sections[secIdx].items.push({
        role: 'Community Lead / Volunteer',
        dates: '2023 -- 2024',
        bullets: ['Coordinated technical workshops...']
      });
      renderSections();
      break;
    }
    case 'delete-volunteer-item': {
      sections[secIdx].items.splice(itemIdx, 1);
      renderSections();
      break;
    }

    // Bullets CRUD
    case 'add-bullet': {
      const sec = sections[secIdx];
      const item = sec.items[itemIdx];
      if (!item.bullets) item.bullets = [];
      item.bullets.push('New key contribution...');
      renderSections();
      break;
    }
    case 'delete-bullet': {
      const sec = sections[secIdx];
      const item = sec.items[itemIdx];
      if (item && item.bullets) {
        item.bullets.splice(bIdx, 1);
        renderSections();
      }
      break;
    }
  }
}

// Delegated Change (Checkboxes)
function handleSectionDelegatedChange(e) {
  const target = e.target;
  const action = target.dataset.action;
  const secIdx = parseInt(target.dataset.secIdx ?? target.dataset.index, 10);
  const itemIdx = parseInt(target.dataset.itemIdx, 10);

  const sections = State.currentProfile?.sections;
  if (!sections) return;

  if (action === 'toggle-section') {
    sections[secIdx].enabled = target.checked;
    renderSections();
  } else if (action === 'toggle-profile-item') {
    sections[secIdx].profiles[itemIdx].enabled = target.checked;
    renderSections();
  }
}

// Delegated Input (Text edits)
function handleSectionDelegatedInput(e) {
  const target = e.target;
  const action = target.dataset.action;
  const secIdx = parseInt(target.dataset.secIdx, 10);
  const itemIdx = parseInt(target.dataset.itemIdx, 10);
  const catIdx = parseInt(target.dataset.catIdx, 10);
  const skIdx = parseInt(target.dataset.skIdx, 10);
  const bIdx = parseInt(target.dataset.bIdx, 10);
  const field = target.dataset.field;

  const sections = State.currentProfile?.sections;
  if (!sections || !sections[secIdx]) return;

  const val = target.value;

  switch (action) {
    case 'edit-section-title':
      sections[secIdx].title = val;
      break;

    case 'edit-section-text':
      sections[secIdx].text = val;
      break;

    case 'edit-profile-name':
      sections[secIdx].profiles[itemIdx].name = val;
      break;

    case 'edit-profile-text':
      sections[secIdx].profiles[itemIdx].text = val;
      break;

    case 'edit-degree-field':
      sections[secIdx].items[itemIdx][field] = val;
      break;

    case 'edit-exp-field':
      sections[secIdx].items[itemIdx][field] = val;
      break;

    case 'edit-project-field':
      sections[secIdx].items[itemIdx][field] = val;
      break;

    case 'edit-pub-field':
      sections[secIdx].items[itemIdx][field] = val;
      break;

    case 'edit-teaching-field':
      sections[secIdx].items[itemIdx][field] = val;
      break;

    case 'edit-skill-cat-title':
      sections[secIdx].categories[catIdx].title = val;
      break;

    case 'edit-skill-item':
      sections[secIdx].categories[catIdx].items[skIdx][field] = val;
      break;

    case 'edit-award-field':
      sections[secIdx].items[itemIdx][field] = val;
      break;

    case 'edit-vol-field':
      sections[secIdx].items[itemIdx][field] = val;
      break;

    case 'edit-bullet':
      sections[secIdx].items[itemIdx].bullets[bIdx] = val;
      break;
  }
}

// Custom Section Creation Modal
function openAddSectionModal() {
  DOM.customSectionTitle.value = '';
  DOM.customSectionType.value = 'experience';
  DOM.addSectionModal.classList.add('open');
  DOM.customSectionTitle.focus();
}

function closeAddSectionModal() {
  DOM.addSectionModal.classList.remove('open');
}

function handleCreateCustomSection() {
  const title = DOM.customSectionTitle.value.trim();
  const type = DOM.customSectionType.value;

  if (!title) {
    showToast('Please enter a section title', 'error');
    return;
  }

  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  if (!State.currentProfile.sections) {
    State.currentProfile.sections = [];
  }

  const newSection = {
    id: id || `custom_${Date.now()}`,
    title: title,
    enabled: true,
    type: type
  };

  // Prepopulate standard items container based on type
  if (type === 'text') {
    newSection.text = '';
  } else if (type === 'items_degree') {
    newSection.items = [{ degree: '', institution: '', dates: '', grade: '' }];
  } else if (type === 'volunteer') {
    newSection.items = [{ role: '', dates: '', bullets: [''] }];
  } else {
    newSection.items = [{ role: '', company: '', dates: '', bullets: [''] }];
  }

  State.currentProfile.sections.push(newSection);
  State.expandedSections.add(newSection.id);
  closeAddSectionModal();
  renderSections();
  showToast(`Custom section "${title}" added`);
}

// New Profile Creation Modal
function openNewProfileModal() {
  DOM.newProfileName.value = '';
  DOM.cloneCurrentProfile.checked = true;
  DOM.newProfileModal.classList.add('open');
  DOM.newProfileName.focus();
}

function closeNewProfileModal() {
  DOM.newProfileModal.classList.remove('open');
}

async function handleCreateNewProfile() {
  const rawName = DOM.newProfileName.value.trim();
  if (!rawName) {
    showToast('Please enter a profile identifier', 'error');
    return;
  }

  const profileId = rawName.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  let newProfileData;

  if (DOM.cloneCurrentProfile.checked && State.currentProfile) {
    newProfileData = JSON.parse(JSON.stringify(State.currentProfile));
  } else {
    newProfileData = {
      header: {
        name: rawName,
        includePhoto: false,
        photoPath: 'photo.png',
        email: 'user@example.com',
        phone: '',
        address: '',
        linkedin: '',
        linkedinLabel: 'LinkedIn',
        github: '',
        githubLabel: 'GitHub'
      },
      activePreset: 'master',
      sections: []
    };
  }

  // Local-first persistence
  try {
    localStorage.setItem(`typevitae_profile_${profileId}`, JSON.stringify(newProfileData));
    const custom = JSON.parse(localStorage.getItem('typevitae_custom_profiles') || '[]');
    if (!custom.some(p => p.id === profileId)) {
      custom.push({ id: profileId, name: rawName });
      localStorage.setItem('typevitae_custom_profiles', JSON.stringify(custom));
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/profile?id=${encodeURIComponent(profileId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfileData, null, 2)
    });

    closeNewProfileModal();
    await loadProfilesList();
    await loadProfile(profileId);

    if (res.ok) {
      showToast(`Created profile: ${profileId}`);
    } else {
      showToast(`Created profile in browser storage (Cloud Mode): ${profileId}`);
    }
  } catch (err) {
    closeNewProfileModal();
    await loadProfilesList();
    await loadProfile(profileId);
    showToast(`Created profile in browser storage (Cloud Mode): ${profileId}`);
  }
}

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
