// Utilitários da avaliação de experiência compartilhados pela página do gestor, pela ciência do colaborador e pela área do RH.

const xpNA = (o) => /^(n\/?a|não se aplica)$/i.test(String(o).trim());
/** Opções em ordem do melhor para o pior: a primeira metade (arredondada para baixo) é positiva. Ex.: Sim | Bom | Aderente. */
function xpPositiva(opcoes, valor) {
  const lista = (opcoes || []).filter(o => !xpNA(o));
  const i = lista.indexOf(valor);
  return i > -1 && i < Math.max(1, Math.floor(lista.length / 2));
}
const xpAtencao = (opcoes, valor) => Boolean(valor) && !xpNA(valor) && (opcoes || []).includes(valor) && !xpPositiva(opcoes, valor);

const xpData = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '–');
const xpDataHora = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const xpIniciais = (nome) => String(nome || '').trim().split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : '')).join('').toUpperCase();
function xpDiasAte(iso) {
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  return Math.round((new Date(`${iso}T12:00:00`) - hoje) / 864e5);
}
/** Etiqueta de prazo: no prazo, perto (≤ 7 dias) ou atrasada. */
function xpPrazo(iso) {
  const d = xpDiasAte(iso);
  if (d < 0) return { classe: 'atrasado', texto: `atrasada há ${-d} dia${d === -1 ? '' : 's'}` };
  if (d === 0) return { classe: 'perto', texto: 'devolver hoje' };
  if (d <= 7) return { classe: 'perto', texto: `faltam ${d} dia${d === 1 ? '' : 's'}` };
  return { classe: 'ok', texto: `faltam ${d} dias` };
}

/** Avaliação respondida, só leitura (ciência do colaborador, área do RH e impressão). */
function xpHtmlLeitura(dados) {
  const porId = new Map((dados.respostas || []).map(r => [r.id, r]));
  const marca = (opcoes, v) => `<span class="xp-r ${xpAtencao(opcoes, v) ? 'atencao' : 'positiva'}">${esc(v)}</span>`;
  const secoes = dados.form.secoes.map((sec, i) => `
    <section class="xp-ler-bloco">
      <h3><b>${String(i + 1).padStart(2, '0')}</b>${esc(sec.titulo)}</h3>
      ${sec.perguntas.map(p => {
        const r = porId.get(p.id);
        let valor = '<span class="xp-r vazio">–</span>';
        if (r && p.tipo === 'grade') valor = `<ul class="xp-ler-grade">${p.itens.map(it => `<li><span>${esc(it)}</span>${r.valor[it] ? marca(p.opcoes, r.valor[it]) : '–'}</li>`).join('')}</ul>`;
        else if (r && Array.isArray(r.valor)) valor = r.valor.map(v => marca(p.opcoes, v)).join(' ');
        else if (r && p.tipo === 'data') valor = esc(xpData(r.valor));
        else if (r && (p.opcoes || []).length) valor = marca(p.opcoes, r.valor);
        else if (r) valor = `<span class="xp-r texto">${esc(r.valor)}</span>`;
        return `<div class="xp-ler-q ${p.tipo === 'grade' ? 'larga' : ''}"><p>${esc(p.texto)}</p><div>${valor}
          ${r?.outro ? `<small>Outros: ${esc(r.outro)}</small>` : ''}${r?.justificativa ? `<small>“${esc(r.justificativa)}”</small>` : ''}</div></div>`;
      }).join('')}
    </section>`).join('');
  const decisao = dados.decisao === 'Prorrogar' ? `Prorrogar + ${dados.prorrogar_dias} dias` : dados.decisao;
  return `${secoes}
    <section class="xp-ler-bloco xp-ler-parecer">
      <h3><b>✓</b>Parecer do gestor</h3>
      <div class="xp-ler-q"><p>De maneira geral, o colaborador pode ser classificado como</p><div><strong>${esc(dados.classificacao || '–')}</strong></div></div>
      <div class="xp-ler-q"><p>Decisão</p><div><strong class="xp-decisao d-${esc((dados.decisao || '').toLowerCase())}">${esc(decisao || '–')}</strong></div></div>
      ${dados.comentario ? `<div class="xp-ler-q larga"><p>Comentário</p><div><span class="xp-r texto">${esc(dados.comentario)}</span></div></div>` : ''}
      <p class="xp-ler-assina">Avaliado por <strong>${esc(dados.gestor_nome || dados.pessoa?.gestor || '–')}</strong> em ${xpDataHora(dados.respondido_em)}</p>
    </section>`;
}
