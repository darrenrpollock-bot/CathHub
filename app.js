/* ====================================================
   CATHHUB — app.js
   Premium Catheter Compatibility Tool for INR
   ==================================================== */

/* ─── SVG ICON CONSTANTS ─────────────────────────────────────────────────────── */
const ICON_CHECK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_WARNING = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const ICON_X_CIRCLE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
const ICON_INFO = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

/* ─── COMPATIBILITY HELPERS ──────────────────────────────────────────────────── */
function compatClass(clearance) {
  if (clearance >= 0.10) return 'green';
  if (clearance >= 0)    return 'amber';
  return 'red';
}

function compatLabel(clearance) {
  if (clearance >= 0.10) return {
    icon: ICON_CHECK,
    text: 'Compatible',
    sub: 'Good clearance — safe to advance'
  };
  if (clearance >= 0) return {
    icon: ICON_WARNING,
    text: 'Tight Fit',
    sub: 'Proceed with caution — minimal clearance'
  };
  return {
    icon: ICON_X_CIRCLE,
    text: 'Incompatible',
    sub: 'Combined OD exceeds catheter ID'
  };
}

/* ─── URL STATE (SHAREABLE LINKS) ────────────────────────────────────────────── */
function encodeInners(list) {
  // Use | as separator (names rarely contain it); encode each name
  return list.map(n => encodeURIComponent(n)).join('|');
}

function decodeInners(str) {
  if (!str) return [];
  return str.split('|').map(s => decodeURIComponent(s)).filter(Boolean);
}

function getAllInners() {
  const customs = getCustomDevices();
  return [...data.microCatheters, ...data.dacCatheters, ...data.thrombectomyCatheters, ...customs];
}

function getCustomDevices() {
  try {
    return JSON.parse(localStorage.getItem('cathhub_custom_devices') || '[]');
  } catch { return []; }
}

function saveCustomDevices(list) {
  localStorage.setItem('cathhub_custom_devices', JSON.stringify(list));
  // Refresh selects and views so customs appear immediately
  refreshCustomInSelects();
}

function refreshCustomInSelects() {
  // Rebuild all inner selects from scratch to include (or remove) customs
  const microSelects = ['micro-1', 'micro-2', 'micro-3', 'detail-micro', 'detail-micro-2'];
  microSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // Remove old custom optgroup if present
    const oldGrp = el.querySelector('optgroup[label="Custom (local)"]');
    if (oldGrp) oldGrp.remove();

    const customs = getCustomDevices();
    if (!customs.length) return;

    const grp = document.createElement('optgroup');
    grp.label = 'Custom (local)';
    customs.forEach(c => {
      const opt = document.createElement('option');
      opt.value = `customDevices:${c.name}`;
      opt.textContent = `${c.name}  ·  OD ${c.proxOdMm.toFixed(2)} mm (custom)`;
      grp.appendChild(opt);
    });
    el.appendChild(grp);
  });

  // Re-render custom list UI
  renderCustomList();
}

function renderCustomList() {
  const el = document.getElementById('custom-list');
  if (!el) return;
  const customs = getCustomDevices();
  if (!customs.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = customs.map(c => `
    <span class="custom-chip" title="${c.company || 'Custom'} — ID ${c.idMm ? c.idMm.toFixed(2) : '—'}">
      ${c.name}
      <span class="del" data-name="${c.name}">×</span>
    </span>
  `).join('');

  el.querySelectorAll('.del').forEach(d => {
    d.addEventListener('click', () => {
      const nm = d.dataset.name;
      const remaining = getCustomDevices().filter(x => x.name !== nm);
      saveCustomDevices(remaining);
      // If any slot currently has this custom selected, clear it
      [1,2,3,'detail-micro','detail-micro-2'].forEach(key => {
        const sel = typeof key === 'number' ? document.getElementById(`micro-${key}`) : document.getElementById(key);
        if (sel && sel.value && sel.value.includes(nm)) {
          sel.value = '';
        }
      });
      updateFastView();
      updateDetailView();
    });
  });
}

function addCustomDevice() {
  const name = prompt('Custom device name (e.g. "My 021 XT")');
  if (!name) return;
  const odStr = prompt('Proximal OD in mm (e.g. 0.74)', '0.74');
  if (!odStr) return;
  const proxOdMm = parseFloat(odStr);
  if (isNaN(proxOdMm) || proxOdMm <= 0) {
    alert('Please enter a valid positive OD in mm.');
    return;
  }
  const idStr = prompt('Inner diameter (lumen) in mm — optional, for viz', '');
  const idMm = idStr ? parseFloat(idStr) : (proxOdMm * 0.6); // reasonable default for viz

  const company = prompt('Manufacturer / label (optional)', 'Custom');

  const customs = getCustomDevices();
  // Prevent duplicate names
  if (customs.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    alert('A custom device with that name already exists locally.');
    return;
  }

  customs.push({
    name: name.trim(),
    company: company || 'Custom',
    proxOdMm: proxOdMm,
    distOdMm: null,
    idMm: isNaN(idMm) ? (proxOdMm * 0.6) : idMm,
    lengthCm: null,
    notes: 'User-added local device (not from manufacturer data)'
  });

  saveCustomDevices(customs);

  // Immediately reflect in current UI
  const status = document.getElementById('fast-share-status');
  if (status) {
    status.textContent = 'Custom device added';
    status.classList.add('show');
    setTimeout(() => { status.classList.remove('show'); status.textContent = ''; }, 1400);
  }

  // If Fast tab has nothing selected yet, auto-select the new one in slot 1 for convenience
  const m1 = document.getElementById('micro-1');
  if (m1 && !m1.value) {
    m1.value = `customDevices:${name.trim()}`;
    updateFastView();
  }
}

function syncURLState() {
  // Update the browser URL (no reload) so the current selections are shareable
  const params = new URLSearchParams();

  const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'fast';
  params.set('tab', activeTab);

  if (activeTab === 'fast') {
    const inners = [1, 2, 3]
      .map(n => {
        const v = document.getElementById(`micro-${n}`)?.value || '';
        if (!v) return null;
        const [, name] = v.split(':');
        return name;
      })
      .filter(Boolean);

    if (inners.length) params.set('inners', encodeInners(inners));
  } else if (activeTab === 'detail') {
    const accessVal = document.getElementById('detail-access')?.value || '';
    const microVal  = document.getElementById('detail-micro')?.value || '';
    const microVal2 = document.getElementById('detail-micro-2')?.value || '';

    if (accessVal) {
      // store as category:name (stable)
      params.set('access', accessVal);
    }
    if (microVal) {
      const [, name] = microVal.split(':');
      if (name) params.set('inner', encodeURIComponent(name));
    }
    if (microVal2) {
      const [, name] = microVal2.split(':');
      if (name) params.set('inner2', encodeURIComponent(name));
    }
  }

  const newURL = location.pathname + '?' + params.toString() + location.hash;
  history.replaceState(null, '', newURL);
}

function applyURLState() {
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab') || 'fast';

  // Switch to the requested tab first
  if (tab === 'detail' || tab === 'all') {
    switchTab(tab);
  } else {
    switchTab('fast');
  }

  if (tab === 'fast') {
    const innerNames = decodeInners(params.get('inners') || '');
    if (!innerNames.length) return;

    const allInners = getAllInners();

    // Map names back to select values like "microCatheters:Headway DUO"
    [1, 2, 3].forEach((n, idx) => {
      const name = innerNames[idx];
      if (!name) return;
      const found = allInners.find(c => c.name === name);
      if (!found) return;

      // Determine category key
      let key = 'microCatheters';
      if (data.dacCatheters.some(c => c.name === name)) key = 'dacCatheters';
      else if (data.thrombectomyCatheters.some(c => c.name === name)) key = 'thrombectomyCatheters';

      const select = document.getElementById(`micro-${n}`);
      if (select) {
        select.value = `${key}:${name}`;
      }
    });

    updateFastView();
  } else if (tab === 'detail') {
    const accessParam = params.get('access');
    const innerName   = params.get('inner') ? decodeURIComponent(params.get('inner')) : null;
    const innerName2  = params.get('inner2') ? decodeURIComponent(params.get('inner2')) : null;

    const allInners = getAllInners();

    if (accessParam) {
      const accessEl = document.getElementById('detail-access');
      if (accessEl) accessEl.value = accessParam;
    }
    if (innerName) {
      const found = allInners.find(c => c.name === innerName);
      if (found) {
        let key = 'microCatheters';
        if (data.dacCatheters.some(c => c.name === innerName)) key = 'dacCatheters';
        else if (data.thrombectomyCatheters.some(c => c.name === innerName)) key = 'thrombectomyCatheters';
        const el = document.getElementById('detail-micro');
        if (el) el.value = `${key}:${innerName}`;
      }
    }
    if (innerName2) {
      const found = allInners.find(c => c.name === innerName2);
      if (found) {
        let key = 'microCatheters';
        if (data.dacCatheters.some(c => c.name === innerName2)) key = 'dacCatheters';
        else if (data.thrombectomyCatheters.some(c => c.name === innerName2)) key = 'thrombectomyCatheters';
        const el = document.getElementById('detail-micro-2');
        if (el) el.value = `${key}:${innerName2}`;
      }
    }

    updateDetailView();
  }
}

/* ─── SAVED STACKS (localStorage) ────────────────────────────────────────────── */
const SAVED_KEY = 'cathhub_saved_stacks';

function loadSavedStacks() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch { return []; }
}

