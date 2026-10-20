// Área do RH · Jornada Âmbar: usuários e acessos (somente admin) e "Minha conta" (troca de senha).
// Usa em tempo de execução: jaUsuario/ehAdmin (admin.js), xp (admin-experiencia.js), dsl e dslWhats/dslCopiar (admin-desligamento.js).
const us = { lista: [], editando: null };
const usPapel = (u) => (u.papel === 'admin' ? 'Administrador(a)' : 'Coordenador(a) de RH regional');

// ---------- Minha conta ----------
function abrirConta(primeiroAcesso = false) {
  const f = document.getElementById('form-conta');
  f.reset();
  document.getElementById('conta-titulo').textContent = jaUsuario.nome;
  document.getElementById('conta-aviso').hidden = !primeiroAcesso;
  const master = jaUsuario.master;
  document.getElementById('conta-info').innerHTML = master
    ? 'Você entrou como <strong>admin master</strong>. Essa senha é definida na hospedagem (variável ADMIN_PASSWORD no Render) e não pode ser trocada por aqui.'
    : `Login: <strong>${esc(jaUsuario.email)}</strong> · ${esc(usPapel(jaUsuario))}${jaUsuario.regional ? ` · Regional <strong>${esc(jaUsuario.regional)}</strong>` : ''}`;
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
  us.lista = await api('/api/admin/usuarios');
  const busca = dslNorm(document.getElementById('us-busca').value);
  const lista = us.lista.filter(u => !busca || dslNorm([u.nome, u.email, u.regional].join(' ')).includes(busca));
  document.getElementById('us-qtd').textContent = `· ${us.lista.filter(u => u.ativo).length} ativo(s) · ${us.lista.filter(u => u.papel === 'regional' && u.ativo).length} coordenador(es) regional(is)`;
  const quando = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca entrou');
  document.getElementById('us-tabela').innerHTML = `
    <tr><th>Pessoa</th><th>Perfil</th><th>Regional</th><th>Último acesso</th><th>Situação</th><th></th></tr>
    ${lista.map(u => `<tr class="${u.ativo ? '' : 'inativo'}">
      <td><span class="us-av">${esc(u.nome.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase())}</span>
        <strong>${esc(u.nome)}</strong><small class="sub">${esc(u.email)}</small></td>
      <td><span class="selo-st ${u.papel === 'admin' ? 'st-gestor' : 'st-pendente'}">${u.papel === 'admin' ? '👑 Admin' : '🗺️ Regional'}</span></td>
      <td>${esc(u.regional || 'Todas')}</td>
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
  usPapelMudou();
}
document.getElementById('us-busca').addEventListener('input', renderUsuarios);

/** Resumo por regional: quem cuida e quanto há em andamento. */
function renderVisaoRegional() {
  const regs = new Set([...us.lista.map(u => u.regional), ...xp.pessoas.map(p => p.regional), ...dsl.convites.map(c => c.regional)].filter(Boolean));
  const linhas = [...regs].sort().map(r => {
    const coords = us.lista.filter(u => u.ativo && u.papel === 'regional' && u.regional === r).map(u => u.nome.split(' ')[0]);
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
  f.querySelector('[data-us-regional]').hidden = f.papel.value === 'admin';
}
document.querySelector('#us-form [name="papel"]').addEventListener('change', usPapelMudou);

function usLimparForm() {
  const f = document.getElementById('us-form');
  us.editando = null;
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
  const dados = Object.fromEntries(new FormData(e.target));
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
      if (!confirm(`Excluir o acesso de ${u.nome}? Os dados da regional continuam na Jornada.`)) return;
      await api(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
      renderUsuarios();
    }
  } catch (err) { toast(err.message, 'erro'); }
});
