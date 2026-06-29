'use client'

import { useTheme } from '@/context/ThemeContext'
import { CustomModal } from '@/components/modals/CustomModal'
import { DialogTitle } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'

interface RegistrationStartedModalProps {
  open: boolean
  onClose: () => void
  onCompleteForm: () => void
  isSubmitting?: boolean
}

/**
 * Wraps `CustomModal` (Radix Dialog → portals to document.body) so the
 * modal escapes any parent stacking context (transform/filter/etc.) and
 * always overlays the viewport. The previous hand-rolled fixed-position
 * version was getting trapped under the event-detail banner.
 *
 * Same content / icon / copy as before — only the surrounding shell
 * changed.
 */
const RegistrationStartedModal = ({
  open,
  onClose,
  onCompleteForm,
  isSubmitting = false,
}: RegistrationStartedModalProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  return (
    <CustomModal
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose()
      }}
      showCloseButton={!isSubmitting}
      width="max-w-[420px]"
      maxHeight="90vh"
      contentClassName={
        isLight
          ? 'bg-white border border-gray-200'
          : 'bg-[#0b1426] border border-white/10'
      }
      scrollAreaClassName="!pr-0"
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 999,
              border: 'none',
              background: isLight ? '#E2E8F0' : 'rgba(160, 174, 192, 0.2)',
              color: isLight ? '#040F1F' : '#ffffff',
              fontSize: 15,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Later
          </button>
          <button
            type="button"
            onClick={onCompleteForm}
            disabled={isSubmitting}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(90deg, #3960FB 0%, #06C1FA 100%)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.85 : 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'rsmSpin 0.7s linear infinite',
                  }}
                />
                Submitting...
              </>
            ) : (
              'Complete form'
            )}
            <style>{`@keyframes rsmSpin { to { transform: rotate(360deg); } }`}</style>
          </button>
        </div>
      }
    >
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          padding: '4px 4px 0',
        }}
      >
        {/* Accessible title for screen readers — Radix Dialog requires a
            DialogTitle, but the visible heading lives inside the body for
            visual layout (centered, below the icon). */}
        <VisuallyHidden.Root asChild>
          <DialogTitle>Registration started</DialogTitle>
        </VisuallyHidden.Root>

        {/* Alert icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" />
            <line
              x1="12"
              y1="7"
              x2="12"
              y2="13"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.5" r="1.2" fill="#EF4444" />
          </svg>
        </div>

        <h2
          id="registration-started-title"
          style={{
            margin: '0 0 12px',
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: isLight ? '#040F1F' : '#ffffff',
          }}
        >
          Registration started
        </h2>

        <p
          style={{
            margin: '0 0 16px',
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 1.55,
            color: isLight ? '#555' : '#a0aec0',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Your place is not confirmed yet. To complete your registration, please
          fill in the SurveyMonkey form. Young Professionals will review
          submissions and email you separately if your place is confirmed.
        </p>

        {/* Warning box */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${
              isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'
            }`,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <circle cx="12" cy="12" r="10" stroke="#B45309" strokeWidth="1.8" />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="13"
              stroke="#B45309"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.5" r="1.1" fill="#B45309" />
          </svg>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: isLight ? '#92400E' : '#FCD34D',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
            }}
          >
            Please do not attend the event unless you have received a
            confirmation email from Young Professionals.
          </p>
        </div>
      </div>
    </CustomModal>
  )
}

export default RegistrationStartedModal
