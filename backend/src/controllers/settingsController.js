import Settings from "../models/Settings.js";
import { validateEmail, normalizeEmail } from "../utils/validation.js";

const DEFAULT_ADMIN_PREFERENCES = {
  emailNewUsers: true,
  flaggedEventAlerts: true,
  weeklyPlatformReport: true,
  merchantVerificationAlerts: true,
  twoFactorAuthentication: true,
  forcePasswordReset: false,
  ipWhitelist: false,
};

function validatePlatformName(platformName) {
  const trimmed = String(platformName || "").trim();
  if (!trimmed) return "Platform name required";
  if (trimmed.length < 2) return "Platform name must be at least 2 characters";
  if (trimmed.length > 40) return "Platform name must be at most 40 characters";
  if (!/^[A-Za-z0-9 ]+$/.test(trimmed)) {
    return "Platform name can only contain letters, numbers, and spaces";
  }
  return null;
}

function normalizeAdminPreferences(value) {
  if (!value || typeof value !== "object") return DEFAULT_ADMIN_PREFERENCES;

  return Object.fromEntries(
    Object.entries(DEFAULT_ADMIN_PREFERENCES).map(([key, defaultValue]) => [
      key,
      typeof value[key] === "boolean" ? value[key] : defaultValue,
    ])
  );
}

