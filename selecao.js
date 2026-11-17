// Avaliação do processo seletivo: o gestor que requisitou a vaga avalia o Recrutamento e Seleção depois que a pessoa
// aprovada segue para a admissão. Uma avaliação por pessoa cadastrada (criada sozinha a partir da data de início) ou
// criada pelo RH para vagas fora da planilha. O RH envia o link (WhatsApp, e-mail com QR Code, link ou QR Code).
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { db } = require('./db');
const { lerFormulario, lerRespostas, texto, dataValida } = require('./desligamento');
const escopos = require('./escopo');

const CHAVE_FORM = 'avaliacao_selecao';
// Notas de 1 a 3, da melhor para a pior (os indicadores usam essa ordem).
const ESCALA = ['Muito satisfeito', 'Satisfeito', 'Insatisfeito'];
// Só entram sozinhas as pessoas admitidas a partir desta data (editável no formulário; vazio = todas).
const ADMISSAO_MINIMA = '2026-11-01';
const EMPRESAS = ['Âmbar Energia', 'Green Cargo', 'Fluxus', 'MGAS', 'Logás'];

db.exec(`
  CREATE TABLE IF NOT EXISTS rs_avaliacoes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    token         TEXT NOT NULL UNIQUE,
    pessoa_id     INTEGER UNIQUE REFERENCES pessoas(id) ON DELETE SET NULL,
    -- Dados da vaga: nas avaliações ligadas a uma pessoa, valem os do cadastro quando estes campos estão vazios.
    vaga          TEXT,
    candidato     TEXT,
    gestor        TEXT,
    gestor_email  TEXT,
    gestor_telefone TEXT,
    recrutador    TEXT,
    empresa       TEXT,
    regional      TEXT,
    usina         TEXT,
    admissao      TEXT,
    enviado_em    TEXT,                         -- RH enviou o link ao gestor
    lembrete_em   TEXT,                         -- RH reenviou como lembrete
    aberto_em     TEXT,
    respostas     TEXT,
    alerta        INTEGER NOT NULL DEFAULT 0,   -- alguma nota 1 (insatisfeito)
    respondido_em TEXT,
    dispensado_em TEXT,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** Formulário inicial, transcrito do modelo "Avaliação do Processo de Recrutamento e Seleção". */
function formularioPadrao() {
  const p = (id, tipo, textoP, extra = {}) => ({ id, tipo, texto: textoP, obrigatoria: true, justificativa: false, outro: false, ...extra });
  return {
    ativa: true,
    titulo: 'Avaliação do processo seletivo',
    introducao: 'Cada contratação é resultado de uma parceria. Conte como foi a atuação do time de Recrutamento e Seleção nesta vaga — leva cerca de 3 minutos.',
    assunto: 'Como foi a seleção para {vaga}? Sua percepção fortalece o nosso time',
    mensagem: 'Olá, {gestor}! O processo seletivo da vaga {vaga} foi concluído e {candidato} já está em admissão. Sua percepção fortalece o nosso time: avalie a atuação do Recrutamento e Seleção (cerca de 3 minutos) pelo link: {link}',
    mensagem_lembrete: 'Olá, {gestor}! Passando para lembrar da avaliação do processo seletivo da vaga {vaga}. Leva só 3 minutos e ajuda muito a melhorarmos as próximas seleções: {link}',
    dias_lembrete: 5,
    admissao_minima: ADMISSAO_MINIMA,
    secoes: [
      { titulo: 'Critérios de avaliação', subtitulo: 'Dê uma nota de 1 a 3 para cada critério: 1 Insatisfeito · 2 Satisfeito · 3 Muito satisfeito', perguntas: [
        p('criterios', 'grade', 'Critério de avaliação', { opcoes: ESCALA, itens: [
          'Compreensão do perfil e das necessidades da vaga pelo RH',
          'Alinhamento inicial realizado para definição do perfil da posição',
          'Qualidade e aderência dos candidatos apresentados',
          'Assertividade da triagem realizada pelo RH',
          'Agilidade na condução das etapas do processo seletivo',
          'Cumprimento dos prazos e alinhamentos estabelecidos',
          'Comunicação e atualização sobre o andamento do processo',
          'Disponibilidade e suporte do RH durante o processo',
          'Organização e condução geral do processo seletivo',
        ] }),
        p('satisfacao_geral', 'grade', 'Satisfação geral', { opcoes: ESCALA, itens: ['Satisfação geral com o processo de Recrutamento e Seleção'] }),
      ] },
      { titulo: 'Perguntas complementares', perguntas: [
        p('aderencia', 'unica', 'Os candidatos apresentados estavam aderentes ao perfil alinhado para a posição?', {
          opcoes: ['Totalmente aderentes', 'Em sua maioria aderentes', 'Parcialmente aderentes', 'Pouco aderentes', 'Não aderentes'] }),
        p('tempo', 'unica', 'Na sua percepção, o tempo para fechamento da vaga foi adequado?', {
          opcoes: ['Muito adequado', 'Adequado', 'Parcialmente adequado', 'Inadequado', 'Muito inadequado'] }),
        p('ponto_positivo', 'texto', 'O que você considera que foi o principal ponto positivo na condução deste processo?', { obrigatoria: false }),
        p('melhorias', 'texto', 'Em quais aspectos podemos melhorar nossos próximos processos de Recrutamento e Seleção?', { obrigatoria: false }),
        p('comentarios', 'texto', 'Há algum comentário, sugestão ou percepção adicional que gostaria de compartilhar?', { obrigatoria: false }),
      ] },
    ],
  };
}

db.prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)').run(CHAVE_FORM, JSON.stringify(formularioPadrao()));
function formulario() {
  const f = JSON.parse(db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get(CHAVE_FORM).valor);
  return { ...f, admissao_minima: f.admissao_minima ?? ADMISSAO_MINIMA, dias_lembrete: f.dias_lembrete ?? 5 };
}

const novoToken = () => crypto.randomBytes(9).toString('base64url');
const diasDesde = (s) => (s ? Math.floor((Date.now() - new Date(`${s.replace(' ', 'T')}Z`).getTime()) / 864e5) : null);

/** Cria a avaliação das pessoas admitidas a partir da data de início que ainda não têm uma. */
function garantirAvaliacoes() {
  const minima = formulario().admissao_minima || '0000-00-00';
  const faltam = db.prepare(`SELECT id FROM pessoas p WHERE p.admissao >= ? AND NOT EXISTS (SELECT 1 FROM rs_avaliacoes r WHERE r.pessoa_id = p.id)`).all(minima);
  const inserir = db.prepare('INSERT INTO rs_avaliacoes (token, pessoa_id) VALUES (?, ?)');
  for (const p of faltam) inserir.run(novoToken(), p.id);
}

// Avaliações com os dados da vaga já resolvidos (os da própria avaliação ou, vazios, os do cadastro da pessoa).
const CONSULTA = `SELECT * FROM (
  SELECT r.id, r.token, r.pessoa_id, r.enviado_em, r.lembrete_em, r.aberto_em, r.respostas, r.alerta, r.respondido_em, r.dispensado_em, r.criado_em,
    COALESCE(NULLIF(r.vaga, ''), p.cargo, '') AS vaga, COALESCE(NULLIF(r.candidato, ''), p.nome, '') AS candidato,
    COALESCE(NULLIF(r.gestor, ''), p.gestor, '') AS gestor, COALESCE(NULLIF(r.gestor_email, ''), p.gestor_email, '') AS gestor_email,
    COALESCE(NULLIF(r.gestor_telefone, ''), p.gestor_telefone, '') AS gestor_telefone, COALESCE(NULLIF(r.recrutador, ''), p.recrutador, '') AS recrutador,
    COALESCE(NULLIF(r.empresa, ''), p.empresa, '') AS empresa, COALESCE(NULLIF(r.regional, ''), p.regional, '') AS regional,
    COALESCE(NULLIF(r.usina, ''), p.usina, '') AS usina, COALESCE(NULLIF(r.admissao, ''), p.admissao, '') AS admissao, p.setor
  FROM rs_avaliacoes r LEFT JOIN pessoas p ON p.id = r.pessoa_id) x`;

/** Situação: a enviar · enviada (aguardando resposta) · respondida · dispensada. */
function situacao(a) {
  if (a.respondido_em) return 'respondida';
  if (a.dispensado_em) return 'dispensada';
  return a.enviado_em ? 'enviada' : 'a_enviar';
}

function listar(escopo, where = '', params = []) {
  garantirAvaliacoes();
  const form = formulario();
  const f = escopos.filtro(escopo);
  return db.prepare(`${CONSULTA} WHERE ${f.sql} ${where ? `AND ${where}` : ''} ORDER BY COALESCE(respondido_em, enviado_em, criado_em) DESC`).all(...f.params, ...params)
    .map(a => {
      const linha = { ...a, respostas: a.respostas ? JSON.parse(a.respostas) : [] };
      const status = situacao(linha);
      // Lembrete sugerido: enviada há N dias ou mais, sem resposta e sem lembrete ainda.
      const lembrar = status === 'enviada' && !a.lembrete_em && diasDesde(a.enviado_em) >= (Number(form.dias_lembrete) || 5);
      return { ...linha, status, lembrar };
    });
}

/** Alguma nota 1 (insatisfeito) nos critérios. */
const temAlerta = (respostas) => respostas.some(r => r.tipo === 'grade' && Object.values(r.valor).includes(ESCALA[ESCALA.length - 1]));

function lerVaga(b) {
  const v = {
    vaga: texto(b?.vaga, 200), candidato: texto(b?.candidato, 200), gestor: texto(b?.gestor, 200), gestor_email: texto(b?.gestor_email, 200),
    gestor_telefone: texto(b?.gestor_telefone, 40), recrutador: texto(b?.recrutador, 200), empresa: texto(b?.empresa, 100),
    regional: texto(b?.regional, 100), usina: texto(b?.usina, 100), admissao: dataValida(b?.admissao),
  };
  if (!v.vaga) return { erro: 'Informe a vaga.' };
  if (!v.gestor) return { erro: 'Informe o gestor que requisitou a vaga.' };
  return { v };
}

function registrar(app, { exigirAdmin, exigirMaster, limitadorDeFalhas }) {
  const limite = limitadorDeFalhas({ maximo: 40, janelaMin: 15 });
  const buscar = (escopo, id) => listar(escopo, 'id = ?', [id])[0];

  // ===== Gestor =====
  app.get('/api/selecao/previa', (_req, res) => {
    const form = formulario();
    res.json({ form: { titulo: form.titulo, introducao: form.introducao, secoes: form.secoes, ativa: form.ativa }, previa: true,
      vaga: { vaga: 'Técnico(a) de Operação', candidato: 'Nome da pessoa aprovada', gestor: 'Gestor(a)', regional: 'Regional', usina: 'Usina', recrutador: 'Recrutador(a)' } });
  });

  // QR Code público do link (usado na imagem do e-mail); o código já é o próprio acesso.
  app.get('/api/selecao/qr/:token.png', async (req, res, next) => {
    const a = db.prepare('SELECT token FROM rs_avaliacoes WHERE token = ?').get(String(req.params.token));
    if (!a) return res.status(404).end();
    try {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.type('image/png').send(await QRCode.toBuffer(`${req.protocol}://${req.get('host')}/selecao.html?t=${a.token}`,
        { margin: 1, width: 360, color: { dark: '#0e3b5c', light: '#ffffff' } }));
    } catch (e) { next(e); }
  });

  app.get('/api/selecao/:token', (req, res) => {
    const a = listar(null, 'token = ?', [String(req.params.token)])[0];
    if (!a) return res.status(404).json({ erro: 'Link inválido ou expirado. Procure o time de RH.' });
    if (!a.aberto_em) db.prepare("UPDATE rs_avaliacoes SET aberto_em = datetime('now') WHERE id = ?").run(a.id);
    const form = formulario();
    res.json({
      form: { titulo: form.titulo, introducao: form.introducao, secoes: form.secoes, ativa: form.ativa },
      vaga: { vaga: a.vaga, candidato: a.candidato, gestor: a.gestor, regional: a.regional, usina: a.usina, recrutador: a.recrutador, empresa: a.empresa },
      status: a.status, respondido_em: a.respondido_em,
    });
  });

  app.post('/api/selecao/:token', (req, res) => {
    if (limite.bloqueado(req)) return res.status(429).json({ erro: 'Muitos envios seguidos. Aguarde alguns minutos.' });
    const a = listar(null, 'token = ?', [String(req.params.token)])[0];
    if (!a) return res.status(404).json({ erro: 'Link inválido ou expirado. Procure o time de RH.' });
    if (a.respondido_em) return res.status(409).json({ erro: 'Esta avaliação já foi enviada. Obrigado!' });
    const form = formulario();
    if (!form.ativa) return res.status(400).json({ erro: 'A avaliação do processo seletivo não está recebendo respostas no momento.' });
    const lidas = lerRespostas(form, req.body?.respostas);
    if (lidas.erro) return res.status(400).json({ erro: lidas.erro });
    db.prepare(`UPDATE rs_avaliacoes SET respostas = ?, alerta = ?, respondido_em = datetime('now'), dispensado_em = NULL,
      enviado_em = COALESCE(enviado_em, datetime('now')) WHERE id = ?`).run(JSON.stringify(lidas.respostas), lidas.alerta || temAlerta(lidas.respostas) ? 1 : 0, a.id);
    limite.registrar(req);
    res.json({ ok: true });
  });

  // ===== RH =====
  app.get('/api/admin/selecao', exigirAdmin, (req, res) => res.json(listar(req.escopo)));

  // Avaliação criada pelo RH (vaga fora da planilha de admissões).
  app.post('/api/admin/selecao', exigirAdmin, (req, res) => {
    const { v, erro } = lerVaga(req.body);
    if (erro) return res.status(400).json({ erro });
    const foraDoEscopo = escopos.aplicar(req.escopo, v, req.usuario);
    if (foraDoEscopo) return res.status(400).json({ erro: foraDoEscopo });
    const token = novoToken();
    const r = db.prepare(`INSERT INTO rs_avaliacoes (token, vaga, candidato, gestor, gestor_email, gestor_telefone, recrutador, empresa, regional, usina, admissao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(token, v.vaga, v.candidato, v.gestor, v.gestor_email, v.gestor_telefone, v.recrutador, v.empresa, v.regional, v.usina, v.admissao);
    res.json({ id: Number(r.lastInsertRowid), token });
  });

  /** Ações: marcar como enviada, registrar lembrete, dispensar, reativar, reabrir ou excluir (só as criadas pelo RH). */
  app.patch('/api/admin/selecao/:id', exigirAdmin, (req, res) => {
    const a = buscar(req.escopo, Number(req.params.id));
    if (!a) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const acao = req.body?.acao;
    if (acao === 'enviada') db.prepare("UPDATE rs_avaliacoes SET enviado_em = COALESCE(enviado_em, datetime('now')) WHERE id = ?").run(a.id);
    else if (acao === 'lembrete') db.prepare("UPDATE rs_avaliacoes SET lembrete_em = COALESCE(lembrete_em, datetime('now')), enviado_em = COALESCE(enviado_em, datetime('now')) WHERE id = ?").run(a.id);
    else if (acao === 'dispensar') {
      if (a.respondido_em) return res.status(400).json({ erro: 'O gestor já respondeu.' });
      db.prepare("UPDATE rs_avaliacoes SET dispensado_em = datetime('now') WHERE id = ?").run(a.id);
    } else if (acao === 'reativar') db.prepare('UPDATE rs_avaliacoes SET dispensado_em = NULL WHERE id = ?').run(a.id);
    else if (acao === 'reabrir') db.prepare('UPDATE rs_avaliacoes SET respostas = NULL, alerta = 0, respondido_em = NULL WHERE id = ?').run(a.id);
    else if (acao === 'excluir') {
      if (a.pessoa_id) return res.status(400).json({ erro: 'Esta avaliação vem do cadastro da pessoa: use “Dispensar”.' });
      db.prepare('DELETE FROM rs_avaliacoes WHERE id = ?').run(a.id);
    } else return res.status(400).json({ erro: 'Ação desconhecida.' });
    res.json({ ok: true });
  });

  app.get('/api/admin/selecao/formulario', exigirAdmin, (_req, res) => res.json({ ...formulario(), empresas: EMPRESAS }));
  app.get('/api/admin/selecao/formulario/padrao', exigirAdmin, exigirMaster, (_req, res) => res.json(formularioPadrao()));

  app.put('/api/admin/selecao/formulario', exigirAdmin, exigirMaster, (req, res) => {
    const { form, erro } = lerFormulario(req.body);
    if (erro) return res.status(400).json({ erro });
    const b = req.body || {};
    const dias = Number(b.dias_lembrete);
    if (!Number.isInteger(dias) || dias < 1 || dias > 60) return res.status(400).json({ erro: 'Informe em quantos dias sugerir o lembrete (1 a 60).' });
    const novo = {
      ...form,
      titulo: texto(b.titulo, 120) || 'Avaliação do processo seletivo',
      assunto: texto(b.assunto, 200) || 'Avaliação do processo seletivo · {vaga}',
      mensagem: texto(b.mensagem, 2000) || 'Olá, {gestor}! Avalie o processo seletivo da vaga {vaga}: {link}',
      mensagem_lembrete: texto(b.mensagem_lembrete, 2000) || 'Olá, {gestor}! Lembrete da avaliação do processo seletivo da vaga {vaga}: {link}',
      dias_lembrete: dias, admissao_minima: dataValida(b.admissao_minima),
    };
    db.prepare('UPDATE configuracoes SET valor = ? WHERE chave = ?').run(JSON.stringify(novo), CHAVE_FORM);
    res.json({ ...novo, empresas: EMPRESAS });
  });

  app.get('/api/admin/selecao/qrcode', exigirAdmin, async (req, res, next) => {
    const a = listar(req.escopo, 'token = ?', [String(req.query.t || '')])[0];
    if (!a) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const link = `${req.protocol}://${req.get('host')}/selecao.html?t=${a.token}`;
    try {
      const opcoes = { margin: 2, width: 600, color: { dark: '#0e3b5c', light: '#ffffff' } };
      if (req.query.formato === 'png') {
        res.setHeader('Content-Disposition', `attachment; filename="qrcode-selecao-${a.id}.png"`);
        return res.type('image/png').send(await QRCode.toBuffer(link, opcoes));
      }
      res.json({ link, titulo: `${a.vaga} · gestor ${a.gestor}`, svg: await QRCode.toString(link, { ...opcoes, type: 'svg' }) });
    } catch (e) { next(e); }
  });
}

module.exports = { registrar };
