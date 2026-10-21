// Área do RH · Primeiras Conexões: acompanhamento dos convites (15 dias), respostas, indicadores, Excel e formulário.
// Usa de outros arquivos, em tempo de execução: fmt, fmtPct, barras, ehAdmin (admin.js); dslWhats, dslCopiar, dslNorm (admin-desligamento.js);
// xp, xpData, xpDataHora, xpPrazo, xpHojeIso, xpPreencher, xpMailto, xpPrimeiro, xpPct, xpMedia, xpIniciais (admin-experiencia.js / exp-comum.js).
const pcx = { convites: [], form: null };

const PC_STATUS = {
  em_breve: ['Em breve', 'st-pendente'], a_enviar: ['A enviar', 'st-recusa'], enviada: ['Aguardando resposta', 'st-gestor'],
  respondida: ['Respondida', 'st-ok'], dispensada: ['Dispensada', 'st-pendente'],
};
const PC_COLUNAS = [
  ['em_breve', 'Em breve', 'Ainda nos primeiros dias de casa'],
  ['a_enviar', 'A enviar', 'Envie o link ao colaborador'],
  ['enviada', 'Aguardando resposta', 'Link enviado'],
  ['respondida', 'Respondidas', 'Conexões registradas'],
];
const pcLink = (c) => `${location.origin}/conexoes.html?t=${c.token}`;
const pcCurto = (titulo) => String(titulo).split(/\s+(?:e|da|de|do|\|)\s+/i)[0];
const pcDiasDeCasa = (c) => Math.round((new Date(`${xpHojeIso()}T12:00:00`) - new Date(`${c.admissao}T12:00:00`)) / 864e5) + 1;
const pcAtiva = (c) => c.status === 'a_enviar' || c.status === 'enviada';

/** Posição da resposta na escala (opções da melhor para a pior): positiva, neutra (meio) ou negativa. */
function pcClasse(opcoes, v) {
  const i = (opcoes || []).indexOf(v);
  const metade = Math.floor((opcoes || []).length / 2);
  if (i < 0) return '';
  return i < metade ? 'positiva' : i >= opcoes.length - metade ? 'negativa' : 'neutra';
}
const pcPerguntas = () => pcx.form.secoes.flatMap((s, si) => s.perguntas.map(p => ({ ...p, secao: s.titulo, si })));
const pcResposta = (c, id) => c.respostas.find(r => r.id === id);
const pcNota = (c, id) => { const v = pcResposta(c, id)?.valor; return typeof v === 'number' ? v : null; };
/** Pergunta aberta sobre pendências (ex.: equipamento, acesso ou EPI ainda pendente) respondida com algo além de "não". */
const pcPendente = (txt) => Boolean(String(txt || '').trim()) && !/^\s*(n[ãa]o|nada|nenhum|nenhuma|tudo ok|ok|n\/a|-)\b[\s.!]*$/i.test(String(txt).trim());

async function pcCarregar() {
  const [convites, form] = await Promise.all([api('/api/admin/conexoes'), api('/api/admin/conexoes/formulario')]);
  Object.assign(pcx, { convites, form });
  const aEnviar = convites.filter(c => c.status === 'a_enviar').length;
  const qtd = document.getElementById('qtd-pc');
  qtd.hidden = !aEnviar;
  qtd.textContent = aEnviar;
  qtd.title = `${aEnviar} colaborador(es) prontos para receber o link`;
}

function pcMensagem(c) {
  const vals = { nome: xpPrimeiro(c.nome), prazo: xpData(c.prazo), link: pcLink(c) };
  return String(pcx.form.mensagem || '{link}').replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
}
function pcBotoesEnvio(c) {
  const msg = pcMensagem(c);
  const dados = `data-pc="${c.id}" data-pc-envio`;
  return `<div class="acoes-envio">
    <a class="btn btn-whats btn-sm" ${dados} href="${esc(dslWhats(c.telefone, msg))}" target="_blank" rel="noopener" title="${c.telefone ? 'WhatsApp para ' + esc(c.telefone) : 'Escolher o contato no WhatsApp'}">WhatsApp</a>
    <a class="btn btn-claro btn-sm" ${dados} href="${esc(xpMailto(c.email, pcx.form.assunto || 'Primeiras Conexões', msg))}" title="${c.email ? 'E-mail para ' + esc(c.email) : 'Abrir e-mail'}">✉️</a>
    <button type="button" class="btn btn-claro btn-sm" ${dados} data-pc-copiar="${esc(pcLink(c))}" title="Copiar link">📋</button>
    <button type="button" class="btn btn-claro btn-sm" ${dados} data-pc-qr="${esc(c.token)}" title="QR Code">📱</button>
  </div>`;
}

