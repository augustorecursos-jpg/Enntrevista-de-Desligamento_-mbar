// Avaliação de experiência preenchida pelo gestor (?t=token). Com ?previa=1, o RH vê o formulário sem enviar nada.
const xpParams = new URLSearchParams(location.search);
const xpToken = xpParams.get('t') || '';
const xpPrevia = xpParams.get('previa') === '1';
const xpRaiz = document.getElementById('xp-conteudo');
let xpDados;

const xpOpcoesHtml = (nome, opcoes, tipo = 'radio') => `<div class="xp-ops">${opcoes.map(o => `
  <label class="xp-op"><input type="${tipo}" name="${nome}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div>`;

function xpPerguntaHtml(p) {
  const nome = `q-${p.id}`;
  const opcoes = [...(p.opcoes || []), ...(p.outro ? ['Outros'] : [])];
  let corpo;
  if (p.tipo === 'grade') {
    return `
      <div class="xp-q xp-q-grade" data-pergunta="${esc(p.id)}">
        <p class="xp-q-texto">${esc(p.texto)}${p.obrigatoria ? ' <b class="obrig">*</b>' : ''}</p>
        <div class="xp-grade" style="--n:${p.opcoes.length}">
          <div class="xp-grade-cab"><span></span>${p.opcoes.map(o => `<span>${esc(o)}</span>`).join('')}</div>
          ${p.itens.map((item, k) => `
            <div class="xp-grade-linha">
              <span class="xp-grade-item">${esc(item)}</span>
              ${p.opcoes.map(o => `<label class="xp-op" title="${esc(o)}"><input type="radio" name="${nome}-${k}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}
            </div>`).join('')}
        </div>
        <p class="xp-erro"></p>
      </div>`;
  }
  if (p.tipo === 'unica') corpo = xpOpcoesHtml(nome, opcoes);
  else if (p.tipo === 'multipla') corpo = xpOpcoesHtml(nome, opcoes, 'checkbox');
  else if (p.tipo === 'texto') corpo = `<textarea class="xp-campo" name="${nome}" rows="3" maxlength="3000"></textarea>`;
  else if (p.tipo === 'curto') corpo = `<input class="xp-campo" name="${nome}" maxlength="300">`;
  else corpo = `<input class="xp-campo" type="date" name="${nome}">`;
  const largo = !['unica'].includes(p.tipo) || opcoes.length > 3 || opcoes.some(o => o.length > 14);
  return `
    <div class="xp-q ${largo ? 'larga' : ''}" data-pergunta="${esc(p.id)}">
      <p class="xp-q-texto">${esc(p.texto)}${p.obrigatoria ? ' <b class="obrig">*</b>' : ''}</p>
      <div class="xp-q-resp">${corpo}
        ${p.outro ? `<input class="xp-campo xp-outro" name="${nome}-outro" maxlength="300" placeholder="Outros: qual?" hidden>` : ''}
        ${p.justificativa ? `<textarea class="xp-campo xp-just" name="${nome}-just" rows="2" maxlength="3000" placeholder="Justificativa (opcional)"></textarea>` : ''}
      </div>
      <p class="xp-erro"></p>
    </div>`;
}

function xpFichaHtml(d) {
  const pz = xpPrazo(d.prazo);
  return `
    <aside class="xp-ficha">
      <div class="xp-ficha-cab">
        <span class="xp-avatar">${esc(xpIniciais(d.pessoa.nome))}</span>
        <div><strong>${esc(d.pessoa.nome)}</strong><small>${esc([d.pessoa.cargo, d.pessoa.setor].filter(Boolean).join(' · '))}</small></div>
      </div>
      <span class="xp-periodo">${d.periodo}º período de experiência</span>
      <dl class="xp-dados">
        ${d.pessoa.chapa ? `<div><dt>Chapa</dt><dd>${esc(d.pessoa.chapa)}</dd></div>` : ''}
        <div><dt>Admissão</dt><dd>${xpData(d.pessoa.admissao)}</dd></div>
        <div><dt>Vencimento</dt><dd>${xpData(d.vencimento)}</dd></div>
        <div><dt>Gestor</dt><dd>${esc(d.pessoa.gestor || '–')}</dd></div>
      </dl>
      <p class="xp-prazo ${pz.classe}">⏳ Devolver até <strong>${xpData(d.prazo)}</strong> · ${pz.texto}</p>
      <div class="xp-resumo" id="xp-resumo"></div>
    </aside>`;
}

function xpRender() {
  const d = xpDados;
  document.title = `${d.form.titulo} · ${d.pessoa.nome} · Jornada Âmbar`;
  document.getElementById('xp-titulo-topo').textContent = d.form.titulo;
  xpRaiz.innerHTML = `
    ${xpPrevia ? '<p class="xp-aviso">👁 Pré-visualização com dados de exemplo · nada será enviado</p>' : ''}
    <div class="xp-grade-pagina">
      ${xpFichaHtml(d)}
      <form class="xp-folha" id="xp-form" novalidate>
        <section class="xp-abertura">
          <small>${esc(d.form.titulo.toUpperCase())} · ${d.periodo}º PERÍODO</small>
          <h1>Como está sendo a chegada de <em>${esc(d.pessoa.nome.split(' ')[0])}</em>?</h1>
          <p>${esc(d.form.introducao)}</p>
        </section>
        ${d.form.secoes.map((sec, i) => `
          <section class="xp-bloco" data-secao="${i}">
            <header><b>${String(i + 1).padStart(2, '0')}</b><h2>${esc(sec.titulo)}</h2><span class="xp-bloco-conta"></span></header>
            ${sec.perguntas.map(xpPerguntaHtml).join('')}
          </section>`).join('')}
        <section class="xp-parecer">
          <header><b>✓</b><h2>Parecer final</h2></header>
          <div class="xp-q larga" data-parecer="classificacao">
            <p class="xp-q-texto">De maneira geral, como o colaborador pode ser classificado? <b class="obrig">*</b></p>
            <div class="xp-q-resp xp-coluna">${xpOpcoesHtml('classificacao', d.classificacoes)}</div><p class="xp-erro"></p>
          </div>
          <div class="xp-q larga" data-parecer="decisao">
            <p class="xp-q-texto">Decisão sobre o contrato <b class="obrig">*</b></p>
            <div class="xp-q-resp">
              <div class="xp-ops xp-decisoes">${d.decisoes.map(o => `
                <label class="xp-op d-${o.toLowerCase()}"><input type="radio" name="decisao" value="${o}"><span>${o}</span>${o === 'Prorrogar'
                  ? '<span class="xp-dias" hidden>+ <input class="xp-campo" type="number" name="prorrogar_dias" min="1" max="90" inputmode="numeric" aria-label="Dias de prorrogação"> dias</span>' : ''}</label>`).join('')}
              </div>
            </div><p class="xp-erro"></p>
          </div>
          <label class="xp-q larga"><span class="xp-q-texto">Comentário <small>(opcional)</small></span>
            <textarea class="xp-campo" name="comentario" rows="4" maxlength="4000" placeholder="Pontos fortes, pontos a desenvolver, combinados com o colaborador…"></textarea></label>
          <label class="xp-q larga" data-parecer="gestor_nome"><span class="xp-q-texto">Seu nome (assinatura do gestor) <b class="obrig">*</b></span>
            <input class="xp-campo" name="gestor_nome" maxlength="200" value="${esc(d.pessoa.gestor || '')}"><p class="xp-erro"></p></label>
          <button class="xp-enviar" type="submit">Enviar avaliação <span aria-hidden="true">→</span></button>
          <p class="xp-nota">Depois do envio, ${esc(d.pessoa.nome.split(' ')[0])} recebe a avaliação para registrar a ciência.</p>
        </section>
      </form>
    </div>`;
  const f = document.getElementById('xp-form');
  f.addEventListener('change', xpMudou);
  f.addEventListener('input', xpAtualizarResumo);
  f.addEventListener('submit', (e) => { e.preventDefault(); xpEnviar(); });
  xpAtualizarResumo();
}

const xpPerguntas = () => xpDados.form.secoes.flatMap((s, i) => s.perguntas.map(p => ({ ...p, secao: i })));
const xpCaixa = (id) => xpRaiz.querySelector(`[data-pergunta="${CSS.escape(id)}"]`);

function xpLer(p) {
  const c = xpCaixa(p.id);
  const nome = `q-${p.id}`;
  let valor;
  if (p.tipo === 'unica') valor = c.querySelector(`input[name="${nome}"]:checked`)?.value || '';
  else if (p.tipo === 'multipla') valor = [...c.querySelectorAll(`input[name="${nome}"]:checked`)].map(i => i.value);
  else if (p.tipo === 'grade') {
    valor = {};
    p.itens.forEach((it, k) => { const v = c.querySelector(`input[name="${nome}-${k}"]:checked`)?.value; if (v) valor[it] = v; });
  } else valor = c.querySelector(`[name="${nome}"]`).value.trim();
  return { valor, outro: c.querySelector(`[name="${nome}-outro"]`)?.value.trim() || '', justificativa: c.querySelector(`[name="${nome}-just"]`)?.value.trim() || '' };
}
function xpRespondida(p) {
  const { valor } = xpLer(p);
  if (p.tipo === 'grade') return Object.keys(valor).length === p.itens.length;
  return Array.isArray(valor) ? valor.length > 0 : Boolean(valor);
}

function xpMudou(e) {
  const caixa = e.target.closest('[data-pergunta], [data-parecer]');
  if (caixa) { caixa.classList.remove('faltando'); caixa.querySelector('.xp-erro') && (caixa.querySelector('.xp-erro').textContent = ''); }
  const outro = caixa?.querySelector('.xp-outro');
  if (outro) outro.hidden = !caixa.querySelector('input[value="Outros"]:checked');
  if (e.target.name === 'decisao') {
    const dias = xpRaiz.querySelector('.xp-dias');
    dias.hidden = e.target.value !== 'Prorrogar';
    if (!dias.hidden) dias.querySelector('input').focus();
  }
  xpAtualizarResumo();
}

/** Resumo ao vivo na ficha: andamento, aderência aos valores e pontos de atenção. */
function xpAtualizarResumo() {
  const ps = xpPerguntas();
  const obrig = ps.filter(p => p.obrigatoria);
  const feitas = obrig.filter(xpRespondida).length;
  const atencao = [];
  let ader = null;
  for (const p of ps) {
    const { valor } = xpLer(p);
    if (p.tipo === 'grade') {
      const vals = Object.values(valor);
      if (!ader) ader = { pos: vals.filter(v => xpPositiva(p.opcoes, v)).length, total: p.itens.length, titulo: xpDados.form.secoes[p.secao].titulo };
      Object.entries(valor).forEach(([it, v]) => { if (xpAtencao(p.opcoes, v)) atencao.push(`${it}: ${v}`); });
    } else [].concat(valor).forEach(v => { if (xpAtencao(p.opcoes, v)) atencao.push(`${p.texto.length > 46 ? p.texto.slice(0, 44) + '…' : p.texto}: ${v}`); });
  }
  xpDados.form.secoes.forEach((s, i) => {
    const qs = ps.filter(p => p.secao === i && p.obrigatoria);
    const ok = qs.filter(xpRespondida).length;
    const el = xpRaiz.querySelector(`[data-secao="${i}"] .xp-bloco-conta`);
    el.textContent = qs.length ? `${ok}/${qs.length}` : '';
    el.classList.toggle('completo', qs.length > 0 && ok === qs.length);
  });
  const parecerOk = ['classificacao', 'decisao'].filter(n => xpRaiz.querySelector(`input[name="${n}"]:checked`)).length;
  const pct = Math.round(((feitas + parecerOk) / (obrig.length + 2)) * 100);
  document.getElementById('xp-resumo').innerHTML = `
    <p class="xp-resumo-tit">Resumo ao vivo</p>
    <div class="xp-medidor"><span>Preenchimento</span><b>${pct}%</b><i><em style="width:${pct}%"></em></i></div>
    ${ader ? `<div class="xp-medidor"><span>${esc(ader.titulo)}</span><b>${ader.pos}/${ader.total}</b><i><em class="azul" style="width:${(ader.pos / ader.total) * 100}%"></em></i></div>` : ''}
    <div class="xp-atencao ${atencao.length ? 'tem' : ''}">
      <span>Pontos de atenção</span><b>${atencao.length}</b>
      ${atencao.length ? `<ul>${atencao.slice(0, 6).map(t => `<li>${esc(t)}</li>`).join('')}${atencao.length > 6 ? `<li>+ ${atencao.length - 6}</li>` : ''}</ul>` : ''}
    </div>`;
}

async function xpEnviar() {
  const f = document.getElementById('xp-form');
  let primeira = null;
  const marcar = (caixa, msg) => { caixa.classList.add('faltando'); caixa.querySelector('.xp-erro').textContent = msg; primeira = primeira || caixa; };
  const respostas = {};
  for (const p of xpPerguntas()) {
    respostas[p.id] = xpLer(p);
    if (p.obrigatoria && !xpRespondida(p)) marcar(xpCaixa(p.id), p.tipo === 'grade' ? 'Avalie todos os itens.' : 'Pergunta obrigatória.');
  }
  const classificacao = f.querySelector('input[name="classificacao"]:checked')?.value;
  const decisao = f.querySelector('input[name="decisao"]:checked')?.value;
  const dias = Number(f.querySelector('[name="prorrogar_dias"]').value);
  const gestorNome = f.querySelector('[name="gestor_nome"]').value.trim();
  if (!classificacao) marcar(f.querySelector('[data-parecer="classificacao"]'), 'Escolha uma classificação.');
  if (!decisao) marcar(f.querySelector('[data-parecer="decisao"]'), 'Escolha a decisão.');
  else if (decisao === 'Prorrogar' && !(dias >= 1 && dias <= 90)) marcar(f.querySelector('[data-parecer="decisao"]'), 'Informe os dias de prorrogação (1 a 90).');
  if (!gestorNome) marcar(f.querySelector('[data-parecer="gestor_nome"]'), 'Informe seu nome.');
  if (primeira) {
    primeira.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return toast('Há campos obrigatórios sem resposta.', 'erro');
  }
  if (xpPrevia) return toast('Pré-visualização: nada foi enviado ✅');
  const btn = f.querySelector('.xp-enviar');
  btn.disabled = true;
  try {
    await api(`/api/experiencia/${encodeURIComponent(xpToken)}`, { method: 'POST', body: {
      respostas, parecer: { classificacao, decisao, prorrogar_dias: decisao === 'Prorrogar' ? dias : null, comentario: f.querySelector('[name="comentario"]').value, gestor_nome: gestorNome },
    } });
    xpFinal('Avaliação enviada!', `Obrigado. O RH vai colher a ciência de ${xpDados.pessoa.nome.split(' ')[0]} e você não precisa fazer mais nada.`);
  } catch (err) { btn.disabled = false; toast(err.message, 'erro'); }
}

function xpFinal(titulo, texto) {
  window.scrollTo(0, 0);
  xpRaiz.innerHTML = `<section class="xp-final"><span class="xp-selo">✓</span><h1>${esc(titulo)}</h1><p>${esc(texto)}</p></section>`;
}

(async () => {
  try {
    if (xpPrevia) {
      const form = await api('/api/admin/experiencia/formulario');
      const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
      xpDados = { form, periodo: 1, vencimento: dia(14), prazo: dia(4), pessoa: { nome: 'Colaborador de Exemplo', cargo: 'Cargo', setor: 'Setor', gestor: 'Gestor de Exemplo', admissao: dia(-31), chapa: '000000' },
        classificacoes: ['Possui ótimas perspectivas para o futuro', 'Tem algumas possibilidades futuras', 'Sem possibilidades futuras'], decisoes: ['Efetivar', 'Prorrogar', 'Rescindir'] };
    } else {
      if (!xpToken) throw new Error('Link incompleto. Procure o time de RH.');
      xpDados = await api(`/api/experiencia/${encodeURIComponent(xpToken)}`);
    }
  } catch (err) {
    return xpFinal('Ops.', err.status === 401 ? 'Entre na área do RH para pré-visualizar o formulário.' : err.message);
  }
  if (xpDados.respondido_em) return xpFinal('Avaliação já enviada', `Você enviou esta avaliação em ${xpDataHora(xpDados.respondido_em)}. Obrigado!`);
  if (xpDados.status === 'dispensada') return xpFinal('Avaliação dispensada', 'A decisão do período anterior encerrou o contrato de experiência. Não é preciso responder.');
  xpRender();
})();
