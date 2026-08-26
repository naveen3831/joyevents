import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Menu,
  Store,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Calendar,
  Briefcase,
  DollarSign,
  Megaphone,
  BarChart3,
  Sparkles,
  Gift,
  QrCode,
  Inbox,
  Ticket,
  Video,
  CheckCircle2,
  Loader2,
  X,
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { clearSession } from "@/lib/session";
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
  "/merchant-dashboard": [{ label: "Merchant Portal" }, { label: "Overview" }],
  "/merchant-dashboard/events": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "My Events" }],
  "/merchant-dashboard/events/new": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "Create Event" }],
  "/merchant-dashboard/create-event": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "Create Event" }],
  "/merchant-dashboard/live-events": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "Live Events" }],
  "/merchant-dashboard/services": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "My Services" }],
  "/merchant-dashboard/services/new": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "Create Service" }],
  "/merchant-dashboard/create-service": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "Create Service" }],
  "/merchant-dashboard/bookings": [{ label: "Merchant Portal" }, { label: "Events & Services" }, { label: "Bookings" }],
  "/merchant-dashboard/earnings": [{ label: "Merchant Portal" }, { label: "Growth" }, { label: "Earnings" }],
  "/merchant-dashboard/marketing": [{ label: "Merchant Portal" }, { label: "Growth" }, { label: "Marketing Tools" }],
  "/merchant-dashboard/referrals": [{ label: "Merchant Portal" }, { label: "Growth" }, { label: "Referrals" }],
  "/merchant-dashboard/ai-recommendations": [{ label: "Merchant Portal" }, { label: "Growth" }, { label: "AI Reach Stats" }],
  "/merchant-dashboard/analytics": [{ label: "Merchant Portal" }, { label: "Growth" }, { label: "Event Analytics" }],
  "/merchant-dashboard/qr-codes": [{ label: "Merchant Portal" }, { label: "Operations" }, { label: "QR Codes" }],
  "/merchant-dashboard/inbox": [{ label: "Merchant Portal" }, { label: "Operations" }, { label: "Inbox" }],
  "/merchant-dashboard/ticket-validation": [{ label: "Merchant Portal" }, { label: "Operations" }, { label: "Ticket Validation" }],
  "/merchant-dashboard/settings": [{ label: "Merchant Portal" }, { label: "Account" }, { label: "Settings" }],
  "/merchant-dashboard/profile": [{ label: "Merchant Portal" }, { label: "Account" }, { label: "My Profile" }],
};

const MERCHANT_PAGES = [
  { title: "Overview", group: "Dashboard", route: "/merchant-dashboard", icon: Store, keywords: ["home", "dashboard", "overview"] },
  { title: "My Events", group: "Events & Services", route: "/merchant-dashboard/events", icon: Calendar, keywords: ["events", "my events", "manage events"] },
  { title: "Create Event", group: "Events & Services", route: "/merchant-dashboard/create-event", icon: Calendar, keywords: ["create event", "new event", "add event"] },
  { title: "Live Events", group: "Events & Services", route: "/merchant-dashboard/live-events", icon: Video, keywords: ["live events", "stream"] },
  { title: "My Services", group: "Events & Services", route: "/merchant-dashboard/services", icon: Briefcase, keywords: ["services", "my services"] },
  { title: "Create Service", group: "Events & Services", route: "/merchant-dashboard/create-service", icon: Briefcase, keywords: ["create service", "new service"] },
  { title: "Bookings", group: "Events & Services", route: "/merchant-dashboard/bookings", icon: CheckCircle2, keywords: ["bookings", "reservations", "orders"] },
  { title: "Earnings & Wallet", group: "Growth", route: "/merchant-dashboard/earnings", icon: DollarSign, keywords: ["earnings", "wallet", "payouts", "revenue"] },
  { title: "Marketing Tools", group: "Growth", route: "/merchant-dashboard/marketing", icon: Megaphone, keywords: ["marketing", "promotions"] },
  { title: "Referrals", group: "Growth", route: "/merchant-dashboard/referrals", icon: Gift, keywords: ["referrals", "rewards", "invite"] },
  { title: "AI Reach Stats", group: "Growth", route: "/merchant-dashboard/ai-recommendations", icon: Sparkles, keywords: ["ai", "reach", "stats", "picks"] },
  { title: "Event Analytics", group: "Growth", route: "/merchant-dashboard/analytics", icon: BarChart3, keywords: ["analytics", "charts", "stats"] },
  { title: "QR Codes", group: "Operations", route: "/merchant-dashboard/qr-codes", icon: QrCode, keywords: ["qr", "codes", "generator"] },
  { title: "Inbox", group: "Operations", route: "/merchant-dashboard/inbox", icon: Inbox, keywords: ["inbox", "messages", "chat"] },
  { title: "Ticket Validation", group: "Operations", route: "/merchant-dashboard/ticket-validation", icon: Ticket, keywords: ["tickets", "validation", "scan"] },
  { title: "Account Settings", group: "Account", route: "/merchant-dashboard/settings", icon: Settings, keywords: ["settings", "preferences"] },
  { title: "My Profile", group: "Account", route: "/merchant-dashboard/profile", icon: User, keywords: ["profile", "merchant profile"] },
];

