import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Menu,
  Shield,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Users,
  Calendar,
  Briefcase,
  CreditCard,
  Sparkles,
  Gift,
  Star,
  Tag,
  Layout,
  Wrench,
  Loader2,
  X,
  FileText,
  IndianRupee,
  TrendingUp,
  BarChart3,
  Activity,
  BookOpen
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { clearSession } from "@/lib/session";
import { apiListUsers } from "@/lib/api";
import { API_URL } from "@/lib/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const routeBreadcrumbMap = {
  "/admin-dashboard": [{ label: "Admin Portal" }, { label: "Overview" }],
  "/admin-dashboard/users": [{ label: "Admin Portal" }, { label: "User Management" }, { label: "Users & Merchants" }],
  "/admin-dashboard/events": [{ label: "Admin Portal" }, { label: "Events" }, { label: "All Events" }],
  "/admin-dashboard/event-monitoring": [{ label: "Admin Portal" }, { label: "Events" }, { label: "Monitoring" }],
  "/admin-dashboard/my-events": [{ label: "Admin Portal" }, { label: "Events" }, { label: "My Events" }],
  "/admin-dashboard/bookings": [{ label: "Admin Portal" }, { label: "Events" }, { label: "Bookings" }],
  "/admin-dashboard/services": [{ label: "Admin Portal" }, { label: "Services" }, { label: "All Services" }],
  "/admin-dashboard/my-services": [{ label: "Admin Portal" }, { label: "Services" }, { label: "My Services" }],
  "/admin-dashboard/payments": [{ label: "Admin Portal" }, { label: "Payments" }, { label: "Transactions" }],
  "/admin-dashboard/commissions": [{ label: "Admin Portal" }, { label: "Payments" }, { label: "Commissions" }],
  "/admin-dashboard/refunds": [{ label: "Admin Portal" }, { label: "Payments" }, { label: "Refunds" }],
  "/admin-dashboard/payouts": [{ label: "Admin Portal" }, { label: "Payments" }, { label: "Payouts" }],
  "/admin-dashboard/earnings": [{ label: "Admin Portal" }, { label: "Payments" }, { label: "Admin Earnings" }],
  "/admin-dashboard/reports": [{ label: "Admin Portal" }, { label: "Growth" }, { label: "Reports & Analytics" }],
  "/admin-dashboard/ai-recommendations": [{ label: "Admin Portal" }, { label: "Growth" }, { label: "AI Recommendations" }],
  "/admin-dashboard/referrals": [{ label: "Admin Portal" }, { label: "Growth" }, { label: "Referrals" }],
  "/admin-dashboard/ratings": [{ label: "Admin Portal" }, { label: "Growth" }, { label: "Ratings" }],
  "/admin-dashboard/coupons": [{ label: "Admin Portal" }, { label: "Growth" }, { label: "Coupons" }],
  "/admin-dashboard/homepage": [{ label: "Admin Portal" }, { label: "Growth" }, { label: "Homepage CMS" }],
  "/admin-dashboard/settings": [{ label: "Admin Portal" }, { label: "Account" }, { label: "Settings" }],
  "/admin-dashboard/profile": [{ label: "Admin Portal" }, { label: "Account" }, { label: "My Profile" }],
  "/admin-dashboard/utilities": [{ label: "Admin Portal" }, { label: "Account" }, { label: "Diagnostics & Utilities" }],
};

