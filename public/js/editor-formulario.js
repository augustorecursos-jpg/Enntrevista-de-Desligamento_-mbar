// Editor de seções e perguntas reutilizável (avaliação de experiência e Primeiras Conexões).
// criarEditorFormulario(container, opcoes) → { carregar(secoes), secoes() }
function criarEditorFormulario(container, { rotuloSecao = 'Seção', presets = {}, tipos, camposSecao = false }) {
  const TIPOS = tipos || { unica: 'Escolha única', multipla: 'Múltipla seleção', grade: 'Grade (itens × escala)', curto: 'Texto curto', texto: 'Texto longo', data: 'Data' };
  const linhas = (lista) => (lista || []).join('\n');
  const separa = (txt) => String(txt || '').split('\n').map(s => s.trim()).filter(Boolean);
  const primeiroPreset = Object.values(presets)[0]?.[1] || ['Sim', 'Não'];
  const nova = () => ({ id: `p_${Math.random().toString(36).slice(2, 10)}`, tipo: 'unica', texto: '', opcoes: linhas(primeiroPreset), itens: '', obrigatoria: true, justificativa: false, outro: false, alerta: '' });
  let estado = [];

  function render() {
    container.innerHTML = estado.map((sec, i) => `
      <div class="q-edit" data-ed-sec="${i}">
        <div class="q-cab">${rotuloSecao} ${i + 1}
          <span>
            <button type="button" class="q-rem" data-acao="sec-sobe" title="Subir">↑</button>
            <button type="button" class="q-rem" data-acao="sec-desce" title="Descer">↓</button>
            <button type="button" class="q-rem" data-acao="sec-rem" title="Remover">🗑</button>
          </span>
        </div>
        <input class="campo" data-campo="titulo" value="${esc(sec.titulo)}" placeholder="Título (ex.: Relacionamento interpessoal)">
        ${camposSecao ? `<input class="campo" data-campo="subtitulo" value="${esc(sec.subtitulo || '')}" placeholder="Subtítulo (aparece para quem responde)">
        <input class="campo" data-campo="objetivo" value="${esc(sec.objetivo || '')}" placeholder="Objetivo (só para o RH)">` : ''}
        <div class="perguntas-edit">
          ${sec.perguntas.map((p, j) => {
            const comOpcoes = ['unica', 'multipla', 'grade'].includes(p.tipo);
            const escolha = p.tipo === 'unica' || p.tipo === 'multipla';
            const opcoesAlerta = [...separa(p.opcoes), ...(p.outro ? ['Outros'] : [])];
            return `
            <div class="pergunta-edit dsl-perg" data-perg="${j}">
              <select class="campo" data-campo="tipo" aria-label="Tipo da pergunta">
                ${Object.entries(TIPOS).map(([v, r]) => `<option value="${v}" ${p.tipo === v ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
              <input class="campo" data-campo="texto" value="${esc(p.texto)}" placeholder="Texto da pergunta">
              <span class="acoes-perg">
                <button type="button" class="q-rem" data-acao="perg-sobe" title="Subir">↑</button>
                <button type="button" class="q-rem" data-acao="perg-desce" title="Descer">↓</button>
                <button type="button" class="q-rem" data-acao="perg-rem" title="Remover pergunta">✕</button>
              </span>
              ${p.tipo === 'grade' ? `<label class="extra">Itens avaliados <small>(um por linha)</small>
                <textarea class="campo" data-campo="itens" rows="${Math.min(8, Math.max(3, separa(p.itens).length))}">${esc(p.itens)}</textarea></label>` : ''}
              ${comOpcoes ? `<label class="extra">${p.tipo === 'grade' ? 'Escala de resposta' : 'Opções'} <small>(uma por linha, da melhor para a pior)</small>
                <textarea class="campo" data-campo="opcoes" rows="${Math.min(8, Math.max(2, separa(p.opcoes).length))}">${esc(p.opcoes)}</textarea>
                <span class="presets">Usar: ${Object.entries(presets).map(([k, [rotulo]]) => `<button type="button" data-preset="${k}">${esc(rotulo)}</button>`).join('')}</span></label>` : ''}
              ${p.tipo === 'nota' ? `<label class="extra">Rótulos das pontas da escala (0 e 10) <small>(opcionais)</small>
                <span class="linha-form"><input class="campo" data-campo="extremo0" value="${esc(p.extremo0 || '')}" placeholder="Ex.: Nada provável">
                <input class="campo" data-campo="extremo1" value="${esc(p.extremo1 || '')}" placeholder="Ex.: Extremamente provável"></span></label>` : ''}
              <div class="extra dsl-flags">
                <label class="check"><input type="checkbox" data-campo="obrigatoria" ${p.obrigatoria ? 'checked' : ''}> Obrigatória</label>
                <label class="check"><input type="checkbox" data-campo="justificativa" ${p.justificativa ? 'checked' : ''}> Pedir justificativa</label>
                ${escolha ? `<label class="check"><input type="checkbox" data-campo="outro" ${p.outro ? 'checked' : ''}> Opção “Outros” com texto</label>
                <label class="check">⚠️ Alerta quando responder
                  <select class="campo" data-campo="alerta"><option value="">(sem alerta)</option>
                    ${opcoesAlerta.map(o => `<option ${o === p.alerta ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <div><button type="button" class="btn btn-claro btn-sm" data-acao="perg-add">+ pergunta</button></div>
      </div>`).join('');
  }

  const alvo = (el) => {
    const sec = el.closest('[data-ed-sec]');
    if (!sec) return {};
    const i = Number(sec.dataset.edSec);
    const perg = el.closest('[data-perg]');
    const j = perg ? Number(perg.dataset.perg) : null;
    return { i, s: estado[i], j, p: perg ? estado[i].perguntas[j] : null };
  };
  container.addEventListener('input', (e) => {
    const { s, p } = alvo(e.target);
    const campo = e.target.dataset.campo;
    if (!s || !campo || e.target.type === 'checkbox') return;
    (p || s)[campo] = e.target.value;
  });
  container.addEventListener('change', (e) => {
    const { p } = alvo(e.target);
    const campo = e.target.dataset.campo;
    if (!p || !campo) return;
    p[campo] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (['tipo', 'outro', 'opcoes'].includes(campo)) {
      if (campo === 'tipo' && ['unica', 'multipla', 'grade'].includes(p.tipo) && !separa(p.opcoes).length) p.opcoes = linhas(primeiroPreset);
      if (!separa(p.opcoes).concat(p.outro ? ['Outros'] : []).includes(p.alerta)) p.alerta = '';
      render();
    }
  });
  container.addEventListener('click', (e) => {
    const preset = e.target.closest('[data-preset]');
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (!preset && !acao) return;
    const { i, s, j, p } = alvo(e.target);
    if (!s) return;
    const troca = (lista, a, b) => { if (b >= 0 && b < lista.length) [lista[a], lista[b]] = [lista[b], lista[a]]; };
    if (preset) { p.opcoes = linhas(presets[preset.dataset.preset][1]); p.alerta = ''; }
    else if (acao === 'sec-sobe') troca(estado, i, i - 1);
    else if (acao === 'sec-desce') troca(estado, i, i + 1);
    else if (acao === 'sec-rem') {
      if (estado.length === 1) return toast('O formulário precisa de ao menos uma seção.', 'erro');
      if (!confirm(`Remover "${s.titulo || i + 1}" e suas perguntas?`)) return;
      estado.splice(i, 1);
    } else if (acao === 'perg-sobe') troca(s.perguntas, j, j - 1);
    else if (acao === 'perg-desce') troca(s.perguntas, j, j + 1);
    else if (acao === 'perg-rem') s.perguntas.splice(j, 1);
    else if (acao === 'perg-add') s.perguntas.push(nova());
    render();
  });

  return {
    carregar(secoes) {
      estado = structuredClone(secoes).map(sec => ({
        ...sec,
        perguntas: sec.perguntas.map(p => ({ ...p, opcoes: linhas(p.opcoes), itens: linhas(p.itens), alerta: p.alerta || '', extremo0: p.extremos?.[0] || '', extremo1: p.extremos?.[1] || '' })),
      }));
      render();
    },
    adicionarSecao() {
      estado.push({ titulo: '', perguntas: [nova()] });
      render();
      container.lastElementChild.querySelector('input').focus();
    },
    secoes: () => estado.map(sec => ({ ...sec, perguntas: sec.perguntas.map(({ extremo0, extremo1, ...p }) => ({ ...p, opcoes: separa(p.opcoes), itens: separa(p.itens), extremos: [extremo0, extremo1] })) })),
  };
}