function saveSavedStacks(list) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

function renderSavedStacks() {
  const wrap = document.getElementById('saved-stacks');
  if (!wrap) return;
  const stacks = loadSavedStacks();
  if (!stacks.length) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = `
    <span class="saved-label">Saved:</span>
    ${stacks.map(s => `
      <span class="saved-chip" data-id="${s.id}">
        ${s.name}
        <span class="x" data-del="${s.id}" title="Delete">×</span>
      </span>
    `).join('')}
  `;

  // Load on click (but not on the X)
  wrap.querySelectorAll('.saved-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('x')) return;
      const id = chip.dataset.id;
      const stack = stacks.find(x => x.id === id);
      if (!stack || !stack.inners?.length) return;

      const allInners = getAllInners();
      [1,2,3].forEach(n => document.getElementById(`micro-${n}`).value = '');

      stack.inners.forEach((name, i) => {
        const slot = i + 1;
        if (slot > 3) return;
        const found = allInners.find(c => c.name === name);
        if (!found) return;
        let catKey = 'microCatheters';
        if (data.dacCatheters.some(c => c.name === name)) catKey = 'dacCatheters';
        else if (data.thrombectomyCatheters.some(c => c.name === name)) catKey = 'thrombectomyCatheters';
        document.getElementById(`micro-${slot}`).value = `${catKey}:${name}`;
      });
      updateFastView();
      switchTab('fast');
    });
  });

  // Delete
  wrap.querySelectorAll('.x').forEach(x => {
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = x.dataset.del;
      const remaining = stacks.filter(s => s.id !== id);
      saveSavedStacks(remaining);
      renderSavedStacks();
    });
  });
}

function saveCurrentStack() {
  const inners = [1,2,3].map(n => {
    const v = document.getElementById(`micro-${n}`).value;
    if (!v) return null;
    const [, name] = v.split(':');
    return name;
  }).filter(Boolean);

  if (!inners.length) {
    const st = document.getElementById('fast-share-status');
    if (st) {
      st.textContent = 'Select at least one inner first';
      st.classList.add('show');
      setTimeout(() => { st.classList.remove('show'); st.textContent = ''; }, 1400);
    }
    return;
  }

  const name = prompt('Name this stack (e.g. "My Sofia RED"):', inners.slice(0,2).join(' + ')) || inners.join(' + ');
  const stacks = loadSavedStacks();
  const id = 's_' + Date.now().toString(36);
  stacks.unshift({ id, name: name.trim(), inners });
  // Keep max 12
  saveSavedStacks(stacks.slice(0, 12));
  renderSavedStacks();

  const st = document.getElementById('fast-share-status');
  if (st) {
    st.textContent = 'Saved!';
    st.classList.add('show');
    setTimeout(() => { st.classList.remove('show'); st.textContent = ''; }, 1200);
  }
}

