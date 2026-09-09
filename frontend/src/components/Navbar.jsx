import { Link, useLocation, useNavigate, matchPath } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Heart, User, Store, Shield, ChevronDown, ShoppingBag, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { clearSession } from "@/lib/session";
import { usePlatformName } from "@/hooks/usePlatformName";
import NotificationBell from "@/components/NotificationBell";
import { useCart } from "@/contexts/CartContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
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

const detailRoutesMap = [
  { pattern: "/customer-dashboard/services/:id", title: "Service Details", fallback: "/customer-dashboard/browse-services" },
  { pattern: "/customer-dashboard/events/:id", title: "Event Details", fallback: "/customer-dashboard/browse-events" },
  { pattern: "/customer-dashboard/bookings/:id/ticket", title: "Ticket Details", fallback: "/customer-dashboard/bookings" },
  { pattern: "/customer-dashboard/tickets/:id", title: "Ticket Details", fallback: "/customer-dashboard/bookings" },
  { pattern: "/tickets/:id", title: "Ticket Details", fallback: "/customer-dashboard/bookings" },
  { pattern: "/customer-dashboard/wallet/add-funds", title: "Add Funds", fallback: "/customer-dashboard/wallet" },
  { pattern: "/customer-dashboard/wallet/withdraw", title: "Withdraw Funds", fallback: "/customer-dashboard/wallet" },
  { pattern: "/customer-dashboard/wallet", title: "My Wallet", fallback: "/customer-dashboard" },
  { pattern: "/customer-dashboard/checkout", title: "Checkout", fallback: "/customer-dashboard/cart" },
  { pattern: "/checkout", title: "Checkout", fallback: "/customer-dashboard/cart" },
  { pattern: "/customer-dashboard/referral", title: "Refer & Earn", fallback: "/customer-dashboard" },
  { pattern: "/customer-dashboard/contact-organiser", title: "Contact Organiser", fallback: "/customer-dashboard" },
  { pattern: "/customer-dashboard/request-custom-service", title: "Custom Service Request", fallback: "/customer-dashboard/browse-services" },
  { pattern: "/request-custom-service", title: "Custom Service Request", fallback: "/customer-dashboard/browse-services" },
  { pattern: "/customer-dashboard/cart", title: "Shopping Cart", fallback: "/customer-dashboard" },
  { pattern: "/customer-dashboard/favorites", title: "Favorites", fallback: "/customer-dashboard" },
  { pattern: "/favorites", title: "Favorites", fallback: "/customer-dashboard" },
  { pattern: "/customer-dashboard/history", title: "Booking History", fallback: "/customer-dashboard/bookings" },
  { pattern: "/customer-dashboard/upcoming", title: "Upcoming Bookings", fallback: "/customer-dashboard/bookings" },
  { pattern: "/customer-dashboard/ai-recommendations", title: "AI Recommendations", fallback: "/customer-dashboard" },
  { pattern: "/customer-dashboard/settings", title: "Settings", fallback: "/customer-dashboard/profile" },
  { pattern: "/services/:id", title: "Service Details", fallback: "/services" },
  { pattern: "/events/:id", title: "Event Details", fallback: "/events" },
  { pattern: "/blog/:id", title: "Blog Post", fallback: "/blog" },
];

