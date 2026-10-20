// Dados fictícios para os prints do e-book: três regionais, pessoas em experiência, entrevistas de desligamento
// e uma coordenadora regional. Tudo pela API, em um servidor temporário.
async function popular(base, senhaAdmin) {
  const H = { 'Content-Type': 'application/json' };
  let semente = 11;
  const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  const pick = (a, bias = 0) => a[rnd() < bias ? 0 : Math.floor(rnd() * a.length)];
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const json = async (r) => { const t = await r.json(); if (!r.ok) throw new Error(t.erro || r.status); return t; };

  const login = await fetch(`${base}/api/admin/entrar`, { method: 'POST', headers: H, body: JSON.stringify({ usuario: 'admin', senha: senhaAdmin }) });
  const A = { ...H, cookie: login.headers.get('set-cookie').split(';')[0] };
  const get = (u) => fetch(base + u, { headers: A }).then(json);
  const post = (u, b, h = A) => fetch(base + u, { method: 'POST', headers: h, body: JSON.stringify(b) }).then(json);

  const regs = [['Centro-Oeste', 'Logística', 'Edson Silva'], ['Sudeste', 'Operações', 'Marta Gomes'], ['Nordeste', 'Manutenção', 'Rui Castro']];
  const nomes = ['Ana Paula Ribeiro', 'Bruno Carvalho', 'Camila Duarte', 'Diego Martins', 'Elaine Souza', 'Fábio Nogueira', 'Gabriela Lima', 'Henrique Alves',
    'Isabela Rocha', 'João Pedro Melo', 'Karina Freitas', 'Lucas Barbosa', 'Mariana Teles', 'Nelson Prado', 'Olívia Campos', 'Pedro Henrique Sá'];
  const admissoes = [-31, -12, -78, -40, -66, -20, -85, -48, -35, -70, -15, -52, -60, -25, -44, -8];
  await post('/api/admin/pessoas/importar', { linhas: nomes.map((nome, i) => {
    const [regional, setor, gestor] = regs[i % 3];
    return { nome, chapa: String(4460000 + i), cargo: pick(['Assistente', 'Analista', 'Técnico(a)', 'Operador(a)']), setor, regional, gestor,
      gestor_telefone: `(65) 99999-00${String(i).padStart(2, '0')}`, gestor_email: `${gestor.split(' ')[0].toLowerCase()}@exemplo.com`, admissao: dia(admissoes[i]) };
  }) });

  const avs = await get('/api/admin/experiencia/avaliacoes');
  const form = await get('/api/admin/experiencia/formulario');
  const primeiros = avs.filter(a => a.periodo === 1);
  let tokenGestor = '';
  let tokenCiencia = '';
  for (const [k, a] of primeiros.entries()) {
    if (k % 5 === 0) continue; // fica "a enviar"
    await fetch(`${base}/api/admin/experiencia/avaliacoes/${a.id}`, { method: 'PATCH', headers: A, body: JSON.stringify({ acao: 'enviada' }) });
    if (k % 5 === 1) { if (!tokenGestor && a.nome.startsWith('Ana')) tokenGestor = a.token_gestor; continue; } // com o gestor
    if (k % 5 === 2 && !tokenGestor) { tokenGestor = a.token_gestor; continue; }
    const respostas = {};
    for (const s of form.secoes) for (const p of s.perguntas) {
      respostas[p.id] = p.tipo === 'grade' ? { valor: Object.fromEntries(p.itens.map(i => [i, pick(p.opcoes, .82)])) } : { valor: pick(p.opcoes, .72) };
    }
    const decisao = ['Efetivar', 'Efetivar', 'Prorrogar', 'Rescindir', 'Efetivar'][k % 5];
    await post(`/api/experiencia/${a.token_gestor}`, { respostas, parecer: {
      classificacao: decisao === 'Rescindir' ? 'Sem possibilidades futuras' : decisao === 'Prorrogar' ? 'Tem algumas possibilidades futuras' : 'Possui ótimas perspectivas para o futuro',
      decisao, prorrogar_dias: decisao === 'Prorrogar' ? 45 : null, comentario: 'Boa adaptação à equipe; combinamos foco em autonomia nas rotinas do setor.',
      gestor_nome: a.gestor, colaborador_de_acordo: true } }, H);
    if (k % 2 === 0) await post(`/api/experiencia/ciencia/${a.token_ciencia}`, { ciente: true, nome: a.nome }, H);
    else if (!tokenCiencia) tokenCiencia = a.token_ciencia;
  }
  if (!tokenGestor) tokenGestor = primeiros.find(a => a.status !== 'concluida').token_gestor;

  const dform = await (await fetch(`${base}/api/desligamento`)).json();
  const saidas = [['Paulo Henrique Dias', 0], ['Renata Queiroz', 1], ['Sérgio Antunes', 2], ['Tatiane Moura', 0], ['Ulisses Ramos', 1], ['Vera Lúcia Pinto', 0], ['Wagner Teixeira', 2]];
  let tokenDesligamento = '';
  for (const [i, [nome, r]] of saidas.entries()) {
    const [regional, area, gestor] = regs[r];
    const c = await post('/api/admin/desligamento/convites', { nome, regional, area, cargo: pick(['Analista', 'Técnico(a)', 'Assistente']), gestor,
      data_admissao: dia(-420 - i * 75), data_desligamento: dia(-i * 7), telefone: `(65) 98888-00${i}`, email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com`, responsavel_rh: 'Juliana Prado' });
    if (i >= 5) { if (!tokenDesligamento) tokenDesligamento = c.token; continue; } // aguardando resposta
    const respostas = {};
    for (const s of dform.secoes) for (const q of s.perguntas) {
      if (q.tipo === 'unica') respostas[q.id] = { valor: pick(q.opcoes, .45) };
      else if (q.tipo === 'multipla') respostas[q.id] = { valor: [...new Set([pick(q.opcoes), pick(q.opcoes)])] };
      else if (q.tipo === 'grade') respostas[q.id] = { valor: Object.fromEntries(q.itens.map(it => [it, pick(q.opcoes, .35)])) };
      else if (q.tipo === 'texto' && rnd() < .6) respostas[q.id] = { valor: 'Gostei muito da equipe; sairei por uma proposta mais perto de casa.' };
    }
    await post('/api/desligamento', { c: c.token, identificacao: { nome }, respostas }, H);
  }

  const u = await post('/api/admin/usuarios', { nome: 'Juliana Prado', email: 'juliana.prado@exemplo.com', papel: 'regional', regional: 'Centro-Oeste' });
  return { senhaAdmin, senhaCoordenadora: u.senha, tokenGestor, tokenCiencia, tokenDesligamento };
}

module.exports = { popular };
