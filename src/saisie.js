/* ==========================================================================
   Brouillon, saisie encadrée, traçabilité, vérification
   ========================================================================== */
const SEP = '|';
const getP = (o, p) => p.split(SEP).reduce((a, k) => (a == null ? undefined : a[k]), o);
function setP(o, p, v) { const ks = p.split(SEP); let a = o; ks.slice(0, -1).forEach(k => { if (a[k] == null) a[k] = {}; a = a[k]; }); a[ks[ks.length - 1]] = v; }
const eff = (br, p) => (p in br.ecarts) ? br.ecarts[p].value : getP(br.sources, p);

const LIMITS = {'intro|contexte': 2500, 'intro|historique': 2500, 'missions': 2500, 'public|texte': 2500, 'activites|texte': 3000, 'rh|formations': 1500,
  'partenariats|texte': 2000, 'qualite|fei_analyse': 1000, 'bilan|commentaire': 1500, 'qualitatif': 3000, 'conclusion|bilan': 2500, 'avis': 500};
const TABLES = {
  'intro|cadre': [['annee', 'Année', 'text', 70], ['texte', 'Texte de référence'], ['apport', 'Apport clé']],
  'public|ages': [['tranche', "Tranche d'âge"], ['nb', 'Nombre', 'num', 90]],
  'activites|tableau': [['activite', 'Activité'], ['participants', 'Participants', 'text', 110], ['objectifs', 'Objectifs']],
  'rh|tableau': [['fonction', 'Fonction'], ['etp_bud', 'ETP budgétés', 'num', 110], ['etp_reel', 'ETP réels', 'num', 110]],
  'partenariats|tableau': [['partenaire', 'Partenaire'], ['type', 'Type', 'text', 120], ['nature', 'Nature des actions'], ['conv', 'Conventionné', ['', 'oui', 'non'], 100]],
  'qualite|cvs': [['date', 'Date', 'text', 100], ['participants', 'Participants'], ['sujets', 'Sujets traités']],
  'bilan|complementaires': [['indicateur', 'Indicateur'], ['valeur', 'Valeur', 'text', 110], ['commentaire', 'Commentaire']],
  'conclusion|suivi': [['objectif', 'Objectif fixé dans le RA N-1'], ['realisation', 'Réalisation', ['', 'Atteint', 'Partiel', 'Non atteint', 'Reporté'], 130], ['commentaire', 'Commentaire']],
  'conclusion|perspectives': [['objectif', 'Objectif'], ['actions', 'Actions'], ['echeance', 'Échéance', 'text', 100], ['indicateur', 'Indicateur de suivi']]
};
const MODULES = [
  [ra => /ditep|dime/i.test(ra.libelle), 'DITEP / DIME – activité par modalité', ['File active – internat', 'File active – semi-internat / accueil de jour', 'File active – ambulatoire', 'Bascules entre modalités']],
  [ra => /camsp/i.test(ra.libelle), 'CAMSP – actes, orienteurs, communes, sorties', ["Nombre d'actes", 'Principaux orienteurs', 'Communes de résidence', 'Sorties et orientations']],
  [ra => /\bime\b|sessad|ueea/i.test(ra.libelle), 'IME / SESSAD / UEEA – scolarité', ['Enfants scolarisés en milieu ordinaire', "Enfants en unité d'enseignement", 'Temps de scolarisation hebdomadaire moyen', 'Enfants sans scolarisation']],
  [ra => /\bgem\b/i.test(ra.libelle), 'GEM – exigences du cahier des charges', ["Nombre d'adhérents", "Jours d'ouverture", 'Activités décidées par les adhérents', 'Association marraine']],
  [ra => /hla|h[ée]bergement/i.test(ra.secteur + ' ' + ra.direction), 'HLA – séjours et sorties', ['Durée moyenne de séjour (jours)', 'Sorties vers un logement autonome', 'Sorties vers un autre hébergement', 'Autres motifs de sortie']]
];
const moduleFor = ra => MODULES.find(m => m[0](ra)) || null;

function emptySaisie() {
  const mvt = () => ({debut: '', entrees: '', sorties: '', fin: ''});
  return {intro: {contexte: '', historique: '', cadre: []},
    ident: {adresse: '', telephone: '', mail: '', date_arrete: '', date_ouverture: '', nb_beneficiaires: '', etp_bp: '', financeurs: '', horaires: ''},
    missions: '', public: {texte: '', femmes: '', hommes: '', ages: []}, activites: {texte: '', tableau: []},
    rh: {tableau: [], mvt: mvt(), formations: ''}, partenariats: {tableau: [], texte: ''}, qualite: {cvs: [], fei_analyse: ''},
    bilan: {mvt: mvt(), commentaire: '', complementaires: []}, qualitatif: '', conclusion: {bilan: '', perspectives: [], suivi: []}, annexes: [], avis: ''};
}

