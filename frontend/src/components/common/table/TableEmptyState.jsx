import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TableEmptyState = ({
  icon: Icon = Inbox,
  title = "No data found",
  description = "There are no records matching your request.",
  actionLabel,
  onAction,
  colSpan = 6,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-12 w-12 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground mb-3 border border-border">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="bg-gradient-primary text-white rounded-xl text-xs font-semibold">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default TableEmptyState;
