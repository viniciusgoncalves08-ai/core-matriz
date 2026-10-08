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

### Projetos pelo Nexus

Envie `crie um projeto: nome`, `registre um projeto: nome` ou `/projeto nome`.
O cartão permite revisar nome, descrição e situação inicial (ideia, planejamento ou ativo).
Somente a confirmação cria o projeto, com auditoria e link para a página do projeto.
O comando explícito não chama um provedor de IA.

Tarefas e projetos compartilham o fluxo de confirmação: vínculo ao usuário da conversa,
validade de 24 horas, cancelamento e execução transacional idempotente. A ferramenta
é determinada pela proposta salva; o cliente não pode trocá-la na confirmação.
A proteção impede duplicar a mesma proposta, mas pedidos novos podem criar projetos
com nomes iguais. Propostas antigas de tarefa continuam compatíveis.

A criação não gera tarefas automáticas, acompanhamento proativo nem notificações.
A edição pelo chat está descrita a seguir.

### Edição de projetos pelo Nexus

Envie `edite o projeto: nome completo` ou `/editar-projeto nome completo`.
A busca usa nome exato, sem diferenciar maiúsculas/minúsculas, dentro da conta.
Também aceita o identificador que aparece no endereço da página do projeto.
Nomes ambíguos não são resolvidos por adivinhação.

O cartão carrega nome, descrição e situação atuais. Edite os campos e confirme.
O alvo fica fixado na proposta pelo servidor; a confirmação não aceita trocar o ID.
A execução verifica se o projeto ainda pertence à conta e se não foi alterado desde
a proposta. Se mudou, nada é sobrescrito: envie um novo pedido para revisar os dados.
A proposta expira em 24 horas, pode ser cancelada e a repetição da confirmação não
repete a alteração. A atualização e a auditoria são gravadas na mesma transação.

Concluir/arquivar o projeto não altera tarefas ou objetivos vinculados.
Este fluxo não envia lembretes nem acompanha o projeto automaticamente.

### Recuperação de conversas anteriores

O Nexus consulta memórias estruturadas e também trechos relevantes do histórico persistido,
inclusive de outras conversas da mesma conta. A busca textual considera variações simples
de plural e vocabulário de leitura; não é busca semântica por embeddings.
Uma pergunta curta de continuidade pode aproveitar o assunto das três últimas mensagens
do usuário na conversa atual. Saudações não disparam uma leitura geral do histórico.

A busca considera até 24 mensagens correspondentes, seleciona até seis trechos com origem,
papel e data, e os encaixa no orçamento total de 12 mil caracteres do contexto. Conversas
vinculadas a memórias bloqueadas, excluídas ou substituídas são excluídas dessa recuperação.
O histórico recente da conversa atual continua separado. As respostas são orientadas a citar
a conversa de origem e a tratar textos antigos do assistente como histórico, não fatos.

Nenhum resultado encontrado não significa nenhum dado salvo. A ausência de memória
estruturada não apaga conversas. Não há extração automática de fatos para a tabela de
memórias nesta versão; cadastro/correção/bloqueio continuam na área Memória.

### Memória pelo Nexus
Envie `lembre que prefiro ler à noite`, `salve na memória: conteúdo` ou `/memoria conteúdo`. Revise o texto e a classificação no cartão e confirme. A proposta expira em 24 horas; cancelamento não grava memória. O salvamento é transacional e idempotente por proposta, com conversa de origem, versão inicial e auditoria. A área Memória permite editar, bloquear e excluir. Este fluxo não extrai fatos automaticamente nem substitui memórias anteriores por similaridade; uma nova proposta pode criar uma memória distinta.

### Resumo do dia
A Home mostra tarefas abertas atrasadas ou com prazo hoje, objetivos ativos com prazo vencido ou nos próximos sete dias (hoje e seis dias seguintes), e projetos ACTIVE. Datas seguem Brasília; limites de 6 tarefas, 4 objetivos e 4 projetos são explícitos. No Nexus, `bom dia`, `boa tarde`, `boa noite` ou `resumo do dia` consultam os mesmos dados sem chamar IA, salvando o resumo datado na conversa e auditoria. Não há notificações, voz ou integrações externas neste fluxo. Falha de consulta não é apresentada como ausência de dados.

### Voz no Nexus
Os controles Ditar mensagem e Ouvir última resposta usam as APIs de voz do navegador, com pt-BR. O ditado preenche o rascunho para revisão; nunca envia automaticamente. O microfone só inicia por clique, para após resultado/erro/30 segundos e ao ocultar a página. Leitura pode ser interrompida e limita o texto a 6.000 caracteres e três minutos. Sem wake word, escuta em segundo plano ou nova API paga. O navegador pode processar áudio em serviços remotos próprios; disponibilidade, vozes e conectividade dependem do dispositivo. Sem suporte, o chat de texto continua funcionando. Áudio real exige verificação no dispositivo do usuário.

