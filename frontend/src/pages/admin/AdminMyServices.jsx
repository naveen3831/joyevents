import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Briefcase, Trash2, Pencil, Plus, ImageIcon, Loader2, AlertCircle, Tag } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiListMyServices, apiDeleteService } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const AdminMyServices = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    const load = async () => {
        try {
            const servicesRes = await apiListMyServices(token).catch(() => ({ services: [] }));
            setServices(servicesRes.services || []);
        }
        catch { /* silent */ }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

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

    const gridRef = useGsapStagger([services, loading]);

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              My <span className="text-gradient">Services</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your own services — create, edit, and delete only what you own</p>
          </div>
          <Button onClick={() => navigate("/admin-dashboard/my-services/new")} className="bg-gradient-primary text-primary-foreground hover:opacity-90 min-h-[44px]">
            <Plus className="mr-2 h-4 w-4"/> New Service
          </Button>
        </motion.div>

        <div className="mt-8">
          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading services…
            </div>) : services.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-30"/>
              <p className="text-muted-foreground font-medium">No services yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click "New Service" to create your first service. Only your services are shown here.</p>
            </div>) : (<div ref={gridRef} className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (<div key={svc._id} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-card transition-all">
                  <div className="relative overflow-hidden bg-secondary flex-shrink-0 h-[175px] w-full">
                    {svc.image ? (<img src={imgSrc(svc.image)} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                        <Briefcase className="h-12 w-12 opacity-30"/>
                      </div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                    <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      From {formatCurrency(svc.price)}
                    </span>
                    <span className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-xs font-semibold ${svc.active !== false ? "bg-tint-mint text-tint-mint-fg" : "bg-destructive/15 text-destructive"}`}>
                      {svc.active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 flex flex-col flex-1">
                    <h3 className="font-display font-semibold text-sm sm:text-base line-clamp-1">{svc.name}</h3>
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

                    <div className="mt-5 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/admin-dashboard/my-services/${svc._id}/edit`)}>
                        <Pencil className="mr-1 h-3 w-3"/> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleting === svc._id} onClick={() => handleDelete(svc._id)}>
                        {deleting === svc._id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                      </Button>
                    </div>
                  </div>
                </div>))}
            </div>)}
        </div>
      </section>
    </AdminLayout>);
};

export default AdminMyServices;