/* ─── COPY REPORT ────────────────────────────────────────────────────────────── */
function generateReportText(tab) {
  const lines = [];
  lines.push('CathHub Catheter Compatibility Report');
  lines.push('Generated: ' + new Date().toLocaleString());
  lines.push('');

  if (tab === 'fast') {
    const selected = [1,2,3].map(n => {
      const v = document.getElementById(`micro-${n}`).value;
      if (!v) return null;
      const [,name] = v.split(':');
      return name;
    }).filter(Boolean);

    if (!selected.length) return 'No selection.';

    const totalOd = selected.reduce((sum, name) => {
      const dev = getAllInners().find(c => c.name === name);
      return sum + (dev ? dev.proxOdMm : 0);
    }, 0);

    lines.push('FAST CHECK');
    lines.push('Inner catheters:');
    selected.forEach((n, i) => lines.push(`  ${i+1}. ${n}`));
    lines.push(`Combined proximal OD: ${totalOd.toFixed(2)} mm`);
    lines.push('');

    // Summarize top compatible
    const combinedAccess = [
      ...data.accessCatheters.map(c => ({ ...c, category: 'accessCatheters' })),
      ...(data.balloonGuideCatheters || []).map(c => ({ ...c, category: 'balloonGuideCatheters', idMm: c.idMm || c.shaftOdMm }))
    ];
    const results = combinedAccess
      .map(ac => ({ ...ac, clearance: (ac.idMm || 0) - totalOd }))
      .filter(r => r.clearance >= 0)
      .sort((a,b) => b.clearance - a.clearance)
      .slice(0, 6);

    lines.push('Top compatible access catheters:');
    results.forEach(r => {
      const sign = r.clearance >= 0 ? '+' : '';
      lines.push(`  ${r.name} (${r.fr || ''}) — clearance ${sign}${r.clearance.toFixed(2)} mm`);
    });
    if (results.length === 0) lines.push('  (none fully compatible)');

  } else if (tab === 'detail') {
    const accessVal = document.getElementById('detail-access').value;
    const microVal  = document.getElementById('detail-micro').value;
    const microVal2 = document.getElementById('detail-micro-2').value;

    if (accessVal) {
      const [, name] = accessVal.split(':');
      lines.push(`Access: ${name}`);
    }
    if (microVal) {
      const [, name] = microVal.split(':');
      lines.push(`Inner 1: ${name}`);
    }
    if (microVal2) {
      const [, name] = microVal2.split(':');
      lines.push(`Inner 2: ${name}`);
    }

    // Add the banner text if present
    const banner = document.querySelector('#detail-result .compat-banner');
    if (banner) {
      const title = banner.querySelector('.compat-title')?.textContent || '';
      const sub   = banner.querySelector('.compat-sub')?.textContent || '';
      if (title) lines.push('');
      if (title) lines.push(title);
      if (sub) lines.push(sub);
    }
  }

  lines.push('');
  lines.push('— Generated by CathHub (cathhub.com) —');
  lines.push('Data from manufacturer specs. Always verify with current IFU.');
  return lines.join('\n');
}

function copyReport(tab) {
  const text = generateReportText(tab);
  navigator.clipboard.writeText(text).then(() => {
    const statusEl = document.getElementById(tab === 'fast' ? 'fast-share-status' : 'detail-share-status');
    if (statusEl) {
      statusEl.textContent = 'Report copied!';
      statusEl.classList.add('show');
      setTimeout(() => {
        statusEl.classList.remove('show');
        statusEl.textContent = '';
      }, 1600);
    }
  }).catch(() => {
    // fallback
    prompt('Copy this report:', text);
  });
}

/* ─── POPULATE SELECTS ───────────────────────────────────────────────────────── */
function populateSelects() {
  // Access catheter selects (including balloon guide catheters as access-like)
  const accessSelects = ['detail-access'];
  accessSelects.forEach(id => {
    const el = document.getElementById(id);
    // Combine accessCatheters and balloonGuideCatheters for access-like selection
    const combinedAccess = [
      ...data.accessCatheters.map(c => ({ ...c, category: 'accessCatheters' })),
      ...(data.balloonGuideCatheters || []).map(c => ({ ...c, category: 'balloonGuideCatheters' }))
    ];
    combinedAccess.forEach(c => {
      const opt = document.createElement('option');
      opt.value = `${c.category}:${c.name}`;
      opt.textContent = `${c.name}  ·  ID ${c.idMm ? c.idMm.toFixed(2) : (c.shaftOdMm || 0).toFixed(2)} mm`;
      el.appendChild(opt);
    });
  });

  // Inner catheter selects (micros + DACs + thrombectomy)
  const microSelects = ['micro-1', 'micro-2', 'micro-3', 'detail-micro', 'detail-micro-2'];
  const innerGroups = [
    { label: 'Microcatheters',         list: data.microCatheters, key: 'microCatheters' },
    { label: 'DAC Catheters',          list: data.dacCatheters, key: 'dacCatheters' },
    { label: 'Thrombectomy Catheters', list: data.thrombectomyCatheters, key: 'thrombectomyCatheters' },
  ];
  microSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    innerGroups.forEach(({ label, list, key }) => {
      if (!list || !list.length) return;
      const grp = document.createElement('optgroup');
      grp.label = label;
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = `${key}:${c.name}`;
        opt.textContent = `${c.name}  ·  OD ${(c.proxOdMm ?? 0).toFixed(2)} mm`;
        grp.appendChild(opt);
      });
      el.appendChild(grp);
    });
  });
}

/* ─── RENDER TABLES ──────────────────────────────────────────────────────────── */
let accessFilter = 'all';

function renderAccessTable() {
  const filtered = accessFilter === 'all'
    ? data.accessCatheters
    : data.accessCatheters.filter(c => c.fr === accessFilter);

  document.getElementById('access-table-body').innerHTML = filtered.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td style="color:var(--muted)">${c.company}</td>
      <td>${c.fr}</td>
      <td style="color:var(--muted);font-feature-settings:'tnum' 1">${c.odMm ? c.odMm.toFixed(2) : (c.proxOdMm || 0).toFixed(2)}</td>
      <td><strong style="font-feature-settings:'tnum' 1">${c.idMm ? c.idMm.toFixed(2) : (c.shaftOdMm || 0).toFixed(2)}</strong></td>
    </tr>
  `).join('');
}

function renderMicroTable() {
  document.getElementById('micro-table-body').innerHTML = data.microCatheters.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td style="color:var(--muted)">${c.company}</td>
      <td><strong style="font-feature-settings:'tnum' 1">${c.proxOdMm.toFixed(2)}</strong></td>
      <td style="color:var(--muted);font-feature-settings:'tnum' 1">${c.distOdMm != null ? c.distOdMm.toFixed(2) : '—'}</td>
      <td style="font-feature-settings:'tnum' 1">${c.idMm.toFixed(2)}</td>
    </tr>
  `).join('');
}

