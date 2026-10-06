// Área do RH: login, menu e utilitários dos gráficos usados pela entrevista de desligamento.
const fmt = (n, casas = 0) => (n == null ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const fmtPct = (n) => (n == null ? '–' : `${fmt(n, Number.isInteger(n) ? 0 : 1)}%`);
const num = (n, casas = 2) => String(Math.round(n * 10 ** casas) / 10 ** casas).replace('.', ',');

// ---------- Sessão ----------
async function iniciar() {
  try {
    await api('/api/admin/sessao');
    mostrarPainel();
  } catch { /* fica na tela de login */ }
}

function mostrarPainel() {
  document.getElementById('tela-login').hidden = true;
  document.getElementById('lateral').hidden = false;
  document.getElementById('principal').hidden = false;
  carregarDesligamento();
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/admin/entrar', { method: 'POST', body: { senha: document.getElementById('senha').value } });
    mostrarPainel();
  } catch (err) { toast(err.message, 'erro'); }
});

document.getElementById('sair').addEventListener('click', async () => {
  await api('/api/admin/sair', { method: 'POST' });
  location.reload();
});

document.getElementById('btn-menu').addEventListener('click', () => document.getElementById('lateral').classList.toggle('aberta'));
document.getElementById('lateral').addEventListener('click', (e) => { if (e.target.closest('[data-sub]')) e.currentTarget.classList.remove('aberta'); });
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
