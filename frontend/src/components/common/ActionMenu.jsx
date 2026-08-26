import React from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const ActionMenu = ({ items = [], align = "end", className = "" }) => {
  if (!items || items.length === 0) return null;

  const normalItems = items.filter((item) => !item.destructive);
  const destructiveItems = items.filter((item) => item.destructive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors ${className}`}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-48 p-1.5 bg-card border-border shadow-md rounded-xl text-foreground z-50"
      >
        {normalItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={idx}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors focus:bg-muted focus:text-foreground ${
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              } ${item.className || ""}`}
            >
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}

        {normalItems.length > 0 && destructiveItems.length > 0 && (
          <DropdownMenuSeparator className="my-1 bg-border/60" />
        )}

        {destructiveItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={idx}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer text-rose-600 dark:text-rose-400 focus:bg-rose-500/10 focus:text-rose-600 ${
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              } ${item.className || ""}`}
            >
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />}
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionMenu;
