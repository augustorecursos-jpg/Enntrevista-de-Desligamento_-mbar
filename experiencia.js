// Avaliação de experiência (1º e 2º período): cadastro de pessoas, avaliação preenchida pelo gestor por link,
// ciência digital do colaborador e acompanhamento/indicadores na área do RH.
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { db } = require('./db');
const { lerFormulario, lerRespostas, texto, dataValida } = require('./desligamento');

const CHAVE_FORM = 'avaliacao_experiencia';
const CLASSIFICACOES = ['Possui ótimas perspectivas para o futuro', 'Tem algumas possibilidades futuras', 'Sem possibilidades futuras'];
const DECISOES = ['Efetivar', 'Prorrogar', 'Rescindir'];
const ADERENCIA = ['Aderente', 'Não aderente'];
const CONCEITO = ['Bom', 'Regular', 'Ruim'];
const SIM_NAO = ['Sim', 'Não'];

db.exec(`
  CREATE TABLE IF NOT EXISTS pessoas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT NOT NULL,
    chapa      TEXT,
    cargo      TEXT,
    setor      TEXT,
    gestor     TEXT,
    gestor_telefone TEXT,
    gestor_email TEXT,
    telefone   TEXT,
    email      TEXT,
    admissao   TEXT NOT NULL,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS exp_avaliacoes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa_id     INTEGER NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    periodo       INTEGER NOT NULL,             -- 1 ou 2
    vencimento    TEXT NOT NULL,                -- fim do período de experiência
    token_gestor  TEXT NOT NULL UNIQUE,
    token_ciencia TEXT NOT NULL UNIQUE,
    enviado_em    TEXT,                         -- RH enviou o link ao gestor
    aberto_em     TEXT,                         -- gestor abriu o link
    respostas     TEXT,                         -- JSON (mesmo formato da entrevista de desligamento)
    classificacao TEXT,
    decisao       TEXT,                         -- Efetivar · Prorrogar · Rescindir
    prorrogar_dias INTEGER,
    comentario    TEXT,
    gestor_nome   TEXT,                         -- quem preencheu
    alerta        INTEGER NOT NULL DEFAULT 0,
    respondido_em TEXT,
    ciencia_em    TEXT,
    ciencia_nome  TEXT,
    ciencia_forma TEXT,                         -- 'link' (colaborador) ou 'rh' (registrada pelo RH)
    criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (pessoa_id, periodo)
  );
`);

