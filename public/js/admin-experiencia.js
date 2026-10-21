// Área do RH · Jornada Âmbar: início, pessoas e avaliação de experiência (acompanhamento, indicadores, Excel e formulário).
// Usa de outros arquivos, em tempo de execução: fmt, fmtPct, num, barras (admin.js); dsl, dslWhats, dslCopiar, dslNorm (admin-desligamento.js).
const xp = { pessoas: [], avaliacoes: [], form: null, carregado: false };

const XP_STATUS = {
  a_enviar: ['A enviar', 'st-pendente'], com_gestor: ['Com o gestor', 'st-gestor'], aguardando_ciencia: ['Aguardando ciência', 'st-recusa'],
  concluida: ['Concluída', 'st-ok'], aguardando_1: ['Aguarda o 1º período', 'st-pendente'], dispensada: ['Dispensada', 'st-pendente'],
};
const XP_COLUNAS = [
  ['a_enviar', 'A enviar', 'Envie o link ao gestor'],
  ['com_gestor', 'Com o gestor', 'Aguardando a avaliação'],
  ['aguardando_ciencia', 'Aguardando ciência', 'Envie ao colaborador'],
  ['concluida', 'Concluídas', 'Gestor e colaborador ok'],
];
const xpHojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const xpLink = (a, tipo = 'gestor') => `${location.origin}/${tipo === 'ciencia' ? 'ciencia' : 'avaliacao'}.html?t=${tipo === 'ciencia' ? a.token_ciencia : a.token_gestor}`;
const xpPrimeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';
function xpMensagem(modelo, a, tipo) {
  const vals = { gestor: xpPrimeiro(a.gestor) || 'gestor(a)', nome: tipo === 'ciencia' ? xpPrimeiro(a.nome) : a.nome, periodo: `${a.periodo}º período`,
    vencimento: xpData(a.vencimento), prazo: xpData(a.prazo), link: xpLink(a, tipo) };
  return String(modelo || '{link}').replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
}
const xpMailto = (email, assunto, msg) => `mailto:${String(email || '').replace(/[^\w.@+-]/g, '')}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(msg)}`;
const xpRespondida = (a) => a.status === 'aguardando_ciencia' || a.status === 'concluida';
const xpAtiva = (a) => a.status === 'a_enviar' || a.status === 'com_gestor';
const xpDiasEntre = (de, ate) => Math.round((new Date(ate.replace(' ', 'T') + 'Z') - new Date(de.replace(' ', 'T') + 'Z')) / 864e5);

async function xpCarregar() {
  const [pessoas, avaliacoes, form] = await Promise.all([
    api('/api/admin/pessoas'), api('/api/admin/experiencia/avaliacoes'), api('/api/admin/experiencia/formulario'),
  ]);
  Object.assign(xp, { pessoas, avaliacoes, form, carregado: true });
  const atrasadas = avaliacoes.filter(a => xpAtiva(a) && a.prazo < xpHojeIso()).length;
  const qtd = document.getElementById('qtd-exp');
  qtd.hidden = !atrasadas;
  qtd.textContent = atrasadas;
  qtd.title = `${atrasadas} avaliação(ões) atrasada(s)`;
}

/** Botões de envio: para o gestor (avaliação) ou para o colaborador (ciência). */
function xpBotoesEnvio(a, tipo) {
  const gestor = tipo === 'gestor';
  const msg = xpMensagem(gestor ? xp.form.mensagem : xp.form.mensagem_ciencia, a, tipo);
  const assunto = xpMensagem(xp.form.assunto, a, tipo);
  const tel = gestor ? a.gestor_telefone : a.telefone;
  const email = gestor ? a.gestor_email : a.email;
  const dados = `data-av="${a.id}" data-tipo="${tipo}"`;
  return `<div class="acoes-envio">
    <a class="btn btn-whats btn-sm" ${dados} data-envio href="${esc(dslWhats(tel, msg))}" target="_blank" rel="noopener" title="${tel ? 'WhatsApp para ' + esc(tel) : 'Escolher o contato no WhatsApp'}">WhatsApp</a>
    <a class="btn btn-claro btn-sm" ${dados} data-envio href="${esc(xpMailto(email, assunto, msg))}" title="${email ? 'E-mail para ' + esc(email) : 'Abrir e-mail'}">✉️</a>
    <button type="button" class="btn btn-claro btn-sm" ${dados} data-envio data-xp-copiar="${esc(xpLink(a, tipo))}" title="Copiar link">📋</button>
    <button type="button" class="btn btn-claro btn-sm" ${dados} data-envio data-xp-qr="${esc(gestor ? a.token_gestor : a.token_ciencia)}" title="QR Code">📱</button>
  </div>`;
}

// Qualquer forma de envio ao gestor move o cartão de "A enviar" para "Com o gestor".
document.addEventListener('click', async (e) => {
  const copiar = e.target.closest('[data-xp-copiar]');
  if (copiar) dslCopiar(copiar.dataset.xpCopiar);
  const qr = e.target.closest('[data-xp-qr]');
  if (qr) xpAbrirQr(qr.dataset.xpQr, qr.dataset.tipo);
  const envio = e.target.closest('[data-envio]');
  if (envio && envio.dataset.tipo === 'gestor') {
    const a = xp.avaliacoes.find(x => x.id === Number(envio.dataset.av));
    if (a && a.status === 'a_enviar') {
      await api(`/api/admin/experiencia/avaliacoes/${a.id}`, { method: 'PATCH', body: { acao: 'enviada' } });
      await xpCarregar();
      setTimeout(renderVisaoAtual, 300);
    }
  }
});

async function xpAbrirQr(token, tipo) {
  try {
    const q = await api(`/api/admin/experiencia/qrcode?t=${encodeURIComponent(token)}&tipo=${tipo}`);
    document.getElementById('qr-rotulo').textContent = tipo === 'ciencia' ? 'QR CODE · CIÊNCIA DO COLABORADOR' : 'QR CODE · AVALIAÇÃO DO GESTOR';
    document.getElementById('qr-dica').textContent = tipo === 'ciencia'
      ? 'O colaborador lê o QR Code, confere a avaliação e registra a ciência.'
      : 'O gestor lê o QR Code e preenche a avaliação de experiência.';
    document.getElementById('qr-titulo').textContent = q.titulo;
    document.getElementById('qr-img').innerHTML = q.svg;
    document.getElementById('qr-link').value = q.link;
    document.getElementById('qr-baixar').href = `/api/admin/experiencia/qrcode?t=${encodeURIComponent(token)}&tipo=${tipo}&formato=png`;
    document.getElementById('modal-qr').showModal();
  } catch (err) { toast(err.message, 'erro'); }
}