const ADMIN_PAGES = [
  { title: "Overview", group: "Dashboard", route: "/admin-dashboard", icon: Shield, keywords: ["home", "dashboard", "overview"] },
  { title: "User Management", group: "Users", route: "/admin-dashboard/users", icon: Users, keywords: ["users", "merchants", "customers", "members"] },
  { title: "All Events", group: "Events", route: "/admin-dashboard/events", icon: Calendar, keywords: ["events", "browse events", "all events"] },
  { title: "Event Monitoring", group: "Events", route: "/admin-dashboard/event-monitoring", icon: Activity, keywords: ["monitoring", "live events", "track"] },
  { title: "My Events", group: "Events", route: "/admin-dashboard/my-events", icon: Calendar, keywords: ["my events", "create event"] },
  { title: "Bookings", group: "Events", route: "/admin-dashboard/bookings", icon: BookOpen, keywords: ["bookings", "reservations", "orders"] },
  { title: "All Services", group: "Services", route: "/admin-dashboard/services", icon: Briefcase, keywords: ["services", "all services", "vendors"] },
  { title: "My Services", group: "Services", route: "/admin-dashboard/my-services", icon: Briefcase, keywords: ["my services", "create service"] },
  { title: "Transactions & Payments", group: "Payments", route: "/admin-dashboard/payments", icon: CreditCard, keywords: ["payments", "transactions", "wallet", "money"] },
  { title: "Commissions", group: "Payments", route: "/admin-dashboard/commissions", icon: IndianRupee, keywords: ["commissions", "fees"] },
  { title: "Refunds", group: "Payments", route: "/admin-dashboard/refunds", icon: CreditCard, keywords: ["refunds", "returns"] },
  { title: "Payouts", group: "Payments", route: "/admin-dashboard/payouts", icon: TrendingUp, keywords: ["payouts", "settlements"] },
  { title: "Admin Earnings", group: "Payments", route: "/admin-dashboard/earnings", icon: TrendingUp, keywords: ["earnings", "revenue"] },
  { title: "Reports & Analytics", group: "Growth", route: "/admin-dashboard/reports", icon: BarChart3, keywords: ["reports", "analytics", "stats", "charts"] },
  { title: "AI Recommendations", group: "Growth", route: "/admin-dashboard/ai-recommendations", icon: Sparkles, keywords: ["ai", "picks", "recommendations", "smart"] },
  { title: "Referrals & Rewards", group: "Growth", route: "/admin-dashboard/referrals", icon: Gift, keywords: ["referrals", "rewards", "invite"] },
  { title: "Ratings & Reviews", group: "Growth", route: "/admin-dashboard/ratings", icon: Star, keywords: ["ratings", "reviews", "feedback"] },
  { title: "Coupons & Discounts", group: "Growth", route: "/admin-dashboard/coupons", icon: Tag, keywords: ["coupons", "discounts", "vouchers"] },
  { title: "Homepage CMS", group: "Growth", route: "/admin-dashboard/homepage", icon: Layout, keywords: ["homepage", "cms", "banners"] },
  { title: "Account Settings", group: "Account", route: "/admin-dashboard/settings", icon: Settings, keywords: ["settings", "preferences", "account"] },
  { title: "My Profile", group: "Account", route: "/admin-dashboard/profile", icon: User, keywords: ["profile", "my profile", "admin"] },
  { title: "Diagnostics & Utilities", group: "Account", route: "/admin-dashboard/utilities", icon: Wrench, keywords: ["utilities", "diagnostics", "tools"] },
];

