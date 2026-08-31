import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Calendar, MapPin, IndianRupee, FileText, Users, ArrowLeft, Loader2, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateCustomServiceRequest } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function RequestCustomServicePage() {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    serviceTitle: "",
    category: "General",
    eventDate: "",
    location: "",
    budget: "",
    quantity: "1",
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn || !token) {
      toast.error("Please login to submit a custom service enquiry.");
      return;
    }

    if (!form.serviceTitle.trim() || !form.eventDate || !form.location.trim() || !form.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      await apiCreateCustomServiceRequest(
        {
          serviceTitle: form.serviceTitle,
          category: form.category,
          eventDate: form.eventDate,
          location: form.location,
          budget: form.budget ? Number(form.budget) : 0,
          quantity: form.quantity ? Number(form.quantity) : 1,
          description: form.description
        },
        token
      );

      toast.success("✨ Custom service enquiry submitted! Admin will review and send a quotation soon.");
      queryClient.invalidateQueries({ queryKey: ["custom-service-requests"] });
      navigate("/customer-dashboard/bookings?tab=custom");
    } catch (err) {
      toast.error(err?.message || "Failed to submit custom service enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <section className="pt-1 sm:pt-2 pb-8 max-w-3xl lg:max-w-4xl w-full space-y-4 sm:space-y-5">
        {/* Navigation & Page Header */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate("/customer-dashboard/bookings")}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Bookings
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Request a <span className="text-gradient">Custom Service</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-normal leading-relaxed">
                Can't find the exact service on Eventoza? Tell us what you need, and our admin team will send you a custom quotation!
              </p>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-4.5">
            {/* Service Title (Full Width) */}
            <div className="md:col-span-2">
              <Label htmlFor="serviceTitle" className="text-xs sm:text-sm font-semibold text-foreground mb-2 block">
                Service Name / Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serviceTitle"
                placeholder="e.g., Aerial Drone Videography & Fireworks Display"
                required
                maxLength={100}
                className="h-[46px] rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                value={form.serviceTitle}
                onChange={(e) => setForm({ ...form, serviceTitle: e.target.value })}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-primary" /> Category
              </Label>
              <select
                id="category"
                className="h-[46px] w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="Birthday">Birthday</option>
                <option value="Wedding">Wedding</option>
                <option value="Corporate">Corporate</option>
                <option value="Concert">Concert / Musical</option>
                <option value="Anniversary">Anniversary</option>
                <option value="General">General / Other</option>
              </select>
            </div>

            {/* Event Date */}
            <div>
              <Label htmlFor="eventDate" className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" /> Event Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="eventDate"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                className="h-[46px] rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
            </div>

            {/* Location / City */}
            <div>
              <Label htmlFor="location" className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> Location / City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                placeholder="e.g., Grand Hyatt, Mumbai"
                required
                className="h-[46px] rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            {/* Count / Quantity */}
            <div>
              <Label htmlFor="quantity" className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Count / Quantity
              </Label>
              <Input
                id="quantity"
                type="text"
                placeholder="e.g., 1 or 150 guests"
                className="h-[46px] rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                value={form.quantity}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, quantity: val.slice(0, 5) });
                }}
              />
            </div>

            {/* Budget (Optional) */}
            <div className="md:col-span-2">
              <Label htmlFor="budget" className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-primary" /> Budget in ₹ (Optional)
              </Label>
              <Input
                id="budget"
                type="text"
                placeholder="e.g., 25000"
                className="h-[46px] rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                value={form.budget}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, budget: val.slice(0, 8) });
                }}
              />
            </div>

            {/* Detailed Requirements */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="description" className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Detailed Requirements <span className="text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">{(form.description || '').length}/1000</span>
              </div>
              <Textarea
                id="description"
                rows={4}
                placeholder="Describe your special requirements, team size, duration, style, or specific equipment needed..."
                required
                maxLength={1000}
                className="rounded-xl bg-background border-border focus:ring-2 focus:ring-primary min-h-[100px] resize-y text-sm p-3"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-3.5 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-[44px] px-5 rounded-xl font-semibold border-border hover:bg-secondary text-sm"
              onClick={() => navigate("/customer-dashboard/bookings")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-[44px] px-7 rounded-xl font-semibold text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting Request...
                </>
              ) : (
                "Submit Custom Enquiry"
              )}
            </Button>
          </div>
        </form>
      </section>
    </CustomerLayout>
  );
}
