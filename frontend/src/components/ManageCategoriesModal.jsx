import { useState, useEffect } from "react";
import { X, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { apiListCategories, apiCreateCategory, apiDeleteCategory } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
const ManageCategoriesModal = ({ type, onClose, onCategoriesChanged }) => {
    const [categories, setCategories] = useState([]);
    const [newCat, setNewCat] = useState("");
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const { token } = useAuth();
    const loadCategories = async () => {
        try {
            setLoading(true);
            const res = await apiListCategories(type);
            setCategories(res.categories || []);
        }
        catch (e) {
            toast.error(e.message || "Failed to load categories");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadCategories();
    }, [type]);
    const handleAdd = async () => {
        if (!newCat.trim())
            return;
        try {
            setAdding(true);
            await apiCreateCategory(newCat.trim(), type, token);
            toast.success("Category created");
            setNewCat("");
            await loadCategories();
            onCategoriesChanged();
        }
        catch (e) {
            toast.error(e.message || "Failed to create category");
        }
        finally {
            setAdding(false);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this category?"))
            return;
        try {
            await apiDeleteCategory(id, token);
            toast.success("Category deleted");
            await loadCategories();
            onCategoriesChanged();
        }
        catch (e) {
            toast.error(e.message || "Failed to delete category");
        }
    };
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" onClick={onClose}>
                    <X className="h-5 w-5"/>
                </button>
                <h3 className="font-display text-xl font-bold mb-4 capitalize">Manage {type} Categories</h3>

                <div className="flex gap-2 mb-6">
                    <Input placeholder="New category name..." value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()}/>
                    <Button onClick={handleAdd} disabled={adding || !newCat.trim()} className="shrink-0 bg-primary">
                        {adding ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4 mr-1"/>} Add
                    </Button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {loading ? (<div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>) : categories.length === 0 ? (<div className="text-center text-muted-foreground text-sm p-4 border border-dashed rounded-lg">No categories yet.</div>) : (categories.map(cat => (<div key={cat._id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50">
                                <span className="font-medium text-sm">{cat.name}</span>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(cat._id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>)))}
                </div>
            </div>
        </div>);
};
export default ManageCategoriesModal;
