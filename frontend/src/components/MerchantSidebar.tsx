import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calendar, Briefcase, CheckCircle2, Settings, Video, User, Ticket, DollarSign, Megaphone, BarChart3, Inbox, QrCode, X, Sparkles, Menu, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearSession } from "@/lib/session";

interface MerchantSidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}

const links = [
  { to: "/merchant-dashboard",                    label: "Overview",           icon: LayoutDashboard },
  { to: "/merchant-dashboard/events",             label: "My Events",          icon: Calendar },
  { to: "/merchant-dashboard/live-events",        label: "Live Events",        icon: Video },
  { to: "/merchant-dashboard/services",           label: "My Services",        icon: Briefcase },
  { to: "/merchant-dashboard/bookings",           label: "Bookings",           icon: CheckCircle2 },
  { to: "/merchant-dashboard/earnings",           label: "Earnings",           icon: DollarSign },
  { to: "/merchant-dashboard/marketing",          label: "Marketing Tools",    icon: Megaphone },
  { to: "/merchant-dashboard/ai-recommendations", label: "AI Reach Stats",     icon: Sparkles, highlight: true },
  { to: "/merchant-dashboard/qr-codes",           label: "QR Codes",           icon: QrCode },
  { to: "/merchant-dashboard/inbox",              label: "Inbox",              icon: Inbox },
  { to: "/merchant-dashboard/ticket-validation",  label: "Ticket Validation",  icon: Ticket },
  { to: "/merchant-dashboard/analytics",          label: "Event Analytics",    icon: BarChart3 },
  { to: "/merchant-dashboard/settings",           label: "Settings",           icon: Settings },
  { to: "/merchant-dashboard/profile",            label: "My Profile",         icon: User },
];

const NavLinks = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  return (
    <nav className="space-y-1 p-3">
      {links.map(({ to, label, icon: Icon, ...rest }) => {
        const isActive = location.pathname === to;
        const isHighlight = (rest as any).highlight;
        return (
          <Link key={to} to={to} onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              isActive ? "bg-gradient-primary text-primary-foreground"
              : isHighlight ? "text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
            {isHighlight && !isActive && (
              <span className="ml-auto text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">AI</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

const MerchantSidebar = ({ open, onClose, onToggle }: MerchantSidebarProps) => {
  const { setIsLoggedIn, setToken, setUser } = useAuth() as any;
  const navigate = useNavigate();
  const handleLogout = () => {
    setIsLoggedIn(false); setToken(null); setUser(null);
    localStorage.removeItem("token"); localStorage.removeItem("role");
    clearSession(); onClose(); navigate("/login");
  };
  return (
  <>
    {/* Hamburger toggle — hidden on mobile (Navbar handles it), visible on sm+ */}
    <button
      onClick={onToggle}
      className="hidden sm:flex fixed top-[4.25rem] left-3 z-50 items-center justify-center w-9 h-9 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors shadow-sm"
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
          className="fixed top-16 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-display text-sm font-bold text-gradient">Merchant Menu</span>
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

export default MerchantSidebar;
