"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { readCallbackUrl } from "@/lib/callbackUrl";
export default function SignInLinkedin() {
  const isLight = false;
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = readCallbackUrl(searchParams);

  const clearLoading = () => {
    setIsLoading(false);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    // When user focuses the window or tab becomes visible again, stop the loader
    const onFocus = () => clearLoading();
    const onVisibility = () => {
      if (document.visibilityState === "visible") clearLoading();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      
      // Sign in and redirect to the deep-link the user originally tried to
      // reach if one was preserved, otherwise fall through to the dashboard.
      await signIn("linkedin", {
        callbackUrl: callbackUrl ?? "/home",
        redirect: true
      });

      clearLoading();
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(false);
      clearLoading();
    }
  };

  return (
    <button
      className="group btn-inner-social bg-[#0077B5] relative flex justify-center items-center w-full transition-all cursor-pointer"
      onClick={handleClick}
      disabled={isLoading}
      style={ {
        color: isLight ? '#FFF' : '',
        
      } }
    >

    {!isLoading ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M15.8333 2.5C16.2754 2.5 16.6993 2.67559 17.0118 2.98816C17.3244 3.30072 17.5 3.72464 17.5 4.16667V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H15.8333ZM15.4167 15.4167V11C15.4167 10.2795 15.1304 9.5885 14.621 9.07903C14.1115 8.56955 13.4205 8.28333 12.7 8.28333C11.9917 8.28333 11.1667 8.71667 10.7667 9.36667V8.44167H8.44167V15.4167H10.7667V11.3083C10.7667 10.6667 11.2833 10.1417 11.925 10.1417C12.2344 10.1417 12.5312 10.2646 12.75 10.4834C12.9688 10.7022 13.0917 10.9989 13.0917 11.3083V15.4167H15.4167ZM5.73333 7.13333C6.10464 7.13333 6.46073 6.98583 6.72328 6.72328C6.98583 6.46073 7.13333 6.10464 7.13333 5.73333C7.13333 4.95833 6.50833 4.325 5.73333 4.325C5.35982 4.325 5.0016 4.47338 4.73749 4.73749C4.47338 5.0016 4.325 5.35982 4.325 5.73333C4.325 6.50833 4.95833 7.13333 5.73333 7.13333ZM6.89167 15.4167V8.44167H4.58333V15.4167H6.89167Z" fill="white"/>
      </svg>
    ) : (
      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin relative z-10" />
    )}
      {/* Text */}
      <span className="relative z-10 pl-[5px]">{isLoading ? "Signing in..." : "LinkedIn"}</span>
    </button>
  );
}