import { Resend } from "resend";
import type { Repository } from "../../types.js";
import { emailTemplates, type EmailBrand } from "./templates.js";

export type EmailTemplate = keyof typeof emailTemplates;

const resendDefaultFrom = "Maravilha FM <onboarding@resend.dev>";

export function createEmailService(repository: Repository, env = process.env) {
  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  const from = env.SMTP_FROM || env.EMAIL_FROM || resendDefaultFrom;
  const appUrl = (env.FRONTEND_PUBLIC_URL || env.FRONTEND_ORIGIN?.split(",")[0] || "http://localhost:5173").replace(/\/$/, "");
  const brand: EmailBrand = { appUrl, logoUrl: env.EMAIL_LOGO_URL || `${appUrl}/brand/maravilha-logo-white.png` };
  const record = (input: Parameters<Repository["recordEmailEvent"]>[0]) => repository.recordEmailEvent(input).catch(() => null);

  return {
    async send(to: string, type: EmailTemplate, ...args: Array<string | number>) {
      const template = (emailTemplates[type] as (brand: EmailBrand, ...values: Array<string | number>) => { subject: string; html: string; text: string })(brand, ...args);
      if (!resend) {
        await record({ type, recipient: to, status: "SKIPPED", error: "RESEND_API_KEY não configurada" });
        return null;
      }
      const { data, error } = await resend.emails.send({ from, to, subject: template.subject, html: template.html, text: template.text });
      await record({ type, recipient: to, status: error ? "FAILED" : "SENT", providerId: data?.id, error: error?.message });
      if (error) throw new Error(`Falha ao enviar email: ${error.message}`);
      return data;
    },
  };
}
