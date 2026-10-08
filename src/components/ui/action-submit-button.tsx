"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type ActionSubmitButtonProps = ButtonProps & {
  pendingLabel?: string;
};

export function ActionSubmitButton({ children, pendingLabel = "Saving…", disabled, ...props }: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending} {...props}>
      {/* Both states are laid out in one grid cell so the button keeps the width of the wider
          label and does not jump when the form is submitted. */}
      <span className="inline-grid items-center justify-items-center">
        <span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 ${pending ? "invisible" : ""}`}>{children}</span>
        <span aria-hidden={!pending} className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 ${pending ? "" : "invisible"}`}>
          <Loader2 className="size-4 shrink-0 animate-spin" />
          {pendingLabel}
        </span>
      </span>
    </Button>
  );
}
