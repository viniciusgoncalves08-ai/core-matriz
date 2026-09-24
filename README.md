# Core Matriz — Nexus

Core Matriz é a fundação de um sistema operacional pessoal inteligente. O Nexus é a interface central e coordena contexto, memória, modelos, agentes e ações sem exigir que o usuário administre manualmente essa cadeia.

O acompanhamento verificável da especificação está em [docs/PRODUCT_STATUS.md](docs/PRODUCT_STATUS.md). A fundação está em evolução: agentes ainda não executam ferramentas ou ações autônomas.

## Estado atual

A primeira fundação já inclui:

- Next.js + React + TypeScript;
- layout responsivo com prioridade mobile;
- PostgreSQL + Prisma;
- autenticação por e-mail/senha com hash bcrypt;
- sessão HTTP-only assinada;
- conversas e mensagens persistentes;
- chat separado em `/nexus`, com streaming real, Markdown, código, tabelas e interrupção;
- confirmação de resposta completa somente após persistência transacional e auditoria;
- Home autenticada com contagens reais, prazos e projetos recentes;
- provider de IA desacoplado por interface;
- providers OpenAI e Gemini, com geração e streaming;
- Context Engine inicial com recuperação seletiva;
- memória estruturada com histórico/versionamento;
- CRUD de memória com bloqueio, desbloqueio e exclusão lógica;
- tela `/memoria` com criação, edição, busca, filtros e últimos registros de versão;
- histórico `/historico` com até 50 conversas e retomada em URL própria;
- contexto conversacional com as últimas 30 mensagens anteriores;
- Agent Hub com criação, edição, pausa e ativação de agentes;
- conversas com o agente escolhido e retomada preservando sua identidade;
- instruções, modelo e temperatura do agente aplicados à geração;
- auditoria de criação, edição e execução de agentes;
- projetos e tarefas com telas e operações autenticadas;
- objetivos e organizações apenas no schema, ainda sem interfaces;
- auditoria básica das execuções do Nexus;
- teste unitário do Context Engine;
- CI para geração Prisma, testes, typecheck e build.

## Stack

- Next.js 15
- React 19
- TypeScript
- PostgreSQL
- Prisma
- Zod
- bcryptjs
- jose
- Vitest

## Configuração

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Banco e autenticação são necessários para dados pessoais. A chave de IA só é necessária para as respostas do chat; use a do provedor selecionado:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="uma-chave-longa-e-aleatoria"
OPENAI_API_KEY="..."
AI_DEFAULT_PROVIDER="openai"
AI_DEFAULT_MODEL="gpt-5"
NEXT_PUBLIC_APP_NAME="Core Matriz"
```

Nunca coloque chaves reais no repositório.

## Primeiro acesso

Abra `/entrar`, escolha **Criar conta**, informe nome, e-mail e senha com pelo menos oito caracteres. O cadastro cria o usuário e o agente Nexus inicial e estabelece uma sessão HTTP-only.

## Fluxo do Nexus

1. usuário autenticado cria/usa uma conversa;
2. a mensagem chega em `/api/nexus`;
3. a sessão determina o usuário — `userId` não é aceito do cliente;
4. o serviço valida a propriedade da conversa;
5. o Context Engine seleciona memórias, projetos e tarefas relevantes;
6. o provider de IA recebe apenas o contexto selecionado;
7. resposta e mensagens são persistidas;
8. a execução é registrada em auditoria.

## Estrutura

```text
src/
  ai/                    contratos e adapters de modelos
  app/                   páginas e Route Handlers
  features/
    context/             Context Engine
    memory/              memória e versionamento
    nexus/               UI e orquestração central
  lib/                   banco e autenticação
prisma/
  schema.prisma          modelo relacional inicial
```

## APIs implementadas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET|POST /api/conversations`
- `POST /api/nexus` (JSON ou NDJSON com `stream: true`)
- `GET|POST /api/projects` e `PATCH /api/projects/:id`
- `GET|POST /api/tasks` e `PATCH /api/tasks/:id`
- `GET|POST /api/agents` e `PATCH /api/agents/:id`
- `GET|POST /api/memories`
- `PATCH|DELETE /api/memories/:id`

## Qualidade

```bash
npm test
npm run typecheck
npm run build
```

