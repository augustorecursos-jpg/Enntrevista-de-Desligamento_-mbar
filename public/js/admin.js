// Área do RH · Jornada Âmbar: login, navegação entre os processos e utilitários dos gráficos.
const fmt = (n, casas = 0) => (n == null ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const fmtPct = (n) => (n == null ? '–' : `${fmt(n, Number.isInteger(n) ? 0 : 1)}%`);
const num = (n, casas = 2) => String(Math.round(n * 10 ** casas) / 10 ** casas).replace('.', ',');

// ---------- Sessão ----------
// Quem está usando: { nome, email, papel: 'admin' | 'regional', regional, master, trocar_senha, regionais }
let jaUsuario = null;
const ehAdmin = () => jaUsuario?.papel === 'admin';

async function iniciar() {
  try {
    jaUsuario = await api('/api/admin/sessao');
    mostrarPainel();
  } catch { /* fica na tela de login */ }
}

/** Ajusta a tela ao perfil: coordenador regional não vê formulários, usuários nem backup. */
function aplicarPerfil() {
  document.body.classList.toggle('papel-regional', !ehAdmin());
  document.getElementById('lista-regionais').innerHTML = (jaUsuario.regionais || []).map(r => `<option value="${esc(r)}">`).join('');
  const iniciais = jaUsuario.nome.split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : '')).join('').toUpperCase();
  document.getElementById('ja-eu-av').textContent = iniciais || 'RH';
  document.getElementById('ja-eu-nome').textContent = jaUsuario.nome;
  document.getElementById('ja-eu-papel').textContent = jaUsuario.master ? 'Admin master' : ehAdmin() ? 'Administrador(a)' : `RH · ${jaUsuario.regional}`;
}

async function mostrarPainel() {
  document.getElementById('tela-login').hidden = true;
  document.getElementById('lateral').hidden = false;
  document.getElementById('principal').hidden = false;
  aplicarPerfil();
  await Promise.all([carregarDesligamento(), xpCarregar(), pcCarregar()]);
  irPara(location.hash.slice(1) || 'inicio');
  if (jaUsuario.trocar_senha) abrirConta(true);
}

// ---------- Navegação ----------
const VISOES = {
  inicio: ['Início', () => renderInicio()],
  pessoas: ['Pessoas', () => renderPessoas()],
  'pc-acompanhar': ['Primeiras Conexões', () => renderPcKanban()],
  'pc-indicadores': ['Primeiras Conexões · Indicadores', () => renderPcIndicadores()],
  'pc-formulario': ['Primeiras Conexões · Formulário', () => renderPcFormulario()],
  'exp-acompanhar': ['Avaliação de experiência', () => renderKanban()],
  'exp-indicadores': ['Avaliação de experiência · Indicadores', () => renderXpIndicadores()],
  'exp-formulario': ['Avaliação de experiência · Formulário', () => renderXpFormulario()],
  usuarios: ['Usuários e acessos', () => renderUsuarios()],
};
const SO_ADMIN = ['exp-formulario', 'pc-formulario', 'usuarios', 'dsl-formulario'];
const SUBS_DSL = { enviar: 'Enviar', indicadores: 'Indicadores', respostas: 'Respostas', formulario: 'Formulário' };
let visaoAtual = 'inicio';

function irPara(visao) {
  const sub = visao.startsWith('dsl-') ? visao.slice(4) : null;
  if (sub ? !SUBS_DSL[sub] : !VISOES[visao]) visao = 'inicio';
  if (!ehAdmin() && SO_ADMIN.includes(visao)) visao = 'inicio';
  visaoAtual = visao;
  history.replaceState(null, '', `#${visaoAtual}`);
  const ehDsl = Boolean(sub && SUBS_DSL[sub]);
  document.querySelector('[data-painel="desligamento"]').hidden = !ehDsl;
  document.querySelectorAll('[data-view-painel]').forEach(el => { el.hidden = ehDsl || el.dataset.viewPainel !== visaoAtual; });
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('ativo', !ehDsl && b.dataset.view === visaoAtual));
  if (ehDsl) {
    dslTrocarSub(sub);
    document.getElementById('barra-titulo').textContent = `Entrevista de desligamento · ${SUBS_DSL[sub]}`;
  } else {
    document.querySelectorAll('[data-sub]').forEach(b => b.classList.remove('ativo'));
    document.getElementById('barra-titulo').textContent = VISOES[visaoAtual][0];
    VISOES[visaoAtual][1]();
  }
  document.getElementById('lateral').classList.remove('aberta');
  window.scrollTo(0, 0);
}
function renderVisaoAtual() {
  if (visaoAtual.startsWith('dsl-')) dslTrocarSub(visaoAtual.slice(4));
  else VISOES[visaoAtual][1]();
}
document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-view], [data-ir-view]');
  if (v) return irPara(v.dataset.view || v.dataset.irView);
  const s = e.target.closest('[data-sub], [data-ir-sub]');
  if (s && (s.closest('.lateral') || s.dataset.irSub)) irPara(`dsl-${s.dataset.sub || s.dataset.irSub}`);
});

