// Cadastro de usinas e filiais por regional: lista oficial usada no acesso dos analistas de RH (escolha múltipla),
// nos campos de usina e para descobrir a regional de uma usina. O admin cadastra, importa da planilha ou remove.
const { db } = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS filiais (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    regional  TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const texto = (v, max = 100) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const listar = () => db.prepare('SELECT id, nome, regional FROM filiais ORDER BY regional COLLATE NOCASE, nome COLLATE NOCASE').all();
const buscarPorNome = (nome) => db.prepare('SELECT id, nome, regional FROM filiais WHERE nome = ?').get(texto(nome));

/** Insere ou atualiza (pelo nome) uma filial. Devolve 'nova', 'atualizada' ou 'igual'. */
function gravar(nome, regional) {
  const atual = buscarPorNome(nome);
  if (!atual) {
    db.prepare('INSERT INTO filiais (nome, regional) VALUES (?, ?)').run(nome, regional);
    return 'nova';
  }
  if (atual.regional === regional && atual.nome === nome) return 'igual';
  db.prepare('UPDATE filiais SET nome = ?, regional = ? WHERE id = ?').run(nome, regional, atual.id);
  return 'atualizada';
}

function registrar(app, { exigirAdmin, exigirMaster }) {
  // Todos da área do RH leem a lista (para os campos de usina); o servidor limita ao que cada um enxerga.
  app.get('/api/admin/filiais', exigirAdmin, (req, res) => {
    const lista = listar();
    if (!req.escopo) return res.json(lista);
    if (req.escopo.usinas) {
      const minhas = new Set(req.escopo.usinas.map(u => u.toLowerCase()));
      return res.json(lista.filter(f => minhas.has(f.nome.toLowerCase())));
    }
    res.json(lista.filter(f => f.regional === req.escopo.regional));
  });

  app.post('/api/admin/filiais', exigirAdmin, exigirMaster, (req, res) => {
    const nome = texto(req.body?.nome);
    const regional = texto(req.body?.regional);
    if (!nome || !regional) return res.status(400).json({ erro: 'Informe a regional e o nome da usina / filial.' });
    if (buscarPorNome(nome)) return res.status(409).json({ erro: `“${nome}” já está cadastrada.` });
    gravar(nome, regional);
    res.json({ ok: true });
  });

  // Importação da planilha (REGIONAL + FILIAL/USINA): cadastra as novas e atualiza a regional das que já existem.
  app.post('/api/admin/filiais/importar', exigirAdmin, exigirMaster, (req, res) => {
    const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : [];
    const totais = { novas: 0, atualizadas: 0, iguais: 0 };
    const invalidas = [];
    db.exec('BEGIN');
    try {
      linhas.forEach((l, i) => {
        const nome = texto(l?.nome);
        const regional = texto(l?.regional);
        if (!nome || !regional) return invalidas.push({ linha: i + 2, motivo: 'Faltou a regional ou o nome da filial.' });
        const r = gravar(nome, regional);
        totais[r === 'nova' ? 'novas' : r === 'atualizada' ? 'atualizadas' : 'iguais'] += 1;
      });
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    res.json({ ...totais, invalidas });
  });

  app.put('/api/admin/filiais/:id', exigirAdmin, exigirMaster, (req, res) => {
    const nome = texto(req.body?.nome);
    const regional = texto(req.body?.regional);
    if (!nome || !regional) return res.status(400).json({ erro: 'Informe a regional e o nome da usina / filial.' });
    const outra = buscarPorNome(nome);
    if (outra && outra.id !== Number(req.params.id)) return res.status(409).json({ erro: `“${nome}” já está cadastrada.` });
    db.prepare('UPDATE filiais SET nome = ?, regional = ? WHERE id = ?').run(nome, regional, Number(req.params.id));
    res.json({ ok: true });
  });

  app.delete('/api/admin/filiais/:id', exigirAdmin, exigirMaster, (req, res) => {
    db.prepare('DELETE FROM filiais WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });
}

module.exports = { registrar, listar, buscarPorNome };
