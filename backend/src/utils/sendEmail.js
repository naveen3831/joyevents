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

  const options = {
    auth: { user, pass },
    tls: { 
      minVersion: "TLSv1.2",
      rejectUnauthorized: false 
    }
  };

  if (host.includes("gmail.com")) {
    options.service = "gmail";
  } else {
    options.host = host;
    options.port = port;
    options.secure = secure;
    options.requireTLS = !secure && port === 587;
  }

  return nodemailer.createTransport(options);
};

export const sendMerchantCredentials = async ({ name, email, password }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured — merchant credentials not emailed");
    return false;
  }
  const { from } = getSmtpConfig();
  const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/login`;
  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "Welcome to JoyEvents! Your Merchant Account Created",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #FF5A00, #FF8C00); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to JoyEvents!</h1>
          </div>
          <div style="padding: 30px; color: #333;">
            <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
            <p style="color: #555; line-height: 1.5;">Your merchant account has been successfully created by the administrator. You can now log in to access your merchant dashboard and configure your events/services listing.</p>
            
            <p style="font-weight: bold; margin-top: 20px; color: #FF5A00;">Your Login Credentials:</p>
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; border-left: 4px solid #FF5A00; margin: 15px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email Address:</strong> ${email}</p>
              <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> ${password}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #FF5A00, #FF8C00); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(255,90,0,0.2);">
                Login to Your Account
              </a>
            </div>
            
            <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">
              Please change your password immediately after your first login for account security.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #aaa; font-size: 12px; text-align: center;">JoyEvents Platform</p>
          </div>
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

export const sendContactUsToAdmin = async ({
  name,
  email,
  subject,
  message,
}) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured — Contact Us message not emailed to admin");
    return false;
  }
  const { from, user } = getSmtpConfig();
  // Send to the active SMTP email (site owner) if ADMIN_EMAIL is the placeholder 'admin@gmail.com'
  const adminEmail = (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL !== "admin@gmail.com")
    ? process.env.ADMIN_EMAIL
    : user;
  try {
    await transporter.sendMail({
      from: `"JoyEvents" <${user}>`,
      to: adminEmail,
      replyTo: email,
      subject: `[Contact Us Request] ${subject || "New Inquiry"} — JoyEvents`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #FF5A00, #FF8C00); padding: 24px 30px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">📩 New Contact Us Submission</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 15px;">Hi Admin,</p>
            <p style="color: #555;">You have received a new message from the Contact Us form:</p>
            <div style="background: #f9f9f9; border-left: 4px solid #FF5A00; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #888;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #888;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #888;"><strong>Subject:</strong> ${subject || "N/A"}</p>
              <p style="margin: 0; font-size: 15px; color: #333; white-space: pre-wrap;"><strong>Message:</strong>\n${message}</p>
            </div>
            <p style="color: #555; font-size: 13px;">You can reply directly to this email to respond to the user.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #aaa; font-size: 12px; text-align: center;">JoyEvents</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("sendContactUsToAdmin error:", error.message);
    throw new Error("Failed to send email to admin");
  }
};
