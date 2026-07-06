import { API_URL } from "./config";
import { validateEmail } from "./validation";

const NAME_KEY = "platformName";
const EMAIL_KEY = "platformSupportEmail";
const DEFAULT_NAME = "JoyEvents";
const DEFAULT_EMAIL = "joyevents@gamil.com";

export const getPlatformName = (): string =>
  localStorage.getItem(NAME_KEY) || DEFAULT_NAME;

export const setPlatformName = (name: string) => {
  localStorage.setItem(NAME_KEY, name.trim() || DEFAULT_NAME);
  window.dispatchEvent(new Event("platformNameChanged"));
};

export const getSupportEmail = (): string => {
  const stored = localStorage.getItem(EMAIL_KEY)?.trim();
  if (stored && validateEmail(stored) === null) {
    return stored;
  }
  localStorage.setItem(EMAIL_KEY, DEFAULT_EMAIL);
  return DEFAULT_EMAIL;
};

export const setSupportEmail = (email: string) => {
  localStorage.setItem(EMAIL_KEY, email.trim() || DEFAULT_EMAIL);
  window.dispatchEvent(new Event("platformNameChanged"));
};

/** Fetch from backend and sync to localStorage so all devices stay in sync */
export async function syncPlatformSettings(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/settings/platform`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.platformName) {
      localStorage.setItem(NAME_KEY, data.platformName);
    }
    if (data.supportEmail) {
      localStorage.setItem(EMAIL_KEY, data.supportEmail);
    }
    window.dispatchEvent(new Event("platformNameChanged"));
  } catch {
    // silently fall back to localStorage value
  }
}
