// Área do RH · Jornada Âmbar: usuários e acessos (somente admin) e "Minha conta" (troca de senha).
// Usa em tempo de execução: jaUsuario/ehAdmin (admin.js), xp (admin-experiencia.js), dsl e dslWhats/dslCopiar (admin-desligamento.js).
const us = { lista: [], editando: null, usinas: [], filiais: [] };
const usPapel = (u) => (u.papel === 'admin' ? 'Administrador(a)' : u.papel === 'analista' ? 'Analista de RH' : 'Coordenador(a) de RH regional');
const US_SELO = { admin: ['st-gestor', '👑 Admin'], regional: ['st-pendente', '🗺️ Regional'], analista: ['st-ok', '⚡ Analista'] };

// ---------- Minha conta ----------
function abrirConta(primeiroAcesso = false) {
  const f = document.getElementById('form-conta');
  f.reset();
  document.getElementById('conta-titulo').textContent = jaUsuario.nome;
  document.getElementById('conta-aviso').hidden = !primeiroAcesso;
  const master = jaUsuario.master;
  document.getElementById('conta-info').innerHTML = master
    ? 'Você entrou como <strong>admin master</strong>. Essa senha é definida na hospedagem (variável ADMIN_PASSWORD no Render) e não pode ser trocada por aqui.'
    : `Login: <strong>${esc(jaUsuario.email)}</strong> · ${esc(usPapel(jaUsuario))}${jaUsuario.regional ? ` · Regional <strong>${esc(jaUsuario.regional)}</strong>` : ''}`
      + (jaUsuario.usinas?.length ? ` · Usinas <strong>${esc(jaUsuario.usinas.join(', '))}</strong>` : '');
  document.getElementById('conta-campos').hidden = master;
  document.getElementById('conta-salvar').hidden = master;
  document.getElementById('modal-conta').showModal();
}
document.getElementById('ja-eu').addEventListener('click', () => abrirConta(false));
document.getElementById('conta-sair').addEventListener('click', () => document.getElementById('sair').click());
document.getElementById('form-conta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.nova.value !== f.repete.value) return toast('As duas senhas novas não são iguais.', 'erro');
  try {
    await api('/api/admin/minha-senha', { method: 'POST', body: { atual: f.atual.value, nova: f.nova.value } });
    jaUsuario.trocar_senha = false;
    document.getElementById('modal-conta').close();
    toast('Senha alterada ✅');
  } catch (err) { toast(err.message, 'erro'); }
});

// ---------- Usuários (admin) ----------
async function renderUsuarios() {
  [us.lista, us.filiais] = await Promise.all([api('/api/admin/usuarios'), api('/api/admin/filiais')]);
  const busca = dslNorm(document.getElementById('us-busca').value);
  const lista = us.lista.filter(u => !busca || dslNorm([u.nome, u.email, u.regional, ...u.usinas].join(' ')).includes(busca));
  const ativos = (papel) => us.lista.filter(u => u.papel === papel && u.ativo).length;
  document.getElementById('us-qtd').textContent = `· ${us.lista.filter(u => u.ativo).length} ativo(s) · ${ativos('regional')} coordenador(es) regional(is) · ${ativos('analista')} analista(s)`;
  const quando = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca entrou');
  document.getElementById('us-tabela').innerHTML = `
    <tr><th>Pessoa</th><th>Perfil</th><th>Regional / usinas</th><th>Último acesso</th><th>Situação</th><th></th></tr>
    ${lista.map(u => `<tr class="${u.ativo ? '' : 'inativo'}">
      <td><span class="us-av">${esc(u.nome.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase())}</span>
        <strong>${esc(u.nome)}</strong><small class="sub">${esc(u.email)}</small></td>
      <td><span class="selo-st ${(US_SELO[u.papel] || US_SELO.regional)[0]}">${(US_SELO[u.papel] || US_SELO.regional)[1]}</span></td>
      <td>${u.papel === 'analista' ? `${u.usinas.map(x => `<span class="us-chip">${esc(x)}</span>`).join(' ')}${u.regional ? `<small class="sub">${esc(u.regional)}</small>` : ''}` : esc(u.regional || 'Todas')}</td>
      <td>${quando(u.ultimo_acesso)}</td>
      <td>${!u.ativo ? '<span class="selo-st st-recusa">Desativado</span>' : u.trocar_senha ? '<span class="selo-st st-pendente" title="Ainda usa a senha provisória">1º acesso pendente</span>' : '<span class="selo-st st-ok">Ativo</span>'}</td>
      <td><div class="acoes-envio">
        <button type="button" class="btn btn-claro btn-sm" data-us-editar="${u.id}">✏️ Editar</button>
        <button type="button" class="btn btn-claro btn-sm" data-us-senha="${u.id}" title="Gerar nova senha provisória">🔁 Senha</button>
        ${u.id === jaUsuario.id ? '' : `<button type="button" class="btn btn-claro btn-sm" data-us-ativo="${u.id}">${u.ativo ? '⏸ Desativar' : '▶ Ativar'}</button>
        <button type="button" class="q-rem" data-us-excluir="${u.id}" title="Excluir">🗑</button>`}
      </div></td>
    </tr>`).join('') || `<tr><td colspan="6">${us.lista.length ? 'Nada encontrado.' : 'Nenhum acesso criado ainda. Comece pelo formulário acima.'}</td></tr>`}`;
  renderVisaoRegional();
  renderFiliais();
  usPapelMudou();
}
document.getElementById('us-busca').addEventListener('input', renderUsuarios);

