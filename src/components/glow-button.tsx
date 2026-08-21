"use client";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";

export const GlowButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "madder", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "hover:shadow-[0_0_20px_rgba(212,160,23,0.3)]",
          "hover:scale-[1.02] active:scale-[0.98]",
          className,
        )}
        {...props}
      />
    );
  },
);
GlowButton.displayName = "GlowButton";
