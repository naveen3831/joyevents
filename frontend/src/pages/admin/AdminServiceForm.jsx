import { ImageIcon, Loader2, AlertCircle, X, Upload, Plus, ArrowLeft } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { apiGetServiceById, apiCreateService, apiUpdateService, apiListCategories, apiCreateCategory } from "@/lib/api";
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

const AdminServiceForm = () => {
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
            navigate("/admin-dashboard/my-services");
        }
        catch (e) {
            toast.error(e?.message || "Failed to save service");
        }
        finally {
            setSaving(false);
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
        <button onClick={() => navigate("/admin-dashboard/my-services")} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4">
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
                <label className="text-xs font-medium text-muted-foreground">Description</label>
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

          <div className="flex gap-3 mt-5">
            <Button type="submit" disabled={saving} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving…</> : (isEdit ? "Update Service" : "Create Service")}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admin-dashboard/my-services")} disabled={saving}>Cancel</Button>
          </div>
        </form>
      </section>
    </AdminLayout>);
};

export default AdminServiceForm;
