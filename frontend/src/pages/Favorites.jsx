import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Trash2, Calendar, Briefcase, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetFavorites, apiRemoveFavorite } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;
const Favorites = () => {
    const { token, role } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const loadFavorites = async () => {
        try {
            const res = await apiGetFavorites(token);
            setFavorites(res.favorites || []);
        }
        catch {
            toast.error("Failed to load favorites");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadFavorites();
    }, [token]);
    const handleRemove = async (favoriteId) => {
        try {
            await apiRemoveFavorite(favoriteId, token);
            setFavorites(prev => prev.filter(f => f._id !== favoriteId));
            toast.success("Removed from favorites");
        }
        catch {
            toast.error("Failed to remove");
        }
    };
    return (role === "customer" ? (<CustomerLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-7 w-7 text-primary fill-primary"/>
            <h1 className="font-display text-3xl font-bold">My <span className="text-gradient">Favorites</span></h1>
          </div>

          {loading ? (<div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading...
            </div>) : favorites.length === 0 ? (<div className="py-20 text-center border border-border rounded-xl bg-card">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-30"/>
              <p className="text-muted-foreground">No favorites yet. Save events or services you love!</p>
              <div className="flex gap-3 justify-center mt-4">
                <Link to="/customer-dashboard/browse-events"><Button variant="outline">Browse Events</Button></Link>
                <Link to="/customer-dashboard/browse-services"><Button variant="outline">Browse Services</Button></Link>
              </div>
            </div>) : (<div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((fav, idx) => {
                const item = fav.type === "event" ? fav.event : fav.service;
                if (!item)
                    return null;
                const isEvent = fav.type === "event";
                const href = isEvent ? `/customer-dashboard/events/${item._id}` : `/customer-dashboard/services/${item._id}`;
                const title = isEvent ? item.title : item.name;
                const price = item.price;
                const image = imgSrc(item.image);
                const category = item.category;
                return (<motion.div key={fav._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-xl border border-border bg-card overflow-hidden hover-lift group">
                    <div className="relative h-44 overflow-hidden bg-secondary">
                      {image ? (<img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center text-muted-foreground">
                          {isEvent ? <Calendar className="h-10 w-10 opacity-30"/> : <Briefcase className="h-10 w-10 opacity-30"/>}
                        </div>)}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                      <span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {isEvent ? "Event" : "Service"}
                      </span>
                      <button onClick={() => handleRemove(fav._id)} className="absolute top-3 right-3 rounded-full bg-black/60 p-2 hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{category}</p>
                      <h3 className="font-display font-semibold text-base">{title}</h3>
                      {isEvent && item.datetime && (<p className="text-xs text-muted-foreground mt-1">{new Date(item.datetime).toLocaleDateString()}</p>)}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(price)}</span>
                        <Link to={href}>
                          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">View</Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>);
            })}
            </div>)}
        </div>
      </section>
    </CustomerLayout>) : (<Layout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          <p className="text-muted-foreground">Please log in as a customer to view favorites.</p>
        </div>
      </section>
    </Layout>));
};
export default Favorites;
