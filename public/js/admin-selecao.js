// Área do RH · Avaliação do processo seletivo: acompanhamento dos envios ao gestor (WhatsApp, e-mail com QR Code, link e
// QR Code), lembrete, respostas, indicadores por regional/recrutador/empresa, Excel e formulário.
// Usa de outros arquivos, em tempo de execução: fmt, fmtPct, barras, ehAdmin, renderVisaoAtual (admin.js); dslWhats, dslCopiar, dslNorm
// (admin-desligamento.js); xp, xpData, xpDataHora, xpHojeIso, xpPreencher, xpMailto, xpPrimeiro, xpPct, xpMedia, xpIniciais (admin-experiencia.js).
const rsx = { lista: [], form: null };

const RS_STATUS = { a_enviar: ['A enviar', 'st-recusa'], enviada: ['Aguardando resposta', 'st-gestor'], respondida: ['Respondida', 'st-ok'], dispensada: ['Dispensada', 'st-pendente'] };
const RS_COLUNAS = [
  ['a_enviar', 'A enviar', 'Envie ao gestor que pediu a vaga'],
  ['enviada', 'Aguardando resposta', 'Link enviado ao gestor'],
  ['respondida', 'Respondidas', 'Avaliação recebida'],
];
const rsLink = (a) => `${location.origin}/selecao.html?t=${a.token}`;
const rsGrades = () => (rsx.form?.secoes || []).flatMap(s => s.perguntas).filter(p => p.tipo === 'grade');
const rsPergunta = (id) => (rsx.form?.secoes || []).flatMap(s => s.perguntas).find(p => p.id === id);
const rsResp = (a, id) => a.respostas.find(r => r.id === id)?.valor;
/** Nota de 1 a 3 de uma opção (as opções vêm da melhor para a pior). */
const rsNota = (opcoes, v) => { const i = (opcoes || []).indexOf(v); return i < 0 ? null : opcoes.length - i; };
const rsFmtNota = (n) => (n == null ? '–' : fmt(n, 1));
const rsCor = (n) => (n == null ? '' : n >= 2.5 ? 'c3' : n >= 2 ? 'c2' : 'c1');

async function rsCarregar() {
  const [lista, form] = await Promise.all([api('/api/admin/selecao'), api('/api/admin/selecao/formulario')]);
  Object.assign(rsx, { lista, form });
  const pendentes = lista.filter(a => a.status === 'a_enviar' || a.lembrar).length;
  const qtd = document.getElementById('qtd-rs');
  qtd.hidden = !pendentes;
  qtd.textContent = pendentes;
  qtd.title = `${pendentes} avaliação(ões) para enviar ou lembrar`;
  const unicos = (campo, extra = []) => [...new Set([...extra, ...lista.map(a => a[campo]), ...(xp?.pessoas || []).map(p => p[campo])].filter(Boolean))].sort();
  document.getElementById('lista-empresas').innerHTML = unicos('empresa', form.empresas).map(v => `<option value="${esc(v)}">`).join('');
  document.getElementById('lista-recrutadores').innerHTML = unicos('recrutador').map(v => `<option value="${esc(v)}">`).join('');
}

function rsMensagem(a, lembrete = false) {
  const vals = { gestor: xpPrimeiro(a.gestor) || 'gestor(a)', vaga: a.vaga || 'a vaga', candidato: a.candidato || 'a pessoa aprovada', link: rsLink(a) };
  return String((lembrete ? rsx.form.mensagem_lembrete : rsx.form.mensagem) || '{link}').replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
}
const rsAssunto = (a) => String(rsx.form.assunto || 'Avaliação do processo seletivo').replace(/\{vaga\}/g, a.vaga || 'a vaga');

function rsBotoesEnvio(a, lembrete = false) {
  const msg = rsMensagem(a, lembrete);
  const dados = `data-rs="${a.id}" data-rs-envio="${lembrete ? 'lembrete' : 'enviada'}"`;
  return `<div class="acoes-envio">
    <a class="btn btn-whats btn-sm" ${dados} href="${esc(dslWhats(a.gestor_telefone, msg))}" target="_blank" rel="noopener" title="${a.gestor_telefone ? 'WhatsApp para ' + esc(a.gestor_telefone) : 'Escolher o contato no WhatsApp'}">WhatsApp</a>
    <button type="button" class="btn btn-claro btn-sm" ${dados} data-rs-email="${a.id}" title="E-mail com QR Code">✉️</button>
    <button type="button" class="btn btn-claro btn-sm" ${dados} data-rs-copiar="${esc(rsLink(a))}" title="Copiar link">📋</button>
    <button type="button" class="btn btn-claro btn-sm" ${dados} data-rs-qr="${esc(a.token)}" title="QR Code">📱</button>
  </div>`;
}

// Qualquer forma de envio move o cartão para "Aguardando resposta" (ou registra o lembrete).
document.addEventListener('click', async (e) => {
  const copiar = e.target.closest('[data-rs-copiar]');
  if (copiar) dslCopiar(copiar.dataset.rsCopiar);
  const qr = e.target.closest('[data-rs-qr]');
  if (qr) rsAbrirQr(qr.dataset.rsQr);
  const email = e.target.closest('[data-rs-email]');
  if (email) rsAbrirEmail(Number(email.dataset.rsEmail), email.dataset.rsEnvio === 'lembrete');
  const envio = e.target.closest('[data-rs-envio]');
  if (envio) {
    const a = rsx.lista.find(x => x.id === Number(envio.dataset.rs));
    const acao = envio.dataset.rsEnvio;
    if (a && ((acao === 'enviada' && a.status === 'a_enviar') || (acao === 'lembrete' && !a.lembrete_em))) {
      await api(`/api/admin/selecao/${a.id}`, { method: 'PATCH', body: { acao } });
      await rsCarregar();
      if (!document.getElementById('modal-rs-email').open) setTimeout(renderVisaoAtual, 300);
    }
  }
});

