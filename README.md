# Sistema de Inteligência de Audiência IBOPE

## Visão Geral

Aplicação para importar relatórios Excel, detectar automaticamente análises tabulares e disponibilizá-las em um dashboard orientado por metadados. Nenhum nome de análise ou emissora é necessário no backend ou frontend.

Stack:

- Backend: Node.js, Express, TypeScript e MySQL.
- Frontend: React, TypeScript, Vite, Tailwind e Recharts.
- Identidade: autenticação local por email/senha.
- Email transacional: Resend.
- Produção: API na Hostinger e frontend estático na Locaweb.

## Arquitetura

Fluxo principal:

```text
Excel -> parser genérico -> metadados + JSON -> MySQL -> API genérica -> renderizador React
```

Pastas relevantes:

```text
backend/src/parsers/             detecção de tabelas, tipos e visualizações
backend/src/repositories/        persistência MySQL e implementação em memória
backend/src/services/email/      provider Resend e templates
backend/migrations/              estrutura dinâmica do banco
frontend/src/components/         layout e renderizador genérico
frontend/src/pages/              dashboard, importações, usuários e autenticação
```

## Banco de Dados

Tabelas principais:

- `users`: usuários locais, permissões e status.
- `analysis_imports`: histórico dos arquivos importados.
- `analysis_types`: nome, slug, visualização, schema e filtros detectados.
- `analysis_data`: uma linha JSON por registro importado.
- `import_logs`: etapas, avisos e erros da importação.
- `import_download_logs`: auditoria de downloads das planilhas originais.
- `password_reset_tokens`: tokens de recuperação armazenados como SHA-256.
- `email_events`: auditoria dos envios pelo Resend.

Para criar ou atualizar a estrutura e executar os seeds:

```bash
cp backend/.env.example backend/.env
# preencher DB_* e SEED_DEFAULT_PASSWORD
npm run db:setup
```

Em banco já existente, importe `backend/migrations/001_dynamic_architecture.sql` ou execute `backend/migrations/schema.production.sql`, depois rode as migrações incrementais aplicáveis:

- `002_import_file_download.sql`
- `003_remove_clerk_auth.sql`
- `004_import_file_path_and_download_logs.sql`

Depois rode:

```bash
npm run create-admin -w backend
```

As tabelas antigas não são consultadas pela nova API. Faça backup antes de removê-las.

## Fluxo de Importação

1. O usuário `ADMIN` ou `ANALYST` envia um `.xlsx` e informa o período.
2. Todas as abas são lidas, exceto abas cujo nome começa com `__` e a aba de configuração.
3. O parser localiza a linha de cabeçalho e elimina colunas vazias de formatação.
4. Cabeçalhos agrupados/mesclados são normalizados para o formato longo quando necessário.
5. Colunas são classificadas como dimensão ou métrica.
6. Filtros e visualização são inferidos.
7. `analysis_types` é atualizado pelo `slug` e as linhas são gravadas em `analysis_data`.
8. O arquivo original é salvo em `UPLOAD_STORAGE_DIR` e o caminho é persistido.
9. Logs e totais são registrados e o usuário recebe uma notificação.

### Download da Planilha

Usuários autenticados podem baixar a planilha original pelo histórico de importações. A API valida se o arquivo ainda existe no servidor antes de responder; se não existir, o frontend exibe uma mensagem amigável.

Cada download é registrado em `import_download_logs` com importação, usuário, IP, user-agent e data.

### Configuração pelo Excel

É possível criar uma aba chamada `CONFIG ANALISES` com as colunas:

| aba ou slug | nome | descricao | tipo_visualizacao | ordem |
|---|---|---|---|---|
| participacao-por-regiao | Participação por Região | Distribuição geográfica | pie | 10 |

Valores aceitos em `tipo_visualizacao`: `table`, `line`, `bar`, `area`, `pie` e `kpi`. Se a aba não existir, tudo é inferido automaticamente.

## Dashboard Dinâmico

O frontend consulta:

- `GET /api/imports`
- `GET /api/analyses?import_id=ID`
- `GET /api/analyses/:slug/data?import_id=ID`

O menu é montado a partir de `analysis_types`. O registro de renderizadores suporta tabela, linha, barra, área, pizza e cards KPI. Colunas de baixa cardinalidade viram filtros automaticamente.

Adicionar uma nova aba tabular ao Excel não exige alteração de código ou novo deploy.

## Autenticação

O sistema usa apenas autenticação local por email e senha.

Fluxo:

1. O usuário informa email e senha em `/login`.
2. A API valida `password_hash` com bcrypt.
3. A API emite um JWT assinado com `JWT_SECRET`.
4. O frontend guarda o token localmente e envia `Authorization: Bearer`.
5. Rotas protegidas usam o middleware local de JWT.

Administradores criam novos usuários em `/users`. Recuperação de senha usa tokens SHA-256 na tabela `password_reset_tokens`.

Cadastro público:

- frontend: `/register`;
- API: `POST /api/auth/register`;
- campos: nome, email, senha e confirmação;
- perfil criado automaticamente: `VIEWER`;
- o usuário não escolhe nem altera seu próprio perfil.

## Resend

O serviço `backend/src/services/email` possui templates reutilizáveis para:

- boas-vindas;
- convites;
- recuperação de senha;
- importação concluída;
- falha de importação.

