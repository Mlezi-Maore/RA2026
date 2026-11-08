/* ==========================================================================
   Mode Drive : actif quand l'outil est servi par la web app Apps Script.
   Les « téléchargements » deviennent des enregistrements dans le Drive :
   brouillons -> 1. Modèles / 2. En cours / 3. Soumis à validation / 4. Validés DGA (selon le statut),
   campagne -> racine du dossier 2026, exports -> dossier Exports.
   ========================================================================== */
const GAS = typeof google !== 'undefined' && !!(google.script && google.script.run);
const gas = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(e => rej(e))[fn](...a));
const nonRelus = br => Object.values(br.repris || {}).filter(r => !r.relu).length;

if (GAS) {
  // eslint-disable-next-line no-global-assign
  download = function (name, data) {
    const text = typeof data === 'string' ? data : '';
    if (/_brouillon\.json$/.test(name)) {
      const br = JSON.parse(text), action = S._gasAction || 'saisie'; S._gasAction = null;
      return gas('api_saveBrouillon', text, action, {nonRelus: nonRelus(br)})
        .then(r => toast(`Brouillon enregistré dans « ${r.folder} ».`, 5000)).catch(e => modalForm('Enregistrement impossible', [], {intro: esc(e.message || e), ok: 'OK'}));
    }
    if (/^Campagne_RA_/.test(name)) {
      const c = JSON.parse(text); c.brouillons = {}; c.controles = c.controles || {};
      return gas('api_saveCampagne', JSON.stringify(c)).then(() => toast('Campagne enregistrée dans le Drive et suivi mis à jour.', 5000))
        .catch(e => modalForm('Enregistrement impossible', [], {intro: esc(e.message || e), ok: 'OK'}));
    }
    return gas('api_saveExport', name, text).then(() => toast(`« ${name} » déposé dans le dossier Exports.`, 5000))
      .catch(e => modalForm('Export impossible', [], {intro: esc(e.message || e), ok: 'OK'}));
  };
}

async function gasPicker() {
  let list;
  try { list = await gas('api_listBrouillons'); } catch (e) { return modalForm('Drive inaccessible', [], {intro: esc(e.message || e), ok: 'OK'}); }
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  const groups = {}; list.forEach(f => (groups[f.folder] = groups[f.folder] || []).push(f));
  bg.innerHTML = `<div class="modal" style="width:min(640px,94vw)"><h3>Ouvrir un brouillon du Drive</h3>
    <input type="text" placeholder="Filtrer (service…)" data-q="1" style="margin-bottom:8px">
    ${Object.keys(groups).sort().map(g => `<details open><summary>${esc(g)} (${groups[g].length})</summary>${groups[g].map(f => `<div class="row" data-name="${esc(norm(f.name))}" style="justify-content:space-between;border-bottom:1px solid var(--bord);padding:3px 0"><span class="small">${esc(f.name)}</span><button class="btn sm ghost" data-gasopen="${f.id}">Ouvrir</button></div>`).join('')}</details>`).join('') || '<p>Aucun brouillon dans les dossiers.</p>'}
    <div class="act"><button class="btn ghost" data-a="no">Fermer</button></div></div>`;
  document.body.appendChild(bg);
  bg.addEventListener('input', e => { if (e.target.dataset.q) { const q = norm(e.target.value); $$('[data-name]', bg).forEach(r => r.style.display = r.dataset.name.includes(q) ? '' : 'none'); } });
  bg.addEventListener('click', async e => {
    if (e.target.dataset.a === 'no') return bg.remove();
    const id = e.target.dataset.gasopen; if (!id) return;
    try { const o = JSON.parse(await gas('api_getFile', id)); if (o.kind !== 'brouillon') throw new Error('Fichier non reconnu.'); S.br = o; S.view = 'saisie'; bg.remove(); autosave(); render(); toast('Brouillon ouvert : ' + o.ra.libelle); }
    catch (err) { toast('Ouverture impossible : ' + (err.message || err), 6000); }
  });
}
async function gasLoadCampagne() {
  try {
    const t = await gas('api_getCampagne');
    if (!t) return toast('Aucune campagne enregistrée dans le Drive : créez-la puis « Enregistrer la campagne ».', 6000);
    S.camp = JSON.parse(t); S.camp.brouillons = {}; S.view = 'campagne'; render();
    await gasPull();
  } catch (e) { modalForm('Campagne inaccessible', [], {intro: esc(e.message || e), ok: 'OK'}); }
}
async function gasPull() {
  const list = await gas('api_getAllBrouillons');
  await reimport(list.map(x => ({name: x.name, text: async () => x.text})));
}
async function gasInit() {
  if (!GAS) return;
  try { S.who = await gas('api_whoami'); } catch (e) { S.who = {email: '', admin: false}; }
  const hdr = $('header.app'), anchor = $('label.btn', hdr);
  const b1 = document.createElement('button'); b1.className = 'btn sec'; b1.textContent = 'Brouillons du Drive'; b1.onclick = gasPicker; hdr.insertBefore(b1, anchor);
  if (S.who.admin) { const b2 = document.createElement('button'); b2.className = 'btn ghost'; b2.textContent = 'Campagne du Drive'; b2.onclick = gasLoadCampagne; hdr.insertBefore(b2, anchor); }
  else { $('#newCamp').style.display = 'none'; $$('#tabs [data-v="campagne"], #tabs [data-v="controle"]').forEach(b => b.style.display = 'none'); if (S.view !== 'apercu') S.view = 'saisie'; }
  $('#hdrCtx').title = S.who.email || '';
  render();
}
