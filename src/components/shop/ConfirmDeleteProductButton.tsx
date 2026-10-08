"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export function ConfirmDeleteProductButton({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon" : "default"}
      title="Delete product"
      disabled={pending}
      aria-busy={pending}
      className={compact
        ? "h-10 w-10 text-gray-500 hover:text-red-600"
        : "w-full min-h-11 gap-2 px-2 border-red-200 text-red-700 hover:bg-red-50"}
      onClick={(event) => {
        if (!window.confirm("Delete this product permanently? This cannot be undone.")) event.preventDefault();
      }}
    >
      {pending ? (
        <Loader2 className={compact ? "h-4 w-4 animate-spin" : "h-4 w-4 animate-spin"} />
      ) : (
        <Trash2 className={compact ? "h-4 w-4" : "h-4 w-4"} />
      )}
      {!compact && (pending ? "Deleting…" : "Delete")}
    </Button>
  );
}
