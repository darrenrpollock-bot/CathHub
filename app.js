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

/* ─── POPULATE SELECTS ───────────────────────────────────────────────────────── */
function populateSelects() {
  // Access catheter selects
  const accessSelects = ['detail-access'];
  accessSelects.forEach(id => {
    const el = document.getElementById(id);
    data.accessCatheters.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.name}  ·  ID ${c.idMm.toFixed(2)} mm`;
      el.appendChild(opt);
    });
  });

  // Inner catheter selects (micros + DACs + thrombectomy)
  const microSelects = ['micro-1', 'micro-2', 'micro-3', 'detail-micro', 'detail-micro-2'];
  const innerGroups = [
    { label: 'Microcatheters',         list: data.microCatheters },
    { label: 'DAC Catheters',          list: data.dacCatheters },
    { label: 'Thrombectomy Catheters', list: data.thrombectomyCatheters },
  ];
  microSelects.forEach(id => {
    const el = document.getElementById(id);
    innerGroups.forEach(({ label, list }) => {
      if (!list || !list.length) return;
      const grp = document.createElement('optgroup');
      grp.label = label;
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name}  ·  OD ${c.proxOdMm.toFixed(2)} mm`;
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
      <td style="color:var(--muted);font-feature-settings:'tnum' 1">${c.odMm.toFixed(2)}</td>
      <td><strong style="font-feature-settings:'tnum' 1">${c.idMm.toFixed(2)}</strong></td>
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
}

/* ─── FAST VIEW ──────────────────────────────────────────────────────────────── */
function updateFastView() {
  // Update slot visual states
  [1, 2, 3].forEach(n => {
    const select  = document.getElementById(`micro-${n}`);
    const slot    = document.getElementById(`slot-${n}`);
    const odEl    = document.getElementById(`slot-od-${n}`);
    const clearEl = document.getElementById(`slot-clear-${n}`);
    const micro   = select.value
      ? [...data.microCatheters, ...data.dacCatheters, ...data.thrombectomyCatheters].find(c => c.name === select.value)
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

  // Gather selected inner catheters (micros + DACs + thrombectomy)
  const allInner = [...data.microCatheters, ...data.dacCatheters, ...data.thrombectomyCatheters];
  const micros = [1, 2, 3]
    .map(n => document.getElementById(`micro-${n}`).value)
    .filter(Boolean)
    .map(name => allInner.find(c => c.name === name))
    .filter(Boolean);

  const totalOd = micros.reduce((sum, m) => sum + m.proxOdMm, 0);

  // Calculate compatibility for all access catheters, sort best first
  const results = data.accessCatheters.map(ac => ({
    ...ac,
    clearance: ac.idMm - totalOd
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
        <td style="text-align:center;font-feature-settings:'tnum' 1">${r.idMm.toFixed(2)}</td>
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

  const accessOdR = (access.odMm    / 2) * SCALE;
  const accessIdR = (access.idMm    / 2) * SCALE;

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
  const microIdR  = (micro.idMm     / 2) * SCALE;

  const clearance   = access.idMm - micro.proxOdMm;
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
          <span class="dim-val">${access.odMm.toFixed(2)}</span>
          <span class="dim-unit">mm</span>
        </div>
        <div class="dim-item">
          <span class="dim-swatch" style="border: 2px dashed #0ea5e9; opacity: 0.6;"></span>
          <span class="dim-key">Access ID</span>
          <span class="dim-val">${access.idMm.toFixed(2)}</span>
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
  const accessName  = document.getElementById('detail-access').value;
  const microName   = document.getElementById('detail-micro').value;
  const microName2  = document.getElementById('detail-micro-2').value;
  const el = document.getElementById('detail-result');

  if (!accessName && !microName) {
    el.innerHTML = '';
    return;
  }

  const access = accessName ? data.accessCatheters.find(c => c.name === accessName) : null;
  const allInner = [...data.microCatheters, ...data.dacCatheters, ...data.thrombectomyCatheters];
  const micro  = microName  ? allInner.find(c => c.name === microName)  : null;
  const micro2 = microName2 ? allInner.find(c => c.name === microName2) : null;

  let html = '';

  // Lumen visualization — only when both access and at least one micro are selected
  if (access && micro) {
    html += renderLumenViz(access, micro, micro2 || null);
  }

  // Access catheter specs
  if (access) {
    html += `
      <div class="section" style="margin-top:16px">
        <div class="section-label">${access.name} · ${access.company}</div>
        <div class="spec-grid">
          <div class="spec-cell">
            <div class="spec-label">French Size</div>
            <div class="spec-val">${access.fr}</div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">Outer Diameter</div>
            <div class="spec-val">${access.odMm.toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
          <div class="spec-cell primary">
            <div class="spec-label">Inner Diameter</div>
            <div class="spec-val">${access.idMm.toFixed(2)}<span class="spec-unit">mm</span></div>
          </div>
          <div class="spec-cell">
            <div class="spec-label">ID (inch)</div>
            <div class="spec-val">${access.idInch.toFixed(3)}<span class="spec-unit">in</span></div>
          </div>
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
    const clearance = micro2
      ? access.idMm - micro.proxOdMm - micro2.proxOdMm
      : access.idMm - micro.proxOdMm;
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
  document.getElementById('last-updated').textContent = 'Updated Mar 2026';

  // Initialise
  populateSelects();
  renderAccessTable();
  renderMicroTable();
  renderDacTable();
  renderThrombectomyTable();
  updateFastView();
});

/* ─── SPLASH SCREEN ──────────────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }, 1900);
});
