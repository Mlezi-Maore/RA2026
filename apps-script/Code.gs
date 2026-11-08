/**
 * Rapports d'activité Mlezi Maore – web app Apps Script
 * Projet lié au classeur « Suivi rapports d'activités et de service ».
 * Les brouillons (.json) vivent dans les 4 sous-dossiers du dossier 2026 ; le dossier dépend du statut.
 */
const CFG = {
  ROOT_ID: '1aZGTgegaZ6NSEGr5uuo7s2JjlBr2yHC2',            // Rapports d'activités de services 2025 › 2026
  SHEET_ID: '1gXR_TZ5KN3t_pYWRE323gOSqKFEPi_C-fID3437ve2w',  // Suivi rapports d'activités et de service
  FOLDERS: {
    modeles: '1iN5lneUJIfqo2wGf19BMnRIqWXy16dOW',  // 1. Modèles
    encours: '1StakegFEPH3luTRZtjz9LOHAqfYI8twY',  // 2. En cours
    soumis:  '1uWf7--XUW-ZKxHHVjA9ROEdIZ6f8BUQ7',  // 3. Soumis à validation
    valides: '1Nrc8ngx2nqRxeK7TXGBdWL8AeZ0ssFqB'   // 4. Validés DGA
  },
  // Comptes autorisés à ouvrir la campagne (vue Siège, contrôle qualité, validation)
  ADMINS: ['l.maufrais@mlezi-maore.com'],
  SUIVI: 'Suivi RA',
  EXPORTS: 'Exports'
};
const HEAD = ['ra_id', 'Service', 'service_id', 'Secteur', 'Direction', 'Directeur', 'Rédacteur (élabore)', 'Statut', 'Dossier', 'Lien du brouillon',
  'Dernière action', 'Par (compte)', 'Date', 'Écarts aux sources', 'Champs repris non relus', 'file_id'];

/* ---------- Web app ---------- */
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle("Rapports d'activité – Mlezi Maore")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Rapports d'activité")
    .addItem('Vérifier l\'installation', 'setup')
    .addItem("Ouvrir l'outil", 'showLink')
    .addToUi();
}
function showLink() {
  const url = ScriptApp.getService().getUrl();
  const html = HtmlService.createHtmlOutput(url ? `<p style="font-family:Arial"><a href="${url}" target="_blank">Ouvrir l'outil des rapports d'activité</a></p>` :
    '<p style="font-family:Arial">La web app n\'est pas encore déployée : Déployer › Nouveau déploiement › Application Web.</p>').setWidth(380).setHeight(90);
  SpreadsheetApp.getUi().showModalDialog(html, "Rapports d'activité");
}
function setup() {
  Object.values(CFG.FOLDERS).forEach(id => DriveApp.getFolderById(id).getName());
  sheet_();
  return 'Installation vérifiée : dossiers accessibles, onglet « ' + CFG.SUIVI + ' » prêt.';
}

/* ---------- Utilitaires ---------- */
const me_ = () => Session.getActiveUser().getEmail() || '';
const isAdmin_ = () => CFG.ADMINS.map(s => s.toLowerCase()).indexOf(me_().toLowerCase()) >= 0;
function needAdmin_() { if (!isAdmin_()) throw new Error('Accès réservé au Siège (compte ' + (me_() || 'inconnu') + ').'); }
function folderKeyOf_(fileId) {
  const parents = DriveApp.getFileById(fileId).getParents();
  while (parents.hasNext()) { const id = parents.next().getId(); for (const k in CFG.FOLDERS) if (CFG.FOLDERS[k] === id) return k; }
  return '';
}
function sheet_() {
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  let sh = ss.getSheetByName(CFG.SUIVI);
  if (!sh) {
    sh = ss.insertSheet(CFG.SUIVI, 0);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#CC071E').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.hideColumns(HEAD.length);
  }
  return sh;
}
function rowOf_(sh, raId) {
  const n = sh.getLastRow(); if (n < 2) return 0;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === raId) return i + 2;
  return 0;
}
const FOLDER_LABEL = {modeles: '1. Modèles', encours: '2. En cours', soumis: '3. Soumis à validation', valides: '4. Validés DGA'};

/* Règle de classement : le statut décide, sauf le passage Modèles -> En cours, déclenché par la première modification */
function targetFolder_(br, action, currentKey) {
  if (br.statut === 'Validé') return 'valides';
  if (br.statut === 'Transmis au Siège' || br.statut === 'Contrôlé') return 'soumis';
  if (action === 'generation') return 'modeles';
  if (currentKey === 'modeles' && action !== 'saisie') return 'modeles';
  return 'encours';
}

/* ---------- API appelée par l'outil (google.script.run) ---------- */
function api_whoami() { return {email: me_(), admin: isAdmin_()}; }

