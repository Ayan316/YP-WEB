'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import { X } from 'lucide-react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import styles from '@/moduleCss/events.module.css'
import { useTheme } from '@/context/ThemeContext'
import { ensureValidToken } from '@/lib/tokenManager'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
import ConfirmModal from '../commonUI/ConfirmModal'
import {
  checkSeatAvailability,
  applyCoupon,
  createBooking,
  confirmPayment,
  cancelBooking
} from '@/services/events.services'

let stripePromise: Promise<Stripe | null> | null = null
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

/* ── Stripe Payment Form (PaymentElement) ── */
function StripePaymentForm ({
  bookingId,
  isLight,
  totalAmount,
  externalRegistrationUrl,
  onSuccess,
  onRedirect,
  onError,
  onCancel,
  onProcessingChange
}: {
  bookingId: string
  isLight: boolean
  totalAmount: string
  externalRegistrationUrl?: string | null
  onSuccess: () => void
  onRedirect: () => void
  onError: (msg: string) => void
  onCancel: () => void
  onProcessingChange?: (processing: boolean) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [succeeded, setSucceeded] = useState(false)

  const updateProcessing = (value: boolean) => {
    setProcessing(value)
    onProcessingChange?.(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    updateProcessing(true)
    setPaymentError('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required'
    })

    if (error) {
      setPaymentError(error.message || 'Payment failed')
      onError(error.message || 'Payment failed')
      updateProcessing(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      // Open the blank tab IMMEDIATELY on payment success — this is as close
      // as we can get to the fresh user gesture from Stripe's confirmation
      // (the 3-D Secure interaction, or the "Pay" click for non-3DS), which
      // is what lets the browser honour target="_blank". Navigating this
      // already-opened tab via location.href later (after the animation) is
      // always permitted regardless of activation state.
      let externalWindow: Window | null = null
      if (externalRegistrationUrl) {
        try {
          externalWindow = window.open('about:blank', '_blank')
        } catch {
          externalWindow = null
        }
      }

      try {
        await ensureValidToken()
        await confirmPayment({ booking_id: bookingId })
      } catch {
        // Webhook will handle as fallback
      }

      // Show the "Payment Successful" animation first. After the 1.5s
      // animation, point the pre-opened tab at the external URL. The
      // current tab stays on the event page with the updated "Booked"
      // state. Keeping processing=true prevents the modal close handlers
      // from firing while the animation is on-screen.
      setSucceeded(true)
      onSuccess()
      window.setTimeout(() => {
        if (externalRegistrationUrl) {
          if (externalWindow) {
            try {
              externalWindow.location.href = externalRegistrationUrl
            } catch {
              try { externalWindow.close() } catch { /* noop */ }
              window.open(
                externalRegistrationUrl,
                '_blank',
                'noopener,noreferrer'
              )
            }
          } else {
            // Pre-open was blocked at click time — best-effort fallback.
            window.open(
              externalRegistrationUrl,
              '_blank',
              'noopener,noreferrer'
            )
          }
        }
        onRedirect()
      }, 1500)
    } else {
      onError('Payment was not completed')
      updateProcessing(false)
    }
  }

  if (succeeded) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 8px 8px',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width='40' height='40' viewBox='0 0 52 52' style={{ overflow: 'visible' }}>
            <circle
              cx='26'
              cy='26'
              r='24'
              fill='none'
              stroke='#22c55e'
              strokeWidth='3'
              strokeDasharray='150'
              strokeDashoffset='150'
              strokeLinecap='round'
              style={{ animation: 'confirmCircle 0.6s ease forwards' }}
            />
            <path
              d='M14 27l8 8 16-16'
              fill='none'
              stroke='#22c55e'
              strokeWidth='3'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeDasharray='50'
              strokeDashoffset='50'
              style={{ animation: 'confirmTick 0.4s ease forwards 0.5s' }}
            />
          </svg>
        </div>
        <h3
          style={{
            marginTop: 20,
            fontSize: 18,
            fontWeight: 700,
            color: isLight ? '#040F1F' : '#ffffff',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Payment Successful!
        </h3>
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: isLight ? '#555' : '#a0aec0',
            fontFamily: "'DM Sans', sans-serif",
            textAlign: 'center',
            padding: '0 12px',
          }}
        >
          {externalRegistrationUrl
            ? 'Opening registration in a new tab...'
            : 'Finalizing your booking...'}
        </p>
        <style>{`
          @keyframes confirmCircle { to { stroke-dashoffset: 0; } }
          @keyframes confirmTick { to { stroke-dashoffset: 0; } }
        `}</style>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false
          },
          paymentMethodOrder: ['card'],
          wallets: { applePay: 'auto', googlePay: 'auto' },
          defaultValues: {
            billingDetails: {
              address: {
                country: 'GB'
              }
            }
          },
          fields: {
            billingDetails: 'auto'
          },
          terms: {
            card: 'never'
          }
        }}
      />

      {/* Error */}
      {paymentError && (
        <p
          style={{
            color: '#ef4444',
            fontSize: 13,
            margin: '12px 0 0',
            textAlign: 'center'
          }}
        >
          {paymentError}
        </p>
      )}

      {/* Buttons */}
      <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
        <button
          type='button'
          onClick={onCancel}
          disabled={processing}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 80,
            border: `0.66px solid ${
              isLight ? '#d1d5db' : 'rgba(255, 255, 255, 0.23)'
            }`,
            background: isLight ? '#f9fafb' : 'rgba(255, 255, 255, 0.05)',
            color: isLight ? '#555' : '#a0aec0',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            backdropFilter: 'blur(20px)'
          }}
        >
          Cancel
        </button>
        <button
          type='submit'
          disabled={!stripe || processing}
          style={{
            flex: 2,
            height: 48,
            borderRadius: 80,
            border: 'none',
            background:
              'linear-gradient(91.37deg, #5433ff 3.68%, #20bdff 95.65%)',
            color: '#ffffff',
            fontSize: 15,
            fontWeight: 600,
            cursor: !stripe || processing ? 'not-allowed' : 'pointer',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            opacity: !stripe || processing ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {processing ? (
            <div className='w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin' />
          ) : (
            `Pay ${totalAmount}`
          )}
        </button>
      </div>
    </form>
  )
}

