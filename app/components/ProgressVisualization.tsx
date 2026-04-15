"use client";

import React from "react";
import ProgressBar from "./ui/ProgressBar";

interface ProgressVisualizationProps {
  total: number;
  completed: number;
  percentage: number;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "circular" | "list";
  label?: string;
}

export default function ProgressVisualization({
  total,
  completed,
  percentage,
  showDetails = true,
  size = "md",
  variant = "default",
  label,
}: ProgressVisualizationProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (variant === "circular") {
    const radius = size === "sm" ? 40 : size === "md" ? 50 : 60;
    const strokeWidth = size === "sm" ? 6 : size === "md" ? 8 : 10;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex items-center gap-4">
        <div className="relative inline-flex items-center justify-center">
          <svg
            className="transform -rotate-90"
            width={radius * 2 + strokeWidth}
            height={radius * 2 + strokeWidth}
          >
            <circle
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="text-blue-600 transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold text-gray-900 ${sizeClasses[size]}`}>
              {percentage}%
            </span>
          </div>
        </div>
        {showDetails && (
          <div>
            {label && (
              <p className={`font-semibold text-gray-900 ${sizeClasses[size]}`}>
                {label}
              </p>
            )}
            <p className={`text-gray-600 ${size === "sm" ? "text-xs" : "text-sm"}`}>
              {completed} of {total} completed
            </p>
          </div>
        )}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between mb-2">
            <span className={`font-semibold text-gray-900 ${sizeClasses[size]}`}>
              {label}
            </span>
            <span className={`font-bold text-blue-600 ${sizeClasses[size]}`}>
              {percentage}%
            </span>
          </div>
        )}
        <ProgressBar value={percentage} />
        {showDetails && (
          <div className="flex items-center justify-between">
            <span className={`text-gray-600 ${size === "sm" ? "text-xs" : "text-sm"}`}>
              {completed} completed
            </span>
            <span className={`text-gray-600 ${size === "sm" ? "text-xs" : "text-sm"}`}>
              {total - completed} remaining
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-gray-900 ${sizeClasses[size]}`}>
            {label}
          </span>
          <span className={`font-bold text-blue-600 ${sizeClasses[size]}`}>
            {percentage}%
          </span>
        </div>
      )}
      <ProgressBar value={percentage} />
      {showDetails && (
        <p className={`text-gray-600 ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {completed} of {total} completed
        </p>
      )}
    </div>
  );
}

