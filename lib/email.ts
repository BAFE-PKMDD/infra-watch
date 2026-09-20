import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST;
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.MAIL_PORT ?? 587);
  const secure = port === 465;
  // Port 587 (Gmail and most SMTP relays) connects plain then upgrades via STARTTLS —
  // requireTLS makes nodemailer refuse to send if that upgrade doesn't happen.
  const requireTLS = !secure && (process.env.MAIL_ENCRYPTION ?? "tls").toLowerCase() === "tls";

  transporter = nodemailer.createTransport({ host, port, secure, requireTLS, auth: { user, pass } });
  return transporter;
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const client = getTransporter();
  if (!client) {
    console.error("Email configuration is missing in environment variables");
    return { success: false, error: "Email configuration missing" };
  }

  const fromAddress = process.env.MAIL_FROM_ADDRESS;
  const fromName = process.env.MAIL_FROM_NAME;
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  try {
    const info = await client.sendMail({ from, to: input.to, subject: input.subject, text: input.text, html: input.html });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send email", { to: input.to, subject: input.subject, error: error instanceof Error ? error.message : "UnknownError" });
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
