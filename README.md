# Mudanças Jéssica Araújo · demonstração navegável

Demonstração da plataforma digital da Mudanças Jéssica Araújo, feita pela PMV Sistemas e pensada primeiro para o celular. O fluxo inteiro usa **um único pedido**, que passa por quatro áreas:

| Área | Rota | O que mostra |
|---|---|---|
| Site | `#/` | Página inicial, “Quanto vai custar a sua mudança?”, serviços, embalagem, galeria, avaliações e contato |
| Orçamento | `#/orcamento/1…4` | Trajeto e data → inventário → acesso e serviços → conferência com pacotes e preço |
| Atendimento | `#/atendimento` | Chat simulado de WhatsApp com IA, que parte do pedido e do preço registrado |
| Painel da Jéssica | `#/painel` | Lista com busca e filtros, detalhe do pedido, simulação interna do preço, sinal, distribuição, regras, pacotes, parceiros e IA |
| Parceiro | `#/parceiro` | Serviço recebido, observações em destaque, aceitar ou recusar, andamento |

HTML, CSS e JavaScript puros, sem build e sem dependências. O estado fica salvo no navegador (`localStorage`). A barra escura no topo (**DEMO**) liga as áreas, mostra o código do pedido e tem **Roteiro** e **↺ Reiniciar**.

## Como rodar

Qualquer servidor estático serve. No Windows, sem instalar nada:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Depois abra http://localhost:5173. Para ver no celular, use a mesma rede e troque `localhost` pelo IP do computador. O `HttpListener` pode pedir permissão de administrador para aceitar IP externo; se não der, publique como explicado abaixo.

Alternativas: `npx serve .` ou `python -m http.server 5173`.

> Abrir o `index.html` direto (`file://`) também funciona na maioria dos navegadores. O servidor é mais confiável para salvar o estado.

## Roteiro da apresentação

1. No celular, abra o site e toque em **Testar com uma mudança de exemplo**.
2. Avance pelos 4 passos. Na conferência, toque em **Editar** no inventário, mude uma quantidade e volte: o preenchimento continua lá.
3. Veja o **JA Prestige: R$ 2.970,00 (Orçamento de referência)**, com o que está incluído, porte de 100 caixas e 80 fornecidas, pagamento (1x R$ 3.089,10; 4x de R$ 794,55, total R$ 3.178,20), sinal de 60% e validade no mês vigente.
4. Toque em **Continuar com este orçamento no WhatsApp**. Use as sugestões “O que vem no Prestige?”, “O colchão precisa ir pela escada”, “Como eu reservo?” e “Quero reservar”. “Falar com uma pessoa” transfere para a equipe.
5. Na barra DEMO, toque em **Painel**: o mesmo pedido abre direto. Na aba **Preço interno**, teste +60/70/80/100%, digite a quantidade de caixas e compare com o histórico. Toque em **Simular sinal confirmado**.
6. Toque em **Encaminhar a mudança aos parceiros** → **Simular: Rota indisponível** → o serviço passa para o próximo parceiro.
7. Toque em **Abrir como Leste Carga & Cuidado**: aparece o destaque **“Colchão queen pela escada”**. Aceite e atualize o andamento.

O botão **Roteiro** marca cada etapa sozinho. **↺ Reiniciar** apaga o pedido e começa de novo.

## Publicar (GitHub Pages)

```powershell
git remote add origin https://github.com/<conta>/jessica-mudancas-demo.git
```

```powershell
git push -u origin main
```

No GitHub, abra **Settings → Pages → Deploy from a branch → main / (root)**. Funciona em qualquer hospedagem estática (Netlify, Vercel, Cloudflare Pages), porque não há etapa de build.

### Dados internos

- `js/data-internal.local.js` guarda os **custos reais** informados pela Jéssica (caminhão R$ 800, ajudante e embalador R$ 160, material R$ 2 por caixa). O arquivo está no `.gitignore` e **não vai para a publicação**.
- Sem esse arquivo, o painel usa **custos fictícios** (`js/data.js`) e mostra o aviso “Modo público”. Ao copiar a pasta manualmente para um servidor, não envie esse arquivo.
- Localmente, com o arquivo, a simulação reproduz o caso de referência: subtotal R$ 1.440 → R$ 2.880 com +100%; diferença de R$ 1.530 para o histórico de R$ 2.970.