// Qualquer forma de envio move o cartão para "Aguardando resposta".
document.addEventListener('click', async (e) => {
  const copiar = e.target.closest('[data-pc-copiar]');
  if (copiar) dslCopiar(copiar.dataset.pcCopiar);
  const qr = e.target.closest('[data-pc-qr]');
  if (qr) pcAbrirQr(qr.dataset.pcQr);
  const envio = e.target.closest('[data-pc-envio]');
  if (envio) {
    const c = pcx.convites.find(x => x.id === Number(envio.dataset.pc));
    if (c && (c.status === 'a_enviar' || c.status === 'em_breve')) {
      await api(`/api/admin/conexoes/${c.id}`, { method: 'PATCH', body: { acao: 'enviada' } });
      await pcCarregar();
      setTimeout(renderVisaoAtual, 300);
    }
  }
});

async function pcAbrirQr(token) {
  try {
    const q = await api(`/api/admin/conexoes/qrcode?t=${encodeURIComponent(token)}`);
    document.getElementById('qr-rotulo').textContent = 'QR CODE · PRIMEIRAS CONEXÕES';
    document.getElementById('qr-dica').textContent = 'O colaborador lê o QR Code e responde as Primeiras Conexões no celular.';
    document.getElementById('qr-titulo').textContent = q.titulo;
    document.getElementById('qr-img').innerHTML = q.svg;
    document.getElementById('qr-link').value = q.link;
    document.getElementById('qr-baixar').href = `/api/admin/conexoes/qrcode?t=${encodeURIComponent(token)}&formato=png`;
    document.getElementById('modal-qr').showModal();
  } catch (err) { toast(err.message, 'erro'); }
}

// ---------- Início e ficha ----------
function renderPcInicio() {
  const n = (v, rotulo, cls = '') => `<li class="${cls}"><strong>${fmt(v)}</strong><span>${rotulo}</span></li>`;
  const c = (s) => pcx.convites.filter(x => x.status === s).length;
  const mes = xpHojeIso().slice(0, 7);
  const alertas = pcx.convites.filter(x => x.alerta).length;
  document.getElementById('ja-nums-pc').innerHTML = n(c('a_enviar'), 'a enviar', c('a_enviar') ? 'alerta' : '') + n(c('enviada'), 'aguardando resposta')
    + n(pcx.convites.filter(x => (x.respondido_em || '').slice(0, 7) === mes).length, 'respondidas no mês') + n(alertas, 'para agir', alertas ? 'alerta' : '');
}

/** Etapa da linha do tempo na ficha da pessoa. */
function pcEtapaFicha(p) {
  const c = pcx.convites.find(x => x.pessoa_id === p.id);
  if (!c) return '';
  const est = c.status === 'respondida' ? 'feita' : c.status === 'dispensada' ? 'dispensada' : pcAtiva(c) && c.prazo < xpHojeIso() ? 'atrasada' : 'atual';
  let corpo = `<span class="selo-st ${PC_STATUS[c.status][1]}">${PC_STATUS[c.status][0]}</span>`;
  if (c.status === 'respondida') {
    const nota = pcNota(c, 'nota_experiencia');
    corpo += `${nota != null ? ` <span class="kb-nota-pc ${nota <= 6 ? 'baixa' : ''}">nota <strong>${nota}</strong></span>` : ''}${c.alerta ? ' <span class="pc-chip">Para agir</span>' : ''}
      <button type="button" class="btn btn-claro btn-sm" data-ver-pc="${c.id}">Ver respostas</button>`;
  } else if (c.status !== 'dispensada') {
    corpo += `<p class="q-dica">${c.status === 'em_breve' ? `Enviar a partir de ${xpData(c.disponivel)}` : `Responder até ${xpData(c.prazo)} · ${xpPrazo(c.prazo).texto}`}</p>${pcBotoesEnvio(c)}`;
  }
  return `<li class="tl-etapa ${est}"><span class="tl-ic">🤝</span>
    <div><p class="tl-tit"><strong>Primeiras Conexões</strong><small>até ${xpData(c.prazo)}</small></p>${corpo}</div></li>`;
}

// ---------- Acompanhar (quadro) ----------
const pcUnicos = (campo) => [...new Set(pcx.convites.map(c => c[campo]).filter(Boolean))].sort();