async function rsAbrirQr(token) {
  try {
    const q = await api(`/api/admin/selecao/qrcode?t=${encodeURIComponent(token)}`);
    document.getElementById('qr-rotulo').textContent = 'QR CODE · AVALIAÇÃO DO PROCESSO SELETIVO';
    document.getElementById('qr-dica').textContent = 'O gestor lê o QR Code e avalia o processo seletivo no celular.';
    document.getElementById('qr-titulo').textContent = q.titulo;
    document.getElementById('qr-img').innerHTML = q.svg;
    document.getElementById('qr-link').value = q.link;
    document.getElementById('qr-baixar').href = `/api/admin/selecao/qrcode?t=${encodeURIComponent(token)}&formato=png`;
    document.getElementById('modal-qr').showModal();
  } catch (err) { toast(err.message, 'erro'); }
}

// ---------- E-mail com QR Code (para colar no e-mail de quem envia) ----------
/** E-mail em tabelas e estilos embutidos, para colar no Outlook/Gmail; imagens servidas pela própria Jornada. */
function rsEmailHtml(a, lembrete) {
  const o = location.origin;
  const f = 'font-family:Arial,Helvetica,sans-serif';
  const dado = (k, v) => `<td style="padding:6px 12px;vertical-align:top;width:50%"><div style="${f};font-size:10px;letter-spacing:1px;color:#5f6f7c;font-weight:bold;text-transform:uppercase">${k}</div><div style="${f};font-size:14px;color:#0e3b5c;font-weight:bold">${esc(v || '–')}</div></td>`;
  const bem = (cor, ic, t) => `<td style="text-align:center;padding:6px;width:25%"><div style="width:42px;height:42px;line-height:42px;border-radius:21px;background:${cor};color:#fff;font-size:19px;margin:0 auto 6px">${ic}</div><div style="${f};font-size:12px;font-weight:bold;color:#0e3b5c;line-height:1.3">${t}</div></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:620px;max-width:100%;background:#ffffff;border-collapse:collapse">
  <tr><td style="padding:0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td style="padding:26px 24px;vertical-align:middle;width:46%"><div style="width:44px;height:5px;background:#ec6b24;border-radius:3px;margin-bottom:12px"></div>
      <div style="${f};font-size:30px;line-height:1.05;font-weight:900;color:#0e3b5c">Sua <span style="color:#ec6b24">percepção</span> fortalece o nosso time.</div></td>
    <td style="padding:0;width:54%"><img src="${o}/img/selecao-foto.jpg" width="335" alt="" style="display:block;width:335px;max-width:100%;height:auto;border:0"></td></tr></table></td></tr>
  <tr><td style="padding:18px 24px 4px">
    <p style="${f};font-size:16px;font-weight:bold;color:#0e3b5c;line-height:1.45;margin:0 0 10px">Olá, ${esc(xpPrimeiro(a.gestor) || 'gestor(a)')}! ${lembrete ? 'Passando para lembrar da avaliação do processo seletivo.' : 'Cada contratação é resultado de uma parceria, e a sua visão torna esse processo ainda melhor.'}</p>
    <p style="${f};font-size:14px;color:#3d4f5c;line-height:1.6;margin:0 0 14px">O processo seletivo da vaga abaixo foi concluído${a.candidato ? ' e a pessoa aprovada já está em admissão' : ''}. Convidamos você a avaliar a atuação do nosso time de Recrutamento e Seleção. Sua participação é fundamental para continuarmos evoluindo e realizando processos cada vez mais assertivos, ágeis e conectados às necessidades do nosso negócio e das nossas pessoas.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f8fa;border:1px solid #dfe5eb;border-radius:10px">
      <tr>${dado('Vaga', a.vaga)}${dado('Pessoa aprovada', a.candidato)}</tr>
      <tr>${dado('Regional · usina', [a.regional, a.usina].filter(Boolean).join(' · '))}${dado('Recrutador(a)', a.recrutador)}</tr></table>
  </td></tr>
  <tr><td style="padding:14px 24px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0e3b5c;border-radius:14px"><tr>
    <td style="padding:20px;vertical-align:middle"><div style="${f};font-size:19px;font-weight:bold;color:#ffffff;margin-bottom:6px">Compartilhe sua experiência</div>
      <div style="${f};font-size:13px;color:#c4d4e1;line-height:1.5;margin-bottom:14px">Leva cerca de 3 minutos. Clique no botão ou aponte a câmera do celular para o QR Code.</div>
      <a href="${rsLink(a)}" style="${f};display:inline-block;background:#ec6b24;color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 20px;border-radius:9px">Avaliar o processo seletivo →</a></td>
    <td style="padding:16px;width:150px;vertical-align:middle"><div style="background:#ffffff;border-radius:10px;padding:8px;text-align:center">
      <img src="${o}/api/selecao/qr/${encodeURIComponent(a.token)}.png" width="128" height="128" alt="QR Code da avaliação" style="display:block;margin:0 auto;border:0">
      <div style="${f};font-size:10px;font-weight:bold;color:#0e3b5c;margin-top:4px">Aponte a câmera do celular</div></div></td></tr></table></td></tr>
  <tr><td style="padding:4px 18px 6px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    ${bem('#ec6b24', '👥', 'Processos mais assertivos')}${bem('#1f6fd1', '⏱', 'Mais agilidade nas contratações')}${bem('#13856b', '📈', 'Profissionais alinhados ao negócio')}${bem('#8b74c9', '☆', 'Experiências cada vez melhores')}</tr></table></td></tr>
  <tr><td style="padding:6px 24px 12px"><p style="${f};font-size:11px;color:#7a8794;line-height:1.5;margin:0">Este link é exclusivo desta vaga: <a href="${rsLink(a)}" style="color:#0e3b5c">${rsLink(a)}</a></p></td></tr>
  <tr><td style="padding:10px 24px 18px;border-top:1px solid #e3e7eb;text-align:center"><img src="${o}/img/selecao-logos.png" width="560" alt="Âmbar Energia · Green Cargo · Fluxus · MGAS · Logás" style="display:inline-block;width:560px;max-width:100%;height:auto;border:0"></td></tr>
</table>`;
}

