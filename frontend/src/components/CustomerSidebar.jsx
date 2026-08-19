import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Ticket, History, Calendar, Settings, User, CalendarDays, Briefcase, Heart, MessageSquare, Sparkles, LogOut, ShoppingBag, Wallet, Gift, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { clearSession } from "@/lib/session";
import { useGsapAccordion } from "@/lib/gsapAnimations";

const useGroups = (t) => [
    { label: t("overview"), items: [{ to: "/customer-dashboard", label: t("overview"), icon: LayoutDashboard, exact: true }] },
    {
        label: "Discover & Book",
        icon: CalendarDays,
        items: [
            { to: "/customer-dashboard/browse-events", label: t("browse_events"), icon: CalendarDays },
            { to: "/customer-dashboard/browse-services", label: t("browse_services"), icon: Briefcase },
            { to: "/customer-dashboard/bookings", label: t("my_bookings"), icon: Ticket },
            { to: "/customer-dashboard/cart", label: "Cart", icon: ShoppingBag, cartBadge: true },
        ],
    },
    {
        label: "My Activity",
        icon: History,
        items: [
            { to: "/customer-dashboard/wallet", label: "Wallet", icon: Wallet },
            { to: "/customer-dashboard/history", label: t("history"), icon: History },
            { to: "/customer-dashboard/upcoming", label: t("upcoming"), icon: Calendar },
            { to: "/customer-dashboard/favorites", label: t("favorites"), icon: Heart },
        ],
    },
    {
        label: "Connect",
        icon: MessageSquare,
        items: [
            { to: "/customer-dashboard/ai-recommendations", label: t("ai_picks"), icon: Sparkles, highlight: true },
            { to: "/customer-dashboard/messages", label: t("messages"), icon: MessageSquare },
            { to: "/customer-dashboard/referral", label: "Referral", icon: Gift },
        ],
    },
    {
        label: "Account",
        icon: Settings,
        items: [
            { to: "/customer-dashboard/settings", label: t("settings"), icon: Settings },
            { to: "/customer-dashboard/profile", label: t("my_profile"), icon: User },
        ],
    },
];

const AccordionGroup = ({ group, isOpen, onToggle, onClose, cartCount }) => {
    const location = useLocation();
    const isMatch = (link) => (link.exact ? location.pathname === link.to : location.pathname === link.to || location.pathname.startsWith(link.to + "/"));
    const panelRef = useGsapAccordion(isOpen);

    if (group.items.length === 1 && !group.icon) {
        const item = group.items[0];
        const active = isMatch(item);
        return (
            <Link to={item.to} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-foreground/75 hover:bg-secondary hover:text-foreground"}`}>
                <item.icon className="h-4 w-4 shrink-0" />{item.label}
            </Link>
        );
    }

    const isActive = group.items.some(isMatch);
    return (
        <div className="space-y-1">
            <button onClick={onToggle} aria-expanded={isOpen} className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${isActive || isOpen ? "bg-secondary text-foreground font-bold" : "text-foreground/75 hover:bg-secondary/70 hover:text-foreground"}`}>
                <div className="flex items-center gap-3">
                    {group.icon && <group.icon className="h-4 w-4 text-primary" />}
                    {group.label}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : "opacity-60"}`} />
            </button>
            <div ref={panelRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
                <div className="ml-3.5 mt-1 border-l-2 border-primary/20 pl-3 space-y-1 pb-1">
                    {group.items.map((sub) => {
                        const subActive = isMatch(sub);
                        return (
                            <Link key={sub.to} to={sub.to} onClick={onClose} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${subActive ? "bg-gradient-primary text-primary-foreground shadow-glow font-bold" : sub.highlight ? "text-primary hover:bg-primary/10 font-semibold" : "text-foreground/70 hover:bg-secondary hover:text-foreground"}`}>
                                <sub.icon className="h-3.5 w-3.5" />{sub.label}
                                {sub.cartBadge && cartCount > 0 && <span className="ml-auto text-[10px] font-bold bg-gradient-primary text-primary-foreground px-2 py-0.5 rounded-full shrink-0">{cartCount}</span>}
                                {sub.highlight && !subActive && <span className="ml-auto text-[9px] font-bold bg-gradient-primary text-primary-foreground px-1.5 py-0.5 rounded-full">AI</span>}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const NavLinks = ({ onClose }) => {
    const location = useLocation();
    const { t } = useTranslation();
    const { cartCount } = useCart();
    const groups = useGroups(t);
    const [openGroup, setOpenGroup] = useState(null);

    useEffect(() => {
        const active = groups.find((g) => g.items.some((s) => (s.exact ? location.pathname === s.to : location.pathname === s.to || location.pathname.startsWith(s.to + "/"))) && g.items.length > 1);
        if (active) setOpenGroup(active.label);
    }, [location.pathname]);

    return (
        <nav className="p-3.5 space-y-1.5">
            {groups.map((group) => (
                <AccordionGroup key={group.label} group={group} isOpen={openGroup === group.label} onToggle={() => setOpenGroup((g) => (g === group.label ? null : group.label))} onClose={onClose} cartCount={cartCount} />
            ))}
        </nav>
    );
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
      {/* Permanent Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/95 backdrop-blur-xl shrink-0 sticky top-16 h-[calc(100vh-4.5rem)] shadow-sm font-sans rounded-2xl my-2 ml-4">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/80">
          <User className="h-5 w-5 text-primary"/>
          <span className="font-display text-base font-bold tracking-tight text-foreground">{t("dashboard")}</span>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLinks onClose={() => {}} />
        </div>
        <div className="border-t border-border/80 p-3.5">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors">
            <LogOut className="h-4 w-4 shrink-0"/> {t("logout")}
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {open && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose}/>)}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (<motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed top-14 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col shadow-2xl lg:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <span className="font-display text-base font-bold text-primary flex items-center gap-2">
                <User className="h-4 w-4"/> {t("dashboard")}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <NavLinks onClose={onClose}/>
            </div>
            <div className="border-t border-border p-3.5">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors">
                <LogOut className="h-4 w-4 shrink-0"/> {t("logout")}
              </button>
            </div>
          </motion.aside>)}
      </AnimatePresence>
    </>);
};

export default CustomerSidebar;
