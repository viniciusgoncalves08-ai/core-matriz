# Core Matriz — Nexus

Core Matriz é a fundação de um sistema operacional pessoal inteligente. O Nexus é a interface central e coordena contexto, memória, modelos, agentes e ações sem exigir que o usuário administre manualmente essa cadeia.

## Estado atual

A primeira fundação já inclui:

- Next.js + React + TypeScript;
- layout responsivo com prioridade mobile;
- PostgreSQL + Prisma;
- autenticação por e-mail/senha com hash bcrypt;
- sessão HTTP-only assinada;
- conversas e mensagens persistentes;
- interface funcional de chat do Nexus;
- provider de IA desacoplado por interface;
- provider inicial OpenAI;
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
- projetos, tarefas, objetivos e organizações no domínio inicial;
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

Variáveis obrigatórias:

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
- `POST /api/nexus`
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

As próximas implementações devem aprofundar, nesta ordem, paginação completa de memória/histórico, coordenação automática de agentes, Model Router com fallback, permissões/confirmation requests, auditoria consultável, projetos/tarefas/objetivos e busca global.

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
