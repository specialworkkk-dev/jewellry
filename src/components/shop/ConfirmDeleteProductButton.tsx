"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDeleteProductButton({ compact = false }: { compact?: boolean }) {
  return (
    <Button
      type="submit"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon" : "default"}
      title="Delete product"
      className={compact
        ? "h-8 w-8 text-gray-500 hover:text-red-600"
        : "w-full min-h-11 border-red-200 text-red-700 hover:bg-red-50"}
      onClick={(event) => {
        if (!window.confirm("Delete this product permanently? This cannot be undone.")) event.preventDefault();
      }}
    >
      <Trash2 className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
      {!compact && "Delete"}
    </Button>
  );
}
