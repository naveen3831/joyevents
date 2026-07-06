import { useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Lock, ArrowRight, CheckCircle } from "lucide-react";
import { apiResetPasswordWithToken } from "@/lib/api";
import { validateNewPasswordForm, PASSWORD_HINT } from "@/lib/validation";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const redirectParam = searchParams.get("redirect") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdErr = validateNewPasswordForm(newPassword, confirm);
    if (pwdErr) { toast.error(pwdErr); return; }
    setLoading(true);
    try {
      await apiResetPasswordWithToken(token, newPassword);
      setDone(true);
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="flex min-h-[80vh] items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-8"
        >
          {!token ? (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">Invalid or missing reset token.</p>
              <Link to={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}><Button variant="outline">Back to Login</Button></Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="font-display text-2xl font-bold">Password Updated</h2>
              <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => navigate(`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`)}>
                Sign In <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold">Set New Password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Min. 8 characters"
                      className="border-border bg-secondary pl-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Repeat password"
                      className="border-border bg-secondary pl-10"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </section>
    </Layout>
  );
};

export default ResetPassword;

