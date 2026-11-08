/* ==========================================================================
   Vues : Campagne, Saisie, Contrôle qualité, Aperçu — et événements
   ========================================================================== */
function render() {
  normalizeBr(S.br);
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === S.view));
  const lg = S.camp?.logos?.mlezi || S.br?.logos?.mlezi;
  $('#hdrLogo').innerHTML = lg ? `<img src="${lg}" alt="Mlezi Maore – GROUPE SOS">` : '<b style="color:var(--rouge)">MLEZI MAORE</b>';
  $('#hdrCtx').textContent = [S.camp ? `Campagne ${S.camp.annee} · ${S.camp.ras.length} RA` : '', S.br ? `Brouillon : ${S.br.ra.libelle} (${S.br.statut})` : ''].filter(Boolean).join(' — ') || 'Aucun fichier ouvert';
  const m = $('#main'); const y = window.scrollY;
  m.innerHTML = ({campagne: viewCampagne, saisie: viewSaisie, controle: viewControle, apercu: viewApercu})[S.view]();
  if (S.view === 'apercu') mountPreview();
  window.scrollTo(0, y);
}
const needCamp = () => `<div class="card"><p>Aucune campagne ouverte. Créez une <b>nouvelle campagne</b> ou ouvrez le fichier de campagne (.json) tenu par le Siège.</p></div>`;
const badge = s => `<span class="badge ${BADGE[s] || ''}">${esc(s)}</span>`;
const drop = (k, label, accept, multi) => `<label class="drop" data-drop="${k}">${label}<input type="file" data-file="${k}" accept="${accept}" ${multi ? 'multiple' : ''} hidden></label>`;

