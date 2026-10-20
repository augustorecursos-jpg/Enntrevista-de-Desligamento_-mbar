// Gera o e-book "Guia do RH · Jornada Âmbar" (public/guia/guia-do-rh.pdf) com prints reais da plataforma.
// Sobe um servidor temporário com dados fictícios; o banco de produção não é tocado.
// Uso: node scripts/ebook/gerar-ebook.js   (requer o Playwright instalado)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execSync } = require('node:child_process');

const RAIZ = path.join(__dirname, '..', '..');
const PORTA = 3195;
const BASE = `http://localhost:${PORTA}`;
const SENHA_ADMIN = 'ebook-jornada';
const SAIDA_PDF = path.join(RAIZ, 'public', 'guia', 'guia-do-rh.pdf');

function playwright() {
  const tentativas = ['playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright'), '/opt/node-tools/node_modules/playwright'];
  for (const t of tentativas) { try { return require(t); } catch { /* próxima */ } }
  throw new Error('Playwright não encontrado. Instale com: npm i -g playwright');
}

async function aguardarServidor() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/healthz`)).ok) return; } catch { /* ainda subindo */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('O servidor temporário não respondeu.');
}

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ebook-jornada-'));
  const servidor = spawn(process.execPath, ['--no-warnings', 'server.js'], {
    cwd: RAIZ, env: { ...process.env, DATA_DIR: temp, PORT: String(PORTA), ADMIN_PASSWORD: SENHA_ADMIN, NODE_ENV: 'development' }, stdio: 'ignore',
  });
  try {
    await aguardarServidor();
    const dados = await require('./dados-ebook').popular(BASE, SENHA_ADMIN);
    const { chromium } = playwright();
    const capturas = path.join(temp, 'capturas');
    const mapa = await require('./capturar').capturar({ chromium, base: BASE, saida: capturas, dados });
    const html = path.join(capturas, 'ebook.html');
    fs.writeFileSync(html, require('./conteudo-ebook').montar(mapa, { imagens: path.join(RAIZ, 'public', 'img') }));

    const navegador = await chromium.launch();
    const page = await navegador.newPage();
    await page.goto(`file://${html}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(SAIDA_PDF), { recursive: true });
    await page.pdf({ path: SAIDA_PDF, format: 'A4', printBackground: true, preferCSSPageSize: true });
    await navegador.close();
    console.log(`E-book gerado em ${path.relative(RAIZ, SAIDA_PDF)} (prints em ${capturas})`);
  } finally {
    servidor.kill();
  }
})().catch(err => { console.error(err); process.exit(1); });
