/* ==========================================================================
   Rendu du rapport A4 (Paged.js) et rapport de contrôle
   ========================================================================== */
const cssStr = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';
const para = t => String(t || '').trim().split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const hasRows = (rows, keys) => (rows || []).filter(r => keys.some(k => String(r[k] ?? '').trim()));

function chartSVG(theo, real, title) {
  const W = 640, H = 230, L = 46, R = 70, T = 30, B = 26, iw = W - L - R, ih = H - T - B;
  const vals = [...theo, ...real].map(v => num(v) || 0); const max = Math.max(1, ...vals);
  const step = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / step) * step;
  const y = v => T + ih - (v / top) * ih, bw = iw / 12;
  const ticks = [0, .25, .5, .75, 1].map(f => top * f);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Arial" font-size="10" role="img" aria-label="${esc(title)}">`;
  s += `<g><rect x="${L}" y="6" width="10" height="10" rx="2" fill="#39A3BB"/><text x="${L + 14}" y="15" fill="#262626">Réalisé</text>
        <line x1="${L + 70}" y1="11" x2="${L + 90}" y2="11" stroke="#EB6F4B" stroke-width="2"/><circle cx="${L + 80}" cy="11" r="4" fill="#EB6F4B" stroke="#fff" stroke-width="2"/><text x="${L + 96}" y="15" fill="#262626">Théorique</text></g>`;
  ticks.forEach(t => { s += `<line x1="${L}" x2="${L + iw}" y1="${y(t)}" y2="${y(t)}" stroke="#e3e3e3" stroke-width="1"/><text x="${L - 6}" y="${y(t) + 3}" text-anchor="end" fill="#6D6E71">${fmt(t)}</text>`; });
  real.forEach((v, m) => { const r = num(v) || 0; if (r <= 0) return; const x = L + m * bw + bw * .2, w = bw * .6, yy = y(r), h = T + ih - yy, rr = Math.min(4, h, w / 2);
    s += `<path d="M${x},${T + ih} V${yy + rr} Q${x},${yy} ${x + rr},${yy} H${x + w - rr} Q${x + w},${yy} ${x + w},${yy + rr} V${T + ih} Z" fill="#39A3BB"/>`; });
  const pts = theo.map((v, m) => [L + m * bw + bw / 2, y(num(v) || 0)]);
  s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#EB6F4B" stroke-width="2"/>`;
  pts.forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#EB6F4B" stroke="#fff" stroke-width="2"/>`; });
  const last = pts[11]; s += `<text x="${last[0] + 8}" y="${last[1] + 3}" fill="#262626">Théorique</text>`;
  s += `<line x1="${L}" x2="${L + iw}" y1="${T + ih}" y2="${T + ih}" stroke="#6D6E71"/>`;
  MOIS.forEach((m, i) => { s += `<text x="${L + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" fill="#6D6E71">${m}</text>`; });
  return s + '</svg>';
}