/* ---------- Campagne ---------- */
function viewCampagne() {
  const c = S.camp; if (!c) return needCamp();
  const P = c.params, hasBr = Object.keys(c.brouillons).length > 0;
  return `
  <h2>Paramètres de la campagne</h2>
  <div class="grid">
    <div class="fld"><label>Année N du RA</label><input type="number" data-cp="annee" value="${c.annee}" ${hasBr ? 'disabled title="Brouillons déjà générés : année figée"' : ''}></div>
    <div class="fld"><label>Adresse du siège (pied de page)</label><input type="text" data-cp="adresse" value="${esc(P.adresse)}"></div>
    <div class="fld"><label>Mention d'appartenance (couverture)</label><input type="text" data-cp="mention" value="${esc(P.mention)}"></div>
    <div class="fld"><label>Approbateur DGA par défaut</label><input type="text" data-cp="approbateur" value="${esc(P.approbateur)}"></div>
    <div class="fld"><label>Annexe « Écarts » dans le PDF validé</label><select data-cp="annexeEcartsValide"><option value="">Retirée (proposition)</option><option value="1" ${P.annexeEcartsValide ? 'selected' : ''}>Conservée</option></select></div>
  </div>
  <div class="grid">
    <div class="card">${c.logos.mlezi ? `<img src="${c.logos.mlezi}" style="height:46px">` : ''}${drop('logoMlezi', '<b>Logo combiné Mlezi Maore + GROUPE SOS</b><br>(PNG, meilleure définition)', 'image/*')}</div>
    <div class="card">${c.logos.sos ? `<img src="${c.logos.sos}" style="height:46px">` : ''}${drop('logoSos', '<b>Logo GROUPE SOS seul</b><br>(pied de couverture)', 'image/*')}</div>
  </div>

  <h2>Imports</h2>
  <div class="grid">
    <div class="card">${drop('ref', '<b>Référentiel</b> – onglet vue_service<br>(XLSX ou CSV)', '.xlsx,.xls,.csv')}<div class="muted">${c.referentiel.length ? `${c.referentiel.length} services chargés` : 'Non chargé'}</div></div>
    <div class="card">${drop('actN', `<b>Suivi d'activité ${c.annee}</b><br>un ou plusieurs classeurs XLSX`, '.xlsx,.xls', true)}<div class="muted">${c.activite.N ? `${c.activite.N.sheets.length} onglets lus` : 'Non chargé'}</div></div>
    <div class="card">${drop('actN1', `<b>Suivi d'activité ${c.annee - 1}</b> (comparaison)<br>un ou plusieurs classeurs XLSX`, '.xlsx,.xls', true)}<div class="muted">${c.activite.N1 ? `${c.activite.N1.sheets.length} onglets lus` : 'Non chargé'}</div></div>
    <div class="card">${drop('orga', '<b>Organigrammes</b> (PNG/JPEG)<br>nommés S07_organigramme.png…', 'image/*', true)}<div class="muted">${Object.keys(c.organigrammes).length} rattaché(s)</div></div>
    <div class="card">${drop('feiFull', "<b>Préparer l'export FEI</b><br>export complet Ageval → CSV réduit téléchargé", '.csv')}<div class="muted">Rien n'est conservé ni affiché : seul le fichier réduit est produit.</div></div>
    <div class="card">${drop('reprise', '<b>Reprise des RA N-1 validés</b><br>Reprise_RA_2025.json', '.json')}<div class="muted">${c.reprise ? `${Object.keys(c.reprise.services).length} services · RA ${c.reprise.annee_source}` : 'Non chargé'}</div></div>
    <div class="card">${drop('feiRed', '<b>Export FEI réduit</b><br>(10 colonnes autorisées)', '.csv')}<div class="muted">${c.fei ? `${c.fei.rows.length} FEI · ${esc(c.fei.file)}` : 'Non chargé'}</div></div>
  </div>
  ${importReport()}
  ${perimetre()}
  ${registreCampagne()}
  ${parDirecteur()}`;
}
function importReport() {
  const c = S.camp; if (!c.ras.length) return '';
  const raOpts = sel => `<option value="">— non rattaché —</option>` + c.ras.map(r => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${esc(r.libelle)}</option>`).join('');
  const sidOpts = sel => `<option value="">— choisir —</option>` + c.referentiel.map(r => `<option value="${r.service_id}" ${r.service_id === sel ? 'selected' : ''}>${r.service_id} ${esc(r.service)}</option>`).join('');
  let h = '<h2>Rapport d\'import</h2>';
  ['N', 'N1'].forEach(yk => {
    const A = c.activite[yk]; if (!A) return;
    const yr = yk === 'N' ? c.annee : c.annee - 1;
    const linked = A.sheets.filter(sh => rasForSheet(sh, yk).length), orph = A.sheets.filter(sh => !rasForSheet(sh, yk).length);
    const without = c.ras.filter(ra => !sheetsForRA(ra, yk).length);
    h += `<details ${yk === 'N' ? 'open' : ''}><summary>Suivi d'activité ${yr} : ${linked.length} onglet(s) rattaché(s), ${orph.length} orphelin(s), ${without.length} RA sans données</summary>
      <table class="t small"><thead><tr><th>Onglet</th><th>Code</th><th>Rattaché à</th><th>Mois manquants</th></tr></thead><tbody>
      ${A.sheets.map(sh => { const ras = rasForSheet(sh, yk); const key = yk + '|' + sh.file + '|' + sh.name;
        return `<tr><td>${esc(sh.name)}<div class="muted">${esc(sh.file)}</div></td><td>${esc(sh.code || '—')}</td>
        <td>${ras.length > 1 && !(key in c.sheetLinks) ? ras.map(id => esc(getRA(id)?.libelle)).join(' ; ') : `<select data-link="${esc(key)}">${raOpts(ras[0] || '')}</select>`}${key in c.sheetLinks ? ' <span class="chip">manuel</span>' : ''}</td>
        <td>${sh.missing.length ? sh.missing.map(m => MOIS[m]).join(', ') : '—'}</td></tr>`; }).join('')}</tbody></table>
      ${without.length ? `<div class="alert">RA sans données d'activité ${yr} : ${without.map(r => esc(r.libelle)).join(', ')}</div>` : ''}</details>`;
  });
  if (c.fei) {
    const un = feiUnmatched(), nUn = un.reduce((s, x) => s + x.n, 0);
    const N = c.annee; const zero = c.ras.filter(ra => feiAgg(ra, N).n === 0);
    h += `<details><summary>FEI Ageval : ${c.fei.rows.length} FEI lues (${c.fei.doublons} doublon(s) ignoré(s)) · ${nUn} FEI non rattachées</summary>
      ${un.length ? `<table class="t small"><thead><tr><th>Etablissement</th><th>Service Ageval</th><th class="n">FEI</th><th>Rattacher à</th></tr></thead><tbody>
      ${un.map(u => `<tr><td>${esc(u.etab)}</td><td>${esc(u.service)}</td><td class="n">${u.n}</td><td><select data-feimap="${esc(u.etab)}¤${esc(u.service)}">${sidOpts('')}</select></td></tr>`).join('')}</tbody></table>` : '<div class="alert ok">Toutes les FEI sont rattachées.</div>'}
      ${zero.length ? `<div class="alert">Aucune FEI en ${N} (vraie absence ou service qui ne déclare pas ?) : ${zero.map(r => esc(r.libelle)).join(', ')}</div>` : ''}
      <details><summary>Table de correspondance Ageval (${c.ageval.length} lignes)</summary><table class="t small"><thead><tr><th>Etablissement (préfixe)</th><th>Service</th><th>service_id</th><th>Note</th></tr></thead><tbody>
      ${c.ageval.map((m, i) => `<tr><td>${esc(m.prefix)}</td><td>${esc(m.service)}${m.exact ? ' <span class="chip">exact</span>' : ''}</td><td><select data-agmap="${i}">${sidOpts(m.sid)}</select></td><td class="muted">${esc(m.note)}</td></tr>`).join('')}</tbody></table></details></details>`;
  }
  const noOrga = c.ras.filter(ra => !orgaForRA(ra));
  h += `<details><summary>Organigrammes : ${Object.keys(c.organigrammes).length} rattaché(s), ${c.orgaOrphans.length} à rattacher, ${noOrga.length} RA sans organigramme</summary>
    ${c.orgaOrphans.map((o, i) => `<div class="row card">${o.data ? `<img src="${o.data}" style="height:50px">` : ''}<span>${esc(o.name)}</span>${o.err ? `<span class="alert">${esc(o.err)}</span>` : `<select data-orga="${i}">${sidOpts('')}</select>`}<button class="btn sm ghost" data-orgadel="${i}">Retirer</button></div>`).join('')}
    ${noOrga.length ? `<div class="alert">Sans organigramme : ${noOrga.map(r => esc(r.libelle)).join(', ')}</div>` : ''}</details>`;
  return h;
}
function perimetre() {
  const c = S.camp; if (!c.ras.length) return '';
  return `<h2>Périmètre des RA (${c.ras.length})</h2>
  <div class="row"><button class="btn sec" data-act="merge">Fusionner la sélection</button><button class="btn ghost" data-act="resetPerim">Réinitialiser depuis le référentiel</button>
  <span class="muted">Scinder : un RA par code analytique. Fusionner : plusieurs services dans un seul RA. Libellés modifiables.</span></div>
  <details><summary>Afficher le périmètre détaillé</summary>
  <table class="t small"><thead><tr><th></th><th>RA (libellé)</th><th>service_id</th><th>Codes analytiques</th><th>ESMS</th><th>CVS obligatoire</th><th>SMJPM</th><th></th></tr></thead><tbody>
  ${c.ras.map(ra => `<tr><td><input type="checkbox" data-sel="${ra.id}" ${S.sel.has(ra.id) ? 'checked' : ''}></td>
    <td><input type="text" data-ra="${ra.id}" data-f="libelle" value="${esc(ra.libelle)}"></td><td>${ra.services.join(', ')}${ra.absentRef ? ' <span class="badge b-corr">absent du référentiel</span>' : ''}</td>
    <td><input type="text" data-ra="${ra.id}" data-f="analytiques" value="${esc(ra.analytiques.join(', '))}"></td>
    <td><input type="checkbox" data-ra="${ra.id}" data-f="esms" ${ra.esms ? 'checked' : ''}></td><td><input type="checkbox" data-ra="${ra.id}" data-f="cvs_obligatoire" ${ra.cvs_obligatoire ? 'checked' : ''} ${ra.esms ? '' : 'disabled'}></td>
    <td><input type="checkbox" data-ra="${ra.id}" data-f="smjpm" ${ra.smjpm ? 'checked' : ''}></td>
    <td>${ra.analytiques.length > 1 && ra.statut === 'À lancer' ? `<button class="btn sm ghost" data-split="${ra.id}">Scinder</button>` : ''}</td></tr>`).join('')}
  </tbody></table></details>`;
}
function registreCampagne() {
  const c = S.camp, esmsRA = c.ras.filter(r => r.esms); if (!esmsRA.length) return '';
  const cur = S.regRA && getRA(S.regRA)?.esms ? S.regRA : esmsRA[0].id, ra = getRA(cur), reg = c.registre[cur] || {};
  return `<h2>Registre des outils 2002-2 (Service d'appui qualité)</h2>
  <div class="row"><select data-regra="1" style="max-width:420px">${esmsRA.map(r => `<option value="${r.id}" ${r.id === cur ? 'selected' : ''}>${esc(r.libelle)}</option>`).join('')}</select>
  <span class="muted">${esmsRA.length} RA ESMS. Les modifications faites ici alimentent les brouillons générés ensuite.</span></div>
  <table class="t small"><thead><tr><th>Outil</th><th>Valeurs</th><th>Statut calculé (31/12/${c.annee})</th><th>Commentaire</th></tr></thead><tbody>
  ${outilsFor(ra).map(o => { const v = reg[o.k] || {}, st = outilStatut(o, v, ra, c.annee);
    return `<tr><td><b>${esc(o.label)}</b><div class="muted">${esc(o.base)}</div></td><td>${OUTIL_FIELDS[o.type].map(([f, l, opts]) => `<div>${esc(l.replace(' en N', ' en ' + c.annee))} ${opts ? `<select data-reg="${o.k}" data-f="${f}">${opts.map(x => `<option ${x === (v[f] || '') ? 'selected' : ''}>${x}</option>`).join('')}</select>` : `<input type="text" data-reg="${o.k}" data-f="${f}" value="${esc(v[f] || '')}">`}</div>`).join('')}
      <label class="small"><input type="checkbox" data-reg="${o.k}" data-f="sans_objet" ${v.sans_objet ? 'checked' : ''}> Sans objet</label></td>
      <td><span class="badge ${st.s === 'À jour' ? 'b-ctrl' : st.s === 'Sans objet' ? 'b-lancer' : 'b-corr'}">${st.s}</span><div class="muted">${esc(st.why || '')}</div></td>
      <td><input type="text" maxlength="300" data-reg="${o.k}" data-f="commentaire" value="${esc(v.commentaire || '')}"></td></tr>`; }).join('')}
  </tbody></table>`;
}
function parDirecteur() {
  const c = S.camp; if (!c.ras.length) return '';
  const byDir = {}; c.ras.forEach(ra => (byDir[ra.directeur || '(sans directeur)'] = byDir[ra.directeur || '(sans directeur)'] || []).push(ra));
  const dirs = Object.keys(byDir).sort((a, b) => byDir[b].length - byDir[a].length || a.localeCompare(b));
  const bySect = {}; c.ras.forEach(ra => bySect[ra.secteur || '—'] = (bySect[ra.secteur || '—'] || 0) + 1);
  const cnt = {}; c.ras.forEach(ra => cnt[ra.statut] = (cnt[ra.statut] || 0) + 1);
  return `<h2>RA par directeur</h2>
  <div class="row">${STATUTS.map(s => `${badge(s)} ${cnt[s] || 0}`).join(' &nbsp; ')}</div>
  <div class="row" style="margin:10px 0">
    <button class="btn" data-act="genAll">Générer les brouillons « À lancer »</button>
    ${GAS ? '<button class="btn sec" data-act="gasPull">Récupérer les brouillons du Drive</button>' : '<label class="btn sec">Réimporter des brouillons renvoyés<input type="file" accept=".json" multiple data-file="reimport" hidden></label>'}
    <button class="btn ghost" data-act="saveCamp">Enregistrer la campagne (.json)</button>
    <button class="btn ghost" data-act="csvSuivi">Export suivi (CSV)</button>
    <button class="btn ghost" data-act="csvConso">Export consolidé (CSV)</button>
  </div>
  <table class="t"><thead><tr><th>Directeur / RA</th><th>Secteur</th><th>Direction</th><th>Rédacteur (élabore)</th><th>Statut</th><th style="width:250px">Actions</th></tr></thead><tbody>
  ${dirs.map(d => `<tr class="grp"><td colspan="6">${esc(d)} — ${byDir[d].length} RA</td></tr>` + byDir[d].map(ra => {
    const b = c.brouillons[ra.id];
    return `<tr><td>${esc(ra.libelle)} <span class="muted">${ra.services.join(', ')}${ra.esms ? ' · ESMS' : ''}</span></td><td>${esc(ra.secteur)}</td><td>${esc(ra.direction)}</td><td>${esc(redacteur(ra))}</td><td>${badge(ra.statut)}</td>
    <td>${b ? `<button class="btn sm ghost" data-dl="${ra.id}">Télécharger</button> <button class="btn sm ghost" data-open="${ra.id}">Ouvrir</button> <button class="btn sm ghost" data-qc="${ra.id}">Contrôle</button>` : `<button class="btn sm" data-gen="${ra.id}">Générer le brouillon</button>`}</td></tr>`; }).join('')).join('')}
  </tbody><tfoot><tr class="grp"><td colspan="6">${Object.entries(bySect).map(([s, n]) => `${esc(s)} : ${n}`).join(' · ')} — <b>Total : ${c.ras.length} RA</b></td></tr></tfoot></table>`;
}

