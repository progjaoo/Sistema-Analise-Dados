# Maravilha Audience Intelligence

MVP interno para importar relatórios Ibope/Kantar em Excel e explorar audiência, horários e concorrentes em um dashboard web.

## Executar

1. Instale as dependências com `npm install`.
2. Copie `backend/.env.example` para `backend/.env` e ajuste o segredo JWT.
3. Rode `npm run dev`.
4. Abra `http://localhost:5173` e entre com `admin@maravilhafm.com.br` / `maravilha123`.
5. Envie o relatório `.xlsx` na tela de uploads.

Sem variáveis MySQL, a API usa armazenamento em memória. Para persistência, configure `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`, execute `backend/migrations/schema.sql` e reinicie a API.

## Verificação

```bash
npm test
npm run build
```

## Produção

Consulte [DEPLOY-LOCAWEB.md](DEPLOY-LOCAWEB.md) para publicar o frontend estático, a API Node.js e o MySQL na Locaweb.
