import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TableEmptyState = ({
  icon: Icon = Inbox,
  title = "No data found",
  description = "There are no records matching your request.",
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3 border border-border/60">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-medium h-8 px-3"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default TableEmptyState;
