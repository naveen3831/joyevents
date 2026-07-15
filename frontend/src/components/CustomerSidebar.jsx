import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Ticket, History, Calendar, Settings, User, CalendarDays, Briefcase, Heart, MessageSquare, X, Sparkles, Menu, LogOut, ShoppingBag, Wallet, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { clearSession } from "@/lib/session";
const NavLinks = ({ onClose }) => {
    const location = useLocation();
    const { t } = useTranslation();
    const { cartCount } = useCart();
    const customerLinks = [
        { to: "/customer-dashboard", label: t("overview"), icon: LayoutDashboard, exact: true },
        { to: "/customer-dashboard/browse-events", label: t("browse_events"), icon: CalendarDays },
        { to: "/customer-dashboard/browse-services", label: t("browse_services"), icon: Briefcase },
        { to: "/customer-dashboard/bookings", label: t("my_bookings"), icon: Ticket },
        { to: "/customer-dashboard/cart", label: "Cart", icon: ShoppingBag, cartBadge: true },
        { to: "/customer-dashboard/wallet", label: "Wallet", icon: Wallet },
        { to: "/customer-dashboard/history", label: t("history"), icon: History },
        { to: "/customer-dashboard/upcoming", label: t("upcoming"), icon: Calendar },
        { to: "/customer-dashboard/favorites", label: t("favorites"), icon: Heart },
        { to: "/customer-dashboard/ai-recommendations", label: t("ai_picks"), icon: Sparkles, highlight: true },
        { to: "/customer-dashboard/messages", label: t("messages"), icon: MessageSquare },
        { to: "/customer-dashboard/referral", label: "Referral", icon: Gift },
        { to: "/customer-dashboard/settings", label: t("settings"), icon: Settings },
        { to: "/customer-dashboard/profile", label: t("my_profile"), icon: User },
    ];
    return (<nav className="p-3 space-y-1">
      {customerLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname === link.to || location.pathname.startsWith(link.to + "/");
            const isHighlight = link.highlight;
            return (<Link key={link.to} to={link.to} onClick={onClose} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                    ? "bg-primary text-primary-foreground"
                    : isHighlight
                        ? "text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Icon className="h-4 w-4 shrink-0"/>
            {link.label}
            {link.cartBadge && cartCount > 0 && (<span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shrink-0">
                {cartCount}
              </span>)}
            {isHighlight && !isActive && (<span className="ml-auto text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">AI</span>)}
          </Link>);
        })}
    </nav>);
};
const CustomerSidebar = ({ open, onClose, onToggle }) => {
    const { t } = useTranslation();
    const { setIsLoggedIn, setToken, setUser } = useAuth();
    const navigate = useNavigate();
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
        onClose();
        navigate("/login", { replace: true });
    };
    return (<>
      {/* Hamburger toggle — hidden on mobile (Navbar handles it), visible on sm+ */}
      <button onClick={onToggle} className="hidden sm:flex fixed top-[5.25rem] left-3 z-50 items-center justify-center w-9 h-9 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors shadow-sm" aria-label="Toggle menu">
        {open ? <X className="h-4 w-4"/> : <Menu className="h-4 w-4"/>}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose}/>)}
      </AnimatePresence>

      {/* Sidebar drawer */}
      <AnimatePresence>
        {open && (<motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed top-20 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-display text-sm font-bold text-gradient">{t("dashboard")}</span>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4"/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onClose={onClose}/>
            </div>
            <div className="border-t border-border p-3">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors">
                <LogOut className="h-4 w-4 shrink-0"/> {t("logout")}
              </button>
            </div>
          </motion.aside>)}
      </AnimatePresence>
    </>);
};
export default CustomerSidebar;