function renderPcKanban() {
  xpPreencher('pk-regional', pcUnicos('regional'), 'Todas as regionais');
  xpPreencher('pk-setor', pcUnicos('setor'), 'Todos os setores');
  const regional = document.getElementById('pk-regional').value;
  const setor = document.getElementById('pk-setor').value;
  const busca = dslNorm(document.getElementById('pk-busca').value);
  const dispensados = document.getElementById('pk-dispensados').checked;
  const lista = pcx.convites.filter(c => (!regional || c.regional === regional) && (!setor || c.setor === setor)
    && (!busca || dslNorm([c.nome, c.chapa, c.cargo, c.setor, c.gestor].join(' ')).includes(busca)));
  document.getElementById('pk-regra').textContent = `O link fica pronto no ${pcx.form.dia_inicio}º dia de casa e o prazo é o ${pcx.form.dia_prazo}º dia. `
    + 'Pessoas admitidas há mais de 45 dias quando foram cadastradas entram como dispensadas (marque “Mostrar dispensados” para reativar).';
  const colunas = dispensados ? [...PC_COLUNAS, ['dispensada', 'Dispensados', 'Fora da janela dos 15 dias']] : PC_COLUNAS;
  const kb = document.getElementById('pk-kanban');
  kb.classList.toggle('cinco', dispensados);
  kb.innerHTML = colunas.map(([st, titulo, dica]) => {
    const cards = lista.filter(c => c.status === st).sort((a, b) => (st === 'respondida' ? (b.respondido_em || '').localeCompare(a.respondido_em || '') : a.prazo.localeCompare(b.prazo)));
    return `<section class="kb-col kb-${st}">
      <header><h3>${titulo}</h3><span class="kb-qtd">${cards.length}</span><small>${dica}</small></header>
      <div class="kb-cards">${cards.map(pcCartao).join('') || '<p class="kb-vazio">Nada por aqui.</p>'}</div>
    </section>`;
  }).join('');
}
['pk-regional', 'pk-setor', 'pk-dispensados'].forEach(id => document.getElementById(id).addEventListener('change', renderPcKanban));
document.getElementById('pk-busca').addEventListener('input', renderPcKanban);

function pcCartao(c) {
  let corpo = '';
  if (c.status === 'em_breve') {
    corpo = `<p class="kb-prazo ok">📅 Enviar a partir de ${xpData(c.disponivel)} · dia ${pcDiasDeCasa(c)} de casa</p>${pcBotoesEnvio(c)}`;
  } else if (pcAtiva(c)) {
    const pz = xpPrazo(c.prazo);
    corpo = `<p class="kb-prazo ${pz.classe}">⏳ ${xpData(c.prazo)} · ${pz.texto.replace('devolver', 'responder')}</p>
      ${c.aberto_em ? `<p class="kb-nota">👀 Abriu o link em ${xpDataHora(c.aberto_em)}</p>` : ''}${pcBotoesEnvio(c)}`;
  } else if (c.status === 'respondida') {
    const ne = pcNota(c, 'nota_experiencia');
    const nr = pcNota(c, 'nota_recomendacao');
    corpo = `<p class="kb-decisao">${ne != null ? `<span class="kb-nota-pc ${ne <= 6 ? 'baixa' : ''}">experiência <strong>${ne}</strong></span>` : ''}
      ${nr != null ? ` · <span class="kb-nota-pc">recomendação <strong>${nr}</strong></span>` : ''}</p>
      <p class="kb-nota">✍ Respondida em ${xpDataHora(c.respondido_em)}</p>`;
  } else {
    corpo = `<button type="button" class="btn btn-claro btn-sm" data-pc-acao="reativar" data-pc-id="${c.id}">↺ Reativar</button>`;
  }
  return `<article class="kb-card ${c.alerta ? 'kb-alerta' : ''}">
    <div class="kb-topo">
      <span class="kb-periodo">${esc(xpIniciais(c.nome))}</span>
      <div><strong>${esc(c.nome)}</strong><small>${esc([c.cargo, c.setor].filter(Boolean).join(' · '))}</small></div>
      <details class="kb-menu"><summary title="Mais ações">⋯</summary>
        <div>
          <button type="button" data-ficha="${c.pessoa_id}">Ficha da pessoa</button>
          ${c.respondido_em ? `<button type="button" data-ver-pc="${c.id}">Ver respostas</button>
            <button type="button" data-pc-acao="reabrir" data-pc-id="${c.id}">Reabrir para nova resposta</button>` : ''}
          ${!c.respondido_em && c.status !== 'dispensada' ? `<button type="button" data-pc-acao="dispensar" data-pc-id="${c.id}">Dispensar</button>` : ''}
          ${c.status === 'dispensada' ? `<button type="button" data-pc-acao="reativar" data-pc-id="${c.id}">Reativar</button>` : ''}
        </div>
      </details>
    </div>
    <p class="kb-gestor">Admissão ${xpData(c.admissao)} · gestor <strong>${esc(c.gestor || '–')}</strong></p>
    ${c.alerta ? '<p class="kb-flag">⚠️ Pede retorno do RH</p>' : ''}
    ${corpo}
    ${c.respondido_em ? `<button type="button" class="kb-ver" data-ver-pc="${c.id}">Ver respostas →</button>` : ''}
  </article>`;
}