const Navbar = ({ hideDashboardLinks = false }) => {
  const [scrolled, setScrolled] = useState(false);
  const { isLoggedIn, role, setIsLoggedIn, setToken, setUser } = useAuth();
  const isCustomer = isLoggedIn && role === "customer";
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  let matchedDetailRoute = null;
  for (const route of detailRoutesMap) {
    if (matchPath({ path: route.pattern, end: true }, location.pathname)) {
      matchedDetailRoute = route;
      break;
    }
  }
  const isDetailPage = Boolean(matchedDetailRoute);
  const goBack = useBackNavigation(matchedDetailRoute?.fallback || "/customer-dashboard");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashboardPath = dashboardPaths[role];
  const platformName = usePlatformName();
  const { cartCount } = useCart();

  const iconBtnClass = "w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/80 border border-border/80 hover:bg-secondary hover:border-primary/40 text-foreground/80 hover:text-primary transition-all relative shrink-0 shadow-sm";
  const activeIconBtnClass = "w-9 h-9 flex items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary transition-all relative shrink-0 shadow-sm";

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
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    Promise.all([
      apiListCategories("service").catch(() => ({ categories: [] })),
      apiListServices().catch(() => ({ services: [] }))
    ]).then(([catRes, svcRes]) => {
      const catMap = new Map();
      const rawList = [
        ...(catRes.categories || []).map(c => c.name),
        ...(svcRes.services || []).map(s => s.category)
      ].filter(Boolean);

      rawList.forEach((rawName) => {
        const norm = String(rawName).trim().toLowerCase();
        if (norm && norm !== "all" && !catMap.has(norm)) {
          const label = norm
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          catMap.set(norm, { value: norm, label });
        }
      });

      setServiceCategories(Array.from(catMap.values()));
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
    <div className="flex items-center gap-2.5 cursor-default shrink-0">
      <Logo className="h-8 w-8 sm:h-9 sm:w-9 lg:h-9 lg:w-9 shrink-0" />
      <span className="font-display text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-foreground">{platformName}</span>
    </div>
  ) : isCustomer ? (
    <Link to="/customer-dashboard" className="flex items-center gap-2.5 group">
      <Logo className="h-8 w-8 sm:h-9 sm:w-9 lg:h-9 lg:w-9 shrink-0 transition-transform duration-300 group-hover:scale-105" />
      <span className="font-display text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">{platformName}</span>
    </Link>
  ) : (
    <Link to="/" className="flex items-center gap-2.5 group">
      <Logo className="h-8 w-8 sm:h-9 sm:w-9 lg:h-9 lg:w-9 shrink-0 transition-transform duration-300 group-hover:scale-105" />
      <span className="font-display text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">{platformName}</span>
    </Link>
  );

  const roleIcons = { customer: User, merchant: Store, admin: Shield };
  const RoleIcon = roleIcons[role] || User;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed left-0 right-0 top-0 z-50 w-full bg-background/85 backdrop-blur-xl border-b border-border/80 transition-all duration-300 ${
        hideDashboardLinks
          ? "py-2 sm:py-2.5 shadow-sm"
          : scrolled
          ? "shadow-md bg-background/95 backdrop-blur-2xl py-2.5 border-border/90"
          : "py-3 sm:py-4"
      }`}
    >
      <div className="flex items-center justify-between px-4 sm:px-8 lg:px-10 xl:px-16 2xl:px-20 w-full transition-all duration-300">

        {/* MOBILE BAR */}
        {isDetailPage ? (
          /* Mobile Detail Header (for Service Details, Event Details, Ticket Details, etc.) */
          <div className="mobile-detail-header flex lg:hidden items-center justify-between w-full min-h-[44px] gap-2">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="mobile-back-button w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground/90 hover:text-primary transition-all active:scale-95 shrink-0 shadow-xs"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <div className="mobile-detail-title flex-1 min-w-0">
              <h1 className="font-display font-bold text-base text-foreground truncate leading-tight">
                {matchedDetailRoute?.title || "Details"}
              </h1>
            </div>

            <div className="mobile-detail-actions flex items-center gap-1.5 shrink-0">
              {isLoggedIn && role === "customer" && (
                <>
                  <Link
                    to="/customer-dashboard/favorites"
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all relative shrink-0 shadow-sm ${
                      location.pathname === "/customer-dashboard/favorites" || location.pathname === "/favorites"
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-secondary/80 border-border/80 text-foreground/80 hover:bg-secondary hover:text-primary"
                    }`}
                    title="Wishlist"
                  >
                    <Heart className={`h-3.5 w-3.5 ${location.pathname.includes("favorites") ? "fill-current" : ""}`} />
                  </Link>
                  <Link
                    to="/customer-dashboard/cart"
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all relative shrink-0 shadow-sm ${
                      location.pathname === "/customer-dashboard/cart"
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-secondary/80 border-border/80 text-foreground/80 hover:bg-secondary hover:text-primary"
                    }`}
                    title="Cart"
                  >
                    <ShoppingBag className={`h-3.5 w-3.5 ${location.pathname === "/customer-dashboard/cart" ? "fill-current" : ""}`} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[0.9rem] px-0.5 items-center justify-center rounded-full text-[8px] font-black bg-primary text-primary-foreground shadow-sm border border-background">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              {isLoggedIn && <NotificationBell buttonClassName="w-8 h-8 rounded-lg" iconClassName="h-3.5 w-3.5" />}
            </div>
          </div>
        ) : (
          /* Normal Mobile Header (for Home, Browse, Bookings, Messages, Profile) */
          <div className="flex lg:hidden items-center justify-between w-full min-h-[40px]">
            {logoElement}
            <div className="flex items-center gap-1.5 shrink-0">
              {isLoggedIn && role === "customer" && (() => {
                const isFavoritesActive = location.pathname === "/customer-dashboard/favorites";
                const isCartActive = location.pathname === "/customer-dashboard/cart";
                return (
                  <>
                    <Link to="/customer-dashboard/favorites" className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all relative shrink-0 shadow-sm ${isFavoritesActive ? "bg-primary/15 border-primary/30 text-primary" : "bg-secondary/80 border-border/80 text-foreground/80 hover:bg-secondary hover:text-primary"}`} title="Wishlist">
                      <Heart className={`h-3.5 w-3.5 ${isFavoritesActive ? "fill-current" : ""}`} />
                    </Link>
                    <Link to="/customer-dashboard/cart" className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all relative shrink-0 shadow-sm ${isCartActive ? "bg-primary/15 border-primary/30 text-primary" : "bg-secondary/80 border-border/80 text-foreground/80 hover:bg-secondary hover:text-primary"}`} title="Cart">
                      <ShoppingBag className={`h-3.5 w-3.5 ${isCartActive ? "fill-current" : ""}`} />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[0.9rem] px-0.5 items-center justify-center rounded-full text-[8px] font-black bg-primary text-primary-foreground shadow-sm border border-background">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  </>
                );
              })()}
              {isLoggedIn && (<NotificationBell buttonClassName="w-8 h-8 rounded-lg" iconClassName="h-3.5 w-3.5" />)}

              {!hideDashboardLinks && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/80 border border-border/80 text-foreground hover:bg-secondary hover:text-primary transition-all ml-1"
                  aria-label="Toggle Navigation Menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* DESKTOP BAR */}
        <div className="hidden lg:flex items-center gap-4">
          {logoElement}
        </div>

        {/* Center Navigation Links — Floating Pill Style with Laptop-Optimized Font Scaling */}
        <div className="hidden items-center gap-1 xl:gap-1.5 lg:flex flex-nowrap bg-secondary/40 border border-border/60 p-1.5 rounded-2xl backdrop-blur-md">
          {navLinks.map((link) => {
            const linkBaseClass = "relative px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-xl text-xs xl:text-sm 2xl:text-base font-semibold transition-all whitespace-nowrap after:absolute after:bottom-1 after:left-2.5 after:right-2.5 after:h-[2px] after:bg-primary after:rounded-full after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-left";
            
            if (link.label === "Events") {
              const isEventsActive = location.pathname.startsWith("/events");
              return (
                <DropdownMenu key={link.to}>
                  <DropdownMenuTrigger asChild>
                    <Link to="/events" className={`flex items-center gap-1.5 ${linkBaseClass} ${isEventsActive ? "bg-primary/15 text-primary font-bold shadow-sm border border-primary/20 after:scale-x-100" : "text-foreground/80 hover:text-primary hover:bg-secondary/80"}`}>
                      Events <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-52 p-2 bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-2xl text-foreground animate-in fade-in-0 zoom-in-95 duration-150">
                    <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary font-semibold text-sm py-2.5 px-3 rounded-xl cursor-pointer">
                      <Link to="/events">All Events</Link>
                    </DropdownMenuItem>
                    {eventCategories.length > 0 && <div className="h-px bg-border my-1" />}
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
                    <Link to="/services" className={`flex items-center gap-1.5 ${linkBaseClass} ${isServicesActive ? "bg-primary/15 text-primary font-bold shadow-sm border border-primary/20 after:scale-x-100" : "text-foreground/80 hover:text-primary hover:bg-secondary/80"}`}>
                      Services <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-52 p-2 bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-2xl text-foreground animate-in fade-in-0 zoom-in-95 duration-150">
                    <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary font-semibold text-sm py-2.5 px-3 rounded-xl cursor-pointer">
                      <Link to="/services">All Services</Link>
                    </DropdownMenuItem>
                    {serviceCategories.length > 0 && <div className="h-px bg-border my-1" />}
                    {serviceCategories.map((cat) => (
                      <DropdownMenuItem key={cat.value} asChild className="hover:bg-secondary font-medium text-sm py-2 px-3 rounded-lg cursor-pointer">
                        <Link to={`/services?category=${encodeURIComponent(cat.value)}`}>
                          {cat.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            const isActive = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to} className={`${linkBaseClass} ${isActive ? "bg-primary/15 text-primary font-bold shadow-sm border border-primary/20 after:scale-x-100" : "text-foreground/80 hover:text-primary hover:bg-secondary/80"}`}>
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
                  <Heart className={`h-4.5 w-4.5 ${isFavoritesActive ? "fill-current" : ""}`} />
                </Link>
                <Link to="/customer-dashboard/cart" className={isCartActive ? activeIconBtnClass : iconBtnClass} title="Cart">
                  <ShoppingBag className={`h-4.5 w-4.5 ${isCartActive ? "fill-current" : ""}`} />
                  {cartCount > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 flex h-4 min-w-[1.1rem] px-0.5 items-center justify-center rounded-full text-[9px] font-bold shadow-glow border border-background ${isCartActive ? "bg-background text-primary" : "bg-primary text-primary-foreground"}`}>
                      {cartCount}
                    </span>
                  )}
                </Link>
              </>
            );
          })()}
          {isLoggedIn && (<NotificationBell buttonClassName="w-9 h-9 rounded-xl" iconClassName="h-4 w-4" />)}

          {isLoggedIn && !hideDashboardLinks && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3.5 h-9 text-xs sm:text-sm font-bold text-primary whitespace-nowrap shrink-0 shadow-sm">
              <RoleIcon className="h-4 w-4 text-primary" />
              {roleLabels[role]}
            </div>
          )}
          {!isAuthPage && (isLoggedIn ? (hideDashboardLinks ? null : (
            <Button variant="outline" onClick={handleLogout} className="h-9 rounded-xl px-4 shrink-0 whitespace-nowrap text-sm font-semibold border-border/80 hover:bg-secondary">
              {t("logout")}
            </Button>
          )) : (
            <Link to="/login" className="shrink-0">
              <Button className="h-9 px-6 rounded-xl text-sm font-bold bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow hover:scale-105 transition-all whitespace-nowrap">
                {t("sign_in")}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && !hideDashboardLinks && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-[57px] bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-2xl border-b border-border p-4 shadow-2xl z-50 lg:hidden flex flex-col gap-2 max-h-[calc(100vh-60px)] overflow-y-auto"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    location.pathname === link.to
                      ? "bg-primary/15 text-primary font-bold shadow-sm"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-2 border-t border-border/80 flex items-center justify-between gap-3 mt-1">
                {isLoggedIn ? (
                  <Button
                    variant="outline"
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="w-full h-10 rounded-xl text-sm font-semibold border-border/80 text-rose-500 hover:bg-rose-500/10"
                  >
                    {t("logout")}
                  </Button>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                    <Button className="w-full h-10 rounded-xl text-sm font-bold bg-gradient-primary text-primary-foreground shadow-glow">
                      {t("sign_in")}
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
