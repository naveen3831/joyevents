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
      <section className="relative flex md:min-h-[80vh] items-start md:items-center justify-center py-4 sm:py-8 lg:py-12 px-4 bg-gradient-dark overflow-hidden">
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full bg-primary/10 blur-[100px] pointer-events-none animate-pulse duration-[6000ms]"/>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[200px] h-[200px] rounded-full bg-amber-500/5 blur-[90px] pointer-events-none"/>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md rounded-2xl md:rounded-3xl shadow-2xl p-5 sm:p-6 md:p-8 glass overflow-hidden my-2 sm:my-4">
          {done ? (<div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-500"/>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">Check Your Email</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we sent a password reset link.
                Check your inbox and spam folder.
              </p>
              <Link to={loginHref}>
                <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-11 rounded-xl">
                  Back to Login <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              </Link>
            </div>) : (<>
              <div className="mb-4 sm:mb-6 text-center">
                <h1 className="font-display text-xl sm:text-2xl font-bold">Forgot Password</h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">We’ll email you a link to reset your password.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                    <Input type="text" inputMode="email" autoComplete="email" placeholder="user@gmail.com" maxLength={EMAIL_MAX_LENGTH} className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-11 h-11 sm:h-12 text-sm rounded-xl transition-all duration-200" value={email} onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))} required/>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{EMAIL_HINT}</p>
                </div>

                <Button type="submit" className="w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" size="lg" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4"/>}
                </Button>
              </form>

              <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link to={loginHref} className="font-semibold text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </>)}
        </motion.div>
      </section>
    </Layout>);
};
export default ForgotPassword;
