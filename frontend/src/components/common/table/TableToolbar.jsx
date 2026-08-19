import React from "react";
import { Search, Filter, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const TableToolbar = ({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onClearFilters,
  hasActiveFilters,
  actions,
  className = "",
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-card border-border rounded-xl text-xs sm:text-sm h-10 shadow-2xs"
            />
          </div>
        )}
        {filters}
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-10 px-3 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Clear Filters
          </Button>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default TableToolbar;
