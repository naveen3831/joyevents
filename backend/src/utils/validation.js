export const EMAIL_MIN_LENGTH = 3;
export const EMAIL_MAX_LENGTH = 40;

const EMAIL_PATTERN = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/;
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export function sanitizeEmailInput(value) {
  return String(value ?? "").replace(/\s/g, "").slice(0, EMAIL_MAX_LENGTH);
}

export function normalizeEmail(email) {
  return sanitizeEmailInput(email).toLowerCase();
}

export function validateEmail(email) {
  const raw = String(email ?? "");
  const trimmed = sanitizeEmailInput(raw.trim());
  if (!trimmed) return "Email is required";
  if (/\s/.test(raw)) return "Email cannot contain spaces";
  if (trimmed.length < EMAIL_MIN_LENGTH) {
    return `Email must be at least ${EMAIL_MIN_LENGTH} characters`;
  }
  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return `Email must be at most ${EMAIL_MAX_LENGTH} characters`;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email like user@gmail.com (letters and numbers only, no special characters)";
  }
  return null;
}

export function validatePassword(password) {
  const pwd = String(password ?? "");
  if (!pwd) return "Password is required";
  if (pwd.length < 8 || pwd.length > 30) {
    return "Password must be between 8 and 30 characters";
  }
  if (!/[A-Z]/.test(pwd)) {
    return "Password must include at least one uppercase letter";
  }
  if (!/[0-9]/.test(pwd)) {
    return "Password must include at least one number";
  }
  if (!PASSWORD_SPECIAL.test(pwd)) {
    return "Password must include at least one special character";
  }
  return null;
}

export function validateLoginForm(email, password) {
  const emailErr = validateEmail(email);
  if (emailErr) return emailErr;
  if (!String(password ?? "").trim()) return "Password is required";
  return null;
}

export function validateSignupForm(email, password, options = {}) {
  if (options.name !== undefined && !String(options.name).trim()) {
    return "Name is required";
  }
  const emailErr = validateEmail(email);
  if (emailErr) return emailErr;
  return validatePassword(password);
}

export function validateNewPasswordForm(password, confirmPassword) {
  const pwdErr = validatePassword(password);
  if (pwdErr) return pwdErr;
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}