// ---------- Início ----------
function renderInicio() {
  const hoje = new Date();
  document.getElementById('ja-data').textContent = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const c = (s) => xp.avaliacoes.filter(a => a.status === s).length;
  const atrasadas = xp.avaliacoes.filter(a => xpAtiva(a) && a.prazo < xpHojeIso()).length;
  const n = (v, rotulo, cls = '') => `<li class="${cls}"><strong>${fmt(v)}</strong><span>${rotulo}</span></li>`;
  document.getElementById('ja-nums-exp').innerHTML = n(c('a_enviar'), 'a enviar') + n(c('com_gestor'), 'com gestores')
    + n(c('aguardando_ciencia'), 'aguardando ciência') + n(atrasadas, 'atrasadas', atrasadas ? 'alerta' : '');
  const mes = xpHojeIso().slice(0, 7);
  document.getElementById('ja-nums-dsl').innerHTML = n(dsl.convites.filter(x => x.status === 'pendente').length, 'convites aguardando')
    + n(dsl.respostas.filter(r => !r.recusou && r.criado_em.slice(0, 7) === mes).length, 'respondidas no mês')
    + n(dsl.respostas.filter(r => r.alerta).length, 'alertas', dsl.respostas.some(r => r.alerta) ? 'alerta' : '');
  renderPcInicio();

  const limite = (() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10); })();
  const agenda = xp.avaliacoes.filter(a => xpAtiva(a) && a.prazo <= limite).sort((a, b) => a.prazo.localeCompare(b.prazo));
  document.getElementById('ja-agenda').innerHTML = agenda.length ? agenda.map(a => {
    const pz = xpPrazo(a.prazo);
    return `<div class="ja-item">
      <span class="ja-dia ${pz.classe}"><b>${a.prazo.slice(8, 10)}</b>${new Date(`${a.prazo}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
      <div class="ja-item-txt"><strong>${esc(a.nome)}</strong><small>${a.periodo}º período · gestor ${esc(a.gestor || '–')} · ${pz.texto}</small></div>
      <span class="selo-st ${XP_STATUS[a.status][1]}">${XP_STATUS[a.status][0]}</span>
      ${xpBotoesEnvio(a, 'gestor')}
    </div>`;
  }).join('') : '<p class="q-dica">Nenhuma avaliação com prazo nos próximos 15 dias. 🎉</p>';
}

// ---------- Pessoas ----------
function xpDesligamentoDe(p) {
  const bate = (x) => (p.chapa && x.matricula && x.matricula === p.chapa) || dslNorm(x.nome) === dslNorm(p.nome);
  const resposta = dsl.respostas.find(bate);
  const convite = dsl.convites.find(bate);
  if (!resposta && !convite) return null;
  return { resposta, convite, data: resposta?.data_desligamento || convite?.data_desligamento || '',
    status: resposta ? (resposta.recusou ? 'recusou' : 'respondido') : convite.status };
}

function renderPessoas() {
  const busca = dslNorm(document.getElementById('pes-busca').value);
  const lista = xp.pessoas.filter(p => !busca || dslNorm([p.nome, p.chapa, p.cargo, p.setor, p.regional, p.gestor].join(' ')).includes(busca));
  document.getElementById('pes-qtd').textContent = `· ${xp.pessoas.length} pessoa(s)`;
  const chip = (a) => (a ? `<span class="selo-st ${XP_STATUS[a.status][1]}" title="Vence ${xpData(a.vencimento)}">${XP_STATUS[a.status][0]}${a.decisao ? ` · ${esc(a.decisao)}` : ''}</span>` : '–');
  document.getElementById('pes-tabela').innerHTML = `
    <tr><th>Colaborador</th><th>Setor${ehAdmin() ? ' / regional' : ''}</th><th>Gestor</th><th>Admissão</th><th>15 dias</th><th>1º período</th><th>2º período</th><th>Desligamento</th><th></th></tr>
    ${lista.map(p => {
      const av = (n) => xp.avaliacoes.find(a => a.pessoa_id === p.id && a.periodo === n);
      const d = xpDesligamentoDe(p);
      const pc = pcx.convites.find(c => c.pessoa_id === p.id);
      return `<tr>
        <td><strong>${esc(p.nome)}</strong><small class="sub">${esc([p.cargo, p.chapa && 'Chapa ' + p.chapa].filter(Boolean).join(' · '))}</small></td>
        <td>${esc(p.setor || '–')}${ehAdmin() ? `<small class="sub">${esc(p.regional || 'sem regional')}</small>` : ''}</td><td>${esc(p.gestor || '–')}</td><td>${xpData(p.admissao)}</td>
        <td>${pc ? `<span class="selo-st ${PC_STATUS[pc.status][1]}" title="Primeiras Conexões · responder até ${xpData(pc.prazo)}">${PC_STATUS[pc.status][0]}</span>` : '–'}</td>
        <td>${chip(av(1))}</td><td>${chip(av(2))}</td>
        <td>${d ? `<span class="selo-st ${DSL_STATUS[d.status][1]}">${DSL_STATUS[d.status][0]}</span>` : '–'}</td>
        <td><button type="button" class="btn btn-claro btn-sm" data-ficha="${p.id}">Ficha</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="9">${xp.pessoas.length ? 'Nada encontrado.' : 'Ninguém cadastrado ainda. Use “+ Nova pessoa” ou importe a planilha de admissões.'}</td></tr>`}`;
}
document.getElementById('pes-busca').addEventListener('input', renderPessoas);

function xpListas() {
  const unicos = (campo) => [...new Set(xp.pessoas.map(p => p[campo]).filter(Boolean))].sort();
  for (const [id, campo] of [['lista-cargos', 'cargo'], ['lista-setores', 'setor'], ['lista-gestores', 'gestor']]) {
    document.getElementById(id).innerHTML = unicos(campo).map(v => `<option value="${esc(v)}">`).join('');
  }
}

let xpPessoaEditando = null;
function xpAbrirPessoa(p = null) {
  xpPessoaEditando = p;
  xpListas();
  const f = document.getElementById('form-pessoa');
  f.reset();
  if (p) for (const el of f.elements) if (el.name && p[el.name] != null) el.value = p[el.name];
  document.getElementById('pessoa-titulo').textContent = p ? `Editar · ${p.nome}` : 'Nova pessoa';
  document.getElementById('modal-pessoa').showModal();
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-nova-pessoa]')) xpAbrirPessoa(); });
// Gestor já cadastrado: completa WhatsApp e e-mail dele automaticamente.
document.querySelector('#form-pessoa [name="gestor"]').addEventListener('change', (e) => {
  const f = e.target.form;
  const outro = xp.pessoas.find(p => p.gestor === e.target.value && (p.gestor_telefone || p.gestor_email));
  if (outro) {
    if (!f.gestor_telefone.value) f.gestor_telefone.value = outro.gestor_telefone || '';
    if (!f.gestor_email.value) f.gestor_email.value = outro.gestor_email || '';
  }
});
document.getElementById('form-pessoa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(e.target));
  try {
    if (xpPessoaEditando) await api(`/api/admin/pessoas/${xpPessoaEditando.id}`, { method: 'PUT', body: dados });
    else await api('/api/admin/pessoas', { method: 'POST', body: dados });
    document.getElementById('modal-pessoa').close();
    toast(xpPessoaEditando ? 'Cadastro atualizado ✅' : 'Pessoa cadastrada ✅ Avaliações do 1º e 2º período criadas.');
    await Promise.all([xpCarregar(), pcCarregar()]);
    renderVisaoAtual();
    if (xpPessoaEditando && document.getElementById('modal-ficha').open) xpAbrirFicha(xpPessoaEditando.id);
  } catch (err) { toast(err.message, 'erro'); }
});

function xpAbrirFicha(id) {
  const p = xp.pessoas.find(x => x.id === id);
  if (!p) return;
  const av = [1, 2].map(n => xp.avaliacoes.find(a => a.pessoa_id === id && a.periodo === n));
  const d = xpDesligamentoDe(p);
  const etapa = (ic, titulo, quando, corpo, estado = '') => `<li class="tl-etapa ${estado}"><span class="tl-ic">${ic}</span>
    <div><p class="tl-tit"><strong>${titulo}</strong><small>${quando}</small></p>${corpo}</div></li>`;
  const etapaAv = (a) => {
    if (!a) return '';
    const est = a.status === 'concluida' ? 'feita' : a.status === 'dispensada' ? 'dispensada' : xpAtiva(a) && a.prazo < xpHojeIso() ? 'atrasada' : 'atual';
    let corpo = `<span class="selo-st ${XP_STATUS[a.status][1]}">${XP_STATUS[a.status][0]}</span>`;
    if (a.decisao) corpo += ` <strong class="xp-decisao d-${a.decisao.toLowerCase()}">${esc(a.decisao)}${a.prorrogar_dias ? ` + ${a.prorrogar_dias} dias` : ''}</strong>`;
    if (xpAtiva(a)) corpo += `<p class="q-dica">Devolver até ${xpData(a.prazo)} · ${xpPrazo(a.prazo).texto}</p>${xpBotoesEnvio(a, 'gestor')}`;
    if (a.status === 'aguardando_ciencia') corpo += `<p class="q-dica">Envie ao colaborador para ciência:</p>${xpBotoesEnvio(a, 'ciencia')}`;
    if (xpRespondida(a)) corpo += ` <button type="button" class="btn btn-claro btn-sm" data-ver-xp="${a.id}">Ver avaliação</button>`;
    return etapa('🌱', `${a.periodo}º período de experiência`, `vence ${xpData(a.vencimento)}`, corpo, est);
  };
  const corpoDsl = d
    ? `<span class="selo-st ${DSL_STATUS[d.status][1]}">${DSL_STATUS[d.status][0]}</span>${d.resposta && !d.resposta.recusou ? ` <button type="button" class="btn btn-claro btn-sm" data-ver-dsl="${d.resposta.id}">Ver entrevista</button>` : ''}`
    : `<p class="q-dica">Se ${esc(xpPrimeiro(p.nome))} sair da empresa, inicie a entrevista daqui: os dados já vão preenchidos.</p>
       <button type="button" class="btn btn-marinho btn-sm" data-iniciar-dsl="${p.id}">🚪 Iniciar entrevista de desligamento</button>`;
  document.getElementById('ficha-titulo').textContent = p.nome;
  document.getElementById('ficha-corpo').innerHTML = `
    <div class="ficha-topo">
      <span class="xp-avatar">${esc(xpIniciais(p.nome))}</span>
      <div><strong>${esc(p.nome)}</strong><small>${esc([p.cargo, p.setor, p.regional && 'Regional ' + p.regional, p.chapa && 'Chapa ' + p.chapa].filter(Boolean).join(' · '))}</small>
        <small>Gestor: ${esc(p.gestor || '–')}${p.gestor_telefone ? ' · ' + esc(p.gestor_telefone) : ''}</small></div>
      <span class="ficha-acoes">
        <button type="button" class="btn btn-claro btn-sm" data-editar-pessoa="${p.id}">✏️ Editar</button>
        <button type="button" class="btn btn-perigo btn-sm" data-excluir-pessoa="${p.id}">Excluir</button>
      </span>
    </div>
    <ol class="tl">
      ${etapa('🎉', 'Admissão', xpData(p.admissao), '', 'feita')}
      ${pcEtapaFicha(p)}
      ${etapaAv(av[0])}${etapaAv(av[1])}
      ${etapa('🚪', 'Desligamento', d?.data ? xpData(d.data) : '', corpoDsl, d ? 'feita' : 'futura')}
    </ol>`;
  const m = document.getElementById('modal-ficha');
  if (!m.open) m.showModal();
}

document.addEventListener('click', async (e) => {
  const ficha = e.target.closest('[data-ficha]');
  if (ficha) return xpAbrirFicha(Number(ficha.dataset.ficha));
  const editar = e.target.closest('[data-editar-pessoa]');
  if (editar) return xpAbrirPessoa(xp.pessoas.find(p => p.id === Number(editar.dataset.editarPessoa)));
  const excluir = e.target.closest('[data-excluir-pessoa]');
  if (excluir) {
    const p = xp.pessoas.find(x => x.id === Number(excluir.dataset.excluirPessoa));
    if (!confirm(`Excluir ${p.nome} e as avaliações de experiência dele(a)? A entrevista de desligamento, se houver, é mantida.`)) return;
    await api(`/api/admin/pessoas/${p.id}`, { method: 'DELETE' });
    document.getElementById('modal-ficha').close();
    await Promise.all([xpCarregar(), pcCarregar()]);
    return renderVisaoAtual();
  }
  const iniciar = e.target.closest('[data-iniciar-dsl]');
  if (iniciar) {
    const p = xp.pessoas.find(x => x.id === Number(iniciar.dataset.iniciarDsl));
    try {
      const { token } = await api('/api/admin/desligamento/convites', { method: 'POST', body: {
        nome: p.nome, matricula: p.chapa, cargo: p.cargo, area: p.setor, regional: p.regional, gestor: p.gestor, data_admissao: p.admissao, telefone: p.telefone, email: p.email,
      } });
      dsl.convites = await api('/api/admin/desligamento/convites');
      const c = dsl.convites.find(x => x.token === token);
      iniciar.outerHTML = `<div class="convite-novo"><p>✅ Convite criado. Envie para ${esc(xpPrimeiro(p.nome))}:</p>${`<div class="acoes-envio">${dslBotoesEnvio(c)}</div>`}
        <p class="q-dica">Informe a data de desligamento na aba Enviar da entrevista, se quiser usá-la nos indicadores.</p></div>`;
    } catch (err) { toast(err.message, 'erro'); }
    return;
  }
  const verDsl = e.target.closest('[data-ver-dsl]');
  if (verDsl) { document.getElementById('modal-ficha').close(); return dslAbrirResposta(Number(verDsl.dataset.verDsl)); }
  const ver = e.target.closest('[data-ver-xp]');
  if (ver) return xpAbrirAvaliacao(Number(ver.dataset.verXp));
});

// Importação da planilha de admissões
let xpLinhasImportar = [];
function xpDataPlanilha(v) {
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  if (typeof v === 'number' && v > 20000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10);
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}
async function xpLerPlanilha(arquivo) {
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true, codepage: 65001 });
  const matriz = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: true });
  if (!matriz.length) return [];
  const norm = (s) => dslNorm(s).replace(/[^a-z0-9]+/g, ' ').trim();
  const cab = matriz[0].map(norm);
  const achar = (...nomes) => cab.findIndex(c => nomes.includes(c));
  const col = {
    nome: achar('nome', 'nome colaborador', 'colaborador', 'nome completo'), chapa: achar('chapa', 'matricula', 'registro'),
    cargo: achar('cargo', 'funcao'), setor: achar('setor', 'area', 'departamento'), regional: achar('regional', 'regiao', 'unidade'), gestor: achar('gestor', 'gestor imediato', 'lider'),
    admissao: achar('admissao', 'data de admissao', 'data admissao'),
    gestor_telefone: achar('telefone gestor', 'whatsapp gestor', 'celular gestor'), gestor_email: achar('email gestor', 'e mail gestor'),
    telefone: achar('telefone', 'whatsapp', 'celular', 'telefone colaborador'), email: achar('email', 'e mail', 'email colaborador'),
  };
  if (col.nome < 0 || col.admissao < 0) throw new Error('A planilha precisa ter ao menos as colunas NOME e ADMISSAO.');
  return matriz.slice(1).filter(l => l.some(v => String(v).trim())).map(l => {
    const o = Object.fromEntries(Object.entries(col).map(([k, i]) => [k, i >= 0 ? String(l[i] instanceof Date ? '' : l[i] ?? '').trim() : '']));
    o.admissao = xpDataPlanilha(l[col.admissao]);
    return o;
  });
}
document.getElementById('pes-arquivo').addEventListener('change', async (e) => {
  const previa = document.getElementById('pes-previa');
  const btn = document.getElementById('pes-importar');
  xpLinhasImportar = [];
  btn.disabled = true;
  previa.innerHTML = '';
  if (!e.target.files[0]) return;
  try {
    xpLinhasImportar = await xpLerPlanilha(e.target.files[0]);
    const semData = xpLinhasImportar.filter(l => !l.admissao).length;
    previa.innerHTML = `${xpLinhasImportar.length} linha(s) lida(s)${semData ? ` · <strong>${semData} sem data de admissão válida</strong> (serão ignoradas)` : ''}.
      Ex.: ${xpLinhasImportar.slice(0, 3).map(l => `${esc(l.nome)} (${xpData(l.admissao)})`).join(', ')}`;
    btn.disabled = !xpLinhasImportar.length;
  } catch (err) { previa.textContent = err.message; }
});
document.getElementById('pes-importar').addEventListener('click', async () => {
  try {
    const r = await api('/api/admin/pessoas/importar', { method: 'POST', body: { linhas: xpLinhasImportar } });
    toast(`${r.novos} nova(s), ${r.atualizados} atualizada(s)${r.invalidas.length ? `, ${r.invalidas.length} com erro` : ''} ✅`);
    document.getElementById('pes-previa').innerHTML = r.invalidas.length ? r.invalidas.slice(0, 10).map(i => `Linha ${i.linha}: ${esc(i.motivo)}`).join('<br>') : '';
    document.getElementById('pes-arquivo').value = '';
    document.getElementById('pes-importar').disabled = true;
    await Promise.all([xpCarregar(), pcCarregar()]);
    renderPessoas();
  } catch (err) { toast(err.message, 'erro'); }
});
document.getElementById('pes-modelo').addEventListener('click', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['NOME', 'CHAPA', 'CARGO', 'SETOR', 'REGIONAL', 'GESTOR', 'ADMISSAO', 'TELEFONE GESTOR', 'EMAIL GESTOR', 'TELEFONE', 'EMAIL'],
    ['Maria da Silva', '123456', 'Assistente de Logística', 'Logística', jaUsuario?.regional || 'Centro-Oeste', 'João Souza', new Date(), '(65) 99999-0000', 'joao@empresa.com', '(65) 98888-0000', 'maria@email.com'],
  ], { cellDates: true, dateNF: 'dd/mm/yyyy' });
  ws['!cols'] = Array(11).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws, 'Admissões');
  XLSX.writeFile(wb, 'modelo-admissoes-jornada-ambar.xlsx');
});

// ---------- Acompanhar (quadro) ----------
function xpPreencher(id, valores, rotulo) {
  const sel = document.getElementById(id);
  const atual = sel.value;
  sel.innerHTML = `<option value="">${rotulo}</option>` + valores.map(v => `<option ${v === atual ? 'selected' : ''}>${esc(v)}</option>`).join('');
}
const xpUnicos = (campo) => [...new Set(xp.avaliacoes.map(a => a[campo]).filter(Boolean))].sort();

function renderKanban() {
  xpPreencher('kb-regional', xpUnicos('regional'), 'Todas as regionais');
  xpPreencher('kb-setor', xpUnicos('setor'), 'Todos os setores');
  xpPreencher('kb-gestor', xpUnicos('gestor'), 'Todos os gestores');
  const per = document.getElementById('kb-periodo').value;
  const regional = document.getElementById('kb-regional').value;
  const setor = document.getElementById('kb-setor').value;
  const gestor = document.getElementById('kb-gestor').value;
  const busca = dslNorm(document.getElementById('kb-busca').value);
  const lista = xp.avaliacoes.filter(a => (!regional || a.regional === regional) && (!per || String(a.periodo) === per) && (!setor || a.setor === setor) && (!gestor || a.gestor === gestor)
    && (!busca || dslNorm([a.nome, a.chapa, a.cargo, a.setor, a.gestor].join(' ')).includes(busca)));
  document.getElementById('kanban').innerHTML = XP_COLUNAS.map(([st, titulo, dica]) => {
    const cards = lista.filter(a => a.status === st).sort((a, b) => (st === 'concluida' ? (b.ciencia_em || '').localeCompare(a.ciencia_em || '') : a.prazo.localeCompare(b.prazo)));
    return `<section class="kb-col kb-${st}">
      <header><h3>${titulo}</h3><span class="kb-qtd">${cards.length}</span><small>${dica}</small></header>
      <div class="kb-cards">${cards.map(xpCartao).join('') || '<p class="kb-vazio">Nada por aqui.</p>'}</div>
    </section>`;
  }).join('');
}
['kb-regional', 'kb-periodo', 'kb-setor', 'kb-gestor'].forEach(id => document.getElementById(id).addEventListener('change', renderKanban));
document.getElementById('kb-busca').addEventListener('input', renderKanban);

function xpCartao(a) {
  const pz = xpPrazo(a.prazo);
  let corpo = '';
  if (xpAtiva(a)) {
    corpo = `<p class="kb-prazo ${pz.classe}">⏳ ${xpData(a.prazo)} · ${pz.texto}</p>
      ${a.aberto_em ? `<p class="kb-nota">👀 Gestor abriu o link em ${xpDataHora(a.aberto_em)}</p>` : ''}
      ${xpBotoesEnvio(a, 'gestor')}`;
  } else if (a.status === 'aguardando_ciencia') {
    corpo = `<p class="kb-decisao"><strong class="xp-decisao d-${a.decisao.toLowerCase()}">${esc(a.decisao)}${a.prorrogar_dias ? ` + ${a.prorrogar_dias} dias` : ''}</strong></p>
      ${xpBotoesEnvio(a, 'ciencia')}`;
  } else {
    corpo = `<p class="kb-decisao"><strong class="xp-decisao d-${a.decisao.toLowerCase()}">${esc(a.decisao)}${a.prorrogar_dias ? ` + ${a.prorrogar_dias} dias` : ''}</strong></p>
      <p class="kb-nota">✍ Ciência ${a.ciencia_forma === 'rh' ? 'registrada pelo RH' : 'do colaborador'} em ${xpDataHora(a.ciencia_em)}</p>`;
  }
  return `<article class="kb-card ${a.alerta ? 'kb-alerta' : ''}">
    <div class="kb-topo">
      <span class="kb-periodo">${a.periodo}º</span>
      <div><strong>${esc(a.nome)}</strong><small>${esc([a.cargo, a.setor].filter(Boolean).join(' · '))}</small></div>
      <details class="kb-menu"><summary title="Mais ações">⋯</summary>
        <div>
          <button type="button" data-ficha="${a.pessoa_id}">Ficha da pessoa</button>
          ${xpRespondida(a) ? `<button type="button" data-ver-xp="${a.id}">Ver avaliação</button>` : ''}
          ${!a.respondido_em ? `<button type="button" data-xp-acao="vencimento" data-av="${a.id}">Ajustar vencimento</button>` : ''}
          ${a.status === 'aguardando_ciencia' ? `<button type="button" data-xp-acao="ciencia_rh" data-av="${a.id}">Registrar ciência (RH)</button>` : ''}
          ${a.respondido_em ? `<button type="button" data-xp-acao="reabrir" data-av="${a.id}">Reabrir para o gestor</button>` : ''}
        </div>
      </details>
    </div>
    <p class="kb-gestor">Gestor: <strong>${esc(a.gestor || '–')}</strong> · vence ${xpData(a.vencimento)}</p>
    ${a.alerta ? '<p class="kb-flag">⚠️ Requer atenção</p>' : ''}
    ${corpo}
    ${xpRespondida(a) ? `<button type="button" class="kb-ver" data-ver-xp="${a.id}">Ver avaliação →</button>` : ''}
  </article>`;
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-xp-acao]');
  if (!b) return;
  const a = xp.avaliacoes.find(x => x.id === Number(b.dataset.av));
  const acao = b.dataset.xpAcao;
  const body = { acao };
  if (acao === 'vencimento') {
    const v = prompt(`Novo vencimento do ${a.periodo}º período de ${a.nome} (dd/mm/aaaa):`, xpData(a.vencimento));
    if (!v) return;
    body.vencimento = xpDataPlanilha(v);
  } else if (acao === 'ciencia_rh') {
    const nome = prompt(`Registrar a ciência de ${a.nome} (por exemplo, assinada em papel). Quem registra?`, 'RH');
    if (nome === null) return;
    body.nome = `${nome || 'RH'} (registrada pelo RH)`;
  } else if (acao === 'reabrir' && !confirm(`Reabrir a avaliação de ${a.nome}? As respostas do gestor e a ciência serão apagadas.`)) return;
  try {
    await api(`/api/admin/experiencia/avaliacoes/${a.id}`, { method: 'PATCH', body });
    toast('Feito ✅');
    await xpCarregar();
    renderVisaoAtual();
  } catch (err) { toast(err.message, 'erro'); }
});

// ---------- Ver / imprimir avaliação ----------
const xpDadosLeitura = (a) => ({ ...a, pessoa: { nome: a.nome, gestor: a.gestor }, form: xp.form });
let xpAberta = null;
function xpAbrirAvaliacao(id) {
  const a = xp.avaliacoes.find(x => x.id === id);
  xpAberta = a;
  document.getElementById('xp-modal-rotulo').textContent = `AVALIAÇÃO DE EXPERIÊNCIA · ${a.periodo}º PERÍODO`;
  document.getElementById('xp-modal-titulo').textContent = a.nome;
  document.getElementById('xp-modal-corpo').innerHTML = `
    <div class="det-ident">${[['Cargo', a.cargo], ['Setor', a.setor], ['Chapa', a.chapa], ['Gestor', a.gestor], ['Admissão', xpData(a.admissao)], ['Vencimento', xpData(a.vencimento)],
      ['Respondida em', xpDataHora(a.respondido_em)], ['No prazo?', a.respondido_em.slice(0, 10) <= a.prazo ? 'Sim' : 'Não'],
      ['Ciência', a.ciencia_em ? `${xpDataHora(a.ciencia_em)} · ${a.ciencia_nome}` : 'pendente']].map(([k, v]) => `<div><small>${k}</small><span>${esc(v || '–')}</span></div>`).join('')}</div>
    <div class="xp-ler">${xpHtmlLeitura(xpDadosLeitura(a))}</div>`;
  const m = document.getElementById('modal-xp');
  if (document.getElementById('modal-ficha').open) document.getElementById('modal-ficha').close();
  m.showModal();
}
document.getElementById('xp-imprimir').addEventListener('click', () => {
  const a = xpAberta;
  const w = window.open('', '_blank');
  if (!w) return toast('Permita pop-ups para imprimir.', 'erro');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Avaliação de experiência · ${esc(a.nome)}</title>
    <link rel="stylesheet" href="${location.origin}/css/base.css"><link rel="stylesheet" href="${location.origin}/css/experiencia.css">
    <style>body{background:#fff;margin:22px;font-size:12px} .xp-ler-bloco{break-inside:avoid;border-color:#ccd} header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #ec6b24;padding-bottom:8px;margin-bottom:12px}
      .ident{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 14px;padding:10px;background:#f4f6f8;border-radius:8px;margin-bottom:12px} .ident small{display:block;color:#5f6f7c;font-size:10px}
      .assin{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:18px;font-size:11px} .assin div{border-top:1px solid #1d2b36;padding-top:4px}</style></head><body>
    <header><span class="logo"><b>Âmbar</b><small>ENERGIA</small></span><div style="text-align:right"><strong style="color:#0e3b5c;font-size:15px">${esc(xp.form.titulo)} · ${a.periodo}º período</strong><br><span>Jornada Âmbar</span></div></header>
    <div class="ident">${[['Colaborador', a.nome], ['Chapa', a.chapa], ['Cargo', a.cargo], ['Setor', a.setor], ['Gestor', a.gestor], ['Admissão', xpData(a.admissao)], ['Vencimento', xpData(a.vencimento)], ['Respondida', xpDataHora(a.respondido_em)]]
      .map(([k, v]) => `<div><small>${k}</small>${esc(v || '–')}</div>`).join('')}</div>
    <div class="xp-ler">${xpHtmlLeitura(xpDadosLeitura(a))}</div>
    <div class="assin"><div>Gestor: ${esc(a.gestor_nome || '')}<br>${xpDataHora(a.respondido_em)} (registro eletrônico)</div>
      <div>Ciente do colaborador: ${esc(a.ciencia_nome || '')}<br>${a.ciencia_em ? xpDataHora(a.ciencia_em) : 'pendente'}</div><div>Recursos Humanos</div></div>
    <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
  w.document.close();
});

// ---------- Indicadores ----------
function xpFiltradas() {
  const per = document.getElementById('xi-periodo').value;
  const regional = document.getElementById('xi-regional').value;
  const setor = document.getElementById('xi-setor').value;
  const gestor = document.getElementById('xi-gestor').value;
  const de = document.getElementById('xi-de').value;
  const ate = document.getElementById('xi-ate').value;
  return xp.avaliacoes.filter(a => a.status !== 'dispensada' && a.status !== 'aguardando_1' && (!regional || a.regional === regional) && (!per || String(a.periodo) === per) && (!setor || a.setor === setor)
    && (!gestor || a.gestor === gestor) && (!de || a.vencimento >= de) && (!ate || a.vencimento <= ate));
}
const xpPct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
const xpMedia = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const xpNoPrazo = (a) => a.respondido_em && a.respondido_em.slice(0, 10) <= a.prazo;
const xpTempo = (a) => (a.respondido_em && a.enviado_em ? Math.max(0, xpDiasEntre(a.enviado_em, a.respondido_em)) : null);

function renderXpIndicadores() {
  xpPreencher('xi-regional', xpUnicos('regional'), 'Todas as regionais');
  xpPreencher('xi-setor', xpUnicos('setor'), 'Todos os setores');
  xpPreencher('xi-gestor', xpUnicos('gestor'), 'Todos os gestores');
  const todas = xpFiltradas();
  const resp = todas.filter(xpRespondida);
  const dec = (d) => resp.filter(a => a.decisao === d).length;
  const atrasadas = todas.filter(a => xpAtiva(a) && a.prazo < xpHojeIso()).length;
  const tempos = resp.map(xpTempo).filter(t => t != null);
  document.getElementById('xi-kpis').innerHTML = [
    ['📝', fmt(resp.length), 'avaliações respondidas', `de ${fmt(todas.length)} no filtro`],
    ['✅', fmtPct(xpPct(dec('Efetivar'), resp.length)), 'efetivação', `${fmt(dec('Efetivar'))} colaborador(es)`],
    ['⏩', fmtPct(xpPct(dec('Prorrogar'), resp.length)), 'prorrogação', `${fmt(dec('Prorrogar'))} colaborador(es)`],
    ['✋', fmtPct(xpPct(dec('Rescindir'), resp.length)), 'rescisão', `${fmt(dec('Rescindir'))} colaborador(es)`],
    ['⏱', fmtPct(xpPct(resp.filter(xpNoPrazo).length, resp.length)), 'devolvidas no prazo', `${xp.form.antecedencia} dias antes do vencimento`],
    ['📨', tempos.length ? `${fmt(xpMedia(tempos), 1)} dias` : '–', 'tempo médio do gestor', 'do envio do link até a resposta'],
    ['⏳', fmt(atrasadas), 'atrasadas agora', 'sem resposta após o prazo'],
    ['⚠️', fmt(resp.filter(a => a.alerta).length), 'alertas', 'rescisão ou sem possibilidades futuras'],
  ].map(([ic, valor, rotulo, sub]) => `
    <div class="kpi ${ic === '⚠️' && resp.some(a => a.alerta) ? 'kpi-alerta' : ''}"><span class="ic">${ic}</span><div><strong>${valor}</strong><span>${rotulo}</span><small>${sub}</small></div></div>`).join('');

  const perguntas = xp.form.secoes.flatMap(s => s.perguntas.map(p => ({ ...p, secao: s.titulo })));
  const resposta = (a, id) => a.respostas.find(r => r.id === id)?.valor;
  const valores = [];
  const competencias = [];
  for (const p of perguntas) {
    if (p.tipo === 'grade') {
      for (const it of p.itens) {
        const vs = resp.map(a => resposta(a, p.id)?.[it]).filter(v => v && !xpNA(v));
        if (vs.length) valores.push({ rotulo: it, valor: xpPct(vs.filter(v => xpPositiva(p.opcoes, v)).length, vs.length), n: vs.length, texto: `${p.texto} · ${it}`, pos: vs.filter(v => xpPositiva(p.opcoes, v)).length });
      }
    } else if (p.tipo === 'unica' && (p.opcoes || []).length >= 2) {
      const vs = resp.map(a => resposta(a, p.id)).filter(v => v && !xpNA(v) && p.opcoes.includes(v));
      if (vs.length) competencias.push({ rotulo: p.texto, valor: xpPct(vs.filter(v => xpPositiva(p.opcoes, v)).length, vs.length), n: vs.length, texto: `${p.secao} · ${p.texto}`, pos: vs.filter(v => xpPositiva(p.opcoes, v)).length });
    }
  }
  const dica = (x) => `<strong>${esc(x.texto)}</strong><br>${fmt(x.pos)} de ${fmt(x.n)} positivas`;
  barras('xi-valores', valores.sort((a, b) => a.valor - b.valor).map(x => ({ ...x, dica: dica(x) })), 'Sem avaliações respondidas neste filtro.');
  barras('xi-competencias', competencias.sort((a, b) => a.valor - b.valor).map(x => ({ ...x, dica: dica(x) })), 'Sem avaliações respondidas neste filtro.');

  const agrupar = (campo) => {
    const g = new Map();
    for (const a of todas) { const k = a[campo] || '(sem informação)'; if (!g.has(k)) g.set(k, []); g.get(k).push(a); }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  };
  document.getElementById('xi-setores').innerHTML = `
    <tr><th>Setor</th><th>Avaliações</th><th>Respondidas</th><th>Efetivar</th><th>Prorrogar</th><th>Rescindir</th></tr>
    ${agrupar('setor').map(([k, l]) => { const r = l.filter(xpRespondida); const d = (x) => r.filter(a => a.decisao === x).length;
      return `<tr><td>${esc(k)}</td><td>${l.length}</td><td>${r.length}</td><td>${d('Efetivar')}</td><td>${d('Prorrogar')}</td><td>${d('Rescindir')}</td></tr>`; }).join('') || '<tr><td colspan="6">Sem dados.</td></tr>'}`;
  document.getElementById('xi-gestores').innerHTML = `
    <tr><th>Gestor</th><th>Avaliações</th><th>Respondidas</th><th>No prazo</th><th>Tempo médio</th><th>Atrasadas</th></tr>
    ${agrupar('gestor').map(([k, l]) => { const r = l.filter(xpRespondida); const t = r.map(xpTempo).filter(x => x != null);
      return `<tr><td>${esc(k)}</td><td>${l.length}</td><td>${r.length}</td><td>${r.length ? fmtPct(xpPct(r.filter(xpNoPrazo).length, r.length)) : '–'}</td>
        <td>${t.length ? `${fmt(xpMedia(t), 1)} dias` : '–'}</td><td>${l.filter(a => xpAtiva(a) && a.prazo < xpHojeIso()).length}</td></tr>`; }).join('') || '<tr><td colspan="6">Sem dados.</td></tr>'}`;

  // Cruzamento com a entrevista de desligamento: quem saiu com até 90 dias de casa.
  const linhas = xp.pessoas.map(p => ({ p, d: xpDesligamentoDe(p) })).filter(({ p, d }) => d && d.data && (new Date(d.data) - new Date(p.admissao)) / 864e5 <= 90)
    .map(({ p, d }) => {
      const avs = xp.avaliacoes.filter(a => a.pessoa_id === p.id && a.decisao).map(a => `${a.periodo}º: ${a.decisao} (${a.classificacao.replace(/ para o futuro| futuras/g, '')})`);
      const mot = d.resposta?.respostas.find(r => r.id === 'motivos');
      const volt = d.resposta?.respostas.find(r => r.id === 'voltaria');
      return `<tr><td><strong>${esc(p.nome)}</strong><small class="sub">${esc(p.setor || '')}</small></td><td>${xpData(p.admissao)}</td><td>${xpData(d.data)}</td>
        <td>${Math.round((new Date(d.data) - new Date(p.admissao)) / 864e5) + 1}</td><td>${esc(p.gestor || '–')}</td>
        <td>${avs.length ? esc(avs.join(' · ')) : '<span class="q-dica">não avaliado</span>'}</td>
        <td>${mot ? esc([].concat(mot.valor).join('; ') + (mot.outro ? ` (${mot.outro})` : '')) : `<span class="q-dica">${d.resposta ? (d.resposta.recusou ? 'recusou a entrevista' : '–') : 'entrevista pendente'}</span>`}</td>
        <td>${volt ? esc(volt.valor) : '–'}</td></tr>`;
    });
  document.getElementById('xi-cruzamento').innerHTML = `
    <tr><th>Colaborador</th><th>Admissão</th><th>Desligamento</th><th>Dias de casa</th><th>Gestor</th><th>O que o gestor avaliou</th><th>Por que saiu (entrevista)</th><th>Voltaria?</th></tr>
    ${linhas.join('') || '<tr><td colspan="8">Ninguém do cadastro saiu nos primeiros 90 dias (ou a entrevista de desligamento ainda não tem data de desligamento).</td></tr>'}`;
}
['xi-regional', 'xi-periodo', 'xi-setor', 'xi-gestor', 'xi-de', 'xi-ate'].forEach(id => document.getElementById(id).addEventListener('change', renderXpIndicadores));

document.getElementById('xi-exportar').addEventListener('click', () => {
  const perguntas = xp.form.secoes.flatMap(s => s.perguntas.map(p => ({ ...p, secao: s.titulo })));
  const dataCel = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`) : '');
  const dh = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z') : '');
  const cols = [];
  for (const p of perguntas) {
    if (p.tipo === 'grade') p.itens.forEach(it => cols.push([`${p.secao} · ${it}`, p, (r) => r?.valor?.[it] ?? '']));
    else cols.push([`${p.secao} · ${p.texto}`, p, (r) => (Array.isArray(r?.valor) ? r.valor.join('; ') : r?.valor ?? '')]);
    if (p.justificativa) cols.push([`${p.texto} – Justificativa`, p, (r) => r?.justificativa ?? '']);
  }
  const cab = ['ID', 'Nome', 'Chapa', 'Cargo', 'Regional', 'Setor', 'Gestor', 'Admissão', 'Período', 'Vencimento', 'Devolver até', 'Situação', 'Enviado ao gestor', 'Respondida em',
    'No prazo', 'Dias do gestor', 'Classificação', 'Decisão', 'Prorrogar (dias)', 'Comentário', 'Assinado por', 'Colaborador de acordo', 'Ciência em', 'Ciência por', 'Alerta', ...cols.map(c => c[0])];
  const linhas = xp.avaliacoes.map(a => [a.id, a.nome, a.chapa, a.cargo, a.regional || '', a.setor, a.gestor, dataCel(a.admissao), `${a.periodo}º`, dataCel(a.vencimento), dataCel(a.prazo),
    XP_STATUS[a.status][0], dh(a.enviado_em), dh(a.respondido_em), a.respondido_em ? (xpNoPrazo(a) ? 'Sim' : 'Não') : '', xpTempo(a) ?? '',
    a.classificacao || '', a.decisao || '', a.prorrogar_dias || '', a.comentario || '', a.gestor_nome || '', a.respondido_em ? (a.colaborador_de_acordo ? 'Sim' : 'Não registrado') : '', dh(a.ciencia_em), a.ciencia_nome || '', a.alerta ? 'Sim' : 'Não',
    ...cols.map(([, p, f]) => f(a.respostas.find(r => r.id === p.id)))]);
  const base = [['ID', 'Nome', 'Setor', 'Gestor', 'Período', 'Vencimento', 'Decisão', 'Competência', 'Pergunta', 'Item', 'Resposta', 'Positiva (1/0)']];
  for (const a of xp.avaliacoes.filter(xpRespondida)) {
    for (const p of perguntas) {
      const r = a.respostas.find(x => x.id === p.id);
      if (!r) continue;
      const add = (item, v) => base.push([a.id, a.nome, a.setor, a.gestor, `${a.periodo}º`, dataCel(a.vencimento), a.decisao, p.secao, p.texto, item, v, (p.opcoes || []).includes(v) ? (xpPositiva(p.opcoes, v) ? 1 : 0) : '']);
      if (p.tipo === 'grade') Object.entries(r.valor).forEach(([it, v]) => add(it, v));
      else [].concat(r.valor).forEach(v => add('', v));
    }
  }
  const aba = (aoa) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' });
    ws['!cols'] = aoa[0].map(() => ({ wch: 18 }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: aoa[0].length - 1, r: Math.max(aoa.length - 1, 0) } }) };
    return ws;
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, aba([cab, ...linhas]), 'Avaliações');
  XLSX.utils.book_append_sheet(wb, aba(base), 'Base_indicadores');
  XLSX.utils.book_append_sheet(wb, aba([['Nome', 'Chapa', 'Cargo', 'Regional', 'Setor', 'Gestor', 'Admissão'], ...xp.pessoas.map(p => [p.nome, p.chapa, p.cargo, p.regional || '', p.setor, p.gestor, dataCel(p.admissao)])]), 'Pessoas');
  XLSX.writeFile(wb, `avaliacoes-experiencia-${xpHojeIso()}.xlsx`);
});

