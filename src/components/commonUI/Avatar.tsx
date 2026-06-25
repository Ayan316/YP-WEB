"use client";

import Image from "next/image";

type Props = {
  imageUrl?: string | null;
  firstName?: string;
  lastName?: string;
  size?: number; // px
  className?: string;
  onClick?: () => void;
};

const AVATAR_COLORS = [
  "rgba(160, 174, 192, 0.2)",
  "#1C99B8",
  "#1D7952",
  "#FA8D1B",
  "#D82F11",
  "#473CA2",
  "#D81B60",
  "#8E24AA",
  "#3C778F",
  "#829208",
];

export default function Avatar({
  imageUrl,
  firstName,
  lastName,
  size = 80,
  className = "",
  onClick,
}: Props) {
  const getInitials = () => {
    const first = firstName?.trim();
    const last = lastName?.trim();

    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    if (last) return last[0].toUpperCase();
    return "";
  };

  const getAvatarColor = () => {
    const nameString = `${firstName || ""}${lastName || ""}`;
    if (!nameString) return AVATAR_COLORS[0];

    let hash = 0;
    for (let i = 0; i < nameString.length; i++) {
      hash = nameString.charCodeAt(i) + ((hash << 5) - hash);
    }

    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  // If the caller sizes the avatar via className (e.g. "w-full h-full"),
  // skip the inline width/height for that axis so the parent controls it.
  const widthFromClass = /\bw-full\b/.test(className);
  const heightFromClass = /\bh-full\b/.test(className);

  if (imageUrl) {
    return (
      <div
        className={`relative rounded-full overflow-hidden ${className} ${onClick ? "cursor-pointer" : ""}`}
        style={{
          ...(widthFromClass ? {} : { width: size }),
          ...(heightFromClass ? {} : { height: size }),
        }}
        onClick={onClick}
      >
        <Image
          src={imageUrl}
          alt="Avatar"
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-center rounded-full text-white font-semibold select-none ${className} ${onClick ? "cursor-pointer" : ""}`}
      style={{
        ...(widthFromClass ? {} : { width: size }),
        ...(heightFromClass ? {} : { height: size }),
        backgroundColor: getAvatarColor(),
        fontSize: size * 0.4,
        lineHeight: 2,
      }}
    >
      {getInitials()}
    </div>
  );
}