O workflow `.github/workflows/ci.yml` executa essas verificações em pushes e pull requests.

## Próximas fundações

A próxima prioridade é aprofundar o Context Engine, relações de memória, recuperação de conta e proteção contra abuso; depois criar permissões/ferramentas e auditoria consultável. Objetivos e busca global completam a organização. Consulte a matriz de estado antes de considerar uma fase concluída.

Integrações externas não devem exibir sucesso enquanto não houver execução real e credenciais válidas.

## Verificações desta etapa

Testes unitários cobrem continuidade cronológica, recusa de acesso a conversa de outro usuário, preservação de bloqueio na edição e histórico de mudanças de estado. O build não exige banco ativo. Os fluxos reais de cadastro, persistência e resposta da IA precisam de PostgreSQL com schema aplicado e das variáveis de ambiente configuradas; testes unitários usam dependências simuladas.

## Banco na publicação Vercel

A publicação de produção gera o Prisma Client, compila o app e aplica as migrations versionadas com `prisma migrate deploy`. Se a migração falhar, a nova publicação é interrompida. A conexão usa `DATABASE_URL_UNPOOLED` do Neon quando disponível, com fallback para `DATABASE_URL`. Previews não migram o banco compartilhado.

A migration inicial cria o schema em um banco vazio. Bancos já existentes sem histórico de migrations exigem avaliação e baseline; o processo não apaga ou reinicializa dados. O CI valida a criação em PostgreSQL, a segunda execução e a correspondência com o schema.

O Agent Hub está em `/agentes`. Agentes pausados não respondem; o acesso é restrito ao dono. Nesta etapa a seleção é manual e não há ferramentas externas executadas pelos agentes. A execução real depende das credenciais da IA.

## Conexão da IA

`OPENAI_API_KEY` precisa conter uma chave válida da API. Variáveis `AI_DEFAULT_PROVIDER` e `AI_DEFAULT_MODEL` vazias usam `openai` e `gpt-5`. O provider tem timeout de 45 segundos e não aceita respostas vazias como sucesso. Erros retornam códigos estáveis sem copiar o payload do provedor para o usuário.

A integração omite temperatura nos modelos de raciocínio. Compatibilidade do GPT-5: https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.2 (seção de compatibilidade também cobre o GPT-5 original).


### Gemini com cota gratuita

Crie uma chave em https://aistudio.google.com/apikey usando um projeto no Free tier.
Configure no servidor/Vercel (Production e Preview): `GEMINI_API_KEY` com a chave,
`AI_DEFAULT_PROVIDER=gemini` e `AI_DEFAULT_MODEL=gemini-2.5-flash-lite`; publique
novamente para aplicar as variáveis. Não use prefixo NEXT_PUBLIC nem envie a chave ao navegador.
O cadastro de novos agentes Nexus herda o modelo do aplicativo. Ao mudar de provedor,
modelos salvos do outro provedor usam o padrão compatível, sem alterar o registro do agente.

A faixa gratuita depende do modelo e do projeto; consulte os limites ativos no AI Studio.
Mantenha o projeto no Free tier para usar sem cobrança. O aplicativo não controla o plano
de faturamento do Google. Ao esgotar a cota, exibe um aviso e não tenta OpenAI nem repete
a chamada automaticamente. As respostas são limitadas a 2048 tokens.
No plano gratuito, o Google pode usar conteúdo para melhorar seus produtos; evite dados
sensíveis nas conversas e memórias usadas nesse período de testes.

Documentação: https://ai.google.dev/gemini-api/docs/pricing,
https://ai.google.dev/gemini-api/docs/rate-limits e
https://ai.google.dev/gemini-api/docs/openai.


## Protocolo de streaming

`POST /api/nexus` aceita `stream: true`. O cliente recebe linhas JSON: `delta` com
texto do provedor, `done` com a mensagem persistida ou `error` com mensagem segura.
A autenticação e a validação de entrada ocorrem antes de abrir a resposta; falhas
posteriores são eventos de erro. O cliente não interpreta HTTP 200 como sucesso final.
Cancelamento usa AbortSignal; respostas parciais não são persistidas como respostas
completas. A mensagem do usuário permanece no histórico. Se a conexão cair depois da
confirmação no banco mas antes de chegar ao navegador, o histórico é a fonte oficial.
Não há repetição automática da mensagem. Fallback só pode ocorrer antes do primeiro
trecho e apenas para destinos explicitamente configurados; o Nexus usa um único destino.
Timeout do provedor: 45 segundos. Limite da rota: 60 segundos.

