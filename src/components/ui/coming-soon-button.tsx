"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

export function ComingSoonButton({ children, onClick, ...props }: ButtonProps) {
  const handleClick: NonNullable<ButtonProps["onClick"]> = (e) => {
    alert("This premium feature is currently in Beta and will be unlocked for your account in the next major update!");
    onClick?.(e);
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}
