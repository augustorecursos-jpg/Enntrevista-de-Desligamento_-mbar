// Primeiras Conexões (página do colaborador): abertura com o texto da Âmbar, uma conexão por tela com o mapa
// das conexões acendendo e o agradecimento no fim. Rascunho guardado no aparelho para continuar depois.
const pcParams = new URLSearchParams(location.search);
const pcToken = pcParams.get('t') || '';
const pcPrevia = pcParams.has('previa');
const pcTela = document.getElementById('pc-tela');
const pcChaveRascunho = `primeiras-conexoes:${pcToken || 'previa'}`;
let pc = null;          // { form, pessoa, status, prazo }
let pcEtapa = -1;       // -1 = abertura · 0..n-1 = conexões · n = agradecimento
let pcRespostas = {};

const pcPrimeiro = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';
const pcCurto = (titulo) => String(titulo).split(/\s+(?:e|da|de|do|\|)\s+/i)[0];
const pcParagrafos = (txt) => String(txt || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
const pcData = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

function pcSalvarRascunho() {
  try { localStorage.setItem(pcChaveRascunho, JSON.stringify({ respostas: pcRespostas, etapa: pcEtapa })); } catch { /* sem armazenamento: segue sem rascunho */ }
}
function pcLerRascunho() {
  try { return JSON.parse(localStorage.getItem(pcChaveRascunho) || 'null'); } catch { return null; }
}
function pcApagarRascunho() {
  try { localStorage.removeItem(pcChaveRascunho); } catch { /* nada a apagar */ }
}

// ---------- Mapa das conexões ----------
/** Rede com um ponto por conexão em volta do centro; as conexões concluídas acendem em laranja. */
function pcMapa({ total, atual = -1, feitas = 0, rotulos = [], centro = '' }) {
  const cx = 150, cy = 150, raio = 108;
  const pts = Array.from({ length: total }, (_, i) => {
    const ang = (-90 + (i * 360) / total) * Math.PI / 180;
    return { x: cx + raio * Math.cos(ang), y: cy + raio * Math.sin(ang), cos: Math.cos(ang), sin: Math.sin(ang) };
  });
  const feita = (i) => i < feitas;
  const raios = pts.map((p, i) => `<path d="M${cx} ${cy}L${p.x.toFixed(1)} ${p.y.toFixed(1)}" class="${feita(i) || i === atual ? 'ac' : ''}"/>`).join('');
  const borda = pts.map((p, i) => {
    const q = pts[(i + 1) % total];
    return `<path d="M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${q.x.toFixed(1)} ${q.y.toFixed(1)}" class="${feita(i) && feita((i + 1) % total) ? 'ac' : ''}"/>`;
  }).join('');
  const nos = pts.map((p, i) => `<g class="pc-no ${feita(i) ? 'feito' : ''} ${i === atual ? 'atual' : ''}">
    ${i === atual ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="21" class="halo"/>` : ''}
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${i === atual ? 13 : 10}"/></g>`).join('');
  const textos = rotulos.length ? pts.map((p, i) => {
    const ancora = p.cos > 0.3 ? 'start' : p.cos < -0.3 ? 'end' : 'middle';
    const x = p.x + p.cos * 22 + (ancora === 'middle' ? 0 : ancora === 'start' ? 2 : -2);
    const palavras = String(rotulos[i]).split(/\s+/);
    const linhas = palavras.length > 1 && rotulos[i].length > 13 ? [palavras.slice(0, Math.ceil(palavras.length / 2)).join(' '), palavras.slice(Math.ceil(palavras.length / 2)).join(' ')] : [rotulos[i]];
    const y = p.y + p.sin * 24 + (p.sin > 0.3 ? 8 : p.sin < -0.3 ? -(linhas.length - 1) * 15 : 4 - (linhas.length - 1) * 7.5);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${ancora}" class="${feita(i) || i === atual ? 'ac' : ''}">${linhas.map((l, k) => `<tspan x="${x.toFixed(1)}" dy="${k ? 15 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
  }).join('') : '';
  return `<svg class="pc-mapa" viewBox="${rotulos.length ? '-92 -22 484 350' : '20 20 260 260'}" fill="none" role="img" aria-label="Conexões: ${feitas} de ${total} concluídas">
    <g class="pc-linhas">${borda}${raios}</g>${nos}
    <circle cx="${cx}" cy="${cy}" r="24" class="pc-centro"/><circle cx="${cx}" cy="${cy}" r="36" class="pc-centro-anel"/>
    ${centro ? `<text x="${cx}" y="${cy + 5}" text-anchor="middle" class="pc-centro-txt">${esc(centro)}</text>` : ''}
    ${textos}</svg>`;
}

// ---------- Telas ----------
function pcLado(conteudo, classe = '') {
  return `<aside class="pc-lado ${classe}"><span class="logo claro"><b>Âmbar</b><small>ENERGIA</small></span>${conteudo}</aside>`;
}

function pcAbertura() {
  const f = pc.form;
  const frases = String(f.chamada || '').split(/(?<=[.!?])\s+/).filter(Boolean);
  const pars = pcParagrafos(f.abertura);
  const corpo = pars.map((t, i) => {
    if (i === pars.length - 1 && pars.length > 1) return `<p class="pc-fecho">${esc(t)}</p>`;
    if (t.length <= 60 && /!$/.test(t)) return `<p class="pc-chamada">${esc(t)}</p>`;
    return `<p>${esc(t)}</p>`;
  }).join('');
  const nome = pcPrimeiro(pc.pessoa?.nome);
  const rascunho = pcLerRascunho();
  const continuar = rascunho && rascunho.etapa > 0 && Object.keys(rascunho.respostas || {}).length;
  document.body.className = 'pc pc-modo-inicio';
  pcTela.innerHTML = `
    ${pcLado(`<p class="pc-kick">JORNADA ÂMBAR · SEUS PRIMEIROS ${esc(String(f.dia_prazo || 15))} DIAS</p>
      <div class="pc-rede">${pcMapa({ total: 7, feitas: 0 })}</div>
      <p class="pc-tag">${frases.map((s, i) => (i === frases.length - 1 ? `<em>${esc(s)}</em>` : esc(s))).join('<br>')}</p>
      ${f.assinatura ? `<p class="pc-ass">${esc(f.assinatura)}</p>` : ''}`, 'pc-lado-inicio')}
    <main class="pc-palco pc-palco-inicio">
      <div class="pc-abertura">
        ${pcPrevia ? '<p class="pc-aviso">👁 Pré-visualização: as respostas não são enviadas.</p>' : ''}
        <p class="pc-tit">${esc(f.titulo).toUpperCase()}</p>
        ${nome ? `<p class="pc-ola">Olá, <strong>${esc(nome)}</strong>! 👋</p>` : ''}
        <div class="pc-texto">${corpo}</div>
        <div class="pc-acoes">
          <button type="button" class="pc-btn" id="pc-comecar">${continuar ? 'Continuar de onde parei' : 'Começar minhas conexões'} <b aria-hidden="true">→</b></button>
          <span class="pc-info">${f.secoes.length} conexões · cerca de 7 minutos${pc.prazo && !pcPrevia && pc.prazo >= new Date().toISOString().slice(0, 10) ? ` · responda até ${pcData(pc.prazo)}` : ''}</span>
        </div>
        ${f.introducao ? `<p class="pc-sigilo">🔒 ${esc(f.introducao)}</p>` : ''}
      </div>
    </main>`;
  document.getElementById('pc-comecar').addEventListener('click', () => {
    if (continuar) { pcRespostas = rascunho.respostas; pcIr(Math.min(rascunho.etapa, f.secoes.length - 1)); } else pcIr(0);
  });
}

function pcPergunta(p) {
  const r = pcRespostas[p.id] || {};
  if (p.tipo === 'grade') {
    const escala = [...p.opcoes].reverse(); // da discordância para a concordância, como de costume
    return `<div class="pc-grade" data-q="${esc(p.id)}" style="--n:${escala.length}">
      <p class="pc-grade-instr">${esc(p.texto)}</p>
      <div class="pc-leg" aria-hidden="true"><span></span>${escala.map(o => `<span>${esc(o)}</span>`).join('')}</div>
      ${p.itens.map((it, k) => `<div class="pc-af ${r.valor?.[it] ? 'ok' : ''}" role="radiogroup" aria-label="${esc(it)}" data-item="${esc(it)}">
        <p>${esc(it)}</p>
        ${escala.map(o => `<label class="pc-op"><input type="radio" name="${esc(p.id)}-${k}" value="${esc(o)}" ${r.valor?.[it] === o ? 'checked' : ''}><i></i><span>${esc(o)}</span></label>`).join('')}
      </div>`).join('')}
    </div>`;
  }
  if (p.tipo === 'nota') {
    const [esq, dir] = p.extremos || [];
    return `<div class="pc-nota" data-q="${esc(p.id)}">
      <p class="pc-q-tit">${esc(p.texto)}</p>
      <div class="pc-escala" role="radiogroup" aria-label="${esc(p.texto)}">
        ${Array.from({ length: 11 }, (_, n) => `<label class="pc-n n${n}"><input type="radio" name="${esc(p.id)}" value="${n}" ${r.valor === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}
      </div>
      ${esq || dir ? `<div class="pc-ext"><span>${esc(esq || '')}</span><span>${esc(dir || '')}</span></div>` : ''}
    </div>`;
  }
  if (p.tipo === 'unica') {
    return `<div class="pc-unica" data-q="${esc(p.id)}"><p class="pc-q-tit">${esc(p.texto)}</p>
      ${p.opcoes.map(o => `<label class="pc-op-linha"><input type="radio" name="${esc(p.id)}" value="${esc(o)}" ${r.valor === o ? 'checked' : ''}><i></i>${esc(o)}</label>`).join('')}</div>`;
  }
  const curto = p.tipo === 'curto' || p.tipo === 'data';
  return `<label class="pc-aberta" data-q="${esc(p.id)}"><span class="pc-q-tit">${esc(p.texto)} ${p.obrigatoria ? '' : '<small>(opcional)</small>'}</span>
    ${curto ? `<input class="pc-campo" type="${p.tipo === 'data' ? 'date' : 'text'}" value="${esc(r.valor || '')}" maxlength="300">`
      : `<textarea class="pc-campo" rows="3" maxlength="3000" placeholder="Escreva aqui, com suas palavras…">${esc(r.valor || '')}</textarea>`}</label>`;
}

function pcConexao() {
  const f = pc.form;
  const s = f.secoes[pcEtapa];
  const total = f.secoes.length;
  const pct = Math.round((pcEtapa / total) * 100);
  const ultima = pcEtapa === total - 1;
  document.body.className = 'pc pc-modo-etapa';
  pcTela.innerHTML = `
    ${pcLado(`<p class="pc-kick">${esc(f.titulo).toUpperCase()}</p>
      <div class="pc-mapa-box">${pcMapa({ total, atual: pcEtapa, feitas: pcEtapa, rotulos: f.secoes.map(x => pcCurto(x.titulo)), centro: `${pct}%` })}</div>
      <div class="pc-onde"><h2>${esc(pcCurto(s.titulo))}</h2><small>${s.subtitulo ? `${esc(s.subtitulo)} · ` : ''}conexão ${pcEtapa + 1} de ${total}</small></div>
      <div class="pc-trilha" aria-hidden="true">${f.secoes.map((_, i) => `<i class="${i < pcEtapa ? 'feito' : i === pcEtapa ? 'atual' : ''}"></i>`).join('')}</div>`, 'pc-lado-etapa')}
    <main class="pc-palco">
      <form class="pc-form" id="pc-form" novalidate>
        <header class="pc-cab"><span class="pc-num">${String(pcEtapa + 1).padStart(2, '0')}</span>
          <div><h1>${esc(s.titulo)}</h1>${s.subtitulo ? `<p>${esc(s.subtitulo)}</p>` : ''}</div></header>
        ${s.perguntas.map(pcPergunta).join('')}
        <nav class="pc-nav">
          <button type="button" class="pc-voltar" id="pc-voltar" aria-label="Voltar">←</button>
          <button type="submit" class="pc-btn ${ultima ? 'pc-enviar' : ''}">${ultima ? (pcPrevia ? 'Concluir pré-visualização' : 'Enviar minhas respostas') : 'Próxima conexão'} <b aria-hidden="true">→</b></button>
        </nav>
      </form>
    </main>`;
  const form = document.getElementById('pc-form');
  form.addEventListener('change', pcLerTela);
  form.addEventListener('input', pcLerTela);
  document.getElementById('pc-voltar').addEventListener('click', () => pcIr(pcEtapa - 1));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    pcLerTela();
    const falta = pcFaltando(s);
    if (falta) {
      falta.classList.add('falta');
      falta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return toast('Responda as perguntas destacadas para seguir. 🙂', 'erro');
    }
    if (ultima) await pcEnviar(e.submitter || form.querySelector('.pc-enviar'));
    else pcIr(pcEtapa + 1);
  });
}

/** Lê as respostas da tela atual para o estado (e salva o rascunho). */
function pcLerTela() {
  const s = pc.form.secoes[pcEtapa];
  for (const p of s.perguntas) {
    const el = pcTela.querySelector(`[data-q="${CSS.escape(p.id)}"]`);
    if (!el) continue;
    if (p.tipo === 'grade') {
      const valor = {};
      el.querySelectorAll('[data-item]').forEach(linha => {
        const marcado = linha.querySelector('input:checked');
        linha.classList.toggle('ok', Boolean(marcado));
        if (marcado) { valor[linha.dataset.item] = marcado.value; linha.classList.remove('falta'); }
      });
      pcRespostas[p.id] = { valor };
      if (Object.keys(valor).length === p.itens.length) el.classList.remove('falta');
    } else if (p.tipo === 'nota' || p.tipo === 'unica') {
      const marcado = el.querySelector('input:checked');
      if (marcado) { pcRespostas[p.id] = { valor: p.tipo === 'nota' ? Number(marcado.value) : marcado.value }; el.classList.remove('falta'); }
    } else {
      pcRespostas[p.id] = { valor: el.querySelector('.pc-campo').value };
      if (pcRespostas[p.id].valor.trim()) el.classList.remove('falta');
    }
  }
  pcSalvarRascunho();
}

/** Primeiro elemento obrigatório sem resposta na conexão (ou null). */
function pcFaltando(s) {
  for (const p of s.perguntas) {
    if (!p.obrigatoria) continue;
    const el = pcTela.querySelector(`[data-q="${CSS.escape(p.id)}"]`);
    const v = pcRespostas[p.id]?.valor;
    if (p.tipo === 'grade') {
      const linha = [...el.querySelectorAll('[data-item]')].find(l => !v?.[l.dataset.item]);
      if (linha) { el.querySelectorAll('[data-item]').forEach(l => l.classList.toggle('falta', !v?.[l.dataset.item])); return linha; }
    } else if (v === undefined || v === null || String(v).trim() === '') return el;
  }
  return null;
}

async function pcEnviar(btn) {
  if (pcPrevia) return pcIr(pc.form.secoes.length);
  btn.disabled = true;
  btn.firstChild.textContent = 'Enviando… ';
  try {
    await api(`/api/conexoes/${encodeURIComponent(pcToken)}`, { method: 'POST', body: { respostas: pcRespostas } });
    pcApagarRascunho();
    pcIr(pc.form.secoes.length);
  } catch (err) {
    toast(err.message, 'erro');
    btn.disabled = false;
    btn.firstChild.textContent = 'Enviar minhas respostas ';
  }
}

function pcObrigado(jaRespondida = false) {
  const f = pc.form;
  const total = f.secoes.length;
  const pars = pcParagrafos(f.abertura);
  const fecho = pars.length > 1 ? pars[pars.length - 1] : '';
  const nome = pcPrimeiro(pc.pessoa?.nome);
  document.body.className = 'pc pc-modo-fim';
  pcTela.innerHTML = `
    ${pcLado(`<p class="pc-kick">${esc(f.titulo).toUpperCase()}</p>
      <div class="pc-mapa-box">${pcMapa({ total, feitas: total, rotulos: f.secoes.map(x => pcCurto(x.titulo)), centro: '✓' })}</div>`, 'pc-lado-etapa')}
    <main class="pc-palco pc-palco-fim">
      <div class="pc-fim">
        <span class="pc-fim-ic" aria-hidden="true">✓</span>
        <h1>${jaRespondida ? 'Suas respostas já estão com a gente' : 'Obrigado por compartilhar'}${nome ? `, <em>${esc(nome)}</em>` : ''}!</h1>
        <p>${jaRespondida && pc.respondido_em ? `Recebemos suas Primeiras Conexões em ${pcData(pc.respondido_em)}. ` : ''}Todas as ${total} conexões foram registradas. Cada resposta vai nos ajudar a tornar a chegada de quem vem depois de você ainda mais humana e acolhedora.</p>
        ${fecho ? `<p class="pc-fecho">${esc(fecho)}</p>` : ''}
        ${f.assinatura ? `<p class="pc-ass-fim">${esc(f.assinatura)}</p>` : ''}
        ${pcPrevia ? '<p class="pc-aviso">👁 Pré-visualização: nada foi enviado.</p>' : ''}
      </div>
    </main>`;
}

function pcIr(etapa) {
  pcEtapa = Math.max(-1, etapa);
  if (pcEtapa === -1) pcAbertura();
  else if (pcEtapa >= pc.form.secoes.length) pcObrigado();
  else { pcConexao(); pcSalvarRascunho(); }
  window.scrollTo(0, 0);
}

function pcMensagem(titulo, texto) {
  document.body.className = 'pc pc-modo-fim';
  pcTela.innerHTML = `${pcLado('<p class="pc-kick">PRIMEIRAS CONEXÕES</p>', 'pc-lado-etapa')}
    <main class="pc-palco pc-palco-fim"><div class="pc-fim"><h1>${esc(titulo)}</h1><p>${esc(texto)}</p></div></main>`;
}

(async () => {
  if (!pcToken && !pcPrevia) return pcMensagem('Link incompleto', 'Abra o link que você recebeu do time de RH da Âmbar Energia.');
  try {
    pc = await api(pcPrevia ? '/api/conexoes/previa' : `/api/conexoes/${encodeURIComponent(pcToken)}`);
  } catch (err) {
    return pcMensagem('Não encontramos este link', err.message);
  }
  if (pc.status === 'respondida') return pcObrigado(true);
  if (!pc.form.ativa && !pcPrevia) return pcMensagem('Volte daqui a pouco', 'O Primeiras Conexões não está recebendo respostas no momento. Procure o time de RH.');
  pcIr(-1);
})();
