import { ImageIcon, Loader2, AlertCircle, X, Upload, Plus, ArrowLeft, Sparkles, RotateCw, Check, Info } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import MerchantLayout from "@/components/MerchantLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { apiGetServiceById, apiCreateService, apiUpdateService, apiListCategories, apiCreateCategory, apiGenerateServiceAISuggestions } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

const AdminServiceForm = ({ layout = "admin" } = {}) => {
    const PageLayout = layout === "merchant" ? MerchantLayout : AdminLayout;
    const redirectPath = layout === "merchant" ? "/merchant-dashboard/services" : "/admin-dashboard/my-services";
    const { token } = useAuth();
    const navigate = useNavigate();
    const { id: editingId } = useParams();
    const isEdit = Boolean(editingId);

    const [pageLoading, setPageLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
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

    // AI Modal & Selection States
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiData, setAiData] = useState(null); // { descriptions, highlightSets, vagueNote, serviceName }
    const [selectedDescId, setSelectedDescId] = useState(null);
    const [editedDescText, setEditedDescText] = useState("");
    const [selectedHlId, setSelectedHlId] = useState(null);
    const [editedHlText, setEditedHlText] = useState("");
    const [activeTab, setActiveTab] = useState("descriptions"); // "descriptions" | "highlights"

    const openAISuggestionsModal = async (initialTab = "descriptions") => {
        const serviceName = form.name?.trim();
        if (!serviceName) {
            toast.error("Enter a service name first to generate AI suggestions.");
            return;
        }
        setActiveTab(initialTab);
        setShowAIModal(true);
        if (!aiData || aiData.serviceName !== serviceName) {
            await fetchAISuggestions(serviceName);
        }
    };

    const fetchAISuggestions = async (serviceName = form.name?.trim()) => {
        if (!serviceName) return;
        setAiLoading(true);
        try {
            const res = await apiGenerateServiceAISuggestions({
                serviceName,
                category: form.category || "",
                currentDescription: form.description || "",
                type: "service_content"
            }, token);

            if (res && res.descriptions && res.descriptions.length > 0) {
                setAiData({ ...res, serviceName });
                setSelectedDescId(res.descriptions[0].id);
                setEditedDescText(res.descriptions[0].text);
                if (res.highlightSets && res.highlightSets.length > 0) {
                    setSelectedHlId(res.highlightSets[0].id);
                    setEditedHlText(res.highlightSets[0].items.join(", "));
                }
            } else {
                toast.error("We couldn't generate suggestions right now. Try again or continue manually.");
            }
        } catch (err) {
            toast.error(err?.message || "We couldn't generate suggestions right now. Try again or continue manually.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleApplyDescription = () => {
        if (!editedDescText) return;
        setForm((prev) => ({ ...prev, description: editedDescText }));
        toast.success("Description updated from AI suggestion!");
        setShowAIModal(false);
    };

    const handleApplyHighlights = () => {
        if (!editedHlText) return;
        setForm((prev) => ({ ...prev, highlights: editedHlText }));
        toast.success("Highlights updated from AI suggestion!");
        setShowAIModal(false);
    };

    const handleApplyAll = () => {
        setForm((prev) => ({
            ...prev,
            description: editedDescText || prev.description,
            highlights: editedHlText || prev.highlights
        }));
        toast.success("Applied AI description & highlights to form!");
        setShowAIModal(false);
    };



    useEffect(() => {
        let cancelled = false;
        apiListCategories("service").then((res) => {
            if (cancelled)
                return;
            const dbCategories = res.categories || [];
            const allCategories = Array.from(new Set([
                ...dbCategories.map((c) => c.name),
                "Photography", "Decoration", "Catering", "General", "DJ & Music", "Lighting", "Security", "Venue Hire"
            ]));
            setCategories(allCategories);
        }).catch(() => {});
        if (isEdit) {
            apiGetServiceById(editingId)
                .then((res) => {
                if (cancelled || !res.service)
                    return;
                const svc = res.service;
                const cat = svc.category || "General";
                setCategories((prev) => (cat && !prev.includes(cat) ? [...prev, cat] : prev));
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
                setImagePreview(imgSrc(svc.image));
                setAddOns((svc.addOns || []).map((a) => ({ name: a.name, price: String(a.price), maxQuantity: String(a.maxQuantity || 1), minQuantity: String(a.minQuantity || 1), guestLabel: a.guestLabel || "guests", showGuestCount: a.showGuestCount || false })));
            })
                .catch((e) => { if (!cancelled) setLoadError(e?.message || "Failed to load service"); })
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
            await apiCreateCategory(trimmed, "service", token);
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
            const highlightsArr = form.highlights.split(",").map((h) => h.trim()).filter(Boolean);
            fd.append("highlights", JSON.stringify(highlightsArr));
            const validAddOns = addOns.filter((a) => a.name.trim() && a.price);
            fd.append("addOns", JSON.stringify(validAddOns.map((a) => ({ name: a.name.trim(), price: Number(a.price), maxQuantity: Number(a.maxQuantity) || 1, minQuantity: Number(a.minQuantity) || 1, guestLabel: a.guestLabel || "guests", showGuestCount: a.showGuestCount || false }))));
            fd.append("allowGuests", String(form.allowGuests || false));
            fd.append("maxGuests", String(form.maxGuests || 100));
            if (imageFile)
                fd.append("image", imageFile);
            galleryFiles.forEach((file) => { fd.append("gallery", file); });
            if (isEdit) {
                await apiUpdateService(editingId, fd, token);
                toast.success("Service updated!");
            }
            else {
                await apiCreateService(fd, token);
                toast.success("Service created!");
            }
            navigate(redirectPath);
        }
        catch (e) {
            toast.error(e?.message || "Failed to save service");
        }
        finally {
            setSaving(false);
        }
    };

    if (pageLoading) {
        return (<PageLayout>
        <section className="py-2 sm:py-8 lg:py-10 flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin"/> Loading…
        </section>
      </PageLayout>);
    }

    if (loadError) {
        return (<PageLayout>
        <section className="py-6 sm:py-8 w-full">
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
            {loadError}
          </div>
        </section>
      </PageLayout>);
    }

    return (<PageLayout>
      <section className="py-2 sm:py-6 w-full space-y-6">
        <button onClick={() => navigate(redirectPath)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="h-4 w-4"/> Back to My Services
        </button>

        <h1 className="font-display text-xl sm:text-2xl font-bold mb-1">{isEdit ? "Edit Service" : "Create Service"}</h1>
        <p className="text-sm text-muted-foreground mb-6">{isEdit ? "Update service details" : "Fill in the details to publish your service"}</p>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">Service Name *</label>
                <span className="text-[10px] text-muted-foreground">{(form.name || "").length}/100</span>
              </div>
              <Input placeholder="Enter service name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Price (min ₹1) *</label>
              <Input placeholder="Price (INR)" type="number" min="1" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required/>
            </div>

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

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <button
                    type="button"
                    onClick={() => openAISuggestionsModal("descriptions")}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2.5 py-0.5 rounded-md border border-purple-200/80 dark:border-purple-800/80 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    <span>{form.description?.trim() ? "✨ Improve with AI" : "✨ Generate with AI"}</span>
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground">{(form.description || "").length}/1000</span>
              </div>
              <textarea placeholder="Provide a detailed description of the service..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={1000} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"/>
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">Highlights (comma-separated)</label>
                <span className="text-[10px] text-muted-foreground">{(form.highlights || "").length}/200</span>
              </div>
              <Input placeholder="e.g. Fast delivery, 24/7 support, Premium equipment" maxLength={200} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })}/>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Add-ons (optional)</label>
                <button type="button" onClick={() => setAddOns((prev) => [...prev, { name: "", price: "", maxQuantity: "10", minQuantity: "1", guestLabel: "guests", showGuestCount: false }])} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="h-3 w-3"/> Add option
                </button>
              </div>
              {addOns.length === 0 && (<p className="text-xs text-muted-foreground italic">No add-ons yet. Click "Add option" to add photography, decoration, catering, etc.</p>)}
              <div className="space-y-3">
                {addOns.map((addon, idx) => (<div key={idx} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input placeholder="Add-on name (e.g. Catering)" maxLength={100} value={addon.name} onChange={(e) => setAddOns((prev) => prev.map((a, i) => i === idx ? { ...a, name: e.target.value } : a))}/>
                      </div>
                      <div>
                        <Input placeholder="Price (min ₹1)" type="number" min="1" step="1" value={addon.price} onChange={(e) => setAddOns((prev) => prev.map((a, i) => i === idx ? { ...a, price: e.target.value } : a))} className="w-32"/>
                      </div>
                      <button type="button" onClick={() => setAddOns((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                        <X className="h-4 w-4"/>
                      </button>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={addon.showGuestCount} onChange={(e) => setAddOns((prev) => prev.map((a, i) => i === idx ? { ...a, showGuestCount: e.target.checked } : a))} className="w-4 h-4 accent-primary"/>
                      <span className="text-xs font-medium text-muted-foreground">Enable Guest Count for this add-on</span>
                    </label>

                    {addon.showGuestCount && (<div className="pt-1">
                        <label className="text-[10px] text-muted-foreground mb-1 block">Guest Label (e.g. guests, plates, persons)</label>
                        <Input placeholder="guests, plates…" maxLength={50} value={addon.guestLabel} onChange={(e) => setAddOns((prev) => prev.map((a, i) => i === idx ? { ...a, guestLabel: e.target.value } : a))} className="h-8 text-xs"/>
                      </div>)}
                  </div>))}
                {addOns.length > 0 && (<p className="text-xs text-muted-foreground">Enable Guest Count to let customers specify quantity (e.g. number of plates, persons)</p>)}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select value={form.active} onChange={(e) => setForm({ ...form, active: e.target.value })} className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

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

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Gallery Images (optional)</label>
              <div className="flex flex-wrap gap-2">
                {galleryPreviews.map((preview, index) => (<div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden">
                    <img src={preview} alt={`gallery-${index}`} className="w-full h-full object-cover"/>
                    <button type="button" onClick={() => removeGalleryImage(index)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-500 hover:text-red-700">
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

          <div className="pt-6 mt-4 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl font-semibold" onClick={() => navigate(redirectPath)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow min-h-[44px] px-8 rounded-xl font-semibold" size="lg">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving…</> : (isEdit ? "Update Service" : "Publish Service")}
            </Button>
          </div>
        </form>

        {/* AI Assist Suggestions Modal */}
        <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-purple-100 dark:border-purple-900/50 shadow-2xl">
            <DialogHeader className="p-5 border-b border-border bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent text-left shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>✨ AI Suggestions</span>
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Suggestions for <strong className="text-purple-700 dark:text-purple-300 font-semibold">"{form.name || "Service"}"</strong>
              </DialogDescription>
            </DialogHeader>

            {/* Vague Service Name Warning Note */}
            {aiData?.vagueNote && (
              <div className="mx-5 mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span className="leading-relaxed">{aiData.vagueNote}</span>
              </div>
            )}

            {/* Modal Navigation Tabs */}
            <div className="px-5 pt-3 shrink-0 flex gap-2 border-b border-border bg-card">
              <button
                type="button"
                onClick={() => setActiveTab("descriptions")}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                  activeTab === "descriptions"
                    ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                DESCRIPTION IDEAS ({aiData?.descriptions?.length || 4})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("highlights")}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                  activeTab === "highlights"
                    ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                HIGHLIGHT SETS ({aiData?.highlightSets?.length || 3})
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 max-h-[55vh]">
              {aiLoading ? (
                <div className="py-14 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 dark:text-purple-400" />
                  <p className="text-sm font-semibold text-foreground">
                    ✨ Creating ideas for "{form.name}"...
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Generating 4 unique marketing angles and 3 highlight sets tailored to your service.
                  </p>
                </div>
              ) : activeTab === "descriptions" ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Select an option below. You can preview and edit it before applying to your service description.
                  </p>

                  <div className="grid gap-3">
                    {(aiData?.descriptions || []).map((item) => {
                      const isSelected = selectedDescId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedDescId(item.id);
                            setEditedDescText(item.text);
                          }}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                            isSelected
                              ? "border-purple-600 dark:border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 shadow-sm"
                              : "border-border hover:border-purple-300 dark:hover:border-purple-700 bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {item.style || "Suggested"}
                            </span>
                            <button
                              type="button"
                              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-purple-600 text-white"
                                  : "bg-secondary hover:bg-purple-100 dark:hover:bg-purple-900/50 text-foreground"
                              }`}
                            >
                              {isSelected ? "✓ Selected" : "Select"}
                            </button>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/90 font-normal">
                            {item.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Editable preview for selected description */}
                  {selectedDescId && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>Preview & Edit Selected Description:</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {editedDescText.length}/1000
                        </span>
                      </label>
                      <textarea
                        value={editedDescText}
                        onChange={(e) => setEditedDescText(e.target.value)}
                        rows={4}
                        maxLength={1000}
                        className="w-full rounded-xl border border-purple-200 dark:border-purple-800 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Highlight Sets Tab */
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Choose a service highlight set to display key features on your page.
                  </p>

                  <div className="grid gap-3">
                    {(aiData?.highlightSets || []).map((set, idx) => {
                      const isSelected = selectedHlId === set.id;
                      return (
                        <div
                          key={set.id || idx}
                          onClick={() => {
                            setSelectedHlId(set.id);
                            setEditedHlText(set.items.join(", "));
                          }}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? "border-purple-600 dark:border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 shadow-sm"
                              : "border-border hover:border-purple-300 dark:hover:border-purple-700 bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-foreground">
                              {set.styleName || `SET ${String.fromCharCode(65 + idx)}`}
                            </span>
                            <button
                              type="button"
                              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-purple-600 text-white"
                                  : "bg-secondary hover:bg-purple-100 text-foreground"
                              }`}
                            >
                              {isSelected ? "✓ Selected" : "Use this set"}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {set.items.map((item, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/80">
                                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Editable preview for selected highlights */}
                  {selectedHlId && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <label className="text-xs font-semibold text-foreground">
                        Preview & Edit Selected Highlights (comma-separated):
                      </label>
                      <Input
                        value={editedHlText}
                        onChange={(e) => setEditedHlText(e.target.value)}
                        maxLength={200}
                        className="text-xs border-purple-200 dark:border-purple-800"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aiLoading}
                onClick={() => fetchAISuggestions()}
                className="w-full sm:w-auto text-xs gap-1.5 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium"
              >
                <RotateCw className={`h-3.5 w-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                <span>↻ Generate More</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                {activeTab === "descriptions" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyDescription}
                    disabled={!editedDescText || aiLoading}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 shadow-sm"
                  >
                    Apply Description
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyHighlights}
                    disabled={!editedHlText || aiLoading}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 shadow-sm"
                  >
                    Apply Highlights
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyAll}
                  disabled={!editedDescText || aiLoading}
                  className="text-xs bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold px-4 shadow-glow"
                >
                  Apply All
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </PageLayout>);
};

export default AdminServiceForm;
