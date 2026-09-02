import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, Ticket, Handshake, ShieldCheck } from "lucide-react";
import { useGsapReveal, useGsapParallax } from "@/lib/gsapAnimations";
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
    const cardRef = useGsapReveal({ y: 24, duration: 0.7 });
    const orb1Ref = useGsapParallax(0.3);
    const orb2Ref = useGsapParallax(-0.2);
    // If already logged in, check if we should redirect to saved target or dashboard
    useEffect(() => {
        sessionStorage.removeItem("forceLoginNoRedirect");
        if (isLoggedIn && role) {
            const savedReturnTo = localStorage.getItem("authReturnTo") || sessionStorage.getItem("postLoginRedirect");
            const stateFrom = location.state?.from;
            const rawTarget = redirectParam || stateFrom || savedReturnTo;

            let target = dashboardPaths[role] || "/customer-dashboard";
            if (role === "customer" && rawTarget && typeof rawTarget === "string" && rawTarget.startsWith("/") && !rawTarget.startsWith("//")) {
                target = rawTarget;
            } else if (role !== "customer") {
                if (rawTarget && typeof rawTarget === "string" && rawTarget.startsWith(`/${role}-dashboard`)) {
                    target = rawTarget;
                } else {
                    target = dashboardPaths[role] || "/customer-dashboard";
                }
            }

            localStorage.removeItem("authReturnTo");
            sessionStorage.removeItem("postLoginRedirect");
            navigate(target, { replace: true });
        }
    }, [isLoggedIn, role, navigate, redirectParam, location]);

    // Show error if redirected due to deactivation
    useEffect(() => {
        const errorParam = searchParams.get("error");
        if (errorParam === "deactivated") {
            toast.error("Your account has been deactivated. Please contact the administrator.");
            navigate("/login", { replace: true });
        }
    }, [location.search, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formErr = validateLoginForm(email, password);
        if (formErr) {
            toast.error(formErr);
            return;
        }
        try {
            const res = await apiLogin({ email, password });
            const userRole = res?.user?.role === "user" ? "customer" : res?.user?.role;
            const fullUser = res?.user ? { ...res.user, role: userRole } : null;
            // Update localStorage immediately so ProtectedRoute can see it
            localStorage.setItem("token", res?.token || "");
            if (fullUser) {
                localStorage.setItem("user", JSON.stringify(fullUser));
            }
            localStorage.setItem("role", userRole);

            const savedReturnTo = localStorage.getItem("authReturnTo") || sessionStorage.getItem("postLoginRedirect");
            const stateFrom = location.state?.from;
            const rawTarget = redirectParam || stateFrom || savedReturnTo;

            let target = dashboardPaths[userRole] || "/customer-dashboard";
            if (userRole === "customer" && rawTarget && typeof rawTarget === "string" && rawTarget.startsWith("/") && !rawTarget.startsWith("//")) {
                target = rawTarget;
            } else if (userRole !== "customer") {
                if (rawTarget && typeof rawTarget === "string" && rawTarget.startsWith(`/${userRole}-dashboard`)) {
                    target = rawTarget;
                } else {
                    target = dashboardPaths[userRole] || "/customer-dashboard";
                }
            }

            localStorage.removeItem("authReturnTo");
            sessionStorage.removeItem("postLoginRedirect");

            // Update state
            setToken(res?.token || null);
            setUser(fullUser);
            setRole(userRole);
            setIsLoggedIn(true);
            setSessionActive();
            toast.success(`${roleLabels[userRole]} login successful!`);
            
            navigate(target, { replace: true });
        }
        catch (err) {
            toast.error(err?.message || "Something went wrong");
        }
    };
    return (<Layout>
      <section className="relative flex min-h-[85vh] items-center justify-center py-12 px-4 overflow-hidden bg-gradient-dark">
        {/* Background Glowing Ambient Orbs — parallax on scroll */}
        <div ref={orb1Ref} className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/20 blur-[100px] pointer-events-none"/>
        <div ref={orb2Ref} className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] rounded-full bg-accent/10 blur-[90px] pointer-events-none"/>

        <div ref={cardRef} className="relative w-full max-w-3xl flex flex-col md:flex-row rounded-3xl shadow-2xl overflow-hidden glass">

          {/* LEFT SIDE: Visual Showcase (Hidden on mobile) */}
          <div className="hidden md:flex md:w-1/2 flex-col justify-between p-6 lg:p-8 bg-gradient-to-br from-primary/10 via-secondary/30 to-accent/5 relative overflow-hidden border-r border-border/50">
            {/* Decorative background grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"/>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5"/> The Premier Event Platform
              </span>
              <h2 className="font-display text-3xl font-black mt-6 tracking-tight leading-tight">
                Unlock Joy in <br />
                <span className="text-gradient">Every Celebration</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground max-w-md leading-relaxed">
                Connect with professional merchants, discover trending ticketed events, and coordinate full-service entertainment packages flawlessly.
              </p>
            </div>

            {/* Feature lists */}
            <div className="space-y-4 my-6 relative z-10">
              {[
            { icon: Ticket, tint: "bg-tint-orange text-tint-orange-fg", title: "Ticketed & Public Events", desc: "Easily book sessions, choose ticket tiers, and secure seats." },
            { icon: Handshake, tint: "bg-tint-pink text-tint-pink-fg", title: "Professional Merchants", desc: "Collaborate directly with top event coordinators and service providers." },
            { icon: ShieldCheck, tint: "bg-tint-violet text-tint-violet-fg", title: "Seamless & Secure Booking", desc: "Encrypted payments, instant approvals, and real-time support." }
        ].map((feat, idx) => (<motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * idx }} className="flex gap-4 items-start">
                  <span className={`tint-chip h-10 w-10 shrink-0 shadow-sm ${feat.tint}`}>
                    <feat.icon className="h-4.5 w-4.5"/>
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{feat.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                  </div>
                </motion.div>))}
            </div>

            <div className="relative z-10 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>© Eventoza Platform</span>
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"/>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success"/>
                </span>
                Live & Secure
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: Login Form */}
          <div className="w-full md:w-1/2 p-6 lg:p-8 flex flex-col justify-center bg-transparent">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-black tracking-tight">Welcome Back</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                    <Input type="text" inputMode="email" autoComplete="email" placeholder="name@gmail.com" maxLength={EMAIL_MAX_LENGTH} className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-11 h-11 text-sm rounded-xl transition-all duration-200" value={email} onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}/>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-1">{EMAIL_HINT}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
                    <Link to={`/forgot-password${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`} className="text-xs font-semibold text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                    <Input type={showPassword ? "text" : "password"} maxLength={30} placeholder="••••••••" className="border-border bg-secondary/50 hover:bg-secondary/80 focus:bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 pl-11 pr-11 h-11 text-sm rounded-xl transition-all duration-200" value={password} onChange={(e) => setPassword(e.target.value)}/>
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                      {showPassword ? <Eye className="h-4.5 w-4.5"/> : <EyeOff className="h-4.5 w-4.5"/>}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 mt-2 bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 shadow-glow transition-all active:scale-[0.99]" size="lg">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to={`/register${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`} className="font-semibold text-primary hover:underline">
                  Create Account
                </Link>
              </p>
            </motion.div>
          </div>

        </div>
      </section>
    </Layout>);
};
export default Login;
