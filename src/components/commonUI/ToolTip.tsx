"use client";

import React from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "top-right";
  width?: string;
  className?: string; // NEW
}

export default function Tooltip({
  content,
  children,
  position = "top",
  width = "w-64",
  className = "",
}: TooltipProps) {
  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    "top-right": "bottom-full left-full mb-2 ml-2",
  };

  return (
    <div className="relative inline-flex group">
      {children}

      <div
        className={`login-tooltip absolute ${positionClasses[position]} ${width}
          rounded-lg bg-black text-white text-sm p-3 shadow-lg
          opacity-0 scale-95 pointer-events-none
          group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto
          group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto
          transition-all duration-200 z-50
          ${className}`}
      >
        {content}
      </div>
    </div>
  );
}
