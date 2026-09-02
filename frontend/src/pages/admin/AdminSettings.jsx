import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Bell,
  Globe,
  Check,
  AlertOctagon,
  Lock,
  Mail,
  Save,
  Eye,
  EyeOff,
  UploadCloud,
  Camera,
  ShieldCheck,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlatformName,
  setPlatformName,
  getSupportEmail,
  setSupportEmail as saveSupportEmailLocal,
} from "@/lib/platformName";
import {
  apiGetPlatformSettings,
  apiSavePlatformSettings,
  apiChangePassword,
} from "@/lib/api";
import { toast } from "sonner";
import {
  sanitizeEmailInput,
  validateEmail,
  validateNewPasswordForm,
  validatePassword,
  EMAIL_HINT,
  EMAIL_MAX_LENGTH,
  PASSWORD_HINT,
} from "@/lib/validation";

const PLATFORM_NAME_MAX_LENGTH = 40;
const PLATFORM_NAME_HINT = "2-40 characters, letters, numbers, and spaces only";
const DEFAULT_ADMIN_PREFERENCES = {
  emailNewUsers: true,
  flaggedEventAlerts: true,
  weeklyPlatformReport: true,
  merchantVerificationAlerts: true,
  twoFactorAuthentication: true,
  forcePasswordReset: false,
  ipWhitelist: false,
};

function sanitizePlatformName(value) {
  return value.replace(/[^A-Za-z0-9\s]/g, "").slice(0, PLATFORM_NAME_MAX_LENGTH);
}

function validatePlatformName(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Platform name is required";
  if (trimmed.length < 2) return "Platform name must be at least 2 characters";
  if (trimmed.length > PLATFORM_NAME_MAX_LENGTH)
    return `Platform name must be at most ${PLATFORM_NAME_MAX_LENGTH} characters`;
  if (!/^[A-Za-z0-9 ]+$/.test(trimmed))
    return "Platform name can only contain letters, numbers, and spaces";
  return null;
}

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "platform", label: "Platform Identity", icon: Globe },
];