export const AdminTopHeader = ({ onSidebarToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, setIsLoggedIn, setToken, setUser } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matchingPages, setMatchingPages] = useState([]);
  const [matchingUsers, setMatchingUsers] = useState([]);
  const [matchingRecords, setMatchingRecords] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);

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

  const getBreadcrumbs = () => {
    const currentPath = location.pathname;
    if (routeBreadcrumbMap[currentPath]) {
      return routeBreadcrumbMap[currentPath];
    }
    if (currentPath.startsWith("/admin-dashboard/users/")) {
      return [{ label: "Admin Portal" }, { label: "User Management", to: "/admin-dashboard/users" }, { label: "User Details" }];
    }
    if (currentPath.startsWith("/admin-dashboard/events/")) {
      return [{ label: "Admin Portal" }, { label: "Events", to: "/admin-dashboard/events" }, { label: "Event Details" }];
    }
    if (currentPath.startsWith("/admin-dashboard/my-events/")) {
      return [{ label: "Admin Portal" }, { label: "Events", to: "/admin-dashboard/my-events" }, { label: "Event Form" }];
    }
    if (currentPath.startsWith("/admin-dashboard/services/")) {
      return [{ label: "Admin Portal" }, { label: "Services", to: "/admin-dashboard/services" }, { label: "Service Details" }];
    }
    if (currentPath.startsWith("/admin-dashboard/my-services/")) {
      return [{ label: "Admin Portal" }, { label: "Services", to: "/admin-dashboard/my-services" }, { label: "Service Form" }];
    }
    return [{ label: "Admin Portal" }, { label: "Dashboard" }];
  };

  const breadcrumbs = getBreadcrumbs();
  const userName = user?.name || "Administrator";
  const userEmail = user?.email || "";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const userAvatar = user?.avatar || "";

  // Handle Search Input & API Data Fetching with Debounce
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      // Default Quick Links
      setMatchingPages(ADMIN_PAGES.slice(0, 6));
      setMatchingUsers([]);
      setMatchingRecords([]);
      setIsSearching(false);
      return;
    }

    // Filter static pages
    const pages = ADMIN_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.group.toLowerCase().includes(query) ||
        p.keywords.some((k) => k.includes(query))
    );
    setMatchingPages(pages);

    // If query >= 2 characters, search backend records
    if (query.length < 2) {
      setMatchingUsers([]);
      setMatchingRecords([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const foundUsers = [];
        const foundRecords = [];

        if (token) {
          const userRes = await apiListUsers(token).catch(() => ({ users: [] }));
          const usersList = userRes.users || [];
          const matched = usersList.filter(
            (u) =>
              (u.name && u.name.toLowerCase().includes(query)) ||
              (u.email && u.email.toLowerCase().includes(query)) ||
              (u.role && u.role.toLowerCase().includes(query))
          );
          matched.slice(0, 4).forEach((u) => {
            foundUsers.push({
              id: u._id,
              title: u.name,
              subtitle: `${u.role.toUpperCase()} • ${u.email}`,
              route: `/admin-dashboard/users/${u._id}`,
              type: "user",
            });
          });
        }

        // Search Events & Services via fetch
        const [eventsRes, servicesRes] = await Promise.all([
          fetch(`${API_URL}/api/events`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`${API_URL}/api/services`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);

        const eventsList = Array.isArray(eventsRes) ? eventsRes : (eventsRes.events || []);
        eventsList
          .filter((e) => e.title && e.title.toLowerCase().includes(query))
          .slice(0, 3)
          .forEach((e) => {
            foundRecords.push({
              id: e._id,
              title: e.title,
              subtitle: `EVENT • ${e.category || "General"}`,
              route: `/admin-dashboard/events/${e._id}`,
              type: "event",
            });
          });

        const servicesList = Array.isArray(servicesRes) ? servicesRes : (servicesRes.services || []);
        servicesList
          .filter((s) => s.title && s.title.toLowerCase().includes(query))
          .slice(0, 3)
          .forEach((s) => {
            foundRecords.push({
              id: s._id,
              title: s.title,
              subtitle: `SERVICE • ${s.category || "General"}`,
              route: `/admin-dashboard/services/${s._id}`,
              type: "service",
            });
          });

        setMatchingUsers(foundUsers);
        setMatchingRecords(foundRecords);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  // Total results array for keyboard navigation
  const allResults = [
    ...matchingPages.map((p) => ({ ...p, itemType: "page" })),
    ...matchingUsers.map((u) => ({ ...u, itemType: "user" })),
    ...matchingRecords.map((r) => ({ ...r, itemType: "record" })),
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (item) => {
    if (item.route) {
      navigate(item.route);
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!isSearchOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (allResults.length ? (prev + 1) % allResults.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (allResults.length ? (prev - 1 + allResults.length) % allResults.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelectResult(allResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header className="sticky top-0 z-40 h-14 w-full bg-card/95 backdrop-blur-md border-b border-border/70 px-4 sm:px-6 flex items-center justify-between shrink-0 font-sans">
      {/* Left section: Sidebar toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onSidebarToggle}
          className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Toggle sidebar menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <div className="flex items-center gap-2">
          <Link to="/admin-dashboard" className="hidden sm:flex items-center gap-2 group">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
              <Shield className="h-3.5 w-3.5" />
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-foreground transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={`truncate ${
                      idx === breadcrumbs.length - 1
                        ? "text-foreground font-semibold"
                        : "hover:text-foreground"
                    }`}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      {/* Right section: Global Search, Notifications & Admin Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Global Search Input & Interactive Command Dropdown */}
        <div ref={searchContainerRef} className="relative hidden md:flex items-center w-64 lg:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search portal (users, events, settings)..."
            className="w-full h-8 pl-8 pr-7 bg-muted/50 hover:bg-muted focus:bg-card border border-border/60 rounded-lg text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedIndex(0);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Search Dropdown Panel */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/80 rounded-xl shadow-lg overflow-hidden z-50 text-xs py-1.5 max-h-96 overflow-y-auto font-sans animate-in fade-in-50 zoom-in-95">
              {isSearching ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Searching portal records...
                </div>
              ) : allResults.length === 0 ? (
                <div className="py-6 px-4 text-center text-muted-foreground">
                  <p className="font-semibold text-xs text-foreground">No results found</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Try searching for "users", "merchants", "events", or "settings"</p>
                </div>
              ) : (
                <>
                  {!searchQuery.trim() && (
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Quick Portal Pages
                    </div>
                  )}

                  {/* Matching Pages Section */}
                  {matchingPages.length > 0 && (
                    <div className="py-1">
                      {searchQuery.trim() && (
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Pages
                        </div>
                      )}
                      {matchingPages.map((page, idx) => {
                        const Icon = page.icon || FileText;
                        const isSelected = idx === selectedIndex;
                        return (
                          <div
                            key={page.route}
                            onClick={() => handleSelectResult(page)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{page.title}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-mono px-1.5 py-0.5 rounded bg-muted/60">
                              {page.group}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching Users Section */}
                  {matchingUsers.length > 0 && (
                    <div className="py-1 border-t border-border/50">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Users & Merchants
                      </div>
                      {matchingUsers.map((u, idx) => {
                        const globalIdx = matchingPages.length + idx;
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <div
                            key={u.id}
                            onClick={() => handleSelectResult(u)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-xs">{u.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{u.subtitle}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching Events & Services Section */}
                  {matchingRecords.length > 0 && (
                    <div className="py-1 border-t border-border/50">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Events & Services
                      </div>
                      {matchingRecords.map((r, idx) => {
                        const globalIdx = matchingPages.length + matchingUsers.length + idx;
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <div
                            key={r.id}
                            onClick={() => handleSelectResult(r)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {r.type === "event" ? (
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                              ) : (
                                <Briefcase className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium text-xs">{r.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{r.subtitle}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <NotificationBell buttonClassName="w-8 h-8 rounded-lg border-none bg-muted/50 hover:bg-muted" iconClassName="h-4 w-4" />

        {/* Admin Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-muted/70 transition-colors focus:outline-none cursor-pointer">
              <Avatar className="h-7 w-7 border border-border/80 overflow-hidden shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={userName} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 uppercase tracking-wider font-medium">
                  Admin
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 bg-card border-border shadow-lg rounded-xl text-foreground">
            <DropdownMenuLabel className="px-2.5 py-1.5">
              <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
              <p className="text-[11px] text-muted-foreground truncate font-normal">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-border/60" />
            <DropdownMenuItem asChild className="px-2.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer hover:bg-muted">
              <Link to="/admin-dashboard/profile" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="px-2.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer hover:bg-muted">
              <Link to="/admin-dashboard/settings" className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-border/60" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer hover:bg-rose-500/10 focus:bg-rose-500/10"
            >
              <LogOut className="h-3.5 w-3.5 mr-2 text-rose-600 dark:text-rose-400" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminTopHeader;
