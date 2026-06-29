"use server";

// Read Server Actions for the public Events domain (REQUIREMENTS §4.4).
//
// Replaces `src/app/api/{event-list,event-details}` proxy routes. Soft auth so
// anonymous users can browse events + open an event detail; a logged-in user
// also gets their `user_booking` / `booking_status`.
//
// NOTE: the gated reads on the Events screens (my-bookings, booking-detail,
// create/confirm/cancel booking) are NOT migrated here — they stay strict and
// are handled in later phases.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

export interface GetEventsPayload {
  search_text?: string;
  sort_by?: string;
  company_ids?: string;
  pricing_type?: string;
  page?: number;
  limit?: number;
  event_type?: string;
}

// The events read endpoints return verbatim backend bodies (dynamic shape); the
// service returns `res.data` and the call sites read `page?.data?.result`. `data`
// is `any` to preserve the original axios pass-through ergonomics — same
// documented exception as src/app/actions/feed.ts.

/** POST /api/web/events — public events listing (infinite scroll, filters). */
export async function getEventsAction(payload: GetEventsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventsList, payload, { auth: "soft" });
}

/** POST /api/web/event — public event detail by masked id. */
export async function getEventDetailsAction(payload: { id: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventDetails, { id: payload.id }, { auth: "soft" });
}

// ---------------------------------------------------------------------------
// Gated event-booking Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes
//   event/create-booking, event/check-availability, event/apply-coupon,
//   event/cancel-booking, event/my-bookings, event/booking-detail.
//
// NOTE: event/confirm-payment is NOT migrated — it stays an explicit route
// (REQUIREMENTS §6 keep-list: payment-critical, add idempotency in Phase 3).
//
// Each returns the unchanged `{ status, code?, message?, data }` envelope whose
// `data` is the verbatim backend body (the booking flow reads `res.status` /
// `res.data.available` / `res.data.booking_id` off that body). A logged-out
// caller gets `code:"UNAUTHENTICATED"` (no network hit) which the client maps
// to its login gate (never force-logout). The booking surfaces are interactive
// client flows (useBooking / EventListing bookings tab), so they keep their
// existing query invalidation and are NOT revalidated here.
//
// `data` is `any` to preserve the original axios pass-through ergonomics — same
// documented exception as src/app/actions/feed.ts.
// ---------------------------------------------------------------------------

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

export interface BookingDetailPayload {
  booking_id: string;
}

export interface CancelBookingPayload {
  booking_id: string;
}

export interface GetMyBookingsPayload {
  page?: number;
  limit?: number;
}

/** POST /api/mobile/event/check-availability — seats left for an event. */
export async function checkSeatAvailabilityAction(
  payload: CheckAvailabilityPayload,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventCheckAvail, payload, { auth: "strict" });
}

/** POST /api/mobile/event/apply-coupon — validate/apply a coupon code. */
export async function applyCouponAction(payload: ApplyCouponPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventApplyCoupon, payload, { auth: "strict" });
}

/** POST /api/mobile/event/create-booking — create a (pending) booking. */
export async function createBookingAction(payload: CreateBookingPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventCreateBooking, payload, { auth: "strict" });
}

/** POST /api/mobile/event/cancel-booking — cancel a pending/confirmed booking. */
export async function cancelBookingAction(payload: CancelBookingPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventCancelBooking, payload, { auth: "strict" });
}

/** POST /api/mobile/event/my-bookings — the user's bookings (bulk). */
export async function getMyBookingsAction(payload: GetMyBookingsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventMyBookings, payload, { auth: "strict" });
}

/** POST /api/mobile/event/booking-detail — a single booking's detail. */
export async function getBookingDetailAction(payload: BookingDetailPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.eventBookingDetail, payload, { auth: "strict" });
}
