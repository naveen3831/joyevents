import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, IndianRupee, Clock, Globe, ImageIcon, Ticket, Plus, Loader2 } from "lucide-react";
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
import { apiCreateEventWithImage, apiListCategories, apiCreateCategory } from "@/lib/api";
import LocationPicker from "@/components/LocationPicker";
const CreateEvent = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [eventType, setEventType] = useState("fullService");
    const [hasMultipleSessions, setHasMultipleSessions] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        price: "",
        category: "",
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
        if (!formData.date)
            newErrors.date = "Event date is required";
        if (!formData.time)
            newErrors.time = "Event time is required";
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
        // Validate date is not in the past
        if (formData.date && formData.time) {
            const eventDateTime = new Date(`${formData.date}T${formData.time}`);
            if (eventDateTime < new Date()) {
                newErrors.date = "Event date and time cannot be in the past";
            }
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
            formDataObj.append('date', formData.date);
            formDataObj.append('time', formData.time);
            formDataObj.append('location', formData.location.trim());
            formDataObj.append('category', formData.category);
            formDataObj.append('status', 'upcoming');
            formDataObj.append('eventType', eventType);
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
              <Label className="text-sm text-muted-foreground">Event Cover Image</Label>
              <div className="relative">
                <div className="flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"/>
                  {imagePreview ? (<div className="relative w-full h-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl"/>
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <p className="text-white text-sm">Click to change image</p>
                      </div>
                    </div>) : (<div className="text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground"/>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Click to upload event cover image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max size: 5MB • Formats: JPG, PNG, WebP
                      </p>
                    </div>)}
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

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-sm text-muted-foreground">Event Title</Label>
                  <span className="text-[10px] text-muted-foreground">{(formData.title || "").length}/100</span>
                </div>
                <Input name="title" value={formData.title} onChange={handleInputChange} maxLength={100} placeholder="Enter event title" className="bg-card border-border" required/>
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-sm text-muted-foreground">Description</Label>
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

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/> Date</Label>
                <Input name="date" type="date" value={formData.date} onChange={handleInputChange} className="mt-1 bg-card border-border" min={new Date().toISOString().split('T')[0]} required/>
                {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date}</p>}
              </div>
              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Time</Label>
                <Input name="time" type="time" value={formData.time} onChange={handleInputChange} className="mt-1 bg-card border-border" required/>
                {errors.time && <p className="text-sm text-red-500 mt-1">{errors.time}</p>}
              </div>
              <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> Location</Label>
                    <span className="text-[10px] text-muted-foreground">{(formData.location || "").length}/150</span>
                  </div>
                  <Input name="location" value={formData.location} onChange={handleInputChange} maxLength={150} placeholder="Event venue or click on map to select" className="bg-card border-border" required/>
                  {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}

                  <Button type="button" variant="outline" size="sm" onClick={() => setShowMap(!showMap)} className="w-full">
                    <Globe className="h-4 w-4 mr-2"/>
                    {showMap ? "Hide Map" : "Select Location on Map"}
                  </Button>

                  {showMap && (<div className="rounded-xl overflow-hidden border border-border shadow-lg">
                      <LocationPicker onLocationSelect={handleLocationSelect}/>
                    </div>)}

                  {mapLocation && (<div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-900">
                      ✓ Selected: {mapLocation.lat.toFixed(4)}, {mapLocation.lng.toFixed(4)}
                    </div>)}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Category</Label>
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
        </div>
      </section>
    </MerchantLayout>);
};
export default CreateEvent;
