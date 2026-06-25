"use client";

import { useState } from "react";
import AuthBackground from "@/components/authentication/AuthBackground";
import AuthCard from "@/components/authentication/AuthCard";
import Link from "next/link";
import { forgotPassword } from "@/services/auth.services";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface FormData {
  email: string;
}

interface Errors {
  email?: string;
}

export default function EnterInfoPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: "",
  });

  const [errors, setErrors] = useState<Errors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof Errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSendOtp = async () => {
    setErrors({});

    const value = formData.email.trim();

    if (!value) {
      setErrors({ email: "Please enter your email." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword("email", value);

      toast.success(
        "Verification code sent successfully!"
      );

      const userId = response?.data?.user?.id;

      const queryParams = new URLSearchParams();

      if (userId) queryParams.append("userId", userId);

      router.push(
        `/auth/reset-password?email=${encodeURIComponent(
          value
        )}&${queryParams.toString()}`
      );
    } catch (error: any) {
      console.error("Error in sending OTP:", error);
      toast.error(error?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      <AuthCard>
        <div className="form-title-area">
          <h1 className="form-title">
            <span className="title-large">YOUNG</span>
            <span className="title-small">PRO</span>
          </h1>
        </div>

        <div className="form-title-area">
          <h4 className="form-subtitle mt-[34px] mb-2 text-left">
            Forgot Password?
          </h4>
          <p className="text-center text-white text-sm max-w-[341px] mt-[15px]">
            Enter your email, We'll send you a verification code to
            reset your password.
          </p>
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isLoading) return;
            handleSendOtp();
          }}
          className="lg:space-y-5 space-y-4 form-area mt-10"
        >
          <div className="form-input-custom pb-4">
            <div className="relative">
              <div className="icon-input">
                     <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M3.84667 15.8333C3.46278 15.8333 3.1425 15.705 2.88583 15.4483C2.62917 15.1916 2.50056 14.8711 2.5 14.4866V5.51329C2.5 5.1294 2.62861 4.80913 2.88583 4.55246C3.14306 4.29579 3.46306 4.16718 3.84583 4.16663H16.1542C16.5375 4.16663 16.8575 4.29524 17.1142 4.55246C17.3708 4.80968 17.4994 5.12996 17.5 5.51329V14.4875C17.5 14.8708 17.3714 15.1911 17.1142 15.4483C16.8569 15.7055 16.5369 15.8338 16.1542 15.8333H3.84667ZM16.6667 5.73746L10.3733 9.85746C10.3144 9.88802 10.255 9.91385 10.195 9.93496C10.1344 9.95551 10.0694 9.96579 10 9.96579C9.93056 9.96579 9.86556 9.95551 9.805 9.93496C9.74444 9.9144 9.685 9.88857 9.62667 9.85746L3.33333 5.73663V14.4866C3.33333 14.6366 3.38139 14.7597 3.4775 14.8558C3.57361 14.9519 3.69667 15 3.84667 15H16.1542C16.3036 15 16.4264 14.9519 16.5225 14.8558C16.6186 14.7597 16.6667 14.6366 16.6667 14.4866V5.73746ZM10 9.16663L16.41 4.99996H3.59L10 9.16663ZM3.33333 5.91329V5.23746V5.26579V4.99996V5.26663V5.22329V5.91329Z"
                    fill="#ffffff"
                  />
                </svg>
              </div>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-11 pr-10 py-3 border-2 rounded-xl ${
                  errors.email ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Email"
              />
            </div>

            {errors.email && (
              <p className="text-red-500 text-sm mt-2">{errors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-gradient w-full mt-5 flex items-center justify-center ${
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              "Send Verification Code"
            )}
          </button>

          <p className="text-center having-account-text mt-4">
            Remember your password?{" "}
            <Link
              href="/auth"
              className="font-semibold hover:underline text-white"
            >
              Log in
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}