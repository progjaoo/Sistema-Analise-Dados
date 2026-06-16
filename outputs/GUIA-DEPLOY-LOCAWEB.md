# Deploy Hostinger + Locaweb

O procedimento completo está nas seções **Deploy Backend - Hostinger** e **Deploy Frontend - Locaweb** do [README.md](README.md).

Resumo:

1. Execute `npm run db:setup` com as credenciais MySQL de produção.
2. Compile e mantenha `backend/dist/src/server.js` ativo na Hostinger com PM2.
3. Configure Nginx e HTTPS no domínio da API.
4. Configure Clerk, webhook e Resend.
5. Gere o frontend com `VITE_API_URL` e `VITE_CLERK_PUBLISHABLE_KEY`.
6. Envie o conteúdo de `frontend/dist` para a Locaweb.
