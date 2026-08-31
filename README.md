# 🥬 Colheita & Vendas — App Instalável (PWA)

Este é um **PWA (Progressive Web App)**: um app de verdade, com ícone na tela
inicial do celular, que abre em **tela cheia** (sem barra do navegador) e
**funciona offline**. Ele roda no **Android (Chrome)** e no **iPhone
(Safari)** — não precisa de loja de aplicativos.

⚠️ **Importante sobre os dados:** este app guarda tudo **dentro do próprio
celular** (não usa internet nem servidor para os dados). Isso significa que:
- Funciona 100% offline, sem custo de servidor.
- Os dados **não sincronizam automaticamente** entre aparelhos diferentes.
- Use o botão **💾 Backup**, no topo do app, para exportar um arquivo `.json`
  sempre que quiser, guardá-lo (Google Drive, WhatsApp, e-mail) e/ou importar
  em outro celular.

---

## 1. Passo a passo para "instalar" no celular

Um PWA precisa estar hospedado em um endereço `https://` para poder ser
instalado (exceto em testes na mesma rede local). O jeito mais simples e
**100% gratuito** é usar o **Netlify Drop** — não precisa saber programar.

### Opção A — Netlify Drop (mais fácil, 2 minutos)

1. No computador, entre em **https://app.netlify.com/drop**
2. Arraste a **pasta inteira** deste projeto (com `index.html`, `style.css`,
   `app.js`, `manifest.json`, `service-worker.js` e a pasta `icons/`) para
   dentro da página.
3. O Netlify vai gerar um link tipo `https://algum-nome.netlify.app`.
4. Abra esse link **no navegador do celular** (Chrome no Android, Safari no
   iPhone).
5. Instale:
   - **Android (Chrome):** vai aparecer um aviso "Adicionar à tela inicial"
     — toque nele. Se não aparecer, toque nos 3 pontinhos (⋮) no canto
     superior direito → **"Instalar app"** ou **"Adicionar à tela inicial"**.
   - **iPhone (Safari):** toque no ícone de **Compartilhar** (o quadrado com
     a seta para cima) → role para baixo → **"Adicionar à Tela de Início"**.
6. Pronto! Um ícone verde 🥬 aparecerá na tela inicial do celular, igual a
   qualquer outro aplicativo.

> Dica: crie uma conta gratuita no Netlify para manter o link fixo e poder
> atualizar o app depois (arrastando a pasta novamente no mesmo site).

### Opção B — GitHub Pages (gratuito, ótimo para manter atualizado)

1. Crie uma conta gratuita em **https://github.com**.
2. Crie um repositório novo (por exemplo `colheita-app`).
3. Envie todos os arquivos deste projeto para o repositório (pode usar
   "Upload files" direto pelo navegador, arrastando os arquivos).
4. Vá em **Settings → Pages**, escolha a branch `main` e a pasta `/root`,
   salve.
5. Em alguns minutos o GitHub mostrará um link do tipo
   `https://seu-usuario.github.io/colheita-app/`.
6. Abra esse link no celular e siga o mesmo passo 5 da Opção A para instalar.

### Opção C — Testar localmente antes de publicar (avançado)

Se quiser só testar no seu próprio computador antes de publicar:

```bash
cd colheita_app_pwa
python -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador do computador. (Para testar
a instalação de verdade no celular, é necessário publicar em um link
`https://`, como nas opções A ou B.)

---

## 2. Como usar o app

- **🏠 Início** — visão geral, atalho para carregar dados de exemplo.
- **⚙️ Cadastros** — cadastre os **Patrões** (produtores) e, dentro de cada
  patrão, os **cultivos** que ele produz (Agrião, Alface, Couve...). Cadastre
  também os **Compradores**.
- **📝 Lançar** — registre a colheita/venda do dia: patrão, verdura (aparece
  automaticamente conforme os cultivos daquele patrão), comprador,
  quantidade, unidade (Mói/Caixa) e valor unitário. O valor total é
  calculado sozinho.
- **📋 Lista** — todos os lançamentos, com filtros por patrão/comprador e
  opção de excluir.
- **📊 Relatórios**:
  - **Por Patrão** — escolha mês, ano e o patrão: mostra os totais
    agrupados por verdura → comprador, e o Total Geral do patrão no mês.
  - **Por Comprador** — escolha mês, ano, e opcionalmente uma verdura
    específica ou um comprador específico: mostra a lista dia a dia
    (`DIA | CX | V.UN | V.TOTAL`), o fechamento de cada comprador
    (**T. Item** e **Total R$**) e, no final, o **Resumo Consolidado Geral
    do Mês** com TOTAL GERAL, TOTAL − 30%, RES. EMPATE P/2 e o total
    colhido em móis/caixas.
- **💾 Backup** (ícone no topo) — exporte seus dados para um arquivo
  `.json` (para guardar ou transferir para outro celular) ou importe um
  backup existente.

---

## 3. Estrutura dos arquivos

```
colheita_app_pwa/
├── index.html          → estrutura das telas do app
├── style.css            → visual (cores, layout mobile)
├── app.js                → toda a lógica (cadastros, lançamentos, relatórios)
├── manifest.json         → configura o "app instalável" (nome, ícone, cores)
├── service-worker.js     → permite o app funcionar offline
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md              → este arquivo
```

Todos os dados ficam num banco local do navegador chamado **IndexedDB**
(dentro do próprio celular) — não é necessário instalar Python, servidor
nem banco de dados externo.

---

## 4. Perguntas frequentes

**Preciso de internet para usar o app depois de instalado?**
Não. Depois da primeira visita (que carrega os arquivos), o app funciona
totalmente offline, graças ao `service-worker.js`.

**Se eu desinstalar o app, perco os dados?**
Sim — os dados ficam vinculados ao navegador/app naquele aparelho. Por
isso é essencial fazer backups (.json) regularmente pelo botão 💾.

**Consigo usar em vários celulares ao mesmo tempo, com os dados
sincronizados automaticamente?**
Não neste formato (ele é 100% local, sem servidor — por isso é gratuito e
funciona offline). Se no futuro você precisar de sincronização automática
entre vários aparelhos em tempo real, o próximo passo seria adicionar um
banco de dados na nuvem (ex: Firebase ou Supabase) — posso te ajudar a
evoluir o app para isso quando quiser.

**Posso mudar as cores, o nome ou o ícone do app?**
Sim. As cores estão no início do arquivo `style.css` (variáveis
`--green-900`, `--green-700` etc.), o nome está em `manifest.json`
(`name`/`short_name`) e os ícones estão na pasta `icons/`.
