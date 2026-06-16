export type EmailBrand = {
  appUrl: string;
  logoUrl: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const plain = (lines: string[]) => lines.join("\n");

const layout = (brand: EmailBrand, title: string, content: string) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#111217;font-family:Arial,Helvetica,sans-serif;color:#f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111217;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#181A21;border:1px solid #2A2D37;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#D4163C;padding:28px 30px;text-align:center;">
                <img src="${brand.logoUrl}" width="220" alt="Maravilha FM 96.9" style="display:block;margin:0 auto;max-width:220px;width:70%;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 28px;">
                <p style="margin:0 0 10px;color:#F9A8B8;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Painel IBOPE Maravilha FM</p>
                <h1 style="margin:0 0 18px;color:#ffffff;font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1>
                <div style="color:#D8DEE9;font-size:15px;line-height:1.65;">${content}</div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #2A2D37;padding:20px 30px;color:#8892A6;font-size:12px;line-height:1.5;">
                Maravilha FM 96.9<br />
                Este e-mail foi enviado automaticamente pelo sistema. Não responda esta mensagem.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const button = (label: string, url: string) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;">
  <tr>
    <td bgcolor="#D4163C" style="border-radius:12px;">
      <a href="${url}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${label}</a>
    </td>
  </tr>
</table>`;

const alternativeLink = (url: string) => `<p style="margin:18px 0 0;color:#A7B0C0;font-size:13px;">Se o botão não funcionar, copie e cole este link no navegador:</p><p style="word-break:break-all;margin:8px 0 0;"><a href="${url}" style="color:#F9A8B8;">${url}</a></p>`;

export const emailTemplates = {
  welcome: (brand: EmailBrand, name: string, loginUrl: string) => ({
    subject: "Bem-vindo ao Painel IBOPE Maravilha FM",
    text: plain([`Olá, ${name}.`, "Seu cadastro foi criado com sucesso.", `Acesse: ${loginUrl}`]),
    html: layout(brand, "Bem-vindo ao Painel IBOPE Maravilha FM", `<p>Olá, <strong>${escapeHtml(name)}</strong>.</p><p>Seu cadastro foi criado com sucesso. Seu acesso inicial permite visualizar as análises disponíveis no painel.</p>${button("Acessar Sistema", loginUrl)}${alternativeLink(loginUrl)}`),
  }),
  invitation: (brand: EmailBrand, name: string, loginUrl: string) => ({
    subject: "Bem-vindo ao Painel IBOPE Maravilha FM",
    text: plain([`Olá, ${name}.`, "Um administrador criou seu acesso ao Painel IBOPE Maravilha FM.", `Acesse: ${loginUrl}`]),
    html: layout(brand, "Seu acesso está disponível", `<p>Olá, <strong>${escapeHtml(name)}</strong>.</p><p>Um administrador criou seu acesso ao Painel IBOPE Maravilha FM.</p>${button("Acessar Sistema", loginUrl)}${alternativeLink(loginUrl)}`),
  }),
  passwordReset: (brand: EmailBrand, name: string, resetUrl: string) => ({
    subject: "Recuperação de Senha - Painel IBOPE Maravilha FM",
    text: plain([`Olá, ${name}.`, "Recebemos uma solicitação para redefinir sua senha de acesso ao Painel IBOPE Maravilha FM.", "Use o link abaixo para redefinir sua senha. Ele expira em 60 minutos.", resetUrl, "", "Se você não solicitou a recuperação, ignore este e-mail."]),
    html: layout(brand, "Recuperação de senha", `<p>Olá, <strong>${escapeHtml(name)}</strong>.</p><p>Recebemos uma solicitação para redefinir sua senha de acesso ao Painel IBOPE Maravilha FM.</p>${button("Redefinir Senha", resetUrl)}${alternativeLink(resetUrl)}<p style="margin-top:22px;color:#A7B0C0;">Este link expira em 60 minutos. Caso você não tenha solicitado a recuperação, ignore este e-mail.</p>`),
  }),
  importCompleted: (brand: EmailBrand, period: string, count: number) => ({
    subject: `Importação IBOPE concluída: ${period}`,
    text: plain([`Importação IBOPE concluída: ${period}`, `${count} análises foram disponibilizadas no dashboard.`, `Acesse: ${brand.appUrl}`]),
    html: layout(brand, "Importação concluída", `<p>O período <strong>${escapeHtml(period)}</strong> foi processado com sucesso.</p><p>${count} análises foram disponibilizadas no dashboard.</p>${button("Acessar Sistema", brand.appUrl)}`),
  }),
  importFailed: (brand: EmailBrand, file: string, message: string) => ({
    subject: `Falha na importação IBOPE: ${file}`,
    text: plain([`Falha na importação IBOPE: ${file}`, message, `Acesse: ${brand.appUrl}`]),
    html: layout(brand, "Falha na importação", `<p>Não foi possível processar <strong>${escapeHtml(file)}</strong>.</p><p>${escapeHtml(message)}</p>${button("Acessar Sistema", brand.appUrl)}`),
  }),
};
