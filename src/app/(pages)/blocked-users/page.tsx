"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchBlockedUsers, unblockUser } from "@/services/moderation.services";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import Avatar from "@/components/commonUI/Avatar";
import connStyles from "@/moduleCss/connection.module.css";
import Image from "next/image";
import PeopleIcon from "@/_assets/icons/header_icons/famicons_people.svg";
import ProfileCardsmall from "@/components/commonUI/ProfileCardsmall";
import ConnectionCardSkeleton from "@/components/commonUI/loaders/skeletons/ConnectionCard";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import ConnectionPageSkeleton from "@/components/commonUI/loaders/skeletons/ConnectionPageSkeleton";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { isUnauthenticatedError } from "@/lib/authError";

export default function BlockedUsersPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const qc = useQueryClient();
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile();

  const { data, isLoading } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: () => fetchBlockedUsers(1, 50),
  });

  const blockedUsers: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : data?.data?.blocked_users ?? data?.blocked_users ?? [];

  const handleUnblock = (userId: string, userName: string) =>
    ensureAuthed("unblock this user", async () => {
      setUnblockingId(userId);
      try {
        await unblockUser(userId);
        toast.success(`${userName} has been unblocked.`);
        qc.invalidateQueries({ queryKey: ["blocked-users"] });
      } catch (err) {
        if (isUnauthenticatedError(err)) openGate("unblock this user");
        else toast.error("Failed to unblock. Please try again.");
      } finally {
        setUnblockingId(null);
      }
    });

  if (userProfileLoading) {
    return (
      <div>
        <ConnectionPageSkeleton />
      </div>
    );
  }

  return (
    <div
      className={`container mx-auto px-4 ${connStyles.connectionlisting_main_section_wrapper}`}
    >
      <div
        className="flex mt-6 max-content-height flex-wrap -mx-2"
        style={{ height: "100%" }}
      >
        {/* ============ SIDEBAR ============ */}
        <div className="col-lg-4 full-width-midium" style={{ height: "100%" }}>
          <aside className={connStyles.sidebar_main_section}>
            <ProfileCardsmall />
          </aside>
        </div>

        {/* ============ MAIN CONTENT ============ */}
        <div className="col-lg-8 full-width-midium" style={{ height: "100%" }}>
          <main className={connStyles.connectionlisting_main_section}>
            <div className={connStyles.connectionlisting_main_section_header}>
              <div className="col-lg-6">
                <h1
                  className={connStyles.connectionlisting_main_section_title}
                  style={isLight ? { color: "#040F1F" } : undefined}
                >
                  Blocked Users
                </h1>
              </div>
            </div>

            <div className={connStyles.connectionlisting_connection_list_container}>
              <div className={connStyles.connectionlisting_connection_list}>
                {isLoading ? (
                  <div className="overflow-hidden relative space-y-2">
                    <div className="full-width-midium relative overflow-hidden">
                      <ConnectionCardSkeleton />
                    </div>
                    <div className="full-width-midium relative overflow-hidden">
                      <ConnectionCardSkeleton />
                    </div>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div
                    className="text-center"
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "20px 0" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 24 24"><path fill="none" stroke={isLight ? "#040F1F" : "rgb(144 161 185)"} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m8 12l3 3l5-7M4 11.252c0 7.687 6.918 10.387 7.887 10.728q.113.04.226 0C13.084 21.65 20 19.018 20 11.253V4.304a.4.4 0 0 0-.303-.389l-7.6-1.903a.4.4 0 0 0-.194 0l-7.6 1.903A.4.4 0 0 0 4 4.304z"></path></svg>
                    <p style={{ color: isLight ? "#040F1F" : "rgb(144 161 185)", margin: 0 }}>
                      No blocked users
                    </p>
                    <p style={{ color: isLight ? "#888888" : "rgb(144 161 185)", margin: 0, fontSize: 13 }}>
                      Users you block will appear here. <br /> You can unblock them at any time.
                    </p>
                  </div>
                ) : (
                  blockedUsers.map((u: any) => {
                    const userId = u.id || u._id;
                    const fullName =
                      u.full_name ||
                      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                      "Unknown User";

                    return (
                      <div
                        key={userId}
                        className={`${connStyles.connectionlisting_connection_item}`}
                      >
                        <div className={connStyles.connectionlisting_connection_item_main}>
                          {/* Avatar */}
                          <div className={connStyles.connectionlisting_connection_item_logo}>
                            <Avatar
                              imageUrl={u.profile_image_url || null}
                              firstName={u.first_name}
                              lastName={u.last_name}
                              className={`w-full h-full object-cover ${connStyles.connection_avatar} cursor-pointer`}
                            />
                          </div>

                          {/* Info */}
                          <div className={connStyles.connectionlisting_connection_item_content}>
                            <h4
                              className={connStyles.connectionlisting_connection_item_name}
                              style={isLight ? { color: "#040F1F" } : undefined}
                            >
                              {fullName}
                            </h4>
                          </div>

                          {/* Unblock Button */}
                          <div className={connStyles.connectionlisting_connection_item_btns}>
                            <button
                              className={isLight ? "light-applied-btn" : "apply-btn"}
                              disabled={unblockingId === userId}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnblock(userId, fullName);
                              }}
                              style={{ opacity: unblockingId === userId ? 0.6 : 1 }}
                            >
                              {unblockingId === userId ? "Unblocking…" : "Unblock"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {authGateModal}
    </div>
  );
}
