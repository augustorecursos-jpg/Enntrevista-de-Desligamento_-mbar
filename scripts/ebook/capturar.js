// Prints reais da Jornada Âmbar para o e-book, com marcações numeradas (posições em % de cada imagem).
const path = require('node:path');
const fs = require('node:fs');

async function capturar({ chromium, base, saida, dados }) {
  fs.mkdirSync(saida, { recursive: true });
  const mapa = {};
  const navegador = await chromium.launch();
  const espera = (ms) => new Promise(r => setTimeout(r, ms));

  /** Fotografa a tela (ou um elemento) e calcula as caixas das marcações. */
  async function foto(page, nome, { marcas = [], elemento = null, fullPage = false } = {}) {
    await page.evaluate(() => document.fonts.ready);
    await espera(250);
    const arquivo = path.join(saida, `${nome}.png`);
    let area;
    if (elemento) {
      const el = page.locator(elemento).first();
      await el.scrollIntoViewIfNeeded();
      await espera(150);
      area = await el.boundingBox();
      await el.screenshot({ path: arquivo });
    } else {
      const vp = page.viewportSize();
      const alt = fullPage ? await page.evaluate(() => document.documentElement.scrollHeight) : vp.height;
      area = { x: 0, y: fullPage ? 0 : 0, width: vp.width, height: alt };
      await page.screenshot({ path: arquivo, fullPage });
    }
    const caixas = [];
    for (const [n, seletor] of marcas) {
      const b = await page.locator(seletor).first().boundingBox();
      if (!b) continue;
      const rolagem = fullPage ? await page.evaluate(() => window.scrollY) : 0;
      caixas.push({ n, x: ((b.x - area.x) / area.width) * 100, y: ((b.y + rolagem - area.y) / area.height) * 100,
        w: (b.width / area.width) * 100, h: (b.height / area.height) * 100 });
    }
    mapa[nome] = { arquivo, proporcao: `${area.width} / ${area.height}`, marcas: caixas };
  }

  async function contexto(opcoes = {}) {
    return navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, ...opcoes });
  }
  async function entrar(page, usuario, senha) {
    await page.goto(`${base}/admin.html`);
    await page.fill('#usuario', usuario);
    await page.fill('#senha', senha);
    await page.click('.jl-entrar');
  }

  // ---------- Login e primeiro acesso ----------
  let ctx = await contexto();
  let page = await ctx.newPage();
  await page.goto(`${base}/admin.html`);
  await espera(3000);
  await page.fill('#usuario', 'juliana.prado@exemplo.com');
  await foto(page, 'login', { marcas: [[1, '#usuario'], [2, '#senha'], [3, '#jl-ver'], [4, '.jl-entrar']] });
  await page.fill('#senha', dados.senhaCoordenadora);
  await page.click('.jl-entrar');
  await page.waitForSelector('#modal-conta[open]');
  await espera(400);
  await foto(page, 'primeiro-acesso', { elemento: '#modal-conta', marcas: [[1, '#conta-aviso'], [2, '#form-conta [name=nova]'], [3, '#conta-salvar']] });
  await page.fill('#form-conta [name=atual]', dados.senhaCoordenadora);
  await page.fill('#form-conta [name=nova]', 'Coordenadora2026!');
  await page.fill('#form-conta [name=repete]', 'Coordenadora2026!');
  await page.click('#conta-salvar');
  await espera(500);
  await page.click('.lateral [data-view=inicio]');
  await espera(500);
  await foto(page, 'coordenadora', { marcas: [[1, '.lateral'], [2, '#ja-eu']] });
  await ctx.close();

  // ---------- Admin ----------
  ctx = await contexto({ viewport: { width: 1440, height: 1000 } });
  page = await ctx.newPage();
  await entrar(page, 'admin', dados.senhaAdmin);
  await page.waitForSelector('[data-view-painel="inicio"]:not([hidden])');
  await espera(600);
  await foto(page, 'inicio', { marcas: [[1, '.ja-exp'], [2, '.ja-dsl'], [3, '#ja-agenda .ja-item'], [4, '#ja-eu']] });

  await page.click('.lateral [data-view=pessoas]');
  await espera(500);
  await foto(page, 'pessoas', { marcas: [[1, '[data-view-painel=pessoas] .ind-cab [data-nova-pessoa]'], [2, '#pes-arquivo'], [3, '#pes-modelo'], [4, '#pes-tabela [data-ficha]']] });
  await page.click('#pes-tabela [data-ficha]');
  await page.waitForSelector('#modal-ficha[open]');
  await espera(400);
  await foto(page, 'ficha', { elemento: '#modal-ficha', marcas: [[1, '#ficha-corpo .tl-etapa:nth-child(2)'], [2, '#ficha-corpo .acoes-envio'], [3, '#ficha-corpo [data-iniciar-dsl]']] });
  await page.click('#modal-ficha [data-fechar]');
  await page.click('[data-view-painel=pessoas] .ind-cab [data-nova-pessoa]');
  await page.waitForSelector('#modal-pessoa[open]');
  await espera(300);
  await foto(page, 'nova-pessoa', { elemento: '#modal-pessoa' });
  await page.click('#modal-pessoa [data-fechar]');

  await page.click('.lateral [data-view=exp-acompanhar]');
  await espera(600);
  await foto(page, 'quadro', { marcas: [[1, '.kb-a_enviar > header'], [2, '.kb-a_enviar .btn-whats'], [3, '.kb-aguardando_ciencia > header'], [4, '.kb-concluida .kb-ver']] });
  await page.click('.kb-concluida .kb-ver');
  await page.waitForSelector('#modal-xp[open]');
  await espera(400);
  await foto(page, 'ver-avaliacao', { elemento: '#modal-xp', marcas: [[1, '#modal-xp .det-ident'], [2, '#xp-imprimir']] });
  await page.click('#modal-xp [data-fechar]');

  await page.click('.lateral [data-view=exp-indicadores]');
  await espera(700);
  await foto(page, 'xp-indicadores', { marcas: [[1, '#xi-kpis'], [2, '#xi-valores'], [3, '#xi-competencias'], [4, '#xi-exportar']] });
  await page.click('.lateral [data-view=exp-formulario]');
  await espera(500);
  await foto(page, 'xp-formulario', { marcas: [[1, '#xf-orientacao'], [2, '#xf-p1'], [3, '#xf-secoes .q-edit'], [4, '.barra-salvar']] });

  await page.click('.lateral [data-sub=enviar]');
  await espera(600);
  await foto(page, 'dsl-enviar', { marcas: [[1, '.compartilhar'], [2, '#dsl-form-convite [name=nome]'], [3, '#dsl-convites .acoes-envio'], [4, '#dsl-filtro-status']] });
  await page.click('.lateral [data-sub=indicadores]');
  await espera(700);
  await foto(page, 'dsl-indicadores', { marcas: [[1, '#dsl-kpis'], [2, '#dsl-g-motivos'], [3, '#dsl-g-fatores'], [4, '[data-sub-painel=indicadores] [data-exportar-dsl]']] });
  await page.click('.lateral [data-sub=respostas]');
  await espera(500);
  await foto(page, 'dsl-respostas', { marcas: [[1, '#dsl-busca-respostas'], [2, '#dsl-respostas [data-ver-resp]'], [3, '[data-sub-painel=respostas] [data-exportar-dsl]']] });

  await page.click('.lateral [data-view=usuarios]');
  await espera(500);
  await page.fill('#us-form [name=nome]', 'Roberto Lima');
  await page.fill('#us-form [name=email]', 'roberto.lima@exemplo.com');
  await page.fill('#us-form [name=regional]', 'Sudeste');
  await page.click('#us-salvar');
  await page.waitForSelector('.us-cred');
  await espera(500);
  await foto(page, 'usuarios', { fullPage: true, marcas: [[1, '#us-form [name=papel]'], [2, '.us-cred'], [3, '.us-regionais'], [4, '#us-tabela [data-us-senha]']] });
  await ctx.close();

  // ---------- Gestor ----------
  ctx = await contexto();
  page = await ctx.newPage();
  await page.goto(`${base}/avaliacao.html?t=${dados.tokenGestor}`);
  await page.waitForSelector('.xp-bv');
  await espera(2000);
  await foto(page, 'gestor-abertura', { marcas: [[1, '.xp-bv-lead'], [2, '.xp-bv-ler'], [3, '.xp-bv-ficha'], [4, '[data-comecar]']] });
  await page.click('[data-comecar]');
  await page.waitForSelector('#xp-form');
  for (const q of await page.locator('.xp-bloco .xp-q').all()) {
    const linhas = q.locator('.xp-grade-linha');
    if (await linhas.count()) { let k = 0; for (const l of await linhas.all()) await l.locator('.xp-op').nth(k++ === 4 ? 1 : 0).click(); }
    else await q.locator('.xp-op').first().click();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await espera(300);
  await foto(page, 'gestor-form', { marcas: [[1, '.xp-ficha'], [2, '.xp-resumo'], [3, '.xp-bloco']] });
  await page.locator('.xp-parecer .xp-op').first().click();
  await page.locator('.xp-decisoes .xp-op').nth(1).click();
  await page.fill('[name=prorrogar_dias]', '45');
  await page.fill('[name=comentario]', 'Boa adaptação; combinamos foco em autonomia nas rotinas do setor.');
  await page.click('.xp-acordo');
  await page.mouse.move(0, 0);
  await espera(400);
  await foto(page, 'gestor-parecer', { elemento: '.xp-parecer', marcas: [[1, '[data-parecer=classificacao]'], [2, '[data-parecer=decisao]'], [3, '.xp-acordo'], [4, '.xp-parecer .xp-enviar']] });
  await ctx.close();

  // ---------- Celular: ciência e entrevista de desligamento ----------
  ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  await page.goto(`${base}/ciencia.html?t=${dados.tokenCiencia}`);
  await page.waitForSelector('#xp-ciente');
  await foto(page, 'ciencia-celular');
  await page.locator('#xp-ciente').scrollIntoViewIfNeeded();
  await page.check('[name=ciente]');
  await espera(300);
  await foto(page, 'ciencia-celular-fim');
  await page.goto(`${base}/desligamento.html?c=${dados.tokenDesligamento}`);
  await page.waitForSelector('.cv-boas.ativa');
  await espera(1500);
  await foto(page, 'dsl-celular');
  await ctx.close();

  ctx = await contexto();
  page = await ctx.newPage();
  await page.goto(`${base}/desligamento.html?c=${dados.tokenDesligamento}`);
  await page.waitForSelector('.cv-boas.ativa');
  await espera(1800);
  await foto(page, 'dsl-abertura');
  await page.click('[data-ir="1"]');
  await espera(500);
  await page.click('#cv-avancar');
  await espera(700);
  await page.locator('.cv-etapa.ativa .cv-q').first().locator('.cv-op').first().click();
  await espera(300);
  await foto(page, 'dsl-secao', { marcas: [[1, '.cv-mapa'], [2, '.cv-anel'], [3, '#cv-avancar']] });
  await ctx.close();

  await navegador.close();
  return mapa;
}

module.exports = { capturar };
