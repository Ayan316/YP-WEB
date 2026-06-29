import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', p), 'utf-8')

describe('Legal content — Young Professionals Global branding', () => {
  it('Terms of Use mentions the Young Professionals entity and Dan Miller contact', () => {
    const terms = read('components/legal/TermsContent.tsx')
    expect(terms).toContain('Young Professionals – Inspiring a New Generation Ltd')
    expect(terms).toContain('dan.miller@young-professionals.uk')
    expect(terms).toContain('info@young-professionals.uk')
    expect(terms).toContain('Company number: 09719565')
    expect(terms).toContain('Young Professionals Global')
    expect(terms).toContain('Terms of Use')
  })

  it('Terms page uses the Terms of Use title in Next.js metadata', () => {
    const page = read('app/terms-of-use/page.tsx')
    expect(page).toContain('Terms of Use')
  })

  it('Terms of Use uses clickable email, address and website links', () => {
    const terms = read('components/legal/TermsContent.tsx')
    expect(terms).toContain('EmailLink')
    expect(terms).toContain('AddressLink')
    expect(terms).toContain('WebsiteLink')
  })

  it('Terms of Use includes the Refund Policy copy', () => {
    const terms = read('components/legal/TermsContent.tsx')
    expect(terms).toContain('Refund Policy')
    expect(terms).toContain('Exceptional refund requests')
    expect(terms).toContain('Chargebacks')
  })

  it('Privacy Policy reflects the UK GDPR / Young Professionals Global copy', () => {
    const privacy = read('components/legal/PrivacyPolicyContent.tsx')
    expect(privacy).toContain('Young Professionals Global Privacy Policy')
    expect(privacy).toContain('Data Protection Act 2018')
    expect(privacy).toContain('info@young-professionals.uk')
    expect(privacy).toContain('Amazon AWS')
  })

  it('Privacy Policy uses the shared clickable link helpers', () => {
    const privacy = read('components/legal/PrivacyPolicyContent.tsx')
    expect(privacy).toContain('EmailLink')
    expect(privacy).toContain('AddressLink')
  })
})

describe('Event booking UX — paid + free flows', () => {
  it('EventPaymentSection renders a Booked button in the confirmed state', () => {
    const src = read('components/events/EventPaymentSection.tsx')
    expect(src).toMatch(/ed_booked_btn/)
    expect(src).toMatch(/Booked/)
  })

  it('EventPaymentSection uses the shared ConfirmModal for booking confirmation', () => {
    const src = read('components/events/EventPaymentSection.tsx')
    expect(src).toContain("import ConfirmModal from '../commonUI/ConfirmModal'")
    expect(src).toContain("title='Confirm Booking'")
    expect(src).not.toContain('BookingConfirmModal')
  })

  it('EventPaymentSection disables the CTA when availability_status is registration_closed', () => {
    const src = read('components/events/EventPaymentSection.tsx')
    expect(src).toContain("availability_status === 'registration_closed'")
    expect(src).toContain('Registration Closed')
  })

  it('EventFreePaymentSection shows a "Registered" button after successful registration', () => {
    const src = read('components/events/EventFreePaymentSection.tsx')
    expect(src).toMatch(/ed_booked_btn/)
    expect(src).toMatch(/Registered/)
    expect(src).not.toMatch(/>Booked</)
  })

  it('EventFreePaymentSection disables the register button when registration is closed', () => {
    const src = read('components/events/EventFreePaymentSection.tsx')
    expect(src).toContain("availability_status === 'registration_closed'")
    expect(src).toContain('Registration Closed')
  })

  it('BookingConfirmation handles the free-event confirmation copy', () => {
    const src = read('components/events/BookingConfirmation.tsx')
    expect(src).toContain("searchParams.get('is_free')")
    expect(src).toContain('isFreeEvent')
    expect(src).toContain('Registration Confirmed!')
  })
})

describe('Event date display — same-day conflation', () => {
  it('EventInfoSection conflates same-day ranges and labels multi-day as Start/End Date', () => {
    const src = read('components/events/EventInfoSection.tsx')
    expect(src).toContain('isSameCalendarDay')
    expect(src).toMatch(/Event date/)
    expect(src).toMatch(/Start Date/)
    expect(src).toMatch(/End Date/)
    expect(src).not.toContain('Date & Time')
  })

  it('EventCard collapses same-day events to a single date label', () => {
    const src = read('components/events/EventCard.tsx')
    expect(src).toContain('isSameCalendarDay')
  })

  it('BookingConfirmation and BookingDetailLayout collapse same-day event ranges', () => {
    const confirmation = read('components/events/BookingConfirmation.tsx')
    const layout = read('components/events/BookingDetailLayout.tsx')
    expect(confirmation).toContain('formatEventDateRange')
    expect(layout).toContain('formatEventDateRange')
  })
})

describe('Jobs — cover image', () => {
  it('JobCoverImage renders jopost_image_url at the top of the page', () => {
    const src = read('components/jobs/JobCoverImage.tsx')
    expect(src).toContain('jopost_image_url')
    expect(src).toContain('jobDetails_cover_image')
  })
})