let rsEmailAtual = null;
function rsAbrirEmail(id, lembrete) {
  const a = rsx.lista.find(x => x.id === id);
  rsEmailAtual = { a, lembrete };
  document.getElementById('rs-email-titulo').textContent = `${a.gestor || 'Gestor'} · ${a.vaga}${lembrete ? ' · lembrete' : ''}`;
  document.getElementById('rs-email-previa').innerHTML = rsEmailHtml(a, lembrete);
  document.getElementById('rs-email-abrir').href = xpMailto(a.gestor_email, `${lembrete ? 'Lembrete: ' : ''}${rsAssunto(a)}`, rsMensagem(a, lembrete));
  document.getElementById('modal-rs-email').showModal();
}
document.getElementById('rs-email-copiar').addEventListener('click', async () => {
  const { a, lembrete } = rsEmailAtual;
  const html = rsEmailHtml(a, lembrete);
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([rsMensagem(a, lembrete)], { type: 'text/plain' }) })]);
  } catch {
    // Navegadores sem a área de transferência moderna: copia a prévia selecionada.
    const r = document.createRange();
    r.selectNodeContents(document.getElementById('rs-email-previa'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.execCommand('copy');
    s.removeAllRanges();
  }
  toast('E-mail copiado ✅ Agora abra seu e-mail e cole no corpo da mensagem.');
});
document.getElementById('modal-rs-email').addEventListener('close', () => renderVisaoAtual());

// ---------- Início e ficha ----------
function renderRsInicio() {
  const n = (v, rotulo, cls = '') => `<li class="${cls}"><strong>${fmt(v)}</strong><span>${rotulo}</span></li>`;
  const c = (s) => rsx.lista.filter(a => a.status === s).length;
  const mes = xpHojeIso().slice(0, 7);
  const lembrar = rsx.lista.filter(a => a.lembrar).length;
  const alertas = rsx.lista.filter(a => a.alerta).length;
  document.getElementById('ja-nums-rs').innerHTML = n(c('a_enviar'), 'a enviar', c('a_enviar') ? 'alerta' : '') + n(c('enviada'), 'aguardando resposta')
    + n(lembrar, 'para lembrar', lembrar ? 'alerta' : '') + n(rsx.lista.filter(a => (a.respondido_em || '').slice(0, 7) === mes).length, 'respondidas no mês')
    + n(alertas, 'para agir', alertas ? 'alerta' : '');
}

/** Etapa da linha do tempo na ficha da pessoa (antes da admissão). */
function rsEtapaFicha(p) {
  const a = rsx.lista.find(x => x.pessoa_id === p.id);
  if (!a) return '';
  const est = a.status === 'respondida' ? 'feita' : a.status === 'dispensada' ? 'dispensada' : 'atual';
  let corpo = `<span class="selo-st ${RS_STATUS[a.status][1]}">${RS_STATUS[a.status][0]}</span>`;
  if (a.status === 'respondida') corpo += `${a.alerta ? ' <span class="pc-chip">Para agir</span>' : ''} <button type="button" class="btn btn-claro btn-sm" data-ver-rs="${a.id}">Ver avaliação</button>`;
  else if (a.status !== 'dispensada') corpo += `<p class="q-dica">Gestor: ${esc(a.gestor || '–')}${a.lembrar ? ' · 🔔 lembrete sugerido' : ''}</p>${rsBotoesEnvio(a, a.lembrar)}`;
  return `<li class="tl-etapa ${est}"><span class="tl-ic">🎯</span>
    <div><p class="tl-tit"><strong>Processo seletivo · avaliação do gestor</strong><small>${esc(a.vaga || '')}</small></p>${corpo}</div></li>`;
}

// ---------- Acompanhar (quadro) ----------
const rsUnicos = (campo) => [...new Set(rsx.lista.map(a => a[campo]).filter(Boolean))].sort();

