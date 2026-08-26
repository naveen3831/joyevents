import { formatCurrency } from "@/lib/utils";
import { Briefcase, Loader2, AlertCircle, Tag, Store, Mail, Phone, Sparkles, ArrowLeft } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiGetServiceById } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const AdminServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiGetServiceById(id)
            .then((res) => { if (!cancelled) setService(res.service || null); })
            .catch((e) => { if (!cancelled) { setError(e?.message || "Failed to load service"); toast.error(e?.message || "Failed to load service"); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    return (
        <AdminLayout>
            <section className="w-full max-w-[1050px] mx-auto pt-4 sm:pt-6 pb-12 px-4 sm:px-6">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4 cursor-pointer"
                >
                    <ArrowLeft className="h-3.5 w-3.5"/> Back to Services
                </button>

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-xs">
                        <Loader2 className="h-5 w-5 animate-spin text-primary"/> Loading service details…
                    </div>
                ) : error || !service ? (
                    <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
                        <p className="text-sm font-semibold">{error || "Service not found."}</p>
                        <div className="mt-4">
                            <Link to="/admin-dashboard/services" className="text-primary text-xs font-semibold hover:underline">
                                Go back to Services
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        {/* Hero Image Section */}
                        <div className="relative h-56 sm:h-[320px] w-full overflow-hidden bg-secondary">
                            {service.image ? (
                                <img src={imgSrc(service.image)} alt={service.name} className="h-full w-full object-cover"/>
                            ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                                    <Briefcase className="h-14 w-14 opacity-30"/>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"/>
                            
                            {/* Status Badge */}
                            <span className={`absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
                                service.active !== false
                                    ? "bg-tint-mint text-tint-mint-fg"
                                    : "bg-destructive/15 text-destructive"
                            }`}>
                                {service.active !== false ? "Active" : "Inactive"}
                            </span>

                            {/* Category & Title */}
                            <div className="absolute bottom-5 left-6 right-6">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground mb-2">
                                    <Tag className="h-3 w-3"/> {service.category}
                                </span>
                                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                                    {service.name}
                                </h1>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 sm:p-8 space-y-6 text-sm">
                            {/* Offered By Section */}
                            <div className="rounded-xl border border-border bg-secondary/40 px-5 py-4 space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-0.5">
                                    <Store className="h-3.5 w-3.5"/> Offered By
                                </p>
                                <p className="font-semibold text-foreground text-base leading-tight">
                                    {service.createdBy?.name || "Unknown merchant"}
                                </p>
                                {service.createdBy?.email && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5"/>
                                        {service.createdBy.email}
                                    </p>
                                )}
                                {service.createdBy?.mobile && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5"/>
                                        {service.createdBy.mobile}
                                    </p>
                                )}
                            </div>

                            {/* Description Section */}
                            {service.description && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Description
                                    </p>
                                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                        {service.description}
                                    </p>
                                </div>
                            )}

                            {/* Price Card */}
                            <div className="rounded-lg border border-border p-3.5 w-fit bg-secondary/20">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    Price
                                </p>
                                <p className="text-primary font-bold text-base">
                                    {formatCurrency(service.price)}
                                </p>
                            </div>

                            {/* Highlights Section */}
                            {service.highlights?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5"/> Highlights
                                    </p>
                                    <ul className="space-y-1.5">
                                        {service.highlights.map((h, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block shrink-0"/>
                                                {h}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Add-ons Section */}
                            {service.addOns?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Add-ons
                                    </p>
                                    <div className="space-y-1.5 max-w-xl">
                                        {service.addOns.map((a, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs bg-secondary/10">
                                                <span className="font-medium text-foreground">{a.name}</span>
                                                <span className="text-primary font-semibold">{formatCurrency(a.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </AdminLayout>
    );
};

export default AdminServiceDetail;