export const MerchantTopHeader = ({ onSidebarToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, setIsLoggedIn, setToken, setUser } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matchingPages, setMatchingPages] = useState([]);
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
    if (currentPath.startsWith("/merchant-dashboard/services/") && currentPath.endsWith("/edit")) {
      return [{ label: "Merchant Portal" }, { label: "Services", to: "/merchant-dashboard/services" }, { label: "Edit Service" }];
    }
    return [{ label: "Merchant Portal" }, { label: "Dashboard" }];
  };

  const breadcrumbs = getBreadcrumbs();
  const userName = user?.name || "Merchant";
  const userEmail = user?.email || "merchant@eventoza.com";
  const userInitials = userName.slice(0, 2).toUpperCase();

  // Search Input Filter & Debounced Record Search
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      setMatchingPages(MERCHANT_PAGES.slice(0, 6));
      setMatchingRecords([]);
      setIsSearching(false);
      return;
    }

    const pages = MERCHANT_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.group.toLowerCase().includes(query) ||
        p.keywords.some((k) => k.includes(query))
    );
    setMatchingPages(pages);

    if (query.length < 2) {
      setMatchingRecords([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const foundRecords = [];
        if (token) {
          const [eventsRes, servicesRes] = await Promise.all([
            fetch(`${API_URL}/api/events/my-events`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
            fetch(`${API_URL}/api/services/my-services`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
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
                route: `/merchant-dashboard/events`,
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
                route: `/merchant-dashboard/services`,
                type: "service",
              });
            });
        }
        setMatchingRecords(foundRecords);
      } catch (err) {
        console.error("Merchant search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const allResults = [
    ...matchingPages.map((p) => ({ ...p, itemType: "page" })),
    ...matchingRecords.map((r) => ({ ...r, itemType: "record" })),
  ];

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
          <Link to="/merchant-dashboard" className="hidden sm:flex items-center gap-2 group">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
              <Store className="h-3.5 w-3.5" />
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

      {/* Right section: Global Search, Notifications & Merchant Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Search Input & Command Dropdown */}
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
            placeholder="Search merchant portal..."
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
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Searching records...
                </div>
              ) : allResults.length === 0 ? (
                <div className="py-6 px-4 text-center text-muted-foreground">
                  <p className="font-semibold text-xs text-foreground">No results found</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Try searching for "events", "services", or "bookings"</p>
                </div>
              ) : (
                <>
                  {!searchQuery.trim() && (
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Quick Portal Pages
                    </div>
                  )}

                  {/* Matching Pages */}
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

                  {/* Matching Records */}
                  {matchingRecords.length > 0 && (
                    <div className="py-1 border-t border-border/50">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Events & Services
                      </div>
                      {matchingRecords.map((r, idx) => {
                        const globalIdx = matchingPages.length + idx;
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

        {/* Merchant Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-muted/70 transition-colors focus:outline-none cursor-pointer">
              <Avatar className="h-7 w-7 border border-border/80">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 uppercase tracking-wider font-medium">
                  Merchant
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
              <Link to="/merchant-dashboard/profile" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="px-2.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer hover:bg-muted">
              <Link to="/merchant-dashboard/settings" className="flex items-center gap-2">
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

export default MerchantTopHeader;
