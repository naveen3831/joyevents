import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, Store, Calendar, Settings, Briefcase, DollarSign, BarChart3, Activity, User, CreditCard, Calculator, RefreshCcw, Wallet, BookOpen, ChevronDown, Sparkles, LogOut, Home, Gift, Star, Ticket, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearSession } from "@/lib/session";
import { useGsapAccordion } from "@/lib/gsapAnimations";

const groups = [
    {
        label: "Overview",
        items: [{ to: "/admin-dashboard", label: "Overview", icon: LayoutDashboard }],
    },
    {
        label: "User Management",
        icon: Users,
        items: [
            { to: "/admin-dashboard/users?role=customer", label: "Users", icon: Users },
            { to: "/admin-dashboard/users?role=merchant", label: "Merchants", icon: Store },
        ],
    },
    {
        label: "Events",
        icon: Calendar,
        items: [
            { to: "/admin-dashboard/events", label: "All Events", icon: Calendar },
            { to: "/admin-dashboard/event-monitoring", label: "Event Monitoring", icon: Activity },
            { to: "/admin-dashboard/my-events", label: "My Events", icon: Calendar },
            { to: "/admin-dashboard/bookings", label: "Bookings", icon: BookOpen },
        ],
    },
    {
        label: "Services",
        icon: Briefcase,
        items: [
            { to: "/admin-dashboard/services", label: "All Services", icon: Briefcase },
            { to: "/admin-dashboard/my-services", label: "My Services", icon: Briefcase },
        ],
    },
    {
        label: "Payments",
        icon: DollarSign,
        items: [
            { to: "/admin-dashboard/payments", label: "Transactions", icon: CreditCard },
            { to: "/admin-dashboard/commissions", label: "Commissions", icon: Calculator },
            { to: "/admin-dashboard/refunds", label: "Refunds", icon: RefreshCcw },
            { to: "/admin-dashboard/payouts", label: "Payouts", icon: Wallet },
            { to: "/admin-dashboard/earnings", label: "Admin Earnings", icon: DollarSign },
        ],
    },
    {
        label: "Growth",
        icon: BarChart3,
        items: [
            { to: "/admin-dashboard/reports", label: "Reports & Analytics", icon: BarChart3 },
            { to: "/admin-dashboard/ai-recommendations", label: "AI Recommendations", icon: Sparkles },
            { to: "/admin-dashboard/referrals", label: "Referrals", icon: Gift },
            { to: "/admin-dashboard/ratings", label: "Ratings", icon: Star },
            { to: "/admin-dashboard/coupons", label: "Coupons", icon: Ticket },
            { to: "/admin-dashboard/homepage", label: "Homepage CMS", icon: Home },
        ],
    },
    {
        label: "Account",
        icon: Settings,
        items: [
            { to: "/admin-dashboard/settings", label: "Settings", icon: Settings },
            { to: "/admin-dashboard/profile", label: "My Profile", icon: User },
        ],
    },
];

const isLinkActive = (to, location) => {
    const [path, query] = to.split("?");
    if (!query) return location.pathname === path;
    return location.pathname === path && location.search === `?${query}`;
};

const AccordionGroup = ({ group, isOpen, onToggle, onClose }) => {
    const location = useLocation();
    const isActive = group.items.some((s) => isLinkActive(s.to, location));
    const panelRef = useGsapAccordion(isOpen);

    if (group.items.length === 1 && !group.icon) {
        const item = group.items[0];
        const active = isLinkActive(item.to, location);
        return (
            <Link to={item.to} onClick={onClose} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${active ? "bg-gradient-primary text-primary-foreground shadow-sm font-bold" : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground"}`}>
                <item.icon className="h-4 w-4 shrink-0" />{item.label}
            </Link>
        );
    }

    return (
        <div className="space-y-1">
            <button onClick={onToggle} aria-expanded={isOpen} className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${isActive || isOpen ? "bg-secondary text-foreground font-bold" : "text-foreground/80 hover:bg-secondary/60 hover:text-foreground"}`}>
                <div className="flex items-center gap-2.5">
                    {group.icon && <group.icon className="h-4 w-4 text-primary" />}
                    {group.label}
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : "opacity-60"}`} />
            </button>
            <div ref={panelRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
                <div className="ml-3 mt-1 border-l-2 border-primary/20 pl-2.5 space-y-1 pb-1">
                    {group.items.map((sub) => {
                        const subActive = isLinkActive(sub.to, location);
                        return (
                            <Link key={sub.to} to={sub.to} onClick={onClose} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${subActive ? "bg-gradient-primary text-primary-foreground shadow-sm font-bold" : "text-foreground/75 hover:bg-secondary/80 hover:text-foreground"}`}>
                                <sub.icon className="h-3.5 w-3.5" />{sub.label}
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
    const [openGroup, setOpenGroup] = useState(null);

    useEffect(() => {
        const active = groups.find((g) => g.items.some((s) => s.to.split("?")[0] === location.pathname) && g.items.length > 1);
        if (active) setOpenGroup(active.label);
    }, [location.pathname]);

    return (
        <nav className="space-y-1 p-2.5">
            {groups.map((group) => (
                <AccordionGroup key={group.label} group={group} isOpen={openGroup === group.label} onToggle={() => setOpenGroup((g) => (g === group.label ? null : group.label))} onClose={onClose} />
            ))}
        </nav>
    );
};

const AdminSidebar = ({ open, onClose, onToggle }) => {
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
    <aside className="hidden lg:flex flex-col w-[260px] border-r border-border/70 bg-card/95 backdrop-blur-xl shrink-0 sticky top-16 h-[calc(100vh-4rem)] font-sans ml-0 my-0">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/70">
        <Shield className="h-4 w-4 text-primary"/>
        <span className="font-display text-sm font-bold tracking-tight text-foreground">Admin Portal</span>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NavLinks onClose={() => {}} />
      </div>
      <div className="border-t border-border/70 p-3">
        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors">
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
      {open && (<motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed top-14 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col shadow-2xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <span className="font-display text-base font-bold text-primary flex items-center gap-2">
              <Shield className="h-4 w-4"/> Admin Menu
            </span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

export default AdminSidebar;
