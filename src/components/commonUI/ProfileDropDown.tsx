"use client";

import * as React from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Image from "next/image";
import Link from "next/link";
import DefaultProfile from "../../../public/profile/default_user_icon.png";
import styles from "../../_assets/style/style.module.css";
import LogOutModal from "./LogOutModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { clearAllListingState } from "@/app/hooks/useListingState";
import Avatar from "./Avatar";
import { useTheme, type ThemePreference, themePreferenceToApi } from "@/context/ThemeContext";
import { Sun, Moon, Monitor, Trash2, AlertCircle, Mail, ShieldCheck } from "lucide-react";
import { createPortal } from "react-dom";
import { Tooltip } from "@mui/material";
import { useUpdateProfile } from "@/app/hooks/useUpdateProfile";
import { buildProfilePreservePayload } from "@/services/profile.services";
import { toast } from "react-toastify";
import ConfirmModal from "./ConfirmModal";
import { deleteAccount } from "@/services/auth.services";
import { useAuthGate } from "@/app/hooks/useAuthGate";


interface ProfileDropdownProps {
  userId?: string;
  profileImage?: string;
  onProfileClick?: () => void;
  onLogoutClick?: () => void;
  onLogout?: () => void;
  setPathname?: (pathname: string) => void;
  userProfile?: any;
}

