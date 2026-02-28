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
    "px-4 py-2 rounded-md text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-semibold",
  secondary:
    "px-4 py-2 rounded-md text-sm transition-colors bg-gray-100 hover:bg-gray-200",
  ghost:
    "px-4 py-2 rounded-md text-sm transition-colors",
  outline:
    "px-4 py-2 rounded-md text-sm border-2 transition-all duration-300",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "",
  lg: "px-6 py-3 text-base",
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
          background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
          color: 'white',
        };
      case "secondary":
        return {
          color: 'var(--theme-primary)',
          backgroundColor: '#f3f4f6',
        };
      case "ghost":
        return {
          color: `var(--theme-primary)`,
          backgroundColor: 'transparent',
        };
      case "outline":
        return {
          borderColor: `var(--theme-primary)`,
          color: `var(--theme-primary)`,
          backgroundColor: 'transparent',
        };
      default:
        return {};
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "primary") {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary');
      const secondary = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary');
      e.currentTarget.style.background = `linear-gradient(to right, ${primary}DD, ${secondary}DD)`;
    } else if (variant === "secondary") {
      e.currentTarget.style.backgroundColor = '#e5e7eb';
    } else if (variant === "ghost") {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary');
      e.currentTarget.style.backgroundColor = `${primary}15`;
    } else if (variant === "outline") {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary');
      e.currentTarget.style.backgroundColor = `${primary}15`;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "primary") {
      e.currentTarget.style.background = `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`;
    } else if (variant === "secondary") {
      e.currentTarget.style.backgroundColor = '#f3f4f6';
    } else if (variant === "ghost" || variant === "outline") {
      e.currentTarget.style.backgroundColor = 'transparent';
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