document.addEventListener('click', async (e) => {
  const ver = e.target.closest('[data-ver-pc]');
  if (ver) return pcAbrirRespostas(Number(ver.dataset.verPc));
  const b = e.target.closest('[data-pc-acao]');
  if (!b) return;
  const c = pcx.convites.find(x => x.id === Number(b.dataset.pcId));
  const acao = b.dataset.pcAcao;
  if (acao === 'reabrir' && !confirm(`Reabrir as Primeiras Conexões de ${c.nome}? As respostas atuais serão apagadas e o mesmo link volta a funcionar.`)) return;
  if (acao === 'dispensar' && !confirm(`Dispensar ${c.nome} das Primeiras Conexões? Você pode reativar depois.`)) return;
  try {
    await api(`/api/admin/conexoes/${c.id}`, { method: 'PATCH', body: { acao } });
    toast('Feito ✅');
    await pcCarregar();
    renderVisaoAtual();
  } catch (err) { toast(err.message, 'erro'); }
});

// ---------- Ver / imprimir respostas ----------
function pcHtmlLeitura(c) {
  return pcx.form.secoes.map((sec, i) => `
    <section class="xp-ler-bloco">
      <h3><b>${String(i + 1).padStart(2, '0')}</b>${esc(sec.titulo)}${sec.subtitulo ? ` <small class="sub">· ${esc(sec.subtitulo)}</small>` : ''}</h3>
      ${sec.perguntas.map(p => {
        const r = pcResposta(c, p.id);
        let valor = '<span class="xp-r vazio">–</span>';
        if (r && p.tipo === 'grade') {
          return `<div class="xp-ler-q larga"><ul class="pc-ler-afs">${p.itens.map(it => `<li><span>${esc(it)}</span>${r.valor[it] ? `<span class="xp-r ${pcClasse(p.opcoes, r.valor[it])}">${esc(r.valor[it])}</span>` : '–'}</li>`).join('')}</ul></div>`;
        }
        if (r && p.tipo === 'nota') valor = `<span class="xp-r ${r.valor <= 6 ? 'negativa' : r.valor <= 8 ? 'neutra' : 'positiva'}">${r.valor} / 10</span>`;
        else if (r && (p.opcoes || []).length) valor = `<span class="xp-r ${pcClasse(p.opcoes, r.valor)}">${esc(r.valor)}</span>`;
        else if (r) valor = `<span class="xp-r texto">${esc(r.valor)}</span>`;
        return `<div class="xp-ler-q ${p.tipo === 'texto' ? 'larga' : ''}"><p>${esc(p.texto)}</p><div>${valor}</div></div>`;
      }).join('')}
    </section>`).join('');
}
let pcAberto = null;
function pcAbrirRespostas(id) {
  const c = pcx.convites.find(x => x.id === id);
  pcAberto = c;
  document.getElementById('pc-modal-titulo').textContent = c.nome;
  document.getElementById('pc-modal-corpo').innerHTML = `
    <div class="det-ident">${[['Cargo', c.cargo], ['Setor', c.setor], ['Regional', c.regional], ['Gestor', c.gestor], ['Admissão', xpData(c.admissao)],
      ['Respondida em', `${xpDataHora(c.respondido_em)} (dia ${Math.round((new Date(c.respondido_em.replace(' ', 'T') + 'Z') - new Date(`${c.admissao}T03:00:00Z`)) / 864e5) + 1} de casa)`]]
      .map(([k, v]) => `<div><small>${k}</small><span>${esc(v || '–')}</span></div>`).join('')}</div>
    ${c.alerta ? '<p class="kb-flag" style="margin:0 0 1rem">⚠️ Há discordâncias ou nota baixa: vale um retorno do RH.</p>' : ''}
    <div class="xp-ler">${pcHtmlLeitura(c)}</div>`;
  ['modal-ficha', 'modal-xp'].forEach(m => { if (document.getElementById(m).open) document.getElementById(m).close(); });
  document.getElementById('modal-pc').showModal();
}
document.getElementById('pc-imprimir').addEventListener('click', () => {
  const c = pcAberto;
  const w = window.open('', '_blank');
  if (!w) return toast('Permita pop-ups para imprimir.', 'erro');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Primeiras Conexões · ${esc(c.nome)}</title>
    <link rel="stylesheet" href="${location.origin}/css/base.css"><link rel="stylesheet" href="${location.origin}/css/experiencia.css"><link rel="stylesheet" href="${location.origin}/css/jornada.css">
    <style>body{background:#fff;margin:22px;font-size:12px} .xp-ler-bloco{break-inside:avoid;border-color:#ccd} header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #ec6b24;padding-bottom:8px;margin-bottom:12px}
      .ident{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 14px;padding:10px;background:#f4f6f8;border-radius:8px;margin-bottom:12px} .ident small{display:block;color:#5f6f7c;font-size:10px}</style></head><body>
    <header><span class="logo"><b>Âmbar</b><small>ENERGIA</small></span><div style="text-align:right"><strong style="color:#0e3b5c;font-size:15px">${esc(pcx.form.titulo)}</strong><br><span>Jornada Âmbar · confidencial (RH)</span></div></header>
    <div class="ident">${[['Colaborador', c.nome], ['Cargo', c.cargo], ['Setor', c.setor], ['Gestor', c.gestor], ['Admissão', xpData(c.admissao)], ['Respondida', xpDataHora(c.respondido_em)]]
      .map(([k, v]) => `<div><small>${k}</small>${esc(v || '–')}</div>`).join('')}</div>
    <div class="xp-ler">${pcHtmlLeitura(c)}</div>
    <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
  w.document.close();
});

// ---------- Indicadores ----------
function pcFiltradas() {
  const regional = document.getElementById('pi-regional').value;
  const setor = document.getElementById('pi-setor').value;
  const gestor = document.getElementById('pi-gestor').value;
  const de = document.getElementById('pi-de').value;
  const ate = document.getElementById('pi-ate').value;
  return pcx.convites.filter(c => c.status !== 'dispensada' && (!regional || c.regional === regional) && (!setor || c.setor === setor)
    && (!gestor || c.gestor === gestor) && (!de || c.admissao >= de) && (!ate || c.admissao <= ate));
}

/** Contagem positiva/neutra/negativa de uma lista de respostas de escala. */
function pcContar(valores, opcoes) {
  const t = { positiva: 0, neutra: 0, negativa: 0, n: 0 };
  for (const v of valores) { const k = pcClasse(opcoes, v); if (k) { t[k] += 1; t.n += 1; } }
  return t;
}
const pcEnps = (notas) => (notas.length ? Math.round(((notas.filter(n => n >= 9).length - notas.filter(n => n <= 6).length) / notas.length) * 100) : null);

/** Motivos para o RH agir em uma resposta: discordâncias, nota baixa e pendências citadas. */
function pcMotivos(c) {
  const motivos = [];
  for (const p of pcPerguntas()) {
    const r = pcResposta(c, p.id);
    if (!r) continue;
    const secao = pcCurto(p.secao);
    if (p.tipo === 'grade') {
      for (const [it, v] of Object.entries(r.valor)) if (pcClasse(p.opcoes, v) === 'negativa') motivos.push({ secao, texto: `${v}: “${it}”` });
    } else if (p.tipo === 'nota' && p.id === 'nota_experiencia' && r.valor <= 6) motivos.push({ secao, texto: `Nota ${r.valor} para a experiência` });
    else if (p.tipo === 'texto' && /pendente/i.test(p.texto) && pcPendente(r.valor)) motivos.push({ secao, texto: `Pendência: “${r.valor}”` });
  }
  return motivos;
}

function renderPcIndicadores() {
  xpPreencher('pi-regional', pcUnicos('regional'), 'Todas as regionais');
  xpPreencher('pi-setor', pcUnicos('setor'), 'Todos os setores');
  xpPreencher('pi-gestor', pcUnicos('gestor'), 'Todos os gestores');
  const todas = pcFiltradas();
  const resp = todas.filter(c => c.status === 'respondida');
  const convidados = todas.filter(c => c.status === 'enviada' || c.status === 'respondida');
  const perguntas = pcPerguntas();
  const grades = perguntas.filter(p => p.tipo === 'grade');
  const geral = pcContar(resp.flatMap(c => grades.flatMap(p => Object.values(pcResposta(c, p.id)?.valor || {}).filter(v => p.opcoes.includes(v)))), CONCORD_PADRAO());
  const notasExp = resp.map(c => pcNota(c, 'nota_experiencia')).filter(n => n != null);
  const notasRec = resp.map(c => pcNota(c, 'nota_recomendacao')).filter(n => n != null);
  const agir = resp.map(c => ({ c, motivos: pcMotivos(c) })).filter(x => x.motivos.length);
  const pendencias = resp.filter(c => pcMotivos(c).some(m => m.texto.startsWith('Pendência'))).length;
  const enps = pcEnps(notasRec);
  const noPrazo = resp.filter(c => c.respondido_em.slice(0, 10) <= c.prazo).length;
  document.getElementById('pi-kpis').innerHTML = [
    ['🤝', fmtPct(xpPct(geral.positiva, geral.n)), 'índice de acolhimento', 'Concordo + Concordo totalmente'],
    ['⭐', notasExp.length ? fmt(xpMedia(notasExp), 1) : '–', 'nota da experiência', `média de 0 a 10 · ${fmt(notasExp.length)} resposta(s)`],
    ['📣', enps == null ? '–' : `${enps > 0 ? '+' : ''}${enps}`, 'eNPS do onboarding', '% promotores (9–10) − % detratores (0–6)'],
    ['📨', fmtPct(xpPct(resp.length, convidados.length)), 'taxa de resposta', `${fmt(resp.length)} de ${fmt(convidados.length)} convidado(s)`],
    ['⏱', fmtPct(xpPct(noPrazo, resp.length)), 'respondidas no prazo', `até o ${pcx.form.dia_prazo}º dia de casa`],
    ['⚠️', fmt(agir.length), 'para agir', `${fmt(pendencias)} com pendência de estrutura`],
  ].map(([ic, valor, rotulo, sub]) => `
    <div class="kpi ${ic === '⚠️' && agir.length ? 'kpi-alerta' : ''}"><span class="ic">${ic}</span><div><strong>${valor}</strong><span>${rotulo}</span><small>${sub}</small></div></div>`).join('');

  const dica = (titulo, t) => `<strong>${esc(titulo)}</strong><br>${fmt(t.positiva)} concordam · ${fmt(t.neutra)} neutras · ${fmt(t.negativa)} discordam`;
  const porSecao = pcx.form.secoes.map(s => {
    const ps = s.perguntas.filter(p => p.tipo === 'grade');
    if (!ps.length) return null;
    const t = pcContar(resp.flatMap(c => ps.flatMap(p => Object.values(pcResposta(c, p.id)?.valor || {}))), ps[0].opcoes);
    return t.n ? { rotulo: pcCurto(s.titulo), valor: xpPct(t.positiva, t.n), dica: dica(s.titulo, t) } : null;
  }).filter(Boolean);
  barras('pi-conexoes', porSecao, 'Sem respostas neste filtro.');
  const afirmacoes = grades.flatMap(p => p.itens.map(it => {
    const t = pcContar(resp.map(c => pcResposta(c, p.id)?.valor?.[it]).filter(Boolean), p.opcoes);
    return t.n ? { rotulo: it, valor: xpPct(t.positiva, t.n), dica: dica(`${pcCurto(p.secao)} · ${it}`, t) } : null;
  })).filter(Boolean).sort((a, b) => a.valor - b.valor);
  barras('pi-afirmacoes', afirmacoes, 'Sem respostas neste filtro.');

  document.getElementById('pi-agir').innerHTML = agir.length ? agir.sort((a, b) => b.c.respondido_em.localeCompare(a.c.respondido_em)).map(({ c, motivos }) => `
    <button type="button" class="pc-agir-item" data-ver-pc="${c.id}">
      <span><strong>${esc(c.nome)}</strong> · ${esc([c.setor, c.regional].filter(Boolean).join(' · ') || '–')} · gestor ${esc(c.gestor || '–')}</span>
      ${motivos.slice(0, 3).map(m => `<small><span class="pc-chip ${m.texto.startsWith('Nota') ? 'neutro' : ''}">${esc(m.secao)}</span>${esc(m.texto)}</small>`).join('')}
      ${motivos.length > 3 ? `<small>+ ${motivos.length - 3} outro(s) ponto(s)</small>` : ''}
    </button>`).join('') : '<p class="q-dica">Nenhuma resposta pedindo retorno neste filtro. 🎉</p>';

  const hist = (titulo, notas, sub) => {
    const cont = Array.from({ length: 11 }, (_, n) => notas.filter(x => x === n).length);
    const max = Math.max(1, ...cont);
    return `<p class="pc-hist-tit">${esc(titulo)} <small>· ${sub}</small></p>
      <div class="pc-hist">${cont.map((q, n) => `<div title="Nota ${n}: ${q} resposta(s)">${q || ''}<i class="${n <= 6 ? 'det' : n <= 8 ? 'neu' : 'pro'}" style="height:${(q / max) * 100}%"></i></div>`).join('')}</div>
      <div class="pc-hist-eixo">${cont.map((_, n) => `<span>${n}</span>`).join('')}</div>`;
  };
  document.getElementById('pi-notas').innerHTML = resp.length
    ? hist('Experiência nos primeiros 15 dias', notasExp, `média ${notasExp.length ? fmt(xpMedia(notasExp), 1) : '–'}`) + hist('Recomendaria a Âmbar', notasRec, `eNPS ${enps == null ? '–' : enps}`)
    : '<p class="q-dica">Sem respostas neste filtro.</p>';

  const grupos = new Map();
  for (const c of todas) { const k = c.setor || '(sem setor)'; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(c); }
  document.getElementById('pi-setores').innerHTML = `
    <tr><th>Setor</th><th>Convidados</th><th>Respostas</th><th>Acolhimento</th><th>Nota média</th><th>Para agir</th></tr>
    ${[...grupos.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, l]) => {
      const r = l.filter(c => c.status === 'respondida');
      const t = pcContar(r.flatMap(c => grades.flatMap(p => Object.values(pcResposta(c, p.id)?.valor || {}))), CONCORD_PADRAO());
      const ns = r.map(c => pcNota(c, 'nota_experiencia')).filter(n => n != null);
      return `<tr><td>${esc(k)}</td><td>${l.filter(c => c.status === 'enviada' || c.status === 'respondida').length}</td><td>${r.length}</td>
        <td>${t.n ? fmtPct(xpPct(t.positiva, t.n)) : '–'}</td><td>${ns.length ? fmt(xpMedia(ns), 1) : '–'}</td><td>${r.filter(c => pcMotivos(c).length).length}</td></tr>`;
    }).join('') || '<tr><td colspan="6">Sem dados.</td></tr>'}`;

  const abertas = perguntas.filter(p => p.tipo === 'texto');
  const falas = resp.flatMap(c => abertas.map(p => ({ c, p, v: String(pcResposta(c, p.id)?.valor || '').trim() })).filter(x => x.v))
    .sort((a, b) => b.c.respondido_em.localeCompare(a.c.respondido_em)).slice(0, 12);
  document.getElementById('pi-falas').innerHTML = falas.length ? falas.map(({ c, p, v }) => `
    <figure class="pc-fala"><q>${esc(v)}</q><figcaption><strong>${esc(pcCurto(p.secao))}</strong> · ${esc(p.texto)}<br>${esc(c.nome)} · ${esc(c.setor || '–')}</figcaption></figure>`).join('')
    : '<p class="q-dica">Nenhuma resposta aberta ainda.</p>';
}
// Escala de referência para somar respostas de várias afirmações (todas usam a mesma escala de concordância).
const CONCORD_PADRAO = () => pcPerguntas().find(p => p.tipo === 'grade')?.opcoes || [];
['pi-regional', 'pi-setor', 'pi-gestor', 'pi-de', 'pi-ate'].forEach(id => document.getElementById(id).addEventListener('change', renderPcIndicadores));

document.getElementById('pi-exportar').addEventListener('click', () => {
  const perguntas = pcPerguntas();
  const dataCel = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`) : '');
  const dh = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z') : '');
  const cols = [];
  for (const p of perguntas) {
    if (p.tipo === 'grade') p.itens.forEach(it => cols.push([`${pcCurto(p.secao)} · ${it}`, (c) => pcResposta(c, p.id)?.valor?.[it] ?? '']));
    else cols.push([`${pcCurto(p.secao)} · ${p.texto}`, (c) => { const v = pcResposta(c, p.id)?.valor; return Array.isArray(v) ? v.join('; ') : v ?? ''; }]);
  }
  const lista = pcx.convites;
  const cab = ['ID', 'Nome', 'Chapa', 'Cargo', 'Regional', 'Setor', 'Gestor', 'Admissão', 'Enviar a partir de', 'Responder até', 'Situação', 'Enviado em', 'Aberto em',
    'Respondida em', 'No prazo', 'Índice de acolhimento (%)', 'Para agir', 'Motivos', ...cols.map(c => c[0])];
  const linhas = lista.map(c => {
    const grades = perguntas.filter(p => p.tipo === 'grade');
    const t = pcContar(grades.flatMap(p => Object.values(pcResposta(c, p.id)?.valor || {})), CONCORD_PADRAO());
    const motivos = c.respondido_em ? pcMotivos(c) : [];
    return [c.id, c.nome, c.chapa, c.cargo, c.regional || '', c.setor, c.gestor, dataCel(c.admissao), dataCel(c.disponivel), dataCel(c.prazo), PC_STATUS[c.status][0],
      dh(c.enviado_em), dh(c.aberto_em), dh(c.respondido_em), c.respondido_em ? (c.respondido_em.slice(0, 10) <= c.prazo ? 'Sim' : 'Não') : '',
      t.n ? xpPct(t.positiva, t.n) : '', c.respondido_em ? (motivos.length ? 'Sim' : 'Não') : '', motivos.map(m => `${m.secao}: ${m.texto}`).join(' | '),
      ...cols.map(([, f]) => (c.respondido_em ? f(c) : ''))];
  });
  const base = [['ID', 'Nome', 'Regional', 'Setor', 'Gestor', 'Admissão', 'Conexão', 'Afirmação / pergunta', 'Resposta', 'Positiva (1/0)', 'Negativa (1/0)', 'Nota']];
  for (const c of lista.filter(x => x.respondido_em)) {
    for (const p of perguntas) {
      const r = pcResposta(c, p.id);
      if (!r) continue;
      const linha = (item, v) => [c.id, c.nome, c.regional || '', c.setor, c.gestor, dataCel(c.admissao), pcCurto(p.secao), item, v];
      if (p.tipo === 'grade') Object.entries(r.valor).forEach(([it, v]) => base.push([...linha(it, v), pcClasse(p.opcoes, v) === 'positiva' ? 1 : 0, pcClasse(p.opcoes, v) === 'negativa' ? 1 : 0, '']));
      else if (p.tipo === 'nota') base.push([...linha(p.texto, r.valor), '', '', r.valor]);
    }
  }
  const aba = (aoa) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' });
    ws['!cols'] = aoa[0].map(() => ({ wch: 18 }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: aoa[0].length - 1, r: Math.max(aoa.length - 1, 0) } }) };
    return ws;
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, aba([cab, ...linhas]), 'Primeiras_Conexoes');
  XLSX.utils.book_append_sheet(wb, aba(base), 'Base_indicadores');
  XLSX.writeFile(wb, `primeiras-conexoes-${xpHojeIso()}.xlsx`);
});

// ---------- Formulário ----------
const pcEditor = criarEditorFormulario(document.getElementById('pf-secoes'), {
  rotuloSecao: 'Conexão',
  camposSecao: true,
  tipos: { grade: 'Afirmações (escala)', nota: 'Nota de 0 a 10', texto: 'Pergunta aberta', curto: 'Texto curto', unica: 'Escolha única', multipla: 'Múltipla seleção' },
  presets: { concordancia: ['Concordância (5 pontos)', ['Concordo totalmente', 'Concordo', 'Neutro', 'Discordo', 'Discordo totalmente']], simnao: ['Sim / Não', ['Sim', 'Não']] },
});
function pcCarregarFormulario(f) {
  const campos = { titulo: f.titulo, chamada: f.chamada, abertura: f.abertura, assinatura: f.assinatura, introducao: f.introducao,
    'dia-inicio': f.dia_inicio ?? 12, 'dia-prazo': f.dia_prazo ?? 15, assunto: f.assunto, mensagem: f.mensagem };
  for (const [k, v] of Object.entries(campos)) document.getElementById(`pf-${k}`).value = v ?? '';
  document.getElementById('pf-ativa').checked = f.ativa !== false;
  pcEditor.carregar(f.secoes);
}
function renderPcFormulario() { pcCarregarFormulario(pcx.form); }
document.getElementById('pf-add-secao').addEventListener('click', () => pcEditor.adicionarSecao());
document.getElementById('pf-restaurar').addEventListener('click', async () => {
  if (!confirm('Carregar o modelo original (documento Primeiras Conexões)? As alterações só valem depois de Salvar.')) return;
  pcCarregarFormulario(await api('/api/admin/conexoes/formulario/padrao'));
  toast('Modelo original carregado. Clique em Salvar formulário para aplicar.');
});
document.getElementById('pf-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = (id) => document.getElementById(`pf-${id}`).value;
  try {
    pcx.form = await api('/api/admin/conexoes/formulario', { method: 'PUT', body: {
      ativa: document.getElementById('pf-ativa').checked, titulo: v('titulo'), chamada: v('chamada'), abertura: v('abertura'), assinatura: v('assinatura'),
      introducao: v('introducao'), dia_inicio: Number(v('dia-inicio')), dia_prazo: Number(v('dia-prazo')), assunto: v('assunto'), mensagem: v('mensagem'),
      secoes: pcEditor.secoes(),
    } });
    await pcCarregar();
    pcCarregarFormulario(pcx.form);
    toast('Formulário salvo ✅');
  } catch (err) { toast(err.message, 'erro'); }
});