function renderRsKanban() {
  xpPreencher('rk-regional', rsUnicos('regional'), 'Todas as regionais');
  xpPreencher('rk-usina', rsUnicos('usina'), 'Todas as usinas');
  xpPreencher('rk-recrutador', rsUnicos('recrutador'), 'Todos os recrutadores');
  const regional = document.getElementById('rk-regional').value;
  const usina = document.getElementById('rk-usina').value;
  const recrutador = document.getElementById('rk-recrutador').value;
  const busca = dslNorm(document.getElementById('rk-busca').value);
  const dispensadas = document.getElementById('rk-dispensadas').checked;
  const lista = rsx.lista.filter(a => (!regional || a.regional === regional) && (!usina || a.usina === usina) && (!recrutador || a.recrutador === recrutador)
    && (!busca || dslNorm([a.vaga, a.candidato, a.gestor, a.recrutador, a.usina, a.empresa].join(' ')).includes(busca)));
  document.getElementById('rk-regra').textContent = `Cada pessoa cadastrada em Pessoas${rsx.form.admissao_minima ? ` (admitida a partir de ${xpData(rsx.form.admissao_minima)})` : ''} gera a avaliação para o gestor da vaga. `
    + `Envie por WhatsApp, e-mail com QR Code, link ou QR Code. Sem resposta em ${rsx.form.dias_lembrete} dias, o cartão sugere um lembrete.`;
  const colunas = dispensadas ? [...RS_COLUNAS, ['dispensada', 'Dispensadas', 'Não serão avaliadas']] : RS_COLUNAS;
  const kb = document.getElementById('rk-kanban');
  kb.classList.toggle('quatro', dispensadas);
  kb.innerHTML = colunas.map(([st, titulo, dica]) => {
    const cards = lista.filter(a => a.status === st);
    if (st === 'enviada') cards.sort((x, y) => Number(y.lembrar) - Number(x.lembrar) || (x.enviado_em || '').localeCompare(y.enviado_em || ''));
    return `<section class="kb-col kb-${st}">
      <header><h3>${titulo}</h3><span class="kb-qtd">${cards.length}</span><small>${dica}</small></header>
      <div class="kb-cards">${cards.map(rsCartao).join('') || '<p class="kb-vazio">Nada por aqui.</p>'}</div>
    </section>`;
  }).join('');
}
['rk-regional', 'rk-usina', 'rk-recrutador', 'rk-dispensadas'].forEach(id => document.getElementById(id).addEventListener('change', renderRsKanban));
document.getElementById('rk-busca').addEventListener('input', renderRsKanban);

function rsCartao(a) {
  let corpo = '';
  if (a.status === 'a_enviar') corpo = rsBotoesEnvio(a);
  else if (a.status === 'enviada') {
    corpo = `<p class="kb-nota">📨 Enviada em ${xpDataHora(a.enviado_em)}${a.aberto_em ? ` · 👀 aberta em ${xpDataHora(a.aberto_em)}` : ''}</p>
      ${a.lembrete_em ? `<p class="kb-nota">🔔 Lembrete enviado em ${xpDataHora(a.lembrete_em)}</p>` : ''}
      ${a.lembrar ? `<p class="kb-prazo perto">🔔 ${rsx.form.dias_lembrete}+ dias sem resposta: envie um lembrete</p>${rsBotoesEnvio(a, true)}` : rsBotoesEnvio(a)}`;
  } else if (a.status === 'respondida') {
    const sg = rsPergunta('satisfacao_geral');
    const nota = sg ? rsNota(sg.opcoes, Object.values(rsResp(a, 'satisfacao_geral') || {})[0]) : null;
    corpo = `${nota != null ? `<p class="kb-decisao"><span class="kb-nota-pc ${nota === 1 ? 'baixa' : ''}">satisfação geral <strong>${nota}</strong> / 3</span></p>` : ''}
      <p class="kb-nota">✍ Respondida em ${xpDataHora(a.respondido_em)}</p>`;
  } else corpo = `<button type="button" class="btn btn-claro btn-sm" data-rs-acao="reativar" data-rs-id="${a.id}">↺ Reativar</button>`;
  return `<article class="kb-card ${a.alerta ? 'kb-alerta' : ''}">
    <div class="kb-topo">
      <span class="kb-periodo">${esc(xpIniciais(a.gestor) || '?')}</span>
      <div><strong>${esc(a.vaga || 'Vaga')}</strong><small>${esc([a.candidato && `aprovado(a): ${a.candidato}`, a.empresa].filter(Boolean).join(' · '))}</small></div>
      <details class="kb-menu"><summary title="Mais ações">⋯</summary>
        <div>
          ${a.pessoa_id ? `<button type="button" data-ficha="${a.pessoa_id}">Ficha da pessoa</button>` : ''}
          ${a.respondido_em ? `<button type="button" data-ver-rs="${a.id}">Ver avaliação</button>
            <button type="button" data-rs-acao="reabrir" data-rs-id="${a.id}">Reabrir para o gestor</button>` : ''}
          ${!a.respondido_em && a.status !== 'dispensada' ? `<button type="button" data-rs-acao="dispensar" data-rs-id="${a.id}">Dispensar</button>` : ''}
          ${a.status === 'dispensada' ? `<button type="button" data-rs-acao="reativar" data-rs-id="${a.id}">Reativar</button>` : ''}
          ${!a.pessoa_id ? `<button type="button" data-rs-acao="excluir" data-rs-id="${a.id}">Excluir</button>` : ''}
        </div>
      </details>
    </div>
    <p class="kb-gestor">Gestor: <strong>${esc(a.gestor || '–')}</strong>${a.recrutador ? ` · recrutador(a) ${esc(a.recrutador)}` : ''}</p>
    <p class="kb-gestor">${esc([a.regional, a.usina].filter(Boolean).join(' · ') || 'sem regional')}${a.admissao ? ` · admissão ${xpData(a.admissao)}` : ''}</p>
    ${a.alerta ? '<p class="kb-flag">⚠️ Nota 1 em algum critério</p>' : ''}
    ${corpo}
    ${a.respondido_em ? `<button type="button" class="kb-ver" data-ver-rs="${a.id}">Ver avaliação →</button>` : ''}
  </article>`;
}

