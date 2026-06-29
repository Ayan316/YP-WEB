import React from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import Avatar from "../commonUI/Avatar";
import { useTheme } from "@/context/ThemeContext";

interface SharedUser {
  id: string;
  first_name?: string;
  last_name?: string;
  about?: string;
  profile_image_url?: string;
  type?: string;
}

interface SharedListModalProps {
  sharedList: SharedUser[];
  currentUserId?: string;
  onClose: () => void;
}

const SharedListModal: React.FC<SharedListModalProps> = ({
  sharedList,
  currentUserId,
  onClose,
}) => {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const handleUserClick = (sharedUser: SharedUser) => {
    onClose();
    const path =
      sharedUser.id === currentUserId
        ? `/profile/${sharedUser.id}`
        : `/user/${sharedUser.id}`;
    router.push(path);
  };

  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center"
      style={{
        background: isLight ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl p-6 max-w-sm w-full mx-4"
        style={{
          background: isLight
            ? "#fff"
            : " #040f1f url(/_next/static/media/gradient-bg.512ca683.png) 50%/cover no-repeat",
          border: isLight
            ? "1px solid #E8EEFE"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isLight
            ? "0 24px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)"
            : "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 transition-colors ${
            isLight
              ? "text-gray-400 hover:text-gray-700"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <X className="w-5 h-5 cursor-pointer" />
        </button>

        {/* Title */}
        <h2
          className="text-lg font-semibold text-center mb-4"
          style={{ color: isLight ? "#040F1F" : "#fff" }}
        >
          Reposted By
        </h2>

        {/* User List */}
        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {sharedList.length === 0 ? (
            <p
              className="text-sm text-center py-4"
              style={{ color: isLight ? "#888888" : "#9ca3af" }}
            >
              No reposts yet
            </p>
          ) : (
            [...sharedList].sort((a, b) => {
              if (a.id === currentUserId) return -1;
              if (b.id === currentUserId) return 1;
              return 0;
            }).map((sharedUser, index) => (
              <div
                key={sharedUser.id || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 8px",
                  borderBottom:
                    index < sharedList.length - 1
                      ? isLight
                        ? "1px solid #E8EEFE"
                        : "1px solid rgba(255,255,255,0.06)"
                      : "none",
                  cursor: "pointer",
                  borderRadius: "8px",
                  transition: "background 0.15s",
                }}
                onClick={() => handleUserClick(sharedUser)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isLight
                    ? "#F4F6FF"
                    : "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                {/* Avatar */}
                <Avatar
                  imageUrl={sharedUser.profile_image_url}
                  firstName={sharedUser.first_name}
                  lastName={sharedUser.last_name}
                  size={40}
                />

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: isLight ? "#040F1F" : "#fff",
                      fontSize: "14px",
                      fontWeight: 500,
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sharedUser.first_name || ""} {sharedUser.last_name || ""}
                    {sharedUser.id === currentUserId && (
                      <span
                        style={{
                          color: "#fff",
                          background: "rgb(32, 189, 255)",
                          padding: "4px 6px",
                          fontSize: "10px",
                          marginLeft: "8px",
                          borderRadius: "4px",
                        }}
                      >
                        Me
                      </span>
                    )}
                  </p>
                  {sharedUser.about && (
                    <p
                      style={{
                        color: isLight ? "#888888" : "#8899a6",
                        fontSize: "12px",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {sharedUser.about}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isLight ? "#A0AEC0" : "#8899a6"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedListModal;