// ---------- Login ----------
(() => {
  const h = new Date().getHours();
  document.getElementById('jl-ola').textContent = `${h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}! 👋`;
})();
const jlSenha = document.getElementById('senha');
const jlErro = document.getElementById('jl-erro');
document.getElementById('jl-ver').addEventListener('click', (e) => {
  const mostrar = jlSenha.type === 'password';
  jlSenha.type = mostrar ? 'text' : 'password';
  e.currentTarget.textContent = mostrar ? '🙈' : '👁';
  e.currentTarget.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  jlSenha.focus();
});
['keydown', 'keyup'].forEach(ev => jlSenha.addEventListener(ev, (e) => {
  if (e.getModifierState) document.getElementById('jl-caps').hidden = !e.getModifierState('CapsLock');
}));
jlSenha.addEventListener('input', () => { jlErro.textContent = ''; jlSenha.closest('.jl-senha').classList.remove('erro'); });

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('.jl-entrar');
  if (!document.getElementById('usuario').value.trim()) { jlErro.textContent = 'Digite seu e-mail para entrar.'; document.getElementById('usuario').focus(); return; }
  if (!jlSenha.value) { jlErro.textContent = 'Digite a senha para entrar.'; jlSenha.focus(); return; }
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Entrando…';
  try {
    await api('/api/admin/entrar', { method: 'POST', body: { usuario: document.getElementById('usuario').value.trim(), senha: jlSenha.value } });
    jaUsuario = await api('/api/admin/sessao');
    document.getElementById('tela-login').classList.add('saindo');
    setTimeout(mostrarPainel, 350);
  } catch (err) {
    jlErro.textContent = err.status === 401 ? 'E-mail ou senha incorretos. Confira e tente de novo.' : err.message;
    jlSenha.closest('.jl-senha').classList.add('erro');
    form.classList.remove('treme'); void form.offsetWidth; form.classList.add('treme');
    jlSenha.select();
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Entrar na Jornada';
  }
});

document.getElementById('sair').addEventListener('click', async () => {
  await api('/api/admin/sair', { method: 'POST' });
  location.reload();
});

document.getElementById('btn-menu').addEventListener('click', () => document.getElementById('lateral').classList.toggle('aberta'));
document.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) e.target.closest('dialog').close(); });

document.getElementById('qr-copiar').addEventListener('click', async () => {
  const campo = document.getElementById('qr-link');
  try { await navigator.clipboard.writeText(campo.value); } catch { campo.select(); document.execCommand('copy'); }
  toast('Link copiado ✅');
});

// ---------- Gráficos ----------
/** Barras horizontais de percentual (0–100%), uma série, valor na ponta e dica ao passar o mouse. */
function barras(id, itens, vazio) {
  const el = document.getElementById(id);
  el.innerHTML = itens.length ? `
    <div class="barras-eixo"><span>0%</span><span>50%</span><span>100%</span></div>
    ${itens.map(i => `
      <div class="barra-linha" data-dica="${esc(i.dica)}" tabindex="0">
        <span class="barra-rotulo" title="${esc(i.rotulo)}">${esc(i.rotulo)}</span>
        <span class="barra-trilho"><i style="width:${Math.max(i.valor, 0)}%"></i><b>${fmtPct(i.valor)}</b></span>
      </div>`).join('')}` : `<p class="q-dica">${vazio}</p>`;
}

// Dica flutuante dos gráficos (mouse e teclado)
const dica = document.getElementById('dica-grafico');
function mostrarDica(alvo, x, y) {
  dica.innerHTML = alvo.dataset.dica;
  dica.hidden = false;
  const r = dica.getBoundingClientRect();
  dica.style.left = `${Math.min(x + 14, innerWidth - r.width - 8)}px`;
  dica.style.top = `${Math.max(8, y - r.height - 12)}px`;
}
document.addEventListener('mousemove', (e) => {
  const alvo = e.target.closest('[data-dica]');
  if (alvo) mostrarDica(alvo, e.clientX, e.clientY); else dica.hidden = true;
});
document.addEventListener('focusin', (e) => {
  const alvo = e.target.closest('[data-dica]');
  if (!alvo) return;
  const r = alvo.getBoundingClientRect();
  mostrarDica(alvo, r.left + r.width / 2, r.top);
});
document.addEventListener('focusout', () => { dica.hidden = true; });

iniciar();