document.addEventListener('click', async (e) => {
  const ver = e.target.closest('[data-ver-rs]');
  if (ver) return rsAbrirRespostas(Number(ver.dataset.verRs));
  const b = e.target.closest('[data-rs-acao]');
  if (!b) return;
  const a = rsx.lista.find(x => x.id === Number(b.dataset.rsId));
  const acao = b.dataset.rsAcao;
  const pergunta = { reabrir: `Reabrir a avaliação da vaga ${a.vaga}? As respostas do gestor serão apagadas e o mesmo link volta a funcionar.`,
    dispensar: `Dispensar a avaliação da vaga ${a.vaga}? Você pode reativar depois.`, excluir: `Excluir a avaliação da vaga ${a.vaga}?` }[acao];
  if (pergunta && !confirm(pergunta)) return;
  try {
    await api(`/api/admin/selecao/${a.id}`, { method: 'PATCH', body: { acao } });
    toast('Feito ✅');
    await rsCarregar();
    renderVisaoAtual();
  } catch (err) { toast(err.message, 'erro'); }
});

// Nova avaliação (vaga fora da planilha)
document.getElementById('rk-nova').addEventListener('click', () => {
  const f = document.getElementById('form-rs-nova');
  f.reset();
  if (typeof xpListas === 'function') xpListas();
  document.getElementById('modal-rs-nova').showModal();
});
document.getElementById('form-rs-nova').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/admin/selecao', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
    document.getElementById('modal-rs-nova').close();
    toast('Avaliação criada ✅ Envie ao gestor pelo cartão em “A enviar”.');
    await rsCarregar();
    renderVisaoAtual();
  } catch (err) { toast(err.message, 'erro'); }
});

// ---------- Ver / imprimir respostas ----------
function rsHtmlLeitura(a) {
  return rsx.form.secoes.map((sec, i) => `
    <section class="xp-ler-bloco">
      <h3><b>${String(i + 1).padStart(2, '0')}</b>${esc(sec.titulo)}</h3>
      ${sec.perguntas.map(p => {
        const v = rsResp(a, p.id);
        if (p.tipo === 'grade') {
          return `<div class="xp-ler-q larga"><ul class="pc-ler-afs">${p.itens.map(it => { const n = rsNota(p.opcoes, v?.[it]);
            return `<li><span>${esc(it)}</span>${n ? `<span class="xp-r ${n === 3 ? 'positiva' : n === 2 ? 'neutra' : 'negativa'}">${n} · ${esc(v[it])}</span>` : '–'}</li>`; }).join('')}</ul></div>`;
        }
        let valor = '<span class="xp-r vazio">–</span>';
        if (v && (p.opcoes || []).length) valor = [].concat(v).map(x => `<span class="xp-r ${xpPositiva(p.opcoes, x) ? 'positiva' : 'atencao'}">${esc(x)}</span>`).join(' ');
        else if (v) valor = `<span class="xp-r texto">${esc(v)}</span>`;
        return `<div class="xp-ler-q ${p.tipo === 'texto' ? 'larga' : ''}"><p>${esc(p.texto)}</p><div>${valor}</div></div>`;
      }).join('')}
    </section>`).join('');
}
const rsIdent = (a) => [['Vaga', a.vaga], ['Pessoa aprovada', a.candidato], ['Gestor', a.gestor], ['Recrutador(a)', a.recrutador], ['Empresa', a.empresa],
  ['Regional', a.regional], ['Usina', a.usina], ['Admissão', xpData(a.admissao)], ['Respondida em', xpDataHora(a.respondido_em)]];
