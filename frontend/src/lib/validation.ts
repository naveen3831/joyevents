export const EMAIL_MIN_LENGTH = 3;
export const EMAIL_MAX_LENGTH = 40;
export const NAME_MAX_LENGTH = 40;
export const SUBJECT_MAX_LENGTH = 40;
export const MESSAGE_MAX_LENGTH = 500;

/** Letters/numbers + dots only; domain like gmail.com (no special chars) */
const EMAIL_PATTERN = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/;
const NAME_PATTERN = /^[A-Za-z ]+$/;
const SUBJECT_PATTERN = /^[A-Za-z ]+$/;
const MESSAGE_PATTERN = /^[A-Za-z0-9\s]+$/;

const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export const EMAIL_HINT =
  "3–40 characters, no spaces, letters and numbers only (e.g. user@gmail.com)";
export const NAME_HINT =
  "Up to 40 letters and spaces only, no special characters";
export const SUBJECT_HINT =
  "Up to 40 letters and spaces only, no special characters";
export const MESSAGE_HINT =
  "Up to 500 letters, numbers, and spaces only, no special characters";
export const PASSWORD_HINT =
  "8–30 characters, including one uppercase letter, one number, and one special character.";

/** Strip spaces and cap length while typing */
export function sanitizeEmailInput(value: string): string {
  return value.replace(/\s/g, "").slice(0, EMAIL_MAX_LENGTH);
}

export function sanitizeNameInput(value: string): string {
  return value.replace(/[^A-Za-z\s]/g, "").slice(0, NAME_MAX_LENGTH);
}

export function sanitizeSubjectInput(value: string): string {
  return value.replace(/[^A-Za-z\s]/g, "").slice(0, SUBJECT_MAX_LENGTH);
}

export function sanitizeMessageInput(value: string): string {
  return value.replace(/[^A-Za-z0-9\s]/g, "").slice(0, MESSAGE_MAX_LENGTH);
}

export function normalizeEmail(email: string): string {
  return sanitizeEmailInput(email).toLowerCase();
}

export function validateEmail(email: string): string | null {
  const trimmed = sanitizeEmailInput(email.trim());
  if (!trimmed) return "Email is required";
  if (/\s/.test(email)) return "Email cannot contain spaces";
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

export function validateName(name: string): string | null {
  const trimmed = sanitizeNameInput(name.trim());
  if (!trimmed) return "Name is required";
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Name must be at most ${NAME_MAX_LENGTH} characters`;
  }
  if (!NAME_PATTERN.test(trimmed)) {
    return "Name can only contain letters and spaces";
  }
  return null;
}

export function validateSubject(subject: string): string | null {
  const trimmed = sanitizeSubjectInput(subject.trim());
  if (!trimmed) return null;
  if (trimmed.length > SUBJECT_MAX_LENGTH) {
    return `Subject must be at most ${SUBJECT_MAX_LENGTH} characters`;
  }
  if (!SUBJECT_PATTERN.test(trimmed)) {
    return "Subject can only contain letters and spaces";
  }
  return null;
}

export function validateMessage(message: string): string | null {
  const trimmed = sanitizeMessageInput(message.trim());
  if (!trimmed) return "Message is required";
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    return `Message must be at most ${MESSAGE_MAX_LENGTH} characters`;
  }
  if (!MESSAGE_PATTERN.test(trimmed)) {
    return "Message can only contain letters, numbers, and spaces";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8 || password.length > 30) {
    return "Password must be between 8 and 30 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number";
  }
  if (!PASSWORD_SPECIAL.test(password)) {
    return "Password must include at least one special character";
  }
  return null;
}

/** Login / sign-in — email rules only; password must be present */
export function validateLoginForm(email: string, password: string): string | null {
  const emailErr = validateEmail(email);
  if (emailErr) return emailErr;
  if (!password?.trim()) return "Password is required";
  return null;
}

/** Register / sign-up / admin create merchant — email + password rules */
export function validateSignupForm(
  email: string,
  password: string,
  options?: { name?: string }
): string | null {
  if (options?.name !== undefined) {
    const nameErr = validateName(options.name);
    if (nameErr) return nameErr;
  }
  const emailErr = validateEmail(email);
  if (emailErr) return emailErr;
  return validatePassword(password);
}

/** Change password / reset password */
export function validateNewPasswordForm(
  password: string,
  confirmPassword?: string
): string | null {
  const pwdErr = validatePassword(password);
  if (pwdErr) return pwdErr;
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}
