"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function DashboardCard({ title, subtitle, children, className }: Props) {
  return (
    <div className={cn("rounded-lg border bg-white/50 p-4 backdrop-blur", className)}>
      <h3 className="text-sm text-gray-900">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      {children && <div className="mt-3 text-sm text-gray-700">{children}</div>}
    </div>
  );
}