Defina `RESEND_API_KEY` e um remetente de domínio verificado em `EMAIL_FROM`. Sem chave, o sistema continua funcionando e registra o evento como `SKIPPED`.

Os templates usam layout dark, cor principal `#D4163C`, logo no topo, botões destacados e link alternativo.
Consulte [Resend para Node.js](https://resend.com/docs/send-with-nodejs). A documentação oficial exige API key e domínio verificado.

## Seeds

O seed usa `bcrypt` com custo 12 em tempo de execução. Nenhuma senha em texto puro é armazenada no SQL ou no repositório.

Contas padrão configuráveis:

- `ti@grupogtf.com.br`: `ADMIN`.
- `edson.albertassi@grupogtf.com.br`: `ANALYST`.
- `leonardo.salles@grupogtf.com.br`: `ANALYST`.

Defina a senha inicial em `SEED_DEFAULT_PASSWORD`. Os emails de Edson e Leonardo foram assumidos pelo padrão corporativo e podem ser alterados em `SEED_EDSON_EMAIL` e `SEED_LEONARDO_EMAIL`.

## Administração

Administradores acessam `/users` e podem:

- criar usuário local com email, senha e perfil;
- atribuir `ADMIN`, `ANALYST` ou `VIEWER`;
- ativar e desativar usuários;

Permissões:

- `ADMIN`: usuários, importação e exclusão.
- `ANALYST`: importação e consulta.
- `VIEWER`: somente consulta.

## Variáveis de Ambiente

Backend, em `backend/.env`:

```dotenv
NODE_ENV=production
PORT=3001
FRONTEND_ORIGIN=https://grupogtf.com.br/ibopemedia
FRONTEND_PUBLIC_URL=https://grupogtf.com.br/ibopemedia
JWT_SECRET=segredo-aleatorio
UPLOAD_STORAGE_DIR=uploads/imports
DB_HOST=host
DB_PORT=3306
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=ibopebank
RESEND_API_KEY=re_...
EMAIL_FROM=Maravilha FM <sistema@seudominio.com.br>
EMAIL_LOGO_URL=https://grupogtf.com.br/ibopemedia/brand/maravilha-logo-white.png
SEED_DEFAULT_PASSWORD=senha-inicial
```

Frontend, em `frontend/.env.production`:

```dotenv
VITE_API_URL=https://api.seudominio.com.br/api
```

Variáveis `VITE_*` são públicas e incorporadas ao build. Chaves secretas pertencem somente ao backend.

## Desenvolvimento

```bash
npm install
npm run dev
```

Endereços:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
- health check: `http://localhost:3001/api/health`

Validação:

```bash
npm run typecheck
npm test
npm run build
```

Sem `DB_HOST`, a API usa memória e cria os três usuários de desenvolvimento a partir do seed configurado no `.env`.

## Deploy Backend - Hostinger

Recomendado: VPS Ubuntu com Node.js LTS, Nginx, MySQL acessível e PM2. A Hostinger documenta o uso de VPS, SSH e templates Node.js em [How to install Node.js on Ubuntu](https://www.hostinger.com/tutorials/how-to-install-nodejs-ubuntu).

No servidor:

```bash
git clone URL_DO_REPOSITORIO maravilha-ibope
cd maravilha-ibope
npm ci
cp backend/.env.production.example backend/.env
# preencher backend/.env
npm run db:setup
npm run build -w backend
mkdir -p backend/logs
npm install -g pm2
cd backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Nginx:

```nginx
server {
    server_name api.seudominio.com.br;
    client_max_body_size 25M;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative HTTPS, libere somente portas necessárias e valide:

```bash
curl https://api.seudominio.com.br/api/health
pm2 logs maravilha-ibope-api
```

## Deploy Frontend - Locaweb

Na máquina de build:

```bash
cp frontend/.env.production.example frontend/.env.production
# preencher URL da API
npm ci
npm run build -w frontend
```

Envie o conteúdo de `frontend/dist` para a raiz pública do domínio/subdomínio. O `.htaccess` incluído no build redireciona rotas React para `index.html`.

Configure:

- DNS do frontend para a Locaweb;
- DNS da API para a Hostinger;
- HTTPS nos dois serviços;
- `FRONTEND_ORIGIN` exatamente com a URL pública do frontend.

## Troubleshooting

### `ERR_INVALID_PACKAGE_CONFIG`

Reinstale pela raiz. Se o cache global estiver com permissões incorretas:

```bash
npm install --cache /tmp/maravilha-npm-cache
```

### API retorna `MemoryRepository`

As variáveis `DB_HOST`, `DB_USER` ou `DB_NAME` não foram carregadas. Confira `backend/.env` e reinicie o PM2.

### Erro CORS

Confira `FRONTEND_ORIGIN`, protocolo HTTPS e ausência de barra final. Múltiplas origens devem ser separadas por vírgula.

### Resend não envia

Verifique domínio, DNS, remetente em `EMAIL_FROM`, API key e registros em `email_events`.

### Nova aba não aparece

A aba precisa ter uma tabela com cabeçalho e pelo menos uma linha. Consulte os avisos retornados no upload e `import_logs`.

## Roadmap Futuro

- comparação entre múltiplos períodos;
- editor administrativo de metadados e visualizações;
- processamento assíncrono de arquivos grandes;
- armazenamento de arquivos em object storage;
- exportação PDF e agendamento de relatórios;
- testes end-to-end do fluxo de login e permissões.
