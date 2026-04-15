"use client";

import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const styles: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors",
  secondary:
    "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors bg-gray-50 hover:bg-gray-100 text-slate-700",
  ghost:
    "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-50",
  outline:
    "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border border-gray-200 transition-colors hover:bg-gray-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "",
  lg: "px-5 py-2.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  icon,
  iconPosition = "right",
  ...props
}: ButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: 'var(--theme-primary)',
          color: 'white',
        };
      case "outline":
        return {
          borderColor: `color-mix(in srgb, var(--theme-primary) 30%, #d1d5db)`,
          color: `var(--theme-primary)`,
        };
      default:
        return {};
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "primary") {
      e.currentTarget.style.backgroundColor = `color-mix(in srgb, var(--theme-primary) 85%, black)`;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "primary") {
      e.currentTarget.style.backgroundColor = `var(--theme-primary)`;
    }
  };

  return (
    <button
      className={cn(styles[variant], size !== "md" && sizeStyles[size], className)}
      style={getButtonStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {icon && iconPosition === "left" && (
        <span className="mr-2 inline-flex items-center">{icon}</span>
      )}
      {children}
      {icon && iconPosition === "right" && (
        <span className="ml-2 inline-flex items-center">{icon}</span>
      )}
    </button>
  );
}
