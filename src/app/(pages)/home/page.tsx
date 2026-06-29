"use client";
import { useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { Option } from "../../../components/commonUI/Multiselect";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import FeedLayout from "@/components/home/FeedLayout";

function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();

  console.log("Social Login Session during home: ", session);

  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile();

  // useEffect(() => {
  //   // wait until both are resolved
  //   if (session === undefined || userProfileLoading) return;

  //   // not logged in
  //   if (session === null) {
  //     router.replace("/auth");
  //     return;
  //   }

  //   console.log("User profile during home: ", userProfile?.data);

  //   const profileStatus =
  //     userProfile?.data?.profile_completion_status ??
  //     session?.user?.profile_completion_status;

  //   console.log("Profile status during home: ", profileStatus);

  //   if (profileStatus === "0") {
  //     router.replace("/onboarding");
  //   }
  // }, [session, userProfileLoading, userProfile, router]);

  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [cookieUser, setCookieUser] = useState<any>(null);

  const [selected, setSelected] = useState<Option[]>([]);

  const options = [
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "angular", label: "Angular" },
    { value: "svelte", label: "Svelte" },
    { value: "nextjs", label: "Next.js" },
  ];

  // Compute final display name
  const displayName =
    session?.user?.name || userProfile?.data?.full_name || "";

  const userId = session?.user?.id || userProfile?.data?.id || "";

  // const handleLogout = async () => {
  //   try {
  //     setIsLoggingOut(true);
  //     // Hit your backend logout proxy to clear httpOnly cookies
  //     await fetch("/api/auth/logout", { method: "POST" });

  //     // Logout from NextAuth fully
  //     await signOut({ redirectTo: "/auth" });
  //   } catch (err) {
  //     console.error("Logout error:", err);
  //   } finally {
  //     setIsLoggingOut(false);
  //     setIsModalOpen(false);
  //   }
  // };

  return (
    <div className="">
      <FeedLayout />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}