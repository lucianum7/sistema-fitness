import { getEnv } from "./env";

type EmailContent = { subject: string; text: string; html: string };

const BRAND = {
  primary: "#0f8f6a",
  primaryStrong: "#08654d",
  ink: "#171918",
  muted: "#6f7872",
  bg: "#f1f5ef",
  card: "#ffffff",
  line: "#e2e7df",
};

// Renderiza um e-mail HTML responsivo com a identidade do Sistema Fitness.
// Usa estilos inline e tabela (compatível com a maioria dos clientes de e-mail).
function renderBrandedEmail(options: {
  heading: string;
  lead: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const { heading, lead, bodyHtml, cta, footerNote } = options;
  const ctaHtml = cta
    ? `<tr><td style="padding:8px 0 4px;">
        <a href="${cta.url}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:8px;">${cta.label}</a>
      </td></tr>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryStrong});padding:22px 28px;">
          <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Sistema Fitness</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.ink};">${heading}</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:23px;color:${BRAND.muted};">${lead}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${bodyHtml}
            ${ctaHtml}
          </table>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${BRAND.line};">
          <p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.muted};">${footerNote ?? "Você recebeu este e-mail porque tem uma conta no Sistema Fitness."}</p>
        </td></tr>
      </table>
      <p style="max-width:520px;margin:14px auto 0;font-size:11px;color:${BRAND.muted};">© Sistema Fitness · treino, alimentação e evolução</p>
    </td></tr>
  </table>
</body></html>`;
}

function highlightBox(label: string, value: string): string {
  return `<tr><td style="padding:4px 0 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border:1px solid ${BRAND.line};border-radius:10px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};">${label}</p>
        <p style="margin:0;font-size:20px;font-weight:800;font-family:Consolas,Menlo,monospace;color:${BRAND.ink};letter-spacing:1px;">${value}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// E-mail de boas-vindas enviado ao concluir o cadastro (apenas informativo).
export function welcomeEmail(name: string): EmailContent {
  const loginUrl = `${getEnv().APP_URL}/entrar`;
  const subject = "Bem-vindo ao Sistema Fitness 🎉";
  const text = `Olá, ${firstName(name)}!\n\nSua conta no Sistema Fitness foi criada com sucesso. Você tem 2 dias de acesso completo a treino, dieta e acompanhamento.\n\nEntre em: ${loginUrl}\n\nBons treinos!`;
  const html = renderBrandedEmail({
    heading: `Conta criada, ${firstName(name)}! 🎉`,
    lead: "Seu cadastro no Sistema Fitness foi concluído com sucesso.",
    bodyHtml: `<tr><td style="padding:0 0 16px;font-size:15px;line-height:23px;color:${BRAND.ink};">
      Você já tem <strong>2 dias de acesso completo</strong> a treino, dieta, hidratação, sono e evolução. É só entrar e fazer sua avaliação para gerar seus planos.
    </td></tr>`,
    cta: { label: "Acessar o Sistema Fitness", url: loginUrl },
    footerNote: "Se não foi você que criou esta conta, ignore este e-mail.",
  });
  return { subject, text, html };
}

// E-mail com a nova senha gerada pela recuperação de senha.
export function newPasswordEmail(name: string, password: string): EmailContent {
  const loginUrl = `${getEnv().APP_URL}/entrar`;
  const subject = "Sua nova senha do Sistema Fitness";
  const text = `Olá, ${firstName(name)}!\n\nVocê solicitou a recuperação de senha. Geramos uma senha temporária para você:\n\n${password}\n\nEntre em ${loginUrl} e troque a senha em Conta assim que possível.`;
  const html = renderBrandedEmail({
    heading: "Sua nova senha",
    lead: `Olá, ${firstName(name)}! Você solicitou a recuperação de senha. Use a senha temporária abaixo para entrar.`,
    bodyHtml: `${highlightBox("Senha temporária", password)}
      <tr><td style="padding:0 0 16px;font-size:14px;line-height:22px;color:${BRAND.muted};">
        Por segurança, troque a senha em <strong>Conta → Senha</strong> assim que entrar. Se não foi você que pediu, troque sua senha e ignore este e-mail.
      </td></tr>`,
    cta: { label: "Entrar no Sistema Fitness", url: loginUrl },
    footerNote: "Nunca compartilhe sua senha com ninguém.",
  });
  return { subject, text, html };
}

// E-mail de confirmação de pagamento / assinatura ativa.
export function paymentConfirmedEmail(name: string, periodEnd: Date | null): EmailContent {
  const loginUrl = `${getEnv().APP_URL}/painel`;
  const ateText = periodEnd ? ` Seu acesso está liberado até ${periodEnd.toLocaleDateString("pt-BR")}.` : "";
  const subject = "Pagamento confirmado — Sistema Fitness";
  const text = `Olá, ${firstName(name)}!\n\nRecebemos a confirmação do seu pagamento e sua assinatura está ativa.${ateText}\n\nAcesse: ${loginUrl}\n\nBons treinos!`;
  const html = renderBrandedEmail({
    heading: "Pagamento confirmado ✅",
    lead: `Obrigado, ${firstName(name)}! Sua assinatura do Sistema Fitness está ativa.`,
    bodyHtml: `<tr><td style="padding:0 0 16px;font-size:15px;line-height:23px;color:${BRAND.ink};">
      Recebemos a confirmação do seu pagamento.${ateText} Aproveite todos os recursos de treino, dieta e evolução.
    </td></tr>`,
    cta: { label: "Ir para o painel", url: loginUrl },
  });
  return { subject, text, html };
}

// E-mail avisando o aluno que o suporte respondeu o chamado.
export function supportReplyEmail(name: string, ticketSubject: string, reply: string): EmailContent {
  const loginUrl = `${getEnv().APP_URL}/painel`;
  const subject = `Resposta do suporte: ${ticketSubject}`;
  const text = `Olá, ${firstName(name)}!\n\nO suporte do Sistema Fitness respondeu seu chamado "${ticketSubject}":\n\n${reply}\n\nAcesse o app para continuar a conversa: ${loginUrl}`;
  const html = renderBrandedEmail({
    heading: "O suporte respondeu",
    lead: `Olá, ${firstName(name)}! Há uma resposta no seu chamado "${ticketSubject}".`,
    bodyHtml: `<tr><td style="padding:4px 0 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border:1px solid ${BRAND.line};border-radius:10px;">
        <tr><td style="padding:14px 18px;font-size:15px;line-height:23px;color:${BRAND.ink};white-space:pre-wrap;">${reply}</td></tr>
      </table>
    </td></tr>`,
    cta: { label: "Abrir no Sistema Fitness", url: loginUrl },
  });
  return { subject, text, html };
}

// E-mail com um arquivo em anexo (PDF de cardápio/ficha/relatório ou export de dados).
export function exportReadyEmail(name: string, label: string): EmailContent {
  const subject = `${label} — Sistema Fitness`;
  const text = `Olá, ${firstName(name)}!\n\nSegue em anexo: ${label}. Abra pelo seu app de e-mail ou leitor de PDF.\n\nBons treinos!`;
  const html = renderBrandedEmail({
    heading: label,
    lead: `Olá, ${firstName(name)}! O arquivo que você pediu está em anexo.`,
    bodyHtml: `<tr><td style="padding:0 0 16px;font-size:15px;line-height:23px;color:${BRAND.ink};">
      Segue em anexo <strong>${label.toLowerCase()}</strong>. É só abrir pelo app de e-mail ou no seu leitor de PDF.
    </td></tr>`,
    footerNote: "Você recebeu este e-mail porque solicitou este arquivo no Sistema Fitness.",
  });
  return { subject, text, html };
}

// E-mail enviado quando o administrador cria uma conta manualmente.
export function adminWelcomeEmail(name: string, email: string, password: string): EmailContent {
  const loginUrl = `${getEnv().APP_URL}/entrar`;
  const subject = "Seu acesso ao Sistema Fitness";
  const text = `Olá, ${firstName(name)}!\n\nSeu acesso ao Sistema Fitness foi criado.\nE-mail: ${email}\nSenha temporária: ${password}\n\nEntre em ${loginUrl} e troque a senha em Conta.`;
  const html = renderBrandedEmail({
    heading: `Bem-vindo, ${firstName(name)}!`,
    lead: "Seu acesso ao Sistema Fitness foi criado. Use os dados abaixo para entrar.",
    bodyHtml: `<tr><td style="padding:0 0 6px;font-size:14px;color:${BRAND.muted};">E-mail de acesso</td></tr>
      <tr><td style="padding:0 0 14px;font-size:16px;font-weight:700;color:${BRAND.ink};">${email}</td></tr>
      ${highlightBox("Senha temporária", password)}
      <tr><td style="padding:0 0 16px;font-size:14px;line-height:22px;color:${BRAND.muted};">
        Recomendamos trocar a senha em <strong>Conta → Senha</strong> após o primeiro acesso.
      </td></tr>`,
    cta: { label: "Entrar no Sistema Fitness", url: loginUrl },
  });
  return { subject, text, html };
}
