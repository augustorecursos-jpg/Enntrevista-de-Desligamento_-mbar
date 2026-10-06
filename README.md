# Entrevista de Desligamento · Âmbar Energia

Versão digital do formulário **PRESI-RH-0002 – Entrevista de Desligamento**, nas cores da Âmbar
(azul-marinho `#0e3b5c` e laranja `#ec6b24`).

- O colaborador responde pelo celular ou computador, por **link geral**, **link individual**, **WhatsApp**, **e-mail** ou **QR Code**.
- O RH acompanha **indicadores**, lê cada entrevista, imprime/salva em PDF e **exporta para Excel**.
- O formulário é **editável** pelo RH (sem programação).

## Páginas

| Endereço | Para quem | O que faz |
|---|---|---|
| `/admin.html` (ou `/`) | RH (senha) | Enviar convites, indicadores, respostas, Excel e editor do formulário |
| `/desligamento.html` | Colaborador | Entrevista pelo link geral (a pessoa preenche os próprios dados) |
| `/desligamento.html?c=<código>` | Colaborador | Entrevista pelo convite individual (já identificada; aceita uma resposta) |
| `/desligamento.html?previa=1` | RH | Pré-visualização (nada é enviado) |

### Área do RH
- **Enviar**: link geral e convites individuais (nome, matrícula, cargo, área, gestor, datas, WhatsApp, e-mail e
  responsável RH). Cada link tem botões de **WhatsApp** (abre a conversa com a mensagem pronta), **e-mail**,
  **copiar** e **QR Code** (PNG para imprimir). A lista mostra quem respondeu, recusou ou está pendente.
- **Indicadores**: entrevistas, taxa de retorno, recusas, % que voltaria, satisfação com a empresa, tempo médio de casa,
  alertas (ex.: pedido de contato com o Compliance), motivos de saída, satisfação por fator, benefícios, o que mudaria,
  entrevistas por mês e por área; filtros por período, área e gestor; resultado de cada pergunta.
- **Respostas**: entrevista completa, impressão/PDF e exportação **Excel** com as abas *Respostas*, *Base_indicadores*
  (formato para tabela dinâmica/Power BI), *Resumo* e *Convites*.
- **Formulário**: seções e perguntas (escolha única, múltipla seleção, grade de itens × escala, texto e data),
  obrigatoriedade, justificativa, opção "Outros", alerta por resposta, textos e mensagem do convite (`{nome}` e `{link}`).
  *Restaurar modelo original* recarrega o formulário do PDF.
- **Backup**: baixa uma cópia completa do banco.

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
desligamento.js    formulário padrão, convites, respostas e QR Code (API)
db.js              banco SQLite nativo do Node (sem banco externo)
public/            página do colaborador (desligamento.html) e área do RH (admin.html)
```
