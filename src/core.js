'use strict';
/* ==========================================================================
   Outil RA Mlezi Maore — cœur : utilitaires, stockage, adapters, imports
   ========================================================================== */
const SCHEMA = 'ra-mlezi/1';
const MOIS = ['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'];
const MOIS_N = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
const STATUTS = ['À lancer','En rédaction','Transmis au directeur','Transmis au Siège','À corriger','Contrôlé','Validé'];
const BADGE = {'À lancer':'b-lancer','En rédaction':'b-redac','Transmis au directeur':'b-dir','Transmis au Siège':'b-siege','À corriger':'b-corr','Contrôlé':'b-ctrl','Validé':'b-valid'};
const DEFAULT_PARAMS = {
  adresse: '6, rue du Jardin Fleuri – 97600 Mamoudzou',
  mention: 'Mlezi est une association de GROUPE SOS',
  approbateur: 'Thierry LANDE',
  annexeEcartsValide: false
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const nowISO = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const frDate = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleDateString('fr-FR'); };
const frDateTime = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'}); };

function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).replace(/[\s  €]/g, '');
  const pct = s.endsWith('%'); if (pct) s = s.slice(0, -1);
  if (s === '' || s === '-') return null;
  s = s.replace(',', '.');
  if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return null;
  const n = parseFloat(s); return pct ? n / 100 : n;
}
const fmt = (n, d = 0) => (n === null || n === undefined || n === '' || isNaN(n)) ? '—' : Number(n).toLocaleString('fr-FR', {maximumFractionDigits: d});
const pct = n => (n === null || n === undefined || !isFinite(n)) ? '—' : (n * 100).toLocaleString('fr-FR', {maximumFractionDigits: 1}) + ' %';
const sum = a => a.reduce((s, x) => s + (num(x) || 0), 0);
const uniq = a => [...new Set(a.filter(x => x !== '' && x != null))];

function parseDate(s) { // JJ/MM/AAAA[ hh:mm] ou AAAA-MM-JJ → AAAA-MM-JJ
  s = String(s ?? '').trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  return null;
}
function parseLooseDate(s) { // JJ/MM/AAAA | MM/AAAA | AAAA → Date
  s = String(s ?? '').trim(); let m;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]);
  if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return new Date(+m[2], +m[1] - 1, 1);
  if ((m = s.match(/^(\d{4})-(\d{2})(-(\d{2}))?$/))) return new Date(+m[1], +m[2] - 1, +(m[4] || 1));
  if ((m = s.match(/^(\d{4})$/))) return new Date(+m[1], 0, 1);
  return null;
}
const addYears = (d, n) => new Date(d.getFullYear() + n, d.getMonth(), d.getDate());

