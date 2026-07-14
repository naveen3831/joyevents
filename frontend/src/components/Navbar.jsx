import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, X, User, Store, Shield, ChevronDown, Heart, Briefcase, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { dashboardPaths, roleLabels } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";
import { usePlatformName } from "@/hooks/usePlatformName";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { apiListCategories, apiListServices, apiListEvents } from "@/lib/api";
import { clearSession } from "@/lib/session";
import { useCart } from "@/contexts/CartContext";
const Navbar = ({ hideDashboardLinks = false, onSidebarToggle }) => {
    const { role, isLoggedIn, setIsLoggedIn, setToken, setUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expandedMobileMenu, setExpandedMobileMenu] = useState(null);
    const dashboardPath = dashboardPaths[role];
    const platformName = usePlatformName();
    const { cartCount } = useCart();
    useEffect(() => {
        document.title = platformName;
    }, [platformName]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [eventCategories, setEventCategories] = useState([]);
    const isLoginPage = location.pathname === "/login";
    const isRegisterPage = location.pathname === "/register";
    const isAuthPage = isLoginPage || isRegisterPage;
    const handleLogout = () => {
        sessionStorage.setItem("forceLoginNoRedirect", "1");
        setIsLoggedIn(false);
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("authReturnTo");
        clearSession();
        sessionStorage.removeItem("bookingReturnTo");
        setMobileOpen(false);
        navigate("/login", { replace: true });
    };
    useEffect(() => {
        // Fetch Services Categories
        Promise.all([
            apiListCategories("service").catch(() => ({ categories: [] })),
            apiListServices().catch(() => ({ services: [] }))
        ])
            .then(([catsRes, svcsRes]) => {
            const dbCats = catsRes.categories || [];
            const svcs = svcsRes.services || [];
            const allCategories = Array.from(new Set([
                ...dbCats.map((c) => c.name),
                ...svcs.map((s) => s.category || "General")
            ]));
            // Make into an array of objects to map over easily
            setServiceCategories(allCategories.map(name => ({ _id: name, name })));
        })
            .catch((err) => {
        });
        // Fetch Events Categories
        Promise.all([
            apiListCategories("event").catch(() => ({ categories: [] })),
            apiListEvents().catch(() => ({ events: [] }))
        ])
            .then(([catsRes, eventsRes]) => {
            const dbCats = catsRes.categories || [];
            const evts = eventsRes.events || [];
            const allCategories = Array.from(new Set([
                ...dbCats.map((c) => c.name),
                ...evts.map((e) => e.category || "General")
            ]));
            setEventCategories(allCategories.map(name => ({ _id: name, name })));
        })
            .catch((err) => {
        });
    }, []);
    // Customers see no nav links — they use the customer dashboard sidebar instead
    const isCustomer = isLoggedIn && role === "customer";
    let navLinks = isCustomer ? [] : [
        { to: "/", label: "Home" },
        { to: "/events", label: "Events" },
        { to: "/services", label: "Our Services" },
        { to: "/portfolio", label: "Our Portfolio" },
        { to: "/about", label: "About Us" },
        { to: "/contact", label: "Contact Us" },
        { to: "/reviews", label: "Reviews" },
        { to: "/blog", label: "Blog" },
        ...(isLoggedIn ? [{ to: dashboardPath, label: "Dashboard" }] : []),
    ];
    // Filter out dashboard links when in admin/merchant dashboards
    if (hideDashboardLinks) {
        navLinks = navLinks.filter(link => !["Home", "Events", "Our Services", "Our Portfolio", "About Us", "Contact Us", "Reviews", "Blog", "Dashboard"].includes(link.label));
    }
    const logoElement = hideDashboardLinks ? (<div className="flex items-center gap-2 cursor-default shrink-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
        <Calendar className="h-5 w-5 text-primary-foreground"/>
      </div>
      <span className="font-display text-lg font-bold text-foreground hidden sm:block">{platformName}</span>
    </div>) : isCustomer ? (<Link to="/customer-dashboard" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
        <Calendar className="h-5 w-5 text-primary-foreground"/>
      </div>
      <span className="font-display text-lg font-bold text-foreground hidden sm:block">{platformName}</span>
    </Link>) : (<Link to="/" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
        <Calendar className="h-5 w-5 text-primary-foreground"/>
      </div>
      <span className="font-display text-lg font-bold text-foreground hidden sm:block">{platformName}</span>
    </Link>);
    const roleIcons = { customer: User, merchant: Store, admin: Shield };
    const RoleIcon = roleIcons[role] || User;
    return (<>
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className="fixed left-0 right-0 top-0 z-50 w-full glass">
        <div className="flex items-center justify-between px-3 sm:px-6 lg:px-10 xl:px-16 py-5 w-full overflow-hidden">
          {/* Hamburger — LEFT on mobile/tablet only */}
          <button className={`flex items-center justify-center w-9 h-9 rounded-lg text-foreground hover:bg-secondary transition-colors lg:hidden mr-2 shrink-0 ${hideDashboardLinks && !onSidebarToggle ? "hidden" : ""}`} onClick={() => {
            if (onSidebarToggle) {
                onSidebarToggle();
            }
            else {
                setMobileOpen(!mobileOpen);
                if (mobileOpen)
                    setExpandedMobileMenu(null);
            }
        }} aria-label="Toggle menu">
            <motion.div animate={mobileOpen ? "open" : "closed"} className="flex flex-col gap-1.5 w-5">
              <motion.span variants={{ open: { rotate: 45, y: 8 }, closed: { rotate: 0, y: 0 } }} className="block h-0.5 w-5 bg-foreground rounded-full origin-center transition-all"/>
              <motion.span variants={{ open: { opacity: 0, x: -8 }, closed: { opacity: 1, x: 0 } }} className="block h-0.5 w-5 bg-foreground rounded-full transition-all"/>
              <motion.span variants={{ open: { rotate: -45, y: -8 }, closed: { rotate: 0, y: 0 } }} className="block h-0.5 w-5 bg-foreground rounded-full origin-center transition-all"/>
            </motion.div>
          </button>

          {logoElement}

          <div className="hidden items-center gap-4 lg:flex flex-nowrap">
            {navLinks.map((link) => {
            if (link.label === "Events") {
                return (<DropdownMenu key={link.to}>
                    <DropdownMenuTrigger className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"}`}>
                      Events <ChevronDown className="h-4 w-4"/>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 bg-background/95 backdrop-blur-md border-border text-foreground">
                      <DropdownMenuItem asChild className="hover:bg-secondary cursor-pointer">
                        <Link to="/events">All Events</Link>
                      </DropdownMenuItem>
                      {eventCategories.length > 0 && <div className="h-px bg-border my-1"/>}
                      {eventCategories.map((cat) => (<DropdownMenuItem key={cat._id} asChild className="hover:bg-secondary cursor-pointer">
                          <Link to={`/events?category=${encodeURIComponent(cat.name)}`}>
                            {cat.name}
                          </Link>
                        </DropdownMenuItem>))}
                    </DropdownMenuContent>
                  </DropdownMenu>);
            }
            if (link.label === "Our Services") {
                return (<DropdownMenu key={link.to}>
                    <DropdownMenuTrigger className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"}`}>
                      Services <ChevronDown className="h-4 w-4"/>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 bg-background/95 backdrop-blur-md border-border text-foreground">
                      <DropdownMenuItem asChild className="hover:bg-secondary cursor-pointer">
                        <Link to="/services">All Services</Link>
                      </DropdownMenuItem>
                      {serviceCategories.length > 0 && <div className="h-px bg-border my-1"/>}
                      {serviceCategories.map((cat) => (<DropdownMenuItem key={cat._id} asChild className="hover:bg-secondary cursor-pointer">
                          <Link to={`/services?category=${encodeURIComponent(cat.name)}`}>
                            {cat.name}
                          </Link>
                        </DropdownMenuItem>))}
                    </DropdownMenuContent>
                  </DropdownMenu>);
            }
            return (<Link key={link.to} to={link.to} className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"}`}>
                  {link.label}
                </Link>);
        })}
          </div>

          <div className="hidden items-center gap-2 lg:flex flex-nowrap shrink-0">
            {isLoggedIn && role === "customer" && (<>
                <Link to="/customer-dashboard/favorites" className="relative text-muted-foreground hover:text-primary transition-colors shrink-0" title="Favorites">
                  <Heart className="h-5 w-5"/>
                </Link>
                <Link to="/customer-dashboard/cart" className="relative text-muted-foreground hover:text-primary transition-colors shrink-0" title="Cart">
                  <ShoppingBag className="h-5 w-5"/>
                  {cartCount > 0 && (<span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-sm">
                      {cartCount}
                    </span>)}
                </Link>
              </>)}
            {isLoggedIn && (<NotificationBell />)}


            {isLoggedIn && (<div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground whitespace-nowrap shrink-0">
                <RoleIcon className="h-3.5 w-3.5 text-primary"/>
                {roleLabels[role]}
              </div>)}
            {!isAuthPage && (isLoggedIn ? (<Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0 whitespace-nowrap">
                  {t("logout")}
                </Button>) : (<>
                  <Link to="/login" className="shrink-0">
                    <Button size="sm" variant="outline" className="text-foreground hover:bg-secondary whitespace-nowrap">
                      {t("sign_in")}
                    </Button>
                  </Link>
                  <Link to="/register" className="shrink-0">
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 whitespace-nowrap">
                      {t("register")}
                    </Button>
                  </Link>
                </>))}
            {isLoginPage && !isLoggedIn && (<Link to="/register" className="shrink-0">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 whitespace-nowrap">
                  {t("register")}
                </Button>
              </Link>)}
            {isRegisterPage && !isLoggedIn && (<Link to="/login" className="shrink-0">
                <Button size="sm" variant="outline" className="text-foreground hover:bg-secondary whitespace-nowrap">
                  {t("sign_in")}
                </Button>
              </Link>)}
          </div>

          {/* Hamburger hidden — moved to left side above */}
        </div>

        {/* Mobile drawer overlay */}
        {mobileOpen && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)}/>)}

        {/* Mobile slide-in drawer — from LEFT */}
        <motion.div initial={{ x: "-100%" }} animate={{ x: mobileOpen ? 0 : "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 left-0 bottom-0 w-[280px] bg-card border-r border-border z-50 lg:hidden flex flex-col shadow-2xl">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Calendar className="h-4 w-4 text-primary-foreground"/>
              </div>
              <span className="font-display text-base font-bold">{platformName}</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
              <X className="h-5 w-5"/>
            </button>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => {
            if (link.label === "Events") {
                return (<div key={link.to} className="space-y-1">
                    <Link to={link.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <Calendar className="h-4 w-4"/> Events
                    </Link>
                    <div className="ml-7 space-y-1 border-l border-border pl-3">
                      {eventCategories.slice(0, 5).map((cat) => (<Link key={cat._id} to={`/events?category=${encodeURIComponent(cat.name)}`} onClick={() => setMobileOpen(false)} className="block text-xs text-muted-foreground hover:text-primary py-1 transition-colors">{cat.name}</Link>))}
                    </div>
                  </div>);
            }
            if (link.label === "Our Services") {
                return (<div key={link.to} className="space-y-1">
                    <Link to={link.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <Briefcase className="h-4 w-4"/> Services
                    </Link>
                    <div className="ml-7 space-y-1 border-l border-border pl-3">
                      {serviceCategories.slice(0, 5).map((cat) => (<Link key={cat._id} to={`/services?category=${encodeURIComponent(cat.name)}`} onClick={() => setMobileOpen(false)} className="block text-xs text-muted-foreground hover:text-primary py-1 transition-colors">{cat.name}</Link>))}
                    </div>
                  </div>);
            }
            return (<Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  {link.label}
                </Link>);
        })}
          </div>

          {/* Drawer footer */}
          <div className="border-t border-border px-4 py-4 space-y-3">
            {isLoggedIn && (<div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
                <RoleIcon className="h-4 w-4 text-primary"/>
                <span className="text-sm font-medium">{roleLabels[role]}</span>
                <div className="ml-auto"><NotificationBell /></div>
              </div>)}

            {!isAuthPage && (isLoggedIn ? (<button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors">
                  Logout
                </button>) : (<div className="space-y-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground">Register Now</Button>
                  </Link>
                </div>))}
          </div>
        </motion.div>
      </motion.nav>

      {/* Mobile drawer — rendered via portal to avoid stacking context issues */}
      {!hideDashboardLinks && createPortal(<AnimatePresence>
          {mobileOpen && (<>
              {/* Overlay */}
              <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: 9998 }} onClick={() => setMobileOpen(false)}/>

              {/* Drawer */}
              <motion.div key="drawer" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed top-0 left-0 bottom-0 w-[300px] bg-card border-r border-border flex flex-col shadow-2xl" style={{ zIndex: 9999 }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
                      <Calendar className="h-4 w-4 text-primary-foreground"/>
                    </div>
                    <span className="font-display text-base font-bold">{platformName}</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                    <X className="h-5 w-5"/>
                  </button>
                </div>

                {/* Nav links */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                  {navLinks.map((link) => {
                    if (link.label === "Events") {
                        const isExpanded = expandedMobileMenu === "events";
                        return (<div key={link.to}>
                          <button onClick={() => setExpandedMobileMenu(isExpanded ? null : "events")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                            <Calendar className="h-4 w-4 shrink-0"/>
                            <span className="flex-1 text-left">Events</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}/>
                          </button>
                          <AnimatePresence>
                            {isExpanded && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="ml-4 pl-3 border-l border-border py-1 space-y-0.5">
                                  <Link to="/events" onClick={() => { setMobileOpen(false); setExpandedMobileMenu(null); }} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                                    All Events
                                  </Link>
                                  {eventCategories.map((cat) => (<Link key={cat._id} to={`/events?category=${encodeURIComponent(cat.name)}`} onClick={() => { setMobileOpen(false); setExpandedMobileMenu(null); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0"/>
                                      {cat.name}
                                    </Link>))}
                                </div>
                              </motion.div>)}
                          </AnimatePresence>
                        </div>);
                    }
                    if (link.label === "Our Services") {
                        const isExpanded = expandedMobileMenu === "services";
                        return (<div key={link.to}>
                          <button onClick={() => setExpandedMobileMenu(isExpanded ? null : "services")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                            <Briefcase className="h-4 w-4 shrink-0"/>
                            <span className="flex-1 text-left">Services</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}/>
                          </button>
                          <AnimatePresence>
                            {isExpanded && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="ml-4 pl-3 border-l border-border py-1 space-y-0.5">
                                  <Link to="/services" onClick={() => { setMobileOpen(false); setExpandedMobileMenu(null); }} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                                    All Services
                                  </Link>
                                  {serviceCategories.map((cat) => (<Link key={cat._id} to={`/services?category=${encodeURIComponent(cat.name)}`} onClick={() => { setMobileOpen(false); setExpandedMobileMenu(null); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0"/>
                                      {cat.name}
                                    </Link>))}
                                </div>
                              </motion.div>)}
                          </AnimatePresence>
                        </div>);
                    }
                    return (<Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                        {link.label}
                      </Link>);
                })}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-4 py-4 space-y-2">
                  {isLoggedIn && (<div className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2.5">
                      <RoleIcon className="h-4 w-4 text-primary shrink-0"/>
                      <span className="text-sm font-semibold">{roleLabels[role]}</span>
                      <div className="ml-auto"><NotificationBell /></div>
                    </div>)}

                  {!isAuthPage && (isLoggedIn ? (<button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors">
                        {t("logout")}
                      </button>) : (<div className="space-y-2 pt-1">
                        <Link to="/login" onClick={() => setMobileOpen(false)}>
                          <Button size="sm" variant="outline" className="w-full">{t("sign_in")}</Button>
                        </Link>
                        <Link to="/register" onClick={() => setMobileOpen(false)}>
                          <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground">{t("register")}</Button>
                        </Link>
                      </div>))}
                </div>
              </motion.div>
            </>)}
        </AnimatePresence>, document.body)}
    </>);
};
export default Navbar;
