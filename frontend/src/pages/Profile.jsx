import { motion } from "framer-motion";
import { User, Edit2, Save, X, Shield, Store, UserCircle, Wallet, Gift, Sparkles, Calendar, ShieldCheck, Mail, CheckCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";
import { sanitizeNameInput, validateName, NAME_MAX_LENGTH, NAME_HINT } from "@/lib/validation";
import { Link, useNavigate } from "react-router-dom";
import { clearSession } from "@/lib/session";

const Profile = () => {
    const { user, token, updateUser, setIsLoggedIn, setToken, setUser } = useAuth();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogout = () => {
        if (!window.confirm("Are you sure you want to sign out?")) return;
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
        toast.success("Signed out successfully");
        navigate("/login", { replace: true });
    };

    useEffect(() => {
        if (user) {
            setName(user.name || "");
        }
    }, [user]);

    const handleSave = async () => {
        const sanitizedName = sanitizeNameInput(name);
        if (!sanitizedName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }
        const validationError = validateName(sanitizedName);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setLoading(true);
        try {
            setName(sanitizedName);
            const res = await fetch(`${API_URL}/api/auth/profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: name.trim() })
            });
            const responseText = await res.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error('Invalid response from server');
            }
            if (!res.ok) {
                throw new Error(data?.error || "Failed to update profile");
            }
            updateUser(data.user);
            setEditing(false);
            toast.success("Profile updated successfully!");
        } catch (e) {
            toast.error(e?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setName(user?.name || "");
        setEditing(false);
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case "admin":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                        <Shield className="h-3.5 w-3.5" /> Administrator
                    </span>
                );
            case "merchant":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        <Store className="h-3.5 w-3.5" /> Merchant / Organiser
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <UserCircle className="h-3.5 w-3.5" /> Verified Customer
                    </span>
                );
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[300px] text-xs text-muted-foreground">
                Loading profile...
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 font-sans">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full space-y-5">
                
                {/* Page Title Header (Solid dark title, compact line spacing) */}
                <div className="mb-4">
                    <h1 className="font-semibold text-2xl sm:text-3xl text-foreground tracking-tight">
                        Account Profile
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        Manage your account information and preferences.
                    </p>
                </div>

                {/* Main Compact Outer Card */}
                <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-5">
                    
                    {/* Compact Profile Summary Banner (Height ~100px-115px) */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-lg border border-border/80 bg-slate-50/80 dark:bg-slate-900/60 min-h-[100px]">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                                {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-semibold text-lg text-foreground leading-tight truncate">{user.name}</h2>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                    <span>{user.email}</span>
                                </p>
                            </div>
                        </div>
                        <div>
                            {getRoleBadge(user.role)}
                        </div>
                    </div>

                    {/* Personal Details Form Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                            <h3 className="font-semibold text-base text-foreground">Personal Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Display Name Field */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Display Name
                                </label>
                                {editing ? (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                                                placeholder="Enter your name"
                                                maxLength={NAME_MAX_LENGTH}
                                                className="flex-1 h-10 bg-background border-border text-xs rounded-md"
                                                disabled={loading}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleSave}
                                                disabled={loading || !name.trim()}
                                                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-3.5 text-xs font-semibold rounded-md"
                                            >
                                                <Save className="h-3.5 w-3.5 mr-1" /> Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleCancel}
                                                disabled={loading}
                                                className="h-10 px-3 rounded-md border-border"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{NAME_HINT}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-border/80 bg-muted/20 h-11">
                                        <span className="text-xs font-semibold text-foreground truncate">{user.name}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditing(true)}
                                            className="h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-md shrink-0"
                                        >
                                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Email Field */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Email Address
                                </label>
                                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-border/80 bg-muted/20 h-11">
                                    <span className="text-xs font-medium text-foreground truncate">{user.email}</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
                                        <CheckCircle className="h-3 w-3" /> Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Shortcuts & Rewards Grid */}
                    <div className="space-y-3.5 pt-4 border-t border-border/60">
                        <div className="flex items-center gap-2 pb-0.5">
                            <Sparkles className="h-4.5 w-4.5 text-purple-500" />
                            <h3 className="font-semibold text-base text-foreground">Quick Shortcuts & Rewards</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <Link
                                to={
                                    user?.role === "admin" ? "/admin-dashboard/payments" :
                                    user?.role === "merchant" ? "/merchant-dashboard/earnings" :
                                    "/customer-dashboard/wallet"
                                }
                                className="group p-3.5 rounded-lg border border-border/70 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-xs flex items-center gap-3"
                            >
                                <div className="h-10 w-10 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <Wallet className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors truncate">
                                        {user?.role === "admin" ? "Payments & Wallet" : user?.role === "merchant" ? "Earnings & Wallet" : "My Wallet"}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                                        {user?.role === "customer" ? `Balance: ₹${user?.walletBalance || 0}` : "View financial transactions"}
                                    </p>
                                </div>
                            </Link>

                            <Link
                                to={
                                    user?.role === "admin" ? "/admin-dashboard/referrals" :
                                    user?.role === "merchant" ? "/merchant-dashboard/referrals" :
                                    "/customer-dashboard/referral"
                                }
                                className="group p-3.5 rounded-lg border border-border/70 bg-card hover:border-pink-500/50 hover:bg-pink-500/5 transition-all shadow-xs flex items-center gap-3"
                            >
                                <div className="h-10 w-10 rounded-md bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <Gift className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-pink-600 transition-colors truncate">Referrals & Rewards</h4>
                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">Invite & reward programs</p>
                                </div>
                            </Link>

                            <Link
                                to={
                                    user?.role === "admin" ? "/admin-dashboard/ai-recommendations" :
                                    user?.role === "merchant" ? "/merchant-dashboard/ai-recommendations" :
                                    "/customer-dashboard/ai-recommendations"
                                }
                                className="group p-3.5 rounded-lg border border-border/70 bg-card hover:border-purple-500/50 hover:bg-purple-500/5 transition-all shadow-xs flex items-center gap-3"
                            >
                                <div className="h-10 w-10 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <Sparkles className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-purple-600 transition-colors truncate">AI Picks</h4>
                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">Smart recommendations</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Account Information & Logout Bar */}
                    <div className="space-y-3.5 pt-4 border-t border-border/60">
                        <div className="flex items-center gap-2 pb-0.5">
                            <Calendar className="h-4.5 w-4.5 text-indigo-500" />
                            <h3 className="font-semibold text-base text-foreground">Account Information</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 flex justify-between items-center text-xs">
                                <span className="font-medium text-muted-foreground">Member Since</span>
                                <span className="font-semibold text-foreground">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 flex justify-between items-center text-xs">
                                <span className="font-medium text-muted-foreground">Last Profile Update</span>
                                <span className="font-semibold text-foreground">
                                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sign Out Action Button */}
                    <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground hidden sm:inline">Signed in as <strong className="text-foreground">{user.email}</strong></span>
                        <Button
                            onClick={handleLogout}
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto h-9 px-4 rounded-md font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <LogOut className="h-3.5 w-3.5" /> Sign Out
                        </Button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
