import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Calendar, MapPin, DollarSign, FileText, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateCustomServiceRequest } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function RequestCustomServiceModal({ open, onOpenChange, onSuccess }) {
  const { token, isLoggedIn } = useAuth();
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
      const res = await apiCreateCustomServiceRequest(
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

      setForm({
        serviceTitle: "",
        category: "General",
        eventDate: "",
        location: "",
        budget: "",
        quantity: "1",
        description: ""
      });

      onOpenChange(false);
      if (onSuccess) onSuccess(res.request);
    } catch (err) {
      toast.error(err?.message || "Failed to submit custom service enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-display font-bold">
            <Sparkles className="h-5 w-5 text-primary shrink-0 animate-pulse" />
            Request a Custom Service
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Can't find the exact service on Eventoza? Tell us what you need, and our admin team will send you a custom quotation!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {/* Service Title */}
          <div className="space-y-1">
            <Label htmlFor="serviceTitle" className="font-semibold text-xs">
              Service Name / Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="serviceTitle"
              placeholder="e.g., Aerial Drone Videography & Fireworks Display"
              required
              maxLength={100}
              className="h-10 text-sm"
              value={form.serviceTitle}
              onChange={(e) => setForm({ ...form, serviceTitle: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Category */}
            <div className="space-y-1">
              <Label htmlFor="category" className="font-semibold text-xs">Category</Label>
              <select
                id="category"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
            <div className="space-y-1">
              <Label htmlFor="eventDate" className="font-semibold text-xs flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Event Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="eventDate"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                className="h-10 text-sm"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Location */}
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="location" className="font-semibold text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location / City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                placeholder="e.g., Grand Hyatt, Mumbai"
                required
                className="h-10 text-sm"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            {/* Quantity / Guest Count */}
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="quantity" className="font-semibold text-xs flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" /> Count / Quantity
              </Label>
              <Input
                id="quantity"
                type="text"
                placeholder="e.g., 1 or 150 guests"
                className="h-10 text-sm"
                value={form.quantity}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, quantity: val.slice(0, 5) });
                }}
              />
            </div>

            {/* Budget */}
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="budget" className="font-semibold text-xs flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Budget (Optional)
              </Label>
              <Input
                id="budget"
                type="text"
                placeholder="e.g., 25000"
                className="h-10 text-sm"
                value={form.budget}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, budget: val.slice(0, 8) });
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description" className="font-semibold text-xs flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Detailed Requirements <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Describe your special requirements, team size, duration, style, or specific equipment needed..."
              required
              maxLength={1000}
              className="text-sm min-h-[90px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="w-full sm:w-auto h-10">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto h-10 bg-gradient-primary text-primary-foreground font-semibold">
              {submitting ? "Submitting Request..." : "Submit Custom Enquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