/* ---------- CSV ---------- */
function parseCSV(text, sep, onRow) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  if (!sep) { const nl = text.indexOf('\n'); const first = text.slice(0, nl > 0 ? nl : text.length); sep = first.split(';').length >= first.split(',').length ? ';' : ','; }
  const rows = []; let row = [], f = '', q = false;
  const push = () => { if (row.some(x => x !== '')) { if (onRow) onRow(row); else rows.push(row); } row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); f = ''; push(); }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length) { row.push(f); push(); }
  return rows;
}
function toCSV(rows) {
  return '﻿' + rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
}
function download(name, data, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], {type: mime || 'application/octet-stream'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
const safeName = s => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

/* ---------- Empreinte ---------- */
function stable(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
  return '{' + Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
}
async function hashOf(o) {
  const s = stable(o);
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return 'sha256:' + [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'fnv:' + h.toString(16);
  }
}

/* ---------- Stockage local (IndexedDB) ---------- */
const DB = {
  db: null, warned: false,
  async open() {
    if (this.db) return this.db;
    this.db = await new Promise((res, rej) => {
      const r = indexedDB.open('ra-mlezi', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return this.db;
  },
  async get(k) {
    try { const db = await this.open(); return await new Promise((res, rej) => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); }
    catch (e) { this.fail(e); return undefined; }
  },
  async set(k, v) {
    try { const db = await this.open(); await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
    catch (e) { this.fail(e); }
  },
  fail(e) {
    if (this.warned) return; this.warned = true;
    toast("Sauvegarde automatique impossible dans ce navigateur. Utilisez « Enregistrer » pour télécharger le fichier .json.", 7000);
    console.warn(e);
  }
};
let saveTimer = null;
function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (S.camp) DB.set('campaign', S.camp);
    if (S.br) DB.set('brouillon', S.br);
  }, 600);
}

/* ---------- UI : toast et modales ---------- */
function toast(msg, ms = 3500) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms); }
function modalForm(title, fields, opts = {}) {
  return new Promise(resolve => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${opts.intro ? `<p class="small">${opts.intro}</p>` : ''}
      ${fields.map(f => `<div class="fld"><label class="${f.required ? 'req' : ''}">${esc(f.label)}</label>
        ${f.type === 'textarea' ? `<textarea data-k="${f.k}" maxlength="${f.max || 5000}">${esc(f.value || '')}</textarea>`
          : f.type === 'select' ? `<select data-k="${f.k}">${f.options.map(o => `<option ${o === f.value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
          : `<input type="text" data-k="${f.k}" value="${esc(f.value || '')}" maxlength="${f.max || 300}">`}
        ${f.max ? `<div class="cnt" data-c="${f.k}"></div>` : ''}</div>`).join('')}
      <div class="act"><button class="btn ghost" data-a="no">Annuler</button><button class="btn" data-a="ok">${esc(opts.ok || 'Valider')}</button></div></div>`;
    document.body.appendChild(bg);
    const upd = () => fields.forEach(f => { if (f.max) { const el = $(`[data-k="${f.k}"]`, bg); $(`[data-c="${f.k}"]`, bg).textContent = `${el.value.length} / ${f.max}`; } });
    bg.addEventListener('input', upd); upd();
    const first = $('[data-k]', bg); if (first) first.focus();
    bg.addEventListener('click', e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'no') { bg.remove(); resolve(null); return; }
      const out = {}; for (const f of fields) { out[f.k] = $(`[data-k="${f.k}"]`, bg).value.trim(); if (f.required && !out[f.k]) { toast(`« ${f.label} » est obligatoire.`); return; } }
      bg.remove(); resolve(out);
    });
  });
}
const confirmBox = (title, text, ok = 'Confirmer') => modalForm(title, [], {intro: text, ok}).then(r => !!r);
async function askActor(role) {
  const r = await modalForm('Qui effectue cette action ?', [
    {k: 'nom', label: 'Nom et prénom', value: S.actor?.nom || '', required: true},
    {k: 'fonction', label: 'Fonction', value: S.actor?.fonction || role || '', required: true}
  ], {intro: "L'outil n'a pas d'authentification : le nom et la fonction déclarés sont inscrits au journal du RA."});
  if (r) S.actor = r; return r;
}

/* ---------- Adapters (couche d'import remplaçable par Apps Script) ---------- */
const adapters = {
  async readWorkbook(file) {
    const n = file.name.toLowerCase();
    if (n.endsWith('.csv') || n.endsWith('.txt')) return {[file.name.replace(/\.[^.]+$/, '')]: parseCSV(await file.text())};
    const wb = XLSX.read(await file.arrayBuffer(), {type: 'array'});
    const out = {}; wb.SheetNames.forEach(s => { out[s] = XLSX.utils.sheet_to_json(wb.Sheets[s], {header: 1, raw: true, defval: ''}); });
    return out;
  },
  readText: file => file.text(),
  readDataURL: file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); }),
  // Photos : réduites à 1600 px de large au plus, en JPEG qualité 0,8 (PNG conservé s'il est déjà plus léger)
  async readImage(file, maxW = 1600) {
    const src = await adapters.readDataURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const k = Math.min(1, maxW / img.naturalWidth), cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const out = cv.toDataURL('image/jpeg', 0.8);
      return out.length < src.length ? out : src;
    } catch (e) { return src; }
  }
};

/* ---------- État ---------- */
const S = {camp: null, br: null, actor: null, view: 'campagne', qcRA: null, sel: new Set()};

function newCampaign(annee) {
  return {schemaVersion: SCHEMA, kind: 'campagne', annee, params: clone(DEFAULT_PARAMS), logos: {mlezi: '', sos: ''},
    referentiel: [], ras: [], activite: {N: null, N1: null}, sheetLinks: {}, fei: null,
    ageval: AGEVAL_INIT.map(([prefix, service, sid, note]) => ({prefix, service, sid, note: note || ''})),
    registre: {}, organigrammes: {}, orgaOrphans: [], brouillons: {}, controles: {}, createdAt: nowISO()};
}
const getRA = id => S.camp.ras.find(r => r.id === id);
const redacteur = ra => ra.chef || ra.directeur;
function addJournal(target, statut, actor, commentaire) {
  target.journal = target.journal || [];
  target.journal.push({date: nowISO(), statut, nom: actor?.nom || '', fonction: actor?.fonction || '', commentaire: commentaire || ''});
  target.statut = statut;
}

/* ---------- Référentiel ---------- */
const REF_COLS = ['service_id','service','secteur','direction','type_gestion','directeur','chef_de_service','esms','finess','fiabilite_esms','analytiques','sites','communes'];
function parseReferentiel(sheets) {
  const aoa = sheets['vue_service'] || Object.values(sheets).find(a => a.some(r => r.some(c => norm(c) === 'service_id')));
  if (!aoa) throw new Error("Onglet « vue_service » introuvable (aucune colonne service_id).");
  const hi = aoa.findIndex(r => r.some(c => norm(c) === 'service_id'));
  const H = aoa[hi].map(norm); const col = k => H.indexOf(k);
  const need = ['service_id','service','secteur','direction','directeur','chef_de_service','esms','finess','analytiques','sites','communes'];
  const miss = need.filter(k => col(k) < 0);
  if (miss.length) throw new Error('Colonnes absentes du référentiel : ' + miss.join(', '));
  return aoa.slice(hi + 1).filter(r => String(r[col('service_id')] ?? '').trim()).map(r => {
    const o = {}; REF_COLS.forEach(k => { o[k] = col(k) >= 0 ? String(r[col(k)] ?? '').trim() : ''; }); return o;
  });
}
const isEsms = v => { const n = norm(v); return !!n && !['non','-','0','false','n/a','na','faux'].includes(n); };
const codesOf = s => String(s || '').split(/[,;\s]+/).map(x => x.trim()).filter(x => /^\d{3,6}$/.test(x));
function newRA(r) {
  const ra = {id: 'RA-' + r.service_id, services: [r.service_id], libelle: r.service, secteur: r.secteur, direction: r.direction,
    directeur: r.directeur, chef: r.chef_de_service, esms: isEsms(r.esms), finess: r.finess, sites: r.sites, communes: r.communes,
    analytiques: codesOf(r.analytiques), cvs_obligatoire: false, smjpm: /smjpm|mandataire/i.test(r.service), statut: 'À lancer', journal: []};
  addJournal(ra, 'À lancer', {nom: 'Siège', fonction: 'Calcul du périmètre'}, 'RA créé depuis le référentiel');
  return ra;
}
function applyReferentiel(rows) {
  const c = S.camp; c.referentiel = rows; const byId = Object.fromEntries(rows.map(r => [r.service_id, r]));
  if (!c.ras.length) c.ras = rows.map(newRA);
  else {
    const covered = new Set(c.ras.flatMap(r => r.services));
    rows.forEach(r => { if (!covered.has(r.service_id)) c.ras.push(newRA(r)); });
    c.ras.forEach(ra => {
      const rs = ra.services.map(id => byId[id]).filter(Boolean);
      ra.absentRef = rs.length === 0;
      if (rs.length === 1 && !ra.split && !ra.merged) {
        const r = rs[0]; Object.assign(ra, {secteur: r.secteur, direction: r.direction, directeur: r.directeur, chef: r.chef_de_service, finess: r.finess, sites: r.sites, communes: r.communes});
      }
    });
  }
  seedRegistre();
  if (S.camp.reprise && typeof feedRegistre === 'function') feedRegistre();
}
function splitRA(id) {
  const ra = getRA(id); if (ra.analytiques.length < 2) { toast("Ce RA n'a qu'un code analytique : rien à scinder."); return; }
  const parts = ra.analytiques.map(code => { const p = clone(ra); p.id = ra.id + '-' + code; p.analytiques = [code]; p.libelle = ra.libelle + ' (' + code + ')'; p.split = true; p.journal = []; addJournal(p, 'À lancer', {nom: 'Siège', fonction: 'Périmètre'}, 'Scission de ' + ra.libelle); return p; });
  const i = S.camp.ras.indexOf(ra); S.camp.ras.splice(i, 1, ...parts); delete S.camp.registre[ra.id]; seedRegistre();
}
function mergeRAs(ids) {
  const ras = ids.map(getRA); const m = clone(ras[0]);
  Object.assign(m, {id: 'RA-' + uniq(ras.flatMap(r => r.services)).join('+'), services: uniq(ras.flatMap(r => r.services)), analytiques: uniq(ras.flatMap(r => r.analytiques)),
    libelle: ras.map(r => r.libelle).join(' / '), finess: uniq(ras.flatMap(r => String(r.finess).split(/[,;]\s*/))).join(', '),
    sites: uniq(ras.flatMap(r => String(r.sites).split(/[,;]\s*/))).join(', '), communes: uniq(ras.flatMap(r => String(r.communes).split(/[,;]\s*/))).join(', '),
    esms: ras.some(r => r.esms), cvs_obligatoire: ras.some(r => r.cvs_obligatoire), merged: true, split: false, journal: []});
  addJournal(m, 'À lancer', {nom: 'Siège', fonction: 'Périmètre'}, 'Fusion de ' + ras.map(r => r.libelle).join(', '));
  const i = S.camp.ras.indexOf(ras[0]); S.camp.ras = S.camp.ras.filter(r => !ids.includes(r.id)); S.camp.ras.splice(Math.min(i, S.camp.ras.length), 0, m);
  ids.forEach(id => delete S.camp.registre[id]); seedRegistre();
}

/* ---------- Activité ---------- */
const LINE_DEFS = [
  ['jours', ["nombre jours d'ouverture", "nombre de jours d'ouverture", "nb jours d'ouverture", "jours d'ouverture"]],
  ['theorique', ['volume activite theorique', "volume d'activite theorique", 'volume theorique']],
  ['previsionnel', ['volume activite previsionnel', "volume d'activite previsionnel", 'volume previsionnel']],
  ['realise', ['nombre journees reel', 'nombre de journees reel', 'nombre journees realisees', 'nombre de journees realisees', 'activite realisee', 'volume activite realise']],
  ['facturation', ['montant de la facturation', 'montant facturation', 'facturation']],
  ['file_active', ['file active']]
];
const PARAM_DEFS = [['prix', 'prix journalier'], ['jours_cible', "jours d'ouverture cible"], ['places', 'nb de places'], ['places', 'nombre de places'], ['places', 'nb de mineurs'], ['places', 'nombre de mineurs'], ['taux_prev', "taux d'occupation previsionnel"], ['financeur', 'type de gestion'], ['financeur', 'financeur']];
const LINE_LABELS = {jours: "Jours d'ouverture", theorique: 'Volume théorique', previsionnel: 'Volume prévisionnel', realise: 'Réalisé', facturation: 'Facturation (€)', file_active: 'File active'};

function parseActivitySheet(name, aoa, file) {
  let hr = -1, lc = -1;
  for (let r = 0; r < Math.min(aoa.length, 40); r++) { const i = aoa[r].findIndex(c => norm(c) === 'periode' || norm(c) === 'periode :'); if (i >= 0) { hr = r; lc = i; break; } }
  if (hr < 0) return null;
  const H = aoa[hr].map(norm);
  const mcols = MOIS_N.map(m => H.findIndex(h => h === m || h.startsWith(m)));
  const tcol = H.findIndex(h => h === 'total');
  if (mcols.filter(x => x >= 0).length < 6) return null;
  const params = {}; let code = null, libelle = name;
  const pr = aoa.slice(0, hr).find(r => r.some(c => norm(c).startsWith('dispositif')));
  if (pr) {
    const cells = pr.map(c => String(c ?? '').trim());
    // Zone d'identification : entre « Dispositif: » et la première étiquette de paramètre
    const di = cells.findIndex(c => norm(c).startsWith('dispositif'));
    let pe = cells.findIndex((c, i) => i > di && PARAM_DEFS.some(d => norm(c).startsWith(d[1]))); if (pe < 0) pe = cells.length;
    const seg = cells.slice(di + 1, pe).filter(Boolean);
    const cc = seg.find(c => /^\d{3}(\d{3})?$/.test(c)); if (cc) code = cc;
    const libs = seg.filter(c => c !== cc); if (libs.length) libelle = libs.reduce((a, b) => b.length > a.length ? b : a);
    cells.forEach((c, i) => {
      const n = norm(c); const d = PARAM_DEFS.find(d => n.startsWith(d[1]));
      if (d && params[d[0]] === undefined) {
        const v = cells.slice(i + 1).find(x => x !== '');
        if (v !== undefined && !PARAM_DEFS.some(dd => norm(v).startsWith(dd[1]))) { params[d[0]] = d[0] === 'financeur' ? v : (num(v) ?? v); if (d[0] === 'places') params.places_label = c.replace(/\s*:$/, ''); }
      }
    });
  }
  if (!code) { const m = String(name).match(/^\s*(\d{3}(?:\d{3})?)\b/); if (m) code = m[1]; }
  const lines = {}, totals = {};
  for (let r = hr + 1; r < aoa.length; r++) {
    const lab = norm(aoa[r][lc]); if (!lab || lab.includes('cumul')) continue;
    const def = LINE_DEFS.find(([k, syn]) => !lines[k] && syn.some(s => lab === s || lab.startsWith(s)));
    if (!def) continue;
    lines[def[0]] = mcols.map(ci => ci >= 0 ? num(aoa[r][ci]) : null);
    totals[def[0]] = tcol >= 0 ? num(aoa[r][tcol]) : null;
  }
  const missing = lines.realise ? lines.realise.map((v, i) => v === null ? i : -1).filter(i => i >= 0) : [...Array(12).keys()];
  return {name, file, code, libelle, params, lines, totals, missing};
}
async function importActivity(files, yk) {
  const sheets = S.camp.activite[yk]?.sheets || [];
  const report = {ok: 0, ignored: []};
  for (const f of files) {
    const wb = await adapters.readWorkbook(f);
    for (const [name, aoa] of Object.entries(wb)) {
      const sh = parseActivitySheet(name, aoa, f.name);
      if (!sh) { report.ignored.push(`${f.name} › ${name}`); continue; }
      const i = sheets.findIndex(s => s.name === name && s.file === f.name);
      if (i >= 0) sheets[i] = sh; else sheets.push(sh); report.ok++;
    }
  }
  S.camp.activite[yk] = {sheets, importedAt: nowISO()};
  return report;
}
function rasForSheet(sh, yk) {
  const key = yk + '|' + sh.file + '|' + sh.name;
  if (key in S.camp.sheetLinks) return S.camp.sheetLinks[key] ? [S.camp.sheetLinks[key]] : [];
  if (!sh.code) return [];
  return S.camp.ras.filter(ra => ra.analytiques.some(c => sh.code.length >= 6 ? c === sh.code : c.startsWith(sh.code))).map(r => r.id);
}
const sheetsForRA = (ra, yk) => (S.camp.activite[yk]?.sheets || []).filter(sh => rasForSheet(sh, yk).includes(ra.id));

/* ---------- FEI Ageval ---------- */
const FEI_POS = [[1,'Numéro'],[10,'Date'],[13,'Etablissement'],[14,'Service'],[15,'Catégorie'],[16,'Typologie'],[27,"Etat d'avancement"],[41,'Gravité'],[47,'Déclarations obligatoires - Type'],[49,'Date de clôture']];
const FEI_FORBIDDEN = ['description des faits', 'personnes concernees'];
const AGEVAL_INIT = [
  ['4b1.','Unité Sud','S23'],['4b2.','Unité Sud','S23'],['4b1.','Unité Centre','S24'],['4b2.','Unité Centre','S24'],
  ['4b1.','Unité Petite Terre','S30'],['4b2.','Unité Petite Terre','S30'],['4b1.','Unité MDZ','S31'],['4b2.','Unité MDZ','S31'],
  ['4b1.','Unité PH','','à rattacher manuellement'],['4b2.','Unité PH','','à rattacher manuellement'],['4b1.','UEAA','','à rattacher manuellement'],['4b2.','UEAA','','à rattacher manuellement'],['4b1.','Unité Nord','','à rattacher manuellement'],['4b2.','Unité Nord','','à rattacher manuellement'],
  ['4b3.','*','S29'],['4b5.','*','S28'],['4b4.','*','S26'],['4b6.a','*','S22'],['4b6.b','*','S33'],['4b6.c','*','S25'],['4b7.','*','S32'],['4b9.','*','S27'],
  ['4a1.','*','S16'],['4a2.','*','S07'],['4a3.','*','S08'],['4a4.','*','S17'],['4a5.','*','S20'],['4a6.','*','S05'],['4a8.','*','S12'],['4a12.','*','S09'],
  ['4c1.','*','S36'],['4c2.','HI (','S34'],['4c2.','HU (','S34'],['4c2.','IML','S38'],['4c3.','*','S37'],['4c7.','*','S19'],['4c8.','*','S18'],
  ['4c13.','*','S14'],['4c14.','*','S02'],['4c15.','*','S15'],['4d1.','*','S39'],['4d2.','*','S41'],
  ['4c16.','*','','à trancher : S03 GMS CADEMA ou S04 GMS SUD'],['4c10.','*','','à confirmer : S01 ADJ ?'],['4b8.','*','','absent du référentiel']
];
const splitMulti = s => String(s || '').split('|').map(x => x.trim()).filter(x => x && x !== '-');

async function prepareFEI(file) {
  const text = await adapters.readText(file);
  let i = 0, err = null; const out = [];
  parseCSV(text, ';', row => {
    i++;
    if (i === 1) { out.push(['Tableau des anomalies', 'Evénements indésirables V2']); return; }
    if (i === 2) {
      const bad = FEI_POS.filter(([p, h]) => norm(row[p - 1]) !== norm(h));
      if (bad.length) err = 'En-têtes inattendus dans l\'export complet : ' + bad.map(([p, h]) => `position ${p} : attendu « ${h} », trouvé « ${row[p - 1] ?? ''} »`).join(' ; ');
      out.push(FEI_POS.map(x => x[1])); return;
    }
    if (err) return;
    out.push(FEI_POS.map(([p]) => row[p - 1] ?? '')); // lecture par position : seules les colonnes autorisées sont copiées
  });
  if (err) throw new Error(err);
  if (out.length < 2) throw new Error('Fichier vide ou illisible.');
  download(`FEI_Ageval_export_reduit_${today()}.csv`, toCSV(out), 'text/csv;charset=utf-8');
  return out.length - 2;
}
async function importFEI(file) {
  const rows = parseCSV(await adapters.readText(file), ';');
  const hi = norm(rows[0]?.[0]) === 'tableau des anomalies' ? 1 : 0;
  const H = (rows[hi] || []).map(norm);
  const allowed = FEI_POS.map(x => norm(x[1]));
  if (H.some(h => FEI_FORBIDDEN.includes(h)) || H.some(h => h && !allowed.includes(h))) throw new Error('Exportez uniquement les colonnes autorisées (utilisez « Préparer l\'export FEI »).');
  const ix = allowed.map(h => H.indexOf(h));
  const miss = allowed.filter((h, k) => ix[k] < 0); if (miss.length) throw new Error('Colonnes manquantes dans l\'export réduit : ' + miss.join(', '));
  const seen = new Set(), out = []; let doublons = 0, sansDate = 0;
  rows.slice(hi + 1).forEach(r => {
    const g = k => String(r[ix[k]] ?? '').trim();
    const id = g(0); if (id) { if (seen.has(id)) { doublons++; return; } seen.add(id); }
    const d = parseDate(g(1)); if (!d) { sansDate++; return; }
    out.push({date: d, etab: g(2), service: g(3), cats: splitMulti(g(4)), typos: splitMulti(g(5)), etat: g(6), grav: g(7), decl: splitMulti(g(8)).filter(x => norm(x) !== 'non'), cloture: parseDate(g(9))});
  });
  S.camp.fei = {rows: out, file: file.name, importedAt: nowISO(), doublons, sansDate};
  return out.length;
}
function feiSid(row) {
  const e = norm(row.etab), s = norm(row.service); let best = null;
  for (const m of S.camp.ageval) {
    if (m.exact) { if (norm(m.prefix) === e && norm(m.service) === s) return m.sid || null; continue; }
    if (!e.startsWith(norm(m.prefix))) continue;
    if (m.service === '*') { if (!best) best = m; }
    else if (s.includes(norm(m.service))) { best = m; break; }
  }
  return best ? (best.sid || null) : null;
}
function sidToRA() { const m = {}; S.camp.ras.forEach(ra => ra.services.forEach(sid => { if (!(sid in m)) m[sid] = ra.id; })); return m; }
function feiRowsFor(ra) { const map = sidToRA(); return (S.camp.fei?.rows || []).filter(r => { const sid = feiSid(r); return sid && map[sid] === ra.id; }); }
function feiUnmatched() {
  const map = sidToRA(), g = {};
  (S.camp.fei?.rows || []).forEach(r => { const sid = feiSid(r); if (!sid || !map[sid]) { const k = r.etab + '¤' + r.service; (g[k] = g[k] || {etab: r.etab, service: r.service, n: 0, sid: sid || ''}).n++; } });
  return Object.values(g).sort((a, b) => b.n - a.n);
}
function feiAgg(ra, N) {
  if (!S.camp.fei) return {imported: false};
  const all = feiRowsFor(ra), rows = all.filter(r => r.date.startsWith(N + '-'));
  const years = new Set(S.camp.fei.rows.map(r => r.date.slice(0, 4)));
  const a = {imported: true, annee: N, exportDate: S.camp.fei.importedAt.slice(0, 10), n: rows.length,
    nN1: years.has(String(N - 1)) ? all.filter(r => r.date.startsWith((N - 1) + '-')).length : null,
    cats: {}, grav: {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 'Non renseignée': 0}, avancement: {'Terminé': 0, 'En cours de traitement': 0, 'Non initié': 0},
    delai: null, declN: 0, autorites: {}};
  let dsum = 0, dn = 0;
  rows.forEach(r => {
    r.cats.forEach(c => a.cats[c] = (a.cats[c] || 0) + 1);
    const g = /^[1-5]$/.test(r.grav) ? r.grav : 'Non renseignée'; a.grav[g]++;
    const e = norm(r.etat);
    if (e.startsWith('termin')) { a.avancement['Terminé']++; if (r.cloture) { const d = (new Date(r.cloture) - new Date(r.date)) / 864e5; if (d >= 0) { dsum += d; dn++; } } }
    else if (e.startsWith('non init') || !e) a.avancement['Non initié']++;
    else a.avancement['En cours de traitement']++;
    if (r.decl.length) { a.declN++; r.decl.forEach(x => a.autorites[x] = (a.autorites[x] || 0) + 1); }
  });
  a.delai = dn ? Math.round(dsum / dn) : null;
  return a;
}

/* ---------- Registre 2002-2 ---------- */
const OUTILS_STD = [
  {k: 'livret', label: "Livret d'accueil", base: 'L. 311-4 CASF', type: 'date'},
  {k: 'charte', label: 'Charte des droits et libertés de la personne accueillie', base: 'L. 311-4 ; arrêté du 8 septembre 2003', type: 'charte'},
  {k: 'contrat', label: 'Contrat de séjour ou DIPC', base: 'L. 311-4 ; D. 311', type: 'contrat'},
  {k: 'pq', label: 'Personne qualifiée', base: 'L. 311-5', type: 'pq'},
  {k: 'reglement', label: 'Règlement de fonctionnement', base: 'L. 311-7 ; R. 311-33', type: 'date', revision: 5},
  {k: 'participation', label: 'CVS ou autre forme de participation', base: 'L. 311-6 ; D. 311-3 et s.', type: 'participation'},
  {k: 'projet', label: "Projet d'établissement ou de service", base: 'L. 311-8', type: 'date', revision: 5}
];
const OUTILS_SMJPM = [
  {k: 'notice', label: "Notice d'information", base: 'L. 471-6 CASF', type: 'date'},
  {k: 'charte', label: 'Charte des droits et libertés de la personne protégée', base: 'L. 471-6 (annexée à la notice)', type: 'charte'},
  {k: 'dipm', label: 'Document individuel de protection des majeurs (DIPM)', base: 'L. 471-8', type: 'date'},
  ...OUTILS_STD.slice(3)
];
const outilsFor = ra => ra.smjpm ? OUTILS_SMJPM : OUTILS_STD;
const OUTIL_FIELDS = {
  date: [['date', 'Date (MM/AAAA)']],
  charte: [['remise', "Remise à l'admission", ['', 'oui', 'non']], ['affichage', 'Affichage', ['', 'oui', 'non']]],
  contrat: [['type_doc', 'Type', ['', 'Contrat de séjour', 'DIPC']], ['date', 'Date du modèle (MM/AAAA)']],
  pq: [['communiquee', 'Liste connue et communiquée', ['', 'oui', 'non']]],
  participation: [['forme', 'Forme', ['', 'CVS', "Groupe d'expression", 'Enquête', 'Autre']], ['debut', 'Début du mandat / acte (MM/AAAA)'], ['reunions', 'Réunions en N']]
};
const REG_SEED = {
  IMEAEC: {charte: {commentaire: 'Charte 2022 (RA 2025)'}, livret: {date: '2022'}, contrat: {type_doc: 'Contrat de séjour', date: '2022'}, reglement: {date: '2022'}, pq: {communiquee: 'non'}, participation: {forme: 'CVS', debut: '2024', commentaire: 'Mandat 2024-2027 ; 2 réunions en 2025'}, projet: {commentaire: 'Réécriture en cours en 2025'}},
  S36: {livret: {date: '2025'}, contrat: {type_doc: 'Contrat de séjour', date: '2025'}, reglement: {date: '2025'}},
  S18: {notice: {date: '12/2025'}, charte: {commentaire: '2024 (charte de la personne protégée ?)'}, dipm: {date: '2023'}, reglement: {date: '2022'}, pq: {communiquee: 'non'}, participation: {forme: 'Enquête', commentaire: 'Enquête de satisfaction reportée en 02/2026'}},
  S08: {charte: {commentaire: '2025'}, livret: {date: '2025'}, contrat: {type_doc: 'DIPC', date: '09/2025'}, reglement: {commentaire: 'Non daté'}, pq: {commentaire: 'Non daté'}, participation: {forme: "Groupe d'expression", commentaire: 'Ateliers trimestriels, à formaliser en 2026'}},
  S16: {projet: {commentaire: 'Réécriture annoncée en 2024'}, livret: {commentaire: 'Livret FALC non daté'}, reglement: {commentaire: 'En cours de révision'}, contrat: {type_doc: 'DIPC', commentaire: 'Modèle non daté'}},
  S28: {charte: {commentaire: '2022'}, livret: {date: '2022'}, contrat: {date: '2022'}, reglement: {date: '2022'}, pq: {commentaire: '« 2022 » à vérifier'}, participation: {forme: 'CVS', debut: '04/2025', commentaire: 'CVS élu le 09/04/2025, 2 réunions en 2025'}},
  S22: {projet: {date: '07/2025'}, livret: {commentaire: 'À réactualiser (non daté)'}, reglement: {commentaire: 'À réactualiser (non daté)'}}
};
function seedRegistre() {
  const c = S.camp;
  c.ras.filter(ra => ra.esms).forEach(ra => {
    if (c.registre[ra.id]) return;
    const reg = {}; outilsFor(ra).forEach(o => reg[o.k] = {});
    const key = ra.services.find(s => ['S23','S24','S30','S31'].includes(s)) ? 'IMEAEC' : ra.services.find(s => REG_SEED[s]);
    if (key && REG_SEED[key]) Object.entries(REG_SEED[key]).forEach(([k, v]) => { if (reg[k]) Object.assign(reg[k], v); });
    c.registre[ra.id] = reg;
  });
}
function outilStatut(o, v, ra, N) {
  v = v || {}; if (v.sans_objet) return {s: 'Sans objet'};
  const ref = new Date(N, 11, 31);
  switch (o.type) {
    case 'date': case 'contrat': {
      const d = parseLooseDate(v.date); if (!d) return {s: 'Absent', why: 'aucune date'};
      if (o.revision && addYears(d, o.revision) < ref) return {s: 'À réviser', why: `${o.k === 'projet' ? 'adoption' : 'dernière révision'} de plus de ${o.revision} ans au 31/12/${N}`};
      return {s: 'À jour'};
    }
    case 'charte':
      if (v.remise === 'oui' && v.affichage === 'oui') return {s: 'À jour'};
      if (!v.remise && !v.affichage) return {s: 'Absent', why: 'remise et affichage non renseignés'};
      return {s: 'À réviser', why: "remise à l'admission ou affichage : non"};
    case 'pq': return v.communiquee === 'oui' ? {s: 'À jour'} : {s: 'Absent', why: v.communiquee === 'non' ? 'liste non communiquée' : 'non renseigné'};
    case 'participation': {
      if (!v.forme) return {s: 'Absent', why: 'aucune forme de participation'};
      if (ra.cvs_obligatoire && v.forme !== 'CVS') return {s: 'À réviser', why: 'CVS obligatoire (hébergement ou accueil de jour continu)'};
      if (v.forme === 'CVS') { const d = parseLooseDate(v.debut); if (!d) return {s: 'À réviser', why: 'date de début du mandat absente'}; if (addYears(d, 3) < ref) return {s: 'À renouveler', why: 'mandat de plus de 3 ans'}; }
      if (v.reunions === '' || v.reunions == null) return {s: 'À réviser', why: `nombre de réunions en ${N} non renseigné`};
      if (num(v.reunions) === 0) return {s: 'À réviser', why: `aucune réunion en ${N}`};
      return {s: 'À jour'};
    }
  }
  return {s: 'Absent'};
}
function outilSituation(o, v) {
  v = v || {}; if (v.sans_objet) return 'Sans objet';
  switch (o.type) {
    case 'date': return v.date ? (o.k === 'projet' ? 'Adopté en ' : 'Mis à jour en ') + v.date : 'Non daté';
    case 'contrat': return (v.type_doc || 'Type non précisé') + (v.date ? ' – modèle de ' + v.date : ' – non daté');
    case 'charte': return `Remise à l'admission : ${v.remise || '?'} ; affichage : ${v.affichage || '?'}`;
    case 'pq': return 'Liste départementale connue et communiquée : ' + (v.communiquee || 'non renseigné');
    case 'participation': return v.forme ? `${v.forme}${v.debut ? ' – depuis ' + v.debut : ''}${v.reunions !== '' && v.reunions != null ? ' – ' + v.reunions + ' réunion(s)' : ''}` : 'Aucune';
  }
  return '';
}

/* ---------- Organigrammes ---------- */
async function importOrganigrammes(files) {
  let ok = 0;
  for (const f of files) {
    if (!/^image\//.test(f.type)) { S.camp.orgaOrphans.push({name: f.name, data: '', date: '', err: 'Format non pris en charge (exporter en PNG ou JPEG)'}); continue; }
    const data = await adapters.readImage(f, 2000);
    const date = new Date(f.lastModified || Date.now()).toISOString().slice(0, 10);
    const m = f.name.match(/^(S\d+)[_\- ]/i);
    const sid = m && S.camp.referentiel.find(r => norm(r.service_id) === norm(m[1]))?.service_id;
    if (sid) { S.camp.organigrammes[sid] = {name: f.name, data, date}; ok++; }
    else S.camp.orgaOrphans.push({name: f.name, data, date});
  }
  return ok;
}
const orgaForRA = ra => { for (const s of ra.services) if (S.camp.organigrammes[s]) return S.camp.organigrammes[s]; return null; };
