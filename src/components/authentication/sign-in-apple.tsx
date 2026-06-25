'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { readCallbackUrl } from '@/lib/callbackUrl'
export default function SignInApple () {
  const isLight = false
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const searchParams = useSearchParams()
  const callbackUrl = readCallbackUrl(searchParams)

  const clearLoading = () => {
    setIsLoading(false)
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => {
    // When user focuses the window or tab becomes visible again, stop the loader
    const onFocus = () => clearLoading()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') clearLoading()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleSignIn = async () => {
    try {
      setIsLoading(true)

      // Sign in and redirect to the deep-link the user originally tried to
      // reach if one was preserved, otherwise fall through to the dashboard.
      await signIn('apple', {
        redirectTo: callbackUrl ?? '/home'
      })

      clearLoading()
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
      clearLoading()
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className='group btn-inner-social bg-[#FFFFFF] relative flex justify-center items-center w-full transition-all cursor-pointer'
         style={ {

          border : isLight ? '1px solid #1C98F7' : ''
        } }
      >
        {!isLoading ? (
          // Apple Icon
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width={20}
            height={20}
            viewBox='0 0 20 20'
            fill='none'
          >
            <g clipPath='url(#clip0_1137_734)'>
              <path
                d='M15.2977 10.607C15.3249 13.5445 17.8749 14.5222 17.903 14.5347C17.8814 14.6034 17.4956 15.9278 16.5597 17.2954C15.7506 18.4779 14.9108 19.6561 13.5881 19.6808C12.2884 19.7045 11.8705 18.9098 10.3844 18.9098C8.89876 18.9098 8.43454 19.6561 7.20407 19.7045C5.9272 19.7529 4.95485 18.4256 4.13907 17.2476C2.4722 14.8376 1.19829 10.4375 2.90876 7.46731C3.75845 5.99231 5.2772 5.05841 6.92548 5.03435C8.17923 5.01044 9.36266 5.87778 10.1291 5.87778C10.895 5.87778 12.3331 4.83466 13.845 4.98778C14.478 5.01419 16.2545 5.24341 17.3953 6.91341C17.3036 6.97044 15.2756 8.15106 15.2977 10.607ZM12.855 3.39356C13.5328 2.5731 13.9891 1.4306 13.8647 0.294189C12.8875 0.333408 11.7059 0.945283 11.0052 1.76544C10.377 2.49153 9.82704 3.65403 9.97532 4.76794C11.0645 4.85231 12.177 4.2145 12.855 3.39356Z'
                fill='black'
              />
            </g>
            <defs>
              <clipPath id='clip0_1137_734'>
                <rect width={20} height={20} fill='white' />
              </clipPath>
            </defs>
          </svg>
        ) : (
          <div className='w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin relative z-10' />
        )}

        <span className='relative z-10 pl-[5px] text-black'>
          {isLoading ? 'Signing in...' : 'Apple'}
        </span>
      </button>
    </div>
  )
}
