"use client";
import React, { useState, useRef, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SignInGoogle from "./sign-in-google";
import SignInLinkedin from "./sign-in-linkedin";
import AuthBackground from "./AuthBackground";
import AuthCard from "./AuthCard";
import ToggleBtn from "./ToggelBtn";
import { toast } from "react-toastify";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { Eye, EyeOff, Info, LockKeyhole } from "lucide-react";

import Tooltip from "../commonUI/ToolTip";
import { appendCallbackUrl, readCallbackUrl } from "@/lib/callbackUrl";

// import PhoneInput, { parsePhoneNumber } from 'react-phone-number-input';

import PhoneInputWithIP from "../commonUI/PhoneInputWithIP";
import SignInApple from "./sign-in-apple";
import { da } from "date-fns/locale";

interface LoginData {
  email: string;
  phone: string;
  password: string;
}

interface LoginErrors {
  email?: string;
  phone?: string;
  contact?: string;
  password?: string;
}



export default function LoginPage() {
  const PASSWORD_RULES = [
    "At least 8 characters",
    "At least one uppercase letter (A-Z)",
    "At least one lowercase letter (a-z)",
    "At least one number (0-9)",
    "At least one special character (@$!%*?&#^)",
  ];

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [formError, setFormError] = useState("");

  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    phone: "",
    password: "",
  });

  const [useEmail, setUseEmail] = useState(true); // true = Email, false = Phone

  const [defaultCountry, setDefaultCountry] = useState<string>("GB");

  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState<LoginErrors>({});

  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = readCallbackUrl(searchParams);

  const detectionActive = useRef(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof LoginErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // const validateForm = (): boolean => {
  //   const newErrors: LoginErrors = {};

  //   const rawEmail = loginData.email.trim(); // keep raw
  //   const email = rawEmail.toLowerCase(); // for regex structure match

  //   // Either email or phone must be provided
  //   if (!loginData.email.trim() && !loginData.phone.trim()) {
  //     newErrors.contact = "Please provide either an email or phone number";
  //   }

  //   // domain cannot contain uppercase letters after "."
  //   const domain = rawEmail.split("@")[1] || "";
  //   if (/[A-Z]/.test(domain)) {
  //     newErrors.email = "Email domain must be lowercase";
  //   }

  //   // structure must be valid
  //   if (
  //     rawEmail &&
  //     !/^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,3}(\.[a-z]{2,3})?$/.test(email)
  //   ) {
  //     newErrors.email = "Please enter a valid email address";
  //   }

  //   if (loginData.phone.trim()) {
  //     const phone = loginData.phone.trim();

  //     // Country code only, no phone number
  //     // if (/^\(\+[0-9]{1,3}\)$/.test(phone)) {
  //     //   newErrors.phone =
  //     //     "Please enter the phone number after the country code";
  //     // }

  //     // // Full phone number pattern
  //     // else {
  //     //   const phoneRegex = /^\(\+[0-9]{1,3}\)[0-9\s]{7,15}$/;

  //     //   if (!phoneRegex.test(phone)) {
  //     //     newErrors.phone = "Phone must be in format: (+<code>)<number>";
  //     //   }
  //     // }
  //   }

  //   const strongPasswordRegex =
  //     /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+{}[\]|\\;:'",.<>/]).{8,}$/;

  //   if (!loginData.password?.trim()) {
  //     newErrors.password = "Password is required";
  //   } else if (!strongPasswordRegex.test(loginData.password)) {
  //     newErrors.password =
  //       "Password must be 8+ characters with uppercase, lowercase, number & special character";
  //   }

  //   setErrors(newErrors);
  //   return Object.keys(newErrors).length === 0;
  // };

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};

    /* ---------- EMAIL MODE ---------- */
    if (useEmail) {
      const rawEmail = loginData.email.trim();
      const email = rawEmail.toLowerCase();

      if (!rawEmail) {
        newErrors.email = "Email is required";
      } else {
        const domain = rawEmail.split("@")[1] || "";

        if (/[A-Z]/.test(domain)) {
          newErrors.email = "Email domain must be lowercase";
        } else if (
          !/^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,3}(\.[a-z]{2,3})?$/.test(email)
        ) {
          newErrors.email = "Please enter a valid email address";
        }
      }
    }

    /* ---------- PHONE MODE ---------- */
    if (!useEmail) {
      if (!loginData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!isPhoneValid) {
        newErrors.phone = "Please enter a valid phone number";
      }
    }

    /* ---------- PASSWORD ---------- */
    const strongPasswordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+{}[\]|\\;:'",.<>/]).{8,}$/;

    if (!loginData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (!strongPasswordRegex.test(loginData.password)) {
      newErrors.password =
        "Password must be 8+ characters with uppercase, lowercase, number & special character";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async () => {
    // // At least one required
    // if (!email && !phone) {
    //   setFormError("Email or phone number is required");
    //   return;
    // }

    // // If phone exists → must be valid
    // if (phone && !isPhoneValid) {
    //   setFormError("Please enter a valid phone number");
    //   return;
    // }

    // // If email exists → validate email
    // if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    //   setFormError("Please enter a valid email address");
    //   return;
    // }

    if (validateForm()) {
      setIsLoading(true);
      console.log(
        "Sending OTP to:",
        loginData.email || loginData.phone,
        loginData.password
      );
      console.log("Login data:", loginData);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData),
          }
        );

        const data = await res.json();
        console.log("Login API response:", data);

        console.log("Verification status during login: ", data?.data?.verification_status);

        if (!res.ok) {
          setIsLoading(false);
          toast.error(data?.message || "Failed to send verification code. Please try again.");
          setLoginData({ email: "", phone: "", password: "" });
          return;
        }

        const verificationStatus = data?.data?.verification_status;

        const isProfileCompleted = data?.data?.user?.profile_completion_status;

        // If 2FA/verification is not required, go directly to home or onboarding
        if (verificationStatus === false) {
          toast.success("Login successful!");
          setIsLoading(false);
          if (isProfileCompleted === '1') {
            router.replace(callbackUrl ?? "/home");
          } else {
            router.replace("/onboarding");
          }
          return;
        }

        const contactInfo = loginData.email || loginData.phone;
        console.log("OTP sent to: ", contactInfo);

        const userId = data?.data?.user?.id;
        const email = loginData.email || "";
        const phone = loginData.phone || "";

        console.log("Params during login", userId, email, phone);

        const purpose = "TWO_FACTOR";

        const params = new URLSearchParams();

        if (email) params.append("email", email);
        if (phone) params.append("phone", phone);
        if (userId) params.append("uid", userId);
        if (purpose) params.append("purpose", purpose);
        appendCallbackUrl(params, callbackUrl);

        console.log("Login params: ", params);

        toast.success(
          "Verification code sent successfully"
        );

        router.replace(`/auth/verify?${params.toString()}`);

        setIsLoading(false);
        // setLoginData({ email: "", phone: "", password: "" });
      } catch (error) {
        setIsLoading(false);
        toast.error("Network error. Please try again.");
        console.error("Error during login API call:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setLoginData((prev) => ({ ...prev, [field]: value }));

    if (value.trim() !== "" && errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    handleSendOtp();
  };

  return (
    <form onSubmit={handleFormSubmit}>
    {/* // <AuthBackground>
    //   <AuthCard> */}
        {/* <div className="form-title-area">
          <h1 className="form-title">
            <span className="title-large">YOUNG</span>
            <span className="title-small">PRO</span>
          </h1>
          <h4 className="form-subtitle mt-[34px] mb-6">Welcome Back</h4>
        </div> */}

        {/* <ToggleBtn isLogin={isLogin} setIsLogin={setIsLogin} /> */}

        {/* <div className="flex items-center justify-center gap-3 mb-4">
          <span
            className={`text-white ${!useEmail ? "opacity-100" : "opacity-50"}`}
          >
            Phone
          </span>

          <Switch
            checked={useEmail}
            onCheckedChange={(checked) => {
              setUseEmail(checked);

              // Clear opposite field + errors
              setLoginData((prev) => ({
                ...prev,
                email: checked ? prev.email : "",
                phone: checked ? "" : prev.phone,
              }));

              setErrors({});
            }}
          />

          <span
            className={`text-white ${useEmail ? "opacity-100" : "opacity-50"}`}
          >
            Email
          </span>
        </div> */}

        <div className="lg:space-y-[15px] space-y-2.5 form-area">
          <div className="form-input-custom">
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
                value={loginData.email}
                onChange={handleChange}
                disabled={loginData.phone.length > 0}
                className={`w-full pl-11 pr-10 py-3 border-2 rounded-xl 
                      ${loginData.phone ? "cursor-not-allowed opacity-50" : ""} 
                      ${errors.email ? "border-red-500" : "border-transparent"}
                    `}
                placeholder="Email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="form-input-custom">
            <div className="relative">
              <div className="icon-input text-white"
            
              >
                  <LockKeyhole size={18}/>
                {/* <svg
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
                </svg> */}
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={loginData.password}
                onChange={handleChange}
                className={`w-full pl-11 pr-10 py-3 border-2 rounded-xl transition-all
                  ${errors.password ? "border-red-500" : "border-transparent"}`}
                placeholder="Password"
              />

              {/* Eye Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 transition cursor-pointer"
              >
                {showPassword ? (
                  // Eye Off Icon
                  <Eye size={20} />
                ) : (
                  // Eye Icon
                  <EyeOff size={20} />
                )}
              </button>

              {/* <Tooltip
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
                  className="absolute right-10 top-[-5px] -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  <Info size={20} />
                </button>
              </Tooltip> */}
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div className="text-right mt-2 having-account-text">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-white hover:text-indigo-300 hover:underline transition"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-gradient w-full cursor-pointer mt-5 flex items-center justify-center ${
              isLoading ? " opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin relative z-10" />
            ) : (
              "Log in"
            )}
          </button>
        </div>
        {/* <div className="social-login-area">
          <p className="text-normal mb-[30px] text-center">or continue with</p>
          <div className="social-login-wrapper ">
            <div className="social-media-btn gradient-border-btn">
              <SignInGoogle />
            </div>
            <div className="social-media-btn">
              <SignInApple />
            </div>
            <div className="social-media-btn">
              <SignInLinkedin />
            </div>
            
        
          </div>
        </div> */}

        {/* <p className="text-center having-account-text">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="font-semibold hover:underline">
            Sign up
          </Link>
          <button
            onClick={() => setIsLogin(false)}
            className="font-semibold hover:underline cursor-pointer"
          >
            Sign up
          </button>
        </p> */}
      {/* </AuthCard>
    </AuthBackground> */}
    </form>
  );
}