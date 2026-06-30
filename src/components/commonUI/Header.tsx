"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "../../_assets/style/style.module.css";
import Logo from "../../../public/images/YPLogo.png";

import headerlogo from "../../_assets/icons/header_icons/ion_home-outline.svg";
import connectionlogo from "../../_assets/icons/header_icons/ion_people-outline.svg";
import Companylogo from "../../_assets/icons/header_icons/clarity_building-line.svg";
import Notificationlogo from "../../_assets/icons/header_icons/tabler_bell.svg";
import Jobslogo from "../../_assets/icons/header_icons/ion_briefcase-outline.svg";
import JobslogoActive from "../../_assets/icons/header_icons/ion_briefcase.svg";
import NotificationlogoActive from "../../_assets/icons/header_icons/bitcoin-icons_bell-filled.svg";
import CompanylogoActive from "../../_assets/icons/header_icons/clarity_building-solid.svg";
import connectionlogoActive from "../../_assets/icons/header_icons/famicons_people.svg";
import headerlogoActive from "../../_assets/icons/header_icons/ion_home.svg";
import messageLogo from "../../_assets/icons/header_icons/message.svg";
import messageLogoActive from "../../_assets/icons/header_icons/messageactive.svg";
import DarkLogo from "../../../public/images/lightmodeYp_logo.png";
import LightHomeLogo from "../../_assets/icons/header_icons/home_outline_light.svg";
import LightJobsLogo from "../../_assets/icons/header_icons/briefcase_outline_light.svg";
import LightConnectionLogo from "../../_assets/icons/header_icons/people_outline_light.svg";
import LightCompanyLogo from "../../_assets/icons/header_icons/company_outline_light.svg";
import LightNotificationLogo from "../../_assets/icons/header_icons/notification_outline_light.svg";
import LightMessageLogo from "../../_assets/icons/header_icons/message_outline_light.svg";
import LightHomeLogoActive from "../../_assets/icons/header_icons/home_filled_light.svg";
import LightJobsLogoActive from "../../_assets/icons/header_icons/briefcase_filled_light.svg";
import LightConnectionLogoActive from "../../_assets/icons/header_icons/people_filled_light.svg";
import LightCompanyLogoActive from "../../_assets/icons/header_icons/company_filled_light.svg";
import LightNotificationLogoActive from "../../_assets/icons/header_icons/notification_filled_light.svg";
import LightMessageLogoActive from "../../_assets/icons/header_icons/message_filled_light.svg";
import EventslogoActive from "../../_assets/icons/header_icons/event-filled.svg";
import Eventslogo from "../../_assets/icons/header_icons/event-unfill.svg";
import LightEventsLogo from "../../_assets/icons/header_icons/event_outline_light.svg";
import LightEventsLogoActive from "../../_assets/icons/header_icons/event_filled_light.svg";
import Resourceslogo from "../../_assets/icons/header_icons/resources-dark.svg";
import ResourceslogoActive from "../../_assets/icons/header_icons/resources-active-dark.svg";
import LightResourcesLogo from "../../_assets/icons/header_icons/resources.svg";
import LightResourcesLogoActive from "../../_assets/icons/header_icons/resources-active.svg";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useHasSession } from "@/app/hooks/useHasSession";
import { authUrlWithCallback } from "@/lib/callbackUrl";
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Divider,
  Box,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ProfileDropDown from "./ProfileDropDown";
