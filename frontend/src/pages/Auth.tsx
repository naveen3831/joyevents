import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { dashboardPaths, roleLabels } from "@/lib/auth";
import { apiLogin, apiRegister } from "@/lib/api";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  validateLoginForm,
  validateSignupForm,
  NAME_MAX_LENGTH,
  NAME_HINT,
  EMAIL_HINT,
  PASSWORD_HINT,
  EMAIL_MAX_LENGTH,
} from "@/lib/validation";

const Auth = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const modeParam = queryParams.get("mode");

  // Initialize based on URL query param:                                                                     
  // - ?mode=register shows signup
  // - ?mode=login or no param shows login
  const [isLogin, setIsLogin] = useState(modeParam !== "register");
  const { role, setRole, setIsLoggedIn, setToken, setUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErr = isLogin
      ? validateLoginForm(email, password)
      : validateSignupForm(email, password, { name });
    if (formErr) {
      toast.error(formErr);
      return;
    }
    try {
      const payloadRole = role;
      const res = isLogin
        ? await apiLogin({ email, password })
        : await apiRegister({ name, email, password, role: payloadRole });
      const userRole = res?.user?.role === "user" ? "customer" : res?.user?.role;
      setToken(res?.token || null);
      setUser(res?.user ? { _id: res.user._id, name: res.user.name, email: res.user.email, role: userRole, createdAt: res.user.createdAt, updatedAt: res.user.updatedAt } : null);
      setRole(userRole);
      setIsLoggedIn(true);
      toast.success(isLogin ? `${roleLabels[userRole]} login successful!` : `${roleLabels[userRole]} account created successfully!`);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
      const authReturnTo = queryParams.get("redirect") || localStorage.getItem("authReturnTo");
      if (authReturnTo) {
        if (!queryParams.get("redirect")) localStorage.removeItem("authReturnTo");
        navigate(authReturnTo);
        return;
      }
      
      navigate(dashboardPaths[userRole]);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  return (
    <Layout>
      <section className="flex min-h-[80vh] items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8"
        >
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold">
              {isLogin ? "Welcome Back" : "Create Your Account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin ? "Enter your credentials to access your account." : "Sign up to get started."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label className="text-sm text-muted-foreground">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="John Doe"
                    maxLength={NAME_MAX_LENGTH}
                    className="border-border bg-secondary pl-10"
                    value={name}
                    onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{NAME_HINT}</p>
              </div>
            )}
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="text" inputMode="email" autoComplete="email" placeholder="user@gmail.com" maxLength={EMAIL_MAX_LENGTH} className="border-border bg-secondary pl-10" value={email} onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{EMAIL_HINT}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="border-border bg-secondary pl-10" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {!isLogin && <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_HINT}</p>}
            </div>

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" size="lg">
              {isLogin ? "Login" : "Sign Up"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Auth;
