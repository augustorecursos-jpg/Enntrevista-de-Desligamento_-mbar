// Texto e diagramação do e-book "Guia do RH · Jornada Âmbar" (A4, retrato). Os prints vêm de capturar.js.
const path = require('node:path');

const ENDERECO = 'sua-jornada.onrender.com';

function montar(mapa, { imagens }) {
  const arq = (p) => `file://${p}`;

  const print = (nome, { moldura = 'navegador', classe = '' } = {}) => {
    const p = mapa[nome];
    if (!p) return '';
    const marcas = p.marcas.map(m => `
      <span class="caixa" style="left:${m.x}%;top:${m.y}%;width:${m.w}%;height:${m.h}%"></span>
      <b class="num" style="left:${m.x}%;top:${m.y}%">${m.n}</b>`).join('');
    const img = `<div class="print-img" style="aspect-ratio:${p.proporcao}"><img src="${arq(p.arquivo)}" alt="">${marcas}</div>`;
    if (moldura === 'navegador') return `<figure class="print navegador ${classe}"><div class="barra-nav"><i></i><i></i><i></i><span>${ENDERECO}</span></div>${img}</figure>`;
    if (moldura === 'celular') return `<figure class="print celular ${classe}">${img}</figure>`;
    return `<figure class="print solto ${classe}">${img}</figure>`;
  };
  const legenda = (itens) => `<ol class="legenda">${itens.map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('')}</ol>`;
  const dica = (t, ic = '💡') => `<p class="dica"><span>${ic}</span><span>${t}</span></p>`;

  let num = 0;
  const pagina = (conteudo, { classe = '', capitulo, titulo, kicker } = {}) => {
    num++;
    const especial = classe.includes('capa') || classe.includes('contracapa');
    return `
    <section class="pagina ${classe}">
      ${especial ? '' : `<div class="topo-pag"><span>GUIA DO RH · JORNADA ÂMBAR</span><span class="logo-mini"><b>Âmbar</b> ENERGIA</span></div>`}
      ${titulo ? `<header class="cab">${capitulo ? `<span class="cap-num">${capitulo}</span>` : ''}<div><small>${kicker || ''}</small><h2>${titulo}</h2></div></header>` : ''}
      <div class="corpo">${conteudo}</div>
      ${especial ? '' : `<div class="rodape-pag"><span>Jornada Âmbar · Cuidando de cada etapa</span><b>${num}</b></div>`}
    </section>`;
  };

  const paginas = [
    // Capa
    pagina(`
      <div class="capa-sol"><i></i><i></i><i></i><i></i></div>
      <span class="logo claro"><b>Âmbar</b><small>ENERGIA</small></span>
      <div class="capa-txt">
        <p class="capa-kick"><img src="${arq(path.join(imagens, 'favicon-jornada.svg'))}" alt=""> JORNADA ÂMBAR</p>
        <h1>Guia do RH</h1>
        <p class="capa-sub">Avaliação de Experiência e Entrevista de Desligamento,<br>passo a passo, para administradores e coordenadores de RH regionais.</p>
      </div>
      <svg class="capa-caminho" viewBox="0 0 600 300" fill="none"><path d="M10 260C140 260 150 150 300 150S470 40 590 40" stroke="#ec6b24" stroke-width="5" stroke-linecap="round"/>
        <circle cx="89" cy="243" r="14" fill="#0e3b5c" stroke="#f39a4a" stroke-width="3"/><circle cx="300" cy="150" r="14" fill="#0e3b5c" stroke="#f39a4a" stroke-width="3"/><circle cx="528" cy="51" r="14" fill="#0e3b5c" stroke="#f39a4a" stroke-width="3"/>
        <text x="118" y="250" class="capa-rot">Chegada</text><text x="300" y="192" text-anchor="middle" class="capa-rot">Crescimento</text><text x="528" y="93" text-anchor="middle" class="capa-rot">Despedida</text></svg>
      <p class="capa-rodape">Recursos Humanos · DHO · Edição ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>`, { classe: 'capa' }),

    // Boas-vindas + sumário
    pagina(`
      <p class="lead">A <strong>Jornada Âmbar</strong> reúne, em um só lugar, os processos que acompanham a vida profissional de quem faz a Âmbar acontecer.
        Hoje ela cuida de dois momentos importantes: a <strong>chegada</strong> (Avaliação de Experiência) e a <strong>despedida</strong> (Entrevista de Desligamento).</p>
      <div class="dois">
        <div class="cartao-guia laranja"><h3>🌱 Avaliação de Experiência</h3><p>O <strong>gestor</strong> avalia o colaborador no 1º e no 2º período do contrato de experiência.
          O <strong>colaborador</strong> registra a ciência. O RH acompanha prazos, decisões (Efetivar · Prorrogar · Rescindir) e indicadores.</p></div>
        <div class="cartao-guia marinho"><h3>🚪 Entrevista de Desligamento</h3><p>Quem está saindo conta, de forma confidencial, como foi a experiência na empresa.
          O RH envia o convite, acompanha as respostas e transforma tudo em indicadores.</p></div>
      </div>
      <h3 class="sub">Neste guia</h3>
      <ol class="sumario">
        <li><b>01</b> Acesso, perfis e primeiro acesso</li>
        <li><b>02</b> Tela inicial: o que vamos fazer hoje?</li>
        <li><b>03</b> Pessoas: cadastro, planilha e ficha</li>
        <li><b>04</b> Avaliação de Experiência: o fluxo completo</li>
        <li><b>05</b> O que o gestor e o colaborador veem</li>
        <li><b>06</b> Indicadores, Excel e formulário da experiência</li>
        <li><b>07</b> Entrevista de Desligamento: enviar, acompanhar e analisar</li>
        <li><b>08</b> Usuários e acessos (administradores)</li>
        <li><b>09</b> Boas práticas e dúvidas frequentes</li>
      </ol>
      ${dica('Os prints deste guia usam dados fictícios. Os números em laranja nas imagens correspondem às explicações ao lado ou logo abaixo.')}`,
    { titulo: 'Boas-vindas à Jornada Âmbar', kicker: 'ANTES DE COMEÇAR' }),

    // 01 Acesso
    pagina(`
      <p>Acesse o endereço da Jornada no navegador do computador ou do celular. Cada pessoa do RH tem o próprio login, criado pelo administrador.</p>
      ${print('login')}
      ${legenda([[1, '<strong>E-mail</strong>: o seu e-mail é o seu login. O administrador master usa <strong>admin</strong>.'],
        [2, '<strong>Senha</strong>: no primeiro acesso, use a senha provisória que você recebeu.'],
        [3, 'O olho mostra ou esconde a senha digitada. Se o Caps Lock estiver ligado, a tela avisa.'],
        [4, '<strong>Entrar na Jornada</strong>. Se algo estiver errado, a mensagem aparece na própria tela.']])}`,
    { capitulo: '01', titulo: 'Como entrar', kicker: 'ACESSO, PERFIS E PRIMEIRO ACESSO' }),

    pagina(`
      <div class="dois alinhado">
        <div>${print('primeiro-acesso', { moldura: 'solto' })}</div>
        <div>
          <h3 class="sub">Primeiro acesso</h3>
          <p>Ao entrar com a senha provisória, a Jornada pede que você crie uma senha só sua.</p>
          ${legenda([[1, 'Aviso de primeiro acesso.'], [2, 'Nova senha com pelo menos 8 caracteres (repita no campo ao lado).'], [3, '<strong>Salvar nova senha</strong>. Pronto!']])}
          ${dica('Para trocar a senha depois, clique no seu nome no canto superior direito (<strong>Minha conta</strong>). Esqueceu? Peça ao administrador para gerar uma nova senha provisória.', '🔑')}
        </div>
      </div>
      <h3 class="sub">Perfis de acesso</h3>
      <table class="tab">
        <tr><th>Perfil</th><th>O que vê</th><th>O que pode fazer</th></tr>
        <tr><td><strong>👑 Admin master</strong><br><small>usuário “admin”</small></td><td>Todas as regionais</td><td>Tudo, inclusive criar acessos, editar formulários e baixar backup. A senha é definida na hospedagem.</td></tr>
        <tr><td><strong>Administrador(a)</strong></td><td>Todas as regionais</td><td>O mesmo que o master, com login próprio.</td></tr>
        <tr><td><strong>🗺️ Coordenador(a) de RH regional</strong></td><td>Somente a própria regional</td><td>Cadastrar pessoas, enviar e acompanhar avaliações e entrevistas, ver indicadores e exportar Excel da regional.</td></tr>
      </table>`,
    { titulo: 'Primeiro acesso e perfis', kicker: 'ACESSO, PERFIS E PRIMEIRO ACESSO' }),

    pagina(`
      <p>Para o coordenador regional, a Jornada mostra apenas o que é da sua regional e esconde os itens de administração.</p>
      ${print('coordenadora')}
      ${legenda([[1, 'Menu do coordenador: Início, Pessoas, Avaliação de Experiência (Acompanhar e Indicadores) e Entrevista de Desligamento (Enviar, Indicadores e Respostas).'],
        [2, 'Seu nome e sua regional. Clique para trocar a senha ou sair.']])}
      ${dica('Tudo o que o coordenador cadastra (pessoas, convites, links gerais e QR Codes) já fica marcado com a regional dele. Não é preciso informar a regional.', '🗺️')}`,
    { titulo: 'A visão do coordenador regional', kicker: 'ACESSO, PERFIS E PRIMEIRO ACESSO' }),

    // 02 Início
    pagina(`
      <p>A tela inicial responde à pergunta <strong>“o que vamos fazer hoje?”</strong>: mostra os processos, os números do dia e os próximos prazos.</p>
      ${print('inicio')}
      ${legenda([[1, '<strong>Avaliação de Experiência</strong>: quantas estão a enviar, com gestores, aguardando ciência e atrasadas.'],
        [2, '<strong>Entrevista de Desligamento</strong>: convites aguardando, respondidas no mês e alertas.'],
        [3, '<strong>Próximos prazos</strong>: avaliações atrasadas ou vencendo em 15 dias, com o botão de WhatsApp para lembrar o gestor.'],
        [4, 'Seu nome e perfil (Minha conta).']])}`,
    { capitulo: '02', titulo: 'O que vamos fazer hoje?', kicker: 'TELA INICIAL' }),

    // 03 Pessoas
    pagina(`
      <p>Toda avaliação de experiência começa no cadastro da pessoa. Ao cadastrar, a Jornada cria sozinha as avaliações do <strong>1º e do 2º período</strong>,
        com vencimento calculado pela admissão e prazo de devolução.</p>
      ${print('pessoas')}
      ${legenda([[1, '<strong>+ Nova pessoa</strong>: cadastro individual.'], [2, '<strong>Importar planilha</strong> de admissões (Excel ou CSV).'],
        [3, '<strong>Baixar modelo</strong> da planilha com as colunas certas.'], [4, '<strong>Ficha</strong>: a linha do tempo da pessoa.']])}`,
    { capitulo: '03', titulo: 'Pessoas na jornada', kicker: 'CADASTRO, PLANILHA E FICHA' }),

    pagina(`
      <div class="dois alinhado">
        <div>${print('nova-pessoa', { moldura: 'solto' })}</div>
        <div>
          <h3 class="sub">Cadastro e planilha</h3>
          <p>Informe nome, chapa, cargo, setor, gestor e <strong>data de admissão</strong>. O WhatsApp e o e-mail do gestor agilizam o envio da avaliação.</p>
          <p>Na planilha, as colunas são: <strong>NOME, CHAPA, CARGO, SETOR, REGIONAL, GESTOR, ADMISSAO</strong> e, se quiser, TELEFONE GESTOR, EMAIL GESTOR, TELEFONE e EMAIL.
            Se a chapa já existir, o cadastro é atualizado.</p>
          ${dica('Ao digitar um gestor já cadastrado, a Jornada completa o WhatsApp e o e-mail dele.')}
        </div>
      </div>
      <h3 class="sub">Ficha da pessoa</h3>
      ${print('ficha', { moldura: 'solto', classe: 'medio' })}
      ${legenda([[1, 'Linha do tempo: Admissão → 1º período → 2º período → Desligamento, com a situação de cada etapa.'],
        [2, 'Envio rápido ao gestor (WhatsApp, e-mail, link ou QR Code).'], [3, 'Se a pessoa sair, inicie a entrevista de desligamento daqui: os dados já vão preenchidos.']])}`,
    { titulo: 'Cadastro e ficha', kicker: 'CADASTRO, PLANILHA E FICHA' }),

    // 04 Fluxo
    pagina(`
      <p>Cada período de experiência segue o mesmo caminho. O quadro <strong>Acompanhar</strong> mostra em que etapa está cada avaliação.</p>
      <ol class="fluxo">
        <li><b>1</b><strong>A enviar</strong><span>A pessoa foi cadastrada. Envie o link ao gestor.</span></li>
        <li><b>2</b><strong>Com o gestor</strong><span>O gestor recebeu o link. O cartão avisa quando ele abre.</span></li>
        <li><b>3</b><strong>Aguardando ciência</strong><span>O gestor respondeu. Envie ao colaborador para ciência.</span></li>
        <li><b>4</b><strong>Concluída</strong><span>Gestor e colaborador ok. A avaliação fica no histórico.</span></li>
      </ol>
      ${print('quadro')}
      ${legenda([[1, 'Coluna <strong>A enviar</strong>, com etiqueta de prazo: verde (no prazo), laranja (vence em até 7 dias) e vermelha (atrasada).'],
        [2, 'Enviar ao gestor por <strong>WhatsApp</strong> (mensagem pronta), e-mail, link ou QR Code. O cartão passa sozinho para “Com o gestor”.'],
        [3, '<strong>Aguardando ciência</strong>: os botões passam a enviar o link de ciência ao colaborador.'], [4, '<strong>Ver avaliação</strong> completa.']])}`,
    { capitulo: '04', titulo: 'O fluxo da Avaliação de Experiência', kicker: 'ACOMPANHAR' }),

    pagina(`
      <h3 class="sub">Regras dos períodos</h3>
      <div class="tres">
        <div class="cartao-guia"><h3>📅 Prazos</h3><p>Por padrão, o 1º período vence em 45 dias e o 2º em 90 dias desde a admissão. O gestor deve devolver 10 dias antes do vencimento. Tudo é ajustável no formulário.</p></div>
        <div class="cartao-guia"><h3>⏩ Prorrogar + N dias</h3><p>Se o 1º período terminar em <strong>Prorrogar</strong>, o 2º passa a vencer N dias depois do 1º.</p></div>
        <div class="cartao-guia"><h3>✅ Efetivar / ✋ Rescindir</h3><p>No 1º período, encerra o contrato de experiência: o 2º período é <strong>dispensado</strong>. Rescindir gera alerta para o RH.</p></div>
      </div>
      <h3 class="sub">Mais ações no cartão (⋯)</h3>
      <p>Ficha da pessoa · Ver avaliação · <strong>Ajustar vencimento</strong> · <strong>Registrar ciência (RH)</strong>, quando o colaborador assinou em papel · <strong>Reabrir para o gestor</strong>, que apaga as respostas.</p>
      ${print('ver-avaliacao', { moldura: 'solto', classe: 'medio' })}
      ${legenda([[1, 'Dados da avaliação: respondida em, no prazo ou não, e ciência.'], [2, '<strong>Imprimir / PDF</strong> com campos de assinatura para o arquivo da pessoa.']])}`,
    { titulo: 'Prazos, decisões e ações', kicker: 'ACOMPANHAR' }),

    // 05 Gestor
    pagina(`
      <p>O gestor recebe um link pelo WhatsApp ou e-mail. Antes das perguntas, ele vê uma abertura com a ficha do colaborador e a orientação do RH.</p>
      ${print('gestor-abertura')}
      ${legenda([[1, 'Mensagem ao gestor (editável pelo RH): o 1º parágrafo em destaque e o lema.'], [2, 'Orientação completa, em uma janela.'],
        [3, 'Ficha do colaborador com o dia do período de experiência.'], [4, '<strong>Começar avaliação</strong>.']])}`,
    { capitulo: '05', titulo: 'O que o gestor vê', kicker: 'GESTOR E COLABORADOR' }),

    pagina(`
      ${print('gestor-form')}
      ${legenda([[1, 'Ficha fixa com prazo de devolução.'], [2, '<strong>Resumo ao vivo</strong>: preenchimento, aderência aos valores e pontos de atenção.'], [3, 'Competências com respostas de bolinha.']])}
      <div class="dois alinhado">
        <div>${print('gestor-parecer', { moldura: 'solto' })}</div>
        <div>${legenda([[1, 'Classificação geral do colaborador.'], [2, 'Decisão: <strong>Efetivar, Prorrogar + dias ou Rescindir</strong>.'],
          [3, '<strong>Colaborador de acordo</strong>: o gestor confirma que conversou com o colaborador. Sem essa marcação, o envio fica bloqueado.'],
          [4, '<strong>Enviar avaliação</strong>.']])}</div>
      </div>`,
    { titulo: 'Avaliação e parecer final', kicker: 'GESTOR E COLABORADOR' }),

    pagina(`
      <p>Depois que o gestor envia, o colaborador recebe o link de <strong>ciência</strong>. Ele lê a avaliação completa no celular e confirma.
        A ciência digital substitui a assinatura em papel e fica registrada com data e hora.</p>
      <div class="celulares">${print('ciencia-celular', { moldura: 'celular' })}${print('ciencia-celular-fim', { moldura: 'celular' })}</div>
      ${dica('Ciência significa que o colaborador leu a avaliação, não que concorda com tudo. Se ele assinou em papel, use “Registrar ciência (RH)” no cartão.', '✍️')}`,
    { titulo: 'A ciência do colaborador', kicker: 'GESTOR E COLABORADOR' }),

    // 06 Indicadores experiência
    pagina(`
      ${print('xp-indicadores')}
      ${legenda([[1, 'Respondidas, % efetivação, prorrogação e rescisão, devolvidas no prazo, tempo médio do gestor, atrasadas e alertas.'],
        [2, '<strong>Aderência aos valores</strong>: % de “Aderente” em cada valor.'], [3, '<strong>Competências</strong>: % de respostas positivas (Sim · Bom).'],
        [4, '<strong>Exportar Excel</strong>: abas Avaliações, Base_indicadores (para tabela dinâmica/Power BI) e Pessoas.']])}
      ${dica('Mais abaixo na tela: tabelas por setor e por gestor e o cruzamento com o desligamento, que mostra quem saiu nos primeiros 90 dias, o que o gestor avaliou e por que a pessoa saiu.', '🔁')}`,
    { capitulo: '06', titulo: 'Indicadores da experiência', kicker: 'INDICADORES, EXCEL E FORMULÁRIO' }),

    pagina(`
      <p>Somente administradores editam o formulário. As mudanças valem para as próximas avaliações; as respostas antigas são preservadas.</p>
      ${print('xp-formulario')}
      ${legenda([[1, 'Mensagem ao gestor na abertura (parágrafos separados por linha em branco).'], [2, 'Duração dos períodos e antecedência de devolução.'],
        [3, 'Competências e perguntas: escolha única, múltipla, grade, texto e data. Coloque as opções da melhor para a pior.'], [4, 'Restaurar o modelo original, pré-visualizar e salvar.']])}`,
    { titulo: 'Formulário da experiência', kicker: 'INDICADORES, EXCEL E FORMULÁRIO' }),

    // 07 Desligamento
    pagina(`
      ${print('dsl-enviar')}
      ${legenda([[1, '<strong>Link geral</strong> (e QR Code): o colaborador preenche os próprios dados. O link do coordenador já leva a regional.'],
        [2, '<strong>Convite individual</strong>: gera um link único, já identificado, que aceita uma resposta.'],
        [3, 'Enviar ou reenviar por WhatsApp, e-mail, link ou QR Code.'], [4, 'Filtrar por situação: aguardando, respondidas ou recusou.']])}
      ${dica('Para quem já está no cadastro de Pessoas, inicie a entrevista pela ficha da pessoa: os dados vão preenchidos.')}`,
    { capitulo: '07', titulo: 'Entrevista de Desligamento: enviar', kicker: 'ENTREVISTA DE DESLIGAMENTO' }),

    pagina(`
      <p>A entrevista abre com uma tela de boas-vindas e segue em <strong>6 etapas</strong>, uma seção por vez, com o mapa da conversa ao lado. Funciona no computador e no celular.</p>
      <div class="dois alinhado">
        <div>${print('dsl-abertura')}</div>
        <div class="celulares um">${print('dsl-celular', { moldura: 'celular' })}</div>
      </div>
      ${dica('O link individual já chega com o nome e os dados preenchidos. Quem prefere não participar clica em “Prefiro não participar”, e a recusa fica registrada.', '🚪')}`,
    { titulo: 'O que o colaborador vê', kicker: 'ENTREVISTA DE DESLIGAMENTO' }),

    pagina(`
      <p>Cada etapa reúne as perguntas de uma seção. O painel ao lado mostra onde a pessoa está e quanto falta. No fim, uma revisão aponta as obrigatórias que faltaram antes do envio.</p>
      ${print('dsl-secao')}
      ${legenda([[1, 'Mapa das etapas: concluídas, atual e pendentes.'], [2, 'Percentual concluído.'], [3, '<strong>Continuar</strong> só avança com as obrigatórias respondidas.']])}
      ${dica('As respostas são confidenciais e de uso exclusivo do RH. A pergunta sobre o Compliance gera um alerta nos indicadores quando a resposta é “Sim”.', '🔒')}`,
    { titulo: 'As etapas da entrevista', kicker: 'ENTREVISTA DE DESLIGAMENTO' }),

    pagina(`
      ${print('dsl-indicadores')}
      ${legenda([[1, 'Entrevistas, retorno dos convites, recusas, % que voltaria, satisfação, tempo de casa e alertas (ex.: pedido de contato com o Compliance).'],
        [2, 'Motivos de saída.'], [3, 'Satisfação por fator.'], [4, 'Exportar Excel: abas Respostas, Base_indicadores, Resumo e Convites.']])}
      ${dica('Use os filtros de período, área e gestor no topo. Administradores também filtram por regional.')}`,
    { titulo: 'Indicadores do desligamento', kicker: 'ENTREVISTA DE DESLIGAMENTO' }),

    pagina(`
      ${print('dsl-respostas')}
      ${legenda([[1, 'Buscar por nome, área ou gestor.'], [2, '<strong>Ver</strong> a entrevista completa, com impressão em PDF para o arquivo.'], [3, 'Exportar Excel.']])}
      <h3 class="sub">Formulário da entrevista (administradores)</h3>
      <p>Em <strong>Entrevista de Desligamento › Formulário</strong>, o administrador edita perguntas, opções, textos de abertura e a mensagem do convite (com {nome} e {link}).
        Editar o texto de uma pergunta não perde as respostas já recebidas. O botão “Restaurar modelo original” recarrega o formulário PRESI-RH-0002.</p>`,
    { titulo: 'Respostas e formulário', kicker: 'ENTREVISTA DE DESLIGAMENTO' }),

    // 08 Usuários
    pagina(`
      <p>Em <strong>Usuários e acessos</strong>, o administrador cria o login de cada coordenador de RH regional.</p>
      ${print('usuarios', { classe: 'alto' })}
      ${legenda([[1, 'Perfil: <strong>Coordenador(a) de RH regional</strong> (informe a regional) ou Administrador(a).'],
        [2, 'Acesso criado: endereço, e-mail e <strong>senha provisória</strong>, com botões para copiar e enviar por WhatsApp ou e-mail.'],
        [3, '<strong>Visão por regional</strong>: quem coordena e o que está em andamento.'], [4, 'Editar, gerar nova senha, desativar ou excluir um acesso.']])}`,
    { capitulo: '08', titulo: 'Usuários e acessos', kicker: 'ADMINISTRADORES' }),

    // 09 Boas práticas e FAQ
    pagina(`
      <div class="dois">
        <div class="cartao-guia"><h3>🔒 Confidencialidade</h3><p>As entrevistas de desligamento são de uso exclusivo do RH. Não compartilhe prints nem planilhas fora do time.</p></div>
        <div class="cartao-guia"><h3>⏳ Prazos em dia</h3><p>Olhe os <strong>Próximos prazos</strong> da tela inicial toda semana e lembre o gestor pelo WhatsApp com um clique.</p></div>
        <div class="cartao-guia"><h3>🗺️ Regional certa</h3><p>Coordenadores usam o próprio link geral. Pessoas e convites sem regional só aparecem para os administradores.</p></div>
        <div class="cartao-guia"><h3>💾 Backup</h3><p>Administradores podem baixar uma cópia completa do banco no menu <strong>Backup</strong>.</p></div>
      </div>
      <h3 class="sub">Dúvidas frequentes</h3>
      <dl class="faq">
        <dt>Esqueci minha senha. E agora?</dt><dd>Peça ao administrador: em Usuários e acessos, ele gera uma nova senha provisória.</dd>
        <dt>O gestor não recebeu o link.</dt><dd>No cartão da avaliação, use WhatsApp, e-mail, copiar link ou QR Code. O link é sempre o mesmo.</dd>
        <dt>A data de vencimento está errada.</dt><dd>Corrija a admissão na ficha da pessoa (os vencimentos são recalculados) ou use “Ajustar vencimento” no cartão.</dd>
        <dt>O gestor enviou com erro.</dt><dd>Use “Reabrir para o gestor” no cartão: as respostas são apagadas e o mesmo link volta a funcionar.</dd>
        <dt>O colaborador assinou em papel.</dt><dd>Use “Registrar ciência (RH)” no cartão da avaliação.</dd>
        <dt>Não vejo uma pessoa que deveria ver.</dt><dd>Ela pode estar cadastrada em outra regional ou sem regional. Peça ao administrador para ajustar.</dd>
      </dl>`,
    { capitulo: '09', titulo: 'Boas práticas e dúvidas', kicker: 'PARA O DIA A DIA' }),

    // Contracapa
    pagina(`
      <div class="capa-sol"><i></i><i></i><i></i><i></i></div>
      <span class="logo claro"><b>Âmbar</b><small>ENERGIA</small></span>
      <div class="capa-txt contra">
        <h1>Cada pessoa.<br>Cada etapa.<br><em>Com cuidado.</em></h1>
        <p class="capa-sub">Dúvidas sobre a Jornada Âmbar? Fale com o administrador da plataforma no time de DHO.</p>
      </div>`, { classe: 'contracapa' }),
  ];

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  :root { --marinho: #0e3b5c; --marinho-escuro: #0a2c45; --laranja: #ec6b24; --laranja-claro: #f39a4a; --laranja-suave: #fdf0e7; --texto: #1d2b36; --suave: #5f6f7c; --linha: #dfe5eb; --fundo: #f4f6f8; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Nunito Sans', sans-serif; color: var(--texto); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pagina { position: relative; width: 210mm; height: 297mm; overflow: hidden; page-break-after: always; padding: 16mm 15mm 18mm; background: #fff; display: flex; flex-direction: column; }
  .pagina::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 32mm; background: url('${arq(path.join(imagens, 'energia.svg'))}') center bottom / 120% auto no-repeat; opacity: .06; pointer-events: none; }
  .topo-pag { display: flex; justify-content: space-between; align-items: center; font-family: 'Montserrat'; font-size: 7.5pt; font-weight: 700; letter-spacing: .18em; color: var(--laranja); padding-bottom: 3mm; border-bottom: 1px solid var(--linha); margin-bottom: 6mm; }
  .logo-mini { letter-spacing: .1em; color: var(--marinho); } .logo-mini b { font-size: 10pt; letter-spacing: 0; }
  .rodape-pag { position: absolute; left: 15mm; right: 15mm; bottom: 8mm; display: flex; justify-content: space-between; font-size: 8pt; color: var(--suave); z-index: 1; }
  .rodape-pag b { color: var(--laranja); font-family: 'Montserrat'; }
  .cab { display: flex; align-items: center; gap: 4mm; margin-bottom: 5mm; }
  .cap-num { font-family: 'Montserrat'; font-weight: 800; font-size: 30pt; color: var(--laranja); line-height: 1; }
  .cab small { font-family: 'Montserrat'; font-size: 7.5pt; font-weight: 800; letter-spacing: .2em; color: var(--laranja); }
  .cab h2 { margin: 1mm 0 0; font-family: 'Montserrat'; font-weight: 700; font-size: 19pt; color: var(--marinho); line-height: 1.15; }
  .corpo { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; gap: 4mm; font-size: 10pt; line-height: 1.5; }
  .corpo p { margin: 0; }
  .lead { font-size: 11.5pt; line-height: 1.6; }
  h3.sub { margin: 2mm 0 0; font-family: 'Montserrat'; font-size: 11pt; color: var(--marinho); }
  .print { margin: 0; }
  .print-img { position: relative; width: 100%; }
  .print-img img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .navegador { border-radius: 3mm; overflow: hidden; border: 1px solid #cfd8e0; box-shadow: 0 3mm 8mm -4mm rgba(14, 59, 92, .35); }
  .barra-nav { display: flex; align-items: center; gap: 1.4mm; padding: 1.6mm 3mm; background: #eef2f5; border-bottom: 1px solid #dfe5eb; }
  .barra-nav i { width: 2.2mm; height: 2.2mm; border-radius: 50%; background: #d3dbe2; } .barra-nav i:first-child { background: #ec6b24; }
  .barra-nav span { margin-left: 3mm; padding: .6mm 4mm; border-radius: 9mm; background: #fff; font-size: 7pt; color: var(--suave); }
  .solto { border-radius: 3mm; overflow: hidden; border: 1px solid #cfd8e0; box-shadow: 0 3mm 8mm -4mm rgba(14, 59, 92, .35); }
  .print.medio { width: 80%; align-self: center; }
  .print.alto .print-img { max-height: 150mm; }
  .celular { width: 52mm; padding: 2.2mm; border-radius: 7mm; background: #1d2b36; box-shadow: 0 4mm 9mm -4mm rgba(0, 0, 0, .45); }
  .celular .print-img { border-radius: 5mm; overflow: hidden; }
  .celulares { display: flex; justify-content: center; gap: 12mm; }
  .celulares.um { justify-content: center; align-items: center; }
  .caixa { position: absolute; border: .7mm solid var(--laranja); border-radius: 1.6mm; box-shadow: 0 0 0 1mm rgba(236, 107, 36, .18); }
  .num { position: absolute; transform: translate(-45%, -45%); width: 6mm; height: 6mm; border-radius: 50%; display: grid; place-items: center; background: var(--laranja); color: #fff; font-family: 'Montserrat'; font-size: 8pt; border: .5mm solid #fff; }
  .legenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 2mm; }
  .legenda li { display: flex; gap: 2.5mm; align-items: flex-start; }
  .legenda b { flex-shrink: 0; width: 5.5mm; height: 5.5mm; border-radius: 50%; display: grid; place-items: center; background: var(--laranja); color: #fff; font-family: 'Montserrat'; font-size: 7.5pt; margin-top: .3mm; }
  .dica { display: flex; gap: 3mm; padding: 3mm 4mm; border-radius: 3mm; background: var(--laranja-suave); color: #8a4a1f; font-size: 9.5pt; }
  .dois { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; } .dois.alinhado { align-items: center; }
  .tres { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; }
  .cartao-guia { padding: 4mm; border-radius: 3mm; border: 1px solid var(--linha); background: #fff; }
  .cartao-guia h3 { margin: 0 0 1.5mm; font-family: 'Montserrat'; font-size: 10.5pt; color: var(--marinho); }
  .cartao-guia p { font-size: 9.5pt; color: #3d4f5c; }
  .cartao-guia.laranja { border-top: 1.2mm solid var(--laranja); } .cartao-guia.marinho { border-top: 1.2mm solid var(--marinho); }
  .sumario { list-style: none; margin: 0; padding: 0; display: grid; gap: 2.4mm; }
  .sumario li { display: flex; gap: 4mm; align-items: center; padding-bottom: 2.4mm; border-bottom: 1px dashed var(--linha); font-size: 11pt; }
  .sumario b { font-family: 'Montserrat'; font-weight: 800; color: var(--laranja); width: 9mm; }
  .tab { width: 100%; border-collapse: collapse; font-size: 9.2pt; }
  .tab th { text-align: left; font-size: 7.5pt; letter-spacing: .1em; text-transform: uppercase; color: var(--suave); border-bottom: 2px solid var(--linha); padding: 2mm; }
  .tab td { padding: 2.4mm 2mm; border-bottom: 1px solid var(--linha); vertical-align: top; } .tab small { color: var(--suave); }
  .fluxo { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
  .fluxo li { position: relative; padding: 3mm; border-radius: 3mm; background: var(--fundo); display: grid; gap: .8mm; }
  .fluxo b { width: 6mm; height: 6mm; border-radius: 50%; display: grid; place-items: center; background: var(--marinho); color: #fff; font-family: 'Montserrat'; font-size: 8pt; }
  .fluxo strong { color: var(--marinho); font-size: 9.5pt; } .fluxo span { font-size: 8.5pt; color: #3d4f5c; line-height: 1.4; }
  .faq { margin: 0; display: grid; gap: 1.5mm; } .faq dt { font-weight: 800; color: var(--marinho); margin-top: 1.5mm; } .faq dd { margin: 0; color: #3d4f5c; }
  /* capa e contracapa */
  .capa, .contracapa { background: linear-gradient(160deg, #0e3b5c 0%, #0a2c45 55%, #071f31 100%); color: #fff; padding: 20mm 18mm; }
  .capa::after, .contracapa::after { filter: invert(1); opacity: .08; height: 45mm; }
  .logo { display: inline-flex; flex-direction: column; line-height: .95; font-family: 'Montserrat'; position: relative; z-index: 2; }
  .logo b { font-weight: 600; font-size: 22pt; color: #fff; } .logo small { font-weight: 700; font-size: 7.5pt; letter-spacing: .14em; color: var(--laranja); margin-left: 1px; }
  .capa-txt { position: relative; z-index: 2; margin-top: 40mm; }
  .capa-kick { display: flex; align-items: center; gap: 3mm; margin: 0; font-family: 'Montserrat'; font-weight: 800; letter-spacing: .22em; font-size: 9pt; color: var(--laranja-claro); }
  .capa-kick img { width: 9mm; height: 9mm; border-radius: 2mm; }
  .capa h1, .contracapa h1 { font-family: 'Montserrat'; font-weight: 300; font-size: 46pt; line-height: 1.05; margin: 5mm 0; color: #fff; }
  .contracapa h1 em { font-style: normal; font-weight: 700; color: var(--laranja); }
  .capa-sub { font-size: 13pt; line-height: 1.55; color: #c4d4e1; max-width: 150mm; }
  .capa-caminho { position: relative; z-index: 2; width: 150mm; margin-top: auto; margin-bottom: 18mm; }
  .capa-rot { fill: #fff; font-family: 'Montserrat'; font-weight: 700; font-size: 16px; }
  .capa-rodape { position: relative; z-index: 2; margin: 0; font-size: 9pt; color: #9fb6c8; }
  .capa-sol { position: absolute; width: 190mm; aspect-ratio: 1; right: -80mm; top: -70mm; z-index: 0; }
  .capa-sol i { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(243, 154, 74, .25); }
  .capa-sol i:nth-child(2) { inset: 12%; } .capa-sol i:nth-child(3) { inset: 24%; border-color: rgba(243, 154, 74, .4); }
  .capa-sol i:nth-child(4) { inset: 36%; border: 0; background: radial-gradient(circle, #f7b267 0, #f39a4a 40%, #ec6b24 75%); box-shadow: 0 0 40mm 10mm rgba(236, 107, 36, .35); }
  .contracapa .capa-sol { top: auto; bottom: -110mm; right: auto; left: 10mm; }
  .capa-txt.contra { margin-top: 55mm; }
</style></head><body>${paginas.join('')}</body></html>`;
}

module.exports = { montar };
