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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        <Shield className="h-3.5 w-3.5" /> Administrator
                    </span>
                );
            case "merchant":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        <Store className="h-3.5 w-3.5" /> Merchant / Organiser
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <UserCircle className="h-3.5 w-3.5" /> Verified Customer
                    </span>
                );
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="py-4 sm:py-8 lg:py-10 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full">
                
                {/* Page Title Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                        Account <span className="text-gradient">Profile</span>
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1 font-medium">
                        Manage your account settings, personal information, and quick shortcuts
                    </p>
                </div>

                {/* Main Profile Card */}
                <div className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-card space-y-8">
                    
                    {/* User Hero Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-5 sm:p-6 rounded-2xl border border-border/80 bg-gradient-to-r from-secondary/50 via-card to-secondary/30">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow shrink-0">
                                <User className="h-8 w-8 sm:h-10 sm:w-10" />
                            </div>
                            <div>
                                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">{user.name}</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Mail className="h-3.5 w-3.5 opacity-70" /> {user.email}
                                </p>
                            </div>
                        </div>
                        <div>
                            {getRoleBadge(user.role)}
                        </div>
                    </div>

                    {/* Personal Details Form Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <h3 className="font-display text-base font-bold text-foreground">Personal Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Name Field */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Display Name
                                </label>
                                {editing ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                                                placeholder="Enter your name"
                                                maxLength={NAME_MAX_LENGTH}
                                                className="flex-1 h-11 bg-secondary/50 border-border text-sm rounded-xl"
                                                disabled={loading}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleSave}
                                                disabled={loading || !name.trim()}
                                                className="bg-gradient-primary text-white h-11 px-4 rounded-xl shadow-glow"
                                            >
                                                <Save className="h-4 w-4 mr-1.5" /> Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleCancel}
                                                disabled={loading}
                                                className="h-11 px-3.5 rounded-xl border-border"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">{NAME_HINT}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-secondary/30">
                                        <span className="text-sm font-semibold text-foreground">{user.name}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditing(true)}
                                            className="h-8 px-3 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg"
                                        >
                                            <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Email Address
                                </label>
                                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-secondary/20 text-muted-foreground">
                                    <span className="text-sm font-medium">{user.email}</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        <CheckCircle className="h-3 w-3" /> Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Shortcuts & Rewards Grid */}
                    <div className="space-y-4 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-2 pb-1">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            <h3 className="font-display text-base font-bold text-foreground">Quick Shortcuts & Rewards</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Link
                                to="/customer-dashboard/wallet"
                                className="group p-4 rounded-2xl border border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-sm flex items-center gap-3.5"
                            >
                                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-extrabold text-foreground group-hover:text-emerald-500 transition-colors">My Wallet</h4>
                                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5 truncate">Balance: ₹{user?.walletBalance || 0}</p>
                                </div>
                            </Link>

                            <Link
                                to="/customer-dashboard/referral"
                                className="group p-4 rounded-2xl border border-border bg-card hover:border-pink-500/50 hover:bg-pink-500/5 transition-all shadow-sm flex items-center gap-3.5"
                            >
                                <div className="h-11 w-11 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <Gift className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-extrabold text-foreground group-hover:text-pink-500 transition-colors">Referrals & Rewards</h4>
                                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5 truncate">Invite & earn cash</p>
                                </div>
                            </Link>

                            <Link
                                to="/customer-dashboard/ai-recommendations"
                                className="group p-4 rounded-2xl border border-border bg-card hover:border-purple-500/50 hover:bg-purple-500/5 transition-all shadow-sm flex items-center gap-3.5"
                            >
                                <div className="h-11 w-11 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-extrabold text-foreground group-hover:text-purple-500 transition-colors">AI Picks</h4>
                                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5 truncate">Smart suggestions</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Account Stats & Overview Section */}
                    <div className="space-y-4 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-2 pb-1">
                            <Calendar className="h-5 w-5 text-indigo-500" />
                            <h3 className="font-display text-base font-bold text-foreground">Account Information</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl border border-border bg-secondary/20">
                                <span className="text-xs font-semibold text-muted-foreground block mb-1">Member Since</span>
                                <span className="text-sm font-bold text-foreground">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </span>
                            </div>

                            <div className="p-4 rounded-2xl border border-border bg-secondary/20">
                                <span className="text-xs font-semibold text-muted-foreground block mb-1">Last Profile Update</span>
                                <span className="text-sm font-bold text-foreground">
                                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sign Out Action Button */}
                    <div className="pt-6 border-t border-border/60 flex items-center justify-center sm:justify-end">
                        <Button
                            onClick={handleLogout}
                            variant="destructive"
                            className="w-full sm:w-auto h-12 px-6 rounded-2xl font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                        >
                            <LogOut className="h-4.5 w-4.5" /> Sign Out of Account
                        </Button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
