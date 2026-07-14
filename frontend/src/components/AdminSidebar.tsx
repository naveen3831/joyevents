import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Calendar, Settings, Briefcase, DollarSign,
  BarChart3, Activity, User, CreditCard, Calculator, RefreshCcw,
  Wallet, BookOpen, ChevronDown, X, Sparkles, Menu, LogOut, Home
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearSession } from "@/lib/session";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}

const links: any[] = [
  { to: "/admin-dashboard",                  label: "Overview",             icon: LayoutDashboard },
  { to: "/admin-dashboard/users",            label: "Users",                icon: Users },
  { to: "/admin-dashboard/events",           label: "Events",               icon: Calendar },
  { to: "/admin-dashboard/event-monitoring", label: "Event Monitoring",     icon: Activity },
  { to: "/admin-dashboard/services",         label: "Services",             icon: Briefcase },
  { to: "/admin-dashboard/bookings",         label: "Bookings",             icon: BookOpen },
  {
    label: "Payments", icon: DollarSign,
    submenu: [
      { to: "/admin-dashboard/payments",    label: "Transactions", icon: CreditCard },
      { to: "/admin-dashboard/commissions", label: "Commissions",  icon: Calculator },
      { to: "/admin-dashboard/refunds",     label: "Refunds",      icon: RefreshCcw },
      { to: "/admin-dashboard/payouts",     label: "Payouts",      icon: Wallet },
      { to: "/admin-dashboard/earnings",    label: "Admin Earnings", icon: DollarSign },
    ]
  },
  { to: "/admin-dashboard/reports",             label: "Reports & Analytics", icon: BarChart3 },
  { to: "/admin-dashboard/ai-recommendations",  label: "AI Recommendations",  icon: Sparkles },
  { to: "/admin-dashboard/homepage",            label: "Homepage CMS",        icon: Home },
  { to: "/admin-dashboard/settings",            label: "Settings",             icon: Settings },
  { to: "/admin-dashboard/profile",             label: "My Profile",           icon: User },
];

const NavLinks = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    const active = links.find(l => l.submenu?.some((s: any) => s.to === location.pathname));
    if (active) setExpandedSection(active.label);
  }, [location.pathname]);

  return (
    <nav className="space-y-1 p-3">
      {links.map((link) => {
        if (link.submenu) {
          const isExpanded = expandedSection === link.label;
          const isActive = link.submenu.some((s: any) => s.to === location.pathname);
          return (
            <div key={link.label}>
              <button
                onClick={() => setExpandedSection(isExpanded ? null : link.label)}
                className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive || isExpanded ? "bg-secondary text-foreground border border-border" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <div className="flex items-center gap-3"><link.icon className="h-4 w-4" />{link.label}</div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden ml-3 mt-1 border-l border-border pl-3">
                    {link.submenu.map((sub: any) => {
                      const isSubActive = location.pathname === sub.to;
                      return (
                        <Link key={sub.to} to={sub.to} onClick={onClose}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isSubActive ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                          <sub.icon className="h-3.5 w-3.5" />{sub.label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }
        const isActive = location.pathname === link.to;
        return (
          <Link key={link.to} to={link.to} onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <link.icon className="h-4 w-4" />{link.label}
          </Link>
        );
      })}
    </nav>
  );
};

const AdminSidebar = ({ open, onClose, onToggle }: AdminSidebarProps) => {
  const { setIsLoggedIn, setToken, setUser } = useAuth() as any;
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
  return (
  <>
    {/* Hamburger toggle — hidden on mobile (Navbar handles it), visible on sm+ */}
    <button
      onClick={onToggle}
      className="hidden sm:flex fixed top-[5.25rem] left-3 z-50 items-center justify-center w-9 h-9 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors shadow-sm"
      aria-label="Toggle menu"
    >
      {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
    </button>

    {/* Backdrop */}
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose} />
      )}
    </AnimatePresence>

    {/* Drawer */}
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed top-20 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-display text-sm font-bold text-gradient">Admin Menu</span>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavLinks onClose={onClose} />
          </div>
          <div className="border-t border-border p-3">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors">
              <LogOut className="h-4 w-4 shrink-0" /> Logout
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  </>
  );
};

export default AdminSidebar;
