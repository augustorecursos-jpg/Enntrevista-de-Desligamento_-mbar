// Primeiras Conexões: avaliação dos primeiros 15 dias, respondida pelo próprio colaborador por link individual.
// Um convite por pessoa cadastrada; o RH envia a partir do 12º dia e acompanha respostas e indicadores.
const QRCode = require('qrcode');
const { db } = require('./db');
const { lerFormulario, lerRespostas, texto } = require('./desligamento');

const CHAVE_FORM = 'primeiras_conexoes';
// Escala de concordância, da melhor para a pior (os indicadores usam essa ordem); a página do colaborador mostra ao contrário.
const CONCORDANCIA = ['Concordo totalmente', 'Concordo', 'Neutro', 'Discordo', 'Discordo totalmente'];
const NOTA_ALERTA = 6; // nota da experiência até 6 pede atenção do RH

const CHAMADA = 'Sua chegada importa. Sua experiência transforma. Sua voz faz a diferença!';
const ABERTURA = [
  'Toda nova trajetória é feita de expectativas, descobertas, encontros e novas conexões. E sabemos que os primeiros passos em uma nova companhia representam muito mais do que o início de uma jornada profissional: são o começo de uma história que queremos construir junto com você.',
  'Na Âmbar Energia, acreditamos que acolher é mais do que receber. É fazer com que cada pessoa se sinta parte, reconhecida e valorizada desde o primeiro dia.',
  'Por isso, queremos ouvir você!',
  'O Primeiras Conexões é um espaço dedicado à sua voz, criado para compreender como você vivenciou sua chegada, o acolhimento das pessoas, a proximidade da liderança e cada etapa da sua integração.',
  'Mais do que conhecer sua percepção, queremos aprender com ela. Cada resposta tem valor e contribui diretamente para construirmos uma experiência cada vez mais humana, acolhedora e significativa para quem chega.',
  'Compartilhe suas percepções com sinceridade. Aqui, sua experiência importa, sua opinião tem valor e sua participação faz parte da nossa evolução.',
  'Porque, para nós, desenvolver pessoas começa pelo cuidado com cada uma delas.',
].join('\n\n');
const ASSINATURA = 'Âmbar Energia | A energia que te desenvolve.';