/** Formulário inicial, transcrito da planilha "Avaliação de Experiência". */
function formularioPadrao() {
  const p = (id, tipo, textoP, opcoes, extra = {}) => ({ id, tipo, texto: textoP, opcoes, obrigatoria: true, justificativa: false, outro: false, ...extra });
  return {
    ativa: true,
    titulo: 'Avaliação de Experiência',
    introducao: 'Assinale o conceito que melhor identifica o desempenho do colaborador. Devolva a avaliação com antecedência de dez dias do vencimento do contrato.',
    assunto: 'Avaliação de experiência · {nome}',
    mensagem: 'Olá, {gestor}! Está na hora da avaliação de experiência ({periodo}) de {nome}, que vence em {vencimento}. Por favor, responda até {prazo} pelo link: {link}',
    mensagem_ciencia: 'Olá, {nome}! Sua avaliação de experiência ({periodo}) foi concluída pelo seu gestor. Para registrar sua ciência, acesse: {link}',
    periodos: [45, 90],
    antecedencia: 10,
    secoes: [
      { titulo: 'Cultura e valores', perguntas: [
        p('valores', 'grade', 'Quanto aos valores e à cultura da empresa, o colaborador pode ser avaliado:', ADERENCIA,
          { itens: ['Atitude de dono', 'Determinação', 'Disciplina', 'Disponibilidade', 'Simplicidade', 'Franqueza', 'Humildade'] }),
      ] },
      { titulo: 'Flexibilidade e adaptação ao trabalho', perguntas: [
        p('adaptacao', 'unica', 'Adaptação do colaborador à equipe, às atribuições e à cultura da empresa', CONCEITO),
        p('perfil_cargo', 'unica', 'Suas características pessoais estão alinhadas aos requisitos do cargo e à cultura da empresa', SIM_NAO),
        p('adaptacao_atividades', 'unica', 'Demonstra adaptação quanto às atividades exercidas', SIM_NAO),
        p('integrado', 'unica', 'Está completamente integrado à equipe, às atribuições do cargo e às normas e políticas da empresa', SIM_NAO),
      ] },
      { titulo: 'Interesse e compromisso', perguntas: [
        p('entusiasmo', 'unica', 'Nível de entusiasmo demonstrado pelo trabalho que realiza', CONCEITO),
        p('interesse', 'unica', 'Demonstra total interesse pelo emprego e pelos seus resultados', CONCEITO),
      ] },
      { titulo: 'Relacionamento interpessoal', perguntas: [
        p('interface_equipe', 'unica', 'Teve boa integração e tem tido interface com a equipe', SIM_NAO),
        p('importante_equipe', 'unica', 'Em pouco tempo tornou-se uma pessoa importante para a equipe e está totalmente integrado', SIM_NAO),
      ] },
      { titulo: 'Capacidade de aprendizagem', perguntas: [
        p('absorver', 'unica', 'Facilidade em absorver novas informações e colocá-las em prática', CONCEITO),
        p('aprender', 'unica', 'Mostra-se determinado para aprender', SIM_NAO),
        p('consistencia', 'unica', 'Demonstra habilidade na execução das atividades de forma consistente', SIM_NAO),
      ] },
      { titulo: 'Assiduidade e pontualidade', perguntas: [
        p('pontualidade', 'unica', 'Cumpre de forma organizada e pontual seus compromissos', SIM_NAO),
      ] },
    ],
  };
}

db.prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)').run(CHAVE_FORM, JSON.stringify(formularioPadrao()));
const formulario = () => JSON.parse(db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get(CHAVE_FORM).valor);

// ---------- datas ----------
const somarDias = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
/** Vencimento do período: o dia da admissão conta como o 1º dia do contrato. */
const vencimentoPadrao = (admissao, dias) => somarDias(admissao, dias - 1);
const novoToken = () => crypto.randomBytes(9).toString('base64url');

/** Situação de cada avaliação, considerando a decisão do 1º período para liberar (ou dispensar) o 2º. */
function situacao(a, p1) {
  if (a.ciencia_em) return 'concluida';
  if (a.respondido_em) return 'aguardando_ciencia';
  if (a.periodo === 2 && p1) {
    if (p1.decisao === 'Efetivar' || p1.decisao === 'Rescindir') return 'dispensada';
    if (!p1.respondido_em) return 'aguardando_1';
  }
  return a.enviado_em ? 'com_gestor' : 'a_enviar';
}

function listarAvaliacoes(where = '', params = []) {
  const form = formulario();
  const linhas = db.prepare(`
    SELECT a.*, p.nome, p.chapa, p.cargo, p.setor, p.gestor, p.gestor_telefone, p.gestor_email, p.telefone, p.email, p.admissao
    FROM exp_avaliacoes a JOIN pessoas p ON p.id = a.pessoa_id ${where} ORDER BY a.vencimento, a.periodo`).all(...params);
  const primeiros = new Map(db.prepare('SELECT pessoa_id, decisao, respondido_em FROM exp_avaliacoes WHERE periodo = 1').all().map(r => [r.pessoa_id, r]));
  return linhas.map(a => ({
    ...a,
    respostas: a.respostas ? JSON.parse(a.respostas) : [],
    prazo: somarDias(a.vencimento, -(Number(form.antecedencia) || 0)),
    status: situacao(a, primeiros.get(a.pessoa_id)),
  }));
}

