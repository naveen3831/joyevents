import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Bell,
  Lock,
  Save,
  Eye,
  EyeOff,
  UploadCloud,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiChangePassword, apiUpdateUser } from "@/lib/api";
import { validateNewPasswordForm, validatePassword } from "@/lib/validation";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const AccountSettingsContent = ({ backLink }) => {
  const navigate = useNavigate();
  const { token, user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar States
  const avatarInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const userInitials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "UN";

  // Password Change Form States
  const [changingPassword, setChangingPassword] = useState(false);
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

  // Notification Preferences States
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    smsAlerts: true,
    promos: true,
  });

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.phone) setPhone(user.phone);
    if (user?.address) setAddress(user.address);
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

      toast.success("Profile avatar updated successfully!");
    };
    reader.readAsDataURL(file);
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
    if (e) e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Full display name cannot be empty");
      return;
    }
    setSavingProfile(true);
    try {
      if (token && user?._id) {
        await apiUpdateUser(
          user._id,
          {
            name: displayName.trim(),
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
            avatar: avatarPreview,
          },
          token
        ).catch(() => {});
      }
      setUser((prev) => ({
        ...prev,
        name: displayName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatar: avatarPreview,
      }));
      toast.success("Profile details updated successfully!");
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please login to change password");
      navigate("/login");
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

  return (
    <div className="w-full space-y-6 font-sans py-2">
      {backLink && (
        <Link
          to={backLink.to}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          ← {backLink.label}
        </Link>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/80 gap-6 overflow-x-auto no-scrollbar pt-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs min-h-[420px]">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3.5 border-b border-border/70 pb-5">
              <Avatar className="h-14 w-14 border-2 border-primary/20 bg-primary/5">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Profile & Personal Information
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your personal account information and registered credentials.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Full Display Name *
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-11 rounded-xl bg-background border-border text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address (Readonly)
                </Label>
                <div className="relative">
                  <Input
                    value={user?.email || ""}
                    readOnly
                    disabled
                    className="h-11 pr-24 rounded-xl bg-muted/40 text-muted-foreground border-border cursor-not-allowed text-xs sm:text-sm font-medium"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="h-11 rounded-xl bg-background border-border text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Location / Address
                </Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your city / address"
                  className="h-11 rounded-xl bg-background border-border text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Upload Profile Avatar */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Upload Profile Avatar
              </Label>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="flex items-center justify-between gap-4 p-5 rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-primary hover:underline">
                      {avatarPreview ? "Click to change avatar" : "Click to upload"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG or WEBP (Max 2MB)
                    </p>
                  </div>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    avatarInputRef.current?.click();
                  }}
                  className="h-10 w-10 rounded-xl border border-border/80 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 shadow-xs cursor-pointer"
                >
                  <Camera className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="flex justify-end pt-4 border-t border-border/70">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-6 rounded-xl shadow-xs hover:bg-primary/95 flex items-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3.5 border-b border-border/70 pb-5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Change Password</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ensure your account is using a secure, strong password.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Current Password *
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="h-11 pr-10 rounded-xl bg-background border-border text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Required to confirm identity</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  New Password *
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="h-11 pr-10 rounded-xl bg-background border-border text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  8–30 characters, including one uppercase letter, one number, and one special character.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Confirm New Password *
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="h-11 pr-10 rounded-xl bg-background border-border text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/70">
                <Button
                  type="submit"
                  disabled={changingPassword || hasPasswordErrors}
                  className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-6 rounded-xl shadow-xs hover:bg-primary/95 flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3.5 border-b border-border/70 pb-5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Notification Preferences</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage how and when you receive updates about your bookings.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">Booking Confirmation Emails</p>
                  <p className="text-[11px] text-muted-foreground">Receive instant confirmation emails when you book an event or service.</p>
                </div>
                <Switch
                  checked={notifications.emailBookings}
                  onCheckedChange={(val) => setNotifications((n) => ({ ...n, emailBookings: val }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">SMS & WhatsApp Alerts</p>
                  <p className="text-[11px] text-muted-foreground">Get reminder alerts on your phone prior to booked events.</p>
                </div>
                <Switch
                  checked={notifications.smsAlerts}
                  onCheckedChange={(val) => setNotifications((n) => ({ ...n, smsAlerts: val }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">Promotions & Discounts</p>
                  <p className="text-[11px] text-muted-foreground">Receive updates on upcoming promo codes and special deals.</p>
                </div>
                <Switch
                  checked={notifications.promos}
                  onCheckedChange={(val) => setNotifications((n) => ({ ...n, promos: val }))}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border/70">
                <Button
                  onClick={() => toast.success("Notification preferences saved!")}
                  className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-6 rounded-xl shadow-xs hover:bg-primary/95 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Save Notifications
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AccountSettingsContent;