/* ---------- Saisie ---------- */
function viewSaisie() {
  const br = S.br;
  if (!br) return `<div class="card"><p>Aucun brouillon ouvert. Utilisez <b>Ouvrir un fichier .json</b> pour charger le brouillon transmis par le Siège.</p>
    ${S.camp && Object.keys(S.camp.brouillons).length ? `<p>Ou ouvrez un brouillon de la campagne :</p>${Object.keys(S.camp.brouillons).map(id => `<button class="btn sm ghost" data-open="${id}">${esc(getRA(id)?.libelle || id)}</button>`).join(' ')}` : ''}</div>`;
  const comp = completude(), secs = saisieSections(), nE = Object.keys(br.ecarts).length;
  const st = br.statut, canEdit = ['En rédaction', 'À corriger', 'Transmis au directeur', 'À lancer'].includes(st);
  const actions = [];
  if (['En rédaction', 'À corriger', 'À lancer'].includes(st)) actions.push(`<button class="btn" data-act="toDir">Transmettre au directeur</button>`);
  if (st === 'Transmis au directeur') actions.push(`<button class="btn" data-act="toSiege">Transmettre au Siège</button>`, `<button class="btn sec" data-act="backChef">Renvoyer au chef de service</button>`);
  return `<div class="layout"><aside class="toc">
    <div class="stat"><b>${esc(br.ra.libelle)}</b> – RA ${br.annee}<br>${badge(st)}
      <div class="prog"><div style="width:${comp.pct}%"></div></div><div class="small">Complétude : ${comp.pct} % · ${comp.bloq} point(s) bloquant(s)</div>
      <div class="small">Écarts aux sources : <b>${nE}</b></div>
      <div class="row" style="margin-top:8px"><button class="btn sm sec" data-act="verify">Vérifier</button><button class="btn sm ghost" data-act="saveBr">Enregistrer</button></div>
      <div class="row" style="margin-top:6px">${actions.join('')}</div></div>
    ${secs.map(([id, t, l]) => `<a href="#s-${id}" class="${l ? 'l2' : ''}">${esc(t)}</a>`).join('')}
  </aside><div>
    ${!canEdit ? `<div class="warnbox">Statut « ${esc(st)} » : le RA est entre les mains du Siège ou de la DGA. Les modifications restent possibles mais seront visibles au prochain contrôle.</div>` : ''}
    <div id="verifyOut"></div>
    ${['Transmis au directeur', 'Transmis au Siège', 'Contrôlé', 'Validé'].includes(st) ? `<div class="card" style="border-color:var(--bleu)"><h3 style="margin-top:0">Avis du directeur (obligatoire, n'apparaît pas dans le PDF)</h3>${tx('avis', 'Avis du directeur', {req: true, rows: 3, ro: st !== 'Transmis au directeur'})}</div>` : ''}
    ${secs.map(([id, t, l, h]) => l ? `<div id="s-${id}"><h3 style="font-size:15px">${esc(t)}</h3>${h}</div>` : `<section class="sx" id="s-${id}"><h2>${esc(t)}</h2>${h}</section>`).join('')}
    <section class="sx"><h2>Journal</h2><table class="t small"><thead><tr><th>Date</th><th>Statut</th><th>Nom</th><th>Fonction</th><th>Commentaire</th></tr></thead><tbody>
    ${(br.journal || []).map(j => `<tr><td>${frDateTime(j.date)}</td><td>${esc(j.statut)}</td><td>${esc(j.nom)}</td><td>${esc(j.fonction)}</td><td>${esc(j.commentaire)}</td></tr>`).join('')}</tbody></table></section>
  </div></div>`;
}
function showVerify() {
  const iss = verify(S.br); const out = $('#verifyOut'); if (!out) return iss;
  out.innerHTML = `<div class="card"><h3 style="margin-top:0">Résultat de « Vérifier »</h3>${iss.length ? iss.map(i => `<div class="alert ${i.lvl === 'bloquant' ? 'bloq' : i.lvl === 'info' ? 'ok' : ''}"><b>${esc(i.sec)}</b> – ${esc(i.msg)}</div>`).join('') : '<div class="alert ok">Aucune anomalie.</div>'}</div>`;
  out.scrollIntoView({behavior: 'smooth'}); return iss;
}

/* ---------- Contrôle qualité ---------- */
function viewControle() {
  const c = S.camp; if (!c) return needCamp();
  const ids = Object.keys(c.brouillons); if (!ids.length) return `<div class="card">Aucun brouillon généré ou réimporté.</div>`;
  const cur = ids.includes(S.qcRA) ? S.qcRA : (ids.find(id => getRA(id)?.statut === 'Transmis au Siège') || ids[0]); S.qcRA = cur;
  const br = c.brouillons[cur], iss = verify(br), ec = Object.entries(br.ecarts);
  const allAcc = ec.every(([, e]) => e.decision === 'Accepté'), bloq = iss.some(i => i.lvl === 'bloquant');
  return `<div class="row"><select data-qcsel="1" style="max-width:480px">${ids.map(id => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(getRA(id)?.libelle || id)} — ${esc(c.brouillons[id].statut)}</option>`).join('')}</select>
    ${badge(br.statut)} <button class="btn ghost" data-act="qcPdf">Exporter le rapport de contrôle (PDF)</button></div>
  ${br.altere ? `<div class="alert bloq"><b>Données sources altérées</b> : le fichier a été modifié hors de l'outil (empreinte différente).</div>` : ''}
  ${br.conflit ? `<div class="alert">${esc(br.conflit)}</div>` : ''}
  <h2>1. Écarts aux données sources (${ec.length})</h2>
  ${ec.length ? `<table class="t small"><thead><tr><th>Section</th><th>Donnée</th><th>Valeur source</th><th>Valeur saisie</th><th>Motif</th><th>Date</th><th>Décision du Siège</th></tr></thead><tbody>
  ${ec.map(([p, e]) => `<tr><td>${esc(e.section)}</td><td>${esc(e.label)}</td><td>${esc(e.source ?? '—')}</td><td><b>${esc(e.value ?? '—')}</b></td><td>${esc(e.motif)}</td><td>${frDate(e.date)}</td>
    <td><select data-dec="${esc(p)}">${['', 'Accepté', 'Refusé'].map(x => `<option ${x === (e.decision || '') ? 'selected' : ''}>${x}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>` : '<div class="alert ok">Aucun écart aux données sources.</div>'}
  <h2>2. Alertes « Vérifier »</h2>${iss.filter(i => i.lvl !== 'info').map(i => `<div class="alert ${i.lvl === 'bloquant' ? 'bloq' : ''}"><b>${esc(i.sec)}</b> – ${esc(i.msg)}</div>`).join('') || '<div class="alert ok">Aucune alerte.</div>'}
  ${br.statut !== 'Validé' ? '' : `<div class="alert ok">Validé par ${esc(br.validation?.nom)} le ${frDate(br.validation?.date)}.</div>`}
  <h2>Décision</h2>
  <div class="row">
    <button class="btn sec" data-act="qcCorr" ${['Transmis au Siège', 'Contrôlé'].includes(br.statut) ? '' : 'disabled'}>Renvoyer en correction (À corriger)</button>
    <button class="btn" data-act="qcOk" ${br.statut === 'Transmis au Siège' && allAcc && !bloq && !br.altere ? '' : 'disabled'}>Marquer « Contrôlé »</button>
    <button class="btn" data-act="qcValid" style="background:#2f6b16;border-color:#2f6b16" ${br.statut === 'Contrôlé' ? '' : 'disabled'}>Valider (DGA)</button>
    <button class="btn ghost" data-dl="${cur}">Télécharger le brouillon</button>
    <button class="btn ghost" data-open="${cur}">Ouvrir dans Saisie / Aperçu</button></div>
  <div class="muted">« Contrôlé » exige : statut Transmis au Siège, chaque écart accepté (un écart refusé doit être corrigé par le chef de service), aucun point bloquant, données non altérées. « Validé » n'est possible que depuis « Contrôlé ».</div>`;
}

/* ---------- Aperçu ---------- */
function viewApercu() {
  if (!S.br) return `<div class="card">Ouvrez un brouillon pour afficher l'aperçu du rapport.</div>`;
  return `<div class="row" style="margin-bottom:8px"><button class="btn" data-act="print">Imprimer / Enregistrer en PDF</button>
    <span class="muted">Choisir « Enregistrer au format PDF », format A4, marges « Aucune » ou « Par défaut », sans en-têtes ni pieds de page du navigateur.</span></div>
    <iframe class="preview" id="preview" title="Aperçu du rapport"></iframe>`;
}
function mountPreview() { const f = $('#preview'); if (!f) return; const d = reportDoc(S.br); f.srcdoc = pagedHTML(d); }
function printIframe(doc) {
  if (GAS) { const w = window.open('', '_blank'); if (!w) return toast('Autorisez les fenêtres surgissantes pour imprimer.', 6000); w.document.open(); w.document.write(pagedHTML(doc, true)); w.document.close(); return; }
  let f = $('#printFrame'); if (f) f.remove();
  f = document.createElement('iframe'); f.id = 'printFrame'; f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const old = document.title; document.title = doc.title;
  f.srcdoc = pagedHTML(doc);
  const t0 = Date.now(); const iv = setInterval(() => {
    const ready = f.contentDocument?.body?.getAttribute('data-ready');
    if (ready || Date.now() - t0 > 30000) { clearInterval(iv); setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => { document.title = old; }, 2000); }, 300); }
  }, 200);
}

/* ---------- Actions ---------- */
async function generate(id) {
  const ra = getRA(id), br = await buildBrouillon(ra);
  setStatutRA(ra, br, 'En rédaction', {nom: S.actor?.nom || 'Siège', fonction: S.actor?.fonction || 'Direction ressources et métiers et appui transversal'}, 'Brouillon généré et envoyé au rédacteur');
  S.camp.brouillons[id] = br; return br;
}
function setStatutRA(ra, br, statut, actor, comment) { addJournal(br, statut, actor, comment); ra.statut = statut; ra.journal = clone(br.journal); }
const brFile = br => `RA_${br.annee}_${safeName(br.ra.libelle)}_brouillon.json`;
async function reimport(files) {
  const msgs = [];
  for (const f of files) {
    try {
      const b = JSON.parse(await f.text());
      if (b.kind !== 'brouillon') throw new Error("ce n'est pas un brouillon de RA");
      if (b.schemaVersion !== SCHEMA) throw new Error(`version de schéma ${b.schemaVersion} ≠ ${SCHEMA}`);
      if (b.annee !== S.camp.annee) throw new Error(`année ${b.annee} ≠ campagne ${S.camp.annee}`);
      const ra = getRA(b.raId); if (!ra) throw new Error(`RA ${b.raId} absent du périmètre`);
      if (stable(b.ra.services) !== stable(ra.services)) throw new Error('service_id différents du périmètre');
      b.altere = (await hashOf(b.sources)) !== b.sourceHash;
      const prev = S.camp.brouillons[ra.id], last = x => (x?.journal || []).map(j => j.date).sort().pop() || '';
      if (prev && last(prev) > last(b)) { prev.conflit = `Conflit : une version plus ancienne (${f.name}) a été importée et ignorée le ${frDateTime(nowISO())}.`; msgs.push(`${f.name} : version plus ancienne, ignorée (conflit signalé)`); continue; }
      if (prev && last(prev) === last(b) && stable(prev.saisie) !== stable(b.saisie)) b.conflit = 'Conflit : deux versions différentes portent la même date de journal ; la dernière importée est conservée.';
      S.camp.brouillons[ra.id] = b; ra.statut = b.statut; ra.journal = clone(b.journal);
      msgs.push(`${b.ra.libelle} : importé (${b.statut})${b.altere ? ' – DONNÉES SOURCES ALTÉRÉES' : ''}`);
    } catch (e) { msgs.push(`${f.name} refusé : ${e.message}`); }
  }
  autosave(); render();
  await modalForm('Réimport des brouillons', [], {intro: msgs.map(esc).join('<br>'), ok: 'OK'});
}
function csvSuivi() {
  const rows = [['directeur', 'direction', 'secteur', 'ra', 'service_id', 'redacteur', 'statut', 'dernier_changement']];
  S.camp.ras.slice().sort((a, b) => (a.directeur || '').localeCompare(b.directeur || '')).forEach(ra => rows.push([ra.directeur, ra.direction, ra.secteur, ra.libelle, ra.services.join(', '), redacteur(ra), ra.statut, frDateTime(ra.journal.at(-1)?.date)]));
  download(`Suivi_campagne_RA_${S.camp.annee}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
}
async function csvConso() {
  const rows = [['service_id', 'service', 'directeur', 'secteur', 'annee', 'dispositif', 'code_analytique', 'indicateur', 'mois', 'valeur']];
  for (const ra of S.camp.ras) {
    const br = S.camp.brouillons[ra.id] || await buildBrouillon(ra);
    br.sources.activite.forEach((b, i) => { const e = blockEff(br, i);
      Object.entries(e).forEach(([k, arr]) => arr.forEach((v, m) => rows.push([ra.services.join(', '), ra.libelle, ra.directeur, ra.secteur, br.annee, b.libelle, b.code, LINE_LABELS[k], m + 1, v ?? ''])));
      if (e.theorique && e.realise) e.realise.forEach((r, m) => rows.push([ra.services.join(', '), ra.libelle, ra.directeur, ra.secteur, br.annee, b.libelle, b.code, "Taux d'occupation", m + 1, num(e.theorique[m]) ? (num(r) / num(e.theorique[m])).toFixed(4).replace('.', ',') : '']));
    });
  }
  download(`Activite_consolidee_RA_${S.camp.annee}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
}

async function onAction(a, el) {
  const c = S.camp;
  switch (a) {
    case 'merge': { const ids = [...S.sel].filter(getRA); if (ids.length < 2) return toast('Cochez au moins deux RA.'); if (ids.some(id => getRA(id).statut !== 'À lancer')) return toast('Seuls des RA « À lancer » peuvent être fusionnés.'); mergeRAs(ids); S.sel.clear(); break; }
    case 'resetPerim': if (!(await confirmBox('Réinitialiser le périmètre', 'Recalculer un RA par ligne de vue_service ? Les scissions, fusions et statuts seront perdus (brouillons conservés).'))) return; c.ras = []; c.registre = {}; applyReferentiel(c.referentiel); break;
    case 'genAll': { const todo = c.ras.filter(r => !c.brouillons[r.id]); if (!todo.length) return toast('Tous les brouillons sont déjà générés.'); if (!(await askActor('Direction ressources et métiers et appui transversal'))) return; for (const ra of todo) { const br = await generate(ra.id); if (GAS) { S._gasAction = 'generation'; await download(brFile(br), JSON.stringify(br)); } } toast(GAS ? `${todo.length} brouillon(s) déposés dans « 1. Modèles ».` : `${todo.length} brouillon(s) générés. Téléchargez-les ligne par ligne pour les envoyer.`, 6000); break; }
    case 'gasPull': await gasPull(); return;
    case 'saveCamp': download(`Campagne_RA_${c.annee}_${today()}.json`, JSON.stringify(c), 'application/json'); return;
    case 'csvSuivi': return csvSuivi();
    case 'csvConso': return csvConso();
    case 'verify': showVerify(); return;
    case 'saveBr': download(brFile(S.br), JSON.stringify(S.br), 'application/json'); return;
    case 'toDir': { const iss = showVerify(); if (iss.some(i => i.lvl === 'bloquant')) return toast('Des sections obligatoires sont vides ou trop longues : voir « Vérifier ».', 5000);
      const act = await askActor('Chef de service'); if (!act) return; setStatut(S.br, 'Transmis au directeur', act, 'Rédaction terminée'); download(brFile(S.br), JSON.stringify(S.br), 'application/json'); toast('Brouillon enregistré : transmettez le fichier au directeur.', 5000); break; }
    case 'toSiege': { const av = S.br.saisie.avis.trim(); if (!av) return toast("L'avis du directeur est obligatoire."); if (av.length > 500) return toast("Avis trop long (500 caractères max).");
      if (verify(S.br).some(i => i.lvl === 'bloquant')) { showVerify(); return toast('Points bloquants à lever avant transmission.'); }
      const act = await askActor('Directeur'); if (!act) return; setStatut(S.br, 'Transmis au Siège', act, 'Avis : ' + av); download(brFile(S.br), JSON.stringify(S.br), 'application/json'); toast('Brouillon enregistré : transmettez le fichier au Siège.', 5000); break; }
    case 'backChef': { const r = await modalForm('Renvoyer au chef de service', [{k: 'motif', label: 'Motif', type: 'textarea', required: true, max: 500}]); if (!r) return; const act = await askActor('Directeur'); if (!act) return; setStatut(S.br, 'À corriger', act, r.motif); download(brFile(S.br), JSON.stringify(S.br), 'application/json'); break; }
    case 'qcCorr': { const br = c.brouillons[S.qcRA]; const r = await modalForm('Renvoyer en correction', [{k: 'motif', label: 'Motif (joint au rapport de contrôle)', type: 'textarea', required: true, max: 1000}]); if (!r) return; const act = await askActor('Direction ressources et métiers et appui transversal'); if (!act) return;
      setStatutRA(getRA(S.qcRA), br, 'À corriger', act, r.motif); download(brFile(br), JSON.stringify(br), 'application/json'); printIframe(controleDoc(br)); break; }
    case 'qcOk': { const br = c.brouillons[S.qcRA]; const act = await askActor('Direction ressources et métiers et appui transversal'); if (!act) return; setStatutRA(getRA(S.qcRA), br, 'Contrôlé', act, `Contrôle qualité : ${Object.keys(br.ecarts).length} écart(s) accepté(s)`); c.controles[S.qcRA] = {date: nowISO(), par: act.nom}; if (GAS) { S._gasAction = 'siege'; download(brFile(br), JSON.stringify(br)); } break; }
    case 'qcValid': { const br = c.brouillons[S.qcRA]; const r = await modalForm('Validation DGA', [{k: 'nom', label: 'Nom de l\'approbateur (DGA)', value: c.params.approbateur, required: true}, {k: 'commentaire', label: 'Commentaire', type: 'textarea', max: 500}]); if (!r) return;
      br.validation = {nom: r.nom, date: nowISO()}; setStatutRA(getRA(S.qcRA), br, 'Validé', {nom: r.nom, fonction: 'Direction générale adjointe'}, r.commentaire); toast('RA validé. Le PDF final peut être produit depuis l\'Aperçu.'); if (GAS) { S._gasAction = 'siege'; download(brFile(br), JSON.stringify(br)); } break; }
    case 'qcPdf': printIframe(controleDoc(c.brouillons[S.qcRA])); return;
    case 'print': { const d = reportDoc(S.br); printIframe(d); return; }
  }
  autosave(); render();
}

/* ---------- Gestion des fichiers ---------- */
async function onFiles(kind, files) {
  if (!files.length) return;
  try {
    const c = S.camp;
    switch (kind) {
      case 'logoMlezi': c.logos.mlezi = await adapters.readDataURL(files[0]); break;
      case 'logoSos': c.logos.sos = await adapters.readDataURL(files[0]); break;
      case 'ref': { const rows = parseReferentiel(await adapters.readWorkbook(files[0])); applyReferentiel(rows); toast(`${rows.length} services lus · ${c.ras.length} RA dans le périmètre.`); break; }
      case 'actN': case 'actN1': { const r = await importActivity(files, kind === 'actN' ? 'N' : 'N1'); toast(`${r.ok} onglet(s) lus${r.ignored.length ? `, ${r.ignored.length} ignoré(s) (structure non reconnue)` : ''}.`, 5000); break; }
      case 'orga': { const n = await importOrganigrammes(files); toast(`${n} organigramme(s) rattaché(s) automatiquement.`); break; }
      case 'feiFull': { const n = await prepareFEI(files[0]); toast(`Export réduit téléchargé (${n} FEI, 10 colonnes). Chargez-le dans « Export FEI réduit ».`, 6000); return; }
      case 'reprise': {
        const r = JSON.parse(await files[0].text());
        if (r.schemaVersion !== REPRISE_SCHEMA) throw new Error('Fichier de reprise non reconnu (schemaVersion attendue : ' + REPRISE_SCHEMA + ').');
        if (r.annee_source !== c.annee - 1) toast(`Attention : reprise des RA ${r.annee_source} pour une campagne ${c.annee}.`, 6000);
        c.reprise = r; const n = feedRegistre(); toast(`Reprise chargée : ${Object.keys(r.services).length} services ; ${n} valeur(s) ajoutée(s) au registre 2002-2. Les brouillons déjà générés ne sont pas modifiés.`, 7000); break; }
      case 'feiRed': { const n = await importFEI(files[0]); toast(`${n} FEI importées.`); break; }
      case 'reimport': await reimport(files); return;
    }
    autosave(); render();
  } catch (e) { console.error(e); await modalForm('Import refusé', [], {intro: esc(e.message), ok: 'OK'}); }
}

/* Registre 2002-2 alimenté par la reprise : n'écrase jamais une valeur déjà saisie */
function feedRegistre() {
  const c = S.camp; let n = 0; if (!c.reprise) return 0;
  c.ras.filter(ra => ra.esms).forEach(ra => {
    const reg = c.registre[ra.id] = c.registre[ra.id] || {};
    const keys = outilsFor(ra).map(o => o.k);
    ra.services.forEach(sid => {
      const e = c.reprise.services[sid]; if (!e) return;
      Object.entries(e.registre || {}).forEach(([k, v]) => {
        if (!keys.includes(k)) return; const cur = reg[k] = reg[k] || {};
        ['date', 'type_doc', 'forme', 'debut', 'communiquee'].forEach(f => { if (v[f] && !cur[f]) { cur[f] = v[f]; n++; } });
        const com = v.commentaire || v.brut; if (com && !cur.commentaire) { cur.commentaire = ('RA ' + c.reprise.annee_source + ' : ' + com).slice(0, 300); n++; }
      });
    });
  });
  return n;
}

/* ---------- Événements ---------- */
function bind() {
  $('#tabs').addEventListener('click', e => { const v = e.target.dataset.v; if (v) { S.view = v; window.scrollTo(0, 0); render(); } });
  $('#openJson').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const o = JSON.parse(await f.text());
      if (o.schemaVersion !== SCHEMA) throw new Error(`Version de schéma inconnue : ${o.schemaVersion}`);
      if (o.kind === 'campagne') { S.camp = o; S.view = 'campagne'; }
      else if (o.kind === 'brouillon') { S.br = o; S.view = 'saisie'; }
      else throw new Error('Fichier non reconnu.');
      autosave(); render(); toast('Fichier ouvert : ' + f.name);
    } catch (err) { modalForm('Ouverture impossible', [], {intro: esc(err.message), ok: 'OK'}); }
  });
  $('#newCamp').addEventListener('click', async () => {
    const r = await modalForm('Nouvelle campagne', [{k: 'annee', label: 'Année N des rapports (saisie une seule fois)', value: String(new Date().getFullYear()), required: true}],
      {intro: S.camp ? 'La campagne ouverte sera remplacée dans ce navigateur. Enregistrez-la d\'abord si besoin.' : ''});
    if (!r) return; const N = parseInt(r.annee, 10); if (!(N > 2000 && N < 2100)) return toast('Année invalide.');
    S.camp = newCampaign(N); S.view = 'campagne'; autosave(); render();
  });
  const main = $('#main');
  main.addEventListener('click', async e => {
    const t = e.target.closest('[data-act],[data-gen],[data-dl],[data-open],[data-qc],[data-split],[data-add],[data-del],[data-modfill],[data-orgadel],[data-insctx]'); if (!t) return;
    const d = t.dataset, c = S.camp;
    if (d.act) return onAction(d.act, t);
    if (d.gen) { if (!(await askActor('Direction ressources et métiers et appui transversal'))) return; const br = await generate(d.gen); S._gasAction = 'generation'; download(brFile(br), JSON.stringify(br), 'application/json'); autosave(); return render(); }
    if (d.dl) { const br = c.brouillons[d.dl]; S._gasAction = 'siege'; return download(brFile(br), JSON.stringify(br), 'application/json'); }
    if (d.open) { S.br = c.brouillons[d.open]; S.view = 'saisie'; autosave(); return render(); }
    if (d.qc) { S.qcRA = d.qc; S.view = 'controle'; return render(); }
    if (d.split) { splitRA(d.split); autosave(); return render(); }
    if (d.orgadel) { c.orgaOrphans.splice(+d.orgadel, 1); autosave(); return render(); }
    if (d.insctx) { S.br.saisie.intro.contexte = S.br.repriseInfo.contexte; autosave(); return render(); }
    if (d.modfill) { const m = moduleFor(S.br.ra); S.br.saisie.bilan.complementaires = m[2].map(x => ({indicateur: x, valeur: '', commentaire: ''})); autosave(); return render(); }
    if (d.add) { const rows = getP(S.br.saisie, d.add); const o = {}; TABLES[d.add].forEach(([k]) => o[k] = ''); rows.push(o); autosave(); return render(); }
    if (d.del) { getP(S.br.saisie, d.del).splice(+d.i, 1); autosave(); return render(); }
  });
  main.addEventListener('input', e => {
    const t = e.target, d = t.dataset;
    if (d.s) { setP(S.br.saisie, d.s, t.value); const cn = $(`[data-cnt="${d.s}"]`); if (cn) { const max = LIMITS[d.s]; cn.textContent = `${t.value.length} / ${max}`; cn.classList.toggle('over', t.value.length > max); } autosave(); }
    else if (d.tc) { getP(S.br.saisie, d.tc)[+d.i][d.k] = t.value; autosave(); }
  });
  main.addEventListener('change', async e => {
    const t = e.target, d = t.dataset, c = S.camp;
    if (d.file) { const fl = [...t.files]; t.value = ''; return onFiles(d.file, fl); }
    if (d.annex) { const f = t.files[0]; if (!f) return; S.br.saisie.annexes.push({data: await adapters.readImage(f), legende: ''}); autosave(); return render(); }
    if (d.p) return onPrefChange(t);
    if (d.cp) { if (d.cp === 'annee') { const N = parseInt(t.value, 10); if (N > 2000) c.annee = N; } else if (d.cp === 'annexeEcartsValide') c.params.annexeEcartsValide = !!t.value; else c.params[d.cp] = t.value; autosave(); return render(); }
    if (d.sel) { t.checked ? S.sel.add(d.sel) : S.sel.delete(d.sel); return; }
    if (d.relu) { S.br.repris[d.relu].relu = t.checked; if (t.checked) { S.br.repris[d.relu].date = nowISO(); } autosave(); return render(); }
    if (d.ra) { const ra = getRA(d.ra); if (d.f === 'analytiques') ra.analytiques = codesOf(t.value); else if (t.type === 'checkbox') { ra[d.f] = t.checked; if (d.f === 'esms' || d.f === 'smjpm') { delete c.registre[ra.id]; seedRegistre(); feedRegistre(); } } else ra[d.f] = t.value; autosave(); return render(); }
    if (d.link) { c.sheetLinks[d.link] = t.value; autosave(); return render(); }
    if (d.feimap) { const [etab, service] = d.feimap.split('¤'); if (t.value) c.ageval.push({prefix: etab, service, sid: t.value, exact: true, note: 'rattachement manuel'}); autosave(); return render(); }
    if (d.agmap) { c.ageval[+d.agmap].sid = t.value; autosave(); return render(); }
    if (d.orga) { const o = c.orgaOrphans[+d.orga]; if (t.value) { c.organigrammes[t.value] = {name: o.name, data: o.data, date: o.date}; c.orgaOrphans.splice(+d.orga, 1); } autosave(); return render(); }
    if (d.regra) { S.regRA = t.value; return render(); }
    if (d.reg) { const r = c.registre[S.regRA && getRA(S.regRA)?.esms ? S.regRA : c.ras.find(x => x.esms).id]; r[d.reg] = r[d.reg] || {}; r[d.reg][d.f] = t.type === 'checkbox' ? t.checked : t.value; autosave(); return render(); }
    if (d.qcsel) { S.qcRA = t.value; return render(); }
    if (d.dec) { const br = c.brouillons[S.qcRA]; br.ecarts[d.dec].decision = t.value; autosave(); return render(); }
  });
}
async function onPrefChange(el) {
  if ($('.modal-bg')) return;
  const br = S.br, p = el.dataset.p, src = getP(br.sources, p), prev = br.ecarts[p];
  let val = el.value; if (el.dataset.num) val = val.trim() === '' ? null : num(val);
  if (el.dataset.num && el.value.trim() !== '' && val === null) { toast('Nombre attendu.'); el.value = prev ? prev.value ?? '' : src ?? ''; return; }
  const same = (a, b) => (a ?? '') === (b ?? '') || (a != null && b != null && String(a) === String(b));
  if (same(val, src)) { delete br.ecarts[p]; autosave(); return render(); }
  const r = await modalForm('Modification d\'une donnée pré-remplie', [{k: 'motif', label: 'Motif (obligatoire, 200 caractères max)', type: 'textarea', max: 200, required: true, value: prev?.motif || ''}],
    {intro: `<b>${esc(el.dataset.label)}</b><br>Valeur source : <b>${esc(src ?? '—')}</b> → valeur saisie : <b>${esc(val ?? '—')}</b><br>La modification sera relevée dans le journal des écarts et contrôlée par le Siège.`});
  if (!r) { el.value = prev ? (prev.value ?? '') : (src ?? ''); return; }
  br.ecarts[p] = {source: src ?? null, value: val, motif: r.motif.slice(0, 200), date: nowISO(), label: el.dataset.label, section: el.dataset.sec};
  autosave(); render();
}

/* ---------- Démarrage ---------- */
(async function init() {
  bind();
  const [c, b] = await Promise.all([DB.get('campaign'), DB.get('brouillon')]);
  if (c && c.schemaVersion === SCHEMA) S.camp = c;
  if (b && b.schemaVersion === SCHEMA) { S.br = (S.camp && S.camp.brouillons[b.raId] && stable(S.camp.brouillons[b.raId].journal) === stable(b.journal)) ? S.camp.brouillons[b.raId] : b; }
  S.view = S.camp ? 'campagne' : (S.br ? 'saisie' : 'campagne');
  render();
  gasInit();
})();
