import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Shield, Bell, Globe, Check } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import AccountSettingsContent from "@/components/AccountSettingsContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { getPlatformName, setPlatformName, getSupportEmail, setSupportEmail as saveSupportEmailLocal } from "@/lib/platformName";
import { AdminPreferences, apiGetPlatformSettings, apiSavePlatformSettings } from "@/lib/api";
import { toast } from "sonner";
import { sanitizeEmailInput, validateEmail, EMAIL_HINT, EMAIL_MAX_LENGTH } from "@/lib/validation";

const PLATFORM_NAME_MAX_LENGTH = 40;
const PLATFORM_NAME_HINT = "2-40 characters, letters, numbers, and spaces only";
const DEFAULT_ADMIN_PREFERENCES: AdminPreferences = {
  emailNewUsers: true,
  flaggedEventAlerts: true,
  weeklyPlatformReport: true,
  merchantVerificationAlerts: true,
  twoFactorAuthentication: true,
  forcePasswordReset: false,
  ipWhitelist: false,
};

function sanitizePlatformName(value: string) {
  return value.replace(/[^A-Za-z0-9\s]/g, "").slice(0, PLATFORM_NAME_MAX_LENGTH);
}

function validatePlatformName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Platform name is required";
  if (trimmed.length < 2) return "Platform name must be at least 2 characters";
  if (trimmed.length > PLATFORM_NAME_MAX_LENGTH) return `Platform name must be at most ${PLATFORM_NAME_MAX_LENGTH} characters`;
  if (!/^[A-Za-z0-9 ]+$/.test(trimmed)) return "Platform name can only contain letters, numbers, and spaces";
  return null;
}

const AdminSettings = () => {
  const { user, token } = useAuth() as any;
  const [platformName, setPlatformNameState] = useState(getPlatformName());
  const [supportEmail, setSupportEmail] = useState(getSupportEmail());
  const [adminPreferences, setAdminPreferences] = useState<AdminPreferences>(DEFAULT_ADMIN_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const data = await apiGetPlatformSettings();
        if (cancelled) return;

        setPlatformNameState(sanitizePlatformName(data.platformName || "JoyEvents"));
        setSupportEmail(sanitizeEmailInput(data.supportEmail || ""));
        setAdminPreferences({ ...DEFAULT_ADMIN_PREFERENCES, ...(data.adminPreferences || {}) });
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error?.message || "Failed to load settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const platformNameError = validatePlatformName(platformName);
  const supportEmailError = supportEmail.trim() ? validateEmail(supportEmail) : null;
  const hasValidationErrors = !!platformNameError || !!supportEmailError;

  const handleSave = async () => {
    if (platformNameError) { toast.error(platformNameError); return; }
    if (supportEmailError) { toast.error(supportEmailError); return; }
    try {
      setSaving(true);
      const data = await apiSavePlatformSettings({
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
        adminPreferences,
      }, token);
      // Also update localStorage so current tab updates immediately
      setPlatformName(data.platformName || platformName.trim());
      saveSupportEmailLocal(data.supportEmail || supportEmail.trim());
      setAdminPreferences({ ...DEFAULT_ADMIN_PREFERENCES, ...(data.adminPreferences || adminPreferences) });
      setSaved(true);
      toast.success("Settings saved — all devices will now show the updated name");
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof AdminPreferences, value: boolean) => {
    setAdminPreferences((current) => ({ ...current, [key]: value }));
  };

  const handleResetDefaults = () => {
    setPlatformNameState("JoyEvents");
    setSupportEmail("hello@joyevents.com");
    setAdminPreferences(DEFAULT_ADMIN_PREFERENCES);
    setSaved(false);
  };

  return (
    <AdminLayout>
      <AccountSettingsContent />

      <section className="mt-8 space-y-6">
          {/* General */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-3 sm:p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-primary" /> General
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Platform Name</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">This name appears in the navbar, sidebar, footer, and browser title.</p>
                <div className="flex gap-2">
                  <Input
                    value={platformName}
                    onChange={e => setPlatformNameState(sanitizePlatformName(e.target.value))}
                    maxLength={PLATFORM_NAME_MAX_LENGTH}
                    aria-invalid={!!platformNameError}
                    disabled={loading || saving}
                    className="bg-secondary border-border"
                    placeholder="e.g. JoyEvents"
                  />
                </div>
                <p className={`mt-1 text-xs ${platformNameError ? "text-destructive" : "text-muted-foreground"}`}>
                  {platformNameError || PLATFORM_NAME_HINT}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Support Email</Label>
                <Input
                  type="text"
                  inputMode="email"
                  maxLength={EMAIL_MAX_LENGTH}
                  value={supportEmail}
                  onChange={e => setSupportEmail(sanitizeEmailInput(e.target.value))}
                  aria-invalid={!!supportEmailError}
                  disabled={loading || saving}
                  className="mt-1 bg-secondary border-border"
                  placeholder="joyevents@gamil.com"
                />
                <p className={`mt-1 text-xs ${supportEmailError ? "text-destructive" : "text-muted-foreground"}`}>
                  {supportEmailError || EMAIL_HINT}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-3 sm:p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </h2>
            <div className="space-y-4">
              {[
                { key: "emailNewUsers", label: "Email notifications for new users" },
                { key: "flaggedEventAlerts", label: "Alert on flagged events" },
                { key: "weeklyPlatformReport", label: "Weekly platform report" },
                { key: "merchantVerificationAlerts", label: "Merchant verification alerts" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <Switch
                    checked={adminPreferences[item.key as keyof AdminPreferences]}
                    onCheckedChange={(checked) => updatePreference(item.key as keyof AdminPreferences, checked)}
                    disabled={loading || saving}
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Security */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card p-3 sm:p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-primary" /> Security
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Two-factor authentication</span>
                <Switch
                  checked={adminPreferences.twoFactorAuthentication}
                  onCheckedChange={(checked) => updatePreference("twoFactorAuthentication", checked)}
                  disabled={loading || saving}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Force password reset every 90 days</span>
                <Switch
                  checked={adminPreferences.forcePasswordReset}
                  onCheckedChange={(checked) => updatePreference("forcePasswordReset", checked)}
                  disabled={loading || saving}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">IP whitelist for admin access</span>
                <Switch
                  checked={adminPreferences.ipWhitelist}
                  onCheckedChange={(checked) => updatePreference("ipWhitelist", checked)}
                  disabled={loading || saving}
                />
              </div>
            </div>
          </motion.div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={loading || saving || hasValidationErrors}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2"
            >
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={handleResetDefaults} disabled={loading || saving}>
              Reset Defaults
            </Button>
          </div>
      </section>
    </AdminLayout>
  );
};

export default AdminSettings;