// ---------- Formulário ----------
const xpEditor = criarEditorFormulario(document.getElementById('xf-secoes'), {
  rotuloSecao: 'Competência',
  presets: { simnao: ['Sim / Não', ['Sim', 'Não']], conceito: ['Bom / Regular / Ruim', ['Bom', 'Regular', 'Ruim']], aderencia: ['Aderente / Não aderente', ['Aderente', 'Não aderente']] },
});
function xpCarregarFormulario(f) {
  document.getElementById('xf-titulo').value = f.titulo || '';
  document.getElementById('xf-introducao').value = f.introducao || '';
  document.getElementById('xf-orientacao').value = f.orientacao || '';
  document.getElementById('xf-p1').value = f.periodos?.[0] ?? 45;
  document.getElementById('xf-p2').value = f.periodos?.[1] ?? 90;
  document.getElementById('xf-antecedencia').value = f.antecedencia ?? 10;
  document.getElementById('xf-assunto').value = f.assunto || '';
  document.getElementById('xf-mensagem').value = f.mensagem || '';
  document.getElementById('xf-mensagem-ciencia').value = f.mensagem_ciencia || '';
  document.getElementById('xf-ativa').checked = f.ativa !== false;
  xpEditor.carregar(f.secoes);
}
function renderXpFormulario() { xpCarregarFormulario(xp.form); }
document.getElementById('xf-add-secao').addEventListener('click', () => xpEditor.adicionarSecao());
document.getElementById('xf-restaurar').addEventListener('click', async () => {
  if (!confirm('Carregar o modelo original (planilha de avaliação de experiência)? As alterações só valem depois de Salvar.')) return;
  xpCarregarFormulario(await api('/api/admin/experiencia/formulario/padrao'));
  toast('Modelo original carregado. Clique em Salvar formulário para aplicar.');
});
document.getElementById('xf-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    xp.form = await api('/api/admin/experiencia/formulario', { method: 'PUT', body: {
      ativa: document.getElementById('xf-ativa').checked,
      titulo: document.getElementById('xf-titulo').value,
      introducao: document.getElementById('xf-introducao').value,
      orientacao: document.getElementById('xf-orientacao').value,
      periodos: [Number(document.getElementById('xf-p1').value), Number(document.getElementById('xf-p2').value)],
      antecedencia: Number(document.getElementById('xf-antecedencia').value),
      assunto: document.getElementById('xf-assunto').value,
      mensagem: document.getElementById('xf-mensagem').value,
      mensagem_ciencia: document.getElementById('xf-mensagem-ciencia').value,
      secoes: xpEditor.secoes(),
    } });
    await xpCarregar();
    xpCarregarFormulario(xp.form);
    toast('Formulário salvo ✅ Vencimentos ainda não respondidos foram recalculados.');
  } catch (err) { toast(err.message, 'erro'); }
});
