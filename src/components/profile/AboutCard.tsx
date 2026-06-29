// components/profile/AboutCard.tsx

'use client'

import { useState } from 'react'
import styles from '../../moduleCss/profile.module.css'
import { CustomModalForm, type FormField } from '../modals/CustomModalForm'
import { updateUserProfile } from '@/services/profile.services'
import { isContextualStatus } from '@/helpers/careerStatus'
import { useTheme, themePreferenceToApi } from '@/context/ThemeContext'
import { toast } from 'react-toastify'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'

type Props = {
  about: string
  careerStatus?: string
  currentSituation?: string
  onAboutUpdated?: (about: string) => void
}

export default function AboutCard({ about, careerStatus, currentSituation, onAboutUpdated }: Props) {
  const [situationExpanded, setSituationExpanded] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localAbout, setLocalAbout] = useState(about || '')
  const { preference } = useTheme()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  const fields: FormField[] = [
    {
      id: 'about',
      name: 'about',
      label: 'About',
      type: 'textarea',
      required: true,
      value: localAbout,
      className: "custom-textarea-about",
      placeholder: 'About*',
      rows: 5,
    },
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    ensureAuthed("update your profile", async () => {
      if (!data.about || !data.about.trim()) {
        toast.error('About section cannot be empty')
        return
      }

      setIsSubmitting(true)
      try {
        const payload = {
          about: data.about.trim(),
          // Backend update-profile is full-replace; preserve theme so the
          // user's appearance choice doesn't silently revert to dark.
          theme_setting: themePreferenceToApi(preference),
        }

        const res = await updateUserProfile(payload)

        toast.success(res.message || 'About updated successfully')

        setLocalAbout(payload.about)
        onAboutUpdated?.(payload.about)

        setOpenModal(false)
      } catch (error: any) {
        if (isUnauthenticatedError(error)) openGate('update your profile')
        else toast.error(error.message || 'Update failed')
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  return (
    <div className="mt-4">
      <div className="card_custom min-h-36">
        <div className={styles.profileInfo}>
          <div className={styles.nameWrapper}>
            <h2 className={styles.section_title}>About</h2>

            <CustomModalForm
            maxHeight='min(480px, 85vh)'
            scrollAreaClassName="not-scrollable"
              open={openModal}
              onOpenChange={setOpenModal}
              trigger={
                <button
                  type="button"
                  aria-label="Edit About"
                  className={styles.editBtn}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={20}
                    height={20}
                    viewBox="0 0 27 27"
                    fill="none"
                  >
                    <path
                      d="M7.875 19.125V14.625L19.125 3.375L23.625 7.875L12.375 19.125H7.875Z"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3.375 23.625H23.625"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.75 6.75L20.25 11.25"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </button>
              }
              title="Edit About"
              description="Update your About information"
              fields={fields}
              onSubmit={handleSubmit}
              submitLabel="Save"
              cancelLabel="Cancel"
              isSubmitting={isSubmitting}
              submitButtonClassName="bg-black cursor-pointer"
              cancelButtonClassName="bg-black cursor-pointer"
              contentClassName="backdrop-blur-xl border shadow-2xl !rounded-xl bg-white border-gray-200 text-gray-900 [&_*]:text-gray-900 dark:bg-gradient-to-br dark:from-blue-600/20 dark:via-blue-500/15 dark:to-blue-700/20 dark:border-white/20 dark:text-white dark:[&_*]:text-white"
            />
          </div>
          {authGateModal}

          <p className={`${styles.profile_info} ${styles.about_description}`}>
            {localAbout || 'Please add a short bio about'}
          </p>

          {careerStatus &&
            isContextualStatus(careerStatus) &&
            currentSituation &&
            currentSituation.trim() && (
              <div className={styles.current_situation_wrapper}>
                <hr className={styles.current_situation_divider} />
                <p className={styles.section_title}>
                  My Journey
                </p>
                <p
                  className={`${styles.profile_info} ${styles.about_description}`}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {currentSituation.length > 120 && !situationExpanded
                    ? `${currentSituation.slice(0, 120)}…`
                    : currentSituation}
                </p>
                {currentSituation.length > 120 && (
                  <button
                    type="button"
                    onClick={() => setSituationExpanded((v) => !v)}
                    className={styles.current_situation_toggle}
                  >
                    {situationExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

