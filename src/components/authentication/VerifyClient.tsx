"use client";
import React, { use, useEffect, useState } from "react";
import AuthBackground from "./AuthBackground";
import AuthCard from "./AuthCard";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { resendOtp } from "@/services/auth.services";
import { readCallbackUrl } from "@/lib/callbackUrl";

interface OtpVerificationProps {
  contact?: string; // Email or phone number that OTP was sent to
}

export default function OtpVerificationPage({
  contact = "your email/phone",
}: OtpVerificationProps) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(90);

  const router = useRouter();
  const searchParams = useSearchParams();

  const qEmail = searchParams.get("email");
  const qPhone = searchParams.get("phone");
  const purpose = searchParams.get("purpose");
  const userId = searchParams.get("uid");

  useEffect(() => {
    const firstInput = document.getElementById(
      "otp-0"
    ) as HTMLInputElement | null;
    firstInput?.focus();
  }, []);

  // Countdown effect for resend timer
  useEffect(() => {
    if (resendTimer <= 0) {
      setIsResending(false);
      return;
    }
    setIsResending(true);
    const t = setInterval(() => {
      setResendTimer((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // Mask helpers
  const maskPhone = (phone: string) => {
    const last4 = phone.slice(-4);
    return "****" + last4;
  };

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    const extension = domain.substring(domain.lastIndexOf("."));

    const visible = name.slice(0, 3);
    const masked = "*".repeat(name.length - 3);

    return `${visible}${masked}${extension}`;
  };


  // Final masked contact info
  let maskedContact = "your contact";

  if (qEmail) {
    maskedContact = maskEmail(qEmail);
  } else if (qPhone) {
    maskedContact = maskPhone(qPhone);
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const otpValue = otp.join("");
      if (otpValue.length === 6) {
        setLoading(true);

        // Here you would verify OTP with backend
        console.log("Verifying OTP:", otpValue);
        const payload: any = { otp: otp.join("") };

        // If query param had email or phone, send that field. Backend usually expects email or phone.
        const qEmail = searchParams.get("email");
        const qPhone = searchParams.get("phone");
        const userId = searchParams.get("uid");
        const purpose = searchParams.get("purpose");

        if (userId) payload.user_id = userId;
        if (purpose) payload.purpose = purpose;

        console.log("Verification payload", payload);

        const res = await fetch(`/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("OTP Verification API response:", data);

        const userInfo = data?.data?.user;
        console.log("User information >>>>>", userInfo);
        await fetch(`/api/auth/set-user-cookie`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: userInfo }),
        });

        if (!res.ok) {
          // toast.error(data?.message || "The OTP is invalid or has expired");
          toast.error("The OTP is invalid or has expired");
          setOtp(["", "", "", "", "", ""]);
          setLoading(false);
          return;
        }

        const profile_completion_status = userInfo?.profile_completion_status;

        if (profile_completion_status === "0") {
          toast.success(
            data?.data?.message || "Verification code verified! Redirecting to onboarding..."
          );
          setLoading(false);
          window.location.replace("/onboarding");
          return;
        }

        // Prefer the deep-link the user originally tried to reach (e.g. an
        // email "accept connection" URL) so they land back on that page.
        const callbackUrl = readCallbackUrl(searchParams);

        // redirect to dashboard
        toast.success("Verification code verified successfully! Redirecting to home...");
        setLoading(false);
        window.location.replace(callbackUrl ?? "/home");
      }
    } catch (error) {
      console.error("Verification code verification error:", error);
      toast.error(
        "An error occurred during verification code verification. Please try again."
      );
      setOtp(["", "", "", "", "", ""]);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Handles pasting a full OTP (6 digits)
  const handleOtpPaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();

    // Accept only digits and 6-length OTP
    if (!/^\d{6}$/.test(pasteData)) return;

    const otpArray = pasteData.split("");

    setOtp(otpArray);

    // Move focus to the last input
    const lastInput = document.getElementById(`otp-5`);
    lastInput?.focus();
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (isResending || resendTimer > 0) return;

    const qEmail = searchParams.get("email");
    const qPhone = searchParams.get("phone");
    const userId = searchParams.get("uid");
    const purpose = searchParams.get("purpose"); // SIGNUP | TWO_FACTOR

    // Determine identifier & value
    let identifier: "email" | "phone" | undefined;
    let value: string | undefined;

    if (qEmail) {
      identifier = "email";
      value = qEmail;
    } else if (qPhone) {
      identifier = "phone";
      value = qPhone;
    } else if (contact) {
      identifier = contact.includes("@") ? "email" : "phone";
      value = contact;
    }

    if (!identifier || !value) {
      toast.error("Contact information not found. Cannot resend verification code.");
      return;
    }

    try {
      setIsResending(true);

      const res = await resendOtp(
        purpose === "SIGNUP" ? "SIGNUP" : "TWO_FACTOR",
        identifier,
        value,
        userId || undefined
      );

      console.log("Resend Verification Code Response:", res);

      if (!res || res.status === "failed") {
        toast.error(res?.message || "Failed to resend verification code");
        setIsResending(false);
        return;
      }

      // Success UI behavior
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
      setResendTimer(90);
      toast.success(res?.message || "Verification code resent successfully");
    } catch (error: any) {
      console.error("Resend Verification Code Error:", error);
      toast.error(error.message || "Unexpected error occurred");
      setIsResending(false);
    }
  };

  const handleBack = () => {
    // Navigate back to login page
    console.log("Navigating back to login");
    alert("Going back to login page...");
    router.push("/auth/login");
  };

  const otpValue = otp.join("");
  const isOtpComplete = otpValue.length === 6;

  return (
    <AuthBackground>
      <AuthCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isOtpComplete || loading) return;
            handleVerifyOtp();
          }}
        >
        <div className="form-title-area">
          <h1 className="form-title">
            <span className="title-large">YOUNG</span>
            <span className="title-small">PRO</span>
          </h1>
          <h4 className="form-subtitle mt-[100px] mb-6 verification-subtitle">
            Verify Code
          </h4>
        </div>
        <p className="text-normal text-center ">
          Please enter a six digit code sent on your{" "}
          <strong>{maskedContact}</strong> for verification
        </p>
        <div className="max-w-[588px] mt-[100px]">
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={(e) => handleOtpPaste(index, e)}
                className="otp-form-input"
              />
            ))}
          </div>
        </div>
        <div className="lg:space-y-[15px] space-y-2.5 form-area ">
          {/* OTP Input */}
          {/* Info Text */}
          {/* <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-700 text-sm">
              <strong>Tip:</strong> Check your spam folder if you don't see the code in your inbox.
            </p>
          </div> */}
          {/* Resend OTP */}
          <p className="text-center having-account-text pt-4">
            Didn't receive the code?{" "}
            <button
              type="button"
              onClick={handleResendOtp}
              className="font-semibold hover:underline cursor-pointer"
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
            </button>
          </p>
          {/* Verify Button */}
          <button
            type="submit"
            disabled={!isOtpComplete}
            className={`btn-gradient w-full  verified-btn flex items-center justify-center 
              ${
                isOtpComplete
                  ? "btn-gradient opacity-100 cursor-pointer"
                  : "btn-disabled opacity-50 cursor-not-allowed"
              }
              ${loading ? "disabled cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin relative z-10" />
            ) : (
              "Verify Code"
            )}
          </button>
        </div>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
