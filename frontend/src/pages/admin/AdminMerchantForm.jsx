import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Mail, Phone, Lock, User, CheckCircle2, Eye, EyeOff } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiCreateUser } from "@/lib/api";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizeMobileInput,
  formatMobileForApi,
  validateMobileNumber,
  validateEmail,
  validateSignupForm,
  EMAIL_HINT,
  PASSWORD_HINT,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "@/lib/validation";

const AdminMerchantForm = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
  });
  const [mobileError, setMobileError] = useState("");
  const [touchedMobile, setTouchedMobile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    const emailErr = validateEmail(formState.email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }

    const mobErr = validateMobileNumber(formState.mobile, true);
    if (mobErr) {
      setMobileError(mobErr);
      setTouchedMobile(true);
      toast.error(mobErr);
      return;
    }

    const signupErr = validateSignupForm(formState.email, formState.password, {
      name: formState.name,
    });
    if (signupErr) {
      toast.error(signupErr);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiCreateUser(
        {
          name: formState.name,
          email: formState.email,
          password: formState.password,
          role: "merchant",
          mobile: formatMobileForApi(formState.mobile),
        },
        token
      );
      toast.success("Merchant account created successfully!");
      navigate("/admin-dashboard/users?role=merchant");
    } catch (err) {
      toast.error(err?.message || "Failed to create merchant account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[1050px] mx-auto">
        <PageHeader
          title="Add New Merchant"
          subtitle="Create a new merchant account to onboard vendor partners onto the platform."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "User Management", to: "/admin-dashboard/users" },
            { label: "Merchants", to: "/admin-dashboard/users?role=merchant" },
            { label: "Add Merchant" },
          ]}
          className="!mb-5"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin-dashboard/users?role=merchant")}
              className="h-9 text-xs font-semibold rounded-md gap-1.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Merchants
            </Button>
          }
        />

        <div className="bg-card border border-border/80 rounded-xl shadow-sm p-5 sm:p-[28px] md:p-[32px] w-full max-w-[1050px] mx-auto">
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-border/60">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-sans">
                Merchant Account Details
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter credentials and contact info for the new merchant.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-[18px]">
            {/* Full Name */}
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-[6px]">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name *
              </Label>
              <Input
                maxLength={NAME_MAX_LENGTH}
                required
                value={formState.name}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    name: sanitizeNameInput(e.target.value),
                  })
                }
                placeholder="Enter full legal name"
                className="h-[46px] min-h-[46px] text-xs rounded-lg w-full"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-[6px]">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Mobile Number *
              </Label>
              <div className="relative flex items-center">
                <div className="absolute left-0 top-0 bottom-0 px-3 flex items-center justify-center bg-muted/60 border-r border-border text-foreground font-bold text-xs rounded-l-lg pointer-events-none select-none">
                  +91
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={formState.mobile}
                  onChange={(e) => {
                    const clean = sanitizeMobileInput(e.target.value);
                    setFormState({ ...formState, mobile: clean });
                    if (touchedMobile) {
                      const err = validateMobileNumber(clean, true);
                      setMobileError(err);
                    }
                  }}
                  onBlur={() => {
                    setTouchedMobile(true);
                    const err = validateMobileNumber(formState.mobile, true);
                    setMobileError(err);
                  }}
                  placeholder="9876543210"
                  className={`h-[46px] min-h-[46px] text-xs rounded-lg w-full pl-14 ${
                    mobileError ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                />
              </div>
              {mobileError ? (
                <p className="text-[11px] text-destructive font-medium mt-[5px]">
                  {mobileError}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground font-medium mt-[5px]">
                  Enter a 10-digit mobile number
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-[6px]">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address *
              </Label>
              <Input
                type="text"
                inputMode="email"
                maxLength={EMAIL_MAX_LENGTH}
                required
                value={formState.email}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    email: sanitizeEmailInput(e.target.value),
                  })
                }
                placeholder="e.g. merchant@example.com"
                className="h-[46px] min-h-[46px] text-xs rounded-lg w-full"
              />
              <p className="text-[11px] text-muted-foreground font-medium mt-[5px]">{EMAIL_HINT}</p>
            </div>

            {/* Password */}
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-[6px]">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password *
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  maxLength={30}
                  required
                  value={formState.password}
                  onChange={(e) =>
                    setFormState({ ...formState, password: e.target.value })
                  }
                  placeholder="Enter secure initial password"
                  className="h-[46px] min-h-[46px] text-xs rounded-lg w-full pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-[5px]">{PASSWORD_HINT}</p>
            </div>

            {/* Form Footer Actions */}
            <div className="pt-4 mt-6 border-t border-border/60 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin-dashboard/users?role=merchant")}
                className="h-[44px] text-xs font-semibold px-5 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-[44px] text-xs font-semibold px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm gap-2"
              >
                {isSubmitting ? (
                  "Creating Account..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Create Merchant Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMerchantForm;
