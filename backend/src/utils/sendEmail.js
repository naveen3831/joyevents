import nodemailer from "nodemailer";

const trim = (v) => (typeof v === "string" ? v.trim() : v);

/** Normalize env vars (trailing spaces in .env break Gmail auth). */
export const getSmtpConfig = () => {
  const user = trim(process.env.SMTP_USER);
  let pass = trim(process.env.SMTP_PASS);
  if (pass) pass = pass.replace(/\s+/g, "");

  const host = trim(process.env.SMTP_HOST) || "smtp.gmail.com";
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  let from = trim(process.env.MAIL_FROM);
  if (from && !from.includes("<")) {
    const match = from.match(/^(.+?)([\w.+-]+@[\w.-]+\.\w+)$/);
    if (match) {
      from = `"${match[1].trim()}" <${match[2].trim()}>`;
    } else if (user) {
      from = `"JoyEvents" <${user}>`;
    }
  }
  if (!from && user) from = `"JoyEvents" <${user}>`;

  return { user, pass, host, port, secure, from };
};

export const isSmtpConfigured = () => {
  const { user, pass } = getSmtpConfig();
  return Boolean(user && pass);
};

const getTransporter = () => {
  const { user, pass, host, port, secure } = getSmtpConfig();
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { minVersion: "TLSv1.2" },
    requireTLS: !secure && port === 587,
  });
};

export const sendMerchantCredentials = async ({ name, email, password }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured — merchant credentials not emailed");
    return false;
  }
  const { from } = getSmtpConfig();
  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "Welcome to JoyEvents! Your Merchant Account Created",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF5A00;">Welcome, ${name}!</h2>
          <p>Your merchant account has been successfully created by the administrator.</p>
          <p>Here are your login credentials:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p style="margin-top: 20px;">Please login at <a href="${process.env.FRONTEND_URL || "http://localhost:8080"}/login">JoyEvents</a> and change your password as soon as possible.</p>
          <p>Best regards,<br>The JoyEvents Team</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("sendMerchantCredentials error:", error.message);
    return false;
  }
};

export const sendPasswordResetEmail = async ({ name, email, resetUrl }) => {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      sent: false,
      error: "Email is not configured on the server. Contact support.",
    };
  }

  const { from, user } = getSmtpConfig();

  try {
    await transporter.verify();
  } catch (error) {
    console.error("SMTP verify failed:", error.message);
    const hint =
      error.message?.includes("Invalid login") ||
      error.message?.includes("authentication") ||
      error.message?.includes("535")
        ? "Gmail rejected the login. Use a 16-character App Password (Google Account → Security → App passwords), not your normal password."
        : error.message;
    return { sent: false, error: hint };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      replyTo: user,
      subject: "Reset Your Password — JoyEvents",
      text: `Hi ${name},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #FF5A00, #FF8C00); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
            <p style="color: #555;">We received a request to reset your password. Click the button below to set a new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #FF5A00, #FF8C00); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #888; font-size: 13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #aaa; font-size: 12px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #aaa; font-size: 12px; text-align: center;">JoyEvents</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Password reset sent to ${email} (messageId: ${info.messageId})`);
    return { sent: true };
  } catch (error) {
    console.error("sendPasswordResetEmail error:", error.message);
    return {
      sent: false,
      error:
        error.message?.includes("Invalid login") ||
        error.message?.includes("authentication") ||
        error.message?.includes("535")
          ? "Could not send email. The server Gmail login failed — regenerate an App Password and update SMTP_PASS in backend .env."
          : `Could not send email: ${error.message}`,
    };
  }
};

export const sendContactMessage = async ({
  senderName,
  senderEmail,
  message,
  merchantEmail,
  merchantName,
  itemTitle,
}) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured — contact message not emailed");
    return false;
  }
  const { from } = getSmtpConfig();
  try {
    await transporter.sendMail({
      from,
      to: merchantEmail,
      replyTo: senderEmail,
      subject: `New enquiry about "${itemTitle}" — JoyEvents`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #FF5A00, #FF8C00); padding: 24px 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">📩 New Customer Enquiry</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 15px;">Hi <strong>${merchantName}</strong>,</p>
            <p style="color: #555;">A customer has sent you a message about <strong>"${itemTitle}"</strong>.</p>
            <div style="background: #f9f9f9; border-left: 4px solid #FF5A00; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #888;">From: <strong style="color:#333">${senderName}</strong> &lt;${senderEmail}&gt;</p>
              <p style="margin: 0; font-size: 15px; color: #333; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #555; font-size: 13px;">You can reply directly to this email to respond to the customer.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #aaa; font-size: 12px; text-align: center;">JoyEvents</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("sendContactMessage error:", error.message);
    throw new Error("Failed to send message");
  }
};