function api_listBrouillons() {
  const out = [];
  Object.keys(CFG.FOLDERS).forEach(k => {
    const it = DriveApp.getFolderById(CFG.FOLDERS[k]).getFiles();
    while (it.hasNext()) {
      const f = it.next(); if (!/\.json$/i.test(f.getName())) continue;
      out.push({id: f.getId(), name: f.getName(), folder: FOLDER_LABEL[k], updated: f.getLastUpdated().toISOString()});
    }
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
function api_getFile(id) {
  const k = folderKeyOf_(id); if (!k) throw new Error('Fichier hors des dossiers des rapports d\'activité.');
  return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
}
function api_getAllBrouillons() {
  needAdmin_();
  return api_listBrouillons().map(f => ({name: f.name, text: DriveApp.getFileById(f.id).getBlob().getDataAsString('UTF-8')}));
}

function api_saveBrouillon(text, action, meta) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const br = JSON.parse(text);
    if (br.kind !== 'brouillon') throw new Error('Contenu inattendu : ce n\'est pas un brouillon.');
    if ((action === 'generation' || br.statut === 'Contrôlé' || br.statut === 'Validé') && !isAdmin_()) needAdmin_();
    const sh = sheet_(), row = rowOf_(sh, br.raId);
    const name = 'RA_' + br.annee + '_' + String(br.ra.libelle).replace(/[^\w\-]+/g, '_').slice(0, 60) + '.json';
    let file = null;
    const known = row ? sh.getRange(row, HEAD.length).getValue() : '';
    if (known) { try { file = DriveApp.getFileById(known); if (file.isTrashed()) file = null; } catch (e) { file = null; } }
    const cur = file ? folderKeyOf_(file.getId()) : '';
    const key = targetFolder_(br, action, cur);
    const folder = DriveApp.getFolderById(CFG.FOLDERS[key]);
    if (file) { file.setContent(text); if (cur !== key) file.moveTo(folder); file.setName(name); }
    else file = folder.createFile(name, text, 'application/json');
    const last = (br.journal || []).slice(-1)[0] || {};
    const values = [br.raId, br.ra.libelle, (br.ra.services || []).join(', '), br.ra.secteur || '', br.ra.direction || '', br.ra.directeur || '', br.ra.redacteur || '',
      br.statut, FOLDER_LABEL[key], file.getUrl(), (last.statut || '') + (last.commentaire ? ' – ' + last.commentaire : ''), me_(), new Date(),
      Object.keys(br.ecarts || {}).length, meta && meta.nonRelus != null ? meta.nonRelus : '', file.getId()];
    if (row) sh.getRange(row, 1, 1, values.length).setValues([values]); else sh.appendRow(values);
    return {id: file.getId(), folder: FOLDER_LABEL[key], url: file.getUrl()};
  } finally { lock.releaseLock(); }
}

/* Campagne : stockée à la racine du dossier 2026, sans les brouillons (qui vivent dans les sous-dossiers) */
function api_getCampagne() {
  needAdmin_();
  const it = DriveApp.getFolderById(CFG.ROOT_ID).getFiles(); let best = null;
  while (it.hasNext()) { const f = it.next(); if (/^Campagne_RA_\d{4}\.json$/.test(f.getName()) && (!best || f.getLastUpdated() > best.getLastUpdated())) best = f; }
  return best ? best.getBlob().getDataAsString('UTF-8') : null;
}
function api_saveCampagne(text) {
  needAdmin_();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const c = JSON.parse(text); const name = 'Campagne_RA_' + c.annee + '.json';
    const root = DriveApp.getFolderById(CFG.ROOT_ID), it = root.getFilesByName(name);
    if (it.hasNext()) it.next().setContent(text); else root.createFile(name, text, 'application/json');
    // une ligne par RA dans le suivi, y compris ceux qui n'ont pas encore de brouillon
    const sh = sheet_();
    (c.ras || []).forEach(ra => {
      const row = rowOf_(sh, ra.id);
      const base = [ra.id, ra.libelle, (ra.services || []).join(', '), ra.secteur || '', ra.direction || '', ra.directeur || '', ra.chef || ra.directeur || '', ra.statut];
      if (row) sh.getRange(row, 1, 1, base.length).setValues([base]);
      else sh.appendRow(base.concat(['', '', '', '', '', '', '', '']));
    });
    return 'ok';
  } finally { lock.releaseLock(); }
}
function api_saveExport(name, text) {
  needAdmin_();
  const root = DriveApp.getFolderById(CFG.ROOT_ID), it = root.getFoldersByName(CFG.EXPORTS);
  const folder = it.hasNext() ? it.next() : root.createFolder(CFG.EXPORTS);
  const f = folder.createFile(name, text, /\.csv$/i.test(name) ? 'text/csv' : 'application/json');
  return {url: f.getUrl(), folder: CFG.EXPORTS};
}