function renderDacTable() {
  document.getElementById('dac-table-body').innerHTML = data.dacCatheters.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td style="color:var(--muted)">${c.company}</td>
      <td><strong style="font-feature-settings:'tnum' 1">${c.proxOdMm.toFixed(2)}</strong></td>
      <td style="font-feature-settings:'tnum' 1">${c.idMm.toFixed(2)}</td>
    </tr>
  `).join('');
}

function renderThrombectomyTable() {
  document.getElementById('thrombectomy-table-body').innerHTML = data.thrombectomyCatheters.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td style="color:var(--muted)">${c.company}</td>
      <td><strong style="font-feature-settings:'tnum' 1">${c.proxOdMm.toFixed(2)}</strong></td>
      <td style="font-feature-settings:'tnum' 1">${c.idMm.toFixed(2)}</td>
    </tr>
  `).join('');
}

/* ─── REFERENCE SEARCH STATE ───────────────────────────────────────────────── */
let referenceFilter = '';

/* ─── DYNAMIC CATEGORY RENDERING ─────────────────────────────────────────────── */
function renderAllCategories(filter = '') {
  const container = document.getElementById('tab-all');
  container.innerHTML = ''; // Clear existing content

  const q = (filter || referenceFilter || '').toLowerCase().trim();

  // Search header (only once)
  if (!container.querySelector('.ref-search-wrap')) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'ref-search-wrap section';
    searchWrap.style.marginTop = '20px';
    searchWrap.innerHTML = `
      <div class="section-label">All Devices — live search</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input id="ref-search" type="search" placeholder="Search name, company, or size…" 
               style="flex:1; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:10px; padding:12px 14px; font-size:14px;">
        <button id="ref-clear" class="action-btn" style="padding:10px 14px;">Clear</button>
      </div>
    `;
    container.appendChild(searchWrap);

    // Wire once
    setTimeout(() => {
      const inp = document.getElementById('ref-search');
      const clr = document.getElementById('ref-clear');
      if (inp) {
        inp.value = referenceFilter;
        inp.addEventListener('input', () => {
          referenceFilter = inp.value;
          // Re-render with new filter (lightweight)
          renderAllCategories(referenceFilter);
        });
      }
      if (clr) {
        clr.addEventListener('click', () => {
          referenceFilter = '';
          const i = document.getElementById('ref-search');
          if (i) i.value = '';
          renderAllCategories('');
        });
      }
    }, 0);
  }

  // Dynamically create sections for each category in data.js
  Object.keys(data).forEach((categoryKey, index) => {
    const categoryData = data[categoryKey];
    if (!categoryData || !categoryData.length) return;

    // Human-readable category name
    let categoryLabel = categoryKey.replace(/([A-Z])/g, ' $1');
    categoryLabel = categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);

    // Create section
    const section = document.createElement('div');
    section.className = 'section';
    section.style.marginTop = index === 0 ? '20px' : '30px';

    // Section label
    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'section-label';
    sectionLabel.textContent = categoryLabel;
    section.appendChild(sectionLabel);

    // Result card with table
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.style.padding = '0';
    resultCard.style.overflow = 'hidden';

    const table = document.createElement('table');
    table.className = 'access-table';

    // Table headers based on category type
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Device', 'Company'];

    if (categoryKey === 'accessCatheters') {
      headers.push('Fr', 'OD (mm)', 'ID (mm)', 'Length (cm)');
    } else if (categoryKey === 'balloonGuideCatheters') {
      headers.push('Fr', 'Shaft OD (mm)', 'Balloon Max (mm)', 'Length (cm)');
    } else if (categoryKey === 'thrombectomyCatheters') {
      headers.push('Prox OD (mm)', 'Dist OD (mm)', 'ID (mm)', 'Length (cm)');
    } else if (categoryKey === 'dacCatheters') {
      headers.push('Prox OD (mm)', 'ID (mm)', 'Length (cm)');
    } else if (categoryKey === 'microCatheters') {
      headers.push('Prox OD (mm)', 'Dist OD (mm)', 'ID (mm)', 'Length (cm)');
    }

    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      if (h.includes('OD') || h.includes('ID')) {
        th.style.textAlign = 'center';
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    const filteredItems = q
      ? categoryData.filter(item => {
          const hay = `${item.name} ${item.company} ${item.fr || ''} ${item.notes || ''}`.toLowerCase();
          return hay.includes(q);
        })
      : categoryData;

    if (q && filteredItems.length === 0) return; // skip empty categories when filtering

    filteredItems.forEach(item => {
      const row = document.createElement('tr');
      const cells = [
        `<strong>${item.name}</strong><br><span style="color:var(--muted);font-size:11px">${item.company}</span>`,
        item.company
      ];

      const lenStr = item.lengthCm
        ? (Array.isArray(item.lengthCm) ? item.lengthCm.join(' / ') + ' cm' : item.lengthCm + ' cm')
        : '—';

      if (categoryKey === 'accessCatheters') {
        cells.push(
          item.fr || '—',
          item.odMm ? item.odMm.toFixed(2) : (item.proxOdMm || 0).toFixed(2),
          `<strong>${item.idMm ? item.idMm.toFixed(2) : (item.shaftOdMm || 0).toFixed(2)}</strong>`,
          lenStr
        );
      } else if (categoryKey === 'balloonGuideCatheters') {
        cells.push(
          item.fr || '—',
          item.shaftOdMm ? item.shaftOdMm.toFixed(2) : '—',
          item.balloonMaxMm ? item.balloonMaxMm.toFixed(2) : '—',
          lenStr
        );
      } else if (categoryKey === 'thrombectomyCatheters') {
        cells.push(
          `<strong>${item.proxOdMm.toFixed(2)}</strong>`,
          item.distOdMm != null ? item.distOdMm.toFixed(2) : '—',
          item.idMm.toFixed(2),
          lenStr
        );
      } else if (categoryKey === 'microCatheters') {
        cells.push(
          `<strong>${item.proxOdMm.toFixed(2)}</strong>`,
          item.distOdMm != null ? item.distOdMm.toFixed(2) : '—',
          item.idMm.toFixed(2),
          lenStr
        );
      } else {
        cells.push(
          `<strong>${item.proxOdMm.toFixed(2)}</strong>`,
          item.idMm.toFixed(2),
          lenStr
        );
      }

      cells.forEach((c, i) => {
        const td = document.createElement('td');
        td.innerHTML = c;
        if (i > 1) {
          td.style.textAlign = 'center';
          td.style.fontFeatureSettings = `'tnum' 1`;
          if (i !== cells.length - 1 && categoryKey !== 'accessCatheters' && categoryKey !== 'balloonGuideCatheters' && categoryKey !== 'dacCatheters') {
            td.style.color = 'var(--muted)';
          }
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    resultCard.appendChild(table);
    section.appendChild(resultCard);
    container.appendChild(section);
  });
}

/* ─── TAB SWITCHING ──────────────────────────────────────────────────────────── */
function switchTab(tab) {
  ['fast', 'detail', 'all'].forEach(t => {
    const panel = document.getElementById(`tab-${t}`);
    if (t === tab) {
      panel.style.display = 'block';
      panel.classList.remove('panel-entering');
      void panel.offsetWidth; // force reflow for animation restart
      panel.classList.add('panel-entering');
    } else {
      panel.style.display = 'none';
    }
  });

  document.querySelectorAll('.tab').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  // Keep URL in sync when user manually switches tabs
  syncURLState();
}

/* ─── FAST VIEW ──────────────────────────────────────────────────────────────── */
function updateFastView() {
  // Update slot visual states
  [1, 2, 3].forEach(n => {
    const select  = document.getElementById(`micro-${n}`);
    const slot    = document.getElementById(`slot-${n}`);
    const odEl    = document.getElementById(`slot-od-${n}`);
    const clearEl = document.getElementById(`slot-clear-${n}`);
    const [catKey, microName] = select.value.split(':');
    const micro   = select.value
      ? getAllInners().find(c => c.name === microName)
      : null;

    if (micro) {
      slot.classList.add('has-value');
      odEl.textContent = `OD ${micro.proxOdMm.toFixed(2)}`;
      odEl.classList.remove('hidden');
      clearEl.classList.remove('hidden');
    } else {
      slot.classList.remove('has-value');
      odEl.classList.add('hidden');
      clearEl.classList.add('hidden');
    }
  });

  const el = document.getElementById('fast-result');
  const m1 = document.getElementById('micro-1').value;

  if (!m1) {
    el.innerHTML = `
      <div class="compat-banner none">
        <div class="compat-icon">${ICON_INFO}</div>
        <div>
          <div class="compat-title">Select a microcatheter</div>
          <div class="compat-sub">Choose from slot 1 to see access catheter compatibility</div>
        </div>
      </div>`;
    return;
  }

  // Gather selected inner catheters (micros + DACs + thrombectomy + customs)
  const allInner = getAllInners();
  const micros = [1, 2, 3]
    .map(n => {
      const val = document.getElementById(`micro-${n}`).value;
      if (!val) return null;
      const [catKey, name] = val.split(':');
      return allInner.find(c => c.name === name);
    })
    .filter(Boolean);

  const totalOd = micros.reduce((sum, m) => sum + m.proxOdMm, 0);

  // Calculate compatibility for all access catheters (including balloon guide as access-like), sort best first
  const combinedAccess = [
    ...data.accessCatheters.map(c => ({ ...c, category: 'accessCatheters' })),
    ...(data.balloonGuideCatheters || []).map(c => ({ ...c, category: 'balloonGuideCatheters', idMm: c.idMm || c.shaftOdMm })) // fallback to shaft if no ID
  ];
  const results = combinedAccess.map(ac => ({
    ...ac,
    clearance: (ac.idMm || 0) - totalOd
  })).sort((a, b) => b.clearance - a.clearance);

  const greenCount = results.filter(r => r.clearance >= 0.10).length;
  const amberCount = results.filter(r => r.clearance >= 0 && r.clearance < 0.10).length;
  const redCount   = results.filter(r => r.clearance < 0).length;

  // ── Summary strip
  const summaryHtml = `
    <div class="summary-strip">
      <div class="summary-metric">
        <span class="summary-num green">${greenCount}</span>
        <span class="summary-label">Compatible</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-metric">
        <span class="summary-num amber">${amberCount}</span>
        <span class="summary-label">Tight Fit</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-metric">
        <span class="summary-num red">${redCount}</span>
        <span class="summary-label">Incompatible</span>
      </div>
      <div class="summary-od">
        Combined OD
        <strong>${totalOd.toFixed(2)} mm</strong>
      </div>
    </div>`;

  // ── Group results by Fr size
  const FR_GROUPS = [
    { fr: '5F', label: '5 French' },
    { fr: '6F', label: '6 French' },
    { fr: '6.6F', label: '6.6 French' },
    { fr: '7F', label: '7 French' },
    { fr: '8F', label: '8 French' },
  ];

  let groupsHtml = '';
  let groupIndex = 0;

  FR_GROUPS.forEach(({ fr, label }) => {
    const group = results.filter(r => r.fr === fr);
    if (!group.length) return;

    const rows = group.map(r => {
      const cls  = compatClass(r.clearance);
      const sign = r.clearance >= 0 ? '+' : '';
      return `<tr>
        <td>
          <strong>${r.name}</strong><br>
          <span style="color:var(--muted);font-size:11px">${r.company}</span>
        </td>
        <td style="text-align:center;font-feature-settings:'tnum' 1">${r.idMm ? r.idMm.toFixed(2) : (r.shaftOdMm || 0).toFixed(2)}</td>
        <td style="text-align:center">
          <span class="pill ${cls}">${sign}${r.clearance.toFixed(2)}</span>
        </td>
      </tr>`;
    }).join('');

    const catCount = group.length;
    const delay = groupIndex * 0.05;
    groupsHtml += `
      <div class="fr-group" style="animation-delay:${delay}s">
        <div class="fr-group-header">
          <span class="fr-badge">${fr}</span>
          <span class="fr-group-name">${label}</span>
          <span class="fr-group-count">${catCount} catheter${catCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="result-card" style="padding:0; overflow:hidden">
          <table class="access-table">
            <thead>
              <tr>
                <th>Access Catheter</th>
                <th style="text-align:center">ID (mm)</th>
                <th style="text-align:center">Clearance</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    groupIndex++;
  });

  el.innerHTML = summaryHtml + groupsHtml;
  syncURLState();
}

function clearSlot(n) {
  document.getElementById(`micro-${n}`).value = '';
  updateFastView();
}

/* ─── LUMEN VISUALIZATION ────────────────────────────────────────────────────── */
function renderLumenViz(access, micro, micro2 = null) {
  const SIZE    = 200;
  const C       = SIZE / 2; // center = 100
  const MAX_R   = 88;       // max radius in SVG units
  // Scale: largest catheter OD = 2.64mm → radius 1.32mm → MAX_R px
  const SCALE   = MAX_R / 1.32;

  const accessOdR = (access.odMm ? (access.odMm / 2) : (access.proxOdMm || access.shaftOdMm || 0) / 2) * SCALE;
  const accessIdR = ((access.idMm || access.shaftOdMm || 0) / 2) * SCALE;

  if (micro2) {
    // ── Dual micro layout ──────────────────────────────────────────────────
    // Place two circles side-by-side, tangent, with their combined bounding
    // box centred on C.  Bounding radius = r1 + r2, so clearance in mm is:
    //   access.idMm - (micro1.proxOdMm + micro2.proxOdMm)
    const r1   = (micro.proxOdMm  / 2) * SCALE;
    const r1Id = (micro.idMm      / 2) * SCALE;
    const r2   = (micro2.proxOdMm / 2) * SCALE;
    const r2Id = (micro2.idMm     / 2) * SCALE;

    // Centers: c1 = C − r2,  c2 = C + r1  (they touch at C + (r1−r2))
    const c1x = C - r2;
    const c2x = C + r1;

    const clearance = access.idMm - micro.proxOdMm - micro2.proxOdMm;
    const cls       = compatClass(clearance);
    const gapColor  = cls === 'green' ? '#10b981' : cls === 'amber' ? '#f59e0b' : '#ef4444';

    const COLOR1 = '#10b981'; // teal  — micro 1
    const COLOR2 = '#818cf8'; // indigo — micro 2

    return `
    <div class="lumen-viz-wrapper">
      <div class="lumen-viz-label">Cross-section view</div>
      <svg class="lumen-viz" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="Lumen cross-section: ${access.name} with ${micro.name} and ${micro2.name}">

        <!-- Outer ambient glow -->
        <circle cx="${C}" cy="${C}" r="${accessOdR + 10}"
                fill="none" stroke="${gapColor}" stroke-width="1" opacity="0.06"/>

        <!-- Access catheter wall (OD) -->
        <circle cx="${C}" cy="${C}" r="${accessOdR}"
                fill="#1a2236" stroke="#1e3a5f" stroke-width="1.5"/>

        <!-- Lumen space (access ID) — gap fill coloured by combined clearance -->
        <circle cx="${C}" cy="${C}" r="${accessIdR}"
                fill="${gapColor}" fill-opacity="0.18"/>

        <!-- Micro 1 outer -->
        <circle cx="${c1x}" cy="${C}" r="${r1}"
                fill="${COLOR1}" fill-opacity="0.60"
                stroke="${COLOR1}" stroke-width="1.5"/>

        <!-- Micro 1 inner lumen -->
        <circle cx="${c1x}" cy="${C}" r="${r1Id}"
                fill="#090d14" fill-opacity="0.7"/>

        <!-- Micro 2 outer -->
        <circle cx="${c2x}" cy="${C}" r="${r2}"
                fill="${COLOR2}" fill-opacity="0.60"
                stroke="${COLOR2}" stroke-width="1.5"/>

        <!-- Micro 2 inner lumen -->
        <circle cx="${c2x}" cy="${C}" r="${r2Id}"
                fill="#090d14" fill-opacity="0.7"/>

        <!-- Access ID dashed boundary ring -->
        <circle cx="${C}" cy="${C}" r="${accessIdR}"
                fill="none" stroke="#0ea5e9" stroke-width="1"
                stroke-dasharray="4 3" opacity="0.45"/>
      </svg>

      <div class="lumen-viz-dims">
        <div class="dim-item">
          <span class="dim-swatch" style="border: 2px dashed #0ea5e9; opacity: 0.6;"></span>
          <span class="dim-key">Access ID</span>
          <span class="dim-val">${access.idMm.toFixed(2)}</span>
          <span class="dim-unit">mm</span>
        </div>
        <div class="dim-item">
          <span class="dim-swatch" style="background: ${COLOR1}; opacity: 0.65;"></span>
          <span class="dim-key">Micro 1 OD</span>
          <span class="dim-val">${micro.proxOdMm.toFixed(2)}</span>
          <span class="dim-unit">mm</span>
        </div>
        <div class="dim-item">
          <span class="dim-swatch" style="background: ${COLOR2}; opacity: 0.65;"></span>
          <span class="dim-key">Micro 2 OD</span>
          <span class="dim-val">${micro2.proxOdMm.toFixed(2)}</span>
          <span class="dim-unit">mm</span>
        </div>
      </div>
    </div>`;
  }

  // ── Single micro layout (original) ──────────────────────────────────────
  const microR    = (micro.proxOdMm / 2) * SCALE;
  const microIdR  = (micro.idMm / 2) * SCALE;

  const clearance   = (access.idMm || access.shaftOdMm || 0) - micro.proxOdMm;
  const cls         = compatClass(clearance);
  const gapColor    = cls === 'green' ? '#10b981' : cls === 'amber' ? '#f59e0b' : '#ef4444';
  const gapOpacity  = 0.18;
  const microOpacity = 0.60;

  return `
    <div class="lumen-viz-wrapper">
      <div class="lumen-viz-label">Cross-section view</div>
      <svg class="lumen-viz" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="Lumen cross-section: ${access.name} with ${micro.name}">

        <!-- Outer ambient glow -->
        <circle cx="${C}" cy="${C}" r="${accessOdR + 10}"
                fill="none" stroke="${gapColor}" stroke-width="1" opacity="0.06"/>

        <!-- Access catheter wall (OD) — dark fill -->
        <circle cx="${C}" cy="${C}" r="${accessOdR}"
                fill="#1a2236" stroke="#1e3a5f" stroke-width="1.5"/>

        <!-- Lumen space (access ID) — gap fill colored by status -->
        <circle cx="${C}" cy="${C}" r="${accessIdR}"
                fill="${gapColor}" fill-opacity="${gapOpacity}"/>

        <!-- Microcatheter outer -->
        <circle cx="${C}" cy="${C}" r="${microR}"
                fill="${gapColor}" fill-opacity="${microOpacity}"
                stroke="${gapColor}" stroke-width="1.5"/>

        <!-- Microcatheter inner lumen (working channel) -->
        <circle cx="${C}" cy="${C}" r="${microIdR}"
                fill="#090d14" fill-opacity="0.7"/>

        <!-- Access ID dashed boundary ring -->
        <circle cx="${C}" cy="${C}" r="${accessIdR}"
                fill="none" stroke="#0ea5e9" stroke-width="1"
                stroke-dasharray="4 3" opacity="0.45"/>
      </svg>

      <div class="lumen-viz-dims">
        <div class="dim-item">
          <span class="dim-swatch" style="border: 2px solid #0ea5e9; opacity: 0.4;"></span>
          <span class="dim-key">Access OD</span>
          <span class="dim-val">${access.odMm ? access.odMm.toFixed(2) : (access.proxOdMm || access.shaftOdMm || 0).toFixed(2)}</span>
          <span class="dim-unit">mm</span>
        </div>
        <div class="dim-item">
          <span class="dim-swatch" style="border: 2px dashed #0ea5e9; opacity: 0.6;"></span>
          <span class="dim-key">Access ID</span>
          <span class="dim-val">${access.idMm ? access.idMm.toFixed(2) : (access.shaftOdMm || 0).toFixed(2)}</span>
          <span class="dim-unit">mm</span>
        </div>
        <div class="dim-item">
          <span class="dim-swatch" style="background: ${gapColor}; opacity: 0.65;"></span>
          <span class="dim-key">Micro OD</span>
          <span class="dim-val">${micro.proxOdMm.toFixed(2)}</span>
          <span class="dim-unit">mm</span>
        </div>
      </div>
    </div>`;
}

/* ─── DETAIL VIEW ────────────────────────────────────────────────────────────── */
function updateDetailView() {
  const accessVal  = document.getElementById('detail-access').value;
  const microVal   = document.getElementById('detail-micro').value;
  const microVal2  = document.getElementById('detail-micro-2').value;
  const el = document.getElementById('detail-result');

  if (!accessVal && !microVal && !microVal2) {
    el.innerHTML = '';
    return;
  }

  const [accessCat, accessName] = accessVal ? accessVal.split(':') : ['', ''];
  const [microCat, microName] = microVal ? microVal.split(':') : ['', ''];

  // Handle both access and balloon guide as access-like
  let access = null;
  if (accessCat === 'accessCatheters') {
    access = data.accessCatheters.find(c => c.name === accessName);
  } else if (accessCat === 'balloonGuideCatheters') {
    access = data.balloonGuideCatheters.find(c => c.name === accessName);
    if (access && !access.idMm) access.idMm = access.shaftOdMm; // fallback if needed
  }

  const allInner = getAllInners();
  const micro  = microName ? allInner.find(c => c.name === microName) : null;
  const [, microName2] = microVal2 ? microVal2.split(':') : ['', ''];
  const micro2 = microName2 ? allInner.find(c => c.name === microName2) : null;

  let html = '';

  // Lumen visualization — only when both access and at least one micro are selected
  if (access && micro) {
    html += renderLumenViz(access, micro, micro2 || null);
  }

  // Access catheter specs (or balloon guide)
  if (access) {
    html += `
      <div class="section" style="margin-top:16px">
        <div class="section-label">${access.name} · ${access.company}</div>
        <div class="spec-grid">
          <div class="spec-cell">
            <div class="spec-label">French Size</div>
            <div class="spec-val">${access.fr || '—'}</div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">Outer Diameter</div>
            <div class="spec-val">${access.odMm ? access.odMm.toFixed(2) : (access.proxOdMm || access.shaftOdMm || 0).toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
          <div class="spec-cell primary">
            <div class="spec-label">Inner Diameter</div>
            <div class="spec-val">${access.idMm ? access.idMm.toFixed(2) : (access.shaftOdMm || 0).toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">ID (inch)</div>
            <div class="spec-val">${access.idInch ? access.idInch.toFixed(3) : (access.shaftOdInch || 0).toFixed(3)}<span class="spec-unit">in</span></div>
          </div>
          ${access.notes ? `<div class="spec-cell full"><div class="spec-note">${access.notes}</div></div>` : ''}
        </div>
      </div>`;
  }

  // Inner catheter specs
  if (micro) {
    html += `
      <div class="section" style="margin-top:16px">
        <div class="section-label">${micro.name} · ${micro.company}</div>
        <div class="spec-grid">
          <div class="spec-cell primary">
            <div class="spec-label">Proximal OD</div>
            <div class="spec-val">${micro.proxOdMm.toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">Distal OD</div>
            <div class="spec-val">${micro.distOdMm != null ? micro.distOdMm.toFixed(2) : '—'}<span class="spec-unit">${micro.distOdMm != null ? 'mm' : ''}</span></div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">Inner Diameter</div>
            <div class="spec-val">${micro.idMm.toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
          ${micro.notes ? `<div class="spec-cell full"><div class="spec-note">${micro.notes}</div></div>` : ''}
        </div>
      </div>`;
  }

  if (micro2) {
    html += `
      <div class="section" style="margin-top:16px">
        <div class="section-label">${micro2.name} · ${micro2.company}</div>
        <div class="spec-grid">
          <div class="spec-cell primary">
            <div class="spec-label">Proximal OD</div>
            <div class="spec-val">${micro2.proxOdMm.toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">Distal OD</div>
            <div class="spec-val">${micro2.distOdMm != null ? micro2.distOdMm.toFixed(2) : '—'}<span class="spec-unit">${micro2.distOdMm != null ? 'mm' : ''}</span></div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">Inner Diameter</div>
            <div class="spec-val">${micro2.idMm.toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
        </div>
      </div>`;
  }

  // Compatibility banner — only when both access and micro are selected
  if (access && micro) {
    const accessId = access.idMm || access.shaftOdMm || 0;
    const clearance = micro2
      ? accessId - micro.proxOdMm - micro2.proxOdMm
      : accessId - micro.proxOdMm;
    const cls = compatClass(clearance);
    const lbl = compatLabel(clearance);
    const sign = clearance >= 0 ? '+' : '';
    const subtitle = micro2
      ? `Combined OD ${(micro.proxOdMm + micro2.proxOdMm).toFixed(2)} mm · ${lbl.sub}`
      : lbl.sub;
    html += `
      <div class="compat-banner ${cls}">
        <div class="compat-icon">${lbl.icon}</div>
        <div>
          <div class="compat-title">${lbl.text} — clearance ${sign}${clearance.toFixed(2)} mm</div>
          <div class="compat-sub">${subtitle}</div>
        </div>
      </div>`;
  }

  el.innerHTML = html;
  syncURLState();
}

/* ─── EVENT LISTENERS ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Tab buttons
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Microcatheter slot selects + clear buttons
  [1, 2, 3].forEach(n => {
    document.getElementById(`micro-${n}`)
      .addEventListener('change', updateFastView);
    document.getElementById(`slot-clear-${n}`)
      .addEventListener('click', () => clearSlot(n));
  });

  // Detail view selects
  document.getElementById('detail-access').addEventListener('change', updateDetailView);
  document.getElementById('detail-micro').addEventListener('change', updateDetailView);
  document.getElementById('detail-micro-2').addEventListener('change', updateDetailView);

  // Reference tab filter pills
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      accessFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-pill').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderAccessTable();
    });
  });

  // Set last-updated date
  document.getElementById('last-updated').textContent = 'Updated Jun 2026';

  // Initialise
  populateSelects();

  // Inject any locally-saved custom devices into the selects immediately
  refreshCustomInSelects();

  renderAllCategories(); // Dynamic render instead of static functions
  updateFastView();

  // Apply any deep-link state from URL (after selects are populated)
  applyURLState();

  // Share buttons — copy current location (state is kept live in URL)
  const fastShareBtn = document.getElementById('fast-share');
  const fastShareStatus = document.getElementById('fast-share-status');
  if (fastShareBtn) {
    fastShareBtn.addEventListener('click', () => {
      const url = location.href;
      navigator.clipboard.writeText(url).then(() => {
        fastShareStatus.textContent = 'Link copied!';
        fastShareStatus.classList.add('show');
        setTimeout(() => {
          fastShareStatus.classList.remove('show');
          fastShareStatus.textContent = '';
        }, 1500);
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    });
  }

  // Save current combo
  const fastSaveBtn = document.getElementById('fast-save');
  if (fastSaveBtn) {
    fastSaveBtn.addEventListener('click', saveCurrentStack);
  }

  // Initial render of any previously saved stacks
  renderSavedStacks();

  // Custom devices
  const addCustomBtn = document.getElementById('add-custom-btn');
  if (addCustomBtn) {
    addCustomBtn.addEventListener('click', addCustomDevice);
  }

  const detailShareBtn = document.getElementById('detail-share');
  const detailShareStatus = document.getElementById('detail-share-status');
  if (detailShareBtn) {
    detailShareBtn.addEventListener('click', () => {
      const url = location.href;
      navigator.clipboard.writeText(url).then(() => {
        detailShareStatus.textContent = 'Link copied!';
        detailShareStatus.classList.add('show');
        setTimeout(() => {
          detailShareStatus.classList.remove('show');
          detailShareStatus.textContent = '';
        }, 1500);
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    });
  }

  // Keyboard polish: "/" focuses reference search when on that tab; "?" shows help toast; Escape clears fast slots
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.getElementById('tab-all').style.display !== 'none') {
      const inp = document.getElementById('ref-search');
      if (inp) {
        e.preventDefault();
        inp.focus();
        inp.select();
      }
    }
    if (e.key.toLowerCase() === '?' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const st = document.getElementById('fast-share-status');
      if (st) {
        st.textContent = 'Tip: Use Share links, Saved stacks, and Custom devices';
        st.classList.add('show');
        setTimeout(() => { st.classList.remove('show'); st.textContent = ''; }, 2200);
      }
    }
    if (e.key === 'Escape') {
      // Clear fast slots if any have value
      let cleared = false;
      [1,2,3].forEach(n => {
        const s = document.getElementById(`micro-${n}`);
        if (s && s.value) { s.value = ''; cleared = true; }
      });
      if (cleared) updateFastView();
    }
  });

  // Bonus: clicking the status area can also copy a plain-text report
  if (fastShareStatus) {
    fastShareStatus.style.cursor = 'pointer';
    fastShareStatus.addEventListener('click', () => copyReport('fast'));
  }
  if (detailShareStatus) {
    detailShareStatus.style.cursor = 'pointer';
    detailShareStatus.addEventListener('click', () => copyReport('detail'));
  }

  // Quick preset stacks for Fast Check
  const PRESETS = {
    'sofia-red': ['Sofia Flow 88', 'RED 72 Kit'],
    'phenom-catalyst': ['Phenom 21', 'AXS Catalyst 5'],
    'headway-trevo': ['Headway 21', 'Trevo Trak 21'],
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      const names = PRESETS[key] || [];
      if (!names.length) return;

      const allInners = getAllInners();
      // Clear first
      [1,2,3].forEach(n => { document.getElementById(`micro-${n}`).value = ''; });

      names.forEach((name, i) => {
        const slot = i + 1;
        if (slot > 3) return;
        const found = allInners.find(c => c.name === name);
        if (!found) return;

        let catKey = 'microCatheters';
        if (data.dacCatheters.some(c => c.name === name)) catKey = 'dacCatheters';
        else if (data.thrombectomyCatheters.some(c => c.name === name)) catKey = 'thrombectomyCatheters';

        document.getElementById(`micro-${slot}`).value = `${catKey}:${name}`;
      });

      updateFastView();
      // brief visual feedback on the button
      btn.style.transition = 'none';
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => {
        btn.style.transition = '';
        btn.style.transform = '';
      }, 120);
    });
  });
});

/* ─── SPLASH SCREEN ──────────────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }, 1900);
});
