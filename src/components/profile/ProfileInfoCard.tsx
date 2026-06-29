// components/profile/ProfileInfoCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { CustomModalForm, type FormField } from '../modals/CustomModalForm'
import {
  GraduationCap,
  MailIcon,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react'
import styles from '../../moduleCss/profile.module.css'
import {
  checkPhoneAvailability,
} from '@/services/profile.services'
import { toast } from 'react-toastify'
import PhoneInputWithIP from '../commonUI/PhoneInputWithIP'
import { DatePicker } from './DatePicker'
import locationData from '@/data/locations.json'
import formatPhoneForDisplay from '@/helpers/phoneHelpers'
import { fetchLocations } from '@/services/options.services'
import { useQuery } from '@tanstack/react-query'
import { formateDOBDate } from '@/helpers/dateFormatter'
import { useTheme, themePreferenceToApi } from '@/context/ThemeContext'
import { useUpdateProfile } from '@/app/hooks/useUpdateProfile'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import jobstyles from '@/moduleCss/jobs.module.css'

type Props = {
  firstName?: string
  lastName?: string
  role?: string
  university?: string
  location?: string
  email?: string
  phone?: string
  dob?: string
  gender?: string
  onProfileUpdated?: (updatedData: any) => void
}

export default function ProfileInfoCard ({
  firstName,
  lastName,
  role,
  university,
  location,
  email,
  phone,
  dob,
  gender,
}: Props) {
  const normalizeGender = (gender?: string): string => {
    if (!gender) return ''

    // Normalize: lowercase + remove spaces, underscores, hyphens
    const cleaned = gender.toLowerCase().replace(/[\s_\-]+/g, '')

    const map: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefernottosay: 'Prefer not to say',
      prefernot: 'Prefer not to say',
      notspecified: 'Prefer not to say',
      na: 'Prefer not to say',
      n_a: 'Prefer not to say',
      none: 'Prefer not to say'
    }

    return map[cleaned] ?? gender // fallback: return as-is
  }

  const formatGenderLabel = (gender?: string): string => {
    if (!gender) return ''
    // Already normalized via normalizeGender, just return as-is
    return gender
  }

  const today = new Date()

  const maxDobDate = new Date(
    today.getFullYear() - 14,
    today.getMonth(),
    today.getDate()
  )

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 1000 * 60 * 10
  })

  const locations = locationsData?.data

  const allLocations = locations?.location

  const locationOptions =
    allLocations?.map((loc: any) => ({
      id: loc.id,
      name: loc.name
    })) || []

  function formatDate (dateStr: string) {
    if (!dateStr) return ''

    const [year, month, day] = dateStr.split('-')
    return `${day}-${month}-${year}`
  }

  function parseDDMMYYYY (dateStr?: string) {
    if (!dateStr) return undefined
    const [dd, mm, yyyy] = dateStr.split('-').map(Number)
    return new Date(yyyy, mm - 1, dd)
  }

  const [openModal, setOpenModal] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPhoneValid, setIsPhoneValid] = useState(true)

  // Read the live theme preference here (not just in render) so handleSubmit
  // can include `theme_setting` in the payload. Without it the backend's
  // full-replace update-profile call resets theme_setting → "0" (dark),
  // and the next page refresh forces dark mode via ThemeSync.
  const { resolvedTheme, preference } = useTheme()
  const isLight = resolvedTheme === 'light'
  const updateProfileMutation = useUpdateProfile()
  const { ensureAuthed, gateModal: authGateModal } = useAuthGate()

  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    role: '',
    university: '',
    location: '',
    email: '',
    phone: '',
    dob: '',
    gender: ''
  })

  useEffect(() => {
    setFormValues(prev => ({
      ...prev,
      firstName: firstName ?? prev.firstName,
      lastName: lastName ?? prev.lastName,
      role: role ?? prev.role,
      university: university ?? prev.university,
      location: location ?? prev.location,
      email: email ?? prev.email,
      phone: phone ?? prev.phone,
      dob: dob ?? prev.dob,
      gender: gender ? normalizeGender(gender) : prev.gender
    }))
  }, [
    firstName,
    lastName,
    role,
    university,
    location,
    email,
    phone,
    dob,
    gender
  ])

  // const locationOptions = locationData.locations

  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
    { label: 'Prefer not to say', value: 'Prefer not to say' }
  ]

  const modalFields: FormField[] = [
    {
      id: 'firstName',
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: true,
      value: formValues.firstName
    },
    {
      id: 'lastName',
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      required: true,
      value: formValues.lastName
    },
    {
      id: 'location',
      name: 'location',
      label: 'Location',
      type: 'autoComplete_addon',
      required: true,
      value: formValues.location,
      placeholder: 'Location',
      searchPlaceholder: 'Search or add location…',
      options: locationOptions
    },
    {
      id: 'email',
      name: 'email',
      label: 'Email',
      type: 'email',
      required: false,
      value: formValues.email,
      disabled: true
    },
    {
      id: 'phone',
      name: 'phone',
      label: 'Phone Number',
      type: 'custom',
      required: false,
      // Without `value:` here, CustomModalForm's sync effect skips this field,
      // so `formData.phone` stays "" and the API payload sends an empty
      // phone_number even when the user has one on file.
      value: formValues.phone,
      render: field => (
        <PhoneInputWithIP
          value={field.value ?? ''}
          onChange={value => field.onChange?.(value)}
          onValidationChange={valid => setIsPhoneValid(valid)}
        />
      )
    },
    {
      id: 'dob',
      name: 'dob',
      required: true,
      label: 'DOB',
      type: 'custom',
      value: formValues.dob,
      render: field => (
        <DatePicker
          value={parseDDMMYYYY(field.value)}
          onChange={date => {
            const dateString = date
              ? `${String(date.getDate()).padStart(2, '0')}-${String(
                  date.getMonth() + 1
                ).padStart(2, '0')}-${date.getFullYear()}`
              : ''

            // NOTE: do NOT setFormValues here — that triggers a parent
            // re-render which re-snapshots originalData in CustomModalForm
            // and leaves hasChanges=false, disabling the Save button.
            // The outer formValues sync happens once on successful submit.
            field.onChange?.(dateString)
          }}
          placeholder='Select your date of birth'
          // maxDate={maxDobDate}
          maxDate={
            new Date(new Date().setFullYear(new Date().getFullYear() - 14))
          }
        />
      )
    },

    {
      id: 'gender',
      name: 'gender',
      label: 'Gender',
      type: 'autocomplete_without_search',
      required: true,
      className: 'cutom-gender-field',
      value: formValues.gender,
      placeholder: 'Select gender',
      options: genderOptions
    }
  ]

  const handleSubmit = () => async (data: Record<string, any>) => {
    // Auth gate (outermost): logged-out users get the "Log in to continue"
    // modal before any validation or the update-profile write runs.
    let authed = false
    ensureAuthed('update your profile', () => {
      authed = true
    })
    if (!authed) return

    if (!data.firstName?.trim()) {
      toast.error('First name is required')
      return
    }
    if (data.firstName.trim().length < 2) {
      toast.error('First name must be at least 2 characters')
      return
    }
    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(data.firstName.trim())) {
      toast.error('First name must contain only letters and spaces')
      return
    }

    // ── Last Name validation (mirrors SignUp) ───────────────────────────────
    if (!data.lastName?.trim()) {
      toast.error('Last name is required')
      return
    }
    if (data.lastName.trim().length < 2) {
      toast.error('Last name must be at least 2 characters')
      return
    }
    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(data.lastName.trim())) {
      toast.error('Last name must contain only letters and spaces')
      return
    }

    // ── Phone validation ─────────────────────────────────────────────────
    if (data.phone && data.phone.trim() && !isPhoneValid) {
      toast.error('Please enter a valid phone number')
      return
    }

    // Always verify availability whenever a phone number is present.
    const newPhone = data.phone?.trim() || ''
    if (newPhone) {
      try {
        const response = await checkPhoneAvailability(newPhone)
        if (response?.data?.available !== true) {
          toast.error(
            response?.message || 'Phone number is already in use',
          )
          return
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to verify phone number')
        return
      }
    }

    const requiredFields = modalFields.filter(
      field => field.required && !field.disabled
    )

    const missingField = requiredFields.find(field => {
      const value = data[field.name]
      return !value || String(value).trim() === ''
    })

    if (missingField) {
      toast.error(`${missingField.label || missingField.name} is required`)
      return
    }

    // const isValidLocation = locationOptions.some(
    //   (loc: any) => loc.name.toLowerCase() === data.location.toLowerCase(),
    // );

    // if (!isValidLocation) {
    //   toast.error("Please select a valid location from the dropdown");
    //   return;
    // }

    setIsSubmitting(true)
    try {
      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`,
        role: data.role,
        place_of_study: data.university,
        location: data.location,
        gender: data.gender,
        dob: data.dob || null,
        phone_number: data.phone,
        // Backend's update-profile is full-replace; if we leave this out it
        // resets theme_setting to "0" (dark) and the user's light/system
        // choice silently reverts on the next page load.
        theme_setting: themePreferenceToApi(preference),
      }

      console.log('Update profile info payload', payload)

      // Use the mutation (not a bare updateUserProfile call) so the React
      // Query cache for user-profile is merged with the response. Without
      // this the parent profile page keeps showing stale data, and a
      // *subsequent* theme toggle from the header would send the stale
      // snapshot back to the backend and overwrite the value we just saved.
      const res = await updateProfileMutation.mutateAsync(payload)
      toast.success(res.message || 'Profile updated successfully!')

      setFormValues(prev => ({
        ...prev,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        university: data.university,
        location: data.location,
        gender: data.gender,
        dob: data.dob,
        phone: data.phone
      }))

      setOpenModal(null)
    } catch (error: any) {
      toast.error(error.message || 'Update failed!')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <div className={styles.card_wrapper}>
      <div className='card_custom card_dark-bg'>
        <div className={styles.profileInfo}>
          <div>
            <div className={styles.nameWrapper}>
              <h2 className={styles.user_name}>
                {formValues.firstName} {formValues.lastName}
              </h2>

              <CustomModalForm
                open={openModal === 'registration'}
                onOpenChange={open =>
                  setOpenModal(open ? 'registration' : null)
                }
                trigger={
                  <button
                    type='button'
                    aria-label='Edit Profile'
                    className={styles.editBtn}
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width={20}
                      height={20}
                      viewBox='0 0 27 27'
                      fill='none'
                    >
                      <path
                        d='M7.875 19.125V14.625L19.125 3.375L23.625 7.875L12.375 19.125H7.875Z'
                        stroke='currentColor'
                        strokeWidth={2}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M3.375 23.625H23.625'
                        stroke='currentColor'
                        strokeWidth={2}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M15.75 6.75L20.25 11.25'
                        stroke='currentColor'
                        strokeWidth={2}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                    Edit
                  </button>
                }
                title='Edit Profile Information'
                description='Update your profile details below.'
                fields={modalFields}
                onSubmit={handleSubmit()}
                submitLabel='Save'
                cancelLabel='Cancel'
                submitButtonClassName='bg-black cursor-pointer'
                cancelButtonClassName='bg-black cursor-pointer'
                isSubmitting={isSubmitting}
                contentClassName='backdrop-blur-xl border shadow-2xl !rounded-xl bg-white border-gray-200 text-gray-900 [&_*]:text-gray-900 dark:bg-gradient-to-br dark:from-blue-600/20 dark:via-blue-500/15 dark:to-blue-700/20 dark:border-white/20 dark:text-white dark:[&_*]:text-white'
              />
            </div>

            <div className={styles.profile_info_area}>
              <div
                className={`${styles.profile_info} ${styles.location_wrapper}`}
              >
                <span className={styles.location_text}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width={14}
                    height={14}
                    viewBox='0 0 11 11'
                    fill='none'
                  >
                    <path
                      d='M4.403 9.92454C5.54419 8.90293 6.41749 7.92303 7.0229 6.98483C7.6283 6.04664 7.931 5.22492 7.931 4.51967C7.931 3.45625 7.59315 2.58203 6.91746 1.897C6.24176 1.21197 5.40361 0.869458 4.403 0.869458C3.40239 0.869458 2.56424 1.21197 1.88854 1.897C1.21285 2.58203 0.875 3.45625 0.875 4.51967C0.875 5.22492 1.1777 6.04664 1.7831 6.98483C2.38851 7.92303 3.26181 8.90293 4.403 9.92454ZM4.403 10.7568C4.28935 10.7568 4.17569 10.7372 4.06204 10.698C3.94829 10.6588 3.84543 10.598 3.75346 10.5158C3.23001 10.0333 2.74016 9.53653 2.2839 9.02533C1.82773 8.51424 1.43121 8.00329 1.09433 7.49248C0.757361 6.98167 0.490729 6.47539 0.294438 5.97363C0.0981459 5.47176 0 4.98711 0 4.51967C0 3.17353 0.43541 2.08372 1.30623 1.25023C2.17715 0.416743 3.2094 0 4.403 0C5.5966 0 6.62885 0.416743 7.49977 1.25023C8.37059 2.08372 8.806 3.17353 8.806 4.51967C8.806 4.98711 8.70785 5.47079 8.51156 5.97071C8.31527 6.47072 8.04961 6.97706 7.71458 7.48971C7.37946 8.00236 6.98381 8.51331 6.52765 9.02256C6.07148 9.53191 5.58162 10.0277 5.05808 10.5101C4.96747 10.5923 4.86447 10.654 4.74906 10.6951C4.63376 10.7363 4.5184 10.7568 4.403 10.7568ZM4.40402 5.46306C4.69423 5.46306 4.94234 5.35972 5.14835 5.15302C5.35446 4.94633 5.45752 4.69788 5.45752 4.40767C5.45752 4.11746 5.35417 3.8693 5.14748 3.66319C4.94078 3.45717 4.69228 3.35417 4.40198 3.35417C4.11177 3.35417 3.86366 3.45751 3.65765 3.66421C3.45153 3.8709 3.34848 4.1194 3.34848 4.40971C3.34848 4.69992 3.45183 4.94803 3.65852 5.15404C3.86522 5.36006 4.11372 5.46306 4.40402 5.46306Z'
                      fill='#A0AEC0'
                    />
                  </svg>
                  Location
                </span>

                {/* {formValues.location} */}
                {isLight ? (
                <p className={jobstyles.light_side_profile_location}>{formValues.location}</p>
              ) : (
                <p className='location-badge-design'>{formValues.location}</p>
              )}
              </div>

              <p
                className={`${styles.profile_info} ${styles.location_wrapper}`}
              >
                <span className={styles.location_text}>
                  <MailIcon className={styles.location_icon} />
                  Email
                </span>
                {formValues.email}
              </p>

              {formValues.phone && (
                <p
                  className={`${styles.profile_info} ${styles.location_wrapper}`}
                >
                  <span className={styles.location_text}>
                    <Phone className={styles.location_icon} />
                    Phone
                  </span>
                  {formatPhoneForDisplay(formValues.phone)}
                </p>
              )}
              {/* <p
                className={`${styles.profile_info} ${styles.location_wrapper}`}
              >
                <span className={styles.location_text}>
                  <Phone className={styles.location_icon} />
                  Phone
                </span>
                {formatPhoneForDisplay(formValues.phone)}
              </p> */}
              <p
                className={`${styles.profile_info} ${styles.location_wrapper}`}
              >
                <span className={styles.location_text}>
                  <Calendar className={styles.location_icon} />
                  DOB
                </span>
                {/* {formValues.dob} */}
                {formValues.dob ? formateDOBDate(formValues.dob) : ''}
              </p>
              <p
                className={`${styles.profile_info} ${styles.genderclass} ${styles.location_wrapper}`}
              >
                <span className={styles.location_text}>
                  <svg
                    width={18}
                    height={18}
                    viewBox='0 0 17 17'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M13.8128 1.59375H11.1566C11.0157 1.59375 10.8806 1.64972 10.7809 1.74935C10.6813 1.84898 10.6253 1.9841 10.6253 2.125C10.6253 2.2659 10.6813 2.40102 10.7809 2.50065C10.8806 2.60028 11.0157 2.65625 11.1566 2.65625H12.5305L10.8604 4.32637C10.37 3.86935 9.77847 3.53482 9.13409 3.35009C8.48971 3.16536 7.81078 3.13568 7.15273 3.26346C6.49469 3.39124 5.8762 3.67287 5.34779 4.08534C4.81938 4.49781 4.39603 5.02942 4.11232 5.63675C3.8286 6.24409 3.69258 6.90992 3.71534 7.57987C3.73811 8.24982 3.91903 8.90488 4.24331 9.49156C4.5676 10.0782 5.02607 10.5799 5.58126 10.9555C6.13646 11.3312 6.77263 11.5702 7.43783 11.653V12.75H5.84408C5.70319 12.75 5.56806 12.806 5.46843 12.9056C5.3688 13.0052 5.31283 13.1404 5.31283 13.2812C5.31283 13.4221 5.3688 13.5573 5.46843 13.6569C5.56806 13.7565 5.70319 13.8125 5.84408 13.8125H7.43783V15.4062C7.43783 15.5471 7.4938 15.6823 7.59343 15.7819C7.69306 15.8815 7.82819 15.9375 7.96908 15.9375C8.10998 15.9375 8.2451 15.8815 8.34473 15.7819C8.44436 15.6823 8.50033 15.5471 8.50033 15.4062V13.8125H10.0941C10.235 13.8125 10.3701 13.7565 10.4697 13.6569C10.5694 13.5573 10.6253 13.4221 10.6253 13.2812C10.6253 13.1404 10.5694 13.0052 10.4697 12.9056C10.3701 12.806 10.235 12.75 10.0941 12.75H8.50033V11.653C9.21242 11.564 9.89034 11.296 10.4707 10.8739C11.0511 10.4518 11.515 9.8895 11.819 9.23947C12.1231 8.58944 12.2574 7.87293 12.2094 7.15692C12.1613 6.4409 11.9325 5.74875 11.5444 5.14516L13.2816 3.4073V4.78125C13.2816 4.92215 13.3376 5.05727 13.4372 5.1569C13.5368 5.25653 13.6719 5.3125 13.8128 5.3125C13.9537 5.3125 14.0889 5.25653 14.1885 5.1569C14.2881 5.05727 14.3441 4.92215 14.3441 4.78125V2.125C14.3441 1.9841 14.2881 1.84898 14.1885 1.74935C14.0889 1.64972 13.9537 1.59375 13.8128 1.59375ZM7.96908 10.625C7.33866 10.625 6.72238 10.4381 6.1982 10.0878C5.67402 9.73756 5.26547 9.23974 5.02422 8.6573C4.78296 8.07486 4.71984 7.43396 4.84283 6.81565C4.96582 6.19734 5.2694 5.62938 5.71518 5.1836C6.16096 4.73782 6.72892 4.43424 7.34723 4.31125C7.96555 4.18826 8.60645 4.25138 9.18889 4.49263C9.77133 4.73389 10.2691 5.14244 10.6194 5.66662C10.9696 6.1908 11.1566 6.80707 11.1566 7.4375C11.1557 8.28261 10.8196 9.09285 10.222 9.69043C9.62443 10.288 8.81419 10.6241 7.96908 10.625Z'
                      fill='#A0AEC0'
                    />
                  </svg>
                  Gender
                </span>
                {formatGenderLabel(formValues.gender)}
              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
    {authGateModal}
    </>
  )
}
