# Core Matriz — confronto com o prompt mestre

Este documento descreve capacidades implementadas, não promessas de execução.
Base: prompt mestre reenviado em 15/09/2026 e código do repositório.
A correção posterior do usuário prevalece: Home contém dados e atalhos; chat fica em `/nexus`.
Sem Lovable. Provedores de IA são integrações do produto, não desenvolvedores externos.

## Matriz de implementação

| Área / requisitos | Estado verificável | Falta para atender o prompt |
| --- | --- | --- |
| Fundação, banco e deploy (3–5, 53, 55, 65–66) | Next.js, React, TypeScript, Prisma/PostgreSQL, migration inicial, CI e publicação Vercel | Expandir testes de navegador e observabilidade; manter gates em cada entrega |
| Autenticação (51–52) | Cadastro, login, sessão HTTP-only, hash de senha, API de logout, consultas por usuário | Recuperação de senha, configurações e logout visível, rate limiting e revisão de abuso |
| Chat (6–8) | Rota própria, histórico persistente, continuidade, streaming OpenAI/Gemini, Markdown, código, tabelas, estado de erro e interrupção | Anexos, pesquisa de conversas e ferramentas além de propostas explícitas de tarefa |
| Identidade (7) | Nome e instruções editáveis no agente | Configuração central de nome/avatar/voz/proatividade; ainda existem textos Nexus fixos |
| Memória (9–12) | Classificação, conteúdo, resumo, origem, importância, confiança, bloqueio, edição e versões, exclusão lógica | Relações com entidades, tags na UI, marcar incorreta, validade completa, inferência com evidências, paginação e extração controlada pelo Nexus |
| Context Engine (13) | Filtros textuais por usuário, validade temporal da memória, origem/confiança e objetivos relevantes, até 12 mil caracteres serializados de contexto e até 16 mil de histórico recente | Intent Engine, entidades, ranking híbrido, orçamento por tokens exatos, relações e arquivos; busca ainda lexical, sem compreensão semântica |
| Busca / embeddings (14–15) | Busca local nas listas de memória, projeto e tarefa | Busca global no servidor, períodos/entidades, full-text e busca semântica; pgvector ainda não instalado |
| Agent Hub (16–19) | Criar/editar, pausar/ativar, prompt/modelo/temperatura e conversa individual com identidade persistente | Coordenação automática pelo Nexus, execuções encadeadas, catálogo de ferramentas/permissões e painel de execuções |
| Providers / Router (20–23) | Interface comum generate/stream/healthCheck; OpenAI/Gemini; fallback técnico explícito, sem misturar streams | Anthropic, embeddings/toolCall, seleção por capacidades/custo e orçamento; nenhuma troca paga automática no fluxo atual |
| Permissões / ações / tools (24–26) | Propostas de tarefa por comando explícito, confirmação autenticada, cancelamento, expiração, idempotência e auditoria | Motor genérico de permissões e novas ferramentas. Não há ferramentas externas funcionando |
| Projetos / tarefas (27–30) | Telas, APIs, vínculo tarefa–projeto, prazos, prioridade, situações, arquivo/restauração de projeto, auditoria | Responsáveis, tags, dependências, relações, histórico visível, criação por intenção e políticas para tarefas implícitas |
| Objetivos (31) | Cadastro/edição, progresso manual, situações, prazo, vínculo opcional a projeto, auditoria, Home e contexto do Nexus | Métricas automáticas, múltiplos projetos/tarefas, histórico detalhado de campos e notificações |
| Eventos / automações / proatividade (32–34) | Sem implementação operacional | Eventos persistidos, processador, regras confirmadas, notificações, cooldown, relevância e histórico |
| Auditoria (35) | Registros de Nexus, agentes, projetos, tarefas e memória; gravação transacional; tela `/atividade` com filtros e paginação | Permissões, consulta dos registros pelo Nexus e parâmetros/autorização estruturados; registros antigos de memória não foram reconstruídos |
| Empresas / Vivessence / AutoShow (36–38) | Modelo Organization genérico | CRUD, relações de negócio e adaptadores reais; sem API de estoque/vendas conectada |
| Calendar / arquivos / links (39–41) | Não implementados | OAuth, storage, validação de upload, processamento, links e permissões de execução |
| Veículos / finanças / smart home (42–44) | Não implementados | Domínios posteriores; sem alertas ou integração simulada |
| Canais / voz (45–46, 59) | Web responsiva | Voz, Telegram, WhatsApp e e-mail dependem de integrações futuras |
| Home (47–50) | Módulos, contagens reais, tarefas abertas/atrasadas projetos recentes e objetivos com progresso/prazo; navegação mobile | Notificações confirmadas e insights fundamentados. Contagem de atraso não é motor proativo |

## Critério de estado

- Tabela no schema não significa domínio entregue.
- Provider implementado não significa que uma chave real esteja configurada ou que a resposta ao vivo foi validada.
- Testes de streaming usam respostas simuladas apenas nos testes; produção só consome provedores reais.
- Fase 1 ainda parcial pelas lacunas de memória/contexto, segurança e confirmação descritas acima.
- Fase 2 parcial: projetos, tarefas, histórico e resumo; inclui objetivos básicos; faltam notificações e busca global.
- Fases 3–5 não estão entregues. Não há automação, execução multiagente nem integração externa fingida.

## Ordem de continuidade

1. Fechar contexto e memória: validade, limites, relevância, relações e origem; melhorar autenticação/abuso.
2. Ferramentas internas e Permission Engine: uma ação real por vez, confirmação, execução idempotente e auditoria consultável.
3. Objetivos, busca global e notificações internas ligadas a eventos reais.
4. Intent Engine e orquestração progressiva de agentes usando as ferramentas verificadas.
5. Integrações reais: arquivos/web/Calendar, depois empresas. Credenciais somente quando necessárias para ativação.
6. Novos canais e voz depois da base de permissões e execução estar verificada.

## Validação desta alteração

Testes de fragmentação de rede/UTF-8, fim prematuro, cota, fallback antes/depois de deltas,
confirmação de persistência, proteção de Markdown e isolamento dos dados no resumo.
TypeScript, testes e build são gates. Autenticação e páginas publicadas são conferidas
separadamente da validação de resposta ao vivo de IA.

## Continuidade — contexto e atividade

- Contexto recuperado limitado por caracteres serializados, com reserva para memória, projetos e tarefas; não equivale a contagem exata de tokens. Campos extensos são resumidos por corte e o prompt informa que os dados podem estar incompletos.
- Histórico enviado à IA limitado a mensagens completas recentes; mensagens originais permanecem no banco. Respostas sem a pergunta correspondente são removidas do trecho recuperado.
- Mensagens sem termos relevantes não recuperam registros arbitrários. Memórias futuras, vencidas, bloqueadas, substituídas e excluídas não entram na consulta. A busca lexical ainda pode não encontrar sinônimos e perguntas genéricas.
- Origem, classificação e confiança acompanham as memórias recuperadas. Isso não é uma garantia contra injeção de prompt nem um Permission Engine.
- Atividade autenticada: filtros por área/resultado, 25 registros por página, datas em Brasília; erros técnicos e metadata bruta não são exibidos.
- Criação, edição, bloqueio, desbloqueio e exclusão de memória registram auditoria na mesma transação; nenhum conteúdo privado é duplicado no log.
- Nenhuma nova API paga, serviço ou migration necessária. Integrações externas avaliadas ficam para etapas posteriores.
