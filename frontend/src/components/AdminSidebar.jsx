import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Store,
  Calendar,
  Settings,
  Briefcase,
  DollarSign,
  BarChart3,
  Activity,
  User,
  CreditCard,
  Calculator,
  RefreshCcw,
  Wallet,
  BookOpen,
  ChevronDown,
  Sparkles,
  LogOut,
  Home,
  Gift,
  Star,
  Ticket,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearSession } from "@/lib/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

  // Single-item group (like Overview)
  if (group.items.length === 1 && !group.icon) {
    const item = group.items[0];
    const active = isLinkActive(item.to, location);
    const Icon = item.icon;
    return (
      <Link
        to={item.to}
        onClick={onClose}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
          active
            ? "bg-blue-50/90 text-primary font-semibold dark:bg-blue-950/40 dark:text-blue-300"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-primary dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`} />
        <span>{item.label}</span>
      </Link>
    );
  }

  const GroupIcon = group.icon;

  return (
    <div className="space-y-0.5">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
          isActive || isOpen
            ? "bg-slate-100/90 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-semibold"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {GroupIcon && (
            <GroupIcon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-primary dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`} />
          )}
          <span className="truncate">{group.label}</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : "text-slate-400"
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-3 border-l border-slate-200/80 dark:border-slate-800 space-y-1 py-1">
              {group.items.map((sub) => {
                const subActive = isLinkActive(sub.to, location);
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.to}
                    to={sub.to}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      subActive
                        ? "bg-blue-50/90 text-primary font-semibold dark:bg-blue-950/40 dark:text-blue-300"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <SubIcon className={`h-4 w-4 shrink-0 ${subActive ? "text-primary dark:text-blue-400" : "text-slate-400"}`} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavLinks = ({ onClose }) => {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState(null);

  useEffect(() => {
    const active = groups.find(
      (g) => g.items.some((s) => s.to.split("?")[0] === location.pathname) && g.items.length > 1
    );
    if (active) setOpenGroup(active.label);
  }, [location.pathname]);

  return (
    <nav className="space-y-1 p-3">
      {groups.map((group) => (
        <AccordionGroup
          key={group.label}
          group={group}
          isOpen={openGroup === group.label}
          onToggle={() =>
            setOpenGroup((g) => (g === group.label ? null : group.label))
          }
          onClose={onClose}
        />
      ))}
    </nav>
  );
};

const AdminSidebar = ({ open, onClose }) => {
  const { user, setIsLoggedIn, setToken, setUser } = useAuth();
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

  const userName = user?.name || "Administrator";
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Desktop Enterprise SaaS Sidebar (Exact Reference Design Match) */}
      <aside className="hidden lg:flex flex-col w-[240px] h-full overflow-hidden border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 font-sans">
        {/* Compact Logo & Brand Header */}
        <div className="h-14 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              Eventoza
            </h1>
            <p className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase leading-none mt-0.5">
              ADMIN PORTAL
            </p>
          </div>
        </div>

        {/* Navigation Links Scroll Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar py-1">
          <NavLinks onClose={() => {}} />
        </div>

        {/* Bottom Sidebar Profile & Logout Footer */}
        <div className="border-t border-slate-200/80 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-7 w-7 border border-slate-200 dark:border-slate-800 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
                  Admin Portal
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Slide-Out Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-xl lg:hidden font-sans"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight block">
                    Eventoza
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase leading-none block">
                    ADMIN PORTAL
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <NavLinks onClose={onClose} />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
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
