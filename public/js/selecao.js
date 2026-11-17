// Avaliação do processo seletivo (página do gestor): critérios de 1 a 3 e perguntas complementares numa tela só.
const rsParams = new URLSearchParams(location.search);
const rsToken = rsParams.get('t') || '';
const rsPrevia = rsParams.has('previa');
const rsConteudo = document.getElementById('rs-conteudo');
let rs = null;
const rsRespostas = {};
const rsPrimeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';

/** Notas de 1 a 3: as opções vêm da melhor para a pior; a tela mostra da pior (1) para a melhor (3). */
function rsGrade(p, destaque) {
  const escala = [...p.opcoes].reverse();
  return `<div class="rs-grade" data-q="${esc(p.id)}" style="--n:${escala.length}">
    ${destaque ? '' : `<div class="rs-leg" aria-hidden="true"><span>${esc(p.texto)}</span>${escala.map((o, k) => `<span><i>${k + 1}</i>${esc(o)}</span>`).join('')}</div>`}
    ${p.itens.map((it, k) => `<div class="rs-cr ${destaque ? 'destaque' : ''}" role="radiogroup" aria-label="${esc(it)}" data-item="${esc(it)}">
      <p>${esc(it)}</p>
      ${escala.map((o, n) => `<label class="rs-op"><input type="radio" name="${esc(p.id)}-${k}" value="${esc(o)}"><i class="rs-d"></i><span>${n + 1} · ${esc(o)}</span></label>`).join('')}
    </div>`).join('')}
  </div>`;
}

function rsPergunta(p, n) {
  const cab = `<p><b>${n}</b><span>${esc(p.texto)}${p.obrigatoria ? '' : ' <small>(opcional)</small>'}</span></p>`;
  if (p.tipo === 'unica' || p.tipo === 'multipla') {
    const tipo = p.tipo === 'unica' ? 'radio' : 'checkbox';
    return `<div class="rs-q" data-q="${esc(p.id)}">${cab}<div class="rs-ops">
      ${p.opcoes.map(o => `<label class="rs-linha"><input type="${tipo}" name="${esc(p.id)}" value="${esc(o)}"><i class="rs-d"></i>${esc(o)}</label>`).join('')}</div></div>`;
  }
  return `<div class="rs-q" data-q="${esc(p.id)}">${cab}<textarea rows="${p.tipo === 'curto' ? 1 : 3}" maxlength="3000" placeholder="Escreva aqui…"></textarea></div>`;
}

function rsRender() {
  const { form, vaga } = rs;
  document.getElementById('rs-titulo').textContent = form.titulo;
  document.title = `${form.titulo} · Jornada Âmbar`;
  document.getElementById('rs-intro').textContent = `${vaga.gestor && !rsPrevia ? `Olá, ${rsPrimeiro(vaga.gestor)}! ` : ''}${form.introducao || ''}`;
  let n = 0;
  rsConteudo.innerHTML = `
    ${rsPrevia ? '<p class="rs-aviso">👁 Pré-visualização: as respostas não são enviadas.</p>' : ''}
    <div class="rs-vaga">
      ${[['Vaga', vaga.vaga], ['Pessoa aprovada', vaga.candidato], ['Regional · usina', [vaga.regional, vaga.usina].filter(Boolean).join(' · ')], ['Recrutador(a)', vaga.recrutador]]
        .map(([k, v]) => `<div><small>${k}</small><strong>${esc(v || '–')}</strong></div>`).join('')}
    </div>
    <form id="rs-form" novalidate>
      ${form.secoes.map((s, i) => `<section class="rs-bloco"><div class="rs-bt"><b>${i + 1}</b><h2>${esc(s.titulo)}</h2></div>
        ${s.subtitulo ? `<p class="rs-sub">${esc(s.subtitulo)}</p>` : ''}
        ${s.perguntas.map((p, j) => (p.tipo === 'grade' ? rsGrade(p, j > 0 && s.perguntas[j - 1].tipo === 'grade') : rsPergunta(p, ++n))).join('')}
      </section>`).join('')}
      <div class="rs-enviar"><span class="rs-prog"><i><u id="rs-barra" style="width:0"></u></i><span id="rs-conta"></span></span>
        <button class="rs-btn" type="submit">${rsPrevia ? 'Concluir pré-visualização' : 'Enviar avaliação'} <b aria-hidden="true">→</b></button></div>
    </form>`;
  const f = document.getElementById('rs-form');
  f.addEventListener('change', rsLer);
  f.addEventListener('input', rsLer);
  f.addEventListener('submit', rsEnviar);
  rsLer();
}