Markdown usa react-markdown e remark-gfm, sem HTML bruto; imagens remotas são
substituídas por descrição para não carregar rastreadores. Anexos ainda não existem.

Referências: https://ai.google.dev/gemini-api/docs/openai,
https://developers.openai.com/api/docs/guides/streaming-responses e
https://github.com/remarkjs/react-markdown.

### Atividade e limites de contexto

Em **Histórico → Atividade do Core**, consulte os registros reais de memórias, projetos, tarefas, agentes e respostas. Os filtros e a paginação são aplicados no servidor, por usuário. A tela não reconstrói ações anteriores à implantação da auditoria de memória.

O contexto respeita a validade das memórias e inclui sua origem/confiança. O envio utiliza até 12 mil caracteres serializados de registros e até 16 mil de mensagens anteriores completas, preservando o histórico original no banco. São limites por caracteres, não por tokens. A recuperação ainda é textual e pode não encontrar sinônimos; o Nexus não possui acesso a todos os registros em cada resposta.

Esta entrega utiliza a infraestrutura atual, sem dependências externas novas ou mudança no banco. APIs de IA continuam seguindo a configuração existente.

### Diagnóstico da conexão de IA

`GET /api/ai/status` exige sessão e informa o provedor/modelo efetivamente selecionado, presença das chaves (somente booleanos) e catálogo Gemini quando aplicável. Não retorna chaves nem erros brutos e não gera respostas de IA. O catálogo não garante cota, faturamento ou sucesso de geração. A resposta usa `private, no-store`.

### Gemini: API nativa

O provider Gemini usa `generateContent` e `streamGenerateContent` diretamente, com autenticação por header. Instruções de sistema e histórico são convertidos ao formato nativo. O streaming exige término `STOP`; limites, bloqueios e interrupções não são salvos como respostas completas. A mudança não troca modelos, não adiciona fallback pago e não altera a chave existente.

### Tarefas com confirmação no Nexus

Envie `crie uma tarefa: ligar para o fornecedor` ou `/tarefa ligar para o fornecedor`.
O pedido explícito prepara uma proposta sem chamar o provedor de IA. Revise o título,
o prazo opcional e a prioridade no cartão antes de confirmar. Texto livre ainda não
é interpretado como ação. Datas no título não preenchem o prazo automaticamente.

As propostas expiram em 24 horas e podem ser canceladas. A confirmação autenticada
cria a tarefa e os registros de auditoria na mesma transação; confirmações repetidas
ou simultâneas não duplicam a tarefa. Cada proposta pertence ao dono da conversa.
São mostradas as 30 propostas mais recentes. Criar uma tarefa não agenda notificações.
Esta primeira ferramenta usa metadados versionados da mensagem, sem integração externa
ou um mecanismo genérico de automações.

Os testes de concorrência usam PostgreSQL isolado na CI, com `ACTION_DB_TESTS=true`.
Localmente ficam desativados por padrão; só aceitam banco `core_matriz` em localhost.

### Objetivos

A área `/objetivos` permite criar e editar objetivos com título, descrição, categoria,
prazo por data, progresso manual (0–100%) e um projeto opcional da mesma conta.
Situações: em andamento, pausado, concluído e cancelado. Concluir define 100%;
tarefas do projeto não são alteradas. Reabrir e cancelar ficam disponíveis em Editar.
Não há exclusão permanente nessa primeira versão.

A Home destaca até quatro objetivos em andamento e sinaliza prazos vencidos.
O Context Engine recupera até cinco objetivos relevantes em andamento/pausados,
mantendo o limite total de 12 mil caracteres. A busca ainda é textual.
Criação e edição geram auditoria transacional, acessível em Atividade → Objetivos.
Métricas automáticas, múltiplos projetos por objetivo, vínculos diretos com tarefas
e notificações continuam pendentes. A migração adiciona apenas uma relação opcional;
não apaga registros existentes.
