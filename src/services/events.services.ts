// src/services/events.services.ts
//
// Migrated to Server Actions in src/app/actions/events.ts (no longer axios):
//   - PUBLIC reads: getEvents, getEventDetails (soft auth)
//   - GATED booking flows: check-availability, apply-coupon, create-booking,
//     cancel-booking, my-bookings, booking-detail (strict auth)
// The gated actions surface the gateway's UNAUTHENTICATED signal by throwing an
// UnauthenticatedError so call sites can open the login gate (never force-logout
// — REQUIREMENTS §5 R4).
//
// EXCEPTION: confirmPayment stays on its explicit same-origin route — it is
// payment-critical and on the §6 keep-list (event/confirm-payment), to be
// hardened with idempotency in Phase 3. It calls the route with plain fetch
// (credentials:"include") now that the client axios transport is retired.

import {
  getEventsAction,
  getEventDetailsAction,
  checkSeatAvailabilityAction,
  applyCouponAction,
  createBookingAction,
  cancelBookingAction,
  getMyBookingsAction,
  getBookingDetailAction,
} from "@/app/actions/events";
import { UnauthenticatedError } from "@/lib/authError";

export interface GetEventsPayload {
  search_text?: string;
  sort_by?: string;
  company_ids?: string;
  pricing_type?: string;
  page?: number;
  limit?: number;
  event_type?: string;
}

export interface GetMyBookingsPayload {
  page?: number;
  limit?: number;
}

export interface GetEventDetailsPayload {
  id: string;
}

export const getEvents = async (payload: GetEventsPayload) => {
  // Migrated to Server Action (soft auth → anonymous-friendly). The action's
  // `data` is the verbatim backend body; callers read `page?.data?.result` /
  // `page?.data?.total_count`.
  const res = await getEventsAction(payload);
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch events");
  }
  return res.data;
};

export const getMyBookings = async (payload: GetMyBookingsPayload) => {
  // Migrated to a strict Server Action. The action's `data` is the verbatim
  // backend body; the EventListing bookings tab reads off that shape.
  const res = await getMyBookingsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch my bookings");
  }
  return res.data;
};

export const getEventDetails = async (payload: GetEventDetailsPayload) => {
  // Migrated to Server Action (soft auth). The action's `data` is the verbatim
  // backend body; callers read `eventResponse?.data`.
  const res = await getEventDetailsAction({ id: payload.id });
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch event details");
  }
  return res.data;
};

export interface CheckAvailabilityPayload {
  event_id: string;
  num_seats: number;
}

export interface ApplyCouponPayload {
  event_id: string;
  coupon_code: string;
  num_seats: number;
}

export interface CreateBookingPayload {
  event_id: string;
  num_seats: number;
  coupon_code?: string;
}

export interface ConfirmPaymentPayload {
  booking_id: string;
}

export interface BookingDetailPayload {
  booking_id: string;
}

export interface CancelBookingPayload {
  booking_id: string;
}

export const checkSeatAvailability = async (payload: CheckAvailabilityPayload) => {
  // Migrated to a strict Server Action. The action's `data` is the verbatim
  // backend body; useBooking reads `availRes.status` / `availRes.data.available`
  // / `availRes.data.seats_available` off that body, so we return it whole.
  const res = await checkSeatAvailabilityAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to check seat availability");
  }
  return res.data;
};

export const applyCoupon = async (payload: ApplyCouponPayload) => {
  // Migrated to a strict Server Action; returns the verbatim backend body.
  const res = await applyCouponAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to apply coupon");
  }
  return res.data;
};

export const createBooking = async (payload: CreateBookingPayload) => {
  // Migrated to a strict Server Action. useBooking reads `res.status` /
  // `res.data.booking_id` / `res.data.client_secret` off the backend body.
  const res = await createBookingAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to create booking");
  }
  return res.data;
};

export const confirmPayment = async (payload: ConfirmPaymentPayload) => {
  // Payment-critical keep-list route (§6). Same-origin POST with the httpOnly
  // session cookie forwarded — the route handler attaches the Bearer server-side.
  try {
    const res = await fetch("/api/event/confirm-payment", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      throw new Error(
        body?.message || `Failed to confirm payment (HTTP ${res.status})`,
      );
    }

    return body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error confirming payment:", error);
    throw new Error(error?.message || "Failed to confirm payment");
  }
};

export const getBookingDetail = async (payload: BookingDetailPayload) => {
  // Migrated to a strict Server Action; returns the verbatim backend body
  // (BookingDetailLayout / BookingConfirmation read off that shape).
  const res = await getBookingDetailAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch booking detail");
  }
  return res.data;
};

export const cancelBooking = async (payload: CancelBookingPayload) => {
  // Migrated to a strict Server Action; returns the verbatim backend body.
  const res = await cancelBookingAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to cancel booking");
  }
  return res.data;
};