const AdminSettings = () => {
  const { user, token, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.name || "Admin");

  // Platform Settings States
  const [platformName, setPlatformNameState] = useState(getPlatformName());
  const [supportEmail, setSupportEmail] = useState(getSupportEmail());
  const [adminPreferences, setAdminPreferences] = useState(DEFAULT_ADMIN_PREFERENCES);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  // Password Change States
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const avatarInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.avatar) setAvatarPreview(user.avatar);
  }, [user]);

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB limit. Please choose a smaller image.");
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, or WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target.result;
      setAvatarPreview(imgUrl);
      setUser((prev) => ({
        ...prev,
        avatar: imgUrl,
      }));

      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.avatar = imgUrl;
          localStorage.setItem("user", JSON.stringify(parsed));
        }
      } catch (err) {
        console.error("Failed to persist avatar:", err);
      }

      toast.success("Profile avatar uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const data = await apiGetPlatformSettings();
        if (cancelled) return;
        setPlatformNameState(sanitizePlatformName(data.platformName || "Eventoza"));
        setSupportEmail(sanitizeEmailInput(data.supportEmail || ""));
        setAdminPreferences({ ...DEFAULT_ADMIN_PREFERENCES, ...(data.adminPreferences || {}) });
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.message || "Failed to load settings");
        }
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Validation logic
  const platformNameError = validatePlatformName(platformName);
  const supportEmailError = supportEmail.trim() ? validateEmail(supportEmail) : null;
  const hasPlatformErrors = !!platformNameError || !!supportEmailError;

  const currentPasswordError = passwordForm.currentPassword.trim() ? null : "Current password is required";
  const newPasswordError = passwordForm.newPassword
    ? validatePassword(passwordForm.newPassword)
    : "New password is required";
  const confirmPasswordError = passwordForm.confirmPassword
    ? passwordForm.newPassword === passwordForm.confirmPassword
      ? null
      : "Passwords do not match"
    : "Please confirm your new password";
  const hasPasswordErrors = !!currentPasswordError || !!newPasswordError || !!confirmPasswordError;

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    const updatedUser = { ...user, name: displayName.trim() };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    toast.success("Profile information updated successfully");
  };

  const handleSavePlatformSettings = async () => {
    if (platformNameError) {
      toast.error(platformNameError);
      return;
    }
    if (supportEmailError) {
      toast.error(supportEmailError);
      return;
    }
    try {
      setSavingSettings(true);
      const data = await apiSavePlatformSettings(
        {
          platformName: platformName.trim(),
          supportEmail: supportEmail.trim(),
          adminPreferences,
        },
        token
      );
      setPlatformName(data.platformName || platformName.trim());
      saveSupportEmailLocal(data.supportEmail || supportEmail.trim());
      setAdminPreferences({ ...DEFAULT_ADMIN_PREFERENCES, ...(data.adminPreferences || adminPreferences) });
      setSavedSettings(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSavedSettings(false), 2000);
    } catch (e) {
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please login to change password");
      return;
    }
    if (currentPasswordError) {
      toast.error(currentPasswordError);
      return;
    }
    const pwdErr = validateNewPasswordForm(passwordForm.newPassword, passwordForm.confirmPassword);
    if (pwdErr) {
      toast.error(pwdErr);
      return;
    }
    setChangingPassword(true);
    try {
      await apiChangePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        token
      );
      toast.success("Password changed successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const updatePreference = (key, value) => {
    setAdminPreferences((current) => ({ ...current, [key]: value }));
  };

  const userName = displayName || user?.name || "Admin";
  const userEmail = user?.email || "admin@hms.com";
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <AdminLayout>
      {/* Left-Aligned Page Header */}
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, account security, and preferences."
        breadcrumbs={[
          { label: "Admin Portal", to: "/admin-dashboard" },
          { label: "Account" },
          { label: "Settings" },
        ]}
      />

      <div className="w-full min-w-0 space-y-6 font-sans">
        {/* Full-Width Solid Navy/Indigo Profile Banner (Exact Reference Match) */}
        <div className="w-full rounded-xl bg-[#1E293B] text-white p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5 z-10">
            {/* Avatar Circle */}
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-white/20 bg-white/10 shrink-0 shadow-inner overflow-hidden">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={userName} className="object-cover h-full w-full" />
              ) : null}
              <AvatarFallback className="bg-white/15 text-white text-xl sm:text-2xl font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                {userName}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 font-mono">{userEmail}</p>
              <div className="pt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-xs border border-white/10">
                  Role: Administrator
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 text-xs text-white/80 z-10 bg-white/5 p-3 rounded-lg border border-white/10 shrink-0">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Account Status: Active
            </span>
            <span className="text-[11px] text-white/70">System Administration Access</span>
          </div>
        </div>

        {/* Horizontal Tab Navigation (Exact Reference Match) */}
        <div className="border-b border-border/70 w-full overflow-x-auto no-scrollbar">
          <nav className="flex gap-2 sm:gap-6 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB CONTENT: PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Card 1: Personal Information (2-Column Layout as in Reference) */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSaveProfile}
              className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex items-start gap-3.5 border-b border-border/70 pb-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Personal Information</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your basic personal and account identity details.
                  </p>
                </div>
              </div>

              {/* 2-Column Form Layout on Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    FULL DISPLAY NAME *
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-card border-border rounded-lg text-xs h-10 font-medium"
                    placeholder="Admin"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    EMAIL ADDRESS (READONLY)
                  </Label>
                  <Input
                    value={userEmail}
                    readOnly
                    disabled
                    className="bg-muted/40 border-border rounded-lg text-xs h-10 font-medium text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Upload Profile Avatar Area */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  UPLOAD PROFILE AVATAR
                </Label>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileSelect}
                />
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Dashed Dropzone */}
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex-1 w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                  >
                    <UploadCloud className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary">
                        {avatarPreview ? "Click to change avatar" : "Click to upload"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        PNG, JPG or WEBP (Max 2MB)
                      </p>
                    </div>
                  </div>

                  {/* Camera Action Button */}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-14 w-14 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
                    title="Camera capture"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Bottom Right Save Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6"
                >
                  <Save className="h-4 w-4 mr-2" /> Save Profile
                </Button>
              </div>
            </motion.form>

            {/* Card 2: Change Password Section (Directly Below as in Reference) */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onSubmit={handlePasswordChangeSubmit}
              className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex items-start gap-3.5 border-b border-border/70 pb-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Change Password & Security</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update your password to keep your administrator account secure.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current Password (Full Width) */}
                <div className="space-y-1.5 max-w-xl">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    CURRENT PASSWORD *
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      placeholder="Enter current password"
                      maxLength={30}
                      aria-invalid={!!currentPasswordError}
                      className="pr-10 bg-card border-border rounded-lg text-xs h-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password & Confirm Password (2-Column Grid on Desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      NEW PASSWORD *
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                        }
                        placeholder="Enter new password"
                        maxLength={30}
                        aria-invalid={!!newPasswordError}
                        className="pr-10 bg-card border-border rounded-lg text-xs h-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      CONFIRM NEW PASSWORD *
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        }
                        placeholder="Confirm new password"
                        maxLength={30}
                        aria-invalid={!!confirmPasswordError}
                        className="pr-10 bg-card border-border rounded-lg text-xs h-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className={passwordForm.newPassword.length >= 8 ? "text-emerald-600 font-semibold" : ""}>
                      ✓ At least 8 characters
                    </span>
                    <span className={/[A-Z]/.test(passwordForm.newPassword) ? "text-emerald-600 font-semibold" : ""}>
                      ✓ One uppercase letter
                    </span>
                    <span className={/[0-9]/.test(passwordForm.newPassword) ? "text-emerald-600 font-semibold" : ""}>
                      ✓ One number
                    </span>
                    <span className={/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword) ? "text-emerald-600 font-semibold" : ""}>
                      ✓ One special character
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Right Update Password Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  disabled={changingPassword || hasPasswordErrors}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6"
                >
                  <Lock className="h-4 w-4 mr-2" /> {changingPassword ? "Updating Password..." : "Update Password"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}

        {/* TAB CONTENT: SECURITY TAB */}
        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex items-start gap-3.5 border-b border-border/70 pb-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">System Security Preferences</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Administrative access controls and multi-factor security rules.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-border/60 bg-card">
                <div>
                  <p className="text-xs font-semibold text-foreground">Enforce Two-Factor Authentication (2FA)</p>
                  <p className="text-[11px] text-muted-foreground">Require authenticator app code for all admin logins</p>
                </div>
                <Switch
                  checked={adminPreferences.twoFactorAuthentication}
                  onCheckedChange={(checked) => updatePreference("twoFactorAuthentication", checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-border/60 bg-card">
                <div>
                  <p className="text-xs font-semibold text-foreground">Force password reset every 90 days</p>
                  <p className="text-[11px] text-muted-foreground">Automated password expiration security policy</p>
                </div>
                <Switch
                  checked={adminPreferences.forcePasswordReset}
                  onCheckedChange={(checked) => updatePreference("forcePasswordReset", checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-border/60 bg-card">
                <div>
                  <p className="text-xs font-semibold text-foreground">IP whitelist restriction</p>
                  <p className="text-[11px] text-muted-foreground">Restrict admin access to verified corporate IP ranges</p>
                </div>
                <Switch
                  checked={adminPreferences.ipWhitelist}
                  onCheckedChange={(checked) => updatePreference("ipWhitelist", checked)}
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleSavePlatformSettings}
                  disabled={loadingSettings || savingSettings}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6"
                >
                  Save Security Policy
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex items-start gap-3.5 border-b border-border/70 pb-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Admin Alerts & Notifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure real-time email alerts and platform reporting summaries.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              {[
                { key: "emailNewUsers", title: "New User Registrations", desc: "Email notifications when new customer accounts are created" },
                { key: "flaggedEventAlerts", title: "Flagged & Reported Events", desc: "Immediate alerts for flagged events requiring moderation" },
                { key: "weeklyPlatformReport", title: "Weekly Platform Digest", desc: "Automated weekly performance metrics and revenue summary" },
                { key: "merchantVerificationAlerts", title: "Merchant Verifications", desc: "Alerts when merchants submit business verification requests" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-border/60 bg-card">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={adminPreferences[item.key]}
                    onCheckedChange={(checked) => updatePreference(item.key, checked)}
                  />
                </div>
              ))}

              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleSavePlatformSettings}
                  disabled={loadingSettings || savingSettings}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6"
                >
                  Save Notification Preferences
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: PLATFORM IDENTITY TAB */}
        {activeTab === "platform" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex items-start gap-3.5 border-b border-border/70 pb-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Platform Identity & System Support</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure administrative branding and corporate contact details.
                </p>
              </div>
            </div>

            <div className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    PLATFORM BRAND NAME
                  </Label>
                  <Input
                    value={platformName}
                    onChange={(e) => setPlatformNameState(sanitizePlatformName(e.target.value))}
                    maxLength={PLATFORM_NAME_MAX_LENGTH}
                    className="bg-card border-border rounded-lg text-xs h-10 font-medium"
                    placeholder="e.g. Eventoza"
                  />
                  <p className="text-[11px] text-muted-foreground">{PLATFORM_NAME_HINT}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    SUPPORT EMAIL ADDRESS
                  </Label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(sanitizeEmailInput(e.target.value))}
                    maxLength={EMAIL_MAX_LENGTH}
                    className="bg-card border-border rounded-lg text-xs h-10 font-medium"
                    placeholder="hello@eventoza.com"
                  />
                  <p className="text-[11px] text-muted-foreground">{EMAIL_HINT}</p>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleSavePlatformSettings}
                  disabled={loadingSettings || savingSettings || hasPlatformErrors}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6"
                >
                  {savedSettings ? "Saved Successfully!" : "Save Platform Identity"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}


      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