function parseJsonSetting(doc, fallback) {
  if (!doc?.value) return fallback;
  try {
    const parsed = JSON.parse(doc.value);
    // Merge parsed with fallback to fill missing properties gracefully
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export const getPlatformSettings = async (_req, res) => {
  try {
    const [nameDoc, emailDoc, preferencesDoc] = await Promise.all([
      Settings.findOne({ key: "platformName" }),
      Settings.findOne({ key: "supportEmail" }),
      Settings.findOne({ key: "adminPreferences" }),
    ]);

    res.json({
      platformName: nameDoc?.value || "JoyEvents",
      supportEmail: emailDoc?.value || "hello@joyevents.com",
      adminPreferences: normalizeAdminPreferences(parseJsonSetting(preferencesDoc, DEFAULT_ADMIN_PREFERENCES)),
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load settings" });
  }
};

export const savePlatformSettings = async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const { platformName, supportEmail, adminPreferences } = req.body;
  const platformNameErr = validatePlatformName(platformName);
  if (platformNameErr) return res.status(400).json({ message: platformNameErr });
  if (supportEmail?.trim()) {
    const emailErr = validateEmail(supportEmail);
    if (emailErr) return res.status(400).json({ message: emailErr });
  }
  const normalizedSupportEmail = supportEmail?.trim() ? normalizeEmail(supportEmail) : "";
  const normalizedAdminPreferences = normalizeAdminPreferences(adminPreferences);
  try {
    await Promise.all([
      Settings.findOneAndUpdate(
        { key: "platformName" },
        { value: platformName.trim() },
        { upsert: true, new: true }
      ),
      Settings.findOneAndUpdate(
        { key: "supportEmail" },
        { value: normalizedSupportEmail },
        { upsert: true, new: true }
      ),
      Settings.findOneAndUpdate(
        { key: "adminPreferences" },
        { value: JSON.stringify(normalizedAdminPreferences) },
        { upsert: true, new: true }
      ),
    ]);
    res.json({
      success: true,
      platformName: platformName.trim(),
      supportEmail: normalizedSupportEmail,
      adminPreferences: normalizedAdminPreferences,
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to save settings" });
  }
};

export const getCommissionRate = async (_req, res) => {
  try {
    const commissionDoc = await Settings.findOne({ key: "commissionRate" });
    res.json({ commissionRate: commissionDoc ? Number(commissionDoc.value) : 5 });
  } catch (e) {
    res.status(500).json({ message: "Failed to load commission rate" });
  }
};

export const saveCommissionRate = async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const commissionRate = Number(req.body.commissionRate);
  if (Number.isNaN(commissionRate)) {
    return res.status(400).json({ message: "Commission rate must be a number" });
  }
  if (commissionRate < 1 || commissionRate > 100) {
    return res.status(400).json({ message: "Commission rate must be between 1 and 100" });
  }

  try {
    await Settings.findOneAndUpdate(
      { key: "commissionRate" },
      { value: commissionRate.toString() },
      { upsert: true, new: true }
    );
    res.json({ success: true, commissionRate });
  } catch (e) {
    res.status(500).json({ message: "Failed to save commission rate" });
  }
};

export const getHomepageSettings = async (_req, res) => {
  try {
    const doc = await Settings.findOne({ key: "homepageSettings" });
    const fallback = {
      heroTitle: "Create Unforgettable Moments",
      heroSubtitle: "From intimate workshops to grand festivals — discover, book, and manage events that bring people together and create lasting memories.",
      eventsCount: "1,800+",
      attendeesCount: "50K+",
      merchantsCount: "340+",
      contactPhone: "+1 (555) 123-4567",
      contactEmail: "info@joyevents.com",
      contactAddress: "123 Event Ave, Celebrate City",
      contactWorkingHours: "Mon - Fri, 9:00 AM - 6:00 PM",
      aboutTitle: "We build unforgettable event experiences",
      aboutSubtitle: "JoyEvents brings strategy, hospitality, production, and design together so every celebration feels effortless, premium, and deeply memorable.",
      aboutExperience: "12+",
      portfolioTitle: "A portfolio shaped by atmosphere, scale, and detail",
      portfolioSubtitle: "Explore the types of experiences we deliver across corporate productions, luxury celebrations, and high-impact event launches.",
      portfolioCategories: "12+"
    };
    const settings = parseJsonSetting(doc, fallback);
    res.json(settings);
  } catch (e) {
    res.status(500).json({ message: "Failed to load homepage settings" });
  }
};

export const saveHomepageSettings = async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  
  const { 
    heroTitle, 
    heroSubtitle, 
    eventsCount, 
    attendeesCount, 
    merchantsCount, 
    contactPhone, 
    contactEmail, 
    contactAddress, 
    contactWorkingHours,
    aboutTitle,
    aboutSubtitle,
    aboutExperience,
    portfolioTitle,
    portfolioSubtitle,
    portfolioCategories
  } = req.body || {};

  // Simple field validation & sanitization
  const settings = {
    heroTitle: String(heroTitle || "Create Unforgettable Moments").trim().slice(0, 100),
    heroSubtitle: String(heroSubtitle || "").trim().slice(0, 500),
    eventsCount: String(eventsCount || "0").trim().slice(0, 20),
    attendeesCount: String(attendeesCount || "0").trim().slice(0, 20),
    merchantsCount: String(merchantsCount || "0").trim().slice(0, 20),
    contactPhone: String(contactPhone || "").trim().slice(0, 30),
    contactEmail: String(contactEmail || "").trim().slice(0, 50),
    contactAddress: String(contactAddress || "").trim().slice(0, 150),
    contactWorkingHours: String(contactWorkingHours || "").trim().slice(0, 100),
    aboutTitle: String(aboutTitle || "We build unforgettable event experiences").trim().slice(0, 100),
    aboutSubtitle: String(aboutSubtitle || "").trim().slice(0, 500),
    aboutExperience: String(aboutExperience || "12+").trim().slice(0, 20),
    portfolioTitle: String(portfolioTitle || "A portfolio shaped by atmosphere, scale, and detail").trim().slice(0, 100),
    portfolioSubtitle: String(portfolioSubtitle || "").trim().slice(0, 500),
    portfolioCategories: String(portfolioCategories || "12+").trim().slice(0, 20)
  };

  if (settings.contactEmail) {
    const emailErr = validateEmail(settings.contactEmail);
    if (emailErr) return res.status(400).json({ message: emailErr });
  }

  try {
    const doc = await Settings.findOneAndUpdate(
      { key: "homepageSettings" },
      { value: JSON.stringify(settings) },
      { upsert: true, new: true }
    );
    res.json({ success: true, settings });
  } catch (e) {
    res.status(500).json({ message: "Failed to save homepage settings" });
  }
};
