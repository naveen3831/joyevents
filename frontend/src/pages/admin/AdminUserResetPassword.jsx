import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Loader2, AlertCircle, Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListUsers, apiResetPassword } from "@/lib/api";
import { validateNewPasswordForm, PASSWORD_HINT } from "@/lib/validation";

const AdminUserResetPassword = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const res = await apiListUsers(token);
        const found = (res.users || []).find((u) => u._id === id || u.id === id);
        if (found) {
          setUser(found);
        } else {
          setError("User not found.");
        }
      } catch (err) {
        setError(err?.message || "Failed to load user details");
        toast.error(err?.message || "Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !user) return;
    const pwdErr = validateNewPasswordForm(password);
    if (pwdErr) {
      toast.error(pwdErr);
      return;
    }

    setSubmitting(true);
    try {
      await apiResetPassword(user._id, password, token);
      toast.success(`Password reset successfully for ${user.name}`);
      navigate(`/admin-dashboard/users/${user._id}`);
    } catch (err) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[850px] mx-auto space-y-4 font-sans">
        <PageHeader
          title="Reset Password"
          subtitle="Set a new account password for this user."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "User Management", to: "/admin-dashboard/users" },
            { label: user ? user.name : "User Details", to: `/admin-dashboard/users/${id}` },
            { label: "Reset Password" },
          ]}
          className="!mb-4"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin-dashboard/users/${id}`)}
              className="h-9 text-xs font-semibold rounded-md gap-1.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back to User Details
            </Button>
          }
        />

        {loading ? (
          <div className="bg-card border border-border/80 rounded-xl p-16 flex items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading user details...
          </div>
        ) : error || !user ? (
          <div className="bg-card border border-border/80 rounded-xl p-12 text-center text-muted-foreground shadow-xs">
            <AlertCircle className="mx-auto mb-2.5 h-9 w-9 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground mb-1">{error || "User Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The user profile does not exist or has been deleted.
            </p>
            <Button
              onClick={() => navigate("/admin-dashboard/users")}
              className="h-9 text-xs font-semibold bg-primary text-primary-foreground rounded-md"
            >
              Return to Users & Merchants
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-xl shadow-sm p-6 sm:p-8 w-full space-y-6"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-border/60">
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Reset Password for {user.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Email: <span className="font-semibold text-foreground">{user.email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pwd" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> New Password *
                </Label>
                <div className="relative">
                  <Input
                    id="pwd"
                    type={showPassword ? "text" : "password"}
                    maxLength={30}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-11 text-sm rounded-lg w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{PASSWORD_HINT}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin-dashboard/users/${user._id}`)}
                  className="h-10 px-5 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Resetting Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" /> Reset Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUserResetPassword;
