import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Briefcase, Loader2, AlertCircle, Tag } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListServices } from "@/lib/api";
import { API_URL } from "@/lib/config";
const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;
const AdminServices = () => {
    const { token } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const load = async () => {
        try {
            const res = await apiListServices(token);
            setServices(res.services || []);
        }
        catch { /* silent */ }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
              View <span className="text-gradient">Services</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">View all services created by merchants (read-only)</p>
          </div>
        </motion.div>

        {/* Services List */}
        <div className="mt-8">
          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading services…
            </div>) : services.length === 0 ? (<div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-30"/>
              <p className="font-medium">No services found</p>
            </div>) : (<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((svc) => (<motion.div key={svc._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
                  {/* Image */}
                  <div className="relative h-40 bg-secondary">
                    {svc.image ? (<img src={imgSrc(svc.image)} alt={svc.name} className="h-full w-full object-cover"/>) : (<div className="flex h-full items-center justify-center text-muted-foreground">
                        <Briefcase className="h-10 w-10 opacity-30"/>
                      </div>)}
                    <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold ${svc.active !== false
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"}`}>
                      {svc.active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-1 flex-1">
                    <p className="font-display font-semibold text-sm">{svc.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3"/> {svc.category} · <span className="text-foreground font-medium">{formatCurrency(svc.price)}</span>
                    </p>
                    {svc.description && (<p className="text-xs text-muted-foreground mt-1 line-clamp-2">{svc.description}</p>)}
                    {svc.highlights?.length > 0 && (<ul className="mt-2 space-y-0.5">
                        {svc.highlights.slice(0, 3).map((h, i) => (<li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-1 w-1 rounded-full bg-primary inline-block shrink-0"/>
                            {h}
                          </li>))}
                      </ul>)}
                  </div>
                </motion.div>))}
            </div>)}
        </div>
      </section>
    </AdminLayout>);
};
export default AdminServices;
