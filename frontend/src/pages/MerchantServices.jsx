import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { Briefcase, Trash2, Pencil, Plus, ImageIcon, Loader2, AlertCircle, X, Tag, Upload } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
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
const MerchantServices = ({ layout = "merchant" } = {}) => {
    const PageLayout = layout === "admin" ? AdminLayout : MerchantLayout;
    const { token } = useAuth();
    const navigate = useNavigate();
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
    const gridRef = useGsapStagger([services]);
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
        if (layout === "admin") {
            navigate("/admin-dashboard/my-services/new");
        } else {
            navigate("/merchant-dashboard/services/new");
        }
    };
    const openEdit = (svc) => {
        if (layout === "admin") {
            navigate(`/admin-dashboard/my-services/${svc._id}/edit`);
        } else {
            navigate(`/merchant-dashboard/services/${svc._id}/edit`);
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
    return (<PageLayout>
      <div className="w-full min-w-0 space-y-5 font-sans">
        <PageHeader
          title="My Services"
          subtitle="Manage your service catalog listings — create, edit, and update service details."
          breadcrumbs={[
            { label: "Merchant Portal", to: "/merchant-dashboard" },
            { label: "Events & Services" },
            { label: "My Services" },
          ]}
          actions={
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold h-9 px-3.5">
              <Plus className="mr-1.5 h-4 w-4"/> New Service
            </Button>
          }
        />

        {/* Services List */}
        <div className="mt-8">
          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading services…
            </div>) : services.length === 0 ? (<div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground flex flex-col items-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-30"/>
              <p className="font-medium">No services yet</p>
              <p className="text-xs mt-1 mb-4">Click "New Service" to create your first service. Only your services are shown here.</p>
              <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground hover:opacity-90 min-h-[44px]">
                <Plus className="mr-2 h-4 w-4"/> New Service
              </Button>
            </div>) : (<div ref={gridRef} className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (<div key={svc._id} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                  {/* Image */}
                  <div className="relative overflow-hidden bg-secondary flex-shrink-0 h-[175px] w-full">
                    {svc.image ? (<img src={imgSrc(svc.image)} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                        <Briefcase className="h-12 w-12 opacity-30"/>
                      </div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                    <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      From {formatCurrency(svc.price)}
                    </span>
                    <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-sm ${svc.active !== false ? "bg-green-500/80 text-white" : "bg-red-500/80 text-white"}`}>
                      {svc.active !== false ? "Active" : "Inactive"}
                    </span>
                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                      <button onClick={() => openEdit(svc)} title="Edit service" className="rounded-full bg-black/70 text-white p-2 hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm">
                        <Pencil className="h-4 w-4"/>
                      </button>
                      <button onClick={() => handleDelete(svc._id)} disabled={deleting === svc._id} title="Delete service" className="rounded-full bg-black/70 text-white p-2 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 shadow-sm">
                        {deleting === svc._id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                      </button>
                    </div>
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
                </div>))}
            </div>)}
        </div>
      </div>
    </PageLayout>);
};
export default MerchantServices;
