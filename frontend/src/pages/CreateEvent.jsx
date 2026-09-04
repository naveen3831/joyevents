import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, IndianRupee, Clock, Globe, ImageIcon, Ticket, Plus, Loader2, Sparkles, Wand2, Check, Tag, Users, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MerchantLayout from "@/components/MerchantLayout";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateEventWithImage, apiListCategories, apiCreateCategory, apiGenerateAISuggestions } from "@/lib/api";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import EventDurationSchedulePicker from "@/components/EventDurationSchedulePicker";
const CreateEvent = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [eventType, setEventType] = useState("fullService");
    const [hasMultipleSessions, setHasMultipleSessions] = useState(false);
    // Duration & Multi-Day states
    const [durationType, setDurationType] = useState("single");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
    const [dailySchedule, setDailySchedule] = useState([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        price: "",
        category: "",
        maxAttendees: "",
        image: null
    });
    const [numTicketTypes, setNumTicketTypes] = useState(0);
    const [ticketTypes, setTicketTypes] = useState([]);
    const [dayTickets, setDayTickets] = useState([]);
    const [nightTickets, setNightTickets] = useState([]);
    const [dayTime, setDayTime] = useState("09:00 AM");
    const [nightTime, setNightTime] = useState("06:00 PM");
    const [showMap, setShowMap] = useState(false);
    const [mapLocation, setMapLocation] = useState(null);
    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState({});
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [creatingCategory, setCreatingCategory] = useState(false);

    // AI Suggestion states
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [loadingTitleAI, setLoadingTitleAI] = useState(false);
    const [showTitleAISuggestions, setShowTitleAISuggestions] = useState(false);

    const [showAIDescModal, setShowAIDescModal] = useState(false);
    const [loadingDescAI, setLoadingDescAI] = useState(false);
    const [aiDescTone, setAiDescTone] = useState("standard");
    const [aiGeneratedDesc, setAiGeneratedDesc] = useState("");
    const lastGeneratedTitleRef = useRef("");

    const [aiSuggestedCategory, setAiSuggestedCategory] = useState(null);
    const [aiSuggestedTags, setAiSuggestedTags] = useState([]);
    const [loadingCatAI, setLoadingCatAI] = useState(false);

    // AI Title Suggestions Handler
    const handleFetchTitleSuggestions = async (isGenerateMore = false) => {
        const rawTitle = formData.title.trim();
        if (!rawTitle) {
            toast.error("Enter an event name or topic first to get AI suggestions.");
            setShowTitleAISuggestions(false);
            setTitleSuggestions([]);
            return;
        }

        setLoadingTitleAI(true);
        setShowTitleAISuggestions(true);
        try {
            const res = await apiGenerateAISuggestions({
                type: "title",
                topic: rawTitle,
                eventType: eventType === "fullService" ? "Single Ticket Event" : "Ticketed Event",
                location: formData.location || "",
                category: formData.category || "",
                excludeList: isGenerateMore ? titleSuggestions : []
            }, token);

            if (res && res.titles && Array.isArray(res.titles) && res.titles.length > 0) {
                setTitleSuggestions(res.titles);
            } else {
                toast.error("Couldn't generate suggestions. Please try again.");
                if (!isGenerateMore) setShowTitleAISuggestions(false);
            }
        } catch (err) {
            toast.error("Couldn't generate suggestions. Please try again.");
            if (!isGenerateMore && titleSuggestions.length === 0) {
                setShowTitleAISuggestions(false);
            }
        } finally {
            setLoadingTitleAI(false);
        }
    };

    // Open AI Description Modal after validating Event Title
    const handleOpenAIDescModal = () => {
        const rawTitle = formData.title?.trim();
        if (!rawTitle) {
            toast.error("Enter or select an event title first to generate a description.");
            return;
        }

        // If title changed since last generation, reset stale description preview
        if (lastGeneratedTitleRef.current !== rawTitle) {
            setAiGeneratedDesc("");
        }

        setShowAIDescModal(true);

        // Auto-generate initial standard description if empty or title changed
        if (!aiGeneratedDesc || lastGeneratedTitleRef.current !== rawTitle) {
            handleGenerateAIDescription("standard", rawTitle);
        }
    };

    // AI Description Generator Handler
    const handleGenerateAIDescription = async (tone = aiDescTone, overrideTitle = null) => {
        const targetTitle = (overrideTitle || formData.title || "").trim();
        if (!targetTitle) {
            toast.error("Enter or select an event title first to generate a description.");
            return;
        }

        // Validate Improve Draft tone requires existing description
        if (tone === "improve") {
            const draftText = formData.description?.trim() || aiGeneratedDesc?.trim();
            if (!draftText || draftText.length < 3) {
                toast.error("Enter a draft description first.");
                return;
            }
        }

        setLoadingDescAI(true);
        setAiDescTone(tone);
        try {
            const res = await apiGenerateAISuggestions({
                type: "description",
                title: targetTitle,
                category: formData.category || "",
                location: formData.location || "",
                eventType: eventType === "fullService" ? "Single Ticket Event" : "Ticketed Event",
                startDate: startDate || "",
                endDate: durationType === "multiple" ? (endDate || startDate || "") : (startDate || ""),
                startTime: startTime || "",
                endTime: endTime || "",
                currentDescription: formData.description || "",
                tone
            }, token);

            if (res && res.description) {
                setAiGeneratedDesc(res.description);
                lastGeneratedTitleRef.current = targetTitle;
            } else {
                toast.error("Couldn't generate a description right now. Please try again.");
            }
        } catch (err) {
            toast.error("Couldn't generate a description right now. Please try again.");
        } finally {
            setLoadingDescAI(false);
        }
    };

    // AI Category & Tags Handler
    const handleFetchCategoryAndTagsAI = async () => {
        setLoadingCatAI(true);
        try {
            const res = await apiGenerateAISuggestions({
                type: "category_tags",
                title: formData.title,
                currentDescription: formData.description
            }, token);
            if (res.category) {
                setAiSuggestedCategory(res.category);
            }
            if (res.tags) {
                setAiSuggestedTags(res.tags);
            }
            toast.success("AI analyzed content and generated suggestions!");
        } catch (err) {
            toast.error("Failed to generate category suggestions");
        } finally {
            setLoadingCatAI(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);
    const loadCategories = async () => {
        try {
            const res = await apiListCategories("event");
            setCategories(res.categories || []);
            // Set default category if available
            if (res.categories && res.categories.length > 0) {
                setFormData(prev => ({ ...prev, category: res.categories[0].name }));
            }
        }
        catch (error) {
            toast.error("Failed to load categories");
        }
    };
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            toast.error("Please enter a category name");
            return;
        }
        setCreatingCategory(true);
        try {
            const res = await apiCreateCategory(newCategoryName.trim(), "event", token);
            toast.success("Category created successfully!");
            setNewCategoryName("");
            setShowAddCategory(false);
            // Reload categories
            await loadCategories();
            // Set the new category as selected
            setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
        }
        catch (error) {
            toast.error(error?.message || "Failed to create category");
        }
        finally {
            setCreatingCategory(false);
        }
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
        // Discard stale title suggestions when user edits the title input
        if (name === "title" && showTitleAISuggestions) {
            setShowTitleAISuggestions(false);
            setTitleSuggestions([]);
        }
    };
    const handleCategoryChange = (value) => {
        setFormData(prev => ({ ...prev, category: value }));
        if (errors.category) {
            setErrors(prev => ({ ...prev, category: "" }));
        }
    };
    const handleLocationSelect = (lat, lng, address) => {
        setMapLocation({ lat, lng, address });
        // Update location field with formatted address
        setFormData(prev => ({ ...prev, location: address }));
        toast.success("Location selected! Coordinates saved.");
    };
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB");
                return;
            }
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error("Please select a valid image file");
                return;
            }
            setFormData(prev => ({ ...prev, image: file }));
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result);
            };
            reader.readAsDataURL(file);
            // Clear error
            if (errors.image) {
                setErrors(prev => ({ ...prev, image: "" }));
            }
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = "Event title is required";
        }
        else if (formData.title.length > 100) {
            newErrors.title = "Event title cannot exceed 100 characters";
        }
        if (!formData.description.trim()) {
            newErrors.description = "Event description is required";
        }
        else if (formData.description.length > 1000) {
            newErrors.description = "Event description cannot exceed 1000 characters";
        }
        // Duration & Schedule Validations
        const todayStr = new Date().toISOString().split("T")[0];
        if (durationType === "single") {
            if (!startDate) {
                newErrors.date = "Event date is required";
            } else if (startDate < todayStr) {
                newErrors.date = "Event date cannot be in the past";
            }
            if (!startTime) {
                newErrors.startTime = "Start time is required";
            }
            if (!endTime) {
                newErrors.endTime = "End time is required";
            }
            if (startTime && endTime && endTime <= startTime) {
                newErrors.endTime = "End time must be after start time";
            }
        } else {
            if (!startDate) {
                newErrors.startDate = "Start date is required";
            } else if (startDate < todayStr) {
                newErrors.startDate = "Start date cannot be in the past";
            }
            if (!endDate) {
                newErrors.endDate = "End date is required";
            } else if (endDate < startDate) {
                newErrors.endDate = "End date cannot be before start date";
            }
            if (!startTime) {
                newErrors.startTime = "Daily start time is required";
            }
            if (!endTime) {
                newErrors.endTime = "Daily end time is required";
            }
            if (startTime && endTime && endTime <= startTime && !hasCustomSchedule) {
                newErrors.endTime = "End time must be after start time";
            }
        }

        if (!formData.location.trim()) {
            newErrors.location = "Event location is required";
        }
        else if (formData.location.length > 150) {
            newErrors.location = "Event location cannot exceed 150 characters";
        }
        if (!formData.category)
            newErrors.category = "Event category is required";
        // For full service events, price is required
        if (eventType === "fullService") {
            if (!formData.price || parseFloat(formData.price) < 0)
                newErrors.price = "Valid price is required";
        }
        // For ticketed events, validate ticket prices
        if (eventType === "ticketed") {
            if (!ticketTypes[0]?.price || parseFloat(ticketTypes[0].price) <= 0)
                newErrors.silverPrice = "Silver ticket price is required";
            if (!ticketTypes[1]?.price || parseFloat(ticketTypes[1].price) <= 0)
                newErrors.goldPrice = "Gold ticket price is required";
            if (!ticketTypes[2]?.price || parseFloat(ticketTypes[2].price) <= 0)
                newErrors.diamondPrice = "Diamond ticket price is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            toast.error("Please login to create events");
            navigate("/login");
            return;
        }
        if (!validateForm()) {
            toast.error("Please fix the errors in the form");
            return;
        }
        setLoading(true);
        try {
            // Create FormData for file upload
            const formDataObj = new FormData();
            formDataObj.append('title', formData.title.trim());
            formDataObj.append('description', formData.description.trim());
            formDataObj.append('durationType', durationType);
            formDataObj.append('startDate', startDate);
            formDataObj.append('endDate', durationType === 'multiple' ? endDate : startDate);
            formDataObj.append('startTime', startTime);
            formDataObj.append('endTime', endTime);
            formDataObj.append('date', startDate);
            formDataObj.append('time', startTime);
            formDataObj.append('hasCustomSchedule', String(hasCustomSchedule && durationType === 'multiple'));
            if (hasCustomSchedule && durationType === 'multiple' && dailySchedule.length > 0) {
                formDataObj.append('dailySchedule', JSON.stringify(dailySchedule));
            }
            formDataObj.append('location', formData.location.trim());
            formDataObj.append('category', formData.category);
            formDataObj.append('status', 'upcoming');
            formDataObj.append('eventType', eventType);
            formDataObj.append('maxAttendees', formData.maxAttendees || '0');
            if (eventType === "fullService") {
                formDataObj.append('price', formData.price);
            }
            else {
                // For ticketed events, set price to 0 (not used)
                formDataObj.append('price', '0');
                if (hasMultipleSessions) {
                    // Day/Night sessions
                    formDataObj.append('hasMultipleSessions', 'true');
                    formDataObj.append('sessions', JSON.stringify({
                        day: {
                            enabled: true,
                            time: dayTime,
                            tickets: [
                                { type: 'silver', price: parseFloat(dayTickets[0]?.price || '0'), available: parseInt(dayTickets[0]?.available || '100') },
                                { type: 'gold', price: parseFloat(dayTickets[1]?.price || '0'), available: parseInt(dayTickets[1]?.available || '100') },
                                { type: 'diamond', price: parseFloat(dayTickets[2]?.price || '0'), available: parseInt(dayTickets[2]?.available || '100') }
                            ]
                        },
                        night: {
                            enabled: true,
                            time: nightTime,
                            tickets: [
                                { type: 'silver', price: parseFloat(nightTickets[0]?.price || '0'), available: parseInt(nightTickets[0]?.available || '100') },
                                { type: 'gold', price: parseFloat(nightTickets[1]?.price || '0'), available: parseInt(nightTickets[1]?.available || '100') },
                                { type: 'diamond', price: parseFloat(nightTickets[2]?.price || '0'), available: parseInt(nightTickets[2]?.available || '100') }
                            ]
                        }
                    }));
                }
                else {
                    // Single session (legacy)
                    formDataObj.append('hasMultipleSessions', 'false');
                    formDataObj.append('tickets', JSON.stringify([
                        { type: 'silver', price: parseFloat(ticketTypes[0]?.price || '0'), available: parseInt(ticketTypes[0]?.available || '100') },
                        { type: 'gold', price: parseFloat(ticketTypes[1]?.price || '0'), available: parseInt(ticketTypes[1]?.available || '100') },
                        { type: 'diamond', price: parseFloat(ticketTypes[2]?.price || '0'), available: parseInt(ticketTypes[2]?.available || '100') }
                    ]));
                }
            }
            if (formData.image) {
                formDataObj.append('image', formData.image);
            }
            await apiCreateEventWithImage(formDataObj, token);
            toast.success("Event created successfully!");
            navigate("/merchant-dashboard/events");
        }
        catch (error) {
            toast.error(error?.message || "Failed to create event");
        }
        finally {
            setLoading(false);
        }
    };
    return (<MerchantLayout>
      <section className="py-2 sm:py-6">
        <div className="w-full space-y-6">
          <Link to="/merchant-dashboard/events" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4"/> Back to Events
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mb-6 sm:mb-8">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Create <span className="text-gradient">New Event</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Fill in the details to publish your event</p>
          </motion.div>

          <motion.form initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.2 }} onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">Event Cover Image</Label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, image: null }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer transition-colors"
                  >
                    Remove Image
                  </button>
                )}
              </div>
              <div className="relative">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary overflow-hidden group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 z-30 h-full w-full opacity-0 cursor-pointer"
                  />
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl"/>
                      <div className="absolute inset-0 z-10 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-1 pointer-events-none">
                        <p className="text-white text-sm font-semibold">Click to change image</p>
                        <p className="text-white/70 text-xs">JPG, PNG, WebP • Max 5MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors"/>
                      <p className="mt-2 text-sm text-muted-foreground group-hover:text-foreground font-medium">
                        Click to upload event cover image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max size: 5MB • Formats: JPG, PNG, WebP
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {errors.image && <p className="text-sm text-red-500">{errors.image}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="text-sm text-muted-foreground font-semibold mb-2 block">Event Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setEventType("fullService")} className={`p-4 rounded-lg border-2 transition-all font-medium ${eventType === "fullService"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card hover:border-primary/50"}`}>
                    <div className="text-lg">🎉</div>
                    Single Ticket Event
                  </button>
                  <button type="button" onClick={() => setEventType("ticketed")} className={`p-4 rounded-lg border-2 transition-all font-medium ${eventType === "ticketed"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card hover:border-primary/50"}`}>
                    <div className="text-lg">🎫</div>
                    Ticketed Event
                  </button>
                </div>
              </div>

              {/* Event Title with AI Suggestions */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Event Title</Label>
                    <button
                      type="button"
                      onClick={handleFetchTitleSuggestions}
                      disabled={loadingTitleAI}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:text-purple-300 border border-purple-500/30 transition-all hover:scale-105 disabled:opacity-50"
                    >
                      {loadingTitleAI ? (
                        <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                      )}
                      <span>✨ AI Suggestions</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{(formData.title || "").length}/100</span>
                </div>
                <Input name="title" value={formData.title} onChange={handleInputChange} maxLength={100} placeholder="Enter event title" className="bg-card border-border" required/>
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}

                {/* AI Title Suggestions Box */}
                {showTitleAISuggestions && (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center text-xs font-semibold text-purple-600 dark:text-purple-300">
                      <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-purple-500" /> AI Recommended Titles for "{formData.title}":</span>
                      <button type="button" onClick={() => setShowTitleAISuggestions(false)} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer">✕ Close</button>
                    </div>
                    {loadingTitleAI ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-500" /> Generating suggestions...
                      </div>
                    ) : titleSuggestions.length > 0 ? (
                      <>
                        <div className="grid gap-1.5">
                          {titleSuggestions.map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, title: t }));
                                setShowTitleAISuggestions(false);
                                if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                                toast.success("Applied AI Title!");
                              }}
                              className="w-full text-left px-3 py-2 text-xs rounded-lg bg-card/90 hover:bg-purple-500/15 border border-border hover:border-purple-500/40 text-foreground transition-all flex items-center justify-between group cursor-pointer"
                            >
                              <span className="font-medium group-hover:text-purple-500 dark:group-hover:text-purple-300">{t}</span>
                              <span className="text-[10px] text-purple-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Apply ↵</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleFetchTitleSuggestions(true)}
                            disabled={loadingTitleAI}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-300 hover:bg-purple-500/15 border border-purple-500/20 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCw className={`h-3 w-3 ${loadingTitleAI ? "animate-spin" : ""}`} />
                            <span>↻ Generate More</span>
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Event Description with AI Description Generator */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <button
                      type="button"
                      onClick={handleOpenAIDescModal}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-600 dark:text-purple-300 hover:from-purple-500/25 hover:to-indigo-500/25 border border-purple-500/30 transition-all hover:scale-105"
                    >
                      <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                      <span>✨ AI Description</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{(formData.description || "").length}/1000</span>
                </div>
                <Textarea name="description" value={formData.description} onChange={handleInputChange} maxLength={1000} placeholder="Describe your event..." className="min-h-[120px] bg-card border-border" required/>
                {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
              </div>
            </div>

            {/* Ticket Types Section - Show for ticketed events - APPEARS ABOVE LOCATION */}
            {eventType === "ticketed" && (<motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Label className="text-sm text-muted-foreground font-semibold mb-3 block">Session Type</Label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button type="button" onClick={() => setHasMultipleSessions(false)} className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${!hasMultipleSessions
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:border-primary/50"}`}>
                    Single Session
                  </button>
                  <button type="button" onClick={() => setHasMultipleSessions(true)} className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${hasMultipleSessions
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:border-primary/50"}`}>
                    Day & Night Sessions
                  </button>
                </div>

                {hasMultipleSessions ? (<div className="space-y-4">
                    {/* Day Session */}
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">☀️</span>
                        <Label className="text-sm font-semibold">Day Session</Label>
                        <Input type="time" value={dayTime} onChange={(e) => setDayTime(e.target.value)} className="ml-auto w-24 h-8 text-xs bg-card border-border"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">🥈 Silver (₹)</Label>
                          <Input type="number" min="0" step="0.01" value={dayTickets[0]?.price || ""} onChange={(e) => {
                    const updated = [...dayTickets];
                    if (!updated[0])
                        updated[0] = { name: "silver", price: "", available: "100" };
                    updated[0].price = e.target.value;
                    setDayTickets(updated);
                }} placeholder="Price" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input type="number" min="1" value={dayTickets[0]?.available || "100"} onChange={(e) => {
                    const updated = [...dayTickets];
                    if (!updated[0])
                        updated[0] = { name: "silver", price: "", available: "100" };
                    updated[0].available = e.target.value;
                    setDayTickets(updated);
                }} placeholder="Qty" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">🥇 Gold (₹)</Label>
                          <Input type="number" min="0" step="0.01" value={dayTickets[1]?.price || ""} onChange={(e) => {
                    const updated = [...dayTickets];
                    if (!updated[1])
                        updated[1] = { name: "gold", price: "", available: "100" };
                    updated[1].price = e.target.value;
                    setDayTickets(updated);
                }} placeholder="Price" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input type="number" min="1" value={dayTickets[1]?.available || "100"} onChange={(e) => {
                    const updated = [...dayTickets];
                    if (!updated[1])
                        updated[1] = { name: "gold", price: "", available: "100" };
                    updated[1].available = e.target.value;
                    setDayTickets(updated);
                }} placeholder="Qty" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">💎 Diamond (₹)</Label>
                          <Input type="number" min="0" step="0.01" value={dayTickets[2]?.price || ""} onChange={(e) => {
                    const updated = [...dayTickets];
                    if (!updated[2])
                        updated[2] = { name: "diamond", price: "", available: "100" };
                    updated[2].price = e.target.value;
                    setDayTickets(updated);
                }} placeholder="Price" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input type="number" min="1" value={dayTickets[2]?.available || "100"} onChange={(e) => {
                    const updated = [...dayTickets];
                    if (!updated[2])
                        updated[2] = { name: "diamond", price: "", available: "100" };
                    updated[2].available = e.target.value;
                    setDayTickets(updated);
                }} placeholder="Qty" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                      </div>
                    </div>

                    {/* Night Session */}
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🌙</span>
                        <Label className="text-sm font-semibold">Night Session</Label>
                        <Input type="time" value={nightTime} onChange={(e) => setNightTime(e.target.value)} className="ml-auto w-24 h-8 text-xs bg-card border-border"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">🥈 Silver (₹)</Label>
                          <Input type="number" min="0" step="0.01" value={nightTickets[0]?.price || ""} onChange={(e) => {
                    const updated = [...nightTickets];
                    if (!updated[0])
                        updated[0] = { name: "silver", price: "", available: "100" };
                    updated[0].price = e.target.value;
                    setNightTickets(updated);
                }} placeholder="Price" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input type="number" min="1" value={nightTickets[0]?.available || "100"} onChange={(e) => {
                    const updated = [...nightTickets];
                    if (!updated[0])
                        updated[0] = { name: "silver", price: "", available: "100" };
                    updated[0].available = e.target.value;
                    setNightTickets(updated);
                }} placeholder="Qty" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">🥇 Gold (₹)</Label>
                          <Input type="number" min="0" step="0.01" value={nightTickets[1]?.price || ""} onChange={(e) => {
                    const updated = [...nightTickets];
                    if (!updated[1])
                        updated[1] = { name: "gold", price: "", available: "100" };
                    updated[1].price = e.target.value;
                    setNightTickets(updated);
                }} placeholder="Price" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input type="number" min="1" value={nightTickets[1]?.available || "100"} onChange={(e) => {
                    const updated = [...nightTickets];
                    if (!updated[1])
                        updated[1] = { name: "gold", price: "", available: "100" };
                    updated[1].available = e.target.value;
                    setNightTickets(updated);
                }} placeholder="Qty" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">💎 Diamond (₹)</Label>
                          <Input type="number" min="0" step="0.01" value={nightTickets[2]?.price || ""} onChange={(e) => {
                    const updated = [...nightTickets];
                    if (!updated[2])
                        updated[2] = { name: "diamond", price: "", available: "100" };
                    updated[2].price = e.target.value;
                    setNightTickets(updated);
                }} placeholder="Price" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input type="number" min="1" value={nightTickets[2]?.available || "100"} onChange={(e) => {
                    const updated = [...nightTickets];
                    if (!updated[2])
                        updated[2] = { name: "diamond", price: "", available: "100" };
                    updated[2].available = e.target.value;
                    setNightTickets(updated);
                }} placeholder="Qty" className="mt-1 text-xs bg-card border-border"/>
                        </div>
                      </div>
                    </div>
                  </div>) : (<div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3"/> 🥈 Silver Price (₹)</Label>
                        <Input type="number" min="0" step="0.01" value={ticketTypes[0]?.price || ""} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[0])
                        updated[0] = { name: "silver", price: "", available: "100" };
                    updated[0].price = e.target.value;
                    setTicketTypes(updated);
                    if (errors.silverPrice)
                        setErrors(prev => ({ ...prev, silverPrice: "" }));
                }} placeholder="Price" className="mt-1 bg-card border-border" required/>
                        {errors.silverPrice && <p className="text-sm text-red-500 mt-1">{errors.silverPrice}</p>}
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Available Tickets</Label>
                        <Input type="number" min="1" value={ticketTypes[0]?.available || "100"} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[0])
                        updated[0] = { name: "silver", price: "", available: "100" };
                    updated[0].available = e.target.value;
                    setTicketTypes(updated);
                }} placeholder="Quantity" className="mt-1 bg-card border-border" required/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3"/> 🥇 Gold Price (₹)</Label>
                        <Input type="number" min="0" step="0.01" value={ticketTypes[1]?.price || ""} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[1])
                        updated[1] = { name: "gold", price: "", available: "100" };
                    updated[1].price = e.target.value;
                    setTicketTypes(updated);
                    if (errors.goldPrice)
                        setErrors(prev => ({ ...prev, goldPrice: "" }));
                }} placeholder="Price" className="mt-1 bg-card border-border" required/>
                        {errors.goldPrice && <p className="text-sm text-red-500 mt-1">{errors.goldPrice}</p>}
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Available Tickets</Label>
                        <Input type="number" min="1" value={ticketTypes[1]?.available || "100"} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[1])
                        updated[1] = { name: "gold", price: "", available: "100" };
                    updated[1].available = e.target.value;
                    setTicketTypes(updated);
                }} placeholder="Quantity" className="mt-1 bg-card border-border" required/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3"/> 💎 Diamond Price (₹)</Label>
                        <Input type="number" min="0" step="0.01" value={ticketTypes[2]?.price || ""} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[2])
                        updated[2] = { name: "diamond", price: "", available: "100" };
                    updated[2].price = e.target.value;
                    setTicketTypes(updated);
                    if (errors.diamondPrice)
                        setErrors(prev => ({ ...prev, diamondPrice: "" }));
                }} placeholder="Price" className="mt-1 bg-card border-border" required/>
                        {errors.diamondPrice && <p className="text-sm text-red-500 mt-1">{errors.diamondPrice}</p>}
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Available Tickets</Label>
                        <Input type="number" min="1" value={ticketTypes[2]?.available || "100"} onChange={(e) => {
                    const updated = [...ticketTypes];
                    if (!updated[2])
                        updated[2] = { name: "diamond", price: "", available: "100" };
                    updated[2].available = e.target.value;
                    setTicketTypes(updated);
                }} placeholder="Quantity" className="mt-1 bg-card border-border" required/>
                      </div>
                    </div>
                  </div>)}
              </motion.div>)}

            {/* Event Schedule & Duration Picker */}
            <div className="md:col-span-2 rounded-xl bg-card border border-border p-4 sm:p-5 shadow-xs space-y-4">
              <EventDurationSchedulePicker
                durationType={durationType}
                onDurationTypeChange={(type) => {
                  setDurationType(type);
                  setErrors((prev) => ({ ...prev, date: "", startDate: "", endDate: "", startTime: "", endTime: "" }));
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
                errors={errors}
                onClearError={(field) => setErrors((prev) => ({ ...prev, [field]: "" }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> Location</Label>
                    <span className="text-[10px] text-muted-foreground">{(formData.location || "").length}/150</span>
                  </div>
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={(val) => {
                      setFormData(prev => ({ ...prev, location: val }));
                      if (errors.location) setErrors(prev => ({ ...prev, location: "" }));
                    }}
                    onCoordinatesSelect={(coords) => {
                      if (coords) {
                        setMapLocation(coords);
                        setFormData(prev => ({ ...prev, location: coords.address || coords.name }));
                        if (errors.location) setErrors(prev => ({ ...prev, location: "" }));
                      } else {
                        setMapLocation(null);
                      }
                    }}
                    coordinates={mapLocation}
                    showMapButton={true}
                    error={errors.location}
                    placeholder="Event venue name or address"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-sm text-muted-foreground">Category</Label>
                  <button
                    type="button"
                    onClick={handleFetchCategoryAndTagsAI}
                    disabled={loadingCatAI}
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-300 hover:underline disabled:opacity-50"
                  >
                    {loadingCatAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-purple-500" />}
                    <span>✨ AI Category & Tags</span>
                  </button>
                </div>
                <div className="flex gap-2 mt-1">
                  <Select value={formData.category || "general"} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="bg-card border-border flex-1">
                      <SelectValue placeholder="Select a category"/>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (categories.map((cat) => (<SelectItem key={cat._id} value={cat.name}>
                            {cat.name}
                          </SelectItem>))) : (<SelectItem value="general">General</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="border-border" title="Add new category">
                        <Plus className="h-4 w-4"/>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="categoryName">Category Name</Label>
                          <Input id="categoryName" placeholder="e.g., Concert, Workshop, Seminar" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="mt-2 bg-card border-border" onKeyPress={(e) => {
            if (e.key === "Enter") {
                handleAddCategory();
            }
        }}/>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => {
            setShowAddCategory(false);
            setNewCategoryName("");
        }} disabled={creatingCategory}>
                            Cancel
                          </Button>
                          <Button type="button" className="bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={handleAddCategory} disabled={creatingCategory}>
                            {creatingCategory ? (<>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Creating...
                              </>) : ("Create Category")}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}

                {/* AI Category & Tag Suggestions Box */}
                {(aiSuggestedCategory || aiSuggestedTags.length > 0) && (
                  <div className="mt-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2 animate-in fade-in duration-200">
                    {aiSuggestedCategory && (
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-muted-foreground">Suggested Category: <strong className="text-purple-600 dark:text-purple-300 font-semibold">{aiSuggestedCategory}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category: aiSuggestedCategory }));
                            toast.success(`Category set to "${aiSuggestedCategory}"`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-medium hover:bg-purple-700 transition-all shadow-xs"
                        >
                          Apply Category
                        </button>
                      </div>
                    )}
                    {aiSuggestedTags.length > 0 && (
                      <div className="pt-1.5 border-t border-purple-500/20">
                        <span className="text-[11px] text-muted-foreground block mb-1 font-medium font-semibold">Suggested Hashtags (Click to add to description):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {aiSuggestedTags.map((tag, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  description: (prev.description ? prev.description + "\n" : "") + tag
                                }));
                                toast.success(`Added tag ${tag}`);
                              }}
                              className="px-2 py-0.5 rounded-full bg-card border border-border text-[10px] font-mono hover:border-purple-500/50 hover:text-purple-500 transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Event Capacity Section */}
              <div className="md:col-span-2 p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    Event Capacity / Max Attendees
                  </Label>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
                    {formData.maxAttendees && parseInt(formData.maxAttendees) > 0
                      ? `Max ${formData.maxAttendees} attendees`
                      : "Unlimited capacity"}
                  </span>
                </div>

                <div className="relative">
                  <Input
                    name="maxAttendees"
                    type="number"
                    min="0"
                    value={formData.maxAttendees}
                    onChange={handleInputChange}
                    placeholder="Enter maximum attendee limit (e.g. 500) or leave blank for unlimited"
                    className="bg-card border-border pr-24"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    Seats / Guests
                  </span>
                </div>

                {/* Quick Select Capacity Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Quick Presets:</span>
                  {[
                    { label: "Unlimited", value: "0" },
                    { label: "50", value: "50" },
                    { label: "100", value: "100" },
                    { label: "250", value: "250" },
                    { label: "500", value: "500" },
                    { label: "1,000", value: "1000" },
                    { label: "5,000", value: "5000" }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, maxAttendees: preset.value === "0" ? "" : preset.value }))}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                        (preset.value === "0" && (!formData.maxAttendees || formData.maxAttendees === "0")) ||
                        (formData.maxAttendees === preset.value)
                          ? "bg-primary/15 border-primary text-primary font-semibold"
                          : "bg-card border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Bookings will automatically pause once this capacity limit is reached. Set to 0 or leave blank for unlimited attendees.
                </p>
              </div>

              {/* Conditional rendering based on event type */}
              {eventType === "fullService" && (<div className="md:col-span-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Label className="text-sm text-muted-foreground flex items-center gap-1 font-semibold mb-3"><IndianRupee className="h-4 w-4"/> Event Price (₹)</Label>
                  <Input name="price" type="number" min="0" step="0.01" value={formData.price} onChange={handleInputChange} placeholder="Enter event price" className="mt-1 bg-card border-border" required/>
                  {errors.price && <p className="text-sm text-red-500 mt-1">{errors.price}</p>}
                  <p className="text-xs text-muted-foreground mt-2">Customers will pay this fixed price to book your event</p>
                </div>)}

            <div className="pt-6 mt-4 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl font-semibold" onClick={() => navigate("/merchant-dashboard/events")} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow min-h-[44px] px-8 rounded-xl font-semibold" size="lg" disabled={loading}>
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Publishing Event...</>) : "Publish Event"}
              </Button>
            </div>
          </motion.form>

          {/* AI Event Description Generator Modal */}
          <Dialog open={showAIDescModal} onOpenChange={setShowAIDescModal}>
            <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-300">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Event Description Assistant
                </DialogTitle>
                {formData.title?.trim() && (
                  <div className="text-xs text-muted-foreground pt-0.5 font-medium">
                    Generating for: <span className="font-semibold text-purple-600 dark:text-purple-300">"{formData.title.trim()}"</span>
                  </div>
                )}
              </DialogHeader>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1 my-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Select Tone & Style:</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateAIDescription("standard")}
                      disabled={loadingDescAI}
                      className={`px-3 py-2 text-xs rounded-lg border text-center transition-all ${
                        aiDescTone === "standard"
                          ? "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-300 font-semibold"
                          : "bg-card border-border hover:border-purple-500/30 text-muted-foreground"
                      }`}
                    >
                      ⚡ Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateAIDescription("improve")}
                      disabled={loadingDescAI}
                      className={`px-3 py-2 text-xs rounded-lg border text-center transition-all ${
                        aiDescTone === "improve"
                          ? "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-300 font-semibold"
                          : "bg-card border-border hover:border-purple-500/30 text-muted-foreground"
                      }`}
                    >
                      ✨ Improve Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateAIDescription("formal")}
                      disabled={loadingDescAI}
                      className={`px-3 py-2 text-xs rounded-lg border text-center transition-all ${
                        aiDescTone === "formal"
                          ? "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-300 font-semibold"
                          : "bg-card border-border hover:border-purple-500/30 text-muted-foreground"
                      }`}
                    >
                      💼 Professional
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateAIDescription("exciting")}
                      disabled={loadingDescAI}
                      className={`px-3 py-2 text-xs rounded-lg border text-center transition-all ${
                        aiDescTone === "exciting"
                          ? "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-300 font-semibold"
                          : "bg-card border-border hover:border-purple-500/30 text-muted-foreground"
                      }`}
                    >
                      🔥 Exciting
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs text-muted-foreground font-medium">Generated AI Preview (Editable):</Label>
                    <span className="text-[10px] text-muted-foreground">Merchant can freely edit before applying</span>
                  </div>
                  {loadingDescAI ? (
                    <div className="h-52 rounded-xl border border-purple-500/30 bg-purple-950/10 flex flex-col items-center justify-center gap-2 text-xs text-purple-500">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                      Generating structured description...
                    </div>
                  ) : (
                    <Textarea
                      value={aiGeneratedDesc}
                      onChange={(e) => setAiGeneratedDesc(e.target.value)}
                      className="min-h-[220px] text-xs font-mono bg-card border-border text-foreground leading-relaxed"
                      placeholder="AI content will appear here..."
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAIDescModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                  size="sm"
                  disabled={!aiGeneratedDesc || loadingDescAI}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, description: aiGeneratedDesc }));
                    setShowAIDescModal(false);
                    if (errors.description) setErrors(prev => ({ ...prev, description: "" }));
                    toast.success("AI Description applied!");
                  }}
                >
                  <Check className="h-4 w-4 mr-1.5" /> Apply to Form
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </MerchantLayout>);
};
export default CreateEvent;