Em Configurações, escolha uma voz do navegador, velocidade e tom, com prévia. Preferências ficam neste navegador (não sincronizadas entre aparelhos). Se a voz selecionada desaparecer, a leitura volta a uma opção em português disponível. Voz neural personalizada de terceiros ainda não está integrada.

### Edição de tarefas pelo Nexus
Envie `edite a tarefa: título completo` ou `/editar-tarefa título completo`. O cartão permite revisar título, prazo, prioridade e situação (incluindo concluída). Só a confirmação salva, com auditoria, isolamento por usuário, execução única e proteção contra alterações posteriores à proposta. Títulos duplicados exigem diferenciação na página Tarefas. Não ativa notificações.

Consultas diretas no Nexus: `minhas tarefas`, `tarefas atrasadas` e `tarefas sem prazo`. Retornam até 20 tarefas próprias em aberto, total e prazos, sem chamada à IA. Resposta salva na conversa e consulta auditada; não agenda notificações.

### Pedidos naturais de memória
Além de `lembre que`, o Nexus aceita `guarde que`, `pode guardar que` e `quero que você lembre que`, com conteúdo explícito. O cartão sugere preferência, decisão, objetivo ou hipótese por regras conservadoras; caso contrário mantém contexto. O usuário revisa conteúdo/classificação e confirma antes de salvar. Não há extração automática de toda conversa nem resolução automática de referências como “guarde isso”.

### Recuperação de perfil
Perguntas gerais como “me conte o que você sabe sobre mim” e “liste minhas memórias” recuperam até oito memórias ativas e válidas do próprio usuário sem filtrar pelas palavras do pedido. Perguntas sobre assuntos específicos mantêm a busca textual. O orçamento de contexto continua limitado: a resposta não representa um inventário completo de tudo que foi salvo.

`Liste minhas memórias` e perguntas gerais de perfil agora retornam uma consulta direta ao banco, sem chamada à IA: total de memórias ativas/válidas, até 20 registros e trechos de até 500 caracteres. Registros bloqueados, excluídos, substituídos, vencidos ou futuros ficam fora. A resposta é salva no histórico e auditada. Perguntas específicas continuam usando o Context Engine.

Histórico: busca no servidor por título e conteúdo das mensagens de todas as conversas próprias, com contagem total e páginas de 20 resultados. Interface responsiva com estados de busca, vazio e erro. Resultados não são compartilhados entre usuários nem armazenados em cache público.

### Busca e revisão de memória
Em `/memoria`, pesquise conteúdo, resumo ou origem; combine categoria e situação e pressione **Buscar**. A consulta abrange todo o acervo do usuário, em páginas de 20 memórias. Edição, bloqueio, exclusão e versões continuam disponíveis nos resultados. Memórias excluídas ficam fora da lista; bloquear impede o uso no contexto. Não utiliza créditos de IA.

### Captura automática inicial de preferências
No chat principal, uma opção desativada por padrão permite capturar frases curtas em primeira pessoa começando com “prefiro” (até 300 caracteres), sem chamada adicional de IA. A opção vale para a tela/conversa atual e desativa ao recarregar ou iniciar outra. Não captura respostas do modelo, mensagens de agentes especializados nem comandos que seguem pelo fluxo de confirmação. Perguntas, múltiplas frases e alguns indicadores de informação sensível são descartados por regras conservadoras; não é um classificador completo de dados sensíveis.

A gravação ocorre na transação da resposta concluída, com origem, mensagem de origem, versão e auditoria. Uma indicação persistente no chat informa que houve captura e leva à Memória para revisar, bloquear ou excluir. Duplicatas exatas (ignorando maiúsculas/minúsculas), inclusive bloqueadas/excluídas, não são recriadas. Preferências reformuladas ou contraditórias ainda não são conciliadas. Isso não substitui extração semântica geral, configuração sincronizada entre dispositivos ou detecção de contradições.

### Preferência de memória na conta
Configurações agora permite salvar o padrão de captura de preferências explícitas na conta. UserSettings é opcional por usuário, com autoMemory=false por padrão; leitura/escrita autenticadas em /api/settings/memory, sem cache público, com auditoria transacional. A migration 202610080001_memory_settings é aditiva e não ativa a captura para usuários existentes.

O chat carrega o padrão da conta. Alterar o checkbox no chat é uma escolha temporária, que prevalece apenas na conversa/tela atual; recarregar ou iniciar outra conversa volta ao padrão da conta. Sem override, o servidor consulta o padrão novamente. Falha na leitura do padrão não ativa a captura nem interrompe a resposta. Desativar não exclui registros existentes. A extração continua limitada às preferências explícitas suportadas anteriormente.
