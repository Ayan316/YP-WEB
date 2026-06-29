import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthBackground from './AuthBackground'
import AuthCard from './AuthCard'
import ToggleBtn from './ToggelBtn'
import SignInGoogle from './sign-in-google'
import SignInApple from './sign-in-apple'
import SignInLinkedin from './sign-in-linkedin'
import LoginPage from './Login'
import SignUp from './SignUp'
import Link from 'next/link'

const SignUpLogIn = () => {
  // Derive the initial tab from the URL: `tab=login` opens the Login view,
  // `tab=signup` (or anything else / missing) keeps the Sign Up default.
  // Accept `tab`, falling back to the legacy `mode` param. `useSearchParams`
  // requires a Suspense boundary above this component during prerender — the
  // /auth page already provides one (see src/app/auth/page.tsx).
  const searchParams = useSearchParams()
  const initialTab =
    (searchParams.get('tab') ?? searchParams.get('mode')) === 'login'
      ? 'login'
      : 'signup'
  const [activeTab, setActiveTab] = useState(initialTab)
  return (
    <AuthBackground>
      <AuthCard>
        <div className='form-title-area'>
          <h1 className='form-title'>
            <span className='title-large'>YOUNG</span>
            <span className='title-small'>PRO</span>
          </h1>
           <div className='auth-content'>
          <div
            className={`auth-panel ${
              activeTab === 'login' ? 'show' : 'hide-right'
            }`}
          >
           <h4 className='form-subtitle  mb-6'>Welcome Back</h4>
          </div>

          <div
            className={`auth-panel ${
              activeTab === 'signup' ? 'show' : 'hide-left'
            }`}
          >
           <h4 className='form-subtitle  mb-6'>Let’s Get Started</h4>
          </div>
        </div>
          
          
        </div>
        <div className={`signup-login-btn-wrapper ${activeTab}`}>
          <button
            className={`btn-custom ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
            type='button'
          >
            Sign up
          </button>

          <button
            className={`btn-custom ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
            type='button'
          >
            Login
          </button>

          {/* Animated Indicator */}
          <span className='tab-indicator' />
        </div>

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
        <div className='auth-content form'>
          <div
            className={`auth-panel ${
              activeTab === 'login' ? 'show' : 'hide-right'
            }`}
          >
            <LoginPage />
          </div>

          <div
            className={`auth-panel ${
              activeTab === 'signup' ? 'show' : 'hide-left'
            }`}
          >
            <SignUp />
          </div>
        </div>

        <div className='social-login-area'>
          <p className='text-normal mb-[30px] text-center'>or continue with</p>
          <div className='social-login-wrapper '>
            <div className='social-media-btn gradient-border-btn'>
              <SignInGoogle />
            </div>
            <div className='social-media-btn'>
              <SignInApple />
            </div>
            <div className='social-media-btn'>
              <SignInLinkedin />
            </div>

            {/* <div className="social-media-btn">
              <button className="group btn-inner-social bg-[#FFFFFF] relative flex justify-center items-center w-full transition-all cursor-pointer"> */}
            {/* Subtle hover gradient */}
            {/* <div className="absolute" /> */}
            {/* Apple icon */}
            {/* <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <g clipPath="url(#clip0_1137_734)">
                    <path
                      d="M15.2977 10.607C15.3249 13.5445 17.8749 14.5222 17.903 14.5347C17.8814 14.6034 17.4956 15.9278 16.5597 17.2954C15.7506 18.4779 14.9108 19.6561 13.5881 19.6808C12.2884 19.7045 11.8705 18.9098 10.3844 18.9098C8.89876 18.9098 8.43454 19.6561 7.20407 19.7045C5.9272 19.7529 4.95485 18.4256 4.13907 17.2476C2.4722 14.8376 1.19829 10.4375 2.90876 7.46731C3.75845 5.99231 5.2772 5.05841 6.92548 5.03435C8.17923 5.01044 9.36266 5.87778 10.1291 5.87778C10.895 5.87778 12.3331 4.83466 13.845 4.98778C14.478 5.01419 16.2545 5.24341 17.3953 6.91341C17.3036 6.97044 15.2756 8.15106 15.2977 10.607ZM12.855 3.39356C13.5328 2.5731 13.9891 1.4306 13.8647 0.294189C12.8875 0.333408 11.7059 0.945283 11.0052 1.76544C10.377 2.49153 9.82704 3.65403 9.97532 4.76794C11.0645 4.85231 12.177 4.2145 12.855 3.39356Z"
                      fill="black"
                    />
                  </g>

                  <defs>
                    <clipPath id="clip0_1137_734">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg> */}

            {/* Text */}
            {/* <span className="relative z-10 pl-[5px] text-[#000000]">
                  Apple
                </span>
              </button>
            </div> */}
          </div>
        </div>

        <div className='auth-content'>
          <div
            className={`auth-panel ${
              activeTab === 'login' ? 'show' : 'hide-right'
            }`}
          >
            <p className='text-center having-account-text'>
              Don't have an account?{' '}
              {/* <Link href="/auth/signup" className="font-[600] hover:underline">
            Sign up
          </Link> */}
              <button
                onClick={() => setActiveTab('signup')}
                className='font-semibold hover:underline cursor-pointer'
              >
                Sign up
              </button>
            </p>
          </div>

          <div style={{maxWidth: '300px', margin: '0 auto '}}>
            {
            activeTab === 'signup' && 
            (
                    <p className="text-center text-xs text-white/70 mt-3 leading-relaxed">
          By clicking Sign up, Continue with Google, Continue with Apple or Continue with LinkedIn,
          you agree to our{" "}
          <Link
            href="/terms-of-use"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-white hover:text-white/90 transition-colors"
          >
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-white hover:text-white/90 transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
            )
          }

          </div>
          <div
            className={`auth-panel ${
              activeTab === 'signup' ? 'show' : 'hide-left'
            }`}
          >
            <p className='text-center having-account-text'>
              Already have an account?{' '}
              <button
                onClick={() => setActiveTab('login')}
                className='font-semibold hover:underline cursor-pointer'
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </AuthCard>
    </AuthBackground>
  )
}

export default SignUpLogIn