db.exec(`
  CREATE TABLE IF NOT EXISTS pc_convites (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa_id     INTEGER NOT NULL UNIQUE REFERENCES pessoas(id) ON DELETE CASCADE,
    token         TEXT NOT NULL UNIQUE,
    enviado_em    TEXT,                         -- RH enviou o link ao colaborador
    aberto_em     TEXT,                         -- colaborador abriu o link
    respostas     TEXT,                         -- JSON (mesmo formato das outras avaliações)
    alerta        INTEGER NOT NULL DEFAULT 0,   -- alguma discordância ou nota baixa
    respondido_em TEXT,
    dispensado_em TEXT,                         -- RH decidiu não aplicar (ex.: admitidos antes da ferramenta)
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** Formulário inicial, transcrito do documento "Avaliação Primeiras Conexões (15 dias)". */
function formularioPadrao() {
  let n = 0;
  const conexao = (titulo, subtitulo, objetivo, afirmacoes, aberta) => ({
    titulo, subtitulo, objetivo,
    perguntas: [
      { id: `c${++n}_afirmacoes`, tipo: 'grade', texto: 'Para cada afirmação, marque o quanto você concorda.', opcoes: CONCORDANCIA, itens: afirmacoes, obrigatoria: true, justificativa: false, outro: false },
      { id: `c${n}_aberta`, tipo: 'texto', texto: aberta, obrigatoria: false, justificativa: false, outro: false },
    ],
  });
  return {
    ativa: true,
    titulo: 'Primeiras Conexões',
    introducao: 'Suas respostas são confidenciais e lidas apenas pelo time de RH.',
    chamada: CHAMADA,
    abertura: ABERTURA,
    assinatura: ASSINATURA,
    assunto: 'Primeiras Conexões · sua chegada na Âmbar Energia',
    mensagem: 'Olá, {nome}! Seus primeiros dias na Âmbar Energia importam muito para nós. Queremos ouvir você no Primeiras Conexões: leva cerca de 7 minutos e suas respostas são lidas apenas pelo RH.\n\nResponda até {prazo} pelo link: {link}',
    dia_inicio: 12,
    dia_prazo: 15,
    secoes: [
      conexao('Pré-Onboarding', 'Antes da chegada', 'Avaliar a comunicação, a organização e o cuidado antes do primeiro dia de trabalho.', [
        'Recebi, com antecedência, as informações necessárias para o meu primeiro dia de trabalho.',
        'As orientações sobre documentação, horário, local de apresentação e demais procedimentos foram claras.',
        'Senti que a companhia estava preparada para me receber.',
      ], 'O que poderia ter tornado sua experiência antes do primeiro dia ainda melhor?'),
      conexao('Primeiro Dia', 'A experiência da chegada', 'Compreender a receptividade e a organização do primeiro contato presencial ou remoto.', [
        'Fui recebido(a) de forma acolhedora e respeitosa no meu primeiro dia.',
        'A programação do meu primeiro dia foi organizada e contribuiu para que eu me sentisse confortável.',
        'Recebi as orientações necessárias sobre os espaços, instalações, regras e rotinas da companhia.',
      ], 'Como você descreveria seu primeiro dia na Âmbar Energia?'),
      conexao('Acolhimento', 'Conexão com a equipe', 'Medir pertencimento, receptividade e integração com os colegas.', [
        'Fui apresentado(a) às pessoas com quem terei maior interação no dia a dia.',
        'Minha equipe demonstrou disponibilidade para me acolher e apoiar neste início.',
        'Sinto que estou sendo integrado(a) ao time e que posso contar com meus colegas quando preciso.',
      ], 'Houve alguma atitude ou experiência da equipe que fez diferença na sua chegada?'),
      conexao('Liderança', 'O papel do gestor', 'Avaliar o protagonismo da liderança no processo de integração.', [
        'Meu gestor me recebeu e dedicou tempo para conversar comigo sobre minha chegada.',
        'Recebi orientações claras sobre minhas responsabilidades, atividades e expectativas da função.',
        'Sinto abertura e segurança para esclarecer dúvidas e buscar apoio com meu gestor.',
        'Meu gestor tem acompanhado minha adaptação e demonstrado interesse pela minha integração.',
      ], 'O que seu gestor poderia fazer para contribuir ainda mais com sua adaptação?'),
      conexao('Estrutura e condições de trabalho', 'Seu ambiente e seus recursos', 'Identificar falhas operacionais que impactam a experiência e a produtividade inicial.', [
        'Encontrei meu ambiente de trabalho organizado e preparado para minha chegada.',
        'Recebi os equipamentos, materiais, uniformes e EPIs necessários para iniciar minhas atividades, conforme aplicável.',
        'Os acessos aos sistemas, ferramentas e recursos necessários foram disponibilizados em tempo adequado.',
        'Recebi orientações suficientes para utilizar os recursos necessários ao meu trabalho.',
      ], 'Existe algum equipamento, acesso, recurso ou orientação que ainda esteja pendente?'),
      conexao('Integração institucional', 'Conhecendo a companhia', 'Avaliar a efetividade dos conteúdos e da jornada de integração.', [
        'A integração me ajudou a compreender o negócio, a cultura e os valores da companhia.',
        'Os conteúdos apresentados foram claros, relevantes e adequados para este momento.',
        'Recebi orientações sobre segurança, conduta e procedimentos essenciais para minha atuação.',
        'Sei onde encontrar informações e a quem recorrer quando tenho dúvidas sobre processos internos.',
      ], 'Qual conteúdo ou orientação você considera importante aprofundarmos na integração?'),
      conexao('Pertencimento', 'Minhas primeiras percepções', 'Compreender a experiência emocional e a percepção geral do colaborador.', [
        'Sinto que minha chegada foi valorizada pela companhia.',
        'Minhas primeiras experiências estão alinhadas às expectativas que tinha antes de iniciar.',
        'Até o momento, sinto-me bem acolhido(a) e motivado(a) a construir minha trajetória na companhia.',
      ], 'O que mais contribuiu para que você se sentisse parte da companhia?'),
      {
        titulo: 'Avaliação geral da experiência', subtitulo: 'Sua experiência até aqui',
        objetivo: 'Nota geral da experiência (indicador executivo de onboarding) e recomendação da companhia (eNPS).',
        perguntas: [
          { id: 'nota_experiencia', tipo: 'nota', texto: 'De 0 a 10, como você avalia sua experiência nos primeiros 15 dias na Âmbar Energia?',
            extremos: ['Muito abaixo do esperado', 'Muito acima do esperado'], obrigatoria: true, justificativa: false, outro: false },
          { id: 'nota_recomendacao', tipo: 'nota', texto: 'De 0 a 10, o quanto você recomendaria a Âmbar Energia como um bom lugar para trabalhar?',
            extremos: ['Nada provável', 'Extremamente provável'], obrigatoria: true, justificativa: false, outro: false },
          { id: 'comentario_geral', tipo: 'texto', texto: 'Quer deixar mais algum comentário sobre sua chegada?', obrigatoria: false, justificativa: false, outro: false },
        ],
      },
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
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // horário de Brasília

/**
 * Garante um convite para cada pessoa cadastrada. Quem já passou de 45 dias de casa quando o convite é criado
 * (ex.: admitidos antes da ferramenta) entra como dispensado; o RH pode reativar.
 */
function garantirConvites() {
  db.prepare(`INSERT INTO pc_convites (pessoa_id, token, dispensado_em)
    SELECT p.id, lower(hex(randomblob(9))), CASE WHEN p.admissao < date('now', '-45 days') THEN datetime('now') END
    FROM pessoas p WHERE NOT EXISTS (SELECT 1 FROM pc_convites c WHERE c.pessoa_id = p.id)`).run();
}

/** Situação: em breve (antes do dia de envio) · a enviar · enviada · respondida · dispensada. */
function situacao(c) {
  if (c.respondido_em) return 'respondida';
  if (c.dispensado_em) return 'dispensada';
  if (c.enviado_em) return 'enviada';
  return hoje() < c.disponivel ? 'em_breve' : 'a_enviar';
}

function listar(where = '', params = []) {
  garantirConvites();
  const form = formulario();
  return db.prepare(`
    SELECT c.*, p.nome, p.chapa, p.cargo, p.setor, p.regional, p.gestor, p.telefone, p.email, p.admissao
    FROM pc_convites c JOIN pessoas p ON p.id = c.pessoa_id ${where} ORDER BY p.admissao, p.nome`).all(...params)
    .map(c => {
      const linha = {
        ...c,
        respostas: c.respostas ? JSON.parse(c.respostas) : [],
        disponivel: somarDias(c.admissao, (Number(form.dia_inicio) || 12) - 1),
        prazo: somarDias(c.admissao, (Number(form.dia_prazo) || 15) - 1),
      };
      return { ...linha, status: situacao(linha) };
    });
}

/** Discordância (metade "de baixo" da escala, sem contar o meio) ou nota da experiência baixa. */
function temAlerta(form, respostas) {
  const porId = new Map(respostas.map(r => [r.id, r]));
  for (const sec of form.secoes) {
    for (const p of sec.perguntas) {
      const r = porId.get(p.id);
      if (!r) continue;
      if (p.tipo === 'grade') {
        const corte = p.opcoes.length - Math.floor(p.opcoes.length / 2);
        if (Object.values(r.valor).some(v => p.opcoes.indexOf(v) >= corte)) return true;
      }
      if (p.id === 'nota_experiencia' && r.valor <= NOTA_ALERTA) return true;
    }
  }
  return false;
}

function registrar(app, { exigirAdmin, exigirMaster, limitadorDeFalhas }) {
  const limite = limitadorDeFalhas({ maximo: 40, janelaMin: 15 });
  const daRegional = (escopo, c) => !escopo || c?.regional === escopo;
  const publico = (form) => ({
    titulo: form.titulo, introducao: form.introducao, chamada: form.chamada, abertura: form.abertura, assinatura: form.assinatura, ativa: form.ativa, dia_prazo: form.dia_prazo,
    // O objetivo de cada conexão é para o RH: não vai para o colaborador.
    secoes: form.secoes.map(({ objetivo, ...s }) => s),
  });

  // ===== Colaborador =====
  app.get('/api/conexoes/previa', (_req, res) => res.json({ form: publico(formulario()), pessoa: null, previa: true }));

  app.get('/api/conexoes/:token', (req, res) => {
    const c = listar('WHERE c.token = ?', [String(req.params.token)])[0];
    if (!c) return res.status(404).json({ erro: 'Link inválido ou expirado. Procure o time de RH.' });
    if (!c.aberto_em) db.prepare("UPDATE pc_convites SET aberto_em = datetime('now') WHERE id = ?").run(c.id);
    res.json({
      form: publico(formulario()), status: c.status, respondido_em: c.respondido_em, prazo: c.prazo,
      pessoa: { nome: c.nome, admissao: c.admissao, cargo: c.cargo, setor: c.setor },
    });
  });

  app.post('/api/conexoes/:token', (req, res) => {
    if (limite.bloqueado(req)) return res.status(429).json({ erro: 'Muitos envios seguidos. Aguarde alguns minutos.' });
    const c = listar('WHERE c.token = ?', [String(req.params.token)])[0];
    if (!c) return res.status(404).json({ erro: 'Link inválido ou expirado. Procure o time de RH.' });
    if (c.respondido_em) return res.status(409).json({ erro: 'Suas respostas já foram registradas. Obrigado!' });
    const form = formulario();
    if (!form.ativa) return res.status(400).json({ erro: 'O Primeiras Conexões não está recebendo respostas no momento.' });
    const lidas = lerRespostas(form, req.body?.respostas);
    if (lidas.erro) return res.status(400).json({ erro: lidas.erro });
    db.prepare(`UPDATE pc_convites SET respostas = ?, alerta = ?, respondido_em = datetime('now'), dispensado_em = NULL,
      enviado_em = COALESCE(enviado_em, datetime('now')) WHERE id = ?`)
      .run(JSON.stringify(lidas.respostas), lidas.alerta || temAlerta(form, lidas.respostas) ? 1 : 0, c.id);
    limite.registrar(req);
    res.json({ ok: true });
  });

  // ===== RH =====
  app.get('/api/admin/conexoes', exigirAdmin, (req, res) => res.json(req.escopo ? listar('WHERE p.regional = ?', [req.escopo]) : listar()));

  /** Ações do acompanhamento: marcar como enviada, dispensar, reativar ou reabrir para nova resposta. */
  app.patch('/api/admin/conexoes/:id', exigirAdmin, (req, res) => {
    const c = listar('WHERE c.id = ?', [Number(req.params.id)])[0];
    if (!c || !daRegional(req.escopo, c)) return res.status(404).json({ erro: 'Convite não encontrado' });
    const acao = req.body?.acao;
    if (acao === 'enviada') db.prepare("UPDATE pc_convites SET enviado_em = COALESCE(enviado_em, datetime('now')) WHERE id = ?").run(c.id);
    else if (acao === 'dispensar') {
      if (c.respondido_em) return res.status(400).json({ erro: 'Este colaborador já respondeu.' });
      db.prepare("UPDATE pc_convites SET dispensado_em = datetime('now') WHERE id = ?").run(c.id);
    } else if (acao === 'reativar') db.prepare('UPDATE pc_convites SET dispensado_em = NULL WHERE id = ?').run(c.id);
    else if (acao === 'reabrir') db.prepare('UPDATE pc_convites SET respostas = NULL, alerta = 0, respondido_em = NULL WHERE id = ?').run(c.id);
    else return res.status(400).json({ erro: 'Ação desconhecida.' });
    res.json({ ok: true });
  });

  app.get('/api/admin/conexoes/formulario', exigirAdmin, (_req, res) => res.json(formulario()));
  app.get('/api/admin/conexoes/formulario/padrao', exigirAdmin, exigirMaster, (_req, res) => res.json(formularioPadrao()));

  app.put('/api/admin/conexoes/formulario', exigirAdmin, exigirMaster, (req, res) => {
    const { form, erro } = lerFormulario(req.body);
    if (erro) return res.status(400).json({ erro });
    const b = req.body || {};
    const diaInicio = Number(b.dia_inicio);
    const diaPrazo = Number(b.dia_prazo);
    if (!Number.isInteger(diaInicio) || !Number.isInteger(diaPrazo) || diaInicio < 1 || diaPrazo < diaInicio || diaPrazo > 90) {
      return res.status(400).json({ erro: 'Informe os dias de envio e de prazo (o prazo igual ou depois do envio, até 90 dias).' });
    }
    const novo = {
      ...form,
      titulo: texto(b.titulo, 120) || 'Primeiras Conexões',
      chamada: texto(b.chamada, 300) || CHAMADA,
      abertura: texto(b.abertura, 6000) || ABERTURA,
      assinatura: texto(b.assinatura, 200),
      assunto: texto(b.assunto, 200) || 'Primeiras Conexões',
      mensagem: texto(b.mensagem, 2000) || 'Olá, {nome}! Responda o Primeiras Conexões pelo link: {link}',
      dia_inicio: diaInicio, dia_prazo: diaPrazo,
    };
    db.prepare('UPDATE configuracoes SET valor = ? WHERE chave = ?').run(JSON.stringify(novo), CHAVE_FORM);
    res.json(novo);
  });

  app.get('/api/admin/conexoes/qrcode', exigirAdmin, async (req, res, next) => {
    const c = listar('WHERE c.token = ?', [String(req.query.t || '')])[0];
    if (!c || !daRegional(req.escopo, c)) return res.status(404).json({ erro: 'Convite não encontrado' });
    const link = `${req.protocol}://${req.get('host')}/conexoes.html?t=${c.token}`;
    try {
      const opcoes = { margin: 2, width: 600, color: { dark: '#0e3b5c', light: '#ffffff' } };
      if (req.query.formato === 'png') {
        res.setHeader('Content-Disposition', `attachment; filename="qrcode-primeiras-conexoes-${c.id}.png"`);
        return res.type('image/png').send(await QRCode.toBuffer(link, opcoes));
      }
      res.json({ link, titulo: c.nome, svg: await QRCode.toString(link, { ...opcoes, type: 'svg' }) });
    } catch (e) { next(e); }
  });
}

module.exports = { registrar };
