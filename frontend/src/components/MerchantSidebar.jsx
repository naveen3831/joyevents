import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calendar, Briefcase, CheckCircle2, Settings, Video, User, Ticket, DollarSign, Megaphone, BarChart3, Inbox, QrCode, ChevronDown, Sparkles, LogOut, Gift, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearSession } from "@/lib/session";
import { useGsapAccordion } from "@/lib/gsapAnimations";

const groups = [
    { label: "Overview", items: [{ to: "/merchant-dashboard", label: "Overview", icon: LayoutDashboard }] },
    {
        label: "Events & Services",
        icon: Calendar,
        items: [
            { to: "/merchant-dashboard/events", label: "My Events", icon: Calendar },
            { to: "/merchant-dashboard/live-events", label: "Live Events", icon: Video },
            { to: "/merchant-dashboard/services", label: "My Services", icon: Briefcase },
            { to: "/merchant-dashboard/bookings", label: "Bookings", icon: CheckCircle2 },
        ],
    },
    {
        label: "Growth",
        icon: Megaphone,
        items: [
            { to: "/merchant-dashboard/earnings", label: "Earnings", icon: DollarSign },
            { to: "/merchant-dashboard/marketing", label: "Marketing Tools", icon: Megaphone },
            { to: "/merchant-dashboard/referrals", label: "Referrals", icon: Gift },
            { to: "/merchant-dashboard/ai-recommendations", label: "AI Reach Stats", icon: Sparkles, highlight: true },
            { to: "/merchant-dashboard/analytics", label: "Event Analytics", icon: BarChart3 },
        ],
    },
    {
        label: "Operations",
        icon: QrCode,
        items: [
            { to: "/merchant-dashboard/qr-codes", label: "QR Codes", icon: QrCode },
            { to: "/merchant-dashboard/inbox", label: "Inbox", icon: Inbox },
            { to: "/merchant-dashboard/ticket-validation", label: "Ticket Validation", icon: Ticket },
        ],
    },
    {
        label: "Account",
        icon: Settings,
        items: [
            { to: "/merchant-dashboard/settings", label: "Settings", icon: Settings },
            { to: "/merchant-dashboard/profile", label: "My Profile", icon: User },
        ],
    },
];

const AccordionGroup = ({ group, isOpen, onToggle, onClose, isMerchantActive }) => {
    const location = useLocation();
    const visibleItems = isMerchantActive
        ? group.items
        : group.items.filter((i) => i.to === "/merchant-dashboard" || i.to.endsWith("/profile") || i.to.endsWith("/settings"));
    const panelRef = useGsapAccordion(isOpen);
    if (!visibleItems.length) return null;

    if (visibleItems.length === 1 && !group.icon) {
        const item = visibleItems[0];
        const active = location.pathname === item.to;
        return (
            <Link to={item.to} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-foreground/75 hover:bg-secondary hover:text-foreground"}`}>
                <item.icon className="h-4 w-4 shrink-0" />{item.label}
            </Link>
        );
    }

    const isActive = visibleItems.some((s) => s.to === location.pathname);
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
                    {visibleItems.map((sub) => {
                        const subActive = location.pathname === sub.to;
                        return (
                            <Link key={sub.to} to={sub.to} onClick={onClose} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${subActive ? "bg-gradient-primary text-primary-foreground shadow-glow font-bold" : sub.highlight ? "text-primary hover:bg-primary/10 font-semibold" : "text-foreground/70 hover:bg-secondary hover:text-foreground"}`}>
                                <sub.icon className="h-3.5 w-3.5" />{sub.label}
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
    const { user } = useAuth();
    const isMerchantActive = user?.merchantStatus === "active";
    const [openGroup, setOpenGroup] = useState(null);

    useEffect(() => {
        const active = groups.find((g) => g.items.some((s) => s.to === location.pathname) && g.items.length > 1);
        if (active) setOpenGroup(active.label);
    }, [location.pathname]);

    return (
        <nav className="space-y-1.5 p-3.5">
            {groups.map((group) => (
                <AccordionGroup key={group.label} group={group} isOpen={openGroup === group.label} onToggle={() => setOpenGroup((g) => (g === group.label ? null : group.label))} onClose={onClose} isMerchantActive={isMerchantActive} />
            ))}
        </nav>
    );
};

const MerchantSidebar = ({ open, onClose, onToggle }) => {
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
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/95 backdrop-blur-xl shrink-0 sticky top-24 h-[calc(100vh-6rem)] shadow-sm font-sans rounded-2xl my-2 ml-4">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/80">
        <Store className="h-5 w-5 text-primary"/>
        <span className="font-display text-base font-bold tracking-tight text-foreground">Merchant Portal</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <NavLinks onClose={() => {}} />
      </div>
      <div className="border-t border-border/80 p-3.5">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors">
          <LogOut className="h-4 w-4 shrink-0"/> Logout
        </button>
      </div>
    </aside>

    {/* Mobile Backdrop */}
    <AnimatePresence>
      {open && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose}/>)}
    </AnimatePresence>

    {/* Mobile Drawer */}
    <AnimatePresence>
      {open && (<motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed top-20 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col shadow-2xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <span className="font-display text-base font-bold text-primary flex items-center gap-2">
              <Store className="h-4 w-4"/> Merchant Menu
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavLinks onClose={onClose}/>
          </div>
          <div className="border-t border-border p-3.5">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors">
              <LogOut className="h-4 w-4 shrink-0"/> Logout
            </button>
          </div>
        </motion.aside>)}
    </AnimatePresence>
  </>);
};

export default MerchantSidebar;
