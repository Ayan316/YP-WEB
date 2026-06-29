"use client";
import React, { useEffect, useState } from "react";
import AuthBackground from "@/components/authentication/AuthBackground";
import AuthCard from "@/components/authentication/AuthCard";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Link from "next/link";
import { resetPassword } from "@/services/auth.services";
import { resendOtp } from "@/services/auth.services";

import { Eye, EyeOff, Info } from "lucide-react";

import Tooltip from "../commonUI/ToolTip";
import { set } from "date-fns";

interface OtpVerificationProps {
  contact?: string;
}

export default function ResetPassword({
  contact = "your email/phone",
}: OtpVerificationProps) {
  const PASSWORD_RULES = [
    "At least 8 characters",
    "At least one uppercase letter (A-Z)",
    "At least one lowercase letter (a-z)",
    "At least one number (0-9)",
    "At least one special character (@$!%*?&#^)",
  ];

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isOtpComplete = otp.join("").length === 6;
  // const isPasswordValid = newPassword.trim().length >= 5;

  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [resendTimer, setResendTimer] = useState(90);
  const [isResending, setIsResending] = useState(false);

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

  const router = useRouter();
  const searchParams = useSearchParams();

  const qEmail = searchParams.get("email");
  const qPhone = searchParams.get("phone");

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

  let maskedContact = "your contact";

  if (qEmail) {
    maskedContact = maskEmail(qEmail);
  } else if (qPhone) {
    maskedContact = maskPhone(qPhone);
  }

  /* Autofocus on 1st OTP box */
  useEffect(() => {
    const firstInput = document.getElementById("otp-0") as HTMLInputElement;
    firstInput?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1 || (value && !/^\d$/.test(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const validatePassword = (pwd: string) => {
    if (!pwd.trim()) return "Password is required";

    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasLetter = hasUppercase || hasLowercase;
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[@$!%*?&#^()\-_=+{}[\]|\\;:'",.<>/]/.test(pwd);

    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!hasLetter) return "Password must contain at least one letter";
    if (!hasUppercase)
      return "Password must contain at least one uppercase letter";
    if (!hasLowercase)
      return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSpecial)
      return "Password must contain at least one special character";

    return "";
  };

  const isPasswordValid = !validatePassword(newPassword);

  const confirmPasswordError =
    confirmPassword.length > 0 && confirmPassword !== newPassword
      ? "Passwords do not match"
      : "";

  /* Submit Single API - OTP + Password */
  const handleResetPassword = async () => {
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordError("");
    setLoading(true);

    try {
      const userId = searchParams.get("userId") || "";
      const response = await resetPassword(userId, otpValue, newPassword);

      toast.success(response?.message || "Password reset successfully!");
      router.push("/auth");
    } catch (error) {
      console.error("Error in resetting password:", error);
      toast.error(
        (error as Error)?.message ||
          "Failed to reset password. Please try again.",
      );
      setResendTimer(0);
      setIsResending(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResending || resendTimer > 0) return;

    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const userId = searchParams.get("userId");

    let identifier: "email" | "phone" | undefined;
    let value: string | undefined;

    if (email) {
      identifier = "email";
      value = email;
    } else if (phone) {
      identifier = "phone";
      value = phone;
    }

    if (!identifier || !value) {
      toast.error("Contact information not found");
      return;
    }

    try {
      setIsResending(true);

      const res = await resendOtp(
        "FORGOT_PASSWORD",
        identifier,
        value,
        userId || undefined,
      );

      if (!res || res.status === "failed") {
        toast.error(res?.message || "Failed to resend OTP");
        setResendTimer(0);
        setIsResending(false);
        return;
      }

      toast.success(res?.message || "OTP resent successfully");

      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();

      setResendTimer(90);
    } catch (error: any) {
      toast.error(error.message || "Unexpected error occurred");
      setResendTimer(0);
      setIsResending(false);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pasteData = e.clipboardData.getData("text").trim();

    if (!/^\d{6}$/.test(pasteData)) return;

    const otpArray = pasteData.split("");
    setOtp(otpArray);

    document.getElementById("otp-5")?.focus();
  };

  const canSubmit =
    otp.join("").length === 6 &&
    !validatePassword(newPassword) &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !loading;


  return (
    <AuthBackground>
      <AuthCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            handleResetPassword();
          }}
        >
        <div className="form-title-area">
          <h1 className="form-title">
            <span className="title-large">YOUNG</span>
            <span className="title-small">PRO</span>
          </h1>
          <h4 className="form-subtitle mt-[100px] mb-6 verification-subtitle">
            Reset Password
          </h4>
        </div>

        <p className="text-normal text-center">
          Please enter a six digit code sent on your{" "}
          <strong>{maskedContact}</strong> for verification
        </p>

        <p className="text-white text-center mt-4">
          <strong>
            {isOtpComplete ? "Create your new password" : "Enter your verification code"}
          </strong>
        </p>

        {/* OTP Inputs */}
        <div className="max-w-[365px] mt-[55px] ml-auto mr-auto">
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
                onPaste={handleOtpPaste}
                className="otp-form-input"
              />
            ))}
          </div>
        </div>

        {/* Resend */}
        <p className="text-center having-account-text pt-4">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isResending || resendTimer > 0}
            className={`font-semibold hover:underline cursor-pointer ${
              resendTimer > 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
          </button>
        </p>

        {/* Password fields */}
        <div className="lg:space-y-[25px] space-y-4 form-area mt-10">
          <div className="form-input-custom">
            <div className="relative">
              <div className="icon-input">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 48 48"
                  className="text-white"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M24 25.28a3.26 3.26 0 0 0-1.64 6.07V36h3.32v-4.65a3.28 3.28 0 0 0 1.61-2.8v0A3.27 3.27 0 0 0 24 25.28"
                    strokeWidth="1"
                  />
                  <rect
                    width="33.23"
                    height="25.73"
                    x="7.38"
                    y="17.77"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    rx="4.32"
                    strokeWidth="1"
                  />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.35 17.77v-2.61a10.66 10.66 0 0 1 21.32 0v2.61"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                disabled={!isOtpComplete}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(validatePassword(e.target.value));
                }}
                className="w-full pl-11 pr-14 py-3 border-2 rounded-xl"
              />

              {/* Eye Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 transition"
              >
                {showPassword ? (
                  // Eye Off Icon
                  <Eye size={20} />
                ) : (
                  // Eye Icon
                  <EyeOff size={20} />
                )}
              </button>

              <Tooltip
                position="top"
                content={
                  <div>
                    <p className="font-semibold mb-1">Password must contain:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {PASSWORD_RULES.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                }
              >
                <button
                  type="button"
                  tabIndex={0}
                  className="absolute right-10 top-[-5px] -translate-y-1/2 text-white hover:text-gray-200"
                >
                  <Info size={20} />
                </button>
              </Tooltip>
            </div>
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}
          </div>

          <div className="form-input-custom">
            <div className="relative">
              <div className="icon-input">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 48 48"
                  className="text-white"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M24 25.28a3.26 3.26 0 0 0-1.64 6.07V36h3.32v-4.65a3.28 3.28 0 0 0 1.61-2.8v0A3.27 3.27 0 0 0 24 25.28"
                    strokeWidth="1"
                  />
                  <rect
                    width="33.23"
                    height="25.73"
                    x="7.38"
                    y="17.77"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    rx="4.32"
                    strokeWidth="1"
                  />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.35 17.77v-2.61a10.66 10.66 0 0 1 21.32 0v2.61"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                disabled={!isPasswordValid}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border-2 rounded-xl"
              />

              {/* Eye Button */}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 transition"
              >
                {showConfirmPassword ? (
                  // Eye Off Icon
                  <Eye size={20} />
                ) : (
                  // Eye Icon
                  <EyeOff size={20} />
                )}
              </button>
            </div>

            {confirmPasswordError && (
              <p className="text-red-500 text-sm mt-1">
                {confirmPasswordError}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`btn-gradient w-full verified-btn flex items-center justify-center mt-8
            ${
              canSubmit
                ? "opacity-100 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
        >
          {loading ? "Processing..." : "Reset Password"}
        </button>

        <p className="text-center having-account-text mt-4">
          Remember your password?{" "}
          <Link
            href="/auth"
            className="font-semibold hover:underline text-white"
          >
            Login
          </Link>
        </p>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
