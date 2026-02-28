"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      className={`text-sm overflow-hidden ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center flex-wrap gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center min-w-0">
              {index > 0 && (
                <Icon
                  icon="material-symbols:chevron-right"
                  className="w-4 h-4 text-gray-400 mx-1 sm:mx-2 flex-shrink-0"
                />
              )}

              {isLast ? (
                <span className="font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-xs">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 transition-colors truncate max-w-[100px] sm:max-w-xs"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-600 truncate max-w-[100px] sm:max-w-xs">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

