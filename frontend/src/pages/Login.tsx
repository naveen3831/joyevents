import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { dashboardPaths, roleLabels } from "@/lib/auth";
import { apiLogin } from "@/lib/api";
import { Link } from "react-router-dom";
import { setSessionActive } from "@/lib/session";
import { sanitizeEmailInput, validateLoginForm, EMAIL_HINT, EMAIL_MAX_LENGTH } from "@/lib/validation";

const Login = () => {
  const { role, setRole, setIsLoggedIn, setToken, setUser, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, check if we should redirect to dashboard or wait for authReturnTo
  useEffect(() => {
    sessionStorage.removeItem("forceLoginNoRedirect");
    if (!redirectParam) {
      localStorage.removeItem("authReturnTo");
    }
    console.log('📋 Login useEffect - isLoggedIn:', isLoggedIn, 'role:', role, 'redirectParam:', redirectParam);

    if (isLoggedIn && role && !redirectParam) {
      console.log('✅ Already logged in with no return URL, redirecting to dashboard');
      navigate(dashboardPaths[role], { replace: true });
    } else if (isLoggedIn && role && redirectParam) {
      console.log('⏳ Already logged in WITH redirect, will auto-redirect...');
      setTimeout(() => {
        navigate(redirectParam, { replace: true });
      }, 100);
    }
  }, [isLoggedIn, role, navigate, redirectParam]);

  // Show error if redirected due to deactivation
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "deactivated") {
      toast.error("Your account has been deactivated. Please contact the administrator.");
      navigate("/login", { replace: true });
    }
  }, [location.search, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErr = validateLoginForm(email, password);
    if (formErr) {
      toast.error(formErr);
      return;
    }
    try {
      const res = await apiLogin({ email, password });
      const userRole = res?.user?.role === "user" ? "customer" : res?.user?.role;

      // Update localStorage immediately so ProtectedRoute can see it
      localStorage.setItem("token", res?.token || "");
      localStorage.setItem("user", JSON.stringify(res?.user ? {
        _id: res.user._id || res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: userRole,
      } : {}));
      localStorage.setItem("role", userRole);

      // Update state
      setToken(res?.token || null);
      setUser(res?.user ? {
        _id: res.user._id || res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: userRole,
        createdAt: res.user.createdAt || "",
        updatedAt: res.user.updatedAt || "",
      } : null);
      setRole(userRole);
      setIsLoggedIn(true);
      setSessionActive();

      toast.success(`${roleLabels[userRole]} login successful!`);
      const target = redirectParam || dashboardPaths[userRole];
      if (!redirectParam) {
        localStorage.removeItem("authReturnTo");
      }
      navigate(target, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  return (
    <Layout>
      <section className="relative flex min-h-[85vh] items-center justify-center py-12 px-4 overflow-hidden bg-background">
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/20 blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />

        <div className="relative w-full max-w-5xl flex flex-col md:flex-row rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
          
          {/* LEFT SIDE: Visual Showcase (Hidden on mobile) */}
          <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-secondary/30 to-amber-500/5 relative overflow-hidden border-r border-white/5">
            {/* Decorative background grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
                ✨ The Premier Event Platform
              </span>
              <h2 className="font-display text-4xl font-black mt-6 tracking-tight leading-tight">
                Unlock Joy in <br />
                <span className="text-gradient">Every Celebration</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground max-w-md leading-relaxed">
                Connect with professional merchants, discover trending ticketed events, and coordinate full-service entertainment packages flawlessly.
              </p>
            </div>

            {/* Feature lists */}
            <div className="space-y-5 my-8 relative z-10">
              {[
                { icon: "🎟️", title: "Ticketed & Public Events", desc: "Easily book sessions, choose ticket tiers, and secure seats." },
                { icon: "🤝", title: "Professional Merchants", desc: "Collaborate directly with top event coordinators and service providers." },
                { icon: "🛡️", title: "Seamless & Secure Booking", desc: "Encrypted payments, instant approvals, and real-time support." }
              ].map((feat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 * idx }}
                  className="flex gap-4 items-start"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/80 border border-white/10 text-lg shadow-sm">
                    {feat.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{feat.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
              <span>© JoyEvents Platform</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping shrink-0" />
                Live & Secure
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: Login Form */}
          <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-card/10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-8">
                <h1 className="font-display text-3xl font-black tracking-tight">Welcome Back</h1>
                <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      type="text" 
                      inputMode="email" 
                      autoComplete="email" 
                      placeholder="name@gmail.com" 
                      maxLength={EMAIL_MAX_LENGTH} 
                      className="border-white/10 bg-secondary/50 focus-visible:ring-primary/40 pl-11 h-11 text-sm rounded-xl" 
                      value={email} 
                      onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))} 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-1">{EMAIL_HINT}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
                    <Link
                      to={`/forgot-password${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      maxLength={30} 
                      placeholder="••••••••" 
                      className="border-white/10 bg-secondary/50 focus-visible:ring-primary/40 pl-11 pr-11 h-11 text-sm rounded-xl" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 mt-2 bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 shadow-glow transition-all active:scale-[0.99]" 
                  size="lg"
                >
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to={`/register${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}
                  className="font-semibold text-primary hover:underline"
                >
                  Create Account
                </Link>
              </p>
            </motion.div>
          </div>

        </div>
      </section>
    </Layout>
  );
};

export default Login;
