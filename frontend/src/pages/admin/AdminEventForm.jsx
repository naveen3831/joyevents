import { Calendar, ImageIcon, Loader2, AlertCircle, X, Clock, MapPin, DollarSign, Upload, Ticket, Plus, ArrowLeft } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { apiGetEventById, apiCreateEventWithImage, apiUpdateEventWithImage, apiListCategories, apiCreateCategory } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const EMPTY_FORM = {
    title: "", description: "", date: "", time: "", location: "", price: "", category: "General", status: "upcoming", maxAttendees: ""
};

const ALLOWED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const validateImage = (file) => {
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!validExtensions.includes(extension) && !ALLOWED_FORMATS.includes(file.type)) {
        return { isValid: false, error: "Only JPG, JPEG, PNG, and WEBP formats are allowed." };
    }
    if (file.size > MAX_SIZE_BYTES) {
        return { isValid: false, error: `Image size must not exceed ${MAX_SIZE_MB}MB.` };
    }
    return { isValid: true };
};

const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const AdminEventForm = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const { id: editingId } = useParams();
    const isEdit = Boolean(editingId);

    const [categories, setCategories] = useState([]);
    const [pageLoading, setPageLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [galleryPreviews, setGalleryPreviews] = useState([]);
    const [eventType, setEventType] = useState("fullService");
    const [ticketedType, setTicketedType] = useState(null);
    const [ticketTypes, setTicketTypes] = useState([]);
    const fileInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const [showNewCatInput, setShowNewCatInput] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [formErrors, setFormErrors] = useState({});
    const [ticketError, setTicketError] = useState("");
    const [creatingCat, setCreatingCat] = useState(false);

    const populateFromEvent = (ev) => {
        const dt = new Date(ev.datetime);
        setForm({
            title: ev.title || "",
            description: ev.description || "",
            date: dt.toISOString().slice(0, 10),
            time: dt.toTimeString().slice(0, 5),
            location: ev.location || "",
            price: String(ev.price || ""),
            category: ev.category || "General",
            status: ev.status || "upcoming",
            maxAttendees: String(ev.maxAttendees || "")
        });
        setImagePreview(imgSrc(ev.image));
        if (ev.eventType === "ticketed") {
            setEventType("ticketed");
            if (ev.hasMultipleSessions && ev.sessions) {
                setTicketedType("dayNight");
                setTicketTypes([
                    ...(ev.sessions.day?.tickets || []).map((t) => ({ name: t.type, price: String(t.price), available: String(t.available) })),
                    ...(ev.sessions.night?.tickets || []).map((t) => ({ name: t.type, price: String(t.price), available: String(t.available) }))
                ]);
            }
            else {
                setTicketedType("normal");
                setTicketTypes(ev.tickets?.map((t) => ({ name: t.type, price: String(t.price), available: String(t.available) })) || []);
            }
        }
        else {
            setEventType("fullService");
            setTicketedType(null);
            setTicketTypes([]);
        }
    };

    useEffect(() => {
        let cancelled = false;
        apiListCategories("event").then((res) => { if (!cancelled) setCategories((res.categories || []).map((c) => c.name)); }).catch(() => {});
        if (isEdit) {
            apiGetEventById(editingId)
                .then((res) => { if (!cancelled && res.event) populateFromEvent(res.event); })
                .catch((e) => { if (!cancelled) setLoadError(e?.message || "Failed to load event"); })
                .finally(() => { if (!cancelled) setPageLoading(false); });
        }
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingId]);

    const handleCreateCategory = async () => {
        const trimmed = newCatName.trim();
        if (!trimmed) {
            toast.error("Please enter a category name");
            return;
        }
        if (trimmed.length > 50) {
            toast.error("Category name cannot exceed 50 characters");
            return;
        }
        if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("Category already exists");
            return;
        }
        setCreatingCat(true);
        try {
            await apiCreateCategory(trimmed, "event", token);
            toast.success("Category created successfully!");
            setCategories((prev) => [...prev, trimmed]);
            setForm((prev) => ({ ...prev, category: trimmed }));
            setShowNewCatInput(false);
            setNewCatName("");
        }
        catch (e) {
            toast.error(e?.message || "Failed to create category");
        }
        finally {
            setCreatingCat(false);
        }
    };

    const handleGalleryUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            const validFiles = [];
            const validPreviews = [];
            for (const file of filesArray) {
                const validation = validateImage(file);
                if (!validation.isValid) {
                    toast.error(`${file.name}: ${validation.error}`);
                }
                else {
                    validFiles.push(file);
                    validPreviews.push(URL.createObjectURL(file));
                }
            }
            if (validFiles.length > 0) {
                setGalleryFiles((prev) => [...prev, ...validFiles].slice(0, 4));
                setGalleryPreviews((prev) => [...prev, ...validPreviews].slice(0, 4));
            }
            e.target.value = "";
        }
    };

    const removeGalleryImage = (index) => {
        setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
        setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token)
            return;
        setFormErrors({});
        setTicketError("");
        try {
            if (!form.title || !form.title.trim()) {
                setFormErrors({ title: "Event title is required" });
                toast.error("Event title is required");
                return;
            }
            if (form.title.length > 100) {
                setFormErrors({ title: "Event title cannot exceed 100 characters" });
                toast.error("Event title cannot exceed 100 characters");
                return;
            }
            if (!form.description || !form.description.trim()) {
                setFormErrors({ description: "Event description is required" });
                toast.error("Event description is required");
                return;
            }
            if (form.description.length > 1000) {
                setFormErrors({ description: "Event description cannot exceed 1000 characters" });
                toast.error("Event description cannot exceed 1000 characters");
                return;
            }
            if (!form.date) {
                toast.error("Event date is required");
                return;
            }
            if (form.date < getTodayString()) {
                toast.error("Event date cannot be in the past. Please select today or a future date.");
                return;
            }
            if (!form.time) {
                toast.error("Event time is required");
                return;
            }
            if (!form.location || !form.location.trim()) {
                setFormErrors({ location: "Event location is required" });
                toast.error("Event location is required");
                return;
            }
            if (form.location.length > 150) {
                setFormErrors({ location: "Event location cannot exceed 150 characters" });
                toast.error("Event location cannot exceed 150 characters");
                return;
            }
            if (form.category && form.category.length > 50) {
                setFormErrors({ category: "Category cannot exceed 50 characters" });
                toast.error("Category cannot exceed 50 characters");
                return;
            }
            if (eventType === "fullService") {
                if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 1) {
                    setFormErrors({ price: "Please enter a valid price (must be 1 or greater)" });
                    toast.error("Please enter a valid price (must be 1 or greater)");
                    return;
                }
                if (form.maxAttendees !== "" && (isNaN(Number(form.maxAttendees)) || Number(form.maxAttendees) < 0)) {
                    setFormErrors({ maxAttendees: "Max Attendees must be a valid number (0 or greater)" });
                    toast.error("Max Attendees must be a valid number (0 or greater)");
                    return;
                }
            }
            else {
                if (!ticketedType) {
                    setTicketError("Please select ticketed event type (Normal or Day/Night)");
                    toast.error("Please select ticketed event type (Normal or Day/Night)");
                    return;
                }
                if (ticketedType === "normal") {
                    const tiers = ["Silver", "Gold", "Diamond"];
                    for (let i = 0; i < 3; i++) {
                        const t = ticketTypes[i];
                        const name = tiers[i];
                        if (!t?.price || isNaN(Number(t.price)) || Number(t.price) < 1) {
                            setTicketError(`Please enter a valid price for the ${name} ticket tier (must be 1 or greater)`);
                            toast.error(`Please enter a valid price for the ${name} ticket tier (must be 1 or greater)`);
                            return;
                        }
                        if (!t?.available || isNaN(Number(t.available)) || Number(t.available) < 1) {
                            setTicketError(`Available quantity for the ${name} ticket tier must be at least 1`);
                            toast.error(`Available quantity for the ${name} ticket tier must be at least 1`);
                            return;
                        }
                    }
                }
                else if (ticketedType === "dayNight") {
                    const tiers = ["Silver", "Gold", "Diamond"];
                    for (let i = 0; i < 6; i++) {
                        const t = ticketTypes[i];
                        const name = tiers[i % 3];
                        const session = i < 3 ? "Day" : "Night";
                        if (!t?.price || isNaN(Number(t.price)) || Number(t.price) < 1) {
                            setTicketError(`Please enter a valid price for the ${session} session ${name} ticket tier (must be 1 or greater)`);
                            toast.error(`Please enter a valid price for the ${session} session ${name} ticket tier (must be 1 or greater)`);
                            return;
                        }
                        if (!t?.available || isNaN(Number(t.available)) || Number(t.available) < 1) {
                            setTicketError(`Available quantity for the ${session} session ${name} ticket tier must be at least 1`);
                            toast.error(`Available quantity for the ${session} session ${name} ticket tier must be at least 1`);
                            return;
                        }
                    }
                }
            }
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('description', form.description);
            formData.append('date', form.date);
            formData.append('time', form.time);
            formData.append('location', form.location);
            formData.append('category', form.category);
            formData.append('status', form.status);
            formData.append('eventType', eventType);
            if (eventType === "fullService") {
                formData.append('price', String(form.price));
                if (form.maxAttendees)
                    formData.append('maxAttendees', String(form.maxAttendees));
            }
            else {
                formData.append('price', '0');
                if (ticketedType === "normal") {
                    formData.append('hasMultipleSessions', 'false');
                    formData.append('tickets', JSON.stringify([
                        { type: 'silver', price: parseFloat(ticketTypes[0]?.price || '0'), available: parseInt(ticketTypes[0]?.available || '100') },
                        { type: 'gold', price: parseFloat(ticketTypes[1]?.price || '0'), available: parseInt(ticketTypes[1]?.available || '100') },
                        { type: 'diamond', price: parseFloat(ticketTypes[2]?.price || '0'), available: parseInt(ticketTypes[2]?.available || '100') }
                    ]));
                }
                else if (ticketedType === "dayNight") {
                    formData.append('hasMultipleSessions', 'true');
                    formData.append('sessions', JSON.stringify({
                        day: {
                            enabled: true,
                            time: "09:00 AM",
                            tickets: [
                                { type: 'silver', price: parseFloat(ticketTypes[0]?.price || '0'), available: parseInt(ticketTypes[0]?.available || '100') },
                                { type: 'gold', price: parseFloat(ticketTypes[1]?.price || '0'), available: parseInt(ticketTypes[1]?.available || '100') },
                                { type: 'diamond', price: parseFloat(ticketTypes[2]?.price || '0'), available: parseInt(ticketTypes[2]?.available || '100') }
                            ]
                        },
                        night: {
                            enabled: true,
                            time: "06:00 PM",
                            tickets: [
                                { type: 'silver', price: parseFloat(ticketTypes[3]?.price || '0'), available: parseInt(ticketTypes[3]?.available || '100') },
                                { type: 'gold', price: parseFloat(ticketTypes[4]?.price || '0'), available: parseInt(ticketTypes[4]?.available || '100') },
                                { type: 'diamond', price: parseFloat(ticketTypes[5]?.price || '0'), available: parseInt(ticketTypes[5]?.available || '100') }
                            ]
                        }
                    }));
                }
            }
            if (imageFile) {
                formData.append('image', imageFile);
            }
            galleryFiles.forEach((file) => {
                formData.append('gallery', file);
            });
            setSubmitting(true);
            if (isEdit) {
                await apiUpdateEventWithImage(editingId, formData, token);
                toast.success("Event updated successfully!");
                window.dispatchEvent(new CustomEvent('eventUpdated', { detail: { eventId: editingId } }));
                window.dispatchEvent(new CustomEvent('globalEventUpdate'));
            }
            else {
                await apiCreateEventWithImage(formData, token);
                toast.success("Event created successfully!");
                window.dispatchEvent(new CustomEvent('eventCreated'));
                window.dispatchEvent(new CustomEvent('globalEventUpdate'));
            }
            navigate("/admin-dashboard/my-events");
        }
        catch (err) {
            toast.error(err?.message || "Operation failed");
        }
        finally {
            setSubmitting(false);
        }
    };

    if (pageLoading) {
        return (<AdminLayout>
        <section className="py-2 sm:py-8 lg:py-10 flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin"/> Loading…
        </section>
      </AdminLayout>);
    }

    if (loadError) {
        return (<AdminLayout>
        <section className="py-2 sm:py-8 lg:py-10">
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
            {loadError}
          </div>
        </section>
      </AdminLayout>);
    }

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10 max-w-3xl mx-auto">
        <button onClick={() => navigate("/admin-dashboard/my-events")} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="h-4 w-4"/> Back to My Events
        </button>

        <h1 className="font-display text-xl sm:text-2xl font-bold mb-1">
          {isEdit ? "Edit Event" : "Create New Event"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isEdit ? "Update event details" : "Fill in the details to publish your event"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Event Cover Image (JPG, PNG, WEBP. Max 5MB)</Label>
            <div className="flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const validation = validateImage(file);
                if (!validation.isValid) {
                    toast.error(validation.error);
                    e.target.value = "";
                    return;
                }
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            }
        }} className="hidden"/>
              {imagePreview ? (<img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-xl"/>) : (<div className="text-center">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground"/>
                  <p className="mt-2 text-sm text-muted-foreground">Click to upload event cover image</p>
                </div>)}
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <Upload className="h-4 w-4"/>
              Gallery Images (Up to 4 images. JPG, PNG, WEBP. Max 5MB each)
            </Label>
            <div className="flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary" onClick={() => galleryInputRef.current?.click()}>
              <input ref={galleryInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleGalleryUpload} className="hidden"/>
              {galleryPreviews.length === 0 ? (<div className="text-center">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground"/>
                  <p className="mt-2 text-sm text-muted-foreground">Click to upload gallery images (max 4)</p>
                </div>) : (<div className="grid grid-cols-4 gap-2 p-2">
                  {galleryPreviews.map((preview, idx) => (<div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
                      <img src={preview} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover"/>
                      <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                        <X className="h-3 w-3"/>
                      </button>
                    </div>))}
                  {galleryPreviews.length < 4 && (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                      <Plus className="h-6 w-6"/>
                    </div>)}
                </div>)}
            </div>
            {galleryPreviews.length > 0 && (<p className="mt-2 text-xs text-muted-foreground">
                {galleryPreviews.length} / 4 images selected
              </p>)}
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label className="text-sm text-muted-foreground">Event Title</Label>
              <span className="text-xs text-muted-foreground">{(form.title || '').length}/100</span>
            </div>
            <Input value={form.title} onChange={(e) => {
            setForm({ ...form, title: e.target.value });
            if (formErrors.title)
                setFormErrors((prev) => ({ ...prev, title: "" }));
        }} placeholder="Enter event title" maxLength={100} required aria-invalid={Boolean(formErrors.title)}/>
            {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label className="text-sm text-muted-foreground">Description</Label>
              <span className="text-xs text-muted-foreground">{(form.description || '').length}/1000</span>
            </div>
            <Textarea value={form.description} onChange={(e) => {
            setForm({ ...form, description: e.target.value });
            if (formErrors.description)
                setFormErrors((prev) => ({ ...prev, description: "" }));
        }} placeholder="Describe your event..." rows={3} maxLength={1000} required aria-invalid={Boolean(formErrors.description)}/>
            {formErrors.description && <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>}
          </div>

          <div>
            <Label className="text-sm text-muted-foreground font-semibold mb-2 block">Event Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => {
            setEventType("fullService");
            setTicketTypes([]);
        }} className={`p-3 rounded-lg border-2 transition-all font-medium ${eventType === "fullService"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card hover:border-primary/50"}`}>
                <div className="text-lg">🎉</div>
                Single Ticket Event
              </button>
              <button type="button" onClick={() => {
            setEventType("ticketed");
            setTicketTypes([]);
        }} className={`p-3 rounded-lg border-2 transition-all font-medium ${eventType === "ticketed"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card hover:border-primary/50"}`}>
                <div className="text-lg">🎫</div>
                Ticketed Event
              </button>
            </div>
          </div>

          {eventType === "ticketed" && (<div>
              <Label className="text-sm text-muted-foreground font-semibold mb-2 block">Ticketed Event Type</Label>
              <select value={ticketedType || ""} onChange={(e) => {
                const value = e.target.value;
                setTicketedType(value || null);
                setTicketTypes([]);
            }} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
                <option value="">Select ticket type...</option>
                <option value="normal">🎫 Normal Tickets (Single Session)</option>
                <option value="dayNight">☀️🌙 Day/Night Sessions (Separate Sessions)</option>
              </select>
            </div>)}

          {eventType === "ticketed" && ticketedType === "normal" && (<div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Label className="text-sm text-muted-foreground font-semibold mb-3 block">
                🎫 Normal Tickets - Ticket Pricing & Availability
              </Label>
              <p className="text-xs text-muted-foreground mb-4">Set prices and available quantity for each ticket tier</p>
              <div className="grid gap-4">
                {["silver", "gold", "diamond"].map((tier, i) => (<div key={tier} className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3"/> {tier === "silver" ? "🥈 Silver" : tier === "gold" ? "🥇 Gold" : "💎 Diamond"} Price (₹)</Label>
                      <Input type="number" min="1" step="1" value={ticketTypes[i]?.price || ""} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[i])
                        updated[i] = { name: tier, price: "", available: "100" };
                    updated[i].price = e.target.value;
                    setTicketTypes(updated);
                }} placeholder="Price (min ₹1)" className="mt-1 bg-card border-border" required/>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Available Tickets</Label>
                      <Input type="number" min="1" value={ticketTypes[i]?.available || "100"} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[i])
                        updated[i] = { name: tier, price: "", available: "100" };
                    updated[i].available = e.target.value;
                    setTicketTypes(updated);
                }} placeholder="Quantity" className="mt-1 bg-card border-border" required/>
                    </div>
                  </div>))}
              </div>
            </div>)}
          {ticketError && (<p className="text-xs text-red-500 mt-2">{ticketError}</p>)}

          {eventType === "ticketed" && ticketedType === "dayNight" && (<div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Label className="text-sm text-muted-foreground font-semibold mb-3 block">
                ☀️🌙 Day & Night Sessions - Ticket Pricing & Availability
              </Label>
              <p className="text-xs text-muted-foreground mb-4">Set separate prices and quantities for day and night sessions</p>

              <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm font-semibold text-blue-600 mb-3">☀️ Day Session (09:00 AM)</p>
                <div className="grid gap-4">
                  {["silver", "gold", "diamond"].map((tier, i) => (<div key={tier} className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3"/> {tier === "silver" ? "🥈 Silver" : tier === "gold" ? "🥇 Gold" : "💎 Diamond"} Price (₹)</Label>
                        <Input type="number" min="1" step="1" value={ticketTypes[i]?.price || ""} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[i])
                        updated[i] = { name: tier, price: "", available: "100" };
                    updated[i].price = e.target.value;
                    setTicketTypes(updated);
                }} placeholder="Price (min ₹1)" className="mt-1 bg-card border-border" required/>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Available Tickets</Label>
                        <Input type="number" min="1" value={ticketTypes[i]?.available || "100"} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[i])
                        updated[i] = { name: tier, price: "", available: "100" };
                    updated[i].available = e.target.value;
                    setTicketTypes(updated);
                }} placeholder="Quantity" className="mt-1 bg-card border-border" required/>
                      </div>
                    </div>))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-sm font-semibold text-indigo-600 mb-3">🌙 Night Session (06:00 PM)</p>
                <div className="grid gap-4">
                  {["silver", "gold", "diamond"].map((tier, idx) => {
            const i = idx + 3;
            return (<div key={tier} className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3"/> {tier === "silver" ? "🥈 Silver" : tier === "gold" ? "🥇 Gold" : "💎 Diamond"} Price (₹)</Label>
                        <Input type="number" min="1" step="1" value={ticketTypes[i]?.price || ""} onChange={(e) => {
                        const updated = [...ticketTypes];
                        if (!updated[i])
                            updated[i] = { name: tier, price: "", available: "100" };
                        updated[i].price = e.target.value;
                        setTicketTypes(updated);
                    }} placeholder="Price (min ₹1)" className="mt-1 bg-card border-border" required/>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Available Tickets</Label>
                        <Input type="number" min="1" value={ticketTypes[i]?.available || "100"} onChange={(e) => {
                        const updated = [...ticketTypes];
                        if (!updated[i])
                            updated[i] = { name: tier, price: "", available: "100" };
                        updated[i].available = e.target.value;
                        setTicketTypes(updated);
                    }} placeholder="Quantity" className="mt-1 bg-card border-border" required/>
                      </div>
                    </div>);
        })}
                </div>
              </div>
            </div>)}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/> Date</Label>
              <Input type="date" value={form.date} min={getTodayString()} onChange={(e) => setForm({ ...form, date: e.target.value })} required/>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Time</Label>
              <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required/>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> Location</Label>
              <span className="text-xs text-muted-foreground">{(form.location || '').length}/150</span>
            </div>
            <Input value={form.location} onChange={(e) => {
            setForm({ ...form, location: e.target.value });
            if (formErrors.location)
                setFormErrors((prev) => ({ ...prev, location: "" }));
        }} placeholder="Event venue" maxLength={150} required aria-invalid={Boolean(formErrors.location)}/>
            {formErrors.location && <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {eventType === "fullService" && (<div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3"/> Price (₹)</Label>
                <Input type="number" min="1" step="1" value={form.price} onChange={(e) => {
                setForm({ ...form, price: e.target.value });
                if (formErrors.price)
                    setFormErrors((prev) => ({ ...prev, price: "" }));
            }} placeholder="1" required aria-invalid={Boolean(formErrors.price)}/>
                {formErrors.price && <p className="text-xs text-red-500 mt-1">{formErrors.price}</p>}
              </div>)}
            <div>
              <Label className="text-sm text-muted-foreground">Category</Label>
              <select value={form.category} onChange={(e) => {
            const val = e.target.value;
            if (val === "__new__") {
                setShowNewCatInput(true);
                setForm({ ...form, category: "" });
            }
            else {
                setForm({ ...form, category: val });
                setShowNewCatInput(false);
            }
            if (formErrors.category)
                setFormErrors((prev) => ({ ...prev, category: "" }));
        }} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground" required>
                <option value="">Select category...</option>
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                <option value="__new__" className="text-primary font-semibold">+ Create New Category</option>
              </select>

              {showNewCatInput && (<div className="mt-2 flex gap-2">
                  <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New category name" maxLength={50} className="flex-1"/>
                  <Button type="button" onClick={handleCreateCategory} disabled={creatingCat} size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground">
                    {creatingCat ? <Loader2 className="h-4 w-4 animate-spin"/> : "Add"}
                  </Button>
                  <Button type="button" onClick={() => {
                setShowNewCatInput(false);
                setNewCatName("");
                setForm({ ...form, category: categories[0] || "General" });
            }} variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>)}
            </div>
          </div>

          {eventType === "fullService" && (<div>
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                👥 Max Attendees <span className="text-xs text-muted-foreground ml-1">(0 = unlimited)</span>
              </Label>
              <Input type="number" min="0" step="1" max="9999" value={form.maxAttendees} onChange={(e) => {
                setForm({ ...form, maxAttendees: e.target.value });
                if (formErrors.maxAttendees)
                    setFormErrors((prev) => ({ ...prev, maxAttendees: "" }));
            }} placeholder="e.g. 100 (leave 0 for unlimited)"/>
              {formErrors.maxAttendees && <p className="text-xs text-red-500 mt-1">{formErrors.maxAttendees}</p>}
            </div>)}

          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90" size="lg">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
              {isEdit ? "Update Event" : "Create Event"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admin-dashboard/my-events")} size="lg">
              Cancel
            </Button>
          </div>
        </form>
      </section>
    </AdminLayout>);
};

export default AdminEventForm;
