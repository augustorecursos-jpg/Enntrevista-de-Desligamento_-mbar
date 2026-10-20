// Jornada Âmbar · Âmbar Energia (RH / DHO)
// Servidor HTTP: avaliação de experiência, entrevista de desligamento, área do RH (senha) e arquivos estáticos.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const { db, DATA_DIR } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const PRODUCAO = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (PRODUCAO ? null : 'ambar-rh');

// Segredo para assinar os cookies de sessão (persistido para sobreviver a reinícios).
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');
const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  if (!fs.existsSync(SECRET_FILE)) fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('hex'));
  return fs.readFileSync(SECRET_FILE, 'utf8');
})();

if (!ADMIN_PASSWORD) {
  console.error('[erro] Em produção é obrigatório definir ADMIN_PASSWORD (senha da área do RH).');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[aviso] ADMIN_PASSWORD não definido — usando a senha padrão "ambar-rh". Defina antes de publicar.');
}

// ---------- sessão do RH (cookie assinado) ----------

function assinar(payload) {
  const corpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(corpo).digest('base64url');
  return `${corpo}.${sig}`;
}

function verificar(token) {
  if (!token) return null;
  const [corpo, sig] = token.split('.');
  if (!corpo || !sig) return null;
  const esperado = crypto.createHmac('sha256', SESSION_SECRET).update(corpo).digest('base64url');
  if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;
  const payload = JSON.parse(Buffer.from(corpo, 'base64url').toString());
  return payload.exp < Date.now() ? null : payload;
}

function lerCookies(req) {
  const out = {};
  for (const parte of (req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) out[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return out;
}

function exigirAdmin(req, res, next) {
  const s = verificar(lerCookies(req).sess_admin);
  if (!s || !s.admin) return res.status(401).json({ erro: 'Acesso restrito ao RH.' });
  next();
}

/** Limita tentativas por IP (login com senha errada e envios em sequência pelo link geral). */
function limitadorDeFalhas({ maximo, janelaMin }) {
  const falhas = new Map();
  setInterval(() => {
    const agora = Date.now();
    for (const [ip, r] of falhas) if (r.expira < agora) falhas.delete(ip);
  }, 60e3).unref();
  return {
    bloqueado(req) {
      const r = falhas.get(req.ip);
      return Boolean(r && r.expira > Date.now() && r.n >= maximo);
    },
    registrar(req) {
      const agora = Date.now();
      const r = falhas.get(req.ip);
      if (!r || r.expira < agora) falhas.set(req.ip, { n: 1, expira: agora + janelaMin * 60e3 });
      else r.n += 1;
    },
  };
}
const limiteAdmin = limitadorDeFalhas({ maximo: 10, janelaMin: 15 });

// ---------- app ----------

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // atrás do proxy HTTPS da hospedagem
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (PRODUCAO) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
});
app.use(express.json({ limit: '2mb' }));

app.get('/healthz', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ ok: true });
});

app.post('/api/admin/entrar', (req, res) => {
  if (limiteAdmin.bloqueado(req)) return res.status(429).json({ erro: 'Muitas tentativas seguidas. Aguarde alguns minutos.' });
  const a = Buffer.from(String(req.body?.senha || '')), b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    limiteAdmin.registrar(req);
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  res.cookie('sess_admin', assinar({ admin: true, exp: Date.now() + 8 * 3600e3 }), { httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600e3, secure: PRODUCAO });
  res.json({ ok: true });
});

app.post('/api/admin/sair', (_req, res) => {
  res.clearCookie('sess_admin');
  res.json({ ok: true });
});

app.get('/api/admin/sessao', exigirAdmin, (_req, res) => res.json({ ok: true }));

// Entrevista: formulário, convites, respostas e QR Code.
require('./desligamento').registrar(app, { exigirAdmin, limitadorDeFalhas });

// Avaliação de experiência: pessoas, avaliação do gestor, ciência do colaborador e QR Code.
require('./experiencia').registrar(app, { exigirAdmin, limitadorDeFalhas });

// Cópia completa do banco (formulário, convites e respostas).
app.get('/api/admin/backup', exigirAdmin, (_req, res) => {
  const arquivo = path.join(DATA_DIR, `backup-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${arquivo.replace(/'/g, "''")}'`);
  res.download(arquivo, `desligamento-backup-${new Date().toISOString().slice(0, 10)}.db`, () => fs.rm(arquivo, { force: true }, () => {}));
});

app.get('/', (_req, res) => res.redirect('/admin.html'));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 400).json({ erro: err.message || 'Erro inesperado' });
});

app.listen(PORT, () => console.log(`Jornada Âmbar rodando em http://localhost:${PORT}`));
