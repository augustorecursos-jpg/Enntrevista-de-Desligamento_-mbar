# Jornada Âmbar · Âmbar Energia

**Cuidando de cada etapa.** Plataforma do RH para os processos da jornada do colaborador, nas cores da Âmbar
(azul-marinho `#0e3b5c` e laranja `#ec6b24`). Na tela inicial o RH escolhe o processo:

- 🤝 **Primeiras Conexões**: nos primeiros 15 dias, o **colaborador** conta como foi a chegada (pré-onboarding, primeiro
  dia, equipe, liderança, estrutura, integração, pertencimento e notas de 0 a 10); o RH acompanha e vê o índice de acolhimento e o eNPS.
- 🌱 **Avaliação de Experiência**: o **gestor** avalia o 1º e o 2º período por um link (WhatsApp, e-mail ou QR Code);
  o **colaborador** registra a ciência digital; o RH acompanha prazos, decisões (Efetivar · Prorrogar · Rescindir) e indicadores.
- 🚪 **Entrevista de Desligamento**: versão digital do formulário PRESI-RH-0002, respondida por quem está saindo.

Tudo é editável pelo RH (perguntas, prazos e mensagens) e exporta para Excel.

## Páginas

| Endereço | Para quem | O que faz |
|---|---|---|
| `/admin.html` (ou `/`) | RH (e-mail e senha; master: `admin`) | Início, Pessoas, Avaliação de Experiência e Entrevista de Desligamento |
| `/conexoes.html?t=<código>` | Colaborador | Primeiras Conexões (avaliação dos primeiros 15 dias) |
| `/conexoes.html?previa=1` | RH | Pré-visualização das Primeiras Conexões (nada é enviado) |
| `/avaliacao.html?t=<código>` | Gestor | Avaliação de experiência de um colaborador (1º ou 2º período) |
| `/ciencia.html?t=<código>` | Colaborador | Lê a avaliação e registra a ciência (substitui a assinatura em papel) |
| `/avaliacao.html?previa=1` | RH | Pré-visualização do formulário de experiência |
| `/desligamento.html` | Colaborador | Entrevista de desligamento pelo link geral |
| `/desligamento.html?c=<código>` | Colaborador | Entrevista de desligamento pelo convite individual |
| `/desligamento.html?previa=1` | RH | Pré-visualização da entrevista (nada é enviado) |

### Área do RH
- **Início**: "O que vamos fazer hoje?" com os processos, os números do dia e os **próximos prazos** (avaliações
  atrasadas ou vencendo em 15 dias), com envio ao gestor em um clique.
- **Pessoas**: cadastro único (nome, chapa, cargo, setor, gestor e contatos, admissão) ou **importação da planilha de
  admissões** (botão *Baixar modelo*). Ao cadastrar, a plataforma cria as avaliações do 1º e do 2º período com vencimento
  calculado pela admissão (padrão 45 e 90 dias) e o prazo de devolução (padrão 10 dias antes). Cada pessoa tem uma
  **ficha com linha do tempo**: Admissão → 1º período → 2º período → Desligamento, e dali se inicia a entrevista de
  desligamento já com os dados preenchidos.
- **Primeiras Conexões** (um convite por pessoa cadastrada, criado automaticamente)
  - *Acompanhar*: quadro **Em breve → A enviar → Aguardando resposta → Respondidas**. O link fica pronto no 12º dia de
    casa e o prazo é o 15º (editável). Envio por WhatsApp/e-mail/link/QR Code. Quem já tinha mais de 45 dias de casa ao
    ser cadastrado entra como *dispensado* (dá para reativar). Respostas confidenciais, vistas só pelo RH.
  - *Indicadores*: índice de acolhimento (% Concordo + Concordo totalmente), nota média da experiência, eNPS do
    onboarding, taxa de resposta, respondidas no prazo, % de concordância por conexão e por afirmação, distribuição das
    notas, por setor, falas abertas e a lista **Para agir agora** (discordâncias, nota até 6 e pendências de estrutura).
    Exporta Excel (*Primeiras_Conexoes* e *Base_indicadores*).
  - *Formulário*: texto de abertura (integral, editável), conexões, afirmações, perguntas abertas e notas, dias de envio e prazo.
- **Avaliação de Experiência**
  - *Acompanhar*: quadro **A enviar → Com o gestor → Aguardando ciência → Concluídas**, com etiquetas de prazo
    (verde, laranja, vermelho), aviso de que o gestor abriu o link, envio por WhatsApp/e-mail/link/QR Code, ciência
    registrada pelo RH (quando assinada em papel), ajuste de vencimento e reabertura. Se o 1º período terminar em
    **Prorrogar + N dias**, o 2º passa a vencer N dias depois; se terminar em **Efetivar** ou **Rescindir**, o 2º é dispensado.
  - *Indicadores*: % efetivação, prorrogação e rescisão; devolvidas no prazo; tempo médio do gestor; atrasadas; alertas;
    aderência a cada valor; competências; por setor e por gestor; e o **cruzamento com o desligamento** (quem saiu nos
    primeiros 90 dias: o que o gestor avaliou × por que a pessoa saiu). Exporta Excel (*Avaliações*, *Base_indicadores*, *Pessoas*).
  - *Formulário*: competências e perguntas editáveis, duração dos períodos, antecedência e mensagens ao gestor e ao
    colaborador (`{gestor}`, `{nome}`, `{periodo}`, `{vencimento}`, `{prazo}`, `{link}`). O parecer final é fixo.
