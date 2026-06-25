'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import { ensureValidToken } from '@/lib/tokenManager'
import {
  checkSeatAvailability,
  createBooking,
  confirmPayment,
  cancelBooking,
} from '@/services/events.services'

interface UseBookingParams {
  eventId: string
  seatCount: number
  appliedCouponCode?: string | null
}

export function useBooking({ eventId, seatCount, appliedCouponCode }: UseBookingParams) {
  const [bookingLoading, setBookingLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const handleBookNow = async () => {
    setBookingLoading(true)
    setBookingError(null)

    try {
      await ensureValidToken()

      // Check seat availability first
      const availRes = await checkSeatAvailability({
        event_id: eventId,
        num_seats: seatCount,
      })

      if (availRes.status === 'ERROR' || (availRes.data && !availRes.data.available)) {
        const seatsLeft = availRes.data?.seats_available ?? 0
        const msg = availRes.message || (seatsLeft > 0
          ? `Only ${seatsLeft} seat(s) available`
          : 'Sold out')
        setBookingError(msg)
        toast.error(msg)
        setBookingLoading(false)
        return
      }

      // Create booking
      const res = await createBooking({
        event_id: eventId,
        num_seats: seatCount,
        coupon_code: appliedCouponCode || undefined,
      })

      if (res.status === 'OK' && res.data) {
        const { booking_id, client_secret } = res.data

        // 100% coupon — no payment needed
        if (!client_secret) {
          toast.success('Booking confirmed!')
          setPendingBookingId(booking_id)
          setBookingLoading(false)
          return
        }

        // Show Stripe payment modal
        setPendingBookingId(booking_id)
        setClientSecret(client_secret)
        setShowPaymentModal(true)
      } else {
        const msg = res.message || 'Failed to create booking'
        setBookingError(msg)
        toast.error(msg)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Something went wrong'
      setBookingError(msg)
      toast.error(msg)
    } finally {
      setBookingLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    if (!pendingBookingId) return

    try {
      await ensureValidToken()
      await confirmPayment({ booking_id: pendingBookingId })
    } catch {
      // Webhook will handle as fallback
    }

    setShowPaymentModal(false)
    setClientSecret(null)
    toast.success('Payment successful! Booking confirmed.')
  }

  const handlePaymentCancel = async () => {
    if (pendingBookingId) {
      try {
        await ensureValidToken()
        await cancelBooking({ booking_id: pendingBookingId })
      } catch {
        // Silent — webhook cleanup will handle
      }
    }

    setShowPaymentModal(false)
    setClientSecret(null)
    setPendingBookingId(null)
    toast.info('Payment cancelled')
  }

  const resetBooking = () => {
    setClientSecret(null)
    setPendingBookingId(null)
    setShowPaymentModal(false)
    setBookingError(null)
    setBookingLoading(false)
  }

  return {
    bookingLoading,
    clientSecret,
    pendingBookingId,
    showPaymentModal,
    bookingError,
    handleBookNow,
    handlePaymentSuccess,
    handlePaymentCancel,
    resetBooking,
  }
}
