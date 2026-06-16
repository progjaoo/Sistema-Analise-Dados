# Deploy Hostinger + Locaweb

O procedimento completo está nas seções **Deploy Backend - Hostinger** e **Deploy Frontend - Locaweb** do [README.md](README.md).

Resumo:

1. Execute `npm run db:setup` com as credenciais MySQL de produção.
2. Em banco existente, rode as migrações `002_import_file_download.sql`, `003_remove_clerk_auth.sql` e `004_import_file_path_and_download_logs.sql`.
3. Configure `UPLOAD_STORAGE_DIR` em um diretório persistente no backend.
4. Compile e mantenha `backend/dist/src/server.js` ativo na Hostinger com PM2.
5. Configure Nginx e HTTPS no domínio da API.
6. Configure Resend se for usar envio de e-mails.
7. Gere o frontend com `VITE_API_URL`.
8. Envie o conteúdo de `frontend/dist` para a Locaweb.
