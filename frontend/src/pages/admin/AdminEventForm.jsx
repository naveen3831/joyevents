import { Calendar, ImageIcon, Loader2, AlertCircle, X, Clock, MapPin, IndianRupee, Upload, Ticket, Plus, ArrowLeft, Sparkles, FileText, Tag, Users, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import MerchantLayout from "@/components/MerchantLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiGetEventById, apiCreateEventWithImage, apiUpdateEventWithImage, apiListCategories, apiCreateCategory } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import EventDurationSchedulePicker from "@/components/EventDurationSchedulePicker";

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

const AdminEventForm = ({ layout = "admin" } = {}) => {
    const PageLayout = layout === "merchant" ? MerchantLayout : AdminLayout;
    const redirectPath = layout === "merchant" ? "/merchant-dashboard/events" : "/admin-dashboard/my-events";
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
    const [mapLocation, setMapLocation] = useState(null);

    // Duration & Multi-Day states
    const [durationType, setDurationType] = useState("single");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
    const [dailySchedule, setDailySchedule] = useState([]);

    const populateFromEvent = (ev) => {
        const dt = new Date(ev.datetime);
        const parsedDate = !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : "";
        const parsedTime = !isNaN(dt.getTime()) ? dt.toTimeString().slice(0, 5) : "";

        const sDate = ev.startDate || parsedDate;
        const eDate = ev.endDate || (ev.durationType === "multiple" ? parsedDate : sDate);
        const sTime = ev.startTime || parsedTime;
        const eTime = ev.endTime || "";

        setDurationType(ev.durationType || (ev.startDate && ev.endDate && ev.startDate !== ev.endDate ? "multiple" : "single"));
        setStartDate(sDate);
        setEndDate(eDate);
        setStartTime(sTime);
        setEndTime(eTime);
        setHasCustomSchedule(Boolean(ev.hasCustomSchedule));
        setDailySchedule(Array.isArray(ev.dailySchedule) ? ev.dailySchedule : []);

        setForm({
            title: ev.title || "",
            description: ev.description || "",
            date: sDate,
            time: sTime,
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
                .then((res) => {
                    if (!cancelled && res.event) {
                        const ev = res.event;
                        const createdRole = ev.createdByRole || (typeof ev.createdBy === "object" ? ev.createdBy?.role : null);
                        const isMerchantCreated = createdRole ? createdRole === "merchant" : false;
                        if (layout === "admin" && isMerchantCreated) {
                            toast.error("This event is managed by its merchant and cannot be edited from the Admin Portal.");
                            navigate("/admin-dashboard/events", { replace: true });
                            return;
                        }
                        populateFromEvent(ev);
                    }
                })
                .catch((e) => { if (!cancelled) setLoadError(e?.message || "Failed to load event"); })
                .finally(() => { if (!cancelled) setPageLoading(false); });
        }
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingId, layout]);

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
            // Duration & Schedule Validations
            const todayStr = getTodayString();
            if (durationType === "single") {
                if (!startDate) {
                    setFormErrors({ date: "Event date is required" });
                    toast.error("Event date is required");
                    return;
                }
                if (!isEdit && startDate < todayStr) {
                    setFormErrors({ date: "Event date cannot be in the past" });
                    toast.error("Event date cannot be in the past");
                    return;
                }
                if (!startTime) {
                    setFormErrors({ startTime: "Start time is required" });
                    toast.error("Start time is required");
                    return;
                }
                if (!endTime) {
                    setFormErrors({ endTime: "End time is required" });
                    toast.error("End time is required");
                    return;
                }
                if (startTime && endTime && endTime <= startTime) {
                    setFormErrors({ endTime: "End time must be after start time" });
                    toast.error("End time must be after start time");
                    return;
                }
            } else {
                if (!startDate) {
                    setFormErrors({ startDate: "Start date is required" });
                    toast.error("Start date is required");
                    return;
                }
                if (!isEdit && startDate < todayStr) {
                    setFormErrors({ startDate: "Start date cannot be in the past" });
                    toast.error("Start date cannot be in the past");
                    return;
                }
                if (!endDate) {
                    setFormErrors({ endDate: "End date is required" });
                    toast.error("End date is required");
                    return;
                }
                if (endDate < startDate) {
                    setFormErrors({ endDate: "End date cannot be before start date" });
                    toast.error("End date cannot be before start date");
                    return;
                }
                if (!startTime) {
                    setFormErrors({ startTime: "Daily start time is required" });
                    toast.error("Daily start time is required");
                    return;
                }
                if (!endTime) {
                    setFormErrors({ endTime: "Daily end time is required" });
                    toast.error("Daily end time is required");
                    return;
                }
                if (startTime && endTime && endTime <= startTime && !hasCustomSchedule) {
                    setFormErrors({ endTime: "End time must be after start time" });
                    toast.error("End time must be after start time");
                    return;
                }
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
            formData.append('durationType', durationType);
            formData.append('startDate', startDate);
            formData.append('endDate', durationType === 'multiple' ? endDate : startDate);
            formData.append('startTime', startTime);
            formData.append('endTime', endTime);
            formData.append('date', startDate);
            formData.append('time', startTime);
            formData.append('hasCustomSchedule', String(hasCustomSchedule && durationType === 'multiple'));
            if (hasCustomSchedule && durationType === 'multiple' && dailySchedule.length > 0) {
                formData.append('dailySchedule', JSON.stringify(dailySchedule));
            }
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
            navigate(redirectPath);
        }
        catch (err) {
            toast.error(err?.message || "Operation failed");
        }
        finally {
            setSubmitting(false);
        }
    };

    if (pageLoading) {
        return (<PageLayout>
        <section className="py-6 sm:py-8 flex items-center justify-center min-h-[300px] text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary"/> Loading event details…
        </section>
      </PageLayout>);
    }

    if (loadError) {
        return (<PageLayout>
        <section className="py-6 sm:py-8 w-full">
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-sm">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive/60"/>
            <p className="text-base font-semibold text-foreground mb-1">Failed to load event</p>
            <p className="text-sm text-muted-foreground mb-6">{loadError}</p>
            <Button onClick={() => navigate(redirectPath)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2"/> Back to Events
            </Button>
          </div>
        </section>
      </PageLayout>);
    }

    return (<PageLayout>
      <section className="py-2 sm:py-6 w-full space-y-6">
        {/* Page Header */}
        <div>
          <button type="button" onClick={() => navigate(redirectPath)} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-3">
            <ArrowLeft className="h-4 w-4"/> Back to Events
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {isEdit ? "Edit Event" : "Add Event"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 font-normal">
            {isEdit ? "Update event configuration, schedule, pricing, and media" : "Create and configure a new event"}
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Basic Information */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5"/>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Basic Information</h2>
                <p className="text-xs text-muted-foreground">Title, category, status, and event description</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Event Title */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <Label className="text-sm font-semibold text-foreground">Event Title *</Label>
                  <span className="text-[11px] text-muted-foreground">{(form.title || '').length}/100</span>
                </div>
                <Input value={form.title} onChange={(e) => {
            setForm({ ...form, title: e.target.value });
            if (formErrors.title)
                setFormErrors((prev) => ({ ...prev, title: "" }));
        }} placeholder="Enter event title" maxLength={100} required className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary" aria-invalid={Boolean(formErrors.title)}/>
                {formErrors.title && <p className="text-xs text-destructive mt-1.5 font-medium">{formErrors.title}</p>}
              </div>

              {/* Event Category */}
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Event Category *</Label>
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
        }} className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
                  <option value="">Select category...</option>
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                  <option value="__new__" className="text-primary font-bold">+ Create New Category</option>
                </select>

                {showNewCatInput && (<div className="mt-2.5 flex gap-2">
                    <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New category name" maxLength={50} className="h-10 rounded-xl bg-background border-border flex-1 text-sm"/>
                    <Button type="button" onClick={handleCreateCategory} disabled={creatingCat} size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground h-10 px-4 rounded-xl">
                      {creatingCat ? <Loader2 className="h-4 w-4 animate-spin"/> : "Add"}
                    </Button>
                    <Button type="button" onClick={() => {
                setShowNewCatInput(false);
                setNewCatName("");
                setForm({ ...form, category: categories[0] || "General" });
            }} variant="ghost" size="sm" className="h-10 px-3 rounded-xl">
                      Cancel
                    </Button>
                  </div>)}
                {formErrors.category && <p className="text-xs text-destructive mt-1.5 font-medium">{formErrors.category}</p>}
              </div>

              {/* Event Description (Full Width) */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <Label className="text-sm font-semibold text-foreground">Event Description *</Label>
                  <span className="text-[11px] text-muted-foreground">{(form.description || '').length}/1000</span>
                </div>
                <Textarea value={form.description} onChange={(e) => {
            setForm({ ...form, description: e.target.value });
            if (formErrors.description)
                setFormErrors((prev) => ({ ...prev, description: "" }));
        }} placeholder="Provide a detailed description of the event..." rows={4} maxLength={1000} required className="rounded-xl bg-background border-border focus:ring-2 focus:ring-primary min-h-[110px] resize-y" aria-invalid={Boolean(formErrors.description)}/>
                {formErrors.description && <p className="text-xs text-destructive mt-1.5 font-medium">{formErrors.description}</p>}
              </div>

              {/* Event Status */}
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Event Status</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Event Type & Pricing */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Tag className="h-5 w-5"/>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Event Type & Pricing</h2>
                <p className="text-xs text-muted-foreground">Select ticketing type, pricing model, and capacity</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2.5 block">Select Event Type *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => {
            setEventType("fullService");
            setTicketTypes([]);
        }} className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3.5 ${eventType === "fullService"
            ? "border-primary bg-primary/10 text-primary shadow-sm"
            : "border-border bg-background hover:border-primary/40 text-foreground"}`}>
                    <div className="text-2xl p-2 rounded-xl bg-card border border-border">🎉</div>
                    <div>
                      <div className="font-bold text-sm">Single Ticket Event</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Fixed entry price per attendee</div>
                    </div>
                  </button>

                  <button type="button" onClick={() => {
            setEventType("ticketed");
            setTicketTypes([]);
        }} className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3.5 ${eventType === "ticketed"
            ? "border-primary bg-primary/10 text-primary shadow-sm"
            : "border-border bg-background hover:border-primary/40 text-foreground"}`}>
                    <div className="text-2xl p-2 rounded-xl bg-card border border-border">🎫</div>
                    <div>
                      <div className="font-bold text-sm">Ticketed Event</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Tiered tickets (Silver, Gold, Diamond)</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Single Ticket Fields */}
              {eventType === "fullService" && (<div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div>
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                      <IndianRupee className="h-4 w-4 text-primary"/> Event Price (₹) *
                    </Label>
                    <Input type="number" min="1" step="1" value={form.price} onChange={(e) => {
                setForm({ ...form, price: e.target.value });
                if (formErrors.price)
                    setFormErrors((prev) => ({ ...prev, price: "" }));
            }} placeholder="Price per ticket in ₹" required className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary" aria-invalid={Boolean(formErrors.price)}/>
                    {formErrors.price && <p className="text-xs text-destructive mt-1.5 font-medium">{formErrors.price}</p>}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                      <Users className="h-4 w-4 text-primary"/> Max Capacity / Attendees
                    </Label>
                    <Input type="number" min="0" step="1" max="99999" value={form.maxAttendees} onChange={(e) => {
                setForm({ ...form, maxAttendees: e.target.value });
                if (formErrors.maxAttendees)
                    setFormErrors((prev) => ({ ...prev, maxAttendees: "" }));
            }} placeholder="e.g. 100 (0 for unlimited)" className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary"/>
                    <p className="text-[11px] text-muted-foreground mt-1">Leave blank or set 0 for unlimited capacity</p>
                    {formErrors.maxAttendees && <p className="text-xs text-destructive mt-1.5 font-medium">{formErrors.maxAttendees}</p>}
                  </div>
                </div>)}

              {/* Ticketed Event Configurations */}
              {eventType === "ticketed" && (<div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm font-semibold text-foreground mb-1.5 block">Ticket Session Option *</Label>
                    <select value={ticketedType || ""} onChange={(e) => {
                const value = e.target.value;
                setTicketedType(value || null);
                setTicketTypes([]);
            }} className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Select ticket option...</option>
                      <option value="normal">🎫 Single Session (Normal Tiered Tickets)</option>
                      <option value="dayNight">☀️🌙 Day & Night Sessions (Separate Session Tiers)</option>
                    </select>
                  </div>

                  {ticketedType === "normal" && (<div className="p-4 sm:p-5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-purple-600"/> Tiered Ticket Pricing & Quantity
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Specify prices and available seats for each ticket tier</p>
                      </div>
                      <div className="grid gap-3">
                        {["silver", "gold", "diamond"].map((tier, i) => (<div key={tier} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-card border border-border">
                            <div>
                              <Label className="text-xs font-semibold text-foreground capitalize flex items-center gap-1.5 mb-1">
                                {tier === "silver" ? "🥈 Silver Tier (₹)" : tier === "gold" ? "🥇 Gold Tier (₹)" : "💎 Diamond Tier (₹)"}
                              </Label>
                              <Input type="number" min="1" step="1" value={ticketTypes[i]?.price || ""} onChange={(e) => {
                        const updated = [...ticketTypes];
                        if (!updated[i])
                            updated[i] = { name: tier, price: "", available: "100" };
                        updated[i].price = e.target.value;
                        setTicketTypes(updated);
                    }} placeholder="Price in ₹" className="h-10 rounded-lg bg-background border-border text-sm" required/>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-foreground mb-1 block">Available Quantity</Label>
                              <Input type="number" min="1" value={ticketTypes[i]?.available || "100"} onChange={(e) => {
                        const updated = [...ticketTypes];
                        if (!updated[i])
                            updated[i] = { name: tier, price: "", available: "100" };
                        updated[i].available = e.target.value;
                        setTicketTypes(updated);
                    }} placeholder="Seats" className="h-10 rounded-lg bg-background border-border text-sm" required/>
                            </div>
                          </div>))}
                      </div>
                    </div>)}

                  {ticketedType === "dayNight" && (<div className="p-4 sm:p-5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          ☀️🌙 Day & Night Session Tiers
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Configure individual ticket tiers for Day and Night sessions</p>
                      </div>

                      {/* Day Session */}
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          ☀️ Day Session (09:00 AM)
                        </p>
                        <div className="grid gap-3">
                          {["silver", "gold", "diamond"].map((tier, i) => (<div key={tier} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-card border border-border">
                              <div>
                                <Label className="text-xs font-semibold text-foreground capitalize mb-1 block">
                                  {tier === "silver" ? "🥈 Silver (₹)" : tier === "gold" ? "🥇 Gold (₹)" : "💎 Diamond (₹)"}
                                </Label>
                                <Input type="number" min="1" step="1" value={ticketTypes[i]?.price || ""} onChange={(e) => {
                        const updated = [...ticketTypes];
                        if (!updated[i])
                            updated[i] = { name: tier, price: "", available: "100" };
                        updated[i].price = e.target.value;
                        setTicketTypes(updated);
                    }} placeholder="Price in ₹" className="h-10 rounded-lg bg-background border-border text-sm" required/>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold text-foreground mb-1 block">Quantity</Label>
                                <Input type="number" min="1" value={ticketTypes[i]?.available || "100"} onChange={(e) => {
                        const updated = [...ticketTypes];
                        if (!updated[i])
                            updated[i] = { name: tier, price: "", available: "100" };
                        updated[i].available = e.target.value;
                        setTicketTypes(updated);
                    }} placeholder="Seats" className="h-10 rounded-lg bg-background border-border text-sm" required/>
                              </div>
                            </div>))}
                        </div>
                      </div>

                      {/* Night Session */}
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                          🌙 Night Session (06:00 PM)
                        </p>
                        <div className="grid gap-3">
                          {["silver", "gold", "diamond"].map((tier, idx) => {
                    const i = idx + 3;
                    return (<div key={tier} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-card border border-border">
                                <div>
                                  <Label className="text-xs font-semibold text-foreground capitalize mb-1 block">
                                    {tier === "silver" ? "🥈 Silver (₹)" : tier === "gold" ? "🥇 Gold (₹)" : "💎 Diamond (₹)"}
                                  </Label>
                                  <Input type="number" min="1" step="1" value={ticketTypes[i]?.price || ""} onChange={(e) => {
                            const updated = [...ticketTypes];
                            if (!updated[i])
                                updated[i] = { name: tier, price: "", available: "100" };
                            updated[i].price = e.target.value;
                            setTicketTypes(updated);
                        }} placeholder="Price in ₹" className="h-10 rounded-lg bg-background border-border text-sm" required/>
                                </div>
                                <div>
                                  <Label className="text-xs font-semibold text-foreground mb-1 block">Quantity</Label>
                                  <Input type="number" min="1" value={ticketTypes[i]?.available || "100"} onChange={(e) => {
                            const updated = [...ticketTypes];
                            if (!updated[i])
                                updated[i] = { name: tier, price: "", available: "100" };
                            updated[i].available = e.target.value;
                            setTicketTypes(updated);
                        }} placeholder="Seats" className="h-10 rounded-lg bg-background border-border text-sm" required/>
                                </div>
                              </div>);
                })}
                        </div>
                      </div>
                    </div>)}
                  {ticketError && <p className="text-xs text-destructive font-medium">{ticketError}</p>}
                </div>)}
            </div>
          </div>

          {/* SECTION 3: Location & Schedule */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-5 w-5"/>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Schedule & Location</h2>
                <p className="text-xs text-muted-foreground">Event date, start time, venue name, and address</p>
              </div>
            </div>

            <div className="space-y-4">
              <EventDurationSchedulePicker
                durationType={durationType}
                onDurationTypeChange={(type) => {
                  setDurationType(type);
                  setFormErrors((prev) => ({ ...prev, date: "", startDate: "", endDate: "", startTime: "", endTime: "" }));
                }}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
                startTime={startTime}
                onStartTimeChange={setStartTime}
                endTime={endTime}
                onEndTimeChange={setEndTime}
                hasCustomSchedule={hasCustomSchedule}
                onHasCustomScheduleChange={setHasCustomSchedule}
                dailySchedule={dailySchedule}
                onDailyScheduleChange={setDailySchedule}
                errors={formErrors}
                onClearError={(field) => setFormErrors((prev) => ({ ...prev, [field]: "" }))}
              />

              {/* Venue & Location Address (Full Width) */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary"/> Venue & Address *
                  </Label>
                  <span className="text-[11px] text-muted-foreground">{(form.location || '').length}/150</span>
                </div>
                <LocationAutocomplete
                  value={form.location}
                  onChange={(val) => {
                    setForm({ ...form, location: val });
                    if (formErrors.location) setFormErrors((prev) => ({ ...prev, location: "" }));
                  }}
                  onCoordinatesSelect={(coords) => {
                    if (coords) {
                      setMapLocation(coords);
                      setForm(prev => ({ ...prev, location: coords.address || coords.name }));
                      if (formErrors.location) setFormErrors((prev) => ({ ...prev, location: "" }));
                    } else {
                      setMapLocation(null);
                    }
                  }}
                  coordinates={mapLocation}
                  showMapButton={true}
                  error={formErrors.location}
                  placeholder="Enter event venue name or address"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Media & Gallery */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5"/>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Media & Gallery</h2>
                <p className="text-xs text-muted-foreground">Cover image and photo gallery uploads</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Event Cover Image */}
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Event Cover Image (Max 5MB)</Label>
                <div className="relative flex min-h-[160px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-background transition-colors hover:border-primary/60 p-4" onClick={() => fileInputRef.current?.click()}>
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
                  {imagePreview ? (<div className="relative w-full max-h-[220px] rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={imagePreview} alt="Cover Preview" className="max-h-[220px] w-full object-cover rounded-lg"/>
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-lg">Click to change cover image</span>
                      </div>
                    </div>) : (<div className="text-center py-4">
                      <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2"/>
                      <p className="text-sm font-semibold text-foreground">Click to upload event cover image</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, WEBP up to 5MB</p>
                    </div>)}
                </div>
              </div>

              {/* Gallery Images */}
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold text-foreground mb-1.5 block flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary"/>
                  Gallery Images (Up to 4 photos, max 5MB each)
                </Label>
                <div className="relative flex min-h-[130px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-background transition-colors hover:border-primary/60 p-3" onClick={() => galleryInputRef.current?.click()}>
                  <input ref={galleryInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleGalleryUpload} className="hidden"/>
                  {galleryPreviews.length === 0 ? (<div className="text-center py-3">
                      <ImageIcon className="mx-auto h-7 w-7 text-muted-foreground/60 mb-1.5"/>
                      <p className="text-sm font-semibold text-foreground">Click to upload gallery images (max 4)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP formats allowed</p>
                    </div>) : (<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                      {galleryPreviews.map((preview, idx) => (<div key={idx} className="relative aspect-video sm:aspect-square overflow-hidden rounded-lg border border-border group">
                          <img src={preview} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover"/>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeGalleryImage(idx); }} className="absolute top-1 right-1 rounded-full bg-red-500/90 text-white p-1 hover:bg-red-600 transition-colors shadow-sm">
                            <X className="h-3 w-3"/>
                          </button>
                        </div>))}
                      {galleryPreviews.length < 4 && (<div className="flex aspect-video sm:aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground hover:text-primary">
                          <Plus className="h-6 w-6"/>
                        </div>)}
                    </div>)}
                </div>
                {galleryPreviews.length > 0 && (<p className="mt-1.5 text-xs text-muted-foreground font-medium">
                    {galleryPreviews.length} of 4 gallery images selected
                  </p>)}
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold border-border hover:bg-secondary" onClick={() => navigate(redirectPath)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-11 px-8 rounded-xl font-semibold">
              {submitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2"/> {isEdit ? "Updating..." : "Creating..."}</>) : (isEdit ? "Update Event" : "Create Event")}
            </Button>
          </div>
        </form>
      </section>
    </PageLayout>);
};

export default AdminEventForm;