/** Cria (ou atualiza o vencimento de) as avaliações de 1º e 2º período de uma pessoa ainda não respondidas. */
function sincronizarAvaliacoes(pessoaId, admissao) {
  const { periodos } = formulario();
  for (const periodo of [1, 2]) {
    const venc = vencimentoPadrao(admissao, Number(periodos?.[periodo - 1]) || (periodo === 1 ? 45 : 90));
    const atual = db.prepare('SELECT * FROM exp_avaliacoes WHERE pessoa_id = ? AND periodo = ?').get(pessoaId, periodo);
    if (!atual) {
      db.prepare('INSERT INTO exp_avaliacoes (pessoa_id, periodo, vencimento, token_gestor, token_ciencia) VALUES (?, ?, ?, ?, ?)')
        .run(pessoaId, periodo, venc, novoToken(), novoToken());
    } else if (!atual.respondido_em) {
      db.prepare('UPDATE exp_avaliacoes SET vencimento = ? WHERE id = ?').run(venc, atual.id);
    }
  }
}

function lerPessoa(b) {
  const p = {
    nome: texto(b?.nome, 200), chapa: texto(b?.chapa, 60), cargo: texto(b?.cargo, 200), setor: texto(b?.setor, 200),
    gestor: texto(b?.gestor, 200), gestor_telefone: texto(b?.gestor_telefone, 40), gestor_email: texto(b?.gestor_email, 200),
    telefone: texto(b?.telefone, 40), email: texto(b?.email, 200), admissao: dataValida(b?.admissao),
  };
  if (!p.nome) return { erro: 'Informe o nome do colaborador.' };
  if (!p.admissao) return { erro: `Informe a data de admissão de ${p.nome}.` };
  return { p };
}

