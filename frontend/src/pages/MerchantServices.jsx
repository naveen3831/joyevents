import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Briefcase, Trash2, Pencil, Plus, ImageIcon, Loader2, AlertCircle, X, Tag, Upload } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListMyServices, apiCreateService, apiUpdateService, apiDeleteService, apiListCategories, apiCreateCategory } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;
const EMPTY_FORM = {
    name: "", description: "", price: "", category: "General", highlights: "", active: "true",
    allowGuests: false, maxGuests: "100"
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
const MerchantServices = () => {
    const { token } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [galleryPreviews, setGalleryPreviews] = useState([]);
    const [addOns, setAddOns] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showNewCatInput, setShowNewCatInput] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [creatingCat, setCreatingCat] = useState(false);
    const fileRef = useRef(null);
    const galleryRef = useRef(null);
    const load = async () => {
        try {
            const [servicesRes, catsRes] = await Promise.all([
                apiListMyServices(token).catch(() => ({ services: [] })),
                apiListCategories("service").catch(() => ({ categories: [] }))
            ]);
            setServices(servicesRes.services || []);
            const dbCategories = catsRes.categories || [];
            const allCategories = Array.from(new Set([
                ...dbCategories.map((c) => c.name),
                "Photography", "Decoration", "Catering", "General", "DJ & Music", "Lighting", "Security", "Venue Hire"
            ]));
            setCategories(allCategories);
        }
        catch { /* silent */ }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
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
        if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("Category already exists");
            return;
        }
        setCreatingCat(true);
        try {
            await apiCreateCategory(trimmed, "service", token);
            toast.success("Category created successfully!");
            setCategories(prev => [...prev, trimmed]);
            setForm(prev => ({ ...prev, category: trimmed }));
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
    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setImageFile(null);
        setImagePreview("");
        setGalleryFiles([]);
        setGalleryPreviews([]);
        setAddOns([]);
        setShowNewCatInput(false);
        setNewCatName("");
        setShowForm(true);
    };
    const openEdit = (svc) => {
        setEditing(svc);
        const cat = svc.category || "General";
        // Ensure the service's category is in the dropdown list
        setCategories(prev => {
            if (cat && !prev.includes(cat)) {
                return [...prev, cat];
            }
            return prev;
        });
        setForm({
            name: svc.name,
            description: svc.description || "",
            price: String(svc.price),
            category: cat,
            highlights: (svc.highlights || []).join(", "),
            active: svc.active !== false ? "true" : "false",
            allowGuests: svc.allowGuests || false,
            maxGuests: String(svc.maxGuests || 100),
        });
        setImageFile(null);
        setImagePreview(imgSrc(svc.image));
        setGalleryFiles([]);
        setGalleryPreviews([]);
        setAddOns((svc.addOns || []).map((a) => ({ name: a.name, price: String(a.price), maxQuantity: String(a.maxQuantity || 1), minQuantity: String(a.minQuantity || 1), guestLabel: a.guestLabel || "guests", showGuestCount: a.showGuestCount || false })));
        setShowNewCatInput(false);
        setNewCatName("");
        setShowForm(true);
    };
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const validation = validateImage(file);
        if (!validation.isValid) {
            toast.error(validation.error);
            e.target.value = "";
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
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
                setGalleryFiles(prev => [...prev, ...validFiles].slice(0, 4));
                setGalleryPreviews(prev => [...prev, ...validPreviews].slice(0, 4));
            }
            e.target.value = "";
        }
    };
    const removeGalleryImage = (index) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };
    const handleSubmit = async () => {
        if (!form.name || !form.name.trim()) {
            toast.error("Service name is required");
            return;
        }
        if (form.name.length > 100) {
            toast.error("Service name cannot exceed 100 characters");
            return;
        }
        if (form.description.length > 1000) {
            toast.error("Description cannot exceed 1000 characters");
            return;
        }
        if (form.category.length > 50) {
            toast.error("Category cannot exceed 50 characters");
            return;
        }
        if (form.highlights.length > 200) {
            toast.error("Highlights cannot exceed 200 characters");
            return;
        }
        if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 1 || !Number.isInteger(Number(form.price))) {
            toast.error("Please enter a valid price (must be a whole number of 1 or greater)");
            return;
        }
        // Validate add-ons
        for (let i = 0; i < addOns.length; i++) {
            const addon = addOns[i];
            const name = addon.name.trim();
            const price = addon.price.trim();
            if (!name && !price) {
                continue;
            }
            if (!name && price) {
                toast.error(`Please enter a name for add-on #${i + 1}`);
                return;
            }
            if (name && !price) {
                toast.error(`Please enter a price for add-on "${name}"`);
                return;
            }
            if (name.length > 100) {
                toast.error(`Add-on name "${name}" cannot exceed 100 characters`);
                return;
            }
            if (isNaN(Number(price)) || Number(price) < 1 || !Number.isInteger(Number(price))) {
                toast.error(`Please enter a valid price for add-on "${name}" (must be a whole number of 1 or greater)`);
                return;
            }
            if (addon.showGuestCount && addon.guestLabel && addon.guestLabel.trim().length > 50) {
                toast.error(`Guest label for add-on "${name}" cannot exceed 50 characters`);
                return;
            }
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append("name", form.name);
            fd.append("description", form.description);
            fd.append("price", form.price);
            fd.append("category", form.category);
            fd.append("active", form.active);
            const highlightsArr = form.highlights
                .split(",")
                .map((h) => h.trim())
                .filter(Boolean);
            fd.append("highlights", JSON.stringify(highlightsArr));
            // Add-ons
            const validAddOns = addOns.filter(a => a.name.trim() && a.price);
            fd.append("addOns", JSON.stringify(validAddOns.map(a => ({ name: a.name.trim(), price: Number(a.price), maxQuantity: Number(a.maxQuantity) || 1, minQuantity: Number(a.minQuantity) || 1, guestLabel: a.guestLabel || "guests", showGuestCount: a.showGuestCount || false }))));
            fd.append("allowGuests", String(form.allowGuests || false));
            fd.append("maxGuests", String(form.maxGuests || 100));
            if (imageFile)
                fd.append("image", imageFile);
            // Add gallery images
            galleryFiles.forEach((file) => {
                fd.append("gallery", file);
            });
            if (editing) {
                await apiUpdateService(editing._id, fd, token);
                toast.success("Service updated!");
            }
            else {
                await apiCreateService(fd, token);
                toast.success("Service created!");
            }
            setShowForm(false);
            setEditing(null);
            await load();
        }
        catch (e) {
            toast.error(e?.message || "Failed to save service");
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm("Delete this service? This cannot be undone."))
            return;
        setDeleting(id);
        try {
            await apiDeleteService(id, token);
            toast.success("Service deleted");
            await load();
        }
        catch (e) {
            toast.error(e?.message || "Failed to delete service");
        }
        finally {
            setDeleting(null);
        }
    };
    return (<MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">
              My <span className="text-gradient">Services</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your own services - create, edit, and delete only what you own</p>
          </div>
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-2 h-4 w-4"/> New Service
          </Button>
        </motion.div>

        {/* Create / Edit Modal */}
        {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5"/>
              </button>
              <h2 className="font-display text-xl font-bold mb-4">{editing ? "Edit Service" : "Create Service"}</h2>

              <div className="grid gap-3 md:grid-cols-2">
                {/* Service Name */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Service Name *</label>
                    <span className="text-[10px] text-muted-foreground">{(form.name || "").length}/100</span>
                  </div>
                  <Input placeholder="Enter service name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Price (min ₹1) *</label>
                  <Input placeholder="Price (INR)" type="number" min="1" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required/>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
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
            }} className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
                    <option value="">Select category...</option>
                    {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                    <option value="__new__" className="text-primary font-bold">+ Create New Category</option>
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
                }} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>)}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <span className="text-[10px] text-muted-foreground">{(form.description || "").length}/1000</span>
                  </div>
                  <textarea placeholder="Provide a detailed description of the service..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={1000} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"/>
                </div>

                {/* Highlights */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Highlights (comma-separated)</label>
                    <span className="text-[10px] text-muted-foreground">{(form.highlights || "").length}/200</span>
                  </div>
                  <Input placeholder="e.g. Fast delivery, 24/7 support, Premium equipment" maxLength={200} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })}/>
                </div>

                {/* Add-ons */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">Add-ons (optional)</label>
                    <button type="button" onClick={() => setAddOns(prev => [...prev, { name: "", price: "", maxQuantity: "10", minQuantity: "1", guestLabel: "guests", showGuestCount: false }])} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Plus className="h-3 w-3"/> Add option
                    </button>
                  </div>
                  {addOns.length === 0 && (<p className="text-xs text-muted-foreground italic">No add-ons yet. Click "Add option" to add photography, decoration, catering, etc.</p>)}
                  <div className="space-y-3">
                    {addOns.map((addon, idx) => (<div key={idx} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
                        {/* Row 1: Name + Price + Delete */}
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Input placeholder="Add-on name (e.g. Catering)" maxLength={100} value={addon.name} onChange={(e) => setAddOns(prev => prev.map((a, i) => i === idx ? { ...a, name: e.target.value } : a))}/>
                          </div>
                          <div>
                            <Input placeholder="Price (min ₹1)" type="number" min="1" step="1" value={addon.price} onChange={(e) => setAddOns(prev => prev.map((a, i) => i === idx ? { ...a, price: e.target.value } : a))} className="w-32"/>
                          </div>
                          <button type="button" onClick={() => setAddOns(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                            <X className="h-4 w-4"/>
                          </button>
                        </div>

                        {/* Row 2: Guest Count toggle */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={addon.showGuestCount} onChange={(e) => setAddOns(prev => prev.map((a, i) => i === idx ? { ...a, showGuestCount: e.target.checked } : a))} className="w-4 h-4 accent-primary"/>
                          <span className="text-xs font-medium text-muted-foreground">Enable Guest Count for this add-on</span>
                        </label>

                        {/* Guest customization — only when enabled */}
                        {addon.showGuestCount && (<div className="pt-1">
                            <label className="text-[10px] text-muted-foreground mb-1 block">Guest Label (e.g. guests, plates, persons)</label>
                            <Input placeholder="guests, plates…" maxLength={50} value={addon.guestLabel} onChange={(e) => setAddOns(prev => prev.map((a, i) => i === idx ? { ...a, guestLabel: e.target.value } : a))} className="h-8 text-xs"/>
                          </div>)}
                      </div>))}
                    {addOns.length > 0 && (<p className="text-xs text-muted-foreground">Enable Guest Count to let customers specify quantity (e.g. number of plates, persons)</p>)}
                  </div>
                </div>

                {/* Status / Active */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.active} onChange={(e) => setForm({ ...form, active: e.target.value })} className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                {/* Image upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Service Cover Image (optional)</label>
                  <div className="relative flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/40 p-4 cursor-pointer hover:bg-secondary/70 transition-colors" onClick={() => fileRef.current?.click()}>
                    {imagePreview ? (<img src={imagePreview} alt="preview" className="h-36 w-full object-cover rounded-md"/>) : (<div className="flex flex-col items-center gap-1 text-muted-foreground py-6">
                        <ImageIcon className="h-10 w-10 opacity-40"/>
                        <span className="text-sm font-medium">Click to upload cover image</span>
                        <span className="text-xs opacity-60">JPG, JPEG, PNG, WEBP up to 5MB</span>
                      </div>)}
                    <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageChange}/>
                  </div>
                </div>

                {/* Gallery upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Gallery Images (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {galleryPreviews.map((preview, index) => (<div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden">
                        <img src={preview} alt={`gallery-${index}`} className="w-full h-full object-cover"/>
                        <button onClick={() => removeGalleryImage(index)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-500 hover:text-red-700">
                          <X className="h-3 w-3"/>
                        </button>
                      </div>))}
                    <div className="relative flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/40 p-4 cursor-pointer hover:bg-secondary/70 transition-colors" onClick={() => galleryRef.current?.click()}>
                      <Upload className="h-10 w-10 opacity-40"/>
                      <span className="text-sm font-medium">Click to upload gallery images</span>
                      <span className="text-xs opacity-60">JPG, JPEG, PNG, WEBP up to 5MB each (Max 4 images)</span>
                      <input ref={galleryRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" multiple onChange={handleGalleryUpload}/>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving…</> : (editing ? "Update Service" : "Create Service")}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
              </div>
            </motion.div>
          </div>)}

        {/* Services List */}
        <div className="mt-8">
          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading services…
            </div>) : services.length === 0 ? (<div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-30"/>
              <p className="font-medium">No services yet</p>
              <p className="text-xs mt-1">Click "New Service" to create your first service. Only your services are shown here.</p>
            </div>) : (<div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (<motion.div key={svc._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                  {/* Image */}
                  <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-52">
                    {svc.image ? (<img src={imgSrc(svc.image)} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center text-muted-foreground">
                        <Briefcase className="h-12 w-12 opacity-30"/>
                      </div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                    <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      From {formatCurrency(svc.price)}
                    </span>
                    <span className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-xs font-semibold ${svc.active !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {svc.active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-2 sm:p-5 flex flex-col flex-1">
                    <h3 className="font-display font-semibold text-lg line-clamp-1">{svc.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Tag className="h-3 w-3"/> {svc.category}
                    </p>
                    {svc.highlights?.length > 0 && (<ul className="mt-3 space-y-1">
                        {svc.highlights.slice(0, 2).map((h, i) => (<li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"/>
                            {h}
                          </li>))}
                        {svc.highlights.length > 2 && (<li className="text-xs text-primary font-medium pl-3">+{svc.highlights.length - 2} more</li>)}
                      </ul>)}

                    <div className="flex-1"/>

                    {/* Actions */}
                    <div className="mt-5 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(svc)}>
                        <Pencil className="mr-1 h-3 w-3"/> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" disabled={deleting === svc._id} onClick={() => handleDelete(svc._id)}>
                        {deleting === svc._id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                      </Button>
                    </div>
                  </div>
                </motion.div>))}
            </div>)}
        </div>
      </section>
    </MerchantLayout>);
};
export default MerchantServices;
