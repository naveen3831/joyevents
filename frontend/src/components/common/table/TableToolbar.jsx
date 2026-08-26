import React from "react";
import { Search, RotateCcw } from "lucide-react";
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
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-card border-border rounded-lg text-xs h-9 shadow-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        )}
        {filters}
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
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
