import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";
import { apiForgotPassword } from "@/lib/api";
import { sanitizeEmailInput, validateEmail, EMAIL_HINT, EMAIL_MAX_LENGTH } from "@/lib/validation";
const ForgotPassword = () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get("redirect") || "";
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const emailErr = validateEmail(email);
        if (emailErr) {
            toast.error(emailErr);
            return;
        }
        setLoading(true);
        try {
            await apiForgotPassword(email.trim(), redirectParam || undefined);
            setDone(true);
            toast.success("If that email exists, a reset link has been sent.");
        }
        catch (err) {
            toast.error(err?.message || "Failed to send reset email");
        }
        finally {
            setLoading(false);
        }
    };
    const loginHref = `/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`;
    return (<Layout>
      <section className="flex min-h-[80vh] items-center justify-center py-12 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
          {done ? (<div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle className="h-8 w-8 text-green-500"/>
              </div>
              <h2 className="font-display text-2xl font-bold">Check Your Email</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we sent a password reset link.
                Check your inbox and spam folder.
              </p>
              <Link to={loginHref}>
                <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  Back to Login <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              </Link>
            </div>) : (<>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold">Forgot Password</h1>
                <p className="mt-1 text-sm text-muted-foreground">We’ll email you a link to reset your password.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                    <Input type="text" inputMode="email" autoComplete="email" placeholder="user@gmail.com" maxLength={EMAIL_MAX_LENGTH} className="border-border bg-secondary pl-10" value={email} onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))} required/>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{EMAIL_HINT}</p>
                </div>

                <Button type="submit" className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90" size="lg" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4"/>}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link to={loginHref} className="font-medium text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </>)}
        </motion.div>
      </section>
    </Layout>);
};
export default ForgotPassword;
