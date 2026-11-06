// O que cada usuário da área do RH enxerga: o admin vê tudo (escopo nulo), o coordenador regional vê a própria
// regional ({ regional }) e o analista de RH vê as usinas que acompanha ({ usinas: [...] }).
const { db } = require('./db');

/** Usina de pessoas, convites e respostas da entrevista de desligamento (roda depois de criadas as tabelas). */
function migrar() {
  for (const tabela of ['pessoas', 'desligamento_convites', 'desligamento_respostas']) {
    if (!db.prepare(`PRAGMA table_info(${tabela})`).all().some(c => c.name === 'usina')) db.exec(`ALTER TABLE ${tabela} ADD COLUMN usina TEXT`);
  }
}

const norm = (s) => String(s ?? '').trim().toLowerCase();

/** Regional mais comum entre as pessoas já cadastradas na usina (ou '' se a usina ainda não tem ninguém). */
function regionalDaUsina(usina) {
  if (!usina) return '';
  return db.prepare(`SELECT regional FROM pessoas WHERE lower(trim(usina)) = ? AND COALESCE(regional, '') <> ''
    GROUP BY regional ORDER BY count(*) DESC LIMIT 1`).get(norm(usina))?.regional || '';
}

/** Escopo a partir do usuário logado. */
function escopoDe(usuario) {
  if (!usuario || usuario.papel === 'admin') return null;
  if (usuario.papel === 'analista') return { usinas: usuario.usinas || [] };
  return { regional: usuario.regional };
}

/** Trecho SQL + parâmetros para limitar uma consulta ao escopo (prefixo = alias da tabela, ex.: 'p.'). */
function filtro(escopo, prefixo = '') {
  if (!escopo) return { sql: '1 = 1', params: [] };
  if (escopo.usinas) {
    if (!escopo.usinas.length) return { sql: '1 = 0', params: [] };
    return { sql: `lower(trim(${prefixo}usina)) IN (${escopo.usinas.map(() => '?').join(', ')})`, params: escopo.usinas.map(norm) };
  }
  return { sql: `${prefixo}regional = ?`, params: [escopo.regional] };
}

/** A linha (com regional e usina) está no escopo de quem acessa? */
function permite(escopo, linha) {
  if (!escopo) return true;
  if (!linha) return false;
  if (escopo.usinas) return escopo.usinas.some(u => norm(u) === norm(linha.usina));
  return linha.regional === escopo.regional;
}

/**
 * Ajusta regional e usina de um registro novo ou editado ao escopo de quem grava: o coordenador grava sempre na
 * própria regional; o analista só em uma das suas usinas (com uma só, ela é usada quando vier em branco).
 * Devolve uma mensagem de erro ou null.
 */
function aplicar(escopo, obj, usuario) {
  if (!escopo) return null;
  if (escopo.usinas) {
    if (!obj.usina && escopo.usinas.length === 1) obj.usina = escopo.usinas[0];
    const certa = escopo.usinas.find(u => norm(u) === norm(obj.usina));
    if (!certa) return `Informe uma das suas usinas: ${escopo.usinas.join(', ')}.`;
    obj.usina = certa;
    // Regional: a que a usina já tem no cadastro; se ainda não tiver, a do analista.
    if (!obj.regional) obj.regional = regionalDaUsina(certa) || usuario?.regional || '';
    return null;
  }
  obj.regional = escopo.regional;
  return null;
}

/** Nome do que limita o acesso, para as mensagens de erro. */
const rotulo = (escopo) => (escopo?.usinas ? 'usina' : 'regional');

module.exports = { migrar, regionalDaUsina, escopoDe, filtro, permite, aplicar, rotulo };