import Avatar from "./Avatar";
import ProfileImagePreview from "./ProfileImagePreview";
import LogOutModal from "./LogOutModal";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useUpdateProfile } from "@/app/hooks/useUpdateProfile";
import { buildProfilePreservePayload } from "@/services/profile.services";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import useDebounce from "@/app/hooks/useDebounce";
import path from "path";
import { useHasUnseenMessages } from "@/app/hooks/hasUnseenMessages";
import { useHasPendingConnections } from "@/app/hooks/hasPendingConnections";
import { useHasUnseenNotifications } from "@/app/hooks/hasUnseenNotifications";
import { useTheme as useAppTheme, type ThemePreference, themePreferenceToApi } from "@/context/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { clearAllListingState } from "@/app/hooks/useListingState";
import { Sun, Moon, Monitor, User as UserIcon, Settings as SettingsIcon, LogOut as LogOutIcon, ChevronDown, Trash2, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";
import ConfirmModal from "./ConfirmModal";
import { deleteAccount } from "@/services/auth.services";
import { useAuthGate } from "@/app/hooks/useAuthGate";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export default function Header() {
  const { data: session, status: sessionStatus } = useSession();
  const { data: hasSession } = useHasSession();
  const [cookieUser, setCookieUser] = useState<any>(null);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [appearanceExpanded, setAppearanceExpanded] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTypeDeleteModalOpen, setIsTypeDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typeDeleteMounted, setTypeDeleteMounted] = useState(false);

  useEffect(() => {
    setTypeDeleteMounted(true);
  }, []);

  const router = useRouter();
  const currentPathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const queryClient = useQueryClient();
  const updateProfileMutation = useUpdateProfile();
  const { ensureAuthed, gateModal: authGateModal } = useAuthGate();

  const hasUnseenMessages = useHasUnseenMessages();
  const { preference, resolvedTheme, setPreference } = useAppTheme();
  const isLight = resolvedTheme === "light";

  // Anonymous-only Day/Night toggle. Logged-in users manage the theme from the
  // Settings → Appearance menu (which persists to the backend). For anonymous
  // visitors this is a frontend-only switch — `setPreference` flips the `dark`
  // class on <html> and stores the choice in the theme_settings cookie. No API
  // call is involved; on login the backend's theme_setting overwrites it.
  const toggleAnonTheme = () => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  };

  const getNormalizedPath = (path: string | null) => {
    if (!path) return "/home";
    if (path.startsWith("/jobs")) return "/jobs";
    if (path.startsWith("/company")) return "/company";
    if (path.startsWith("/events")) return "/events";
    if (path.startsWith("/booking")) return "/events";
    if (path.startsWith("/resources")) return "/resources";
    return path;
  };

  const normalizedPath = getNormalizedPath(currentPathname);
  const [pathname, setPathname] = React.useState(normalizedPath);

  const { hasPending: hasPendingConnections } = useHasPendingConnections(normalizedPath === "/connections");
  const { hasUnseen: hasUnseenNotifications, unreadCount: unreadNotificationCount } = useHasUnseenNotifications();
  const notificationBadgeLabel = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);

  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile();

  const user_id = userProfile?.data?.id;
  const user = userProfile?.data;

  // Auth signal — mirrors useAuthGate.tsx exactly (do NOT invent a new
  // mechanism). ORs the three signals so neither login path is missed.
  const isAuthenticated =
    sessionStatus === "authenticated" ||
    hasSession === true ||
    !!userProfile?.data?.id;
  // While the signals are still loading we don't yet KNOW the user is anonymous.
  const isResolving = sessionStatus === "loading" && hasSession === undefined;
  const showAvatarSkeleton = isResolving || (isAuthenticated && userProfileLoading);

  // Build the auth URL (already carries ?callbackUrl=<safe-path> when worth
  // preserving) and append the tab param. Same helper pattern as useAuthGate.
  const authUrlWithTab = (tab: "login" | "signup") => {
    const url = authUrlWithCallback("/auth");
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}tab=${tab}`;
  };

  const navRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [indicatorAnimate, setIndicatorAnimate] = useState(false);

  // Navigation items configuration
  const navigationItems = [
    {
      path: "/home",
      label: "Home",
      icon: isLight ? LightHomeLogo : headerlogo,
      activeIcon: isLight ? LightHomeLogoActive : headerlogoActive,
    },
    // {
    //   path: "/connections",
    //   label: "Connections",
    //   icon: isLight ? LightConnectionLogo : connectionlogo,
    //   activeIcon: isLight ? LightConnectionLogoActive : connectionlogoActive,
    // },
    {
      path: "/company",
      label: "Company",
      icon: isLight ? LightCompanyLogo : Companylogo,
      activeIcon: isLight ? LightCompanyLogoActive : CompanylogoActive,
    },
    {
      path: "/notifications",
      label: "Notifications",
      icon: isLight ? LightNotificationLogo : Notificationlogo,
      activeIcon: isLight ? LightNotificationLogoActive : NotificationlogoActive,
    },
    {
      path: "/jobs",
      label: "Jobs",
      icon: isLight ? LightJobsLogo : Jobslogo,
      activeIcon: isLight ? LightJobsLogoActive : JobslogoActive,
    },
    {
      path: "/events",
      label: "Events",
      icon: isLight ? LightEventsLogo : Eventslogo,
      activeIcon: isLight ? LightEventsLogoActive : EventslogoActive,
    },
    {
      path: "/resources",
      label: "Resources",
      icon: isLight ? LightResourcesLogo : Resourceslogo,
      activeIcon: isLight ? LightResourcesLogoActive : ResourceslogoActive,
    },
    // {
    //   path: "/messages",
    //   label: "Messages",
    //   icon: isLight ? LightMessageLogo : messageLogo,
    //   activeIcon: isLight ? LightMessageLogoActive : messageLogoActive,
    // },
  ];

  // Notifications is account-only: show it while authenticated, and keep it
  // visible while the auth signal is still resolving (anti-flicker). Hide it
  // only when the visitor is definitively anonymous.
  const showNotifications = isAuthenticated || isResolving;
  const visibleNavItems = showNotifications
    ? navigationItems
    : navigationItems.filter((i) => i.path !== "/notifications");

  useEffect(() => {
    if (normalizedPath) {
      setPathname(normalizedPath);
    }
  }, [normalizedPath]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/get-user");
      const json = await res.json();
      if (json?.user) {
        console.log("User found:", json.user);
        setCookieUser(json.user);
      }
    })();
  }, []);

  const displayName =
    session?.user?.name || cookieUser?.full_name || cookieUser?.name || "";

  const userId = session?.user?.id || cookieUser?.id || "";

  useEffect(() => {
    if (currentPathname !== "/jobs") {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!debouncedSearchQuery.trim()) {
      router.push("/jobs");
      setIsSearching(false);
      return;
    }

    if (debouncedSearchQuery.trim().length < 2) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(() => {
      router.push(`/jobs?q=${encodeURIComponent(debouncedSearchQuery)}`);
      setIsSearching(false);
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [debouncedSearchQuery, currentPathname, router]);

  useIsomorphicLayoutEffect(() => {
    const updateIndicator = () => {
      const activeRef = navRefs.current[pathname];
      const container = navContainerRef.current;

      if (activeRef && container) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeRef.getBoundingClientRect();

        setIndicatorStyle({
          left: activeRect.left - containerRect.left,
          width: activeRect.width,
        });
      }
    };

    updateIndicator();

    // The first measurement can run before web fonts / nav icons finish
    // loading; once the labels reflow to their final width the indicator would
    // otherwise stay under the wrong item. Recompute when fonts are ready and
    // whenever the nav container's layout changes.
    let raf = 0;
    let enableRaf = 0;
    const enableAnimation = () => {
      enableRaf = requestAnimationFrame(() => setIndicatorAnimate(true));
    };
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        raf = requestAnimationFrame(() => {
          updateIndicator();
          enableAnimation();
        });
      });
    } else {
      enableAnimation();
    }

    const container = navContainerRef.current;
    const ro =
      container && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateIndicator())
        : null;
    if (ro && container) ro.observe(container);

    window.addEventListener("resize", updateIndicator);

    return () => {
      window.removeEventListener("resize", updateIndicator);
      if (ro) ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (enableRaf) cancelAnimationFrame(enableRaf);
    };
  }, [pathname, isLight, visibleNavItems.length]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    setPathname(path);
    setMobileOpen(false);
    router.push(path);
  };

  const handleDrawerAvatarClick = () => {
    setImagePreviewOpen(true);
  };

  const handleDrawerProfileClick = () => {
    if (!user_id) return;
    setMobileOpen(false);
    setSettingsExpanded(false);
    router.push(`/profile/${user_id}`);
  };

  const handleDeleteAccountClick = () => {
    ensureAuthed("delete your account", () => {
      setMobileOpen(false);
      setSettingsExpanded(false);
      setAppearanceExpanded(false);
      setIsDeleteModalOpen(true);
    });
  };

  const handleProceedToTypeDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteConfirmText("");
    setIsTypeDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== "DELETE" || isDeleting) return;

    if (!user_id) {
      toast.error("Unable to identify account. Please log in again.");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccount(user_id);
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

  const handleDrawerLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      queryClient.clear();
      clearAllListingState();
      await signOut({ redirect: false });
      router.replace("/auth");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  };

  // Mobile drawer content
  const drawer = (
    <Box
      sx={{
        height: "100%",
        background: isLight
          ? "linear-gradient(180deg, #ffffff 0%, #f0f4f8 100%)"
          : "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
        color: isLight ? "#1a1a2e" : "white",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderBottom: isLight
            ? "1px solid rgba(0, 0, 0, 0.1)"
            : "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {isAuthenticated ? (
          <Box
            sx={{ p: 2, cursor: "pointer" }}
            onClick={handleDrawerAvatarClick}
            aria-label="View profile picture"
          >
            <Avatar
              imageUrl={user?.profile_image_url || null}
              firstName={user?.first_name}
              lastName={user?.last_name}
              size={58}
              className={`object-cover ${styles.profile_image}`}
            />
          </Box>
        ) : (
          // Anonymous / resolving: no profile avatar — keep the logo spot.
          <Box sx={{ p: 2 }}>
            <Image src={isLight ? DarkLogo : Logo} alt="logo" width={70} height={40} />
          </Box>
        )}
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            color: isLight ? "#1a1a2e" : "white",
            "&:hover": {
              background: isLight
                ? "rgba(0, 0, 0, 0.05)"
                : "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <List sx={{ px: 1, py: 2 }}>
        {visibleNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: "8px",
                py: 1.5,
                px: 2,
                background:
                  pathname === item.path
                    ? "linear-gradient(90deg, rgba(84, 51, 255, 0.2) 0%, rgba(32, 189, 255, 0.2) 100%)"
                    : "transparent",
                border:
                  pathname === item.path
                    ? "1px solid rgba(84, 51, 255, 0.3)"
                    : "1px solid transparent",
                transition: "all 0.3s ease",
                "&:hover": {
                  background:
                    pathname === item.path
                      ? "linear-gradient(90deg, rgba(84, 51, 255, 0.3) 0%, rgba(32, 189, 255, 0.3) 100%)"
                      : isLight
                        ? "rgba(0, 0, 0, 0.05)"
                        : "rgba(255, 255, 255, 0.05)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, position: "relative" }}>
                <Image
                  src={pathname === item.path ? item.activeIcon : item.icon}
                  alt={item.label}
                  width={24}
                  height={24}
                />
                {item.path === "/messages" && hasUnseenMessages && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                     backgroundColor: isLight ? "#356FEE" : "#20BDFF",
                      border: isLight
                        ? "1.5px solid #ffffff"
                        : "1.5px solid #1a1a2e",
                    }}
                  />
                )}
                {item.path === "/connections" && hasPendingConnections && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                     backgroundColor: isLight ? "#356FEE" : "#20BDFF",
                      border: isLight
                        ? "1.5px solid #ffffff"
                        : "1.5px solid #1a1a2e",
                    }}
                  />
                )}
                {item.path === "/notifications" && hasUnseenNotifications && (
                  <span
                    aria-label={`${unreadNotificationCount} unread notifications`}
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 18,
                      height: 18,
                      padding: unreadNotificationCount > 9 ? "0 5px" : 0,
                      borderRadius: 9,
                      backgroundColor: "#FF3B30",
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1,
                      boxSizing: "border-box",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {notificationBadgeLabel}
                  </span>
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  "& .MuiListItemText-primary": {
                    fontWeight: pathname === item.path ? 600 : 400,
                    fontSize: "16px",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}

        {/* Account area — authenticated only. Anonymous users get Login /
            Sign Up actions instead (rendered after this block). While the auth
            signal resolves we render neither to avoid flicker. */}
        {isAuthenticated && (
          <>
        {/* Profile */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={handleDrawerProfileClick}
            sx={{
              borderRadius: "8px",
              py: 1.5,
              px: 2,
              transition: "all 0.3s ease",
              "&:hover": {
                background: isLight
                  ? "rgba(0, 0, 0, 0.05)"
                  : "rgba(255, 255, 255, 0.05)",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <UserIcon size={22} color={isLight ? "#040F1F" : "#a0aec0"} />
            </ListItemIcon>
            <ListItemText
              primary="Profile"
              sx={{
                "& .MuiListItemText-primary": {
                  fontWeight: 400,
                  fontSize: "16px",
                  color: isLight ? "#040F1F" : "#a0aec0",
                },
              }}
            />
          </ListItemButton>
        </ListItem>

        {/* Settings (collapsible) */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setSettingsExpanded((prev) => !prev)}
            sx={{
              borderRadius: "8px",
              py: 1.5,
              px: 2,
              transition: "all 0.3s ease",
              "&:hover": {
                background: isLight
                  ? "rgba(0, 0, 0, 0.05)"
                  : "rgba(255, 255, 255, 0.05)",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon size={22} color={isLight ? "#040F1F" : "#a0aec0"} />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              sx={{
                "& .MuiListItemText-primary": {
                  fontWeight: 400,
                  fontSize: "16px",
                  color: isLight ? "#040F1F" : "#a0aec0",
                },
              }}
            />
            <ChevronDown
              size={18}
              color={isLight ? "#040F1F" : "#a0aec0"}
              style={{
                transition: "transform 0.2s ease",
                transform: settingsExpanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </ListItemButton>
        </ListItem>

        {settingsExpanded && (
          <Box sx={{ pl: 3, pb: 1 }}>
            {/* Appearance (collapsible) */}
            <ListItem disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                onClick={() => setAppearanceExpanded((prev) => !prev)}
                sx={{
                  borderRadius: "8px",
                  py: 1,
                  px: 2,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Sun size={16} color={isLight ? "#040F1F" : "#a0aec0"} />
                </ListItemIcon>
                <ListItemText
                  primary="Appearance"
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: 400,
                      fontSize: "14px",
                      color: isLight ? "#040F1F" : "#a0aec0",
                    },
                  }}
                />
                <ChevronDown
                  size={16}
                  color={isLight ? "#040F1F" : "#a0aec0"}
                  style={{
                    transition: "transform 0.2s ease",
                    transform: appearanceExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </ListItemButton>
            </ListItem>

            {appearanceExpanded && (
              <Box sx={{ pl: 3 }}>
                {(["light", "dark", "system"] as ThemePreference[]).map((opt) => {
                  const isActive = preference === opt;
                  const activeColor = isLight ? "#040F1F" : "#fff";
                  const inactiveColor = isLight ? "#888888" : "#a0aec0";
                  const itemColor = isActive ? activeColor : inactiveColor;
                  const Icon = opt === "light" ? Sun : opt === "dark" ? Moon : Monitor;
                  const label = opt === "system" ? "System Default" : opt.charAt(0).toUpperCase() + opt.slice(1);
                  return (
                    <ListItem key={opt} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemButton
                        onClick={() => {
                          ensureAuthed("update your profile", () => {
                            setPreference(opt);
                            // Backend update-profile is full-replace — if we only
                            // send `theme_setting`, every other field (phone,
                            // name, location, …) is wiped. Re-send the cached
                            // profile snapshot with theme_setting overridden so
                            // nothing else changes server-side.
                            updateProfileMutation.mutate(
                              buildProfilePreservePayload(user, {
                                theme_setting: themePreferenceToApi(opt),
                              }),
                            );
                            toast.success("Theme updated successfully");
                          });
                        }}
                        sx={{
                          borderRadius: "8px",
                          py: 0.75,
                          px: 2,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Icon size={14} color={itemColor} />
                        </ListItemIcon>
                        <ListItemText
                          primary={label}
                          sx={{
                            "& .MuiListItemText-primary": {
                              fontWeight: isActive ? 600 : 400,
                              fontSize: "13px",
                              color: itemColor,
                            },
                          }}
                        />
                        {isActive && (
                          <span style={{ color: activeColor, fontWeight: 600 }}>&#10003;</span>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </Box>
            )}

            {/* Delete Account */}
            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                onClick={handleDeleteAccountClick}
                sx={{
                  borderRadius: "8px",
                  py: 1,
                  px: 2,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: isLight
                      ? "rgba(239, 68, 68, 0.08)"
                      : "rgba(239, 68, 68, 0.15)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Trash2 size={16} color={isLight ? "#DC2626" : "#EF4444"} />
                </ListItemIcon>
                <ListItemText
                  primary="Delete Account"
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: 500,
                      fontSize: "14px",
                      color: isLight ? "#DC2626" : "#EF4444",
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>

            {/* Log Out */}
            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  setMobileOpen(false);
                  setSettingsExpanded(false);
                  setAppearanceExpanded(false);
                  setLogoutConfirmOpen(true);
                }}
                sx={{
                  borderRadius: "8px",
                  py: 1,
                  px: 2,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LogOutIcon size={16} color={isLight ? "#040F1F" : "#a0aec0"} />
                </ListItemIcon>
                <ListItemText
                  primary="Log out"
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: 400,
                      fontSize: "14px",
                      color: isLight ? "#040F1F" : "#a0aec0",
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Box>
        )}
          </>
        )}

        {/* Anonymous: replace the account/profile actions with Login / Sign Up.
            Hidden while the auth signal is still resolving (neither branch). */}
        {!isAuthenticated && !isResolving && (
          <Box sx={{ px: 2, pt: 1 }}>
            {/* Day/Night toggle — frontend only, no API (anonymous visitors) */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={toggleAnonTheme}
                sx={{
                  borderRadius: "8px",
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    background: isLight
                      ? "rgba(0, 0, 0, 0.05)"
                      : "rgba(255, 255, 255, 0.05)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {isLight ? (
                    <Moon size={20} color="#040F1F" />
                  ) : (
                    <Sun size={20} color="#FFD54A" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={isLight ? "Dark mode" : "Light mode"}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: 400,
                      fontSize: "16px",
                      color: isLight ? "#040F1F" : "#a0aec0",
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                router.push(authUrlWithTab("login"));
              }}
              className={
                isLight
                  ? 'light-apply-btn w-full header-auth-btn'
                  : `light-apply-btn w-full header-auth-btn`
              }
            >
              Login
            </button>
          </Box>
        )}
      </List>

      {/* <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", mx: 2 }} />

      <Box sx={{ p: 2 }}>
        <ProfileDropDown
          onLogout={() => {
            setIsLogoutOpen(true);
            setMobileOpen(false);
          }}
          userId={user_id}
          profileImage={user?.profile_image_url}
          setPathname={setPathname}
          userProfile={userProfile}
        />
      </Box> */}
    </Box>
  );

  return (
    <>
      <header
        className={`${styles.header_area_main} sticky top-0 z-50  ${
          isScrolled ? styles.headerScrolled : ""
        } `}
      >
        <div className={`${styles.header_area} container mx-auto px-4`}>
          <div
            className={`${styles.border_bottom_header} flex h-16 items-center justify-between `}
          >
            <div className={styles.logo_area_main}>
              <Link href="/" className="text-lg font-semibold text-white">
                <Image src={isLight ? DarkLogo : Logo} alt="logo" width={70} height={40} />
              </Link>
            </div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="">
                <nav
                  ref={navContainerRef}
                  className={styles.navigation_area_main}
                >
                  {visibleNavItems.map((item) => (
                    <Link
                      key={item.path}
                      ref={(el) => {
                        navRefs.current[item.path] = el;
                      }}
                      href={item.path}
                      onClick={() => setPathname(item.path)}
                      className="hover:text-white transition-colors title-flex"
                    >
                      {/* <Image
                        src={
                          pathname === item.path ? item.activeIcon : item.icon
                        }
                        alt={item.label}
                        width={22}
                        height={26}
                      /> */}

                      <div
                        style={{ position: "relative", display: "inline-flex" }}
                      >
                        <Image
                          src={
                            pathname === item.path ? item.activeIcon : item.icon
                          }
                          alt={item.label}
                          width={24}
                          height={24}
                          style={{ width: 24, height: 24, objectFit: "contain" }}
                        />
                        {item.path === "/messages" && hasUnseenMessages && (
                          <span
                            style={{
                              position: "absolute",
                              top: -3,
                              right: -3,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                             backgroundColor: isLight ? "#356FEE" : "#20BDFF",
                              border: isLight
                                ? "1.5px solid #ffffff"
                                : "1.5px solid #0f0f1a",
                            }}
                          />
                        )}
                        {item.path === "/connections" && hasPendingConnections && (
                          <span
                            style={{
                              position: "absolute",
                              top: -3,
                              right: -3,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                             backgroundColor: isLight ? "#356FEE" : "#20BDFF",
                              border: isLight
                                ? "1.5px solid #ffffff"
                                : "1.5px solid #0f0f1a",
                            }}
                          />
                        )}
                        {item.path === "/notifications" && hasUnseenNotifications && (
                          <span
                            aria-label={`${unreadNotificationCount} unread notifications`}
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -8,
                              minWidth: 18,
                              height: 18,
                              padding: unreadNotificationCount > 9 ? "0 5px" : 0,
                              borderRadius: 9,
                              backgroundColor: "#FF3B30",
                              color: "#ffffff",
                              fontSize: 10,
                              fontWeight: 700,
                              lineHeight: 1,
                              boxSizing: "border-box",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {notificationBadgeLabel}
                          </span>
                        )}
                      </div>
                      <span className={`${styles.header_nav_Title} ${pathname === item.path ? styles.header_nav_Title_active : ''}`}>
                        {item.label}
                      </span>
                    </Link>
                  ))}

                  {!pathname.startsWith("/profile/") &&
                    !pathname.startsWith("/user/") &&
                    !pathname.startsWith("/blocked-users") &&
                    !pathname.startsWith("/contact-us") &&
                    !pathname.startsWith("/privacy-policy") && (
                      <div
                        className="nav-indicator"
                        style={{
                          left: `${indicatorStyle.left}px`,
                          width: `${indicatorStyle.width}px`,
                          transition: indicatorAnimate ? undefined : "none",
                        }}
                      />
                    )}

                  <div className={styles.profile_icon_area_main}>
                    {showAvatarSkeleton ? (
                      // Neutral placeholder while the auth signal resolves — avoids
                      // flashing the wrong (logged-in vs anonymous) UI.
                      <div className={styles.navAvatarSkeleton} aria-hidden="true" />
                    ) : (
                      // Both logged-in and anonymous visitors get the profile
                      // dropdown; it renders the correct variant (default photo +
                      // Login for anonymous, avatar + account actions when logged
                      // in) based on `isAuthenticated`.
                      <ProfileDropDown
                        isAuthenticated={isAuthenticated}
                        onLogout={() => {
                          setIsLogoutOpen(true);
                        }}
                        userId={user_id}
                        profileImage={user?.profile_image_url}
                        setPathname={setPathname}
                        userProfile={userProfile}
                      />
                    )}
                  </div>
                </nav>
              </div>
            )}

            {/* Mobile Hamburger Icon */}
            {isMobile && (
              <IconButton
                onClick={handleDrawerToggle}
                sx={{
                  color: isLight ? "#1a1a2e" : "white",
                  "&:hover": {
                    background: isLight
                      ? "rgba(0, 0, 0, 0.05)"
                      : "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: 280,
            boxSizing: "border-box",
          },
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
      >
        {drawer}
      </Drawer>

      <ProfileImagePreview
        isOpen={imagePreviewOpen}
        onClose={() => setImagePreviewOpen(false)}
        imageUrl={user?.profile_image_url}
        firstName={user?.first_name}
        lastName={user?.last_name}
      />

      <LogOutModal
        isOpen={logoutConfirmOpen}
        title="Log out"
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleDrawerLogout}
        confirmText={isLoggingOut ? "Logging out..." : "Logout"}
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
        confirmText="Confirm"
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
                background: isLight ? "#ffffff" : "#0B172A",
                border: isLight
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
                  color: isLight ? "#040F1F" : "#ffffff",
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
                  color: isLight ? "#555" : "#a0aec0",
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
                  background: isLight ? "#f5f7fa" : "rgba(255,255,255,0.04)",
                  border: isLight
                    ? "1px solid #d1d5db"
                    : "1px solid rgba(255,255,255,0.12)",
                  color: isLight ? "#040F1F" : "#ffffff",
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
                    background: isLight ? "#e5e7eb" : "rgba(255,255,255,0.06)",
                    color: isLight ? "#040F1F" : "#ffffff",
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
    </>
  );
}