function reportBody(br) {
  const N = br.annee, s = br.saisie, I = k => eff(br, `identite${SEP}${k}`), svc = br.ra.libelle;
  const iss = verify(br), bloq = iss.some(i => i.lvl === 'bloquant');
  const secs = []; // {id, lvl, title, html}
  const add = (id, lvl, title, html) => secs.push({id, lvl, title, html});
  const tbl = (head, rows, cls = '') => `<table class="rt ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const mvt = (o) => tbl([`Présents au 01/01/${N}`, 'Entrées', 'Sorties', `Présents au 31/12/${N}`], [['debut', 'entrees', 'sorties', 'fin'].map(k => esc(o[k]))], 'num');

  // Introduction
  const cadre = hasRows(s.intro.cadre, ['annee', 'texte', 'apport']);
  add('intro', 1, 'Introduction', '');
  add('intro-ctx', 2, 'Contexte national et local', para(s.intro.contexte));
  add('intro-hist', 2, 'Historique du service', para(s.intro.historique));
  if (cadre.length) add('intro-cadre', 2, 'Cadre légal', tbl(['Année', 'Texte de référence', 'Apport clé'], cadre.map(r => [esc(r.annee), esc(r.texte), esc(r.apport)])));

  // I
  add('i', 1, 'I. Présentation du service', '');
  const idRows = [['Service', I('service')], ['Secteur', I('secteur')], ['Direction', I('direction')], ['Directeur', I('directeur')], ['Chef de service', I('chef_de_service')],
    ['ESMS', I('esms')], ['FINESS', I('finess')], ['Adresse', s.ident.adresse], ['Téléphone', s.ident.telephone], ['Mail', s.ident.mail], ['Sites', I('sites')], ['Communes', I('communes')],
    ["Date de l'arrêté d'autorisation", s.ident.date_arrete], ["Date d'ouverture", s.ident.date_ouverture], ['Capacité', I('capacite') != null ? fmt(num(I('capacite')), 1) : ''],
    ['Nombre de bénéficiaires', s.ident.nb_beneficiaires], [`ETP budgétés au BP${N}`, s.ident.etp_bp], ['Financeurs', s.ident.financeurs], ["Jours et horaires d'ouverture", s.ident.horaires]]
    .filter(r => String(r[1] ?? '').trim());
  add('i1', 2, '1. Informations principales', `<table class="rt ident"><tbody>${idRows.map(r => `<tr><th>${r[0]}</th><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>`);
  add('i2', 2, '2. Missions et objectifs', para(s.missions));
  const ages = hasRows(s.public.ages, ['tranche', 'nb']);
  const rep = (String(s.public.femmes).trim() || String(s.public.hommes).trim() || ages.length) ? `<div class="two">
      ${String(s.public.femmes).trim() || String(s.public.hommes).trim() ? tbl(['Répartition par sexe', 'Nb'], [['Femmes / filles', esc(s.public.femmes)], ['Hommes / garçons', esc(s.public.hommes)]]) : '<div></div>'}
      ${ages.length ? tbl(["Répartition par tranche d'âge", 'Nb'], ages.map(r => [esc(r.tranche), esc(r.nb)])) : ''}</div>` : '';
  add('i3', 2, "3. Public cible et modalités d'accès", para(s.public.texte) + rep);

  // II
  add('ii', 1, 'II. Fonctionnement du service', '');
  const act = hasRows(s.activites.tableau, ['activite', 'participants', 'objectifs']);
  add('ii1', 2, '1. Activités et prestations réalisées', para(s.activites.texte) + (act.length ? tbl(['Activité', 'Participants', 'Objectifs'], act.map(r => [esc(r.activite), esc(r.participants), esc(r.objectifs)])) : ''));
  const org = br.sources.organigramme;
  const rh = hasRows(s.rh.tableau, ['fonction']);
  const mvtRH = Object.values(s.rh.mvt).some(v => String(v).trim());
  add('ii2', 2, '2. Organisation du service – Ressources humaines',
    (org ? `<figure class="orga"><img src="${org.data}"><figcaption>Organigramme du service au ${frDate(org.date)}</figcaption></figure>` : `<p class="note">Organigramme non transmis.</p>`) +
    (rh.length ? tbl(['Fonction', 'ETP budgétés', 'ETP réels'], [...rh.map(r => [esc(r.fonction), fmt(num(r.etp_bud), 2), fmt(num(r.etp_reel), 2)]), ['<b>Total</b>', `<b>${fmt(sum(rh.map(r => r.etp_bud)), 2)}</b>`, `<b>${fmt(sum(rh.map(r => r.etp_reel)), 2)}</b>`]], 'etp') : '') +
    (mvtRH ? '<h3>Mouvements du personnel</h3>' + mvt(s.rh.mvt) : '') + (s.rh.formations.trim() ? '<h3>Formations</h3>' + para(s.rh.formations) : ''));
  const part = hasRows(s.partenariats.tableau, ['partenaire', 'nature']);
  if (part.length || s.partenariats.texte.trim()) add('ii3', 2, '3. Partenariats et communication',
    (part.length ? tbl(['Partenaire', 'Type', 'Nature des actions', 'Conventionné'], part.map(r => [esc(r.partenaire), esc(r.type), esc(r.nature), esc(r.conv)])) : '') + para(s.partenariats.texte));
  // II.4
  let q = '';
  if (br.sources.registre) {
    const R = br.sources.registre;
    q += `<h3>Outils de la loi 2002-2</h3>` + tbl(['Outil', `Situation au 31/12/${N}`, 'Statut', 'Commentaire'], R.outils.map(o => { const v = regEff(br, o.k), st = outilStatut(o, v, br.ra, N);
      return [`${esc(o.label)}<div class="base">${esc(o.base)}</div>`, esc(outilSituation(o, v)), `<span class="st st-${st.s === 'À jour' ? 'ok' : st.s === 'Sans objet' ? 'so' : 'ko'}">${st.s}</span>`, esc(v.commentaire || '')]; }), 'reg');
  }
  const cvs = hasRows(s.qualite.cvs, ['date', 'participants', 'sujets']);
  if (cvs.length) q += `<h3>CVS et groupes d'expression</h3>` + tbl(['Date', 'Participants', 'Sujets traités'], cvs.map(r => [esc(r.date), esc(r.participants), esc(r.sujets)]));
  q += `<h3>Bilan des événements indésirables</h3>`;
  const f = br.sources.fei;
  if (!f?.imported) q += `<p class="note">Données Ageval non disponibles.</p>`;
  else {
    const F = k => eff(br, `fei${SEP}${k}`), n = num(F('n')) || 0;
    if (n === 0) q += `<p>Aucun événement indésirable déclaré dans Ageval en ${N}.</p>`;
    else {
      q += `<p><b>${fmt(n)}</b> fiche(s) d'événement indésirable déclarée(s) en ${N}${f.nN1 != null ? ` (${fmt(num(F('nN1')))} en ${N - 1})` : ''}.</p>`;
      if (n >= 3) {
        const kv = (base, lab) => { const o = f[base]; const rows = Object.keys(o).map(k => [esc(k), fmt(num(F(base + SEP + k)))]).filter(r => r[1] !== '—' && r[1] !== '0' || base === 'grav'); return tbl([lab, 'Nb'], rows); };
        q += `<div class="two">${kv('cats', 'Catégorie')}${kv('grav', 'Gravité')}</div><p class="note">Une FEI peut relever de plusieurs catégories : le total des catégories peut dépasser le nombre de FEI.</p>`;
        q += tbl(['Avancement', 'Nb'], Object.keys(f.avancement).map(k => [k, fmt(num(F('avancement' + SEP + k)))]));
        const dec = num(F('declN')) || 0;
        q += `<p>Délai moyen de traitement des FEI terminées : <b>${F('delai') != null ? fmt(num(F('delai'))) + ' jours' : 'non calculable'}</b>. Déclarations obligatoires : <b>${fmt(dec)}</b>${dec && Object.keys(f.autorites).length ? ' (' + Object.entries(f.autorites).map(([k, v]) => `${esc(k)} : ${v}`).join(', ') + ')' : ''}.</p>`;
      }
      q += para(s.qualite.fei_analyse);
    }
  }
  add('ii4', 2, '4. Démarche qualité', q);

  // III
  add('iii', 1, `III. Bilan de l'activité ${N}`, '');
  let a = '';
  const bl = br.sources.activite;
  if (!bl.length) a += `<p class="note">Aucune donnée du suivi d'activité ${N} rattachée à ce service.</p>`;
  const tot = {theorique: 0, previsionnel: 0, realise: 0, hasPrev: false};
  bl.forEach((b, i) => {
    const e = blockEff(br, i), p = b.params || {};
    if (!e.theorique || !e.realise) return;
    const T = sum(e.theorique), Rr = sum(e.realise), Pv = e.previsionnel ? sum(e.previsionnel) : null;
    tot.theorique += T; tot.realise += Rr; if (Pv != null) { tot.previsionnel += Pv; tot.hasPrev = true; }
    if (bl.length > 1) a += `<h3>${esc(b.libelle)}${b.code ? ` (${esc(b.code)})` : ''}</h3>`;
    a += tbl(['Indicateur', 'Valeur'], [
      ...(p.places != null ? [[esc(p.places_label || 'Nombre de places'), fmt(num(p.places), 1)]] : []),
      ...(p.prix != null ? [['Prix journalier', fmt(num(p.prix), 2) + ' €']] : []),
      ...(e.jours ? [["Jours d'ouverture", fmt(sum(e.jours))]] : []),
      ['Volume théorique', fmt(T)], ...(Pv != null ? [['Volume prévisionnel', fmt(Pv)]] : []), ['Réalisé', fmt(Rr)],
      ['<b>Taux d\'occupation (réalisé / théorique)</b>', `<b>${T ? pct(Rr / T) : '—'}</b>`],
      ...(Pv ? [['Écart réalisé / prévisionnel', `${fmt(Rr - Pv)} (${pct((Rr - Pv) / Pv)})`]] : []),
      ...(e.facturation ? [['Montant de la facturation', fmt(sum(e.facturation)) + ' €']] : [])], 'synth');
    const rows = [['Théorique', e.theorique], ...(e.previsionnel ? [['Prévisionnel', e.previsionnel]] : []), ['Réalisé', e.realise], ...(e.file_active ? [['File active', e.file_active]] : [])];
    a += `<table class="rt mens"><thead><tr><th></th>${MOIS.map(m => `<th>${m}</th>`).join('')}<th>Total</th></tr></thead><tbody>
      ${rows.map(([l, v]) => `<tr><th>${l}</th>${v.map(x => `<td>${fmt(num(x))}</td>`).join('')}<td><b>${l === 'File active' ? '' : fmt(sum(v))}</b></td></tr>`).join('')}
      <tr><th>Taux</th>${e.realise.map((r, m) => `<td>${num(e.theorique[m]) ? pct(num(r) / num(e.theorique[m])) : '—'}</td>`).join('')}<td><b>${T ? pct(Rr / T) : '—'}</b></td></tr></tbody></table>`;
    a += `<figure class="chart">${chartSVG(e.theorique, e.realise, `Activité mensuelle ${b.libelle}`)}<figcaption>Activité mensuelle ${N} : réalisé et théorique – ${esc(b.libelle)}</figcaption></figure>`;
  });
  if (bl.length > 1 && tot.theorique) a += `<h3>Synthèse des dispositifs</h3>` + tbl(['Volume théorique', ...(tot.hasPrev ? ['Volume prévisionnel'] : []), 'Réalisé', "Taux d'occupation"], [[fmt(tot.theorique), ...(tot.hasPrev ? [fmt(tot.previsionnel)] : []), fmt(tot.realise), pct(tot.realise / tot.theorique)]], 'num');
  const n1 = br.sources.activiteN1;
  if (bl.length && n1.length) {
    const rows = bl.map((b, i) => { const e = blockEff(br, i); const p = n1.find(x => x.code && x.code === b.code) || (bl.length === 1 && n1.length === 1 ? n1[0] : null); if (!p || !e.realise) return null;
      const T = sum(e.theorique || []), Rr = sum(e.realise);
      return [esc(b.libelle), fmt(p.realise), p.theorique ? pct(p.realise / p.theorique) : '—', fmt(Rr), T ? pct(Rr / T) : '—', p.realise ? pct((Rr - p.realise) / p.realise) : '—']; }).filter(Boolean);
    if (rows.length) a += `<h3>Comparaison ${N - 1} / ${N}</h3>` + tbl(['Dispositif', `Réalisé ${N - 1}`, `Taux ${N - 1}`, `Réalisé ${N}`, `Taux ${N}`, 'Évolution du réalisé'], rows, 'num');
  }
  if (Object.values(s.bilan.mvt).some(v => String(v).trim())) a += `<h3>Mouvements des personnes accompagnées</h3>` + mvt(s.bilan.mvt);
  const comp = hasRows(s.bilan.complementaires, ['indicateur', 'valeur']);
  const mod = moduleFor(br.ra);
  if (comp.length) a += `<h3>${esc(mod ? mod[1] : 'Indicateurs complémentaires')}</h3>` + tbl(['Indicateur', 'Valeur', 'Commentaire'], comp.map(r => [esc(r.indicateur), esc(r.valeur), esc(r.commentaire)]));
  if (s.bilan.commentaire.trim()) a += `<h3>Analyse</h3>` + para(s.bilan.commentaire);
  add('iii1', 2, '1. Bilan quantitatif', a);
  add('iii2', 2, '2. Bilan qualitatif', para(s.qualitatif));

  // IV
  add('iv', 1, `IV. Conclusion et perspectives ${N + 1}`, '');
  const suivi = (s.conclusion.suivi || []).filter(r => String(r.realisation || '').trim());
  add('iv1', 2, `1. Bilan général de l'année ${N}`, para(s.conclusion.bilan) + (suivi.length ? `<h3>Suivi des perspectives fixées dans le RA ${N - 1}</h3>` + tbl(['Objectif', 'Réalisation', 'Commentaire'], suivi.map(r => [esc(r.objectif), esc(r.realisation), esc(r.commentaire)])) : ''));
  const persp = hasRows(s.conclusion.perspectives, ['objectif', 'actions']);
  add('iv2', 2, `2. Perspectives pour ${N + 1}`, persp.length ? tbl(['Objectif', 'Actions', 'Échéance', 'Indicateur de suivi'], persp.map(r => [esc(r.objectif), esc(r.actions), esc(r.echeance), esc(r.indicateur)])) : '');

  // Annexes
  const anx = s.annexes.filter(x => x.data);
  const ecarts = Object.entries(br.ecarts);
  const showEcarts = ecarts.length && (br.statut !== 'Validé' || br.params.annexeEcartsValide);
  if (anx.length || showEcarts) {
    add('ann', 1, 'Annexes', '');
    if (anx.length) add('ann-img', 2, 'Illustrations', anx.map((x, i) => `<figure class="anx"><img src="${x.data}"><figcaption>Annexe ${i + 1}${x.legende ? ' – ' + esc(x.legende) : ''}</figcaption></figure>`).join(''));
    if (showEcarts) add('ann-ecarts', 2, 'Écarts aux données sources', tbl(['Section', 'Donnée', 'Valeur source', 'Valeur saisie', 'Motif', 'Date'], ecarts.map(([p, e]) => [esc(e.section), esc(e.label), esc(e.source ?? '—'), esc(e.value ?? '—'), esc(e.motif), frDate(e.date)]), 'small'));
  }
  return {secs: secs.filter(x => x.lvl === 1 || String(x.html).replace(/<[^>]+>/g, '').trim() || /<img|<svg/.test(x.html)), bloq};
}

function reportDoc(br) {
  const N = br.annee, svc = br.ra.libelle, P = br.params;
  const {secs, bloq} = reportBody(br);
  // supprimer les titres de niveau 1 sans sous-section
  const kept = secs.filter((x, i) => x.lvl !== 1 || x.html || (secs[i + 1] && secs[i + 1].lvl === 2));
  const logo = br.logos?.mlezi ? `<img src="${br.logos.mlezi}" alt="Mlezi Maore – GROUPE SOS">` : `<span class="logo-txt">MLEZI MAORE · GROUPE SOS</span>`;
  const sos = br.logos?.sos ? `<img src="${br.logos.sos}" alt="GROUPE SOS">` : '';
  const val = br.validation ? `${esc(br.validation.nom)} (DGA), le ${frDate(br.validation.date)}` : `${esc(P.approbateur)} (DGA) – en attente`;
  const pageLabel = `RAPPORT D'ACTIVITÉ ${N} – ${svc.toUpperCase()}`;
  const footer = `Mlezi Maore une association du GROUPE SOS – ${P.adresse} – Tél. 02 69 61 64 00 – secretariat@mlezi-maore.com – www.mlezi-maore.com`;
  const body = `
  <section class="cover">
    <div class="cv-logo">${logo}</div>
    <table class="cartouche"><tbody>
      <tr><th colspan="2" class="ct">RAPPORT D'ACTIVITÉ</th></tr>
      <tr><th>Service</th><td>${esc(svc)}</td></tr>
      <tr><th>Rédacteur</th><td>${esc(br.ra.redacteur)}</td></tr>
      <tr><th>Pilote</th><td>${esc(br.ra.directeur)}</td></tr>
      <tr><th>Année</th><td>${N}</td></tr>
      <tr><th>Statut</th><td>${esc(br.statut)}</td></tr>
      <tr><th>Validation</th><td>${val}</td></tr>
      <tr><th>Page</th><td>1 sur <span class="nbp">…</span></td></tr></tbody></table>
    ${bloq ? `<div class="bandeau">Brouillon — incomplet</div>` : ''}
    <div class="cv-title"><div class="t1">Rapport d'activité</div><div class="t2">${esc(svc)} ${N}</div></div>
    <div class="cv-foot"><div class="addr"><b>Mlezi Maore</b><br>${esc(P.adresse)}<br>Tél. 02 69 61 64 00<br>secretariat@mlezi-maore.com<br>www.mlezi-maore.com</div>
      <div class="sos">${sos}<div class="mention">${esc(P.mention)}</div></div></div>
  </section>
  <div class="runlogo">${logo}</div>
  <div class="pfoot">${esc(footer)}</div>
  <section class="toc"><div class="toc-t">SOMMAIRE</div>
    ${kept.map(x => `<a class="l${x.lvl}" href="#${x.id}"><span>${esc(x.title)}</span></a>`).join('')}
  </section>
  ${kept.map(x => `${x.lvl === 1 ? `<h1 id="${x.id}" class="${x.id === 'intro' ? 'first' : ''}">${esc(x.title)}</h1>` : `<h2 id="${x.id}">${esc(x.title)}</h2>`}${x.html}`).join('\n')}`;
  const css = `
  @page{size:A4;margin:26mm 16mm 22mm 16mm;
    @top-left{content:element(runlogo);vertical-align:bottom;padding-bottom:3mm}
    @bottom-left{content:element(pfoot);width:120mm;vertical-align:top;padding-top:3mm}
    @bottom-right{content:counter(page) " | " ${cssStr(pageLabel)};font:bold 7pt Arial,sans-serif;color:#CC071E;vertical-align:top;padding-top:3mm;text-align:right}}
  @page:first{margin:12mm 16mm 12mm 16mm;@top-left{content:none}@bottom-left{content:none}@bottom-right{content:none}}
  html{font-family:Arial,Helvetica,sans-serif;color:#262626;font-size:10pt;line-height:1.4}
  body{margin:0}
  .runlogo{position:running(runlogo)} .runlogo img{width:34mm} .logo-txt{color:#CC071E;font-weight:bold;font-size:9pt}
  .pfoot{position:running(pfoot);font-size:6.5pt;color:#6D6E71;line-height:1.3}
  .cover{height:266mm;position:relative;break-after:page}
  .cv-logo img{width:46mm}
  .cartouche{position:absolute;top:0;right:0;width:88mm;border-collapse:collapse;font-size:8.5pt}
  .cartouche th,.cartouche td{border:1px solid #CC071E;padding:1.6mm 2mm;text-align:left;vertical-align:top}
  .cartouche th{width:25mm;color:#CC071E}
  .cartouche .ct{background:#CC071E;color:#fff;text-align:center;letter-spacing:.06em}
  .bandeau{position:absolute;top:62mm;left:0;right:0;text-align:center;background:#F7C450;color:#262626;font-weight:bold;font-size:14pt;padding:3mm;text-transform:uppercase;letter-spacing:.05em}
  .cv-title{position:absolute;top:110mm;left:0;right:0;text-align:center}
  .cv-title .t1{font-size:30pt;color:#CC071E;font-weight:bold;text-transform:uppercase;letter-spacing:.03em}
  .cv-title .t2{font-size:20pt;margin-top:6mm}
  .cv-title::after{content:"";display:block;width:40mm;height:2.5mm;background:#7ED957;margin:8mm auto 0}
  .cv-foot{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #CC071E;padding-top:4mm}
  .cv-foot .addr{font-size:8pt;color:#6D6E71;line-height:1.45}
  .cv-foot .sos{text-align:right} .cv-foot .sos img{width:24mm;display:block;margin-left:auto}
  .cv-foot .mention{font-size:8pt;font-weight:bold;margin-top:2mm}
  .toc{break-after:page}
  .toc-t{color:#CC071E;font-size:16pt;font-weight:bold;margin:0 0 6mm;border-bottom:2px solid #7ED957;padding-bottom:1.5mm}
  .toc a{display:flex;color:#262626;text-decoration:none;margin:1.4mm 0}
  .toc a.l1{font-weight:bold;text-transform:uppercase;margin-top:3.5mm;color:#CC071E}
  .toc a.l2{padding-left:7mm}
  .toc a span{flex:1}
  .toc a::after{content:target-counter(attr(href), page);padding-left:3mm}
  h1{color:#CC071E;font-size:15pt;text-transform:uppercase;margin:0 0 5mm;border-bottom:2px solid #7ED957;padding-bottom:1.5mm;break-before:page;break-after:avoid}
  h2{font-size:12pt;margin:6mm 0 2.5mm;color:#262626;break-after:avoid}
  h3{font-size:10pt;margin:4mm 0 1.5mm;color:#CC071E;break-after:avoid}
  p{margin:0 0 2.5mm;text-align:justify;orphans:3;widows:3}
  table.rt{border-collapse:collapse;width:100%;margin:2mm 0 4mm;font-size:8.5pt;break-inside:auto}
  table.rt tr{break-inside:avoid}
  table.rt th{background:#CC071E;color:#fff;text-align:left;padding:1.4mm 2mm;font-weight:bold}
  table.rt td{border-bottom:.3mm solid #d9d9d9;padding:1.3mm 2mm;vertical-align:top}
  table.rt.ident th{background:#f2f2f2;color:#262626;width:55mm;border-bottom:.3mm solid #fff}
  table.rt.num td,table.rt.etp td+td,table.rt.synth td+td{text-align:right}
  table.mens{font-size:7pt} table.mens th,table.mens td{padding:1mm .8mm;text-align:right} table.mens tbody th{background:#f2f2f2;color:#262626;text-align:left}
  table.rt.reg .base{font-size:7pt;color:#6D6E71}
  table.rt.small{font-size:7.5pt}
  .st{font-weight:bold} .st-ok{color:#3f8a1f} .st-ko{color:#CC071E} .st-so{color:#6D6E71}
  .two{display:flex;gap:6mm} .two>*{flex:1}
  figure{margin:3mm 0;break-inside:avoid;text-align:center} figure img{max-width:100%;max-height:200mm} figure.chart svg{width:100%}
  figcaption{font-size:8pt;color:#6D6E71;font-style:italic;margin-top:1.5mm}
  .note{font-size:8.5pt;color:#6D6E71;font-style:italic}`;
  return {css, body, title: `RA_${N}_${safeName(svc)}`};
}
function pagedHTML({css, body, title}, autoPrint) {
  const lib = document.getElementById('lib-paged').textContent;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style>
  <script>window.PagedConfig={auto:true,after:function(flow){var n=flow&&flow.total||document.querySelectorAll('.pagedjs_page').length;document.querySelectorAll('.nbp').forEach(function(e){e.textContent=n});document.body.setAttribute('data-ready','1');${autoPrint ? "setTimeout(function(){window.print()},400);" : ''}}};<\/script>
  <script>${lib}<\/script>
  <style>@media screen{body{background:#e9e9e7}.pagedjs_pages{display:flex;flex-direction:column;align-items:center;gap:8mm;padding:8mm 0}.pagedjs_page{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)}}</style>
  </head><body>${body}</body></html>`;
}

function controleDoc(br) {
  const N = br.annee, iss = verify(br), ec = Object.entries(br.ecarts);
  const body = `<div class="runlogo">${br.logos?.mlezi ? `<img src="${br.logos.mlezi}">` : '<span class="logo-txt">MLEZI MAORE · GROUPE SOS</span>'}</div>
  <h1 style="break-before:auto">Rapport de contrôle qualité</h1>
  <p><b>${esc(br.ra.libelle)}</b> – RA ${N} – statut : ${esc(br.statut)} – contrôle du ${frDate(nowISO())}</p>
  ${br.altere ? '<p class="ko"><b>Données sources altérées :</b> l\'empreinte du brouillon ne correspond plus aux données sources générées par le Siège.</p>' : ''}
  <h2>1. Écarts aux données sources (${ec.length})</h2>
  ${ec.length ? `<table class="rt small"><thead><tr><th>Section</th><th>Donnée</th><th>Source</th><th>Saisie</th><th>Motif</th><th>Date</th><th>Décision</th></tr></thead><tbody>
  ${ec.map(([p, e]) => `<tr><td>${esc(e.section)}</td><td>${esc(e.label)}</td><td>${esc(e.source ?? '—')}</td><td>${esc(e.value ?? '—')}</td><td>${esc(e.motif)}</td><td>${frDate(e.date)}</td><td>${esc(e.decision || 'À décider')}</td></tr>`).join('')}</tbody></table>` : '<p>Aucun écart.</p>'}
  <h2>2. Alertes du contrôle « Vérifier » (${iss.filter(i => i.lvl !== 'info').length})</h2>
  ${iss.filter(i => i.lvl !== 'info' && !/^(Organigramme|Export FEI|0 FEI)/.test(i.msg)).map(i => `<p>[${i.lvl}] <b>${esc(i.sec)}</b> – ${esc(i.msg)}</p>`).join('') || '<p>Aucune alerte.</p>'}
  <h2>3. Pièces manquantes</h2>
  ${iss.filter(i => /^(Organigramme|Export FEI|0 FEI)/.test(i.msg)).map(i => `<p>${esc(i.msg)}</p>`).join('') || '<p>Aucune.</p>'}
  <h2>Journal</h2><table class="rt small"><thead><tr><th>Date</th><th>Statut</th><th>Nom</th><th>Fonction</th><th>Commentaire</th></tr></thead><tbody>
  ${(br.journal || []).map(j => `<tr><td>${frDateTime(j.date)}</td><td>${esc(j.statut)}</td><td>${esc(j.nom)}</td><td>${esc(j.fonction)}</td><td>${esc(j.commentaire)}</td></tr>`).join('')}</tbody></table>`;
  const css = reportDoc(br).css + `@page:first{margin:26mm 16mm 22mm 16mm;@top-left{content:element(runlogo)}@bottom-left{content:element(pfoot)}@bottom-right{content:counter(page)}} .ko{color:#CC071E}`;
  return {css, body: body.replace('<div class="runlogo">', '<div class="pfoot">Rapport de contrôle qualité – usage interne Siège</div><div class="runlogo">'), title: `Controle_RA_${N}_${safeName(br.ra.libelle)}`};
}
