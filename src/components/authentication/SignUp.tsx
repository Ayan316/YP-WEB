"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Eye, EyeOff, Info, User, LockKeyhole } from "lucide-react";
import Tooltip from "../commonUI/ToolTip";
import { readCallbackUrl, appendCallbackUrl } from "@/lib/callbackUrl";

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  contact?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
}

export default function SignupPage() {
  const PASSWORD_RULES = [
    "At least 8 characters",
    "At least one uppercase letter (A-Z)",
    "At least one lowercase letter (a-z)",
    "At least one number (0-9)",
    "At least one special character (@$!%*?&#^)",
  ];

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
  });

  const passwordsMatch =
    formData.password.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const passwordsMismatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  const [isPhoneValid, setIsPhoneValid] = useState(true);

  const [errors, setErrors] = useState<FormErrors>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = readCallbackUrl(searchParams);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // ---------- REAL TIME EMAIL VALIDATION ----------
    if (name === "email") {
      const rawEmail = value.trim();
      const email = rawEmail.toLowerCase();

      const domain = rawEmail.split("@")[1] || "";

      const EMAIL_REGEX =
        /^[a-z0-9]+([._%+-]?[a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

      if (!rawEmail) {
        setErrors((prev) => ({ ...prev, email: "", contact: "" }));
        return;
      }

      if (/[A-Z]/.test(domain)) {
        setErrors((prev) => ({
          ...prev,
          email: "Email domain must be lowercase",
        }));
        return;
      }

      if (!EMAIL_REGEX.test(email)) {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
        return;
      }

      // valid email → clear error
      setErrors((prev) => ({ ...prev, email: "", contact: "" }));
      return;
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const rawEmail = formData.email.trim(); // keep raw
    const email = rawEmail.toLowerCase(); // for regex structure match

    // First Name
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(formData.firstName.trim())) {
      newErrors.firstName = "First name must contain only letters and spaces";
    }

    // Last Name
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(formData.lastName.trim())) {
      newErrors.lastName = "Last name must contain only letters and spaces";
    }

    // if (!formData.name.trim()) {
    //   newErrors.name = "Name is required";
    // }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const rawEmail = formData.email.trim();
      const email = rawEmail.toLowerCase();

      const EMAIL_REGEX =
        /^[a-z0-9]+([._%+-]?[a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

      const domain = rawEmail.split("@")[1] || "";

      if (/[A-Z]/.test(domain)) {
        newErrors.email = "Email domain must be lowercase";
      } else if (!EMAIL_REGEX.test(email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (formData.phone.trim()) {
      const phone = formData.phone.trim();

      // Country code only, no phone number
      // if (/^\(\+[0-9]{1,3}\)$/.test(phone)) {
      //   newErrors.phone =
      //     "Please enter the phone number after the country code";
      // }

      // // Full phone number pattern
      // else {
      //   const phoneRegex = /^\(\+[0-9]{1,3}\)[0-9\s]{7,15}$/;

      //   if (!phoneRegex.test(phone)) {
      //     newErrors.phone = "Phone must be in format: (+<code>)<number>";
      //   }
      // }
    }

    /* ---------- Password ---------- */
    if (!formData.password?.trim()) {
      newErrors.password = "Password is required";
    } else {
      const pwd = formData.password;

      const hasUppercase = /[A-Z]/.test(pwd);
      const hasLowercase = /[a-z]/.test(pwd);
      const hasLetter = hasUppercase || hasLowercase;
      const hasNumber = /\d/.test(pwd);
      const hasSpecial = /[@$!%*?&#^()\-_=+{}[\]|\\;:'",.<>/]/.test(pwd);

      if (pwd.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!hasLetter) {
        newErrors.password = "Password must contain at least one letter";
      } else if (!hasUppercase) {
        newErrors.password =
          "Password must contain at least one uppercase letter";
      } else if (!hasLowercase) {
        newErrors.password =
          "Password must contain at least one lowercase letter";
      } else if (!hasNumber) {
        newErrors.password = "Password must contain at least one number";
      } else if (!hasSpecial) {
        newErrors.password =
          "Password must contain at least one special character";
      }
    }

    /* ---------- Confirm Password ---------- */
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Either email or phone required
    // if (!formData.email.trim()) {
    //   newErrors.contact = 'Please provide an email'
    // }

    // Phone exists but invalid
    if (formData.phone.trim() && !isPhoneValid) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormReady =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    (formData.email.trim() || formData.phone.trim()) &&
    formData.password.length >= 5;

  const handleSubmit = async () => {
    if (!validateForm()) return;

    console.log("Form data validated, submitting...", formData);

    setIsLoading(true);
    try {
      // Build payload
      const payload: Record<string, any> = {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        ...(formData.email && { email: formData.email.trim() }),
        ...(formData.phone && {
          phone: formData.phone.replace(/\s+/g, ""),
        }),
        ...(formData.password && { password: formData.password }),
        ...(formData.firstName && { first_name: formData.firstName.trim() }),
        ...(formData.lastName && { last_name: formData.lastName.trim() }),
      };

      console.log("Signup payload created", payload);

      const res = await fetch(`/api/auth/signup_web`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      console.log("Signup response:", data);

      const purpose = "SIGNUP";

      const email = formData.email?.trim() || "";
      const phone = formData.phone?.trim() || "";

      const userId = data?.data?.data?.user?.id || null;

      console.log("userId: ", userId);

      const params = new URLSearchParams();
      if (userId) params.append("uid", userId);
      if (purpose) params.append("purpose", purpose);
      if (email) params.append("email", email);
      if (phone) params.append("phone", phone);
      appendCallbackUrl(params, callbackUrl);

      console.log("Sign up params: ", params);

      if (res.status === 201 || data?.status === "SUCCESS") {
        // toast.success(data?.message || 'Account created successfully!')
        toast.success("Verification code sent successfully!");
        // Optionally clear form or redirect to login
        router.replace(`/auth/verify?${params.toString()}`);
        // setIsLogin(true);
        return;
      }

      if (res.status === 409 || data?.status === "ALREADY_EXISTS") {
        // show helpful error
        toast.error(
          data?.message ||
            "An account with this identifier already exists. Please login.",
        );
        return;
      }

      // Generic backend error
      toast.error(
        data?.message || `Signup failed (${res.status}). Please try again.`,
      );
      // setErrors((prev) => ({
      //   ...prev,
      //   contact: data?.message || `Signup failed (${res.status}).`,
      // }));
    } catch (err: any) {
      console.error("Signup error:", err);
      toast.error(err?.message || "An unexpected error occurred.");
      // setErrors((prev) => ({
      //   ...prev,
      //   contact: err?.message || "Unexpected error",
      // }));
    } finally {
      setIsLoading(false);
    }
  };

  // const isDisabled = isLoading || !isFormReady;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    handleSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit}>
      {/* <AuthBackground>
      <AuthCard> */}
      {/* <div className='form-title-area'>
          <h1 className='form-title'>
            <span className='title-large'>YOUNG</span>
            <span className='title-small'>PRO</span>
          </h1>
          <h4 className='form-subtitle mt-[30px] mb-6'>Let’s Get Started</h4>
        </div>

        <ToggleBtn isLogin={isLogin} setIsLogin={setIsLogin} /> */}

      <div className="lg:space-y-[15px] space-y-2.5 form-area">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-px">
          {/* First Name */}
          <div className="form-input-custom">
            <div className="relative">
              <div className="icon-input">
                <User size={18} className="text-white" />
              </div>

              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl
                    ${errors.firstName ? "border-red-500" : "border-transparent"}`}
                placeholder="First Name"
              />
            </div>

            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="form-input-custom">
            <div className="relative">
              <div className="icon-input">
                <User size={18} className="text-white" />
              </div>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl 
                              ${
                                errors.lastName
                                  ? "border-red-500"
                                  : "border-gray-200"
                              }`}
                placeholder="Last Name"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>
        </div>

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
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl  transition-all
                  ${errors.email ? "border-red-500" : "border-transparent"}`}
              placeholder="Email"
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
          {/* {errors.contact && (
            <p className='text-red-500 text-sm mt-1'>
              Email is required
            </p>
          )} */}
        </div>

        <div className="form-input-custom">
          <div className="relative">
            <div className="icon-input text-white">
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
              value={formData.password}
              onChange={handleChange}
              className={`w-full pl-11 pr-15 py-3 border-2 rounded-xl  transition-all
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
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        <div className="form-input-custom">
          <div className="relative">
            <div className="icon-input text-white">
                <LockKeyhole size={18}/>
            {/* <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 48 48"
                className="text-white"
                style={{ color: "#ffffff" }}  // ensures white color
              >
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M24 25.28a3.26 3.26 0 0 0-1.64 6.07V36h3.32v-4.65a3.28 3.28 0 0 0 1.61-2.8v0A3.27 3.27 0 0 0 24 25.28"
                  strokeWidth="1.5"
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
                  strokeWidth="1.5"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.35 17.77v-2.61a10.66 10.66 0 0 1 21.32 0v2.61"
                  strokeWidth="1.5"
                />
              </svg> */}
              
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full pl-11 pr-10 py-3 border-2 rounded-xl transition-all
                  ${errors.password ? "border-red-500" : "border-transparent"}`}
              placeholder="Confirm Password"
            />

            {/* Eye Button */}
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 transition cursor-pointer"
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

          {/* Only shows when field is empty on submit */}
          {errors.confirmPassword ? (
            <p className="text-red-500 text-sm mt-1">
              {errors.confirmPassword}
            </p>
          ) : passwordsMismatch ? (
            <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
          ) : null}

        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`btn-gradient w-full mt-5 flex items-center justify-center
              ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            "Sign up"
          )}
        </button>


        {/* Social Signup Button placed underneath */}
      </div>

      {/* <p className='text-center having-account-text'>
          Already have an account?{' '}
          <button
            onClick={() => setIsLogin(true)}
            className='font-semibold hover:underline cursor-pointer'
          >
            Log in
          </button>
        </p> */}
      {/* </AuthCard>
    </AuthBackground> */}
    </form>
  );
}
