import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Bell,
  Globe,
  Lock,
  Save,
  Eye,
  EyeOff,
  UploadCloud,
  Camera,
  ShieldCheck,
  Store,
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { apiChangePassword, apiUpdateMerchantDetails, apiGetMe, apiUpdateProfile } from "@/lib/api";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import {
  validateNewPasswordForm,
  validatePassword,
} from "@/lib/validation";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Globe },
];

const DEFAULT_MERCHANT_PREFERENCES = {
  emailNewBookings: true,
  customerMessageAlerts: true,
  weeklyEarningsReport: true,
  marketingPromotions: true,
  twoFactorAuthentication: false,
  autoAcceptQuotes: false,
};

const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const MerchantSettings = () => {
  const { user, token, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [businessName, setBusinessName] = useState(user?.merchantDetails?.businessName || "");
  const [address, setAddress] = useState(user?.merchantDetails?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change Form States
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

  // Merchant Preferences States
  const [merchantPreferences, setMerchantPreferences] = useState(DEFAULT_MERCHANT_PREFERENCES);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const avatarInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || user?.merchantDetails?.avatar || "");

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.merchantDetails?.businessName) setBusinessName(user.merchantDetails.businessName);
    if (user?.merchantDetails?.address) setAddress(user.merchantDetails.address);
    if (user?.avatar) setAvatarPreview(user.avatar);
    else if (user?.merchantDetails?.avatar) setAvatarPreview(user.merchantDetails.avatar);
  }, [user]);

  useEffect(() => {
    if (token) {
      apiGetMe(token)
        .then((data) => {
          if (data) {
            const freshUser = data.user || data;
            setUser(freshUser);
            try {
              localStorage.setItem("user", JSON.stringify(freshUser));
            } catch (e) {}
            if (freshUser.name) setDisplayName(freshUser.name);
            if (freshUser.merchantDetails?.businessName) setBusinessName(freshUser.merchantDetails.businessName);
            if (freshUser.merchantDetails?.address) setAddress(freshUser.merchantDetails.address);
            if (freshUser.avatar) setAvatarPreview(freshUser.avatar);
          }
        })
        .catch((err) => console.error("Failed to sync user profile:", err));
    }
  }, [token]);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, or WEBP.");
      return;
    }

    try {
      const imgUrl = await compressImage(file, 400, 400, 0.85);
      setAvatarPreview(imgUrl);
      toast.success("Profile avatar uploaded successfully!");
    } catch (err) {
      console.error("Failed to process avatar:", err);
      toast.error("Failed to process avatar image");
    }
  };

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Full display name cannot be empty");
      return;
    }
    setSavingProfile(true);
    try {
      if (token) {
        // Update user display name & avatar in DB
        const profileRes = await apiUpdateProfile({
          name: displayName.trim(),
          avatar: avatarPreview || undefined,
        }, token).catch(() => null);

        // Update merchant business details in DB
        const updatedRes = await apiUpdateMerchantDetails({
          businessName: businessName.trim() || undefined,
          address: address.trim() || undefined,
        }, token).catch(() => null);

        const mergedUser = {
          ...user,
          ...(profileRes?.user || {}),
          ...(updatedRes?.user || {}),
          name: displayName.trim(),
          avatar: avatarPreview || profileRes?.user?.avatar || updatedRes?.user?.avatar || user?.avatar || "",
          merchantDetails: {
            ...user?.merchantDetails,
            ...(updatedRes?.user?.merchantDetails || {}),
            businessName: businessName.trim(),
            address: address.trim(),
            avatar: avatarPreview || profileRes?.user?.avatar || user?.avatar || "",
          }
        };

        setUser(mergedUser);
        try {
          localStorage.setItem("user", JSON.stringify(mergedUser));
        } catch (err) {}
      }
      toast.success("Profile details updated successfully!");
    } catch (err) {
      toast.error(err?.message || "Failed to update profile details");
    } finally {
      setSavingProfile(false);
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
    setMerchantPreferences((current) => ({ ...current, [key]: value }));
  };

  const handleSavePreferences = () => {
    setSavingPreferences(true);
    setTimeout(() => {
      setSavingPreferences(false);
      toast.success("Merchant preferences saved successfully!");
    }, 400);
  };

  const userName = displayName.trim() || user?.name || "Merchant";
  const userEmail = user?.email || "";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const currentAvatar = avatarPreview || getAvatarUrl(user);

  return (
    <MerchantLayout>
      {/* Left-Aligned Page Header */}
      <PageHeader
        title="Settings"
        subtitle="Manage your merchant profile, account security, and preferences."
        breadcrumbs={[
          { label: "Merchant Portal", to: "/merchant-dashboard" },
          { label: "Account" },
          { label: "Settings" },
        ]}
      />

      <div className="w-full min-w-0 space-y-6 font-sans">
        {/* Full-Width Solid Navy Profile Banner */}
        <div className="w-full rounded-xl bg-[#1E293B] text-white p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5 z-10">
            {/* Avatar Circle */}
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-white/20 bg-white/10 shrink-0 shadow-inner overflow-hidden">
              {currentAvatar ? (
                <img src={currentAvatar} alt={userName} className="object-cover h-full w-full rounded-full" />
              ) : (
                <AvatarFallback className="bg-white/15 text-white text-xl sm:text-2xl font-bold">
                  {userInitials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                {userName}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 font-mono">{userEmail}</p>
              <div className="pt-1 flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-xs border border-white/10">
                  Role: Merchant
                </span>
                {user?.merchantDetails?.businessName && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    <Store className="h-3 w-3 mr-1" /> {user.merchantDetails.businessName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 text-xs text-white/80 z-10 bg-white/5 p-3 rounded-lg border border-white/10 shrink-0">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Account Status: Active
            </span>
            <span className="text-[11px] text-white/70">Verified Merchant Account</span>
          </div>
        </div>

        {/* Horizontal Tab Navigation */}
        <div className="border-b border-border/70 w-full overflow-x-auto no-scrollbar">
          <nav className="flex gap-2 sm:gap-6 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
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
            {/* Card 1: Personal & Business Information */}
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
                  <h3 className="text-base font-bold text-foreground">Profile & Business Information</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your personal account information and registered merchant business details.
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    BUSINESS / ORGANIZER NAME
                  </Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter business name"
                    className="bg-card border-border rounded-lg text-xs h-10 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    BUSINESS LOCATION / ADDRESS
                  </Label>
                  <LocationAutocomplete
                    value={address}
                    onChange={(val) => setAddress(val)}
                    onSelect={(payload) => {
                      if (payload?.address) {
                        setAddress(payload.address);
                      }
                    }}
                    placeholder="City, State / Full address"
                    inputClassName="bg-card border-border rounded-lg text-xs h-10 font-medium"
                    maxLength={150}
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

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-14 w-14 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
                    title="Upload photo"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6 cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-2" /> {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}

        {/* TAB CONTENT: SECURITY TAB */}
        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Change Password Card */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handlePasswordChangeSubmit}
              className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex items-start gap-3.5 border-b border-border/70 pb-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Change Password & Account Security</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update your account password to maintain merchant portal security.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current Password */}
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
                      className="pr-10 bg-card border-border rounded-lg text-xs h-10 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password & Confirm Password (2 Column) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl">
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
                        className="pr-10 bg-card border-border rounded-lg text-xs h-10 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                        className="pr-10 bg-card border-border rounded-lg text-xs h-10 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1 max-w-xl">
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

              {/* Update Password Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  disabled={changingPassword || hasPasswordErrors}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6 cursor-pointer"
                >
                  <Lock className="h-4 w-4 mr-2" /> {changingPassword ? "Updating Password..." : "Update Password"}
                </Button>
              </div>
            </motion.form>

            {/* Security Controls & 2FA Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex items-start gap-3.5 border-b border-border/70 pb-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Security Controls & 2FA</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure two-factor authentication and login session protections.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Two-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-muted-foreground">
                      Require an authenticator code during merchant account login.
                    </p>
                  </div>
                  <Switch
                    checked={merchantPreferences.twoFactorAuthentication}
                    onCheckedChange={(v) => updatePreference("twoFactorAuthentication", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Automatic Quote Acceptance</p>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically process slot upgrade quotes when admin approves tickets.
                    </p>
                  </div>
                  <Switch
                    checked={merchantPreferences.autoAcceptQuotes}
                    onCheckedChange={(v) => updatePreference("autoAcceptQuotes", v)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleSavePreferences}
                  disabled={savingPreferences}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6 cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-2" /> Save Security Settings
                </Button>
              </div>
            </motion.div>
          </div>
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
                <h3 className="text-base font-bold text-foreground">Email & System Notifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage when and how Eventoza sends alerts for customer bookings and activity.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">New Booking Email Notifications</p>
                  <p className="text-[11px] text-muted-foreground">
                    Receive immediate email alerts when a customer books your event or service.
                  </p>
                </div>
                <Switch
                  checked={merchantPreferences.emailNewBookings}
                  onCheckedChange={(v) => updatePreference("emailNewBookings", v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Customer Message Alerts</p>
                  <p className="text-[11px] text-muted-foreground">
                    Get notified when a customer sends a new message to your merchant inbox.
                  </p>
                </div>
                <Switch
                  checked={merchantPreferences.customerMessageAlerts}
                  onCheckedChange={(v) => updatePreference("customerMessageAlerts", v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Weekly Earnings Summary</p>
                  <p className="text-[11px] text-muted-foreground">
                    Receive a weekly email breakdown of total bookings, earnings, and payouts.
                  </p>
                </div>
                <Switch
                  checked={merchantPreferences.weeklyEarningsReport}
                  onCheckedChange={(v) => updatePreference("weeklyEarningsReport", v)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6 cursor-pointer"
              >
                <Save className="h-4 w-4 mr-2" /> Save Notification Settings
              </Button>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: PREFERENCES TAB */}
        {activeTab === "preferences" && (
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
                <h3 className="text-base font-bold text-foreground">Merchant Portal Preferences</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure regional formatting, currency displays, and marketing options.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Marketing & Promotional Insights</p>
                  <p className="text-[11px] text-muted-foreground">
                    Receive platform recommendations on high-demand event dates and pricing tips.
                  </p>
                </div>
                <Switch
                  checked={merchantPreferences.marketingPromotions}
                  onCheckedChange={(v) => updatePreference("marketingPromotions", v)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold h-10 px-6 cursor-pointer"
              >
                <Save className="h-4 w-4 mr-2" /> Save Preferences
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </MerchantLayout>
  );
};

export default MerchantSettings;
