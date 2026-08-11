import { Link, useLocation } from "react-router-dom";
import { Home, CalendarDays, Compass, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MobileBottomNav = () => {
    const { isLoggedIn, role } = useAuth();
    const location = useLocation();

    // Determine navigation tabs based on role
    let navItems = [];

    if (role === "merchant") {
        navItems = [
            { to: "/merchant-dashboard/services", label: "Browse", icon: Compass },
            { to: "/merchant-dashboard/bookings", label: "Bookings", icon: CalendarDays },
            { to: "/merchant-dashboard", label: "Home", icon: Home, exact: true, isCenter: true },
            { to: "/merchant-dashboard/inbox", label: "Messages", icon: MessageSquare },
            { to: "/merchant-dashboard/profile", label: "Profile", icon: User },
        ];
    } else if (role === "admin") {
        navItems = [
            { to: "/admin-dashboard/services", label: "Browse", icon: Compass },
            { to: "/admin-dashboard/bookings", label: "Bookings", icon: CalendarDays },
            { to: "/admin-dashboard", label: "Home", icon: Home, exact: true, isCenter: true },
            { to: "/admin-dashboard/payouts", label: "Payouts", icon: MessageSquare },
            { to: "/admin-dashboard/profile", label: "Profile", icon: User },
        ];
    } else {
        // Customer or Guest
        navItems = [
            { to: isLoggedIn ? "/customer-dashboard/browse-services" : "/services", label: "Browse", icon: Compass },
            { to: isLoggedIn ? "/customer-dashboard/bookings" : "/events", label: "Bookings", icon: CalendarDays },
            { to: isLoggedIn ? "/customer-dashboard" : "/", label: "Home", icon: Home, exact: true, isCenter: true },
            { to: isLoggedIn ? "/customer-dashboard/messages" : "/contact", label: "Messages", icon: MessageSquare },
            { to: isLoggedIn ? "/customer-dashboard/profile" : "/login", label: "Profile", icon: User },
        ];
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/80 px-3 py-2 shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
                {navItems.map((item, idx) => {
                    const isActive = item.exact
                        ? location.pathname === item.to
                        : location.pathname.startsWith(item.to) && item.to !== "/";
                    const Icon = item.icon;

                    if (item.isCenter) {
                        return (
                            <Link
                                key={idx}
                                to={item.to}
                                className="flex flex-col items-center justify-end relative -mt-6 group shrink-0 px-1"
                            >
                                <div
                                    className={`h-13 w-13 rounded-2xl flex items-center justify-center border-4 border-card transition-all duration-300 shadow-glow ${
                                        isActive
                                            ? "bg-gradient-primary text-white scale-105 shadow-primary/50"
                                            : "bg-gradient-primary text-white group-hover:scale-105 opacity-95"
                                    }`}
                                >
                                    <Icon className="h-6 w-6 stroke-[2.5]" />
                                </div>
                                <span
                                    className={`text-xs font-bold mt-1 tracking-tight transition-colors ${
                                        isActive ? "text-primary font-black" : "text-muted-foreground group-hover:text-foreground"
                                    }`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={idx}
                            to={item.to}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 ${
                                isActive
                                    ? "text-primary font-bold scale-105"
                                    : "text-muted-foreground hover:text-foreground opacity-80"
                            }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                                <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                            </div>
                            <span className={`text-xs tracking-tight ${isActive ? "font-bold text-primary" : "font-medium"}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileBottomNav;
