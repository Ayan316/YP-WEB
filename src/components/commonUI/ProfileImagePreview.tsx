"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import Avatar from "./Avatar";

interface ProfileImagePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  firstName?: string;
  lastName?: string;
}

export default function ProfileImagePreview({
  isOpen,
  onClose,
  imageUrl,
  firstName,
  lastName,
}: ProfileImagePreviewProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || "Profile Image";

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors"
        style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        aria-label="Close preview"
      >
        <X size={22} color="#fff" className="cursor-pointer"/>
      </button>

      {/* Image container — stops click from bubbling to backdrop */}
      <div
        className="relative flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: "min(80vw, 420px)",
            height: "min(80vw, 420px)",
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={fullName}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Avatar
              firstName={firstName}
              lastName={lastName}
              size={Math.min(typeof window !== "undefined" ? window.innerWidth * 0.8 : 420, 420)}
              className="rounded-none! w-full h-full"
            />
          )}
        </div>

        {/* Name label
        {(firstName || lastName) && (
          <p
            className="text-white text-lg font-semibold tracking-wide"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
          >
            {fullName}
          </p>
        )} */}
      </div>
    </div>
  );
}