/* ── Types ── */
interface EventPaymentSectionProps {
  eventId: string
  list_price: string
  offer_price: string | null
  min_seats_per_booking: number
  max_seats_per_booking: number
  seats_available: number | null
  availability_status: string
  user_booking: {
    booking_id: string
    booking_status: string
    num_seats: number
  } | null
  available_coupons: Array<{
    coupon_code: string
    discount_in: string
    discount: string
    max_discount_amount?: string | null
    min_order_amount?: string | null
  }>
  external_registration_url?: string | null
  isLoading?: boolean
}

const EventPaymentSectionSkeleton = () => {
  return (
    <div className={styles.ed_payment_card}>
      <div className={styles.ed_skeleton_pricing_header} />
      <div className={styles.ed_skeleton_block} style={{ height: 80 }} />
      <div className={styles.ed_skeleton_block} style={{ height: 120 }} />
      <div className={styles.ed_skeleton_block} style={{ height: 44 }} />
    </div>
  )
}

/* ── Main Component ── */
const EventPaymentSection = ({
  eventId,
  list_price,
  offer_price,
  min_seats_per_booking,
  max_seats_per_booking,
  seats_available,
  availability_status,
  user_booking,
  available_coupons,
  external_registration_url,
  isLoading
}: EventPaymentSectionProps) => {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const queryClient = useQueryClient()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  const [seatCount, setSeatCount] = useState(user_booking?.num_seats || min_seats_per_booking || 1)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    coupon_code: string
    discount_amount: string
    total_amount: string
  } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [stripePaymentData, setStripePaymentData] = useState<{
    clientSecret: string
    bookingId: string
  } | null>(null)
  const [optimisticBooking, setOptimisticBooking] = useState<{
    booking_id: string
    booking_status: string
    num_seats: number
  } | null>(null)
  const [showCouponsModal, setShowCouponsModal] = useState(false)
  const [showBookConfirmModal, setShowBookConfirmModal] = useState(false)
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)

  // Derived state
  const isSoldOut = availability_status === 'sold_out'
  const isRegistrationClosed = availability_status === 'registration_closed'
  const activeBooking = optimisticBooking || user_booking
  const hasActiveBooking =
    activeBooking &&
    (activeBooking.booking_status === 'confirmed' ||
      activeBooking.booking_status === 'pending')

  const effectivePrice = offer_price
    ? parseFloat(offer_price)
    : parseFloat(list_price)
  const originalPrice = offer_price ? parseFloat(list_price) : null
  const savings = originalPrice ? originalPrice - effectivePrice : 0
  const savingsPercent = originalPrice
    ? Math.round((savings / originalPrice) * 100)
    : 0
  const subtotal = effectivePrice * seatCount
  const discountAmount = appliedCoupon
    ? parseFloat(appliedCoupon.discount_amount)
    : 0
  const totalAmount = appliedCoupon
    ? parseFloat(appliedCoupon.total_amount)
    : subtotal

  // Apply coupon mutation
  const couponMutation = useMutation({
    mutationFn: async () => {
      await ensureValidToken()
      return applyCoupon({
        event_id: eventId,
        coupon_code: couponCode.trim(),
        num_seats: seatCount
      })
    },
    onSuccess: (data: {
      status: string
      data?: {
        coupon_code: string
        discount_amount: string
        total_amount: string
      }
      message?: string
    }) => {
      if (data.status === 'OK' && data.data) {
        setAppliedCoupon({
          coupon_code: data.data.coupon_code,
          discount_amount: data.data.discount_amount,
          total_amount: data.data.total_amount
        })
        setCouponError('')
        toast.success('Coupon applied successfully!')
      } else {
        setCouponError(data.message || 'Invalid coupon code')
        setAppliedCoupon(null)
      }
    },
    onError: (error: Error) => {
      if (isUnauthenticatedError(error)) {
        openGate('apply a coupon')
        return
      }
      setCouponError(error.message || 'Failed to apply coupon')
      setAppliedCoupon(null)
    }
  })

  // Create booking mutation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookingMutation = useMutation<any, Error>({
    mutationFn: async () => {
      await ensureValidToken()
      const availRes = await checkSeatAvailability({
        event_id: eventId,
        num_seats: seatCount
      })
      if (availRes.status === 'ERROR') {
        throw new Error(availRes.message || 'Seats not available')
      }
      return createBooking({
        event_id: eventId,
        num_seats: seatCount,
        coupon_code: appliedCoupon ? appliedCoupon.coupon_code : undefined
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      if (data.status === 'OK' && data.data) {
        const { booking_id, client_secret } = data.data

        // 100% coupon — no payment needed
        if (!client_secret) {
          setOptimisticBooking({
            booking_id,
            booking_status: 'confirmed',
            num_seats: seatCount
          })
          queryClient.invalidateQueries({ queryKey: ['event-details'] })
          queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
          router.push(`/booking/confirmation?booking_id=${booking_id}`)
          return
        }

        // Show Stripe payment modal — don't set optimistic booking yet
        // The pending state will only show after successful payment or on refetch
        setStripePaymentData({
          clientSecret: client_secret,
          bookingId: booking_id
        })
      } else if (data.status === 'ERROR') {
        toast.error(data.message || 'Failed to create booking')
      }
    },
    onError: (error: Error) => {
      if (isUnauthenticatedError(error)) {
        openGate('book this event')
        return
      }
      toast.error(error.message || 'Failed to create booking')
    }
  })

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await ensureValidToken()
      return cancelBooking({ booking_id: activeBooking!.booking_id })
    },
    onSuccess: (data: { status: string; message?: string }) => {
      if (data.status === 'OK') {
        toast.success('Booking cancelled')
        setOptimisticBooking(null)
        queryClient.invalidateQueries({ queryKey: ['event-details'] })
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      } else {
        toast.error(data.message || 'Failed to cancel booking')
      }
    },
    onError: (error: Error) => {
      if (isUnauthenticatedError(error)) {
        openGate('cancel this booking')
        return
      }
      toast.error(error.message || 'Failed to cancel booking')
    }
  })

  if (isLoading) return <EventPaymentSectionSkeleton />

  const reApplyCoupon = async (newSeatCount: number, code: string) => {
    try {
      await ensureValidToken()
      const data = await applyCoupon({
        event_id: eventId,
        coupon_code: code,
        num_seats: newSeatCount
      })
      if (data.status === 'OK' && data.data) {
        setAppliedCoupon({
          coupon_code: data.data.coupon_code,
          discount_amount: data.data.discount_amount,
          total_amount: data.data.total_amount
        })
        setCouponError('')
      } else {
        setAppliedCoupon(null)
        setCouponError(data.message || 'Coupon no longer valid')
      }
    } catch {
      setAppliedCoupon(null)
      setCouponError('Failed to recalculate coupon')
    }
  }

  const handleDecrement = () => {
    if (seatCount > (min_seats_per_booking || 1)) {
      const newCount = seatCount - 1
      setSeatCount(newCount)
      if (appliedCoupon) {
        reApplyCoupon(newCount, appliedCoupon.coupon_code)
      }
    }
  }

  const handleIncrement = () => {
    if (seatCount < (max_seats_per_booking || 10)) {
      const newCount = seatCount + 1
      setSeatCount(newCount)
      if (appliedCoupon) {
        reApplyCoupon(newCount, appliedCoupon.coupon_code)
      }
    }
  }

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return
    ensureAuthed('apply a coupon', () => {
      setCouponError('')
      couponMutation.mutate()
    })
  }

  const handleApplyCouponByCode = (code: string) => {
    ensureAuthed('apply a coupon', () => {
      void (async () => {
        try {
          await ensureValidToken()
          const data = await applyCoupon({
            event_id: eventId,
            coupon_code: code,
            num_seats: seatCount
          })
          if (data.status === 'OK' && data.data) {
            setAppliedCoupon({
              coupon_code: data.data.coupon_code,
              discount_amount: data.data.discount_amount,
              total_amount: data.data.total_amount
            })
            setCouponError('')
            toast.success('Coupon applied successfully!')
          } else {
            setCouponError(data.message || 'Invalid coupon code')
            setAppliedCoupon(null)
          }
        } catch (error: unknown) {
          if (isUnauthenticatedError(error)) {
            openGate('apply a coupon')
            return
          }
          setCouponError(
            error instanceof Error ? error.message : 'Failed to apply coupon'
          )
          setAppliedCoupon(null)
        }
      })()
    })
  }

  const handlePaymentDismiss = async (bookingId: string) => {
    setStripePaymentData(null)
    try {
      await ensureValidToken()
      await cancelBooking({ booking_id: bookingId })
      setOptimisticBooking(null)
      queryClient.invalidateQueries({ queryKey: ['event-details'] })
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
    } catch {
      // If auto-cancel fails, clear the optimistic state anyway
      // so the user isn't stuck — server-side expiry will handle cleanup
      setOptimisticBooking(null)
      queryClient.invalidateQueries({ queryKey: ['event-details'] })
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

  const handleBookNow = () => {
    ensureAuthed('book this event', () => {
      if (totalAmount > 0) {
        setShowBookConfirmModal(true)
        return
      }
      bookingMutation.mutate()
    })
  }

  const handleConfirmBooking = () => {
    setShowBookConfirmModal(false)
    bookingMutation.mutate()
  }

  const isPending =
    hasActiveBooking && activeBooking!.booking_status === 'pending'
  const isConfirmed =
    hasActiveBooking && activeBooking!.booking_status === 'confirmed'

  // Sold out / Registration closed — disabled CTA without booking UI
  if ((isSoldOut || isRegistrationClosed) && !hasActiveBooking) {
    return (
      <div
        className={styles.ed_payment_card}
        style={{
          background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.5)',
          borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)'
        }}
      >
        <div className={styles.ed_pricing_header}>
          <div className={styles.ed_pricing_header_left}>
            <span className={styles.ed_pricing_label}>Event Pricing</span>
          </div>
          <div className={styles.ed_pricing_header_right}>
            <span className={styles.ed_pricing_amount}>
              {'\u00A3'}
              {effectivePrice.toFixed(2)}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            className={styles.ed_sold_out_btn}
            style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%' }}
            disabled
            aria-label={isRegistrationClosed && !isSoldOut ? 'Registration Closed' : 'Sold Out'}
          >
            {isRegistrationClosed && !isSoldOut ? 'Registration Closed' : 'Sold Out'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.ed_payment_card}
      style={{
        background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.5)',
        borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)'
      }}
    >
      {/* Pricing Header */}
      <div className={styles.ed_pricing_header}>
        <div className={styles.ed_pricing_header_left}>
          <div>
            <span className={styles.ed_pricing_label}>Event Pricing </span>
            <span
              className={styles.ed_pricing_sublabel}
              // style={{ display: 'block' }}
            >
              (Per person)
            </span>
          </div>
          {/* {savings > 0 && (
            <span className={styles.ed_pricing_save}>
              Save {'\u00A3'}
              {savings.toFixed(0)} ({savingsPercent}% off)
            </span>
          )} */}
          {seats_available !== null && seats_available !== undefined && (
            <span className={styles.ed_pricing_save} style={{ color: seats_available > 0 ? '#FFF' : '#e53e3e' }}>
              {seats_available > 0 ? `${seats_available} seat${seats_available !== 1 ? 's' : ''} available` : 'No seats available'}
            </span>
          )}
        </div>
        <div className={styles.ed_pricing_header_right}>
          <span className={styles.ed_pricing_amount}>
            {'\u00A3'}
            {effectivePrice.toFixed(2)}
          </span>
          {originalPrice && (
            <span className={styles.ed_pricing_original}>
              {'\u00A3'}
              {originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Pending Booking Warning */}
      {isPending && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 12,
            background: isLight
              ? 'rgba(234, 179, 8, 0.1)'
              : 'rgba(234, 179, 8, 0.08)',
            border: `1px solid ${
              isLight ? 'rgba(234, 179, 8, 0.4)' : 'rgba(234, 179, 8, 0.3)'
            }`,
            marginBottom: 16,
            marginTop: 16
          }}
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='#EAB308'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            style={{ flexShrink: 0 }}
          >
            <circle cx='12' cy='12' r='10' />
            <polyline points='12 6 12 12 16 14' />
          </svg>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#EAB308',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              lineHeight: 1.4
            }}
          >
            You have an incomplete booking. Cancel below to start fresh.
          </span>
        </div>
      )}
      {isConfirmed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 12,
            background: isLight
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(34, 197, 94, 0.08)',
            border: `1px solid ${
              isLight ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)'
            }`,
            marginBottom: 16,
            marginTop: 16
          }}
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='#22C55E'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            style={{ flexShrink: 0 }}
          >
            <circle cx='12' cy='12' r='10' />
            <polyline points='12 6 12 12 16 14' />
          </svg>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#22C55E',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              lineHeight: 1.4
            }}
          >
            You have booked this event ({activeBooking!.num_seats}{' '}
            {activeBooking!.num_seats > 1 ? 'seats' : 'seat'}).
          </span>
        </div>
      )}

      <div
        className={styles.ed_seats_section_container}
        style={
          hasActiveBooking ? { opacity: 0.5, pointerEvents: 'none' } : undefined
        }
      >
        {/* Select Seats */}
        <div className={styles.ed_seats_section}>
          <div className={styles.ed_seats_header}>
            <PeopleOutlinedIcon
              style={{ fontSize: 20, color: isLight ? '#040F1F' : '#ffffff' }}
            />
            <span
              className={styles.ed_seats_title}
              style={{ color: isLight ? '#040F1F' : '#ffffff' }}
            >
              Select Seats
            </span>
          </div>
          <div className={styles.ed_seats_counter_container}>
              <p></p>
          </div>

          <div
            className={styles.ed_seats_counter_row}
            style={{ background: isLight ? '#f1f5f9' : '#1a2332' }}
          >
            <div>
              <span
                className={styles.ed_seats_label}
                style={{ color: isLight ? '#040F1F' : '#ffffff' }}
              >
                Number of Seats
              </span>
              <span
                className={styles.ed_seats_range}
                style={{ color: isLight ? '#888' : '#718096' }}
              >
                (Min: {min_seats_per_booking || 1}, Max:{' '}
                {max_seats_per_booking || 10})
              </span>
            </div>
            <div className={styles.ed_seats_counter}>
              <button
                onClick={handleDecrement}
                className={styles.ed_seats_btn_minus}
                style={{
                  background: isLight ? '#e2e8f0' : '#4a5568',
                  color: isLight ? '#040F1F' : '#ffffff'
                }}
                disabled={
                  !!hasActiveBooking ||
                  seatCount <= (min_seats_per_booking || 1)
                }
              >
                <RemoveIcon style={{ fontSize: 18 }} />
              </button>
              <span
                className={styles.ed_seats_count}
                style={{ color: isLight ? '#040F1F' : '#ffffff' }}
              >
                {seatCount}
              </span>
              <button
                onClick={handleIncrement}
                className={styles.ed_seats_btn_plus}
                disabled={
                  !!hasActiveBooking ||
                  seatCount >= (max_seats_per_booking || 10)
                }
              >
                <AddIcon style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Coupon Section */}
        <div
          className={styles.ed_coupon_section}
          style={{ borderColor: isLight ? '#356FEE' : '#06c1fa' }}
        >
          <div className={styles.ed_coupon_input_row}>
            {appliedCoupon ? (
              <>
                <span style={{ color: '#22c55e', fontSize: 13, flex: 1 }}>
                  {appliedCoupon.coupon_code} applied
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  className={styles.ed_coupon_apply_btn}
                  style={{ color: '#ef4444' }}
                  disabled={!!hasActiveBooking}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <input
                  type='text'
                  placeholder='Enter Coupon Code'
                  value={couponCode}
                  onChange={e => {
                    setCouponCode(e.target.value.toUpperCase())
                    setCouponError('')
                  }}
                  className={styles.ed_coupon_input}
                  style={{
                    color: isLight ? '#040F1F' : '#ffffff',
                    background: 'transparent'
                  }}
                  disabled={!!hasActiveBooking}
                />
                <button
                  onClick={handleApplyCoupon}
                  className={styles.ed_coupon_apply_btn}
                  style={{ color: isLight ? '#356FEE' : '#06c1fa' }}
                  disabled={
                    !!hasActiveBooking ||
                    couponMutation.isPending ||
                    !couponCode.trim()
                  }
                >
                  {couponMutation.isPending ? 'Applying...' : 'Apply'}
                </button>
              </>
            )}
          </div>
          {couponError && (
            <p
              style={{
                color: '#ef4444',
                fontSize: 12,
                padding: '0 0px 8px',
                margin: 0
              }}
            >
              {couponError}
            </p>
          )}

          {/* Available Coupons Link */}
          {/* {available_coupons.length > 0 && !appliedCoupon && !hasActiveBooking && (
            <div
              onClick={() => setShowCouponsModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 0 12px',
                cursor: 'pointer'
              }}
            >
              <LocalOfferOutlinedIcon
                style={{ fontSize: 16, color: isLight ? '#356FEE' : '#06c1fa' }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isLight ? '#356FEE' : '#06c1fa',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  flex: 1
                }}
              >
                {available_coupons.length} coupon
                {available_coupons.length > 1 ? 's' : ''} available
              </span>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width={16}
                height={16}
                viewBox='0 0 24 24'
                fill='none'
                stroke={isLight ? '#356FEE' : '#06c1fa'}
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polyline points='9 18 15 12 9 6' />
              </svg>
            </div>
          )} */}

          {/* Price Breakdown */}
          <div className={styles.ed_price_breakdown}>
            <div className={styles.ed_price_row}>
              <span style={{ color: isLight ? '#555' : '#a0aec0' }}>
                Price per seat
              </span>
              <span style={{ color: isLight ? '#040F1F' : '#ffffff' }}>
                {'\u00A3'}
                {effectivePrice.toFixed(2)}
              </span>
            </div>
            <div className={styles.ed_price_row}>
              <span style={{ color: isLight ? '#555' : '#a0aec0' }}>
                Number of seats
              </span>
              <span style={{ color: isLight ? '#040F1F' : '#ffffff' }}>
                x {seatCount}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className={styles.ed_price_row}>
                <span style={{ color: '#22c55e' }}>Coupon discount</span>
                <span style={{ color: '#22c55e' }}>
                  - {'\u00A3'}
                  {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div
              className={`${styles.ed_price_row} ${styles.ed_price_total_row}`}
            >
              <span
                className={styles.ed_price_total_label}
                style={{ color: isLight ? '#040F1F' : '#ffffff' }}
              >
                Total Amount
              </span>
              <span
                className={styles.ed_price_total_value}
                style={{ color: isLight ? '#356FEE' : '#06c1fa' }}
              >
                {'\u00A3'}
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {stripePaymentData &&
        createPortal(
          <div
            className='fixed inset-0 z-10000 flex items-end sm:items-center justify-center'
            style={{
              background: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)'
            }}
            onClick={() => {
              if (isPaymentProcessing) return
              handlePaymentDismiss(stripePaymentData.bookingId)
            }}
          >
            <div
              className='relative w-full sm:max-w-md sm:mx-4'
              style={{
                background: isLight ? '#ffffff' : '#0f1a2e',
                border: isLight
                  ? '1px solid #e2e8f0'
                  : '1px solid rgba(160, 174, 192, 0.2)',
                borderRadius: 20,
                maxHeight: '90vh',
                overflowY: 'auto',
                animation: 'popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
                <button
                  onClick={() =>
                    handlePaymentDismiss(stripePaymentData.bookingId)
                  }
                  disabled={isPaymentProcessing}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: isPaymentProcessing ? 'not-allowed' : 'pointer',
                    color: isLight ? '#555' : '#a0aec0',
                    padding: 4,
                    opacity: isPaymentProcessing ? 0.5 : 1,
                  }}
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              {/* Payment Form */}
              <div style={{ padding: '0 20px 20px', colorScheme: isLight ? 'light' : 'dark' }}>
                <Elements
                  stripe={getStripe()}
                  options={{
                    clientSecret: stripePaymentData.clientSecret,
                    appearance: {
                      theme: isLight ? 'stripe' : 'night',
                      variables: {
                        colorPrimary: isLight ? '#5433ff' : '#20bdff',
                        colorText: isLight ? '#1a1a2e' : '#ffffff',
                        colorTextSecondary: isLight ? '#555' : '#a0aec0',
                        colorIcon: isLight ? '#555' : '#ffffff',
                        colorBackground: isLight
                          ? '#f9fafb'
                          : '#1a1f36',
                        colorTextPlaceholder: isLight ? '#6b7280' : '#a0aec0',
                        colorDanger: '#ef4444',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSizeBase: '15px',
                        fontWeightNormal: '400',
                        borderRadius: '12px',
                        spacingUnit: '4px',
                        spacingGridRow: '16px',
                      },
                      
                      rules: {
                        '.PoweredByStripe': {
                          display: 'none'
                        },
                        '.Input': {
                          border: isLight
                            ? '0.66px solid #d1d5db'
                            : '0.66px solid rgba(255, 255, 255, 0.23)',
                          backgroundColor: isLight
                            ? '#f9fafb'
                            : 'rgba(255, 255, 255, 0.05) !important',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                          boxShadow: 'none',
                          padding: '12px 16px',
                          transition: 'border-color 0.2s ease'
                        },
                        '.Input:focus': {
                          border: isLight
                            ? '0.66px solid #5433ff'
                            : '0.66px solid #20bdff',
                          boxShadow: isLight
                            ? '0 0 0 3px rgba(84, 51, 255, 0.1)'
                            : '0 0 0 3px rgba(32, 189, 255, 0.15)'
                        },
                        '.Input--invalid': {
                          border: '0.66px solid #ef4444',
                          boxShadow: 'none'
                        },
                        '.Label': {
                          fontWeight: '500',
                          fontSize: '13px',
                          color: isLight ? '#555' : '#a0aec0',
                          marginBottom: '6px'
                        },
                        '.Tab': {
                          border: isLight
                            ? '1px solid rgba(169, 111, 44, 0.2)'
                            : '0.66px solid rgba(255, 255, 255, 0.23)',
                          backgroundColor: isLight
                            ? '#f9fafb'
                            : 'rgba(255, 255, 255, 0.05)',
                          boxShadow: 'none',
                          borderRadius: '12px'
                        },
                        '.Tab--selected': {
                          border: isLight
                            ? '0.66px solid #5433ff'
                            : '0.66px solid #20bdff',
                          backgroundColor: isLight
                            ? '#f0edff'
                            : 'rgba(255, 255, 255, 0.05)',
                          boxShadow: 'none',
                          color: '#06c1fa'
                        },
                        '.Tab:hover': {
                          border: isLight
                            ? '0.66px solid #5433ff'
                            : '0.66px solid #20bdff',
                          color: isLight ? '#5433ff' : '#20bdff'
                        },
                        '.TabIcon--selected': {
                          fill: '#06c1fa'
                        },
                        '.Block': {
                          backgroundColor: isLight
                            ? '#f9fafb'
                            : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          border: isLight
                            ? '1px solid #d1d5db'
                            : '1px solid rgba(255, 255, 255, 0.15)',
                        },
                        '.BlockDivider': {
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '12px',
                        },
                        '.DropdownItem': {
                          backgroundColor: isLight ? '#ffffff' : '#1a1f36',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                        },
                        '.DropdownItem--highlight': {
                          backgroundColor: isLight ? '#f0edff' : 'rgba(255, 255, 255, 0.05)',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                        },
                        '.PickerItem': {
                          backgroundColor: isLight ? '#ffffff' : '#1a1f36',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                          border: isLight
                            ? '1px solid #d1d5db'
                            : '1px solid rgba(255, 255, 255, 0.15)',
                        },
                        '.PickerItem--highlight': {
                          backgroundColor: isLight ? '#f0edff' : 'rgba(255, 255, 255, 0.05)',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                        },
                        '.PickerItem--selected': {
                          backgroundColor: isLight ? '#f0edff' : 'rgba(255, 255, 255, 0.05)',
                          color: isLight ? '#5433ff' : '#20bdff',
                          border: isLight
                            ? '1px solid #5433ff'
                            : '1px solid #20bdff',
                        },
                        '.Menu': {
                          backgroundColor: isLight ? '#ffffff' : '#1a1f36',
                          border: isLight
                            ? '1px solid #d1d5db'
                            : '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: isLight
                            ? '0 4px 12px rgba(0,0,0,0.1)'
                            : '0 4px 12px rgba(0,0,0,0.4)',
                        },
                        '.MenuGroup': {
                          backgroundColor: isLight ? '#ffffff' : '#1a1f36',
                        },
                        '.MenuAction': {
                          backgroundColor: isLight ? '#ffffff' : '#1a1f36',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                        },
                        '.MenuAction--highlight': {
                          backgroundColor: isLight ? '#f0edff' : 'rgba(255, 255, 255, 0.05)',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                        },
                        '.Popup': {
                          backgroundColor: isLight ? '#ffffff' : '#1a1f36',
                          border: isLight
                            ? '1px solid #d1d5db'
                            : '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: isLight
                            ? '0 4px 16px rgba(0,0,0,0.1)'
                            : '0 4px 16px rgba(0,0,0,0.5)',
                        },
                        '.SearchBar': {
                          backgroundColor: isLight ? '#f9fafb' : 'rgba(255, 255, 255, 0.05)',
                          color: isLight ? '#1a1a2e' : '#ffffff',
                          border: isLight
                            ? '1px solid #d1d5db'
                            : '1px solid rgba(255, 255, 255, 0.15)',
                        }
                      }
                    }
                  }}
                >
                  <StripePaymentForm
                    bookingId={stripePaymentData.bookingId}
                    isLight={isLight}
                    totalAmount={`\u00A3${totalAmount.toFixed(2)}`}
                    externalRegistrationUrl={external_registration_url}
                    onProcessingChange={setIsPaymentProcessing}
                    onSuccess={() => {
                      // Payment succeeded — update cached data but keep the
                      // modal open so StripePaymentForm can show its "Payment
                      // Successful" screen before redirecting.
                      setOptimisticBooking({
                        booking_id: stripePaymentData.bookingId,
                        booking_status: 'confirmed',
                        num_seats: seatCount
                      })
                      queryClient.invalidateQueries({
                        queryKey: ['event-details']
                      })
                      queryClient.invalidateQueries({
                        queryKey: ['my-bookings']
                      })
                    }}
                    onRedirect={() => {
                      // Success animation has finished; the new tab (if any)
                      // has already been opened by StripePaymentForm. Close
                      // the modal so the event page shows the updated
                      // "Booked" state and notify the user.
                      setIsPaymentProcessing(false)
                      setStripePaymentData(null)
                      toast.success('Booking Successful')
                    }}
                    onError={msg => {
                      setIsPaymentProcessing(false)
                      toast.error(msg)
                      handlePaymentDismiss(stripePaymentData.bookingId)
                    }}
                    onCancel={() => {
                      if (isPaymentProcessing) return
                      handlePaymentDismiss(stripePaymentData.bookingId)
                    }}
                  />
                </Elements>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Bottom: Total + Book Now / Cancel */}
      <div className={styles.ed_payment_bottom}>
        {!hasActiveBooking ? (
          <>
            <div className={styles.ed_payment_total_display}>
              <span
                className={styles.ed_payment_total_text}
                style={{ color: isLight ? '#555' : '#a0aec0' }}
              >
                Total
              </span>
              <span
                className={styles.ed_payment_total_amount}
                style={{ color: isLight ? '#356FEE' : '#06c1fa' }}
              >
                {'\u00A3'}
                {totalAmount.toFixed(2)}
              </span>
            </div>
            <button
              className={styles.ed_book_now_btn}
              onClick={handleBookNow}
              disabled={bookingMutation.isPending}
              style={bookingMutation.isPending ? { opacity: 0.7 } : undefined}
            >
              {bookingMutation.isPending ? (
                <div className='w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin' />
              ) : (
                'Book Now'
              )}
            </button>
          </>
        ) : (
          <>
            {/* Pending: Cancel & Rebook */}
            {isPending && (
              <button
                onClick={() => ensureAuthed('cancel this booking', () => cancelMutation.mutate())}
                disabled={cancelMutation.isPending}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 80,
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  opacity: cancelMutation.isPending ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {cancelMutation.isPending ? (
                  <div className='w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin' />
                ) : (
                  'Cancel & Rebook'
                )}
              </button>
            )}

            {/* Confirmed: Booked button (Unfollow/Following style) */}
            {isConfirmed && (
              <Link
                href={external_registration_url || ''}
                target="_blank"
                rel="noopener,noreferrer"
                type='button'
                // disabled
                aria-label='Booked'
                className={styles.ed_booked_btn}
                style={{ width: '100%' }}
              >
                Booked
              </Link>
            )}
          </>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      <ConfirmModal
        isOpen={showBookConfirmModal}
        onClose={() => setShowBookConfirmModal(false)}
        onConfirm={handleConfirmBooking}
        title='Confirm Booking'
        message={
          <>
            You are about to book {seatCount} seat{seatCount > 1 ? 's' : ''} for {'£'}
            {totalAmount.toFixed(2)}. Bookings are non-cancellable and non-refundable once
            confirmed. By proceeding, you agree to our{' '}
            <Link
              href='/privacy-policy'
              target='_blank'
              rel='noopener noreferrer'
              style={{
                color: isLight ? '#356FEE' : '#06c1fa',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Refund policy
            </Link>
            .
          </>
        }
        confirmText='Proceed'
        cancelText='Cancel'
        isLoading={bookingMutation.isPending}
        loadingText='Processing'
      />

      {authGateModal}

      {/* Available Coupons Modal */}
      {showCouponsModal &&
        available_coupons.length > 0 &&
        createPortal(
          <div
            className='fixed inset-0 z-10000 flex items-center justify-center'
            style={{
              background: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)'
            }}
            onClick={() => setShowCouponsModal(false)}
          >
            <div
              className='relative rounded-2xl p-6 max-w-sm w-full mx-4'
              style={{
                background: isLight
                  ? '#fff'
                  : '#040f1f url(/_next/static/media/gradient-bg.512ca683.png) 50%/cover no-repeat',
                border: isLight
                  ? '1px solid #E8EEFE'
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight
                  ? '0 24px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)'
                  : '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
                animation: 'popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setShowCouponsModal(false)}
                className={`absolute top-4 right-4 transition-colors ${
                  isLight
                    ? 'text-gray-400 hover:text-gray-700'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <X className='w-5 h-5 cursor-pointer' />
              </button>

              {/* Title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16
                }}
              >
                <LocalOfferOutlinedIcon
                  style={{
                    fontSize: 22,
                    color: isLight ? '#356FEE' : '#06c1fa'
                  }}
                />
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: isLight ? '#040F1F' : '#ffffff',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                >
                  Available Coupons
                </h2>
              </div>

              {/* Coupon List */}
              <div
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                {available_coupons.map((coupon, index) => {
                  const isPercentage = coupon.discount_in === '0'
                  const value = parseFloat(coupon.discount)
                  const discountLabel = isPercentage
                    ? `${value}% OFF`
                    : `\u00A3${value.toFixed(2)} OFF`
                  return (
                    <div
                      key={coupon.coupon_code + index}
                      style={{
                        border: `1px solid ${
                          isLight ? '#E8EEFE' : 'rgba(6, 193, 250, 0.3)'
                        }`,
                        borderRadius: 12,
                        padding: 14,
                        background: isLight
                          ? '#f8fafc'
                          : 'rgba(6, 193, 250, 0.05)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isLight ? '#356FEE' : '#06c1fa',
                            background: isLight
                              ? '#EEF2FF'
                              : 'rgba(6, 193, 250, 0.15)',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                          }}
                        >
                          {discountLabel}
                        </span>
                        <button
                          onClick={() => {
                            setCouponCode(coupon.coupon_code)
                            setCouponError('')
                            setShowCouponsModal(false)
                            handleApplyCouponByCode(coupon.coupon_code)
                          }}
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isLight ? '#356FEE' : '#06c1fa',
                            background: 'transparent',
                            border: `1.5px solid ${
                              isLight ? '#356FEE' : '#06c1fa'
                            }`,
                            borderRadius: 6,
                            padding: '4px 16px',
                            cursor: 'pointer',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            letterSpacing: 0.5
                          }}
                        >
                          APPLY
                        </button>
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          border: `1px dashed ${
                            isLight ? '#a0aec0' : '#718096'
                          }`,
                          borderRadius: 4,
                          padding: '3px 10px',
                          marginBottom: 6
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: isLight ? '#040F1F' : '#ffffff',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            letterSpacing: 1
                          }}
                        >
                          {coupon.coupon_code}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: isLight ? '#888' : '#718096',
                          fontFamily: "'DM Sans', sans-serif"
                        }}
                      >
                        {coupon.min_order_amount &&
                        parseFloat(coupon.min_order_amount) > 0
                          ? `Min. order \u00A3${parseFloat(
                              coupon.min_order_amount
                            ).toFixed(2)}`
                          : 'No minimum order required'}
                        {coupon.max_discount_amount &&
                        parseFloat(coupon.max_discount_amount) > 0
                          ? ` \u00B7 Max discount \u00A3${parseFloat(
                              coupon.max_discount_amount
                            ).toFixed(2)}`
                          : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default EventPaymentSection