export default function ProfileDropdown({
  userId,
  profileImage,
  onProfileClick,
  onLogoutClick,
  onLogout,
  setPathname,
  userProfile,
}: ProfileDropdownProps) {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const updateProfileMutation = useUpdateProfile();
  const { ensureAuthed, gateModal: authGateModal } = useAuthGate();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [pendingLogout, setPendingLogout] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTypeDeleteModalOpen, setIsTypeDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [typeDeleteMounted, setTypeDeleteMounted] = useState(false);

  useEffect(() => {
    setTypeDeleteMounted(true);
  }, []);

  const router = useRouter();
  const queryClient = useQueryClient();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    // event.preventDefault();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleClose();
    if (onProfileClick) {
      onProfileClick();
    }

    router.push(`/profile/${userId}`);
    // if (setPathname) {
    //   setPathname(`/profile/${userId}`)
    // }
  };

  // const handleLogoutClick = () => {
  //   // handleClose()
  //   // if (onLogoutClick) {
  //   //   onLogoutClick()
  //   // }
  //   handleClose(); // close dropdown
  //   setIsLogoutOpen(true); // open modal
  // };

  const handleLogoutClick = () => {
    setPendingLogout(true);
    handleClose();
  };

  useEffect(() => {
    if (!anchorEl && pendingLogout) {
      setIsLogoutOpen(true);
      setPendingLogout(false);
    }
  }, [anchorEl, pendingLogout]);

  const handleDeleteAccountClick = () => {
    ensureAuthed("delete your account", () => {
      setPendingDelete(true);
      handleClose();
    });
  };

  useEffect(() => {
    if (!anchorEl && pendingDelete) {
      setIsDeleteModalOpen(true);
      setPendingDelete(false);
    }
  }, [anchorEl, pendingDelete]);

  const handleProceedToTypeDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteConfirmText("");
    setIsTypeDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== "DELETE" || isDeleting) return;

    if (!userId) {
      toast.error("Unable to identify account. Please log in again.");
      return;
    }

    try {
      setIsDeleting(true);

      await deleteAccount(userId);

      toast.success("Account deleted successfully.");

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (logoutErr) {
        console.warn("Post-delete logout cleanup failed:", logoutErr);
      }

      queryClient.clear();
      clearAllListingState();
      await signOut({ redirect: false });

      setIsTypeDeleteModalOpen(false);
      setDeleteConfirmText("");

      router.replace("/auth");
    } catch (err: any) {
      const status = err?.status;
      if (status === 401) {
        toast.error("Your session has expired. Please log in again.");
        queryClient.clear();
        clearAllListingState();
        await signOut({ redirect: false });
        router.replace("/auth");
        return;
      }
      if (status === 404) {
        toast.error(
          "Account deletion is temporarily unavailable. Please contact support."
        );
        return;
      }
      toast.error(err?.message || "Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      /* ---------------- BACKEND LOGOUT ---------------- */
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      /* ---------------- CLEAR TANSTACK CACHE ---------------- */
      queryClient.clear();

      /* ---------------- NEXTAUTH SIGNOUT ---------------- */
      await signOut({
        redirect: false, // prevent double navigation
      });

      /* ---------------- REDIRECT ---------------- */
      router.replace("/auth");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="profile_icon_area_main">
      <Link
        href="#"
        onClick={handleClick}
        className="hover:text-white transition-colors"
      >
        {/* <Image
          src={profileImage || DefaultProfile}
          alt="profile"
          width={80}
          height={80}
          className={styles.profile_image}
        /> */}

        <Avatar
          imageUrl={profileImage || null}
          firstName={userProfile?.data?.first_name}
          lastName={userProfile?.data?.last_name}
          size={58}
          className={`w-full h-full object-cover ${styles.profile_image} cursor-pointer`}
        />
      </Link>

      <Menu
        id="profile-menu"
        elevation={0}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableAutoFocusItem
        disableRestoreFocus
        slotProps={{
          paper: {
            sx: {
              borderRadius: "6px",
              border: "1px solid #A0AEC080",
              mt: 1,
              minWidth: 180,
              color: resolvedTheme === "dark" ? "rgb(55, 65, 81)" : "rgb(55, 65, 81)",
              boxShadow:
                "rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
              backgroundColor: resolvedTheme === "dark" ? "#040f1f" : "#FFF",
              "& .MuiMenu-list": {
                padding: "4px 0",
              },
              "& .MuiMenuItem-root": {
                fontSize: "14px",
                padding: "8px 16px",
                "&:active": {
                  backgroundColor: resolvedTheme === "dark" ? "#040f1f" : "#FFF",
                },
              },
            },
          },
        }}
      >
        <div className={styles.profiledropdown_info_area}>
          <div className={styles.profiledropdown_icon_area}>
            {/* <Image
              src={profileImage || DefaultProfile}
              alt="profile"
              width={58}
              height={58}
              className={styles.profile_image}
            /> */}

            <Avatar
              imageUrl={profileImage || null}
              firstName={userProfile?.data?.first_name}
              lastName={userProfile?.data?.last_name}
              size={50}
              className={`w-full h-full object-cover ${styles.profile_image} cursor-pointer`}
            />
          </div>
          <div className={styles.profiledropdown_name_area}>
            <h3>{userProfile?.data?.full_name}</h3>
            {/* <p>{userProfile?.data?.college}</p>
            <div className={styles.profiledropdown_skills_area}>
              <p>{userProfile?.data?.skills?.join(' | ')}</p>
            </div> */}
          </div>
        </div>
        <Divider
          sx={{ my: 0.5 }}
          style={{ background: "#A3A3A3", margin: "10px 0px" }}
        />

        {/* Appearance Section */}
        <div style={{ padding: "4px 0px 0" }}>

          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#a0aec0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "flex-start",
              marginBottom: "12px",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 24 24"><path fill={resolvedTheme === "light" ? "#040F1F" : "#a0aec0"} d="M12 22c5.523 0 10-4.477 10-10c0-.463-.694-.54-.933-.143a6.5 6.5 0 1 1-8.924-8.924C12.54 2.693 12.463 2 12 2C6.477 2 2 6.477 2 12s4.477 10 10 10"/></svg>
            <span style={{ color: resolvedTheme === "light" ? "#040F1F" : "#a0aec0" }}>Appearance</span>
          </span>
        </div>
        {(["light", "dark", "system"] as ThemePreference[]).map((opt) => {
          const isActive = preference === opt;
          const activeColor = resolvedTheme === "light" ? "#040F1F" : "#fff";
          const inactiveColor = resolvedTheme === "light" ? "#888888" : " rgb(160, 174, 192)  ";
          const itemColor = isActive ? activeColor : inactiveColor;
          return (
          <MenuItem
            key={opt}
            className={`menuItem appearance_item ${isActive ? "active" : ""}`}
            onClick={() => {
              ensureAuthed("update your profile", () => {
                setPreference(opt);
                // Backend update-profile is full-replace; sending only
                // `theme_setting` would wipe phone/name/location/etc. Send the
                // cached profile snapshot with theme_setting overridden so the
                // rest of the user's data stays intact server-side.
                updateProfileMutation.mutate(
                  buildProfilePreservePayload(userProfile?.data, {
                    theme_setting: themePreferenceToApi(opt),
                  }),
                );
                toast.success("Theme updated successfully");
              });
            }}
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "8px",
              color: `${itemColor} !important`,
              fontWeight: isActive ? 600 : 400,
              fontSize: "14px",
            }}
          >
            <span style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
              {opt === "system" ? (
                <Monitor size={16} color={itemColor} />
              ) : opt === "light" ? (
                <Sun size={16} color={itemColor} />
              ) : opt === "dark" ? (
                <Moon size={16} color={itemColor} />
              ) : null}
            </span>
            <span style={{ color: itemColor, fontWeight: isActive ? 600 : 400 }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</span>
            {isActive && (
              <span style={{ marginLeft: 8, fontWeight: 600 }}><span style={{ color: activeColor }}>&#10003;</span></span>
            )}
          </MenuItem>
          );
        })}

 
        {/* <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#a0aec0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "flex-start",
              marginBottom: "12px",
              cursor: "pointer",
            }}
            onClick={() => { handleClose(); router.push("/blocked-users"); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 12 12"><path fill={resolvedTheme === "light" ? "#040F1F" : "#a0aec0"} d="M12 6A6 6 0 1 1 0 6a6 6 0 0 1 12 0m-1.5 0a4.5 4.5 0 0 0-.832-2.607L3.393 9.668A4.5 4.5 0 0 0 10.5 6M8.607 2.332a4.5 4.5 0 0 0-6.275 6.275z"></path></svg>
            <span style={{ color: resolvedTheme === "light" ? "#040F1F" : "#a0aec0" }}>Blocked Users</span>
          </span> */}

        <Divider
          sx={{ my: 0.5 }}
          style={{ background: "#A3A3A3", margin: "10px 0px" }}
        />

        {/* Contact Us / Privacy Policy navigation */}
        <MenuItem
          onClick={() => {
            handleClose();
            router.push("/contact-us");
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: `${resolvedTheme === "light" ? "#040F1F" : "#a0aec0"} !important`,
            fontWeight: 500,
            fontSize: "14px",
          }}
        >
          <Mail size={16} color={resolvedTheme === "light" ? "#040F1F" : "#a0aec0"} />
          <span style={{ color: resolvedTheme === "light" ? "#040F1F" : "#a0aec0" }}>
            Contact Us
          </span>
        </MenuItem>

        {/* <MenuItem
          onClick={() => {
            handleClose();
            router.push("/privacy-policy");
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: `${resolvedTheme === "light" ? "#040F1F" : "#a0aec0"} !important`,
            fontWeight: 500,
            fontSize: "14px",
          }}
        >
          <ShieldCheck size={16} color={resolvedTheme === "light" ? "#040F1F" : "#a0aec0"} />
          <span style={{ color: resolvedTheme === "light" ? "#040F1F" : "#a0aec0" }}>
            Privacy Policy
          </span>
        </MenuItem> */}

        <Divider
          sx={{ my: 0.5 }}
          style={{ background: "#A3A3A3", margin: "10px 0px" }}
        />

        <MenuItem
          onClick={handleDeleteAccountClick}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#EF4444 !important",
            fontWeight: 500,
            fontSize: "14px",
          }}
        >
          <Trash2 size={16} color="#EF4444" />
          <span style={{ color: "#EF4444" }}>Delete Account</span>
        </MenuItem>

        <Divider
          sx={{ my: 0.5 }}
          style={{ background: "#A3A3A3", margin: "10px 0px" }}
        />

        <div className={styles.profiledropdown_info_area}>
          {/* <Link href={`/profile/${userId}`}> */}
          <MenuItem
            className={resolvedTheme === "light" ? "light-save-btn" : "menuItem view_profile_btn"}
            onClick={handleProfileClick}
            // href={`/profile/${userId}`}
          >
            View Profile
          </MenuItem>
         
          {/* <Divider sx={{ my: 0.5 }} style={{background: '#A3A3A3', margin: '10px 0px'}} /> */}
          <Link href="#">
            <MenuItem
             className={resolvedTheme === "light" ? "light-save-btn" : "menuItem view_profile_btn"}
              onClick={handleLogoutClick}
            >
              {/* <LogOut className='w-4 h-4 mr-3 text-gray-600' /> */}
              Log Out
            </MenuItem>
          </Link>
        </div>
      </Menu>

      <LogOutModal
        isOpen={isLogoutOpen}
        title="Log out"
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
        confirmText="Logout"
        cancelText="Cancel"
      >
        Are you sure you want to log out?
      </LogOutModal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleProceedToTypeDelete}
        title="Delete Account"
        message="This will permanently delete your account and all associated data. This action cannot be undone."
        confirmText="Continue"
        cancelText="Cancel"
      />

      {typeDeleteMounted && isTypeDeleteModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{
              zIndex: 9999,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => {
              if (!isDeleting) {
                setIsTypeDeleteModalOpen(false);
                setDeleteConfirmText("");
              }
            }}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                if (deleteConfirmText !== "DELETE" || isDeleting) return;
                handleConfirmDelete();
              }}
              style={{
                width: "90%",
                maxWidth: 420,
                background: resolvedTheme === "light" ? "#ffffff" : "#0B172A",
                border:
                  resolvedTheme === "light"
                    ? "1px solid rgba(0,0,0,0.08)"
                    : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "9999px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "2px solid rgba(239, 68, 68, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertCircle size={30} color="#EF4444" strokeWidth={2.5} />
                </div>
              </div>

              <h2
                style={{
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: resolvedTheme === "light" ? "#040F1F" : "#ffffff",
                  marginBottom: 8,
                }}
              >
                Type DELETE to confirm
              </h2>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: resolvedTheme === "light" ? "#555" : "#a0aec0",
                  marginBottom: 18,
                }}
              >
                This is your last chance. Type DELETE in capital letters to
                permanently remove your account.
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) =>
                  setDeleteConfirmText(e.target.value.toUpperCase())
                }
                placeholder="DELETE"
                disabled={isDeleting}
                autoFocus
                autoCapitalize="characters"
                spellCheck={false}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background:
                    resolvedTheme === "light" ? "#f5f7fa" : "rgba(255,255,255,0.04)",
                  border:
                    resolvedTheme === "light"
                      ? "1px solid #d1d5db"
                      : "1px solid rgba(255,255,255,0.12)",
                  color: resolvedTheme === "light" ? "#040F1F" : "#ffffff",
                  fontSize: 14,
                  letterSpacing: 1,
                  outline: "none",
                  marginBottom: 18,
                  textTransform: "uppercase",
                }}
              />

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDeleting) {
                      setIsTypeDeleteModalOpen(false);
                      setDeleteConfirmText("");
                    }
                  }}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 9999,
                    background:
                      resolvedTheme === "light" ? "#e5e7eb" : "rgba(255,255,255,0.06)",
                    color: resolvedTheme === "light" ? "#040F1F" : "#ffffff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isDeleting ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 9999,
                    background:
                      deleteConfirmText === "DELETE"
                        ? "#DC2626"
                        : "rgba(220, 38, 38, 0.45)",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor:
                      deleteConfirmText === "DELETE" && !isDeleting
                        ? "pointer"
                        : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid rgba(255,255,255,0.5)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "confirmSpin 0.7s linear infinite",
                        }}
                      />
                      Deleting...
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </button>
              </div>
              <style>{`
                @keyframes confirmSpin { to { transform: rotate(360deg); } }
              `}</style>
            </form>
          </div>,
          document.body
        )}

      {authGateModal}
    </div>
  );
}