/** Resumo por regional: quem cuida e quanto há em andamento. */
function renderVisaoRegional() {
  const regs = new Set([...us.lista.map(u => u.regional), ...us.filiais.map(f => f.regional), ...xp.pessoas.map(p => p.regional), ...dsl.convites.map(c => c.regional)].filter(Boolean));
  const linhas = [...regs].sort().map(r => {
    const usinasDaReg = us.filiais.filter(f => f.regional === r).map(f => f.nome.toLowerCase());
    const coords = us.lista.filter(u => u.ativo && u.papel === 'regional' && u.regional === r).map(u => u.nome.split(' ')[0])
      .concat(us.lista.filter(u => u.ativo && u.papel === 'analista' && (u.regional === r || u.usinas.some(x => usinasDaReg.includes(x.toLowerCase()))))
        .map(u => `${u.nome.split(' ')[0]} (analista)`));
    const pessoas = xp.pessoas.filter(p => p.regional === r).length;
    const pend = xp.avaliacoes.filter(a => a.regional === r && (a.status === 'a_enviar' || a.status === 'com_gestor')).length;
    const desl = dsl.convites.filter(c => c.regional === r).length;
    return `<tr><td><strong>${esc(r)}</strong></td><td>${coords.length ? esc(coords.join(', ')) : '<span class="q-dica">sem coordenador</span>'}</td><td>${pessoas}</td><td>${pend}</td><td>${desl}</td></tr>`;
  });
  const sem = xp.pessoas.filter(p => !p.regional).length + dsl.convites.filter(c => !c.regional).length;
  document.getElementById('us-regionais').innerHTML = `
    <tr><th>Regional</th><th>Coordenação</th><th>Pessoas</th><th title="Avaliações de experiência a enviar ou com o gestor">Aval. abertas</th><th title="Convites de entrevista de desligamento">Deslig.</th></tr>
    ${linhas.join('') || '<tr><td colspan="5">As regionais aparecem aqui quando você criar acessos ou cadastrar pessoas com regional.</td></tr>'}
    ${sem ? `<tr><td colspan="5" class="q-dica">⚠️ ${sem} registro(s) sem regional: só os administradores enxergam. Edite a pessoa ou o convite para definir.</td></tr>` : ''}`;
}

function usPapelMudou() {
  const f = document.getElementById('us-form');
  const papel = f.papel.value;
  f.querySelector('[data-us-regional]').hidden = papel === 'admin';
  f.querySelector('[data-us-regional-rotulo]').textContent = papel === 'analista' ? 'Regional (opcional)' : 'Regional *';
  f.querySelector('[data-us-usinas]').hidden = papel !== 'analista';
  usRenderUsinas();
}

