import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  CheckCircle2,
  Settings,
  Video,
  User,
  Ticket,
  IndianRupee,
  Megaphone,
  BarChart3,
  Inbox,
  QrCode,
  ChevronDown,
  Sparkles,
  LogOut,
  Gift,
  Store,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearSession } from "@/lib/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const groups = [
  {
    label: "Overview",
    items: [{ to: "/merchant-dashboard", label: "Overview", icon: LayoutDashboard }],
  },
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
      { to: "/merchant-dashboard/earnings", label: "Earnings & Wallet", icon: IndianRupee },
      { to: "/merchant-dashboard/marketing", label: "Marketing Tools", icon: Megaphone },
      { to: "/merchant-dashboard/referrals", label: "Referrals", icon: Gift },
      { to: "/merchant-dashboard/ai-recommendations", label: "AI Reach Stats", icon: Sparkles },
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

const isLinkActive = (to, location) => {
  const [path, query] = to.split("?");
  if (!query) return location.pathname === path;
  return location.pathname === path && location.search === `?${query}`;
};

const AccordionGroup = ({ group, isOpen, onToggle, onClose, isMerchantActive }) => {
  const location = useLocation();

  const visibleItems = isMerchantActive
    ? group.items
    : group.items.filter(
        (i) => i.to === "/merchant-dashboard" || i.to.endsWith("/profile") || i.to.endsWith("/settings")
      );

  if (!visibleItems.length) return null;

  // Single-item group (like Overview)
  if (visibleItems.length === 1 && !group.icon) {
    const item = visibleItems[0];
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

  const isActive = visibleItems.some((s) => isLinkActive(s.to, location));
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
              {visibleItems.map((sub) => {
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
  const { user } = useAuth();
  const isMerchantActive = user?.merchantStatus === "active";
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
          isMerchantActive={isMerchantActive}
        />
      ))}
    </nav>
  );
};

const MerchantSidebar = ({ open, onClose }) => {
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

  const userName = user?.name || "Merchant";
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Desktop Enterprise SaaS Sidebar (Exact Match to Admin Portal) */}
      <aside className="hidden lg:flex flex-col w-[240px] h-full overflow-hidden border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 font-sans">
        {/* Compact Logo & Brand Header */}
        <div className="h-14 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Store className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              Eventoza
            </h1>
            <p className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase leading-none mt-0.5">
              MERCHANT PORTAL
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
                  Merchant Portal
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
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
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight block">
                    Eventoza
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase leading-none block">
                    MERCHANT PORTAL
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
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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

export default MerchantSidebar;
