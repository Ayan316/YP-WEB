'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useSearchParams } from 'next/navigation'
import { readCallbackUrl } from '@/lib/callbackUrl'
export default function SignInGoogle () {
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
      // reach (e.g. an email "accept connection" URL) if one was preserved,
      // otherwise fall through to the dashboard.
      await signIn('google', {
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
        className='group btn-inner-social bg-[#020C1966] relative flex justify-center items-center w-full transition-all cursor-pointer'
        style={ {
          background: isLight ? '#FFF' : '',
          border : isLight ? '1px solid #1C98F7' : ''
        } }
      >
        {/* Google Icon */}
        {!isLoading ? (
          <svg
            className='w-5 h-5 relative z-10'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
              fill='#4285F4'
            />
            <path
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              fill='#34A853'
            />
            <path
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
              fill='#FBBC05'
            />
            <path
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
              fill='#EA4335'
            />
          </svg>
        ) : (
          <div className='w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin relative z-10' />
        )}

        {/* Text */}
        <span className='relative z-10 pl-[5px]'>
          {isLoading ? 'Signing in...' : 'Google'}
        </span>
      </button>
    </div>
  )
}