function emTransacao(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Dados que o gestor e o colaborador veem (sem tokens de outras etapas). */
function publico(a, form) {
  return {
    periodo: a.periodo, vencimento: a.vencimento, prazo: a.prazo, status: a.status,
    pessoa: { nome: a.nome, chapa: a.chapa, cargo: a.cargo, setor: a.setor, gestor: a.gestor, admissao: a.admissao },
    respostas: a.respostas, classificacao: a.classificacao, decisao: a.decisao, prorrogar_dias: a.prorrogar_dias,
    comentario: a.comentario, gestor_nome: a.gestor_nome, respondido_em: a.respondido_em, ciencia_em: a.ciencia_em,
    form: { titulo: form.titulo, introducao: form.introducao, secoes: form.secoes },
    classificacoes: CLASSIFICACOES, decisoes: DECISOES,
  };
}

function registrar(app, { exigirAdmin, limitadorDeFalhas }) {
  const limite = limitadorDeFalhas({ maximo: 40, janelaMin: 15 });

  // ===== Gestor (link individual) =====
  app.get('/api/experiencia/:token', (req, res) => {
    const a = listarAvaliacoes('WHERE a.token_gestor = ?', [String(req.params.token)])[0];
    if (!a) return res.status(404).json({ erro: 'Link inválido ou expirado. Procure o time de RH.' });
    if (!a.aberto_em) db.prepare("UPDATE exp_avaliacoes SET aberto_em = datetime('now') WHERE id = ?").run(a.id);
    res.json(publico(a, formulario()));
  });

  app.post('/api/experiencia/:token', (req, res) => {
    if (limite.bloqueado(req)) return res.status(429).json({ erro: 'Muitos envios seguidos. Aguarde alguns minutos.' });
    const a = listarAvaliacoes('WHERE a.token_gestor = ?', [String(req.params.token)])[0];
    if (!a) return res.status(404).json({ erro: 'Link inválido ou expirado. Procure o time de RH.' });
    if (a.respondido_em) return res.status(409).json({ erro: 'Esta avaliação já foi enviada. Obrigado!' });
    if (a.status === 'dispensada') return res.status(409).json({ erro: 'Esta avaliação não é mais necessária. Procure o time de RH.' });
    const form = formulario();
    if (!form.ativa) return res.status(400).json({ erro: 'A avaliação de experiência não está recebendo respostas no momento.' });

    const lidas = lerRespostas(form, req.body?.respostas);
    if (lidas.erro) return res.status(400).json({ erro: lidas.erro });
    const b = req.body?.parecer || {};
    const classificacao = texto(b.classificacao, 200);
    const decisao = texto(b.decisao, 40);
    if (!CLASSIFICACOES.includes(classificacao)) return res.status(400).json({ erro: 'Escolha como o colaborador pode ser classificado.' });
    if (!DECISOES.includes(decisao)) return res.status(400).json({ erro: 'Escolha a decisão: efetivar, prorrogar ou rescindir.' });
    const dias = decisao === 'Prorrogar' ? Number(b.prorrogar_dias) : null;
    if (decisao === 'Prorrogar' && !(Number.isInteger(dias) && dias > 0 && dias <= 90)) return res.status(400).json({ erro: 'Informe por quantos dias o contrato será prorrogado (1 a 90).' });
    const gestorNome = texto(b.gestor_nome, 200);
    if (!gestorNome) return res.status(400).json({ erro: 'Informe seu nome para assinar a avaliação.' });
    const alerta = lidas.alerta || decisao === 'Rescindir' || classificacao === CLASSIFICACOES[2];

    emTransacao(() => {
      db.prepare(`UPDATE exp_avaliacoes SET respostas = ?, classificacao = ?, decisao = ?, prorrogar_dias = ?, comentario = ?, gestor_nome = ?,
        alerta = ?, respondido_em = datetime('now'), enviado_em = COALESCE(enviado_em, datetime('now')) WHERE id = ?`)
        .run(JSON.stringify(lidas.respostas), classificacao, decisao, dias, texto(b.comentario, 4000), gestorNome, alerta ? 1 : 0, a.id);
      // Prorrogação no 1º período: o 2º período passa a vencer "vencimento + dias".
      if (a.periodo === 1 && decisao === 'Prorrogar') {
        db.prepare('UPDATE exp_avaliacoes SET vencimento = ? WHERE pessoa_id = ? AND periodo = 2 AND respondido_em IS NULL')
          .run(somarDias(a.vencimento, dias), a.pessoa_id);
      }
    });
    limite.registrar(req);
    res.json({ ok: true });
  });

  // ===== Colaborador (ciência) =====
  app.get('/api/experiencia/ciencia/:token', (req, res) => {
    const a = listarAvaliacoes('WHERE a.token_ciencia = ?', [String(req.params.token)])[0];
    if (!a || !a.respondido_em) return res.status(404).json({ erro: 'Link inválido ou avaliação ainda não concluída. Procure o time de RH.' });
    res.json(publico(a, formulario()));
  });

  app.post('/api/experiencia/ciencia/:token', (req, res) => {
    const a = listarAvaliacoes('WHERE a.token_ciencia = ?', [String(req.params.token)])[0];
    if (!a || !a.respondido_em) return res.status(404).json({ erro: 'Link inválido ou avaliação ainda não concluída. Procure o time de RH.' });
    if (a.ciencia_em) return res.status(409).json({ erro: 'Sua ciência já foi registrada. Obrigado!' });
    const nome = texto(req.body?.nome, 200);
    if (!nome || req.body?.ciente !== true) return res.status(400).json({ erro: 'Marque a confirmação e digite seu nome completo.' });
    db.prepare("UPDATE exp_avaliacoes SET ciencia_em = datetime('now'), ciencia_nome = ?, ciencia_forma = 'link' WHERE id = ?").run(nome, a.id);
    res.json({ ok: true });
  });

  // ===== RH =====
  app.get('/api/admin/pessoas', exigirAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM pessoas ORDER BY nome').all());
  });

  app.post('/api/admin/pessoas', exigirAdmin, (req, res) => {
    const { p, erro } = lerPessoa(req.body);
    if (erro) return res.status(400).json({ erro });
    const id = emTransacao(() => {
      const r = db.prepare(`INSERT INTO pessoas (nome, chapa, cargo, setor, gestor, gestor_telefone, gestor_email, telefone, email, admissao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(p.nome, p.chapa, p.cargo, p.setor, p.gestor, p.gestor_telefone, p.gestor_email, p.telefone, p.email, p.admissao);
      sincronizarAvaliacoes(Number(r.lastInsertRowid), p.admissao);
      return Number(r.lastInsertRowid);
    });
    res.json({ id });
  });

  // Importação da planilha: atualiza quem já existe (mesma chapa, ou mesmo nome sem chapa) e cadastra os novos.
  app.post('/api/admin/pessoas/importar', exigirAdmin, (req, res) => {
    const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : [];
    const invalidas = [];
    let novos = 0, atualizados = 0;
    emTransacao(() => {
      linhas.forEach((l, i) => {
        const { p, erro } = lerPessoa(l);
        if (erro) return invalidas.push({ linha: i + 2, motivo: erro });
        const existente = p.chapa
          ? db.prepare('SELECT id FROM pessoas WHERE chapa = ?').get(p.chapa)
          : db.prepare("SELECT id FROM pessoas WHERE lower(nome) = lower(?) AND COALESCE(chapa, '') = ''").get(p.nome);
        if (existente) {
          db.prepare(`UPDATE pessoas SET nome = ?, cargo = ?, setor = ?, gestor = ?, gestor_telefone = ?, gestor_email = ?, telefone = ?, email = ?, admissao = ? WHERE id = ?`)
            .run(p.nome, p.cargo, p.setor, p.gestor, p.gestor_telefone, p.gestor_email, p.telefone, p.email, p.admissao, existente.id);
          sincronizarAvaliacoes(existente.id, p.admissao);
          atualizados += 1;
        } else {
          const r = db.prepare(`INSERT INTO pessoas (nome, chapa, cargo, setor, gestor, gestor_telefone, gestor_email, telefone, email, admissao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(p.nome, p.chapa, p.cargo, p.setor, p.gestor, p.gestor_telefone, p.gestor_email, p.telefone, p.email, p.admissao);
          sincronizarAvaliacoes(Number(r.lastInsertRowid), p.admissao);
          novos += 1;
        }
      });
    });
    res.json({ novos, atualizados, invalidas });
  });

  app.put('/api/admin/pessoas/:id', exigirAdmin, (req, res) => {
    const id = Number(req.params.id);
    const { p, erro } = lerPessoa(req.body);
    if (erro) return res.status(400).json({ erro });
    emTransacao(() => {
      db.prepare(`UPDATE pessoas SET nome = ?, chapa = ?, cargo = ?, setor = ?, gestor = ?, gestor_telefone = ?, gestor_email = ?, telefone = ?, email = ?, admissao = ? WHERE id = ?`)
        .run(p.nome, p.chapa, p.cargo, p.setor, p.gestor, p.gestor_telefone, p.gestor_email, p.telefone, p.email, p.admissao, id);
      sincronizarAvaliacoes(id, p.admissao);
    });
    res.json({ ok: true });
  });

  app.delete('/api/admin/pessoas/:id', exigirAdmin, (req, res) => {
    db.prepare('DELETE FROM pessoas WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  app.get('/api/admin/experiencia/avaliacoes', exigirAdmin, (_req, res) => res.json(listarAvaliacoes()));

  /** Ações do acompanhamento: marcar como enviada, ajustar vencimento, registrar ciência pelo RH ou reabrir. */
  app.patch('/api/admin/experiencia/avaliacoes/:id', exigirAdmin, (req, res) => {
    const a = db.prepare('SELECT * FROM exp_avaliacoes WHERE id = ?').get(Number(req.params.id));
    if (!a) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const acao = req.body?.acao;
    if (acao === 'enviada') db.prepare("UPDATE exp_avaliacoes SET enviado_em = COALESCE(enviado_em, datetime('now')) WHERE id = ?").run(a.id);
    else if (acao === 'vencimento') {
      const v = dataValida(req.body?.vencimento);
      if (!v) return res.status(400).json({ erro: 'Data de vencimento inválida.' });
      db.prepare('UPDATE exp_avaliacoes SET vencimento = ? WHERE id = ?').run(v, a.id);
    } else if (acao === 'ciencia_rh') {
      if (!a.respondido_em) return res.status(400).json({ erro: 'O gestor ainda não respondeu esta avaliação.' });
      db.prepare("UPDATE exp_avaliacoes SET ciencia_em = datetime('now'), ciencia_nome = ?, ciencia_forma = 'rh' WHERE id = ?")
        .run(texto(req.body?.nome, 200) || 'Registrada pelo RH', a.id);
    } else if (acao === 'reabrir') {
      db.prepare(`UPDATE exp_avaliacoes SET respostas = NULL, classificacao = NULL, decisao = NULL, prorrogar_dias = NULL, comentario = NULL,
        gestor_nome = NULL, alerta = 0, respondido_em = NULL, ciencia_em = NULL, ciencia_nome = NULL, ciencia_forma = NULL WHERE id = ?`).run(a.id);
    } else return res.status(400).json({ erro: 'Ação desconhecida.' });
    res.json({ ok: true });
  });

  app.get('/api/admin/experiencia/formulario', exigirAdmin, (_req, res) => res.json(formulario()));
  app.get('/api/admin/experiencia/formulario/padrao', exigirAdmin, (_req, res) => res.json(formularioPadrao()));

  app.put('/api/admin/experiencia/formulario', exigirAdmin, (req, res) => {
    const { form, erro } = lerFormulario(req.body);
    if (erro) return res.status(400).json({ erro });
    const b = req.body || {};
    const periodos = (Array.isArray(b.periodos) ? b.periodos : []).map(Number);
    if (periodos.length !== 2 || periodos.some(n => !Number.isInteger(n) || n < 1 || n > 180) || periodos[1] <= periodos[0]) {
      return res.status(400).json({ erro: 'Informe a duração dos dois períodos em dias (o 2º maior que o 1º).' });
    }
    const antecedencia = Number(b.antecedencia);
    if (!Number.isInteger(antecedencia) || antecedencia < 0 || antecedencia > 60) return res.status(400).json({ erro: 'Antecedência inválida (0 a 60 dias).' });
    const novo = {
      ...form,
      titulo: texto(b.titulo, 120) || 'Avaliação de Experiência',
      assunto: texto(b.assunto, 200) || 'Avaliação de experiência · {nome}',
      mensagem: texto(b.mensagem, 2000) || 'Olá, {gestor}! Responda a avaliação de experiência de {nome}: {link}',
      mensagem_ciencia: texto(b.mensagem_ciencia, 2000) || 'Olá, {nome}! Registre sua ciência da avaliação de experiência: {link}',
      periodos, antecedencia,
    };
    db.prepare('UPDATE configuracoes SET valor = ? WHERE chave = ?').run(JSON.stringify(novo), CHAVE_FORM);
    // Durações novas valem para as avaliações ainda não respondidas.
    emTransacao(() => { for (const p of db.prepare('SELECT id, admissao FROM pessoas').all()) sincronizarAvaliacoes(p.id, p.admissao); });
    res.json(novo);
  });

  app.get('/api/admin/experiencia/qrcode', exigirAdmin, async (req, res, next) => {
    const t = String(req.query.t || '');
    const tipo = req.query.tipo === 'ciencia' ? 'ciencia' : 'gestor';
    const a = db.prepare(`SELECT a.*, p.nome FROM exp_avaliacoes a JOIN pessoas p ON p.id = a.pessoa_id WHERE ${tipo === 'ciencia' ? 'token_ciencia' : 'token_gestor'} = ?`).get(t);
    if (!a) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const link = `${req.protocol}://${req.get('host')}/${tipo === 'ciencia' ? 'ciencia' : 'avaliacao'}.html?t=${t}`;
    try {
      const opcoes = { margin: 2, width: 600, color: { dark: '#0e3b5c', light: '#ffffff' } };
      if (req.query.formato === 'png') {
        res.setHeader('Content-Disposition', `attachment; filename="qrcode-experiencia-${a.id}-${tipo}.png"`);
        return res.type('image/png').send(await QRCode.toBuffer(link, opcoes));
      }
      res.json({ link, titulo: `${a.nome} · ${a.periodo}º período`, svg: await QRCode.toString(link, { ...opcoes, type: 'svg' }) });
    } catch (e) { next(e); }
  });
}

module.exports = { registrar };
