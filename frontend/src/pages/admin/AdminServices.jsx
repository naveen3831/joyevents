import { formatCurrency } from "@/lib/utils";
import { Briefcase, Eye, Store, Tag, Plus } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import ActionMenu from "@/components/common/ActionMenu";
import TableToolbar from "@/components/common/table/TableToolbar";
import StatusBadge from "@/components/common/table/StatusBadge";
import DataTable, { TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import TableEmptyState from "@/components/common/table/TableEmptyState";
import TableSkeleton from "@/components/common/table/TableSkeleton";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiListServices } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";

const imgSrc = (image) => (!image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`);

const AdminServices = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = async () => {
    try {
      const servicesRes = await apiListServices(token).catch(() => ({ services: [] }));
      setServices(servicesRes.services || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));

  const filteredServices = services.filter((svc) => {
    const matchesSearch =
      search === "" ||
      svc.name.toLowerCase().includes(search.toLowerCase()) ||
      (svc.createdBy?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (svc.category || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "all" || svc.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const hasActiveFilters = search.trim() !== "" || categoryFilter !== "all";

  return (
    <AdminLayout>
      <PageHeader
        title="All Platform Services"
        subtitle="Manage services and availability listed by merchants on the platform."
        breadcrumbs={[{ label: "Admin Portal" }, { label: "Services" }]}
        actions={
          <Button
            size="sm"
            onClick={() => navigate("/admin-dashboard/my-services/new")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold h-9 px-3.5"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Service
          </Button>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by service name, category, provider..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch("");
          setCategoryFilter("all");
        }}
        filters={
          categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )
        }
      />

      {loading ? (
        <TableSkeleton columns={6} rows={6} />
      ) : filteredServices.length === 0 ? (
        <DataTable minWidth="100%">
          <TableBody>
            <TableRow>
              <TableCell colSpan={6}>
                <TableEmptyState
                  title="No services found"
                  description="No services match your current filter or search criteria."
                  actionLabel="Clear Filters"
                  onAction={() => {
                    setSearch("");
                    setCategoryFilter("all");
                  }}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </DataTable>
      ) : (
        <DataTable minWidth="100%">
          <TableHeader>
            <TableHeaderCell className="w-[32%]">Service</TableHeaderCell>
            <TableHeaderCell className="w-[20%]">Category</TableHeaderCell>
            <TableHeaderCell className="w-[20%]">Merchant Provider</TableHeaderCell>
            <TableHeaderCell className="w-[14%]">Price</TableHeaderCell>
            <TableHeaderCell className="w-[10%]">Status</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[4%]">Actions</TableHeaderCell>
          </TableHeader>
          <TableBody>
            {filteredServices.map((svc) => {
              const image = imgSrc(svc.image);
              return (
                <TableRow key={svc._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/60 flex items-center justify-center">
                        {image ? (
                          <img src={image} alt={svc.name} className="h-full w-full object-cover" />
                        ) : (
                          <Briefcase className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate max-w-[240px]">
                          {svc.name}
                        </p>
                        {svc.description && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[240px]">
                            {svc.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium border border-border/40">
                      <Tag className="h-3 w-3 opacity-60" /> {svc.category || "General"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[150px]">{svc.createdBy?.name || "Merchant"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">
                    {formatCurrency(svc.price)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={svc.active !== false ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell align="right">
                    <ActionMenu
                      items={[
                        {
                          label: "View Service",
                          icon: Eye,
                          onClick: () => navigate(`/admin-dashboard/services/${svc._id}`),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}
    </AdminLayout>
  );
};

export default AdminServices;
