import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Heart, User, Store, Shield, ChevronDown, ShoppingBag } from "lucide-react";
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

const Navbar = ({ hideDashboardLinks = false }) => {
  const [scrolled, setScrolled] = useState(false);
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

  return (
    <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className={`fixed left-0 right-0 top-0 z-50 w-full bg-background/85 backdrop-blur-xl border-b border-border/80 transition-all duration-300 ${hideDashboardLinks ? "py-2 sm:py-2.5 shadow-sm" : scrolled ? "shadow-md py-2.5" : "py-3 sm:py-4"}`}>
      <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 xl:px-20 w-full transition-all duration-300">

        {/* MOBILE BAR */}
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
          </div>
        </div>

        {/* DESKTOP BAR */}
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
                      Events <ChevronDown className="h-4 w-4 opacity-70" />
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-52 p-2 bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-2xl text-foreground">
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
                    <Link to="/services" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-base font-semibold transition-all whitespace-nowrap ${isServicesActive ? "bg-primary/15 text-primary font-bold shadow-sm border border-primary/20" : "text-foreground/80 hover:text-primary hover:bg-secondary/80"}`}>
                      Services <ChevronDown className="h-4 w-4 opacity-70" />
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-52 p-2 bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-2xl text-foreground">
                    <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary font-semibold text-sm py-2.5 px-3 rounded-xl cursor-pointer">
                      <Link to="/services">All Services</Link>
                    </DropdownMenuItem>
                    {serviceCategories.length > 0 && <div className="h-px bg-border my-1" />}
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
    </motion.nav>
  );
};

export default Navbar;
