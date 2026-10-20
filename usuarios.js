// Usuários da área do RH: o admin master (ADMIN_PASSWORD) cria administradores e coordenadores de RH regionais.
// Coordenadores enxergam somente as pessoas, avaliações e entrevistas da própria regional.
const crypto = require('node:crypto');
const { db } = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nome         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE COLLATE NOCASE,
    papel        TEXT NOT NULL DEFAULT 'regional',   -- 'admin' (vê tudo) ou 'regional'
    regional     TEXT,
    senha_hash   TEXT NOT NULL,
    trocar_senha INTEGER NOT NULL DEFAULT 1,         -- senha provisória: pede troca no primeiro acesso
    ativo        INTEGER NOT NULL DEFAULT 1,
    ultimo_acesso TEXT,
    criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const PAPEIS = ['admin', 'regional'];
const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);

function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  return `${sal}:${crypto.scryptSync(senha, sal, 64).toString('hex')}`;
}
function confere(senha, hash) {
  const [sal, h] = String(hash || '').split(':');
  if (!sal || !h) return false;
  const calc = crypto.scryptSync(String(senha), sal, 64);
  const esperado = Buffer.from(h, 'hex');
  return calc.length === esperado.length && crypto.timingSafeEqual(calc, esperado);
}
/** Senha provisória fácil de ditar: duas palavras e números (ex.: Sol-Trilha-4821). */
function senhaProvisoria() {
  const p = ['Sol', 'Rede', 'Usina', 'Trilha', 'Vento', 'Luz', 'Energia', 'Jornada', 'Ponte', 'Rumo', 'Brilho', 'Farol'];
  const a = p[crypto.randomInt(p.length)];
  let b = p[crypto.randomInt(p.length)];
  while (b === a) b = p[crypto.randomInt(p.length)];
  return `${a}-${b}-${crypto.randomInt(1000, 9999)}`;
}
const senhaValida = (s) => typeof s === 'string' && s.length >= 8;

/** Confere login e senha de um usuário cadastrado. Devolve o usuário ou null. */
function autenticar(email, senha) {
  const u = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(texto(email, 200));
  if (!u || !confere(senha, u.senha_hash)) return null;
  db.prepare("UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?").run(u.id);
  return u;
}
const buscar = (id) => db.prepare('SELECT * FROM usuarios WHERE id = ? AND ativo = 1').get(id);
const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, regional: u.regional || '', trocar_senha: Boolean(u.trocar_senha),
  ativo: Boolean(u.ativo), ultimo_acesso: u.ultimo_acesso, criado_em: u.criado_em });

function ler(b, novo) {
  const u = { nome: texto(b?.nome), email: texto(b?.email).toLowerCase(), papel: PAPEIS.includes(b?.papel) ? b.papel : 'regional', regional: texto(b?.regional, 100) };
  if (!u.nome) return { erro: 'Informe o nome.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) return { erro: 'Informe um e-mail válido (é o login do usuário).' };
  if (u.papel === 'regional' && !u.regional) return { erro: 'Informe a regional do coordenador.' };
  if (u.papel === 'admin') u.regional = '';
  if (novo && b?.senha && !senhaValida(b.senha)) return { erro: 'A senha precisa ter pelo menos 8 caracteres.' };
  return { u };
}

function registrar(app, { exigirAdmin, exigirMaster }) {
  app.get('/api/admin/usuarios', exigirAdmin, exigirMaster, (_req, res) => {
    res.json(db.prepare('SELECT * FROM usuarios ORDER BY ativo DESC, papel, regional, nome').all().map(publico));
  });

  app.post('/api/admin/usuarios', exigirAdmin, exigirMaster, (req, res) => {
    const { u, erro } = ler(req.body, true);
    if (erro) return res.status(400).json({ erro });
    if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(u.email)) return res.status(409).json({ erro: 'Já existe um usuário com esse e-mail.' });
    const senha = req.body?.senha || senhaProvisoria();
    const r = db.prepare('INSERT INTO usuarios (nome, email, papel, regional, senha_hash, trocar_senha) VALUES (?, ?, ?, ?, ?, 1)')
      .run(u.nome, u.email, u.papel, u.regional, hashSenha(senha));
    res.json({ id: Number(r.lastInsertRowid), senha });
  });

  app.put('/api/admin/usuarios/:id', exigirAdmin, exigirMaster, (req, res) => {
    const id = Number(req.params.id);
    const { u, erro } = ler(req.body, false);
    if (erro) return res.status(400).json({ erro });
    if (db.prepare('SELECT 1 FROM usuarios WHERE email = ? AND id <> ?').get(u.email, id)) return res.status(409).json({ erro: 'Já existe um usuário com esse e-mail.' });
    db.prepare('UPDATE usuarios SET nome = ?, email = ?, papel = ?, regional = ? WHERE id = ?').run(u.nome, u.email, u.papel, u.regional, id);
    res.json({ ok: true });
  });

  // Ações: redefinir senha (gera provisória), ativar ou desativar.
  app.patch('/api/admin/usuarios/:id', exigirAdmin, exigirMaster, (req, res) => {
    const id = Number(req.params.id);
    const atual = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Usuário não encontrado' });
    if (req.body?.acao === 'redefinir') {
      const senha = senhaProvisoria();
      db.prepare('UPDATE usuarios SET senha_hash = ?, trocar_senha = 1 WHERE id = ?').run(hashSenha(senha), id);
      return res.json({ senha });
    }
    if (req.body?.acao === 'ativo') {
      if (atual.id === req.usuario.id) return res.status(400).json({ erro: 'Você não pode desativar o próprio acesso.' });
      db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(req.body.ativo ? 1 : 0, id);
      return res.json({ ok: true });
    }
    res.status(400).json({ erro: 'Ação desconhecida.' });
  });

  app.delete('/api/admin/usuarios/:id', exigirAdmin, exigirMaster, (req, res) => {
    if (Number(req.params.id) === req.usuario.id) return res.status(400).json({ erro: 'Você não pode excluir o próprio acesso.' });
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  // Qualquer usuário cadastrado troca a própria senha (o master usa ADMIN_PASSWORD, definida na hospedagem).
  app.post('/api/admin/minha-senha', exigirAdmin, (req, res) => {
    if (!req.usuario.id) return res.status(400).json({ erro: 'A senha do admin master é definida na hospedagem (ADMIN_PASSWORD).' });
    const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (!confere(req.body?.atual, u.senha_hash)) return res.status(400).json({ erro: 'A senha atual não confere.' });
    if (!senhaValida(req.body?.nova)) return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 8 caracteres.' });
    if (req.body.nova === req.body.atual) return res.status(400).json({ erro: 'A nova senha precisa ser diferente da atual.' });
    db.prepare('UPDATE usuarios SET senha_hash = ?, trocar_senha = 0 WHERE id = ?').run(hashSenha(req.body.nova), u.id);
    res.json({ ok: true });
  });
}

module.exports = { registrar, autenticar, buscar };
