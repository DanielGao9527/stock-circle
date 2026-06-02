import { Resend } from "resend";

type SendDailyDigestEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getResendClient() {
  return new Resend(getRequiredEnv("RESEND_API_KEY"));
}

export async function sendDailyDigestEmail({
  to,
  subject,
  text,
  html,
}: SendDailyDigestEmailInput) {
  const resend = getResendClient();
  const from = getRequiredEnv("DIGEST_FROM_EMAIL");

  return resend.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });
}
