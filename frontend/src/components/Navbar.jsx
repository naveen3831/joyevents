import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Heart, User, Store, Shield, ChevronDown, X, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { clearSession } from "@/lib/session";
import { usePlatformName } from "@/hooks/usePlatformName";
import NotificationBell from "@/components/NotificationBell";
import { useCart } from "@/contexts/CartContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiListCategories, apiListServices } from "@/lib/api";

const dashboardPaths = {
    customer: "/customer-dashboard",
    merchant: "/merchant-dashboard",
    admin: "/admin-dashboard",
};

const roleLabels = {
    customer: "Customer",
    merchant: "Merchant",
    admin: "Admin",
};

const Navbar = ({ hideDashboardLinks = false, onSidebarToggle = null, sidebarOpen = false }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expandedMobileMenu, setExpandedMobileMenu] = useState(null);
    const { isLoggedIn, role, setIsLoggedIn, setToken, setUser } = useAuth();
    const isCustomer = isLoggedIn && role === "customer";
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const dashboardPath = dashboardPaths[role];
    const platformName = usePlatformName();
    const { cartCount } = useCart();

    const iconBtnClass = "w-11 h-11 flex items-center justify-center rounded-xl bg-secondary/60 border border-border/60 hover:bg-secondary hover:border-primary/40 text-foreground/80 hover:text-foreground transition-all relative shrink-0 shadow-sm";
    const activeIconBtnClass = "w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground border-transparent transition-all relative shrink-0 shadow-glow";

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
        Promise.all([
            apiListCategories("service").catch(() => ({ categories: [] })),
            apiListServices().catch(() => ({ services: [] }))
        ]).then(([catRes, svcRes]) => {
            const list = catRes.categories || [];
            if (list.length > 0) {
                setServiceCategories(list);
            } else {
                const svcs = svcRes.services || [];
                const catNames = Array.from(new Set(svcs.map(s => s.category).filter(Boolean)));
                setServiceCategories(catNames.map(name => ({ _id: name, name })));
            }
        }).catch(() => { });

        apiListCategories("event").then(res => {
            setEventCategories(res.categories || []);
        }).catch(() => { });
    }, []);

    let navLinks = [
        { to: "/", label: "Home" },
        { to: "/about", label: "About Us" },
        { to: "/events", label: "Events" },
        { to: "/services", label: "Services" },
        { to: "/reviews", label: "Reviews" },
        { to: "/blog", label: "Blog" },
        { to: "/contact", label: "Contact Us" },
        ...(isLoggedIn ? [{ to: dashboardPath, label: "Dashboard" }] : []),
    ];

    if (hideDashboardLinks) {
        navLinks = navLinks.filter(link => !["Home", "Events", "Services", "Our Portfolio", "About Us", "Contact Us", "Reviews", "Blog", "Dashboard"].includes(link.label));
    }

    const logoElement = hideDashboardLinks ? (
      <div className="flex items-center gap-3 cursor-default shrink-0">
        <Logo className="h-12 w-12 sm:h-14 sm:w-14 shrink-0"/>
        <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{platformName}</span>
      </div>
    ) : isCustomer ? (
      <Link to="/customer-dashboard" className="flex items-center gap-3 group">
        <Logo className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 transition-transform duration-300 group-hover:scale-105"/>
        <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">{platformName}</span>
      </Link>
    ) : (
      <Link to="/" className="flex items-center gap-3 group">
        <Logo className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 transition-transform duration-300 group-hover:scale-105"/>
        <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">{platformName}</span>
      </Link>
    );

    const roleIcons = { customer: User, merchant: Store, admin: Shield };
    const RoleIcon = roleIcons[role] || User;

    return (
      <>
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className={`fixed left-0 right-0 top-0 z-50 w-full bg-background/85 backdrop-blur-xl border-b border-border/80 transition-all duration-300 ${scrolled ? "shadow-md py-3" : "py-4 sm:py-5"}`}>
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 xl:px-20 w-full transition-all duration-300">
          
          {/* MOBILE BAR: Logo Left, Brand Name Middle, Hamburger Right */}
          <div className="flex lg:hidden items-center justify-between w-full relative min-h-[44px]">
            {/* Logo on Left */}
            <Link to={isCustomer ? "/customer-dashboard" : "/"} className="flex items-center shrink-0">
              <Logo className="h-11 w-11 shrink-0"/>
            </Link>

            {/* Brand Name centered in Middle */}
            <Link to={isCustomer ? "/customer-dashboard" : "/"} className="absolute left-1/2 -translate-x-1/2 font-display text-xl font-bold tracking-tight text-foreground text-center pointer-events-auto">
              {platformName}
            </Link>

            {/* Right side controls: Notification Bell & Hamburger */}
            <div className="flex items-center gap-2.5 shrink-0">
              {isLoggedIn && (<NotificationBell />)}
              <button 
                className={`flex items-center justify-center w-11 h-11 rounded-xl text-foreground bg-secondary/50 border border-border/60 hover:bg-secondary transition-colors shrink-0 ${hideDashboardLinks && !onSidebarToggle ? "hidden" : ""}`} 
                onClick={() => {
                  if (onSidebarToggle) {
                      onSidebarToggle();
                  }
                  else {
                      setMobileOpen(!mobileOpen);
                      if (mobileOpen)
                          setExpandedMobileMenu(null);
                  }
                }} 
                aria-label="Toggle menu"
              >
                <motion.div animate={(onSidebarToggle ? sidebarOpen : mobileOpen) ? "open" : "closed"} className="flex flex-col gap-1.5 w-5">
                  <motion.span variants={{ open: { rotate: 45, y: 8 }, closed: { rotate: 0, y: 0 } }} className="block h-0.5 w-5 bg-foreground rounded-full origin-center transition-all"/>
                  <motion.span variants={{ open: { opacity: 0, x: -8 }, closed: { opacity: 1, x: 0 } }} className="block h-0.5 w-5 bg-foreground rounded-full transition-all"/>
                  <motion.span variants={{ open: { rotate: -45, y: -8 }, closed: { rotate: 0, y: 0 } }} className="block h-0.5 w-5 bg-foreground rounded-full origin-center transition-all"/>
                </motion.div>
              </button>
            </div>
          </div>

          {/* DESKTOP BAR: hidden on mobile */}
          <div className="hidden lg:flex items-center gap-4">
            {logoElement}
          </div>

          {/* Center Navigation Links — Floating Pill Style */}
          <div className="hidden items-center gap-1.5 lg:flex flex-nowrap bg-secondary/40 border border-border/60 p-1.5 rounded-2xl backdrop-blur-md">
            {navLinks.map((link) => {
              if (link.label === "Events") {
                  const isEventsActive = location.pathname.startsWith("/events");
                  return (
                    <DropdownMenu key={link.to}>
                      <DropdownMenuTrigger asChild>
                        <Link to="/events" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-base font-semibold transition-all whitespace-nowrap ${isEventsActive ? "bg-primary/15 text-primary font-bold shadow-sm border border-primary/20" : "text-foreground/80 hover:text-primary hover:bg-secondary/80"}`}>
                          Events <ChevronDown className="h-4 w-4 opacity-70"/>
                        </Link>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-52 p-2 bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-2xl text-foreground">
                        <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary font-semibold text-sm py-2.5 px-3 rounded-xl cursor-pointer">
                          <Link to="/events">All Events</Link>
                        </DropdownMenuItem>
                        {eventCategories.length > 0 && <div className="h-px bg-border my-1"/>}
                        {eventCategories.map((cat) => (
                          <DropdownMenuItem key={cat._id} asChild className="hover:bg-secondary font-medium text-sm py-2 px-3 rounded-lg cursor-pointer">
                            <Link to={`/events?category=${encodeURIComponent(cat.name)}`}>
                              {cat.name}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
              }
              if (link.label === "Services") {
                  const isServicesActive = location.pathname.startsWith("/services");
                  return (
                    <DropdownMenu key={link.to}>
                      <DropdownMenuTrigger asChild>
                        <Link to="/services" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-base font-semibold transition-all whitespace-nowrap ${isServicesActive ? "bg-primary/15 text-primary font-bold shadow-sm border border-primary/20" : "text-foreground/80 hover:text-primary hover:bg-secondary/80"}`}>
                          Services <ChevronDown className="h-4 w-4 opacity-70"/>
                        </Link>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-52 p-2 bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-2xl text-foreground">
                        <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary font-semibold text-sm py-2.5 px-3 rounded-xl cursor-pointer">
                          <Link to="/services">All Services</Link>
                        </DropdownMenuItem>
                        {serviceCategories.length > 0 && <div className="h-px bg-border my-1"/>}
                        {serviceCategories.map((cat) => (
                          <DropdownMenuItem key={cat._id} asChild className="hover:bg-secondary font-medium text-sm py-2 px-3 rounded-lg cursor-pointer">
                            <Link to={`/services?category=${encodeURIComponent(cat.name)}`}>
                              {cat.name}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
              }
              const isActive = location.pathname === link.to;
              return (
                <Link key={link.to} to={link.to} className={`px-4 py-2 rounded-xl text-base font-semibold transition-all whitespace-nowrap ${isActive ? "bg-primary/15 text-primary font-bold shadow-sm border border-primary/20" : "text-foreground/80 hover:text-primary hover:bg-secondary/80"}`}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden items-center gap-3 lg:flex flex-nowrap shrink-0">
            {isLoggedIn && role === "customer" && (() => {
              const isFavoritesActive = location.pathname === "/customer-dashboard/favorites";
              const isCartActive = location.pathname === "/customer-dashboard/cart";
              return (
                <>
                  <Link to="/customer-dashboard/favorites" className={isFavoritesActive ? activeIconBtnClass : iconBtnClass} title="Favorites">
                    <Heart className={`h-5 w-5 ${isFavoritesActive ? "fill-current" : ""}`}/>
                  </Link>
                  <Link to="/customer-dashboard/cart" className={isCartActive ? activeIconBtnClass : iconBtnClass} title="Cart">
                    <ShoppingBag className={`h-5 w-5 ${isCartActive ? "fill-current" : ""}`}/>
                    {cartCount > 0 && (
                      <span className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] px-1 items-center justify-center rounded-full text-[9px] font-bold shadow-glow border border-background ${isCartActive ? "bg-background text-primary" : "bg-primary text-primary-foreground"}`}>
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </>
              );
            })()}
            {isLoggedIn && (<NotificationBell />)}

            {isLoggedIn && !hideDashboardLinks && (
              <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-4 h-11 text-sm font-bold text-primary whitespace-nowrap shrink-0 shadow-sm">
                <RoleIcon className="h-4 w-4 text-primary"/>
                {roleLabels[role]}
              </div>
            )}
            {!isAuthPage && (isLoggedIn ? (hideDashboardLinks ? null : (
              <Button variant="outline" onClick={handleLogout} className="h-11 rounded-xl px-5 shrink-0 whitespace-nowrap text-sm font-semibold border-border/80 hover:bg-secondary">
                {t("logout")}
              </Button>
            )) : (
              <Link to="/login" className="shrink-0">
                <Button className="h-11 px-7 rounded-xl text-base font-bold bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow hover:scale-105 transition-all whitespace-nowrap">
                  {t("sign_in")}
                </Button>
              </Link>
            ))}
            {isLoginPage && !isLoggedIn && (
              <Link to="/login" className="shrink-0">
                <Button className="h-11 px-7 rounded-xl text-base font-bold bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow hover:scale-105 transition-all whitespace-nowrap">
                  {t("sign_in")}
                </Button>
              </Link>
            )}
            {isRegisterPage && !isLoggedIn && (
              <Link to="/login" className="shrink-0">
                <Button className="h-11 px-7 rounded-xl text-base font-bold bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow hover:scale-105 transition-all whitespace-nowrap">
                  {t("sign_in")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer — Sliding from LEFT */}
      {!hideDashboardLinks && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Overlay */}
              <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: 9998 }} onClick={() => setMobileOpen(false)}/>

              {/* Drawer sliding in from LEFT */}
              <motion.div 
                key="drawer" 
                initial={{ x: "-100%" }} 
                animate={{ x: 0 }} 
                exit={{ x: "-100%" }} 
                transition={{ type: "spring", damping: 28, stiffness: 220 }} 
                className="fixed top-0 left-0 bottom-0 w-[310px] bg-card border-r border-border flex flex-col shadow-2xl" 
                style={{ zIndex: 9999 }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Logo className="h-10 w-10 shrink-0"/>
                    <span className="font-display text-lg font-extrabold">{platformName}</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                    <X className="h-5 w-5"/>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
                  {navLinks.map((link) => {
                    const isActive = location.pathname === link.to;
                    if (link.label === "Events") {
                        const isExpanded = expandedMobileMenu === "Events";
                        return (
                          <div key={link.to} className="space-y-1">
                            <button
                              onClick={() => setExpandedMobileMenu(isExpanded ? null : "Events")}
                              className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-base font-semibold transition-all ${isActive || isExpanded ? "bg-primary/15 text-primary font-bold shadow-sm" : "text-foreground/80 hover:bg-secondary"}`}
                            >
                              <span>Events</span>
                              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-primary" : ""}`}/>
                            </button>
                            {isExpanded && (
                              <div className="ml-3 pl-3 border-l-2 border-primary/30 space-y-1 py-1">
                                <Link to="/events" onClick={() => setMobileOpen(false)} className="block py-2 px-3 rounded-lg text-sm font-bold text-primary hover:bg-primary/10 transition-colors">
                                  All Events
                                </Link>
                                {eventCategories.map((cat) => (
                                  <Link key={cat._id} to={`/events?category=${encodeURIComponent(cat.name)}`} onClick={() => setMobileOpen(false)} className="block py-2 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                    {cat.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                    }
                    if (link.label === "Services") {
                        const isExpanded = expandedMobileMenu === "Services";
                        return (
                          <div key={link.to} className="space-y-1">
                            <button
                              onClick={() => setExpandedMobileMenu(isExpanded ? null : "Services")}
                              className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-base font-semibold transition-all ${isActive || isExpanded ? "bg-primary/15 text-primary font-bold shadow-sm" : "text-foreground/80 hover:bg-secondary"}`}
                            >
                              <span>Services</span>
                              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-primary" : ""}`}/>
                            </button>
                            {isExpanded && (
                              <div className="ml-3 pl-3 border-l-2 border-primary/30 space-y-1 py-1">
                                <Link to="/services" onClick={() => setMobileOpen(false)} className="block py-2 px-3 rounded-lg text-sm font-bold text-primary hover:bg-primary/10 transition-colors">
                                  All Services
                                </Link>
                                {serviceCategories.map((cat) => (
                                  <Link key={cat._id} to={`/services?category=${encodeURIComponent(cat.name)}`} onClick={() => setMobileOpen(false)} className="block py-2 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                    {cat.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                    }
                    return (
                      <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`block py-3 px-4 rounded-xl text-base font-semibold transition-all ${isActive ? "bg-primary/15 text-primary font-bold shadow-sm" : "text-foreground/80 hover:bg-secondary"}`}>
                        {link.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="p-5 border-t border-border space-y-3">
                  {isLoggedIn ? (
                    <Button variant="outline" onClick={handleLogout} className="w-full h-11 rounded-xl text-sm font-bold">
                      {t("logout")}
                    </Button>
                  ) : (
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="block w-full">
                      <Button className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-glow text-base">
                        {t("sign_in")}
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
      </>
    );
};

export default Navbar;