async function buildBrouillon(ra) {
  const c = S.camp, N = c.annee;
  const blocks = sheetsForRA(ra, 'N').map(sh => {
    const b = {sheet: sh.name, file: sh.file, code: sh.code || '', libelle: sh.libelle, params: sh.params, missing: sh.missing};
    ['jours', 'theorique', 'previsionnel', 'realise', 'facturation', 'file_active'].forEach(k => { if (sh.lines[k]) b[k] = sh.lines[k]; });
    return b;
  });
  const n1 = sheetsForRA(ra, 'N1').map(sh => ({sheet: sh.name, code: sh.code || '', libelle: sh.libelle,
    theorique: sh.lines.theorique ? sum(sh.lines.theorique) : null, realise: sh.lines.realise ? sum(sh.lines.realise) : null}));
  const cap = blocks.map(b => num(b.params.places)).filter(x => x != null);
  const regVals = ra.esms ? clone(c.registre[ra.id] || {}) : null;
  if (regVals) outilsFor(ra).forEach(o => { regVals[o.k] = Object.assign({commentaire: ''}, regVals[o.k] || {}); OUTIL_FIELDS[o.type].forEach(([f]) => { if (regVals[o.k][f] == null) regVals[o.k][f] = ''; }); });
  const sources = {
    identite: {service: ra.libelle, secteur: ra.secteur, direction: ra.direction, directeur: ra.directeur, chef_de_service: ra.chef,
      esms: ra.esms ? 'Oui' : 'Non', finess: ra.finess, sites: ra.sites, communes: ra.communes, capacite: cap.length ? sum(cap) : null},
    activiteImportee: !!c.activite.N, activite: blocks, activiteN1: n1, activiteN1Importee: !!c.activite.N1,
    fei: feiAgg(ra, N),
    registre: ra.esms ? {outils: outilsFor(ra), values: regVals, cvs_obligatoire: !!ra.cvs_obligatoire} : null,
    organigramme: orgaForRA(ra)
  };
  const br = {schemaVersion: SCHEMA, kind: 'brouillon', annee: N, raId: ra.id,
    ra: {id: ra.id, libelle: ra.libelle, services: ra.services, secteur: ra.secteur, direction: ra.direction, directeur: ra.directeur, chef: ra.chef, redacteur: redacteur(ra), esms: ra.esms, smjpm: !!ra.smjpm, cvs_obligatoire: !!ra.cvs_obligatoire},
    params: clone(c.params), logos: clone(c.logos), sources, sourceHash: await hashOf(sources),
    saisie: emptySaisie(), ecarts: {}, statut: ra.statut, journal: clone(ra.journal), createdAt: nowISO()};
  applyReprise(br, ra);
  return br;
}

/* ---------- Reprise du RA N-1 validé ---------- */
const REPRISE_SCHEMA = 'ra-mlezi-reprise/1';
const REPRIS_LABELS = {'intro|historique': 'Historique du service', 'missions': 'Missions et objectifs', 'public|texte': "Public cible et modalités d'accès", 'intro|cadre': 'Cadre légal',
  'partenariats|tableau': 'Tableau des partenaires', 'ident|adresse': 'Adresse', 'ident|telephone': 'Téléphone', 'ident|mail': 'Mail', 'ident|date_arrete': "Date de l'arrêté d'autorisation",
  'ident|financeurs': 'Financeurs', 'ident|horaires': "Jours et horaires d'ouverture", 'conclusion|suivi': 'Objectifs fixés dans le RA N-1'};