/** Lê o formulário para o estado e atualiza o progresso das respostas obrigatórias. */
function rsLer() {
  let total = 0, feitas = 0;
  for (const s of rs.form.secoes) for (const p of s.perguntas) {
    const el = rsConteudo.querySelector(`[data-q="${CSS.escape(p.id)}"]`);
    if (p.tipo === 'grade') {
      const valor = {};
      el.querySelectorAll('[data-item]').forEach(l => {
        const m = l.querySelector('input:checked');
        if (m) { valor[l.dataset.item] = m.value; l.classList.remove('falta'); }
      });
      rsRespostas[p.id] = { valor };
      if (p.obrigatoria) { total += p.itens.length; feitas += Object.keys(valor).length; }
    } else if (p.tipo === 'unica') {
      const m = el.querySelector('input:checked');
      if (m) { rsRespostas[p.id] = { valor: m.value }; el.classList.remove('falta'); }
      if (p.obrigatoria) { total += 1; feitas += m ? 1 : 0; }
    } else if (p.tipo === 'multipla') {
      rsRespostas[p.id] = { valor: [...el.querySelectorAll('input:checked')].map(i => i.value) };
      if (p.obrigatoria) { total += 1; feitas += rsRespostas[p.id].valor.length ? 1 : 0; }
    } else {
      rsRespostas[p.id] = { valor: el.querySelector('textarea').value };
      if (p.obrigatoria) { total += 1; feitas += rsRespostas[p.id].valor.trim() ? 1 : 0; }
    }
  }
  document.getElementById('rs-barra').style.width = `${total ? (feitas / total) * 100 : 100}%`;
  document.getElementById('rs-conta').textContent = `${feitas} de ${total} respostas obrigatórias`;
  return feitas === total;
}

/** Primeiro item obrigatório sem resposta (destacado). */
function rsFaltando() {
  let primeiro = null;
  for (const s of rs.form.secoes) for (const p of s.perguntas) {
    if (!p.obrigatoria) continue;
    const el = rsConteudo.querySelector(`[data-q="${CSS.escape(p.id)}"]`);
    const v = rsRespostas[p.id]?.valor;
    if (p.tipo === 'grade') {
      el.querySelectorAll('[data-item]').forEach(l => { const falta = !v?.[l.dataset.item]; l.classList.toggle('falta', falta); if (falta && !primeiro) primeiro = l; });
    } else if (!v || (Array.isArray(v) ? !v.length : !String(v).trim())) { el.classList.add('falta'); if (!primeiro) primeiro = el; }
  }
  return primeiro;
}

async function rsEnviar(e) {
  e.preventDefault();
  if (!rsLer()) {
    rsFaltando()?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return toast('Responda os itens destacados para enviar. 🙂', 'erro');
  }
  if (rsPrevia) return rsFim(false);
  const btn = e.submitter || e.target.querySelector('.rs-btn');
  btn.disabled = true;
  try {
    await api(`/api/selecao/${encodeURIComponent(rsToken)}`, { method: 'POST', body: { respostas: rsRespostas } });
    rsFim(false);
  } catch (err) { toast(err.message, 'erro'); btn.disabled = false; }
}

function rsFim(jaRespondida) {
  const nome = rsPrimeiro(rs?.vaga?.gestor);
  rsConteudo.innerHTML = `<div class="rs-fim"><span class="rs-fim-ic" aria-hidden="true">✓</span>
    <h2>${jaRespondida ? 'Esta avaliação já foi registrada' : 'Obrigado por compartilhar'}${nome && !rsPrevia ? `, <em>${esc(nome)}</em>` : ''}!</h2>
    <p>${jaRespondida ? 'Recebemos sua avaliação deste processo seletivo. ' : ''}Sua percepção ajuda o time de Recrutamento e Seleção a construir processos cada vez mais assertivos, ágeis e conectados às necessidades do negócio.</p>
    ${rsPrevia ? '<p class="rs-aviso" style="display:inline-block;margin-top:1rem">👁 Pré-visualização: nada foi enviado.</p>' : ''}</div>`;
  window.scrollTo(0, 0);
}

function rsMensagem(titulo, texto) {
  rsConteudo.innerHTML = `<div class="rs-fim"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p></div>`;
}

(async () => {
  if (!rsToken && !rsPrevia) return rsMensagem('Link incompleto', 'Abra o link ou leia o QR Code que você recebeu do time de RH.');
  try {
    rs = await api(rsPrevia ? '/api/selecao/previa' : `/api/selecao/${encodeURIComponent(rsToken)}`);
  } catch (err) { return rsMensagem('Não encontramos este link', err.message); }
  if (rs.status === 'respondida') return rsFim(true);
  if (!rs.form.ativa && !rsPrevia) return rsMensagem('Volte daqui a pouco', 'A avaliação do processo seletivo não está recebendo respostas no momento.');
  rsRender();
})();
