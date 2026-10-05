"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

// Keeps fast navigations visually clean. Feedback appears only when a route
// takes long enough that the user genuinely needs confirmation.
export function NavPendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span className="ml-auto inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <Loader2
        className={`h-3.5 w-3.5 animate-spin transition-opacity ${pending ? "delay-150 duration-75 opacity-60" : "delay-0 duration-0 opacity-0"}`}
      />
    </span>
  );
}