function repriseFor(ra) {
  const R = S.camp?.reprise; if (!R) return null;
  const seen = new Set(), es = [];
  ra.services.forEach(sid => { const e = R.services[sid]; if (!e) return; const k = e.sources.map(x => x.fid).join(); if (!seen.has(k)) { seen.add(k); es.push([sid, e]); } });
  if (!es.length) return null;
  const multi = es.length > 1, pre = sid => multi ? `[${R.services[sid].service}]\n` : '';
  const txt = k => es.filter(([, e]) => String(e[k] || '').trim()).map(([sid, e]) => pre(sid) + e[k]).join('\n\n');
  const ident = {}; es.forEach(([, e]) => Object.entries(e.ident || {}).forEach(([k, v]) => { if (!(k in ident)) ident[k] = v; }));
  return {annee: R.annee_source, historique: txt('historique'), missions: txt('missions'), public: txt('public'), contexte: txt('contexte_brouillon'), ident,
    cadre: es.flatMap(([, e]) => e.cadre || []), partenaires: es.flatMap(([, e]) => e.partenaires || []), perspectives: es.flatMap(([, e]) => e.perspectives || []),
    sources: es.flatMap(([, e]) => e.sources.map(x => x.titre + (x.statut_cartouche ? ` (statut : ${x.statut_cartouche})` : '')))};
}
function applyReprise(br, ra) {
  const r = repriseFor(ra); br.repris = {}; if (!r) return;
  const s = br.saisie, mark = p => { br.repris[p] = {relu: false}; };
  if (r.historique) { s.intro.historique = r.historique; mark('intro|historique'); }
  if (r.missions) { s.missions = r.missions; mark('missions'); }
  if (r.public) { s.public.texte = r.public; mark('public|texte'); }
  if (r.cadre.length) { s.intro.cadre = r.cadre.map(c => ({annee: c.annee || '', texte: c.texte || '', apport: c.apport || ''})); mark('intro|cadre'); }
  if (r.partenaires.length) { s.partenariats.tableau = r.partenaires.map(p => ({partenaire: p.partenaire || '', type: p.type || '', nature: p.nature || '', conv: p.conv || ''})); mark('partenariats|tableau'); }
  ['adresse', 'telephone', 'mail', 'date_arrete', 'financeurs', 'horaires'].forEach(k => { if (r.ident[k]) { s.ident[k] = r.ident[k]; mark('ident|' + k); } });
  if (r.perspectives.length) { s.conclusion.suivi = r.perspectives.map(o => ({objectif: o, realisation: '', commentaire: ''})); mark('conclusion|suivi'); }
  br.repriseInfo = {annee: r.annee, sources: r.sources, contexte: r.contexte || ''};
}
function normalizeBr(br) {
  if (!br) return; br.repris = br.repris || {};
  if (br.saisie && br.saisie.conclusion && !br.saisie.conclusion.suivi) br.saisie.conclusion.suivi = [];
}
const reprisBadge = p => { const r = S.br.repris?.[p]; if (!r) return '';
  return `<div class="repris ${r.relu ? 'ok' : ''}">Repris du RA ${S.br.repriseInfo?.annee || S.br.annee - 1} – ${r.relu ? 'relu' : 'à relire'} <label><input type="checkbox" data-relu="${p}" ${r.relu ? 'checked' : ''}> Relu et à jour</label></div>`; };

/* ---------- Statuts ---------- */
function setStatut(br, statut, actor, comment) {
  addJournal(br, statut, actor, comment);
  if (S.camp) { const ra = getRA(br.raId); if (ra) { ra.statut = statut; ra.journal = clone(br.journal); } }
  autosave();
}

