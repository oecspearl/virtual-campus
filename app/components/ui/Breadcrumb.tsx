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

/**
 * Breadcrumb that adapts to viewport width:
 * - On mobile: collapses to a single back-arrow link to the parent + the
 *   current page label, so deep routes (course → lesson → discussion → reply)
 *   no longer wrap to multiple lines or truncate every segment to ~100px.
 * - On sm and up: renders the full path with chevron separators and per-item
 *   truncation as before.
 */
export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const last = items[items.length - 1];
  const parent = items.length > 1 ? items[items.length - 2] : null;

  return (
    <nav className={`text-sm ${className}`} aria-label="Breadcrumb">
      {/* Mobile: back-arrow to parent + current page only */}
      <div className="flex items-center gap-1 min-w-0 sm:hidden">
        {parent ? (
          parent.href ? (
            <Link
              href={parent.href}
              className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors flex-shrink-0"
              aria-label={`Back to ${parent.label}`}
            >
              <Icon
                icon="material-symbols:chevron-left"
                className="w-4 h-4"
              />
              <span className="truncate max-w-[140px]">{parent.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-gray-600 flex-shrink-0">
              <Icon
                icon="material-symbols:chevron-left"
                className="w-4 h-4"
              />
              <span className="truncate max-w-[140px]">{parent.label}</span>
            </span>
          )
        ) : null}
        {parent && (
          <Icon
            icon="material-symbols:chevron-right"
            className="w-4 h-4 text-gray-400 mx-0.5 flex-shrink-0"
          />
        )}
        <span className="font-semibold text-gray-900 truncate min-w-0">
          {last.label}
        </span>
      </div>

      {/* sm and up: full path */}
      <ol className="hidden sm:flex items-center flex-wrap gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center min-w-0">
              {index > 0 && (
                <Icon
                  icon="material-symbols:chevron-right"
                  className="w-4 h-4 text-gray-400 mx-2 flex-shrink-0"
                />
              )}

              {isLast ? (
                <span className="font-semibold text-gray-900 truncate max-w-xs">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 transition-colors truncate max-w-xs"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-600 truncate max-w-xs">
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