- **Entrevista de Desligamento**: Enviar, Indicadores, Respostas e Formulário (como antes).
- **Usuários e acessos** (somente administradores): cria acessos para **coordenadores de RH regionais** e outros
  administradores. O login é o e-mail; a plataforma gera uma **senha provisória** (com botões para enviar por WhatsApp,
  e-mail ou copiar) e pede a troca no primeiro acesso. Dá para editar, gerar nova senha, desativar e excluir. A
  **visão por regional** mostra quem coordena cada regional e o que está em andamento.
- **Perfis**:
  - *Admin master*: usuário **admin** com a senha `ADMIN_PASSWORD` da hospedagem. Vê tudo e gerencia os acessos.
  - *Administrador(a)*: vê todas as regionais, edita formulários e acessos.
  - *Coordenador(a) de RH regional*: vê e cadastra somente pessoas, avaliações de experiência e entrevistas de
    desligamento da própria regional (o servidor bloqueia o restante). Não vê formulários, usuários nem backup.
    O "link geral" da entrevista de desligamento dele já marca a regional (`?r=<regional>`).
- **Backup**: baixa uma cópia completa do banco (somente administradores).

## Guia do RH (e-book)

O PDF `public/guia/guia-do-rh.pdf` (link no menu lateral e na tela de login) é gerado com prints reais da plataforma,
a partir de um servidor temporário com dados fictícios — o banco de produção não é usado. Depois de mudar telas, gere de novo:

```bash
node scripts/ebook/gerar-ebook.js   # requer o Playwright instalado (npm i -g playwright)
```

Texto e diagramação em `scripts/ebook/conteudo-ebook.js`; prints e marcações em `scripts/ebook/capturar.js`;
dados fictícios em `scripts/ebook/dados-ebook.js`.

## Publicar no Render (passo a passo)

1. Acesse **render.com** e entre com a conta do GitHub (*Sign in with GitHub*).
2. Clique em **New +** → **Blueprint**.
3. Escolha o repositório **Enntrevista-de-Desligamento_-mbar** (se não aparecer, clique em *Configure account* e libere o acesso a ele).
4. O Render lê o arquivo `render.yaml` e pede o valor de **ADMIN_PASSWORD**: digite a senha que o RH vai usar para entrar.
5. Clique em **Apply** / **Deploy**. Em poucos minutos o Render mostra o endereço, por exemplo
   `https://entrevista-desligamento-ambar.onrender.com`.
6. Abra esse endereço, entre com a senha e use a aba **Enviar**.

Custo aproximado: plano Starter (US$ 7/mês) + disco de 1 GB (US$ 0,25/mês). O disco guarda as respostas; o Render faz
snapshot diário. *O plano gratuito do Render não tem disco: as respostas seriam apagadas a cada reinício, por isso
não é indicado.* Em **Settings → Custom Domains** dá para usar um domínio da empresa.

### Outra hospedagem (servidor da empresa, Azure, AWS…)
```bash
docker build -t entrevista-desligamento .
docker run -d -p 3000:3000 -v desligamento-dados:/data -e ADMIN_PASSWORD=... entrevista-desligamento
```
e coloque um proxy com HTTPS na frente.

## Rodar no computador (teste)

Requisito: **Node.js 22.5+**.
```bash
npm install
npm start          # http://localhost:3000  (senha padrão de teste: ambar-rh)
```

| Variável | Para quê | Padrão |
|---|---|---|
| `ADMIN_PASSWORD` | Senha da área do RH | `ambar-rh` (só fora de produção; **obrigatória** em produção) |
| `PORT` | Porta HTTP | `3000` |
| `DATA_DIR` | Pasta do banco (`desligamento.db`) | `./data` |
| `SESSION_SECRET` | Chave dos cookies de sessão | gerada e salva em `data/` |
| `NODE_ENV=production` | Cookies só via HTTPS e senha obrigatória | – |

## Estrutura

```
server.js          servidor (login do RH, backup, arquivos estáticos)
conexoes.js        Primeiras Conexões: formulário padrão, convites de 15 dias, respostas e QR Code (API)
experiencia.js     avaliação de experiência: pessoas, avaliação do gestor, ciência e QR Code (API)
desligamento.js    entrevista de desligamento: formulário padrão, convites, respostas e QR Code (API)
db.js              banco SQLite nativo do Node (sem banco externo)
public/            avaliacao.html (gestor), conexoes.html, ciencia.html e desligamento.html (colaborador), admin.html (RH)
```