let rsAberta = null;
function rsAbrirRespostas(id) {
  const a = rsx.lista.find(x => x.id === id);
  rsAberta = a;
  document.getElementById('rs-modal-titulo').textContent = `${a.vaga} · ${a.gestor}`;
  document.getElementById('rs-modal-corpo').innerHTML = `
    <div class="det-ident">${rsIdent(a).map(([k, v]) => `<div><small>${k}</small><span>${esc(v || '–')}</span></div>`).join('')}</div>
    ${a.alerta ? '<p class="kb-flag" style="margin:0 0 1rem">⚠️ O gestor deu nota 1 (insatisfeito) em algum critério: vale um retorno.</p>' : ''}
    <div class="xp-ler">${rsHtmlLeitura(a)}</div>`;
  ['modal-ficha', 'modal-xp', 'modal-pc'].forEach(m => { const d = document.getElementById(m); if (d?.open) d.close(); });
  document.getElementById('modal-rs').showModal();
}
document.getElementById('rs-imprimir').addEventListener('click', () => {
  const a = rsAberta;
  const w = window.open('', '_blank');
  if (!w) return toast('Permita pop-ups para imprimir.', 'erro');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Processo seletivo · ${esc(a.vaga)}</title>
    <link rel="stylesheet" href="${location.origin}/css/base.css"><link rel="stylesheet" href="${location.origin}/css/experiencia.css"><link rel="stylesheet" href="${location.origin}/css/jornada.css">
    <style>body{background:#fff;margin:22px;font-size:12px} .xp-ler-bloco{break-inside:avoid;border-color:#ccd} header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #ec6b24;padding-bottom:8px;margin-bottom:12px}
      .ident{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 14px;padding:10px;background:#f4f6f8;border-radius:8px;margin-bottom:12px} .ident small{display:block;color:#5f6f7c;font-size:10px}</style></head><body>
    <header><span class="logo"><b>Âmbar</b><small>ENERGIA</small></span><div style="text-align:right"><strong style="color:#0e3b5c;font-size:15px">${esc(rsx.form.titulo)}</strong><br><span>Jornada Âmbar · Recrutamento e Seleção</span></div></header>
    <div class="ident">${rsIdent(a).map(([k, v]) => `<div><small>${k}</small>${esc(v || '–')}</div>`).join('')}</div>
    <div class="xp-ler">${rsHtmlLeitura(a)}</div>
    <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
  w.document.close();
});

// ---------- Indicadores ----------
function rsFiltradas() {
  const v = (id) => document.getElementById(id).value;
  const [regional, usina, empresa, recrutador, de, ate] = ['ri-regional', 'ri-usina', 'ri-empresa', 'ri-recrutador', 'ri-de', 'ri-ate'].map(v);
  return rsx.lista.filter(a => a.status !== 'dispensada' && (!regional || a.regional === regional) && (!usina || a.usina === usina) && (!empresa || a.empresa === empresa)
    && (!recrutador || a.recrutador === recrutador) && (!de || (a.respondido_em || '9') >= de) && (!ate || !a.respondido_em || a.respondido_em.slice(0, 10) <= ate));
}

/** Resumo de uma lista de avaliações: médias, distribuição e percentuais. */
function rsResumo(lista) {
  const resp = lista.filter(a => a.status === 'respondida');
  const convidados = lista.filter(a => a.status === 'enviada' || a.status === 'respondida').length;
  const notas = [];       // todas as notas dos critérios
  const porItem = new Map();
  for (const p of rsGrades()) for (const it of p.itens) porItem.set(it, { p, it, notas: [] });
  for (const a of resp) for (const p of rsGrades()) for (const it of p.itens) {
    const n = rsNota(p.opcoes, rsResp(a, p.id)?.[it]);
    if (n) { porItem.get(it).notas.push(n); notas.push(n); }
  }
  const sg = rsPergunta('satisfacao_geral');
  const geral = sg ? resp.map(a => rsNota(sg.opcoes, Object.values(rsResp(a, 'satisfacao_geral') || {})[0])).filter(Boolean) : [];
  const pctPositivo = (id) => {
    const p = rsPergunta(id);
    const vs = p ? resp.map(a => rsResp(a, id)).filter(v => v && p.opcoes.includes(v)) : [];
    return vs.length ? xpPct(vs.filter(v => xpPositiva(p.opcoes, v)).length, vs.length) : null;
  };
  const media = (it) => { const x = [...porItem.values()].find(o => dslNorm(o.it).includes(it)); return x?.notas.length ? xpMedia(x.notas) : null; };
  return {
    total: lista.length, resp, convidados, notas, porItem,
    geral: geral.length ? xpMedia(geral) : null, muito: geral.length ? xpPct(geral.filter(n => n === 3).length, geral.length) : null,
    mediaCriterios: notas.length ? xpMedia(notas) : null, satisfeitos: notas.length ? xpPct(notas.filter(n => n >= 2).length, notas.length) : null,
    aderencia: pctPositivo('aderencia'), tempo: pctPositivo('tempo'), resposta: convidados ? xpPct(resp.length, convidados) : null,
    agilidade: media('agilidade'), qualidade: media('qualidade'), comunicacao: media('comunicacao'),
  };
}

function renderRsIndicadores() {
  xpPreencher('ri-regional', rsUnicos('regional'), 'Todas as regionais');
  xpPreencher('ri-usina', rsUnicos('usina'), 'Todas as usinas');
  xpPreencher('ri-empresa', rsUnicos('empresa'), 'Todas as empresas');
  xpPreencher('ri-recrutador', rsUnicos('recrutador'), 'Todos os recrutadores');
  const lista = rsFiltradas();
  const r = rsResumo(lista);
  const agir = r.resp.filter(a => a.alerta);
  document.getElementById('ri-kpis').innerHTML = [
    ['⭐', r.geral == null ? '–' : `${rsFmtNota(r.geral)} / 3`, 'satisfação geral', `média de ${fmt(r.resp.length)} avaliação(ões)`],
    ['😊', fmtPct(r.satisfeitos), 'notas satisfeito ou muito', 'notas 2 e 3 em todos os critérios'],
    ['🏆', fmtPct(r.muito), 'muito satisfeitos', 'nota 3 na satisfação geral'],
    ['🎯', fmtPct(r.aderencia), 'candidatos aderentes', 'totalmente ou em sua maioria'],
    ['⏱', fmtPct(r.tempo), 'tempo de fechamento adequado', 'muito adequado ou adequado'],
    ['📨', fmtPct(r.resposta), 'taxa de resposta', `${fmt(r.resp.length)} de ${fmt(r.convidados)} gestor(es)`],
    ['⚠️', fmt(agir.length), 'para agir', 'alguma nota 1 (insatisfeito)'],
  ].map(([ic, valor, rotulo, sub]) => `
    <div class="kpi ${ic === '⚠️' && agir.length ? 'kpi-alerta' : ''}"><span class="ic">${ic}</span><div><strong>${valor}</strong><span>${rotulo}</span><small>${sub}</small></div></div>`).join('');

  // Mapas por regional, recrutador e empresa
  const celN = (n) => `<td class="v ${rsCor(n)}">${rsFmtNota(n)}</td>`;
  const celP = (p) => `<td class="v">${fmtPct(p)}</td>`;
  const tabela = (id, campo, rotulo, completo) => {
    const g = new Map();
    for (const a of lista) { const k = a[campo] || `(sem ${rotulo.toLowerCase()})`; if (!g.has(k)) g.set(k, []); g.get(k).push(a); }
    const linhas = [...g.entries()].sort((x, y) => y[1].length - x[1].length).map(([k, l]) => [k, rsResumo(l)]);
    if (completo && linhas.length > 1) linhas.push(['Total', r]);
    const cab = completo ? ['Seleções avaliadas', 'Satisfação geral', 'Média dos critérios', 'Agilidade', 'Qualidade dos candidatos', 'Comunicação', 'Aderência', 'Tempo adequado', 'Resposta']
      : ['Avaliadas', 'Satisfação geral', 'Média dos critérios', 'Aderência', 'Resposta'];
    document.getElementById(id).innerHTML = `<tr><th>${rotulo}</th>${cab.map(c => `<th>${c}</th>`).join('')}</tr>
      ${linhas.map(([k, x]) => `<tr class="${k === 'Total' ? 'total' : ''}"><td><strong>${esc(k)}</strong></td><td class="v">${fmt(x.resp.length)}</td>${celN(x.geral)}${celN(x.mediaCriterios)}
        ${completo ? celN(x.agilidade) + celN(x.qualidade) + celN(x.comunicacao) + celP(x.aderencia) + celP(x.tempo) : celP(x.aderencia)}${celP(x.resposta)}</tr>`).join('')
        || `<tr><td colspan="${cab.length + 1}">Sem avaliações neste filtro.</td></tr>`}`;
  };
  tabela('ri-regionais', 'regional', 'Regional', true);
  tabela('ri-recrutadores', 'recrutador', 'Recrutador(a)', false);
  tabela('ri-empresas', 'empresa', 'Empresa', false);

  // Distribuição das notas por critério
  const itens = [...r.porItem.values()].filter(o => o.notas.length);
  document.getElementById('ri-criterios').innerHTML = itens.length ? `
    <div class="rs-leg-n"><span><i class="a"></i>1 Insatisfeito</span><span><i class="b"></i>2 Satisfeito</span><span><i class="c"></i>3 Muito satisfeito</span></div>
    ${itens.map(o => { const q = (n) => xpPct(o.notas.filter(x => x === n).length, o.notas.length);
      return `<div class="rs-dist" data-dica="${esc(`<strong>${esc(o.it)}</strong><br>${fmt(o.notas.filter(x => x === 1).length)} insatisfeito · ${fmt(o.notas.filter(x => x === 2).length)} satisfeito · ${fmt(o.notas.filter(x => x === 3).length)} muito satisfeito`)}" tabindex="0">
        <span title="${esc(o.it)}">${esc(o.it)}</span><i><u class="a" style="width:${q(1)}%"></u><u class="b" style="width:${q(2)}%"></u><u class="c" style="width:${q(3)}%"></u></i><b class="${rsCor(xpMedia(o.notas))}">${rsFmtNota(xpMedia(o.notas))}</b></div>`; }).join('')}`
    : '<p class="q-dica">Sem avaliações respondidas neste filtro.</p>';

  // Para agir
  document.getElementById('ri-agir').innerHTML = agir.length ? agir.map(a => {
    const baixas = rsGrades().flatMap(p => p.itens.filter(it => rsNota(p.opcoes, rsResp(a, p.id)?.[it]) === 1));
    const melhoria = rsResp(a, 'melhorias');
    return `<button type="button" class="pc-agir-item" data-ver-rs="${a.id}">
      <span><strong>${esc(a.vaga)}</strong> · ${esc([a.regional, a.usina].filter(Boolean).join(' · ') || '–')} · gestor ${esc(a.gestor || '–')}${a.recrutador ? ` · recrutador(a) ${esc(a.recrutador)}` : ''}</span>
      ${baixas.slice(0, 3).map(it => `<small><span class="pc-chip">Nota 1</span>${esc(it)}</small>`).join('')}
      ${melhoria ? `<small>“${esc(melhoria)}”</small>` : ''}
    </button>`;
  }).join('') : '<p class="q-dica">Nenhuma avaliação com nota 1 neste filtro. 🎉</p>';

  // Aderência e tempo
  const dist = (id, alvo) => {
    const p = rsPergunta(id);
    if (!p) return document.getElementById(alvo).innerHTML = '';
    const vs = r.resp.map(a => rsResp(a, id)).filter(Boolean);
    barras(alvo, vs.length ? p.opcoes.map(o => ({ rotulo: o, valor: xpPct(vs.filter(v => v === o).length, vs.length),
      dica: `<strong>${esc(o)}</strong><br>${fmt(vs.filter(v => v === o).length)} de ${fmt(vs.length)} avaliação(ões)` })) : [], 'Sem avaliações respondidas neste filtro.');
  };
  dist('aderencia', 'ri-aderencia');
  dist('tempo', 'ri-tempo');

  // Falas
  const abertas = (rsx.form.secoes || []).flatMap(s => s.perguntas).filter(p => p.tipo === 'texto');
  const falas = r.resp.flatMap(a => abertas.map(p => ({ a, p, v: String(rsResp(a, p.id) || '').trim() })).filter(x => x.v))
    .sort((x, y) => y.a.respondido_em.localeCompare(x.a.respondido_em)).slice(0, 12);
  document.getElementById('ri-falas').innerHTML = falas.length ? falas.map(({ a, p, v }) => `
    <figure class="pc-fala"><q>${esc(v)}</q><figcaption>${esc(p.texto)}<br><strong>${esc(a.vaga)}</strong> · ${esc(a.gestor || '–')} · ${esc(a.regional || '–')}</figcaption></figure>`).join('')
    : '<p class="q-dica">Nenhuma resposta aberta ainda.</p>';
}
['ri-regional', 'ri-usina', 'ri-empresa', 'ri-recrutador', 'ri-de', 'ri-ate'].forEach(id => document.getElementById(id).addEventListener('change', renderRsIndicadores));

document.getElementById('ri-exportar').addEventListener('click', () => {
  const dataCel = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`) : '');
  const dh = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z') : '');
  const grades = rsGrades();
  const outras = (rsx.form.secoes || []).flatMap(s => s.perguntas).filter(p => p.tipo !== 'grade');
  const cab = ['ID', 'Vaga', 'Pessoa aprovada', 'Gestor', 'E-mail do gestor', 'Recrutador(a)', 'Empresa', 'Regional', 'Usina', 'Admissão', 'Situação', 'Enviada em',
    'Lembrete em', 'Respondida em', 'Média dos critérios', 'Para agir', ...grades.flatMap(p => p.itens.map(it => `${it} (1 a 3)`)), ...outras.map(p => p.texto)];
  const linhas = rsx.lista.map(a => {
    const notas = grades.flatMap(p => p.itens.map(it => rsNota(p.opcoes, rsResp(a, p.id)?.[it])));
    const validas = notas.filter(Boolean);
    return [a.id, a.vaga, a.candidato, a.gestor, a.gestor_email, a.recrutador, a.empresa, a.regional, a.usina, dataCel(a.admissao), RS_STATUS[a.status][0],
      dh(a.enviado_em), dh(a.lembrete_em), dh(a.respondido_em), validas.length ? Math.round(xpMedia(validas) * 100) / 100 : '', a.respondido_em ? (a.alerta ? 'Sim' : 'Não') : '',
      ...notas.map(n => n ?? ''), ...outras.map(p => { const v = rsResp(a, p.id); return Array.isArray(v) ? v.join('; ') : v ?? ''; })];
  });
  const base = [['ID', 'Vaga', 'Gestor', 'Recrutador(a)', 'Empresa', 'Regional', 'Usina', 'Respondida em', 'Critério', 'Nota (1 a 3)', 'Resposta']];
  for (const a of rsx.lista.filter(x => x.respondido_em)) {
    for (const p of grades) for (const it of p.itens) {
      const v = rsResp(a, p.id)?.[it];
      if (v) base.push([a.id, a.vaga, a.gestor, a.recrutador, a.empresa, a.regional, a.usina, dh(a.respondido_em), it, rsNota(p.opcoes, v), v]);
    }
  }
  const aba = (aoa) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' });
    ws['!cols'] = aoa[0].map(() => ({ wch: 18 }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: aoa[0].length - 1, r: Math.max(aoa.length - 1, 0) } }) };
    return ws;
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, aba([cab, ...linhas]), 'Processo_seletivo');
  XLSX.utils.book_append_sheet(wb, aba(base), 'Base_indicadores');
  XLSX.writeFile(wb, `avaliacao-processo-seletivo-${xpHojeIso()}.xlsx`);
});

// ---------- Formulário ----------
const rsEditor = criarEditorFormulario(document.getElementById('rf-secoes'), {
  rotuloSecao: 'Seção',
  camposSecao: true,
  tipos: { grade: 'Critérios com nota (escala)', unica: 'Escolha única', multipla: 'Múltipla seleção', texto: 'Pergunta aberta', curto: 'Texto curto', nota: 'Nota de 0 a 10' },
  presets: { satisfacao: ['Satisfação (1 a 3)', ['Muito satisfeito', 'Satisfeito', 'Insatisfeito']], aderencia: ['Aderência', ['Totalmente aderentes', 'Em sua maioria aderentes', 'Parcialmente aderentes', 'Pouco aderentes', 'Não aderentes']] },
});
function rsCarregarFormulario(f) {
  const campos = { titulo: f.titulo, introducao: f.introducao, 'admissao-minima': f.admissao_minima, 'dias-lembrete': f.dias_lembrete ?? 5,
    assunto: f.assunto, mensagem: f.mensagem, 'mensagem-lembrete': f.mensagem_lembrete };
  for (const [k, v] of Object.entries(campos)) document.getElementById(`rf-${k}`).value = v ?? '';
  document.getElementById('rf-ativa').checked = f.ativa !== false;
  rsEditor.carregar(f.secoes);
}
function renderRsFormulario() { rsCarregarFormulario(rsx.form); }
document.getElementById('rf-add-secao').addEventListener('click', () => rsEditor.adicionarSecao());
document.getElementById('rf-restaurar').addEventListener('click', async () => {
  if (!confirm('Carregar o modelo original (avaliação do processo de Recrutamento e Seleção)? As alterações só valem depois de Salvar.')) return;
  rsCarregarFormulario(await api('/api/admin/selecao/formulario/padrao'));
  toast('Modelo original carregado. Clique em Salvar formulário para aplicar.');
});
document.getElementById('rf-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = (id) => document.getElementById(`rf-${id}`).value;
  try {
    rsx.form = await api('/api/admin/selecao/formulario', { method: 'PUT', body: {
      ativa: document.getElementById('rf-ativa').checked, titulo: v('titulo'), introducao: v('introducao'), admissao_minima: v('admissao-minima'),
      dias_lembrete: Number(v('dias-lembrete')), assunto: v('assunto'), mensagem: v('mensagem'), mensagem_lembrete: v('mensagem-lembrete'), secoes: rsEditor.secoes(),
    } });
    await rsCarregar();
    rsCarregarFormulario(rsx.form);
    toast('Formulário salvo ✅');
  } catch (err) { toast(err.message, 'erro'); }
});
