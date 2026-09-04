import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Save,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListUsers, apiUpdateUser, apiResetPassword } from "@/lib/api";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  validateEmail,
  validateNewPasswordForm,
  validateMobileNumber,
  formatMobileForApi,
  formatMobileForInput,
  EMAIL_HINT,
  PASSWORD_HINT,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "@/lib/validation";

const AdminUserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const [formState, setFormState] = useState({
    name: "",
    email: "",
    mobile: "",
    role: "customer",
    status: "active",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const res = await apiListUsers(token);
        const found = (res.users || []).find((u) => u._id === id || u.id === id);
        if (found) {
          setUser(found);
          setFormState({
            name: found.name || "",
            email: found.email || "",
            mobile: formatMobileForInput(found.mobile || ""),
            role: found.role || "customer",
            status: found.status || "active",
            password: "",
          });
        } else {
          setError("User not found.");
        }
      } catch (err) {
        setError(err?.message || "Failed to load user details");
        toast.error(err?.message || "Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !user) {
      toast.error("Authentication required");
      return;
    }

    const emailErr = validateEmail(formState.email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }

    if (formState.mobile) {
      const mobErr = validateMobileNumber(formState.mobile, formState.role === "merchant");
      if (mobErr) {
        toast.error(mobErr);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const updateData = {
        name: formState.name,
        email: formState.email,
        role: formState.role,
        status: formState.status,
        mobile: formatMobileForApi(formState.mobile),
      };

      if (formState.password && formState.password.trim() !== "") {
        const pwdErr = validateNewPasswordForm(formState.password);
        if (pwdErr) {
          toast.error(pwdErr);
          setIsSubmitting(false);
          return;
        }
        await apiResetPassword(user._id, formState.password, token);
      }

      await apiUpdateUser(user._id, updateData, token);
      toast.success("User profile updated successfully!");
      navigate(`/admin-dashboard/users/${user._id}`);
    } catch (err) {
      toast.error(err?.message || "Failed to update user profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[1050px] mx-auto space-y-4 font-sans">
        <PageHeader
          title="Edit User Profile"
          subtitle="Modify user privileges, profile details, or security credentials."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "User Management", to: "/admin-dashboard/users" },
            { label: user ? user.name : "User Details", to: `/admin-dashboard/users/${id}` },
            { label: "Edit Profile" },
          ]}
          className="!mb-4"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin-dashboard/users/${id}`)}
              className="h-9 text-xs font-semibold rounded-md gap-1.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back to User Details
            </Button>
          }
        />

        {loading ? (
          <div className="bg-card border border-border/80 rounded-xl p-16 flex items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading user details...
          </div>
        ) : error || !user ? (
          <div className="bg-card border border-border/80 rounded-xl p-12 text-center text-muted-foreground shadow-xs">
            <AlertCircle className="mx-auto mb-2.5 h-9 w-9 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground mb-1">{error || "User Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The user profile you are trying to edit does not exist or has been deleted.
            </p>
            <Button
              onClick={() => navigate("/admin-dashboard/users")}
              className="h-9 text-xs font-semibold bg-primary text-primary-foreground rounded-md"
            >
              Return to Users & Merchants
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-xl shadow-sm p-5 sm:p-[28px] md:p-[32px] w-full"
          >
            {/* Header section */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    Edit Profile - {user.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Update information or reset password for ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{user._id}</code>
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name *
                  </Label>
                  <Input
                    maxLength={NAME_MAX_LENGTH}
                    required
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: sanitizeNameInput(e.target.value) })
                    }
                    placeholder="Enter user full name"
                    className="h-[42px] text-xs rounded-lg w-full"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address *
                  </Label>
                  <Input
                    type="text"
                    inputMode="email"
                    maxLength={EMAIL_MAX_LENGTH}
                    required
                    value={formState.email}
                    onChange={(e) =>
                      setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })
                    }
                    placeholder="name@example.com"
                    className="h-[42px] text-xs rounded-lg w-full"
                  />
                  <p className="text-[11px] text-muted-foreground">{EMAIL_HINT}</p>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Mobile Number (Optional)
                  </Label>
                  <Input
                    type="text"
                    maxLength={12}
                    value={formState.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setFormState({ ...formState, mobile: val });
                    }}
                    placeholder="Enter 10-12 digit mobile number"
                    className="h-[42px] text-xs rounded-lg w-full"
                  />
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" /> User Role *
                  </Label>
                  <Select
                    value={formState.role}
                    onValueChange={(val) => setFormState({ ...formState, role: val })}
                  >
                    <SelectTrigger className="h-[42px] text-xs rounded-lg w-full">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="merchant">Merchant</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" /> Account Status *
                  </Label>
                  <Select
                    value={formState.status}
                    onValueChange={(val) => setFormState({ ...formState, status: val })}
                  >
                    <SelectTrigger className="h-[42px] text-xs rounded-lg w-full">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* New Password (Optional) */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" /> New Password (Optional)
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      maxLength={30}
                      value={formState.password}
                      onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                      placeholder="Leave empty to keep current password"
                      className="h-[42px] text-xs rounded-lg w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{PASSWORD_HINT}</p>
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin-dashboard/users/${user._id}`)}
                  className="h-10 px-5 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUserEdit;
