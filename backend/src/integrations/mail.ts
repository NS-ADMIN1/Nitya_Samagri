// ─────────────────────────────────────────────────────────────────────────────
// src/integrations/mail.ts
//
// Replaces src/integrations/sendgrid.ts. Sends transactional email via
// Nodemailer over Gmail/Google Workspace SMTP instead of the SendGrid API
// — Firebase itself has no transactional email API, this is what "use
// Firebase for email" resolves to in practice (Gmail SMTP tied to the
// same Google account as the Firebase project).
//
// GMAIL_APP_PASSWORD must be a Google App Password (myaccount.google.com/
// apppasswords, requires 2FA), not the account's normal login password.
//
// sendEmail()'s signature is unchanged from the old sendgrid.ts so nothing
// calling it needs to change.
// ─────────────────────────────────────────────────────────────────────────────

import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let transporter: Transporter | null = null;
let warnedNotConfigured = false;

/** The Gmail SMTP connection, or null when GMAIL_USER / GMAIL_APP_PASSWORD are not set. */
function getTransporter(): Transporter | null {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (env.NODE_ENV === "development") {
    logger.info(`[EMAIL MOCK] To: ${params.to} | Subject: ${params.subject}`);
    return;
  }

  const smtp = getTransporter();
  if (!smtp) {
    if (!warnedNotConfigured) {
      logger.warn("Email is not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing) — emails are being skipped");
      warnedNotConfigured = true;
    }
    return;
  }

  await smtp.sendMail({
    from: `"Nitya Samagri" <${env.GMAIL_USER}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}