/* ---------- Vérifier ---------- */
const YEAR_EXEMPT = /(loi|d[ée]cret|arr[êe]t[ée]|ordonnance|circulaire|code|art\.?|article)\b[^.;\n]{0,40}$/i;
function yearIssues(text, N) {
  const bad = new Set(); const re = /\b(19|20)\d{2}\b/g; let m;
  while ((m = re.exec(text))) { const y = +m[0]; if (y >= N - 1 && y <= N + 1) continue; if (YEAR_EXEMPT.test(text.slice(Math.max(0, m.index - 60), m.index))) continue; bad.add(y); }
  return [...bad];
}
function blockEff(br, i) {
  const b = br.sources.activite[i], o = {};
  ['jours', 'theorique', 'previsionnel', 'realise', 'facturation', 'file_active'].forEach(k => { if (b[k]) o[k] = b[k].map((_, m) => eff(br, `activite${SEP}${i}${SEP}${k}${SEP}${m}`)); });
  return o;
}
function verify(br) {
  const out = [], N = br.annee, s = br.saisie;
  const add = (lvl, sec, msg) => out.push({lvl, sec, msg});
  const req = [['intro|contexte', 'Introduction', 'Contexte national et local'], ['intro|historique', 'Introduction', 'Historique du service'], ['ident|adresse', 'I.1', 'Adresse'],
    ['missions', 'I.2', 'Missions et objectifs'], ['public|texte', 'I.3', 'Public cible et modalités d\'accès'], ['activites|texte', 'II.1', 'Activités et prestations réalisées'],
    ['bilan|commentaire', 'III.1', "Commentaire d'analyse"], ['qualitatif', 'III.2', 'Bilan qualitatif'], ['conclusion|bilan', 'IV.1', "Bilan général de l'année"]];
  req.forEach(([p, sec, l]) => { if (!String(getP(s, p) || '').trim()) add('bloquant', sec, `« ${l} » est vide.`); });
  if (!(s.rh.tableau || []).some(r => String(r.fonction || '').trim())) add('bloquant', 'II.2', 'Le tableau des ETP par fonction est vide.');
  if (!(s.conclusion.perspectives || []).some(r => String(r.objectif || '').trim())) add('bloquant', 'IV.2', 'Aucune perspective saisie.');
  const fei = br.sources.fei; if (fei?.imported && num(eff(br, 'fei|n')) > 0 && !s.qualite.fei_analyse.trim()) add('bloquant', 'II.4', 'Analyse des événements indésirables vide.');
  if (['bilan|mvt'].some(p => Object.values(getP(s, p)).some(v => v === ''))) add('bloquant', 'III.1', 'Tableau des mouvements des personnes accompagnées incomplet.');
  Object.entries(LIMITS).forEach(([p, max]) => { const v = String(getP(s, p) || ''); if (v.length > max) add('bloquant', p, `Texte trop long (${v.length} / ${max} caractères) : ${p.replace(SEP, ' › ')}.`); });
  if (br.sources.registre) Object.entries(br.sources.registre.values).forEach(([k]) => { const c = String(eff(br, `registre${SEP}values${SEP}${k}${SEP}commentaire`) || ''); if (c.length > 300) add('bloquant', 'II.4', `Commentaire 2002-2 trop long (${k}).`); });

  // années
  const texts = [['intro|contexte', 'Introduction'], ['missions', 'I.2'], ['public|texte', 'I.3'], ['activites|texte', 'II.1'], ['rh|formations', 'II.2'], ['partenariats|texte', 'II.3'],
    ['qualite|fei_analyse', 'II.4'], ['bilan|commentaire', 'III.1'], ['qualitatif', 'III.2'], ['conclusion|bilan', 'IV.1']];
  texts.forEach(([p, sec]) => { const y = yearIssues(String(getP(s, p) || ''), N); if (y.length) add('alerte', sec, `Année(s) incohérente(s) avec un RA ${N} : ${y.join(', ')}.`); });
  ['activites|tableau', 'conclusion|perspectives', 'qualite|cvs'].forEach(p => { const y = yearIssues((getP(s, p) || []).map(r => Object.values(r).join(' ')).join(' '), N); if (y.length) add('alerte', p.split(SEP)[0], `Année(s) incohérente(s) dans le tableau : ${y.join(', ')}.`); });

  // mouvements
  const mv = (o, sec, lab) => { const [a, e, so, f] = ['debut', 'entrees', 'sorties', 'fin'].map(k => num(o[k])); if ([a, e, so, f].every(x => x != null) && a + e - so !== f) add('alerte', sec, `${lab} : ${a} + ${e} − ${so} = ${a + e - so}, mais ${f} présents au 31/12.`); };
  mv(s.rh.mvt, 'II.2', 'Mouvements du personnel'); mv(s.bilan.mvt, 'III.1', 'Mouvements des personnes accompagnées');
  // ETP
  const bud = sum(s.rh.tableau.map(r => r.etp_bud)), reel = sum(s.rh.tableau.map(r => r.etp_reel));
  if (bud > 0 && Math.abs(reel - bud) / bud > 0.10) add('alerte', 'II.2', `ETP réels (${fmt(reel, 2)}) éloignés de plus de 10 % des ETP budgétés (${fmt(bud, 2)}).`);
  const bp = num(s.ident.etp_bp); if (bp != null && bud > 0 && Math.abs(bp - bud) > 0.01) add('alerte', 'I.1 / II.2', `ETP budgétés au BP${N} (${fmt(bp, 2)}) ≠ total du tableau des ETP (${fmt(bud, 2)}).`);
  // activité
  if (!br.sources.activiteImportee) add('alerte', 'III.1', `Classeur d'activité ${N} non importé par le Siège.`);
  else if (!br.sources.activite.length) add('alerte', 'III.1', `Aucun onglet du suivi d'activité ${N} rattaché à ce RA.`);
  const ouv = parseLooseDate(s.ident.date_ouverture);
  br.sources.activite.forEach((b, i) => {
    const e = blockEff(br, i), lab = b.libelle || b.sheet;
    if (b.missing?.length) add('alerte', 'III.1', `${lab} : mois manquants dans le classeur (${b.missing.map(m => MOIS[m]).join(', ')}).`);
    if (!e.theorique || !e.realise) { add('alerte', 'III.1', `${lab} : ligne « volume théorique » ou « réalisé » introuvable.`); return; }
    for (let m = 0; m < 12; m++) {
      const t = num(e.theorique[m]) || 0, r = num(e.realise[m]) || 0;
      if (t === 0 && r > 0) add('alerte', 'III.1', `${lab}, ${MOIS[m]} : activité sur un mois sans activité théorique.`);
      else if (t > 0 && r === 0 && e.realise[m] !== null) add('alerte', 'III.1', `${lab}, ${MOIS[m]} : aucune activité réalisée.`);
      else if (t > 0 && r / t > 1.2) add('alerte', 'III.1', `${lab}, ${MOIS[m]} : taux d'occupation de ${pct(r / t)} (> 120 %).`);
      if (ouv && ouv.getFullYear() === N && m < ouv.getMonth() && r > 0) add('alerte', 'III.1', `${lab}, ${MOIS[m]} : activité réalisée avant la date d'ouverture (${s.ident.date_ouverture}).`);
    }
  });
  // 2002-2
  if (br.sources.registre) br.sources.registre.outils.forEach(o => {
    const st = outilStatut(o, regEff(br, o.k), br.ra, N);
    if (['À réviser', 'À renouveler', 'Absent'].includes(st.s)) add('alerte', 'II.4', `Outil 2002-2 « ${o.label} » : ${st.s}${st.why ? ' (' + st.why + ')' : ''}.`);
  });
  // écarts
  const ec = Object.values(br.ecarts);
  if (ec.length) add('info', 'Écarts', `${ec.length} donnée(s) pré-remplie(s) modifiée(s).`);
  ec.filter(e => !String(e.motif || '').trim()).forEach(e => add('bloquant', 'Écarts', `Modification sans motif : ${e.label || ''}.`));
  Object.entries(br.repris || {}).filter(([, r]) => !r.relu).forEach(([p]) => add('alerte', 'Reprise N-1', `Champ repris du RA ${br.repriseInfo?.annee || N - 1} non relu : ${REPRIS_LABELS[p] || p}.`));
  // pièces
  if (!br.sources.organigramme) add('alerte', 'II.2', 'Organigramme absent : aucun organigramme rattaché par le Siège.');
  if (!fei?.imported) add('alerte', 'II.4', 'Export FEI manquant : aucune donnée Ageval chargée par le Siège.');
  else if (fei.n === 0) add('alerte', 'II.4', `0 FEI en ${N} : vraie absence d'événement ou service qui ne déclare pas ?`);
  if (!br.logos?.mlezi) add('alerte', 'Charte', 'Logo combiné Mlezi Maore + GROUPE SOS non chargé dans la campagne.');
  return out;
}
const regEff = (br, k) => { const v = {}; const src = br.sources.registre.values[k] || {}; Object.keys(src).forEach(f => v[f] = eff(br, `registre${SEP}values${SEP}${k}${SEP}${f}`)); return v; };