// Usinas do analista: lista suspensa com marcação múltipla, agrupada por regional (cadastro de usinas e filiais).
// Sem cadastro ainda, vale o campo de texto (digita e tecla Enter).
const usMesma = (a, b) => a.toLowerCase() === b.toLowerCase();
const usTem = (nome) => us.usinas.some(u => usMesma(u, nome));
function usRenderUsinas() {
  const comLista = us.filiais.length > 0;
  document.getElementById('us-multi').hidden = !comLista;
  document.getElementById('us-usina-nova').hidden = comLista;
  document.getElementById('us-chips').innerHTML = us.usinas.map((u, i) => `<span class="us-chip">${esc(u)}<button type="button" data-us-tirar="${i}" aria-label="Tirar ${esc(u)}">✕</button></span>`).join('')
    || `<small class="q-dica">${comLista ? 'Nenhuma usina marcada ainda.' : 'Nenhuma usina ainda. Cadastre a lista em “Usinas e filiais por regional”, abaixo, para escolher numa lista.'}</small>`;
  document.getElementById('us-multi-rotulo').textContent = !us.usinas.length ? 'Escolher usinas…'
    : us.usinas.length === 1 ? us.usinas[0] : `${us.usinas.length} usinas marcadas`;
  if (!document.getElementById('us-multi-painel').hidden) usRenderPainel();
}
function usRenderPainel() {
  const busca = dslNorm(document.getElementById('us-multi-busca').value);
  const grupos = new Map();
  for (const f of us.filiais) {
    if (busca && !dslNorm(`${f.nome} ${f.regional}`).includes(busca)) continue;
    if (!grupos.has(f.regional)) grupos.set(f.regional, []);
    grupos.get(f.regional).push(f.nome);
  }
  document.getElementById('us-multi-lista').innerHTML = [...grupos.entries()].map(([reg, nomes]) => {
    const marcadas = nomes.filter(usTem).length;
    return `<fieldset class="us-multi-grupo">
      <label class="us-multi-reg"><input type="checkbox" data-us-reg="${esc(reg)}" ${marcadas === nomes.length ? 'checked' : ''}
        ${marcadas && marcadas < nomes.length ? 'data-meio' : ''}> ${esc(reg)} <small>${marcadas ? `${marcadas} de ${nomes.length}` : `${nomes.length} usina(s)`} · marcar todas</small></label>
      ${nomes.map(n => `<label class="us-multi-op"><input type="checkbox" data-us-usina="${esc(n)}" ${usTem(n) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}
    </fieldset>`;
  }).join('') || '<p class="q-dica">Nenhuma usina encontrada.</p>';
  document.querySelectorAll('#us-multi-lista [data-meio]').forEach(c => { c.indeterminate = true; });
}
function usAbrirPainel(abrir) {
  const painel = document.getElementById('us-multi-painel');
  painel.hidden = !abrir;
  document.getElementById('us-multi-btn').setAttribute('aria-expanded', String(abrir));
  if (abrir) { document.getElementById('us-multi-busca').value = ''; usRenderPainel(); document.getElementById('us-multi-busca').focus(); }
}
document.getElementById('us-multi-btn').addEventListener('click', () => usAbrirPainel(document.getElementById('us-multi-painel').hidden));
document.getElementById('us-multi-ok').addEventListener('click', () => usAbrirPainel(false));
document.getElementById('us-multi-limpar').addEventListener('click', () => { us.usinas = []; usRenderUsinas(); });
document.getElementById('us-multi-busca').addEventListener('input', usRenderPainel);
document.getElementById('us-multi-lista').addEventListener('change', (e) => {
  const reg = e.target.dataset.usReg;
  const nomes = reg !== undefined ? us.filiais.filter(f => f.regional === reg).map(f => f.nome) : [e.target.dataset.usUsina];
  us.usinas = us.usinas.filter(u => !nomes.some(n => usMesma(n, u)));
  if (e.target.checked) us.usinas.push(...nomes);
  usRenderUsinas();
});
// Fecha a lista ao clicar fora dela ou com Esc.
document.addEventListener('click', (e) => { if (!e.target.closest('#us-multi')) usAbrirPainel(false); });
document.getElementById('us-multi').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); usAbrirPainel(false); document.getElementById('us-multi-btn').focus(); } });

function usAddUsina() {
  const campo = document.getElementById('us-usina-nova');
  const v = campo.value.trim();
  if (v && !usTem(v)) us.usinas.push(v);
  campo.value = '';
  usRenderUsinas();
}
document.getElementById('us-usina-nova').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); usAddUsina(); } });
document.getElementById('us-chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-us-tirar]');
  if (b) { us.usinas.splice(Number(b.dataset.usTirar), 1); usRenderUsinas(); }
});

// ---------- Usinas e filiais por regional (cadastro) ----------
function renderFiliais() {
  const busca = dslNorm(document.getElementById('fl-busca').value);
  const regs = new Map();
  for (const f of us.filiais) {
    if (busca && !dslNorm(`${f.nome} ${f.regional}`).includes(busca)) continue;
    if (!regs.has(f.regional)) regs.set(f.regional, []);
    regs.get(f.regional).push(f);
  }
  const regsTot = new Set(us.filiais.map(f => f.regional)).size;
  document.getElementById('fl-qtd').textContent = us.filiais.length ? `· ${us.filiais.length} usina(s) em ${regsTot} regional(is)` : '';
  const analistasDe = (nome) => us.lista.filter(u => u.ativo && u.papel === 'analista' && u.usinas.some(x => usMesma(x, nome))).map(u => u.nome.split(' ')[0]);
  document.getElementById('fl-tabela').innerHTML = regs.size ? `
    <tr><th>Regional</th><th>Usinas / filiais <small>(analistas que acompanham)</small></th></tr>
    ${[...regs.entries()].map(([reg, lista]) => `<tr><td><strong>${esc(reg)}</strong><small class="sub">${lista.length} usina(s)</small></td>
      <td><div class="fl-chips">${lista.map(f => { const an = analistasDe(f.nome); return `<span class="us-chip ${an.length ? '' : 'fl-sem'}" title="${an.length ? 'Analistas: ' + esc(an.join(', ')) : 'Sem analista'}">${esc(f.nome)}${an.length ? ` <small>· ${esc(an.join(', '))}</small>` : ''}<button type="button" data-fl-excluir="${f.id}" aria-label="Remover ${esc(f.nome)}">✕</button></span>`; }).join('')}</div></td></tr>`).join('')}`
    : `<tr><td>${us.filiais.length ? 'Nada encontrado.' : 'Nenhuma usina cadastrada ainda. Importe a planilha das filiais por regional ou adicione uma por vez.'}</td></tr>`;
}
document.getElementById('fl-busca').addEventListener('input', renderFiliais);

async function usRecarregarFiliais() {
  us.filiais = await api('/api/admin/filiais');
  await atualizarRegionais();
  renderFiliais();
  usRenderUsinas();
}
document.getElementById('fl-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/admin/filiais', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
    e.target.nome.value = '';
    e.target.nome.focus();
    toast('Usina adicionada ✅');
    await usRecarregarFiliais();
  } catch (err) { toast(err.message, 'erro'); }
});
document.getElementById('fl-tabela').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-fl-excluir]');
  if (!b) return;
  const f = us.filiais.find(x => x.id === Number(b.dataset.flExcluir));
  if (!confirm(`Remover “${f.nome}” da lista? Pessoas e acessos que já usam essa usina continuam como estão.`)) return;
  try { await api(`/api/admin/filiais/${f.id}`, { method: 'DELETE' }); await usRecarregarFiliais(); } catch (err) { toast(err.message, 'erro'); }
});

// Importação: colunas REGIONAL e FILIAL/USINA, ou uma coluna por regional com as filiais embaixo.
let flLinhas = [];
async function flLerPlanilha(arquivo) {
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', codepage: 65001 });
  const matriz = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false })
    .map(l => l.map(v => String(v ?? '').trim()));
  while (matriz.length && !matriz[0].some(Boolean)) matriz.shift();
  if (!matriz.length) return [];
  const cab = matriz[0].map(c => dslNorm(c).replace(/[^a-z0-9]+/g, ' ').trim());
  const achar = (...nomes) => cab.findIndex(c => nomes.includes(c));
  const cReg = achar('regional', 'regiao', 'regionais');
  const cFil = achar('filial', 'filiais', 'usina', 'usinas', 'unidade', 'planta', 'nome', 'nome filial', 'nome da filial', 'nome usina', 'local');
  if (cReg >= 0 && cFil >= 0) {
    // Formato em linhas; a regional pode vir só na primeira linha do grupo (células mescladas).
    let ultima = '';
    return matriz.slice(1).map(l => ({ regional: (ultima = l[cReg] || ultima), nome: l[cFil] })).filter(l => l.nome);
  }
  // Formato em colunas: cada cabeçalho é uma regional.
  return matriz[0].flatMap((reg, c) => (reg ? matriz.slice(1).map(l => ({ regional: reg, nome: l[c] })).filter(l => l.nome) : []));
}
document.getElementById('fl-arquivo').addEventListener('change', async (e) => {
  const previa = document.getElementById('fl-previa');
  const btn = document.getElementById('fl-importar');
  flLinhas = [];
  btn.disabled = true;
  previa.innerHTML = '';
  if (!e.target.files[0]) return;
  try {
    flLinhas = await flLerPlanilha(e.target.files[0]);
    const regs = [...new Set(flLinhas.map(l => l.regional))];
    previa.innerHTML = flLinhas.length
      ? `${flLinhas.length} usina(s) em ${regs.length} regional(is): ${regs.slice(0, 6).map(r => `<strong>${esc(r)}</strong> (${flLinhas.filter(l => l.regional === r).length})`).join(', ')}${regs.length > 6 ? '…' : ''}`
      : 'Não encontrei usinas na planilha. Use as colunas REGIONAL e FILIAL (baixe o modelo).';
    btn.disabled = !flLinhas.length;
  } catch (err) { previa.textContent = err.message; }
});
document.getElementById('fl-importar').addEventListener('click', async () => {
  try {
    const r = await api('/api/admin/filiais/importar', { method: 'POST', body: { linhas: flLinhas } });
    toast(`${r.novas} nova(s), ${r.atualizadas} atualizada(s)${r.invalidas.length ? `, ${r.invalidas.length} com erro` : ''} ✅`);
    document.getElementById('fl-previa').innerHTML = r.invalidas.slice(0, 10).map(i => `Linha ${i.linha}: ${esc(i.motivo)}`).join('<br>');
    document.getElementById('fl-arquivo').value = '';
    document.getElementById('fl-importar').disabled = true;
    await usRecarregarFiliais();
  } catch (err) { toast(err.message, 'erro'); }
});
document.getElementById('fl-modelo').addEventListener('click', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['REGIONAL', 'FILIAL'], ['Centro-Oeste', 'UTE Cuiabá'], ['Centro-Oeste', 'PCH Juba'], ['Sudeste', 'UTE Mário Covas']]);
  ws['!cols'] = [{ wch: 22 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Filiais');
  XLSX.writeFile(wb, 'modelo-usinas-filiais-jornada-ambar.xlsx');
});

document.querySelector('#us-form [name="papel"]').addEventListener('change', usPapelMudou);

function usLimparForm() {
  const f = document.getElementById('us-form');
  us.editando = null;
  us.usinas = [];
  f.reset();
  document.getElementById('us-form-tit').textContent = '➕ Novo acesso';
  document.getElementById('us-salvar').textContent = 'Criar acesso';
  document.getElementById('us-cancelar').hidden = true;
  usPapelMudou();
}
document.getElementById('us-cancelar').addEventListener('click', usLimparForm);

/** Cartão com o acesso criado: login, senha provisória e botões para enviar. */
function usMostrarCredencial(u, senha, titulo) {
  const link = `${location.origin}/admin.html`;
  const msg = `Olá, ${u.nome.split(' ')[0]}! Seu acesso à Jornada Âmbar (área do RH) está pronto.\n\nEndereço: ${link}\nE-mail: ${u.email}\nSenha provisória: ${senha}\n\nNo primeiro acesso, a plataforma vai pedir para você criar uma senha só sua.`;
  document.getElementById('us-credencial').innerHTML = `
    <div class="us-cred">
      <p class="us-cred-tit">${titulo}</p>
      <dl><div><dt>Endereço</dt><dd>${esc(link)}</dd></div><div><dt>E-mail</dt><dd>${esc(u.email)}</dd></div>
        <div><dt>Senha provisória</dt><dd class="us-senha">${esc(senha)}</dd></div></dl>
      <div class="acoes-envio">
        <button type="button" class="btn btn-claro btn-sm" data-us-copiar>📋 Copiar acesso</button>
        <a class="btn btn-whats btn-sm" href="${esc(dslWhats('', msg))}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn btn-claro btn-sm" href="mailto:${esc(u.email)}?subject=${encodeURIComponent('Seu acesso à Jornada Âmbar')}&body=${encodeURIComponent(msg)}">✉️ E-mail</a>
      </div>
      <p class="q-dica">Por segurança, a senha provisória só aparece agora. Se perder, use “🔁 Senha” para gerar outra.</p>
    </div>`;
  document.querySelector('[data-us-copiar]').addEventListener('click', () => dslCopiar(msg));
}

document.getElementById('us-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!us.filiais.length) usAddUsina(); // usina digitada e ainda não confirmada com Enter
  usAbrirPainel(false);
  const dados = { ...Object.fromEntries(new FormData(e.target)), usinas: us.usinas };
  try {
    if (us.editando) {
      await api(`/api/admin/usuarios/${us.editando}`, { method: 'PUT', body: dados });
      toast('Acesso atualizado ✅');
      document.getElementById('us-credencial').innerHTML = '';
    } else {
      const r = await api('/api/admin/usuarios', { method: 'POST', body: dados });
      usMostrarCredencial(dados, r.senha, `✅ Acesso criado para ${esc(dados.nome)}`);
    }
    usLimparForm();
    await atualizarRegionais();
    renderUsuarios();
  } catch (err) { toast(err.message, 'erro'); }
});

async function atualizarRegionais() {
  jaUsuario = await api('/api/admin/sessao');
  document.getElementById('lista-regionais').innerHTML = (jaUsuario.regionais || []).map(r => `<option value="${esc(r)}">`).join('');
  document.getElementById('lista-usinas').innerHTML = (jaUsuario.usinas || []).map(u => `<option value="${esc(u)}">`).join('');
}

document.getElementById('us-tabela').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-us-editar], [data-us-senha], [data-us-ativo], [data-us-excluir]');
  if (!b) return;
  const id = Number(b.dataset.usEditar || b.dataset.usSenha || b.dataset.usAtivo || b.dataset.usExcluir);
  const u = us.lista.find(x => x.id === id);
  try {
    if (e.target.closest('[data-us-editar]')) {
      const f = document.getElementById('us-form');
      us.editando = id;
      f.nome.value = u.nome; f.email.value = u.email; f.papel.value = u.papel; f.regional.value = u.regional;
      us.usinas = [...u.usinas];
      document.getElementById('us-form-tit').textContent = `✏️ Editar · ${u.nome}`;
      document.getElementById('us-salvar').textContent = 'Salvar alterações';
      document.getElementById('us-cancelar').hidden = false;
      document.getElementById('us-credencial').innerHTML = '';
      usPapelMudou();
      f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (e.target.closest('[data-us-senha]')) {
      if (!confirm(`Gerar uma nova senha provisória para ${u.nome}? A senha atual deixa de funcionar.`)) return;
      const r = await api(`/api/admin/usuarios/${id}`, { method: 'PATCH', body: { acao: 'redefinir' } });
      usMostrarCredencial(u, r.senha, `🔁 Nova senha provisória para ${esc(u.nome)}`);
      document.getElementById('us-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      renderUsuarios();
    } else if (e.target.closest('[data-us-ativo]')) {
      await api(`/api/admin/usuarios/${id}`, { method: 'PATCH', body: { acao: 'ativo', ativo: !u.ativo } });
      toast(u.ativo ? 'Acesso desativado.' : 'Acesso reativado ✅');
      renderUsuarios();
    } else if (e.target.closest('[data-us-excluir]')) {
      if (!confirm(`Excluir o acesso de ${u.nome}? Os dados da regional e das usinas continuam na Jornada.`)) return;
      await api(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
      renderUsuarios();
    }
  } catch (err) { toast(err.message, 'erro'); }
});
