import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, User, Mail, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiChangePassword } from "@/lib/api";
import { validateNewPasswordForm, validatePassword, PASSWORD_HINT } from "@/lib/validation";
const defaultFormatRole = (role) => {
    if (!role)
        return "User";
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
    const newPasswordError = passwordForm.newPassword ? validatePassword(passwordForm.newPassword) : "New password is required";
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
            await apiChangePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            }, token);
            toast.success("Password changed successfully!");
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        }
        catch (error) {
            toast.error(error?.message || "Failed to change password");
        }
        finally {
            setLoading(false);
        }
    };
    return (<section className="py-2 sm:py-8 lg:py-10">
      <div className="container mx-auto max-w-2xl">
        {backLink && (<Link to={backLink.to} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            {backLink.label}
          </Link>)}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold">
            Account <span className="text-gradient">Settings</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Manage your account settings and security</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary"/>
            Profile Information
          </h2>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Name</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground"/>
                {user?.name}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground"/>
                {user?.email}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Role</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm capitalize">
                <Lock className="h-4 w-4 text-muted-foreground"/>
                {formatRole(user?.role)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              ℹ️ To update your profile information, please contact support.
            </p>
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} onSubmit={handlePasswordChange} className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-primary"/>
            Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Current Password</Label>
              <div className="relative mt-1">
                <Input type={showPasswords.current ? "text" : "password"} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="Enter current password" maxLength={30} aria-invalid={!!currentPasswordError} className="pr-10 bg-card border-border" required/>
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswords.current ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}
                </button>
              </div>
              <p className={`mt-1 text-xs ${currentPasswordError ? "text-destructive" : "text-muted-foreground"}`}>
                {currentPasswordError || "Current password entered"}
              </p>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">New Password</Label>
              <div className="relative mt-1">
                <Input type={showPasswords.new ? "text" : "password"} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Enter new password" maxLength={30} aria-invalid={!!newPasswordError} className="pr-10 bg-card border-border" required/>
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswords.new ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}
                </button>
              </div>
              <p className={`mt-1 text-xs ${newPasswordError ? "text-destructive" : "text-muted-foreground"}`}>
                {newPasswordError || PASSWORD_HINT}
              </p>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Confirm New Password</Label>
              <div className="relative mt-1">
                <Input type={showPasswords.confirm ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Confirm new password" maxLength={30} aria-invalid={!!confirmPasswordError} className="pr-10 bg-card border-border" required/>
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswords.confirm ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}
                </button>
              </div>
              <p className={`mt-1 text-xs ${confirmPasswordError ? "text-destructive" : "text-muted-foreground"}`}>
                {confirmPasswordError || "Passwords match"}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" size="lg" disabled={loading || hasPasswordErrors}>
                <Save className="mr-2 h-4 w-4"/>
                {loading ? "Changing Password..." : "Change Password"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })} disabled={loading}>
                Reset
              </Button>
            </div>
          </div>
        </motion.form>
      </div>
    </section>);
};
export default AccountSettingsContent;
