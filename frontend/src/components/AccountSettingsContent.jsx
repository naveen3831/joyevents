import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, User, Mail, Save, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiChangePassword } from "@/lib/api";
import { validateNewPasswordForm, validatePassword, PASSWORD_HINT } from "@/lib/validation";

const defaultFormatRole = (role) => {
  if (!role) return "User";
  return role === "user" ? "Customer" : role.charAt(0).toUpperCase() + role.slice(1);
};

const AccountSettingsContent = ({ backLink, formatRole = defaultFormatRole }) => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
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

  const handlePasswordChange = async (e) => {
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
    setLoading(true);
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
      setLoading(false);
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

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile information and account security.
        </p>
      </div>

      {/* Two-Column Grid for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
        {/* Left Column: Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-[16px] border border-[#E5E7EB] bg-card p-6 shadow-[0_2px_10px_rgba(15,23,42,0.04)] w-full"
        >
          {/* Card Header */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-foreground leading-snug">
                Profile Information
              </h2>
              <p className="text-[14px] text-muted-foreground mt-0.5">
                Your personal account details and registered credentials.
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-[#E5E7EB]" />

          {/* Form Fields */}
          <div className="space-y-4 w-full">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Full Name</Label>
              <div className="h-[48px] px-4 flex items-center rounded-xl border border-border/70 bg-muted/30 text-sm font-semibold text-foreground w-full">
                {user?.name || "User"}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Email Address</Label>
              <div className="h-[48px] px-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 w-full">
                <div className="flex items-center gap-2.5 text-sm font-medium text-foreground truncate min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{user?.email || "—"}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Account Role</Label>
              <div className="h-[48px] px-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 w-full">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground capitalize">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>{formatRole(user?.role)}</span>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full shrink-0 border border-border/50">
                  🔒 System Managed
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Change Password */}
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onSubmit={handlePasswordChange}
          className="rounded-[16px] border border-[#E5E7EB] bg-card p-6 shadow-[0_2px_10px_rgba(15,23,42,0.04)] w-full"
        >
          {/* Card Header */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-foreground leading-snug">
                Change Password
              </h2>
              <p className="text-[14px] text-muted-foreground mt-0.5">
                Ensure your account is using a secure, strong password.
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-[#E5E7EB]" />

          {/* Form Fields */}
          <div className="space-y-4 w-full">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs font-semibold text-foreground">
                Current Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative w-full">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  placeholder="Enter current password"
                  maxLength={30}
                  aria-invalid={!!currentPasswordError}
                  className="pr-11 bg-card border-border rounded-xl text-sm h-[48px] w-full"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title={showPasswords.current ? "Hide password" : "Show password"}
                >
                  {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              <p
                className={`text-xs mt-1 ${
                  currentPasswordError && passwordForm.currentPassword ? "text-rose-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {passwordForm.currentPassword ? currentPasswordError : "Required to confirm identity"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                New Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative w-full">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  placeholder="Enter new password"
                  maxLength={30}
                  aria-invalid={!!newPasswordError}
                  className="pr-11 bg-card border-border rounded-xl text-sm h-[48px] w-full"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title={showPasswords.new ? "Hide password" : "Show password"}
                >
                  {showPasswords.new ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              <p
                className={`text-xs mt-1 ${
                  newPasswordError && passwordForm.newPassword ? "text-rose-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {passwordForm.newPassword ? newPasswordError : PASSWORD_HINT}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                Confirm New Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative w-full">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm new password"
                  maxLength={30}
                  aria-invalid={!!confirmPasswordError}
                  className="pr-11 bg-card border-border rounded-xl text-sm h-[48px] w-full"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title={showPasswords.confirm ? "Hide password" : "Show password"}
                >
                  {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              <p
                className={`text-xs mt-1 ${
                  confirmPasswordError && passwordForm.confirmPassword ? "text-rose-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {passwordForm.confirmPassword ? confirmPasswordError : "Passwords must match"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                }
                disabled={loading}
                className="h-[48px] rounded-xl text-sm font-semibold px-5 border-border w-full sm:w-auto"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={loading || hasPasswordErrors}
                className="bg-gradient-primary text-white hover:opacity-90 h-[48px] rounded-xl text-sm font-semibold px-6 w-full sm:w-auto shadow-md transition-opacity"
              >
                {loading ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default AccountSettingsContent;