/* ---------- Rendu de la saisie ---------- */
function tx(p, label, o = {}) {
  const v = getP(S.br.saisie, p) || '', max = LIMITS[p], ro = o.ro ? 'readonly' : '';
  return `<div class="fld"><label class="${o.req ? 'req' : ''}">${esc(label)}</label>${o.help ? `<div class="muted">${o.help}</div>` : ''}${reprisBadge(p)}
    <textarea data-s="${p}" rows="${o.rows || 6}" ${ro}>${esc(v)}</textarea>${max ? `<div class="cnt ${v.length > max ? 'over' : ''}" data-cnt="${p}">${v.length} / ${max}</div>` : ''}</div>`;
}
function inp(p, label, o = {}) {
  return `<div class="fld"><label class="${o.req ? 'req' : ''}">${esc(label)}</label>${reprisBadge(p)}<input type="text" data-s="${p}" value="${esc(getP(S.br.saisie, p) ?? '')}" placeholder="${esc(o.ph || '')}"></div>`;
}
function pfv(p, o = {}) { // champ pré-rempli compact
  const br = S.br, src = getP(br.sources, p), e = br.ecarts[p], v = e ? e.value : src;
  const tip = e ? `Valeur source : ${src ?? '—'} | Valeur saisie : ${v ?? '—'} | Motif : ${e.motif} | ${frDateTime(e.date)}` : `Source : ${o.src || ''}`;
  const attrs = `data-p="${esc(p)}" data-label="${esc(o.label || p)}" data-sec="${esc(o.sec || '')}" ${o.num ? 'data-num="1"' : ''} title="${esc(tip)}" class="pref ${e ? 'mod' : ''}"`;
  const field = o.options ? `<select ${attrs}>${o.options.map(x => `<option ${String(x) === String(v ?? '') ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`
    : `<input type="text" ${attrs} value="${esc(v == null ? '' : (o.num ? String(v).replace('.', ',') : v))}" ${o.w ? `style="width:${o.w}px"` : ''}>`;
  return field + (e ? `<span class="mark" title="${esc(tip)}"> ✎</span>` : '');
}
const pf = (p, label, o = {}) => `<div class="fld"><label>${esc(label)}<span class="src">${esc(o.src || '')}</span></label>${pfv(p, {...o, label})}</div>`;
function tbl(p) {
  const def = TABLES[p], rows = getP(S.br.saisie, p) || [];
  return `${reprisBadge(p)}<table class="t t-edit"><thead><tr>${def.map(c => `<th ${c[3] ? `style="width:${c[3]}px"` : ''}>${esc(c[1])}</th>`).join('')}<th style="width:30px"></th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr>${def.map(([k, , t]) => `<td>${Array.isArray(t) ? `<select data-tc="${p}" data-i="${i}" data-k="${k}">${t.map(x => `<option ${x === r[k] ? 'selected' : ''}>${x}</option>`).join('')}</select>`
      : `<input type="text" data-tc="${p}" data-i="${i}" data-k="${k}" value="${esc(r[k] ?? '')}">`}</td>`).join('')}<td><button class="btn sm ghost" data-del="${p}" data-i="${i}" title="Supprimer la ligne">✕</button></td></tr>`).join('')}
    </tbody></table><button class="btn sm sec" data-add="${p}">+ Ajouter une ligne</button>`;
}
function mvtFields(p, lab) {
  return `<h3>${esc(lab)}</h3><table class="t t-edit"><thead><tr><th>Présents au 01/01/${S.br.annee}</th><th>Entrées</th><th>Sorties</th><th>Présents au 31/12/${S.br.annee}</th></tr></thead>
    <tbody><tr>${['debut', 'entrees', 'sorties', 'fin'].map(k => `<td><input type="text" data-s="${p}${SEP}${k}" value="${esc(getP(S.br.saisie, p + SEP + k) ?? '')}"></td>`).join('')}</tr></tbody></table>
    <div class="muted">Effectifs à date uniquement (nombres), jamais de liste nominative.</div>`;
}
const SRC_ACT = () => `Suivi d'activité ${S.br.annee}`;

function activityEditor() {
  const br = S.br, N = br.annee, bl = br.sources.activite;
  if (!bl.length) return `<div class="warnbox">Aucune donnée du suivi d'activité ${N} n'est rattachée à ce RA. Le Siège doit importer le classeur et rattacher l'onglet du dispositif.</div>`;
  return bl.map((b, i) => {
    const e = blockEff(br, i); const rows = ['theorique', 'previsionnel', 'realise', 'file_active'].filter(k => b[k]);
    const prm = b.params || {};
    return `<div class="card"><h3>${esc(b.libelle)} <span class="chip">${esc(b.code)}</span> <span class="muted">onglet « ${esc(b.sheet)} »</span></h3>
      <div class="muted">${prm.places != null ? `${esc(prm.places_label || 'Places')} : ${fmt(num(prm.places), 1)} · ` : ''}${prm.prix != null ? `Prix journalier : ${fmt(num(prm.prix), 2)} € · ` : ''}${prm.jours_cible != null ? `Jours d'ouverture cible : ${fmt(num(prm.jours_cible))} · ` : ''}${prm.financeur ? esc(prm.financeur) : ''}</div>
      <div style="overflow:auto"><table class="t t-edit small"><thead><tr><th></th>${MOIS.map(m => `<th class="n">${m}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>
      ${rows.map(k => `<tr><td><b>${LINE_LABELS[k]}</b></td>${b[k].map((_, m) => `<td>${pfv(`activite${SEP}${i}${SEP}${k}${SEP}${m}`, {num: true, w: 62, src: SRC_ACT(), sec: 'III.1', label: `${b.libelle} – ${LINE_LABELS[k]} – ${MOIS[m]}`})}</td>`).join('')}<td class="n"><b>${fmt(sum(e[k]))}</b></td></tr>`).join('')}
      ${e.theorique && e.realise ? `<tr><td><b>Taux d'occupation</b><div class="muted">réalisé / théorique</div></td>${e.realise.map((r, m) => `<td class="n">${num(e.theorique[m]) ? pct(num(r) / num(e.theorique[m])) : '—'}</td>`).join('')}<td class="n"><b>${sum(e.theorique) ? pct(sum(e.realise) / sum(e.theorique)) : '—'}</b></td></tr>` : ''}
      </tbody></table></div></div>`;
  }).join('');
}
function feiEditor() {
  const br = S.br, f = br.sources.fei, N = br.annee;
  if (!f?.imported) return `<div class="warnbox">Le Siège n'a pas chargé l'export FEI réduit d'Ageval.</div>`;
  const P = k => `fei${SEP}${k}`;
  const kv = (obj, base, lab) => `<table class="t t-edit small"><thead><tr><th>${lab}</th><th class="n" style="width:110px">Nb</th></tr></thead><tbody>${Object.keys(obj).map(k => `<tr><td>${esc(k)}</td><td>${pfv(P(base + SEP + k), {num: true, w: 80, src: 'Ageval', sec: 'II.4', label: `FEI – ${lab} – ${k}`})}</td></tr>`).join('')}</tbody></table>`;
  return `<div class="grid">
    ${pf(P('n'), `FEI déclarées en ${N}`, {num: true, src: 'Ageval', sec: 'II.4'})}
    ${f.nN1 != null ? pf(P('nN1'), `FEI déclarées en ${N - 1}`, {num: true, src: 'Ageval', sec: 'II.4'}) : ''}
    ${pf(P('delai'), 'Délai moyen de traitement (jours)', {num: true, src: 'Ageval', sec: 'II.4'})}
    ${pf(P('declN'), 'Déclarations obligatoires', {num: true, src: 'Ageval', sec: 'II.4'})}</div>
    ${f.n >= 3 ? `<div class="grid">${kv(f.cats, 'cats', 'Catégorie')}${kv(f.grav, 'grav', 'Gravité')}${kv(f.avancement, 'avancement', 'Avancement')}</div>
    <div class="muted">Une FEI peut relever de plusieurs catégories : le total des catégories peut dépasser le nombre de FEI.</div>` : `<div class="muted">Moins de 3 FEI : seul le total figure dans le rapport, sans ventilation.</div>`}
    ${Object.keys(f.autorites).length ? `<div class="muted">Autorités destinataires : ${Object.entries(f.autorites).map(([k, v]) => `${esc(k)} (${v})`).join(', ')}</div>` : ''}
    ${tx('qualite|fei_analyse', 'Analyse des événements indésirables', {req: num(eff(br, 'fei|n')) > 0, rows: 4})}`;
}
function registreEditor() {
  const br = S.br, R = br.sources.registre, N = br.annee;
  return `<div class="muted">CVS obligatoire pour ce service : <b>${R.cvs_obligatoire ? 'oui' : 'non'}</b> (paramètre fixé par le Siège). Le statut est calculé, jamais saisi.</div>
  <table class="t t-edit small"><thead><tr><th>Outil</th><th>Situation au 31/12/${N}</th><th style="width:110px">Statut</th><th>Commentaire (300 car.)</th></tr></thead><tbody>
  ${R.outils.map(o => { const base = `registre${SEP}values${SEP}${o.k}`; const st = outilStatut(o, regEff(br, o.k), br.ra, N);
    return `<tr><td><b>${esc(o.label)}</b><div class="muted">${esc(o.base)}</div></td>
      <td>${OUTIL_FIELDS[o.type].map(([f, l, opts]) => `<div class="small">${esc(l.replace(' en N', ' en ' + N))} ${pfv(base + SEP + f, {options: opts, src: 'Registre 2002-2', sec: 'II.4', label: `${o.label} – ${l}`, w: 120})}</div>`).join('')}</td>
      <td><span class="badge ${st.s === 'À jour' ? 'b-ctrl' : st.s === 'Sans objet' ? 'b-lancer' : 'b-corr'}">${st.s}</span>${st.why ? `<div class="muted">${esc(st.why)}</div>` : ''}</td>
      <td>${pfv(base + SEP + 'commentaire', {src: 'Registre 2002-2', sec: 'II.4', label: `${o.label} – commentaire`})}</td></tr>`; }).join('')}
  </tbody></table>`;
}
function saisieSections() {
  const br = S.br, N = br.annee, I = br.sources.identite, mod = moduleFor(br.ra);
  const P = k => `identite${SEP}${k}`, src = 'Référentiel';
  return [
    ['intro', 'Introduction', null, `${br.repriseInfo?.contexte ? `<details class="card"><summary>Contexte rédigé dans le RA ${br.repriseInfo.annee} (pour mémoire)</summary><div class="small" style="white-space:pre-wrap">${esc(br.repriseInfo.contexte)}</div>${br.saisie.intro.contexte.trim() ? '' : '<button class="btn sm sec" data-insctx="1">Utiliser comme point de départ</button>'}</details>` : ''}${tx('intro|contexte', 'Contexte national et local', {req: true})}${tx('intro|historique', 'Historique du service', {req: true, help: 'Les années citées ici ne sont pas contrôlées.'})}
      <h3>Cadre légal <span class="muted">(facultatif – années non contrôlées)</span></h3>${tbl('intro|cadre')}`],
    ['i', 'I. Présentation du service', null, ''],
    ['i1', '1. Informations principales', 1, `<div class="grid">${['service', 'secteur', 'direction', 'directeur', 'chef_de_service', 'esms', 'finess', 'sites', 'communes'].map(k => pf(P(k), {service: 'Service', secteur: 'Secteur', direction: 'Direction', directeur: 'Directeur', chef_de_service: 'Chef de service', esms: 'ESMS', finess: 'FINESS', sites: 'Sites', communes: 'Communes'}[k], {src, sec: 'I.1'})).join('')}
      ${pf(P('capacite'), 'Capacité', {num: true, src: SRC_ACT(), sec: 'I.1'})}</div>
      <div class="grid">${inp('ident|adresse', 'Adresse', {req: true})}${inp('ident|telephone', 'Téléphone')}${inp('ident|mail', 'Mail')}${inp('ident|date_arrete', "Date de l'arrêté d'autorisation", {ph: 'JJ/MM/AAAA'})}
      ${inp('ident|date_ouverture', "Date d'ouverture", {ph: 'JJ/MM/AAAA'})}${inp('ident|nb_beneficiaires', 'Nombre de bénéficiaires')}${inp('ident|etp_bp', `ETP budgétés au BP${N}`)}${inp('ident|financeurs', 'Financeurs')}${inp('ident|horaires', "Jours et horaires d'ouverture")}</div>`],
    ['i2', '2. Missions et objectifs', 1, tx('missions', 'Missions et objectifs', {req: true})],
    ['i3', "3. Public cible et modalités d'accès", 1, `${tx('public|texte', "Public cible et modalités d'accès", {req: true})}
      <h3>Répartition par sexe <span class="muted">(facultatif)</span></h3><div class="grid">${inp('public|femmes', 'Femmes / filles')}${inp('public|hommes', 'Hommes / garçons')}</div>
      <h3>Répartition par tranche d'âge <span class="muted">(facultatif)</span></h3>${tbl('public|ages')}`],
    ['ii', 'II. Fonctionnement du service', null, ''],
    ['ii1', '1. Activités et prestations réalisées', 1, `${tx('activites|texte', 'Activités et prestations réalisées', {req: true})}<h3>Tableau des activités <span class="muted">(facultatif)</span></h3>${tbl('activites|tableau')}`],
    ['ii2', '2. Organisation du service – Ressources humaines', 1, `${br.sources.organigramme ? `<img src="${br.sources.organigramme.data}" style="max-width:100%;max-height:420px;border:1px solid var(--bord)"><div class="muted">Organigramme du service au ${frDate(br.sources.organigramme.date)} (source : intranet)</div>` : `<div class="warnbox">Aucun organigramme rattaché par le Siège.</div>`}
      <h3 class="req">ETP par fonction</h3>${tbl('rh|tableau')}<div class="muted">Total : ${fmt(sum(br.saisie.rh.tableau.map(r => r.etp_bud)), 2)} ETP budgétés · ${fmt(sum(br.saisie.rh.tableau.map(r => r.etp_reel)), 2)} ETP réels</div>
      ${mvtFields('rh|mvt', 'Mouvements du personnel')}${tx('rh|formations', 'Formations', {rows: 4})}`],
    ['ii3', '3. Partenariats et communication', 1, `<div class="muted">Sous-section facultative : supprimée du rapport si elle reste vide.</div>${tbl('partenariats|tableau')}${tx('partenariats|texte', 'Partenariats et communication', {rows: 4})}`],
    ['ii4', '4. Démarche qualité', 1, `${br.sources.registre ? `<h3>Outils de la loi 2002-2</h3>${registreEditor()}` : ''}
      <h3>CVS et groupes d'expression <span class="muted">(facultatif)</span></h3>${tbl('qualite|cvs')}
      <h3>Bilan des événements indésirables</h3>${feiEditor()}`],
    ['iii', `III. Bilan de l'activité ${N}`, null, ''],
    ['iii1', '1. Bilan quantitatif', 1, `${activityEditor()}${mvtFields('bilan|mvt', 'Mouvements des personnes accompagnées')}
      ${tx('bilan|commentaire', "Commentaire d'analyse", {req: true, rows: 5})}
      ${mod ? `<h3>Module complémentaire : ${esc(mod[1])} <span class="muted">(facultatif)</span></h3>${!br.saisie.bilan.complementaires.length ? `<button class="btn sm ghost" data-modfill="1">Insérer les indicateurs types</button> ` : ''}${tbl('bilan|complementaires')}` : `<h3>Indicateurs complémentaires <span class="muted">(facultatif)</span></h3>${tbl('bilan|complementaires')}`}`],
    ['iii2', '2. Bilan qualitatif', 1, tx('qualitatif', 'Bilan qualitatif', {req: true, rows: 10})],
    ['iv', `IV. Conclusion et perspectives ${N + 1}`, null, ''],
    ['iv1', `1. Bilan général de l'année ${N}`, 1, `${tx('conclusion|bilan', `Bilan général de l'année ${N}`, {req: true})}
      <h3>Suivi des perspectives fixées dans le RA ${N - 1} <span class="muted">(facultatif – imprimé seulement si une réalisation est renseignée)</span></h3>${tbl('conclusion|suivi')}`],
    ['iv2', `2. Perspectives pour ${N + 1}`, 1, `<h3 class="req">Objectifs</h3>${tbl('conclusion|perspectives')}`],
    ['ann', 'Annexes', null, `<div class="muted">Images légendées, 6 au maximum (facultatif).</div>
      ${br.saisie.annexes.map((a, i) => `<div class="card row"><img src="${a.data}" style="height:80px"><div style="flex:1"><input type="text" data-tc="annexes" data-i="${i}" data-k="legende" value="${esc(a.legende)}" placeholder="Légende"></div><button class="btn sm ghost" data-del="annexes" data-i="${i}">✕</button></div>`).join('')}
      ${br.saisie.annexes.length < 6 ? `<label class="btn sm sec">+ Ajouter une image<input type="file" accept="image/*" data-annex="1" hidden></label>` : ''}`]
  ];
}
function completude() {
  const iss = verify(S.br); const bloq = iss.filter(i => i.lvl === 'bloquant').length;
  const total = 13; return {pct: Math.max(0, Math.round(100 * (total - Math.min(total, bloq)) / total)), bloq, iss};
}
