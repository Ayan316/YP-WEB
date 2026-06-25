
export type ProvisionalStatus =
  | 'pending'
  | 'registration_started'
  | 'conditional_place'
  | 'confirmed'
  | 'not_selected'
  | 'cancelled'

const SURVEYMONKEY_HOSTS = ['surveymonkey.com', 'surveymonkey.co.uk', 'surveymonkey.net']


function urlIsSurveyMonkey(externalRegistrationUrl?: string | null): boolean {
  if (!externalRegistrationUrl) return false
  const url = externalRegistrationUrl.toLowerCase()
  return SURVEYMONKEY_HOSTS.some((host) => url.includes(host))
}

export function isSurveyMonkeyEvent(
  input?:
    | string
    | null
    | {
        external_registration_url?: string | null
        pricing_type?: string | null
        event_type_display?: string | null
      },
): boolean {
  if (input == null) return false
  if (typeof input === 'string') return urlIsSurveyMonkey(input)

  if (urlIsSurveyMonkey(input.external_registration_url)) return true

  if (!input.external_registration_url) return false

  const pricing = (input.pricing_type || '').toLowerCase()
  const display = (input.event_type_display || '').toLowerCase()
  return pricing === 'free' || display === 'free'
}
export function mapToProvisionalStatus(rawBookingStatus?: string | null): ProvisionalStatus {
  switch ((rawBookingStatus || '').toLowerCase()) {
    case 'confirmed':
      return 'confirmed'
    case 'rejected':
    case 'cancelled':
    case 'not_selected':
      return 'not_selected'
    case 'pending':
    case 'registration_started':
      return 'registration_started'
    case 'conditional_place':
    default:
      return 'conditional_place'
  }
}

export interface ProvisionalStatusDisplay {
  shortLabel: string
  fullLabel: string
  badgeBackground: string
  badgeColor: string
}

export function getProvisionalStatusDisplay(status: ProvisionalStatus): ProvisionalStatusDisplay {
  switch (status) {
    case 'pending':
    case 'registration_started':
      return {
        shortLabel: 'Registration Started',
        fullLabel: 'Registration Started',
        badgeBackground: 'rgba(234, 179, 8, 0.15)',
        badgeColor: '#EAB308',
      }
    case 'conditional_place':
      return {
        shortLabel: 'Conditional place',
        fullLabel: 'Conditional place',
        badgeBackground: 'rgba(234, 179, 8, 0.15)',
        badgeColor: '#EAB308',
      }
    case 'confirmed':
      return {
        shortLabel: 'Confirmed',
        fullLabel: 'Confirmed',
        badgeBackground: 'rgba(34, 197, 94, 0.15)',
        badgeColor: '#22C55E',
      }
    case 'not_selected':
    case 'cancelled':
      return {
        shortLabel: 'Not Selected',
        fullLabel: 'Not Selected',
        badgeBackground: 'rgba(239, 68, 68, 0.15)',
        badgeColor: '#EF4444',
      }
  }
}

export type ProvisionalCtaState =
  | 'not_started'
  | 'registration_started'
  | 'conditional_place'
  | 'confirmed'
  | 'not_selected'
  | 'cancelled'

export function getProvisionalCtaLabel(state: ProvisionalCtaState): string {
  switch (state) {
    case 'not_started':
      return 'Apply Now'
    case 'registration_started':
      return 'Complete Survey Monkey  Form'
    case 'conditional_place':
      return 'Complete Survey Monkey  Form'
    case 'confirmed':
      return 'View booking'
    case 'not_selected':
      return 'Registration closed'
    case 'cancelled':
      return 'Event cancelled'
  }
}
