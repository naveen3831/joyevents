import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { apiRegister } from "@/lib/api";
import { Link } from "react-router-dom";
import { sanitizeEmailInput, sanitizeNameInput, validateSignupForm, NAME_MAX_LENGTH, NAME_HINT, EMAIL_HINT, PASSWORD_HINT, EMAIL_MAX_LENGTH } from "@/lib/validation";
const Register = () => {
    const { role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get("redirect");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const formErr = validateSignupForm(email, password, { name });
        if (formErr) {
            toast.error(formErr);
            return;
        }
        try {
            const payloadRole = role;
            await apiRegister({ name, email, password, role: payloadRole });
            // Don't auto-login — show success and redirect to login
            toast.success("Account created! Please sign in to continue.");
            const loginUrl = `/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`;
            navigate(loginUrl, { replace: true });
        }
        catch (err) {
            toast.error(err?.message || "Something went wrong");
        }
    };
    return (<Layout>
      <section className="relative flex min-h-[80vh] items-center justify-center py-12 px-4 bg-gradient-dark overflow-hidden">
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none animate-pulse duration-[6000ms]"/>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-[90px] pointer-events-none"/>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 glass overflow-hidden">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold">Create Your Account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign up to get started with Eventoza</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input placeholder="John Doe" maxLength={NAME_MAX_LENGTH} className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-10 h-10 rounded-xl transition-all duration-200" value={name} onChange={(e) => setName(sanitizeNameInput(e.target.value))}/>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{NAME_HINT}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input type="text" inputMode="email" autoComplete="email" placeholder="user@gmail.com" maxLength={EMAIL_MAX_LENGTH} className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-10 h-10 rounded-xl transition-all duration-200" value={email} onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}/>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{EMAIL_HINT}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input type={showPassword ? "text" : "password"} maxLength={30} placeholder="••••••••" className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-10 pr-10 h-10 rounded-xl transition-all duration-200" value={password} onChange={(e) => setPassword(e.target.value)}/>
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
            </div>

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" size="lg">
              Sign Up
              <ArrowRight className="ml-2 h-4 w-4"/>
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`} className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </motion.div>
      </section>
    </Layout>);
};
export default Register;
