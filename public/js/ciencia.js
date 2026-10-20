// Ciência digital do colaborador sobre a avaliação de experiência (?t=token), no lugar da assinatura em papel.
const xpToken = new URLSearchParams(location.search).get('t') || '';
const xpRaiz = document.getElementById('xp-conteudo');

function xpFinal(titulo, texto) {
  window.scrollTo(0, 0);
  xpRaiz.innerHTML = `<section class="xp-final"><span class="xp-selo">✓</span><h1>${esc(titulo)}</h1><p>${esc(texto)}</p></section>`;
}

(async () => {
  let d;
  try {
    if (!xpToken) throw new Error('Link incompleto. Procure o time de RH.');
    d = await api(`/api/experiencia/ciencia/${encodeURIComponent(xpToken)}`);
  } catch (err) { return xpFinal('Ops.', err.message); }
  if (d.ciencia_em) return xpFinal('Ciência registrada', `Você registrou a ciência desta avaliação em ${xpDataHora(d.ciencia_em)}. Obrigado!`);
  const primeiro = d.pessoa.nome.split(' ')[0];
  xpRaiz.innerHTML = `
    <div class="xp-ciencia">
      <section class="xp-abertura">
        <small>${esc(d.form.titulo.toUpperCase())} · ${d.periodo}º PERÍODO</small>
        <h1>Olá, <em>${esc(primeiro)}</em>! Sua avaliação foi concluída.</h1>
        <p>${esc(d.gestor_nome || d.pessoa.gestor || 'Seu gestor')} avaliou seu ${d.periodo}º período de experiência, que vence em <strong>${xpData(d.vencimento)}</strong>.
          Leia com atenção e registre sua ciência no final da página.</p>
      </section>
      <div class="xp-ler">${xpHtmlLeitura(d)}</div>
      <form class="xp-parecer xp-ciente" id="xp-ciente" novalidate>
        <header><b>✍</b><h2>Ciência do colaborador</h2></header>
        <label class="xp-op xp-op-ciente"><input type="checkbox" name="ciente"><span>Li a avaliação e estou ciente do seu conteúdo.</span></label>
        <label class="xp-q larga"><span class="xp-q-texto">Seu nome completo</span>
          <input class="xp-campo" name="nome" maxlength="200" value="${esc(d.pessoa.nome)}"></label>
        <button class="xp-enviar" type="submit">Registrar ciência <span aria-hidden="true">✓</span></button>
        <p class="xp-nota">Ciência significa que você leu a avaliação; não quer dizer que concorda com tudo. Dúvidas? Converse com seu gestor ou com o RH.</p>
      </form>
    </div>`;
  document.getElementById('xp-ciente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.ciente.checked || !f.nome.value.trim()) return toast('Marque a confirmação e digite seu nome completo.', 'erro');
    f.querySelector('button').disabled = true;
    try {
      await api(`/api/experiencia/ciencia/${encodeURIComponent(xpToken)}`, { method: 'POST', body: { ciente: true, nome: f.nome.value.trim() } });
      xpFinal('Ciência registrada!', `Obrigado, ${primeiro}. Desejamos uma ótima jornada na Âmbar!`);
    } catch (err) { f.querySelector('button').disabled = false; toast(err.message, 'erro'); }
  });
})();
