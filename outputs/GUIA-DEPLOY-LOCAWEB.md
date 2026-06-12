# Publicação na Locaweb

Este guia considera a seguinte arquitetura de produção:

- `https://painel.seudominio.com.br`: frontend React, publicado como arquivos estáticos da pasta `frontend/dist`.
- `https://api.seudominio.com.br`: backend Node.js/Express, executado continuamente em um VPS ou serviço compatível com Node.js.
- MySQL Locaweb: acessado somente pelo backend.

O frontend não pode acessar o MySQL diretamente. Publicar somente `dist` e o banco deixará login, uploads e dashboards sem funcionamento.

## 1. Confirmar o produto contratado

A hospedagem compartilhada pode servir os arquivos estáticos do frontend. Para a API, confirme no painel ou com o suporte se o plano mantém uma aplicação Node.js em execução. Caso contrário, use um VPS Locaweb para a API.

A Locaweb informa suporte a aplicações Node.js, MySQL/MariaDB, Nginx e acesso root nos planos VPS. Consulte:

- [Servidor VPS Locaweb](https://www.locaweb.com.br/servidor-vps/)
- [Hospedagem de sites](https://www.locaweb.com.br/hospedagem-de-sites-com-dominio-gratis/)

## 2. Criar e importar o banco

1. Crie o banco e o usuário MySQL no painel Locaweb.
2. Anote host, porta, banco, usuário e senha. O host não deve ser presumido como `localhost`; use o valor fornecido pela Locaweb.
3. No phpMyAdmin, selecione o banco criado e importe `backend/migrations/schema.production.sql`.
4. Se o banco restringir conexões externas, autorize o IP do VPS ou mantenha API e MySQL na rede permitida pelo produto.
5. Não exponha a porta MySQL publicamente sem restrição de origem.

O arquivo de produção não contém `CREATE DATABASE` nem `USE`, pois esses comandos costumam ser bloqueados em hospedagens gerenciadas.

## 3. Publicar a API

No VPS, envie ou clone o projeto e execute na raiz:

```bash
npm ci --omit=dev -w backend
cp backend/.env.production.example backend/.env
```

Edite `backend/.env`:

```dotenv
NODE_ENV=production
PORT=3001
FRONTEND_ORIGIN=https://painel.seudominio.com.br
JWT_SECRET=um-segredo-longo-e-aleatorio
ALLOW_DEMO_LOGIN=false
DB_HOST=host-fornecido-pela-locaweb
DB_PORT=3306
DB_USER=usuario-do-banco
DB_PASSWORD=senha-do-banco
DB_NAME=nome-do-banco
DB_SSL=false
```

Gere um segredo JWT, por exemplo, com `openssl rand -hex 32`. Ative `DB_SSL=true` somente se a Locaweb exigir TLS na conexão MySQL.

### Criar o primeiro administrador

Preencha `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `backend/.env` e execute:

```bash
npm run create-admin -w backend
```

Em produção, a credencial local de demonstração fica desativada. Depois de criar o administrador, remova `ADMIN_PASSWORD` do arquivo `.env` ou deixe-a vazia.

### Manter o processo ativo

Uma opção comum em VPS é PM2:

```bash
npm install -g pm2
pm2 start backend/src/server.js --name maravilha-api
pm2 save
pm2 startup
```

Execute também o comando adicional exibido por `pm2 startup`.

### Proxy reverso Nginx

Direcione o subdomínio da API para `127.0.0.1:3001`:

```nginx
server {
    server_name api.seudominio.com.br;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Emita o certificado SSL e teste:

```bash
curl https://api.seudominio.com.br/api/health
```

A resposta esperada contém `"status":"ok"` e `"storage":"MysqlRepository"`. Se aparecer `MemoryRepository`, as variáveis MySQL não foram carregadas.

## 4. Gerar o frontend de produção

Na máquina de desenvolvimento, na raiz do projeto:

```bash
cp frontend/.env.production.example frontend/.env.production
```

Edite o arquivo:

```dotenv
VITE_API_URL=https://api.seudominio.com.br/api
```

Gere a versão final:

```bash
npm ci
npm run build
```

O endereço da API é incorporado ao JavaScript durante o build. Alterar `.env.production` depois exige executar o build novamente.

## 5. Enviar a pasta `dist`

1. Abra o FTP da hospedagem com FileZilla ou o gerenciador de arquivos.
2. Envie o conteúdo interno de `frontend/dist`, não a pasta `dist` como um nível adicional, para a raiz pública do subdomínio.
3. Confirme o envio do arquivo oculto `.htaccess`. Ele redireciona rotas do React, como `/dashboard`, para `index.html`.
4. Não envie `backend/.env`, código da API, planilhas ou credenciais para a raiz pública.

Ajuda oficial:

- [Usar FileZilla na hospedagem](https://www.locaweb.com.br/ajuda/wiki/como-usar-o-filezilla-hospedagem-de-sites/)
- [Configurar entradas DNS](https://www.locaweb.com.br/ajuda/wiki/como-criar-as-entradas-de-dns-na-zona-de-dns-hospedagem-de-sites-2/)
- [Emitir certificado Let's Encrypt](https://www.locaweb.com.br/ajuda/wiki/como-emitir-o-certificado-lets-encrypt-hospedagem-de-sites/)

## 6. DNS e HTTPS

Crie os registros para `painel` e `api` apontando para os respectivos serviços. Emita certificados HTTPS para ambos antes do teste final. `FRONTEND_ORIGIN` deve corresponder exatamente à URL pública, sem caminho adicional.

Se também usar `www` ou outro domínio para o frontend, separe as origens por vírgula:

```dotenv
FRONTEND_ORIGIN=https://painel.seudominio.com.br,https://www.seudominio.com.br
```

## 7. Validação de produção

1. Abra diretamente `https://painel.seudominio.com.br/login` e atualize a página; ela não deve retornar 404.
2. Entre com o administrador criado.
3. Envie uma planilha `.xlsx` válida.
4. Confirme que o upload aparece no histórico e que os gráficos carregam.
5. Saia e entre novamente para validar JWT e CORS.
6. Verifique os logs com `pm2 logs maravilha-api`.
7. Reinicie o VPS e confirme que a API volta automaticamente.

## 8. Ordem recomendada para a migração

1. Criar e importar o MySQL.
2. Publicar a API e validar `/api/health`.
3. Criar o administrador de produção.
4. Configurar DNS e HTTPS da API.
5. Gerar o frontend com `VITE_API_URL` definitivo.
6. Enviar o conteúdo de `dist` e configurar HTTPS do frontend.
7. Executar a validação completa antes de divulgar o endereço.

Mantenha uma cópia da versão anterior de `dist` e faça backup do banco antes de cada atualização estrutural. Para atualizar o frontend, gere um novo build e substitua os arquivos estáticos. Para atualizar a API, envie o código, execute `npm ci --omit=dev -w backend` e depois `pm2 restart maravilha-api`.
