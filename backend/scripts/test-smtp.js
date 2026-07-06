/**
 * Test Gmail SMTP from backend/.env
 * Usage: node scripts/test-smtp.js [recipient@email.com]
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getSmtpConfig, isSmtpConfigured } from "../src/utils/sendEmail.js";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const to = process.argv[2] || getSmtpConfig().user;

if (!isSmtpConfigured()) {
  console.error("Set SMTP_USER and SMTP_PASS in backend/.env");
  process.exit(1);
}

const { user, pass, host, port, secure, from } = getSmtpConfig();
const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  requireTLS: !secure && port === 587,
});

try {
  await transporter.verify();
  console.log("SMTP verify OK");
  const info = await transporter.sendMail({
    from,
    to,
    subject: "JoyEvents SMTP test",
    text: "If you received this, password reset emails will work.",
  });
  console.log("Test email sent to", to, "— id:", info.messageId);
} catch (err) {
  console.error("Failed:", err.message);
  console.error("\nFix: Google Account → Security → 2-Step Verification → App passwords → create new Mail password → set SMTP_PASS in backend/.env (16 chars, no spaces)");
  process.exit(1);
}
