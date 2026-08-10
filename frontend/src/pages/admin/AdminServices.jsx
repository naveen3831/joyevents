import { formatCurrency } from "@/lib/utils";
import { Briefcase, Loader2, AlertCircle, Tag, Store } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiListServices } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { useGsapStagger } from "@/lib/gsapAnimations";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const AdminServices = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const gridRef = useGsapStagger([services, loading]);

    const load = async () => {
        try {
            const servicesRes = await apiListServices(token).catch(() => ({ services: [] }));
            setServices(servicesRes.services || []);
        }
        catch { /* silent */ }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            View <span className="text-gradient">Services</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">View all services across every merchant on the platform</p>
        </div>

        {/* Services List */}
        <div>
          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading services…
            </div>) : services.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-30 text-muted-foreground"/>
              <p className="text-muted-foreground">No services found</p>
            </div>) : (<div ref={gridRef} className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {services.map((svc) => {
                return (<button key={svc._id} type="button" onClick={() => navigate(`/admin-dashboard/services/${svc._id}`)} className="group text-left rounded-2xl border border-border bg-card overflow-hidden hover-lift flex flex-col cursor-pointer transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {/* Image */}
                  <div className="relative h-36 sm:h-40 bg-secondary overflow-hidden flex-shrink-0">
                    {svc.image ? (<img src={imgSrc(svc.image)} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                        <Briefcase className="h-10 w-10 opacity-30"/>
                      </div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"/>
                    <span className={`absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm ${svc.active !== false
                    ? "bg-tint-mint text-tint-mint-fg"
                    : "bg-destructive/15 text-destructive"}`}>
                      {svc.active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 sm:p-4 flex flex-col gap-1 flex-1">
                    <p className="font-display font-semibold text-sm sm:text-base line-clamp-1">{svc.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3 shrink-0"/> {svc.category} · <span className="text-foreground font-medium">{formatCurrency(svc.price)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Store className="h-3 w-3 shrink-0"/>
                      <span className="truncate">{svc.createdBy?.name || "Unknown merchant"}</span>
                    </p>
                    {svc.description && (<p className="text-xs text-muted-foreground mt-1 line-clamp-2">{svc.description}</p>)}
                    <div className="mt-auto pt-2 flex justify-end">
                      <span className="text-xs font-medium text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity">View details →</span>
                    </div>
                  </div>
                </button>);
            })}
            </div>)}
        </div>
      </section>
    </AdminLayout>);
};

export default AdminServices;