## O que está simulado

| Na demonstração | Em produção |
|---|---|
| Chat dentro da aplicação, identificado como simulação | WhatsApp Business Platform (Cloud API) ou um BSP (Twilio, Gupshup, 360dialog) com número verificado, webhooks e modelos de mensagem aprovados pela Meta |
| Respostas por regras sobre o pedido | LLM (por exemplo, Claude via API) com ferramentas que leem o pedido, a versão do preço e as regras do painel; temas fora da lista ou exceções vão para uma pessoa, com o contexto |
| Botão “Simular sinal confirmado” | Gateway de pagamento (Mercado Pago, Pagar.me, Asaas ou Stripe) com Pix e cartão, link de pagamento do sinal e webhook que confirma a reserva |
| Parceiro aceita ou recusa por botões | Notificação por WhatsApp ou push com prazo de resposta e passagem automática ao próximo quando o prazo vence |
| Estado no `localStorage` | Banco de dados e API (por exemplo, Supabase ou Postgres com Node), login para Jéssica e parceiros, trilha de auditoria |
| Região pelo nome do bairro | Geocodificação ou CEP para região e distância (Google Maps ou Mapbox) |

**Mensagem do WhatsApp:** no chat, o link **Mensagem do WhatsApp** mostra o texto que sairia do site (código, pacote, valor e resumo). O botão “Abrir no WhatsApp real” abre a conversa com o número da Jéssica que está na prévia.

## Regras implementadas

- O preço do site é o custo de caminhão, equipe e materiais com o acréscimo da prévia (+100% = custo × 2). No painel, dá para simular +60, +70, +80 e +100%.
- O caso de demonstração apresenta o **orçamento de referência de R$ 2.970**. O preço apresentado fica registrado em **versões**. O chat sempre usa a última versão, e uma nova versão registrada no painel avisa o cliente na conversa.
- Vão para **“Solicitar avaliação da equipe”**: viagem sem valor por km, mais de 80 caixas sem valor de caixa extra, mais de 100 caixas, “só escada” acima do 4º andar, volume que pede caminhão maior sem valor cadastrado e dados obrigatórios faltando.
- Distribuição: entram parceiros ativos, com treinamento aprovado, que atendem a região e têm disponibilidade no dia. A oferta vai para um parceiro por vez, por prioridade. Se ninguém for elegível, o pedido aparece como **Decisão da Jéssica**, e ela pode intervir a qualquer momento.
- Três parceiros fictícios: Rota Sul (prioridade 1), Leste Carga & Cuidado (2) e Norte Fácil (3, em treinamento). O cadastro aceita até 10.

## Pendências para confirmar com a Jéssica

- Nota 4,6 no Google e os dois depoimentos vieram da prévia; confirmar antes de publicar.
- Pix ou transferência aparece **sem acréscimo** (valor base). Confirmar.
- Valor por caixa acima de 80, valor por km em viagens, custo do caminhão maior e critérios das mudanças locais (hoje esses casos vão para avaliação manual).
- Associação dos percentuais (+60 a +100%) a porte ou complexidade.
- Outros pacotes além do JA Prestige: a tela de comparação já aceita mais de um.
- Se a área do parceiro precisa de app de loja. Hoje ela funciona no navegador do celular.
- Escopo das entregas para o lançamento em abril ou maio de 2027.

## Estrutura

```
index.html              casca da aplicação
css/styles.css          identidade (azul-marinho, dourado, Playfair Display + Inter)
js/data.js              catálogo, pacotes, parceiros, caso de demonstração, custos fictícios
js/data-internal.local.js  custos reais (fora do Git)
js/pricing.js           calculadora e regras de avaliação
js/store.js             estado, pedidos, versões de preço, distribuição
js/app.js               roteador, barra DEMO, eventos
js/views-*.js           site, orçamento, atendimento, painel, parceiro
assets/img/             fotos reais da prévia
serve.ps1               servidor local para Windows
```
