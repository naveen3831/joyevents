import { Link, useLocation } from "react-router-dom";
import { Home, CalendarDays, Compass, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MobileBottomNav = () => {
    const { isLoggedIn, role } = useAuth();
    const location = useLocation();

    // Never render bottom navigation if user is not authenticated
    if (!isLoggedIn) return null;

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
        navItems = [
            { to: "/customer-dashboard/browse-services", label: "Browse", icon: Compass },
            { to: "/customer-dashboard/bookings", label: "Bookings", icon: CalendarDays },
            { to: "/customer-dashboard", label: "Home", icon: Home, exact: true, isCenter: true },
            { to: "/customer-dashboard/messages", label: "Messages", icon: MessageSquare },
            { to: "/customer-dashboard/profile", label: "Profile", icon: User },
        ];
    }

    return (
        <nav
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                background: "hsl(var(--card) / 0.97)",
                borderTop: "1px solid hsl(var(--border) / 0.8)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 -4px 30px rgba(0,0,0,0.12)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            className="md:hidden"
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "stretch",
                    justifyContent: "space-around",
                    height: "60px",
                    maxWidth: "480px",
                    margin: "0 auto",
                    padding: "0 4px",
                    position: "relative",
                }}
            >
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
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flex: 1,
                                    position: "relative",
                                    gap: "2px",
                                    textDecoration: "none",
                                }}
                            >
                                {/* Elevated center button */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "-14px",
                                        width: "52px",
                                        height: "52px",
                                        borderRadius: "16px",
                                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "3px solid hsl(var(--card))",
                                        boxShadow: isActive
                                            ? "0 4px 20px hsl(var(--primary) / 0.6)"
                                            : "0 4px 16px hsl(var(--primary) / 0.4)",
                                        transform: isActive ? "scale(1.08)" : "scale(1)",
                                        transition: "all 0.25s ease",
                                    }}
                                >
                                    <Icon
                                        style={{
                                            width: "22px",
                                            height: "22px",
                                            color: "white",
                                            strokeWidth: isActive ? 2.5 : 2,
                                        }}
                                    />
                                </div>
                                {/* Label at the bottom, pushed down to sit within the nav bar */}
                                <span
                                    style={{
                                        marginTop: "auto",
                                        paddingBottom: "2px",
                                        fontSize: "10px",
                                        fontWeight: isActive ? 700 : 600,
                                        color: isActive
                                            ? "hsl(var(--primary))"
                                            : "hsl(var(--muted-foreground))",
                                        letterSpacing: "0.02em",
                                        lineHeight: 1,
                                    }}
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
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                flex: 1,
                                gap: "2px",
                                textDecoration: "none",
                                color: isActive
                                    ? "hsl(var(--primary))"
                                    : "hsl(var(--muted-foreground))",
                                transition: "all 0.2s ease",
                                transform: isActive ? "scale(1.05)" : "scale(1)",
                                opacity: isActive ? 1 : 0.8,
                            }}
                        >
                            <div
                                style={{
                                    padding: "6px",
                                    borderRadius: "10px",
                                    background: isActive
                                        ? "hsl(var(--primary) / 0.12)"
                                        : "transparent",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <Icon
                                    style={{
                                        width: "22px",
                                        height: "22px",
                                        strokeWidth: isActive ? 2.5 : 1.8,
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: isActive ? 700 : 500,
                                    letterSpacing: "0.02em",
                                    lineHeight: 1,
                                }}
                            >
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
