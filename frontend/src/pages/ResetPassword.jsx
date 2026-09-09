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
    const handleSubmit = async (e) => {
        e.preventDefault();
        const pwdErr = validateNewPasswordForm(newPassword, confirm);
        if (pwdErr) {
            toast.error(pwdErr);
            return;
        }
        setLoading(true);
        try {
            await apiResetPasswordWithToken(token, newPassword);
            setDone(true);
            toast.success("Password reset successfully!");
        }
        catch (err) {
            toast.error(err?.message || "Failed to reset password");
        }
        finally {
            setLoading(false);
        }
    };
    return (<Layout>
      <section className="relative flex md:min-h-[80vh] items-start md:items-center justify-center py-4 sm:py-8 lg:py-12 px-4 bg-gradient-dark overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md rounded-2xl md:rounded-3xl shadow-2xl p-5 sm:p-6 md:p-8 glass overflow-hidden my-2 sm:my-4">
          {!token ? (<div className="text-center space-y-3">
              <p className="text-muted-foreground text-xs sm:text-sm">Invalid or missing reset token.</p>
              <Link to={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}><Button variant="outline" className="h-11 rounded-xl">Back to Login</Button></Link>
            </div>) : done ? (<div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-500"/>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">Password Updated</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Your password has been reset successfully.</p>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-11 rounded-xl" onClick={() => navigate(`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`)}>
                Sign In <ArrowRight className="ml-2 h-4 w-4"/>
              </Button>
            </div>) : (<>
              <div className="mb-4 sm:mb-6 text-center">
                <h1 className="font-display text-xl sm:text-2xl font-bold">Set New Password</h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Choose a strong password for your account.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                    <Input type="password" placeholder="Min. 8 characters" className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-11 h-11 sm:h-12 text-sm rounded-xl transition-all duration-200" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required/>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{PASSWORD_HINT}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                    <Input type="password" placeholder="Repeat password" className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-11 h-11 sm:h-12 text-sm rounded-xl transition-all duration-200" value={confirm} onChange={(e) => setConfirm(e.target.value)} required/>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow mt-2" size="lg" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4"/>}
                </Button>
              </form>
            </>)}
        </motion.div>
      </section>
    </Layout>);
};
export default ResetPassword;
