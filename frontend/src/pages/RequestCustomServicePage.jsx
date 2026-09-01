import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Calendar, MapPin, IndianRupee, FileText, Users, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateCustomServiceRequest } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import LocationAutocomplete from "@/components/LocationAutocomplete";

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
      navigate("/login");
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
          serviceTitle: form.serviceTitle.trim(),
          category: form.category,
          eventDate: form.eventDate,
          location: form.location.trim(),
          budget: form.budget ? Number(form.budget) : 0,
          quantity: form.quantity ? Number(form.quantity) : 1,
          description: form.description.trim()
        },
        token
      );

      toast.success("✨ Custom service enquiry submitted! Admin will review and send a quotation soon.");
      queryClient.invalidateQueries({ queryKey: ["custom-service-requests"] });
      navigate("/customer-dashboard/my-requests?tab=custom");
    } catch (err) {
      toast.error(err?.message || "Failed to submit custom service enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-[980px] mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-5">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              Request a Custom Service
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Can't find what you're looking for? Describe your custom requirements and our team will provide a tailored quotation.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/customer-dashboard/browse-services")}
            className="self-start sm:self-center h-9 px-3.5 text-xs font-semibold rounded-xl border-border hover:bg-secondary shrink-0 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Services
          </Button>
        </div>

        {/* Compact Form Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
            {/* Service Title */}
            <div className="space-y-1.5">
              <Label htmlFor="serviceTitle" className="font-semibold text-xs text-foreground/90 flex items-center gap-1">
                Service Name / Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serviceTitle"
                placeholder="e.g., Drone Videography & Aerial Fireworks Display"
                required
                maxLength={100}
                className="h-11 rounded-xl text-sm bg-background border-border"
                value={form.serviceTitle}
                onChange={(e) => setForm({ ...form, serviceTitle: e.target.value })}
              />
            </div>

            {/* Category & Event Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="font-semibold text-xs text-foreground/90">Category</Label>
                <select
                  id="category"
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

              <div className="space-y-1.5">
                <Label htmlFor="eventDate" className="font-semibold text-xs text-foreground/90 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Event Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="eventDate"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="h-11 rounded-xl text-sm bg-background border-border"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
            </div>

            {/* Location, Quantity, Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="location" className="font-semibold text-xs text-foreground/90 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Location / City <span className="text-destructive">*</span>
                </Label>
                <LocationAutocomplete
                  id="location"
                  placeholder="e.g., Grand Hyatt, Mumbai"
                  required
                  inputClassName="h-11 rounded-xl bg-background border-border text-sm"
                  value={form.location}
                  onChange={(val) => setForm((prev) => ({ ...prev, location: val }))}
                  onSelect={(payload) => {
                    if (payload?.address) {
                      setForm((prev) => ({ ...prev, location: payload.address }));
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="font-semibold text-xs text-foreground/90 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Quantity / Count
                </Label>
                <Input
                  id="quantity"
                  type="text"
                  placeholder="e.g., 1 or 150 guests"
                  className="h-11 rounded-xl text-sm bg-background border-border"
                  value={form.quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setForm({ ...form, quantity: val.slice(0, 5) });
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget" className="font-semibold text-xs text-foreground/90 flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-primary" /> Budget in ₹ (Optional)
                </Label>
                <Input
                  id="budget"
                  type="text"
                  placeholder="e.g., 25000"
                  className="h-11 rounded-xl text-sm bg-background border-border"
                  value={form.budget}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setForm({ ...form, budget: val.slice(0, 8) });
                  }}
                />
              </div>
            </div>

            {/* Detailed Requirements */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="description" className="font-semibold text-xs text-foreground/90 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Detailed Requirements <span className="text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">{form.description.length}/1000</span>
              </div>
              <Textarea
                id="description"
                rows={4}
                placeholder="Describe your special requirements, team size, duration, style, or specific equipment needed..."
                required
                maxLength={1000}
                className="text-sm min-h-[110px] sm:min-h-[120px] max-h-[220px] bg-background border-border rounded-xl resize-y"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 sm:pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={submitting}
                className="w-full sm:w-auto h-10 sm:h-11 px-5 rounded-xl text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto h-10 sm:h-11 px-7 bg-gradient-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting Request..." : "Submit Custom Enquiry"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </CustomerLayout>
  );
}