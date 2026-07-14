import { motion } from "framer-motion";
import { User, Edit2, Save, X, Shield, Store, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";
import { sanitizeNameInput, validateName, NAME_MAX_LENGTH, NAME_HINT } from "@/lib/validation";
const Profile = () => {
    const { user, token, updateUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
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
            }
            catch {
                throw new Error('Invalid response from server');
            }
            if (!res.ok) {
                throw new Error(data?.error || "Failed to update profile");
            }
            updateUser(data.user);
            setEditing(false);
            toast.success("Profile updated successfully!");
        }
        catch (e) {
            toast.error(e?.message || "Failed to update profile");
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancel = () => {
        setName(user?.name || "");
        setEditing(false);
    };
    const getRoleIcon = (role) => {
        switch (role) {
            case "admin":
                return <Shield className="h-5 w-5 text-red-400"/>;
            case "merchant":
                return <Store className="h-5 w-5 text-blue-400"/>;
            default:
                return <UserCircle className="h-5 w-5 text-green-400"/>;
        }
    };
    const getRoleColor = (role) => {
        switch (role) {
            case "admin":
                return "bg-red-500/15 text-red-400 border border-red-500/30";
            case "merchant":
                return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
            default:
                return "bg-green-500/15 text-green-400 border border-green-500/30";
        }
    };
    if (!user) {
        return (<div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>);
    }
    return (<div className="py-2 sm:py-8 lg:py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">
            My <span className="text-gradient">Profile</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your personal information
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
              <User className="h-8 w-8"/>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <div className="flex items-center gap-3">
                {editing ? (<>
                    <Input value={name} onChange={(e) => setName(sanitizeNameInput(e.target.value))} placeholder="Enter your name" maxLength={NAME_MAX_LENGTH} className="flex-1" disabled={loading}/>
                    <p className="mt-1 text-xs text-muted-foreground">{NAME_HINT}</p>
                    <Button size="sm" onClick={handleSave} disabled={loading || !name.trim()} className="bg-green-600 hover:bg-green-700">
                      <Save className="h-4 w-4"/>
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
                      <X className="h-4 w-4"/>
                    </Button>
                  </>) : (<>
                    <div className="flex-1 px-3 py-2 rounded-md border border-border bg-secondary/50 text-foreground">
                      {user.name}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Edit2 className="h-4 w-4"/>
                    </Button>
                  </>)}
              </div>
            </div>

            {/* Email Field (Read-only) */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="px-3 py-2 rounded-md border border-border bg-secondary/30 text-muted-foreground">
                {user.email}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Role Field (Read-only) */}
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getRoleIcon(user.role)}
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${getRoleColor(user.role)}`}>
                    {user.role === "user" ? "customer" : user.role}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Role cannot be changed
              </p>
            </div>

            {/* Account Info */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-medium mb-3">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Member since:</span>
                  <div className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last updated:</span>
                  <div className="font-medium">
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>);
};
export default Profile;
