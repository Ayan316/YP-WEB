import React, { useState } from 'react'
import jobstyles from '@/moduleCss/jobs.module.css'
import Image from 'next/image'
import UserDefaultImg from '../../../public/profile/default_user_icon.png'
import { useQuery } from '@tanstack/react-query'
import { useUserProfile } from '@/app/hooks/useUserProfile'
import { useHasSession } from '@/app/hooks/useHasSession'
import { useIsClient } from '@/app/hooks/useIsClient'
import Avatar from '@/components/commonUI/Avatar'
import ProfileCardSmallSkeleton from './loaders/skeletons/ProfileCardSmallSkeleton'
import ProfileImagePreview from '@/components/commonUI/ProfileImagePreview'
import { useTheme } from '@/context/ThemeContext'

const ProfileCardsmall = () => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const isClient = useIsClient()
  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile()
  const { data: hasSession } = useHasSession()
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)

  const user = userProfile?.data

  // This card depends on client-only auth + profile data (useHasSession /
  // useUserProfile) that isn't known during SSR. Render nothing until after
  // hydration so the server output and the first client render agree — the
  // auth-gated content then renders on the client (REQUIREMENTS §5: never SSR
  // a logged-in-only card). Prevents a hydration mismatch with the sibling
  // RecomendedJob shifting into this card's slot.
  if (!isClient) {
    return null
  }

  // Hide the personal profile card for logged-out visitors (also while the
  // session signal is still resolving, to avoid flashing an empty card).
  if (!hasSession) {
    return null
  }

  if (userProfileLoading) {
    return <ProfileCardSmallSkeleton />
  }

  return (
    <div className={jobstyles.side_profile_section}>
      <div className='flex gap-4'>
        <div className={jobstyles.side_profile_image}>
          <Avatar
            imageUrl={user?.profile_image_url || null}
            firstName={user?.first_name}
            lastName={user?.last_name}
            className={`w-full h-full object-cover ${jobstyles.side_profile_image}`}
            onClick={
              user?.profile_image_url
                ? () => setIsImagePreviewOpen(true)
                : undefined
            }
          />
        </div>

        <div style={{ minWidth: 0, flex: '1 1 0%' }}>
          <h3
            className={jobstyles.side_profile_name}
            style={isLight ? { color: '#040F1F' } : undefined}
          >
            {user?.full_name}
          </h3>
          <p
            className={jobstyles.side_profile_degree}
            style={isLight ? { color: '#888888' } : undefined}
          >
            {user?.study_field}
          </p>
          {isLight ? (
            <p className={jobstyles.light_side_profile_location}>
              <span>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width={9}
                  height={11}
                  viewBox='0 0 9 10'
                  fill='none'
                >
                  <path
                    d='M4.0885 9.21565C5.14818 8.26701 5.9591 7.3571 6.52126 6.48592C7.08342 5.61474 7.3645 4.85171 7.3645 4.19683C7.3645 3.20938 7.05078 2.3976 6.42335 1.7615C5.79592 1.1254 5.01764 0.807354 4.0885 0.807354C3.15936 0.807354 2.38108 1.1254 1.75365 1.7615C1.12622 2.3976 0.8125 3.20938 0.8125 4.19683C0.8125 4.85171 1.09358 5.61474 1.65574 6.48592C2.2179 7.3571 3.02882 8.26701 4.0885 9.21565ZM4.0885 9.98847C3.98297 9.98847 3.87743 9.97028 3.7719 9.9339C3.66627 9.89742 3.57076 9.841 3.48535 9.76463C2.9993 9.31667 2.54443 8.85535 2.12076 8.38067C1.69718 7.90608 1.32898 7.43162 1.01617 6.9573C0.703264 6.48298 0.455677 6.01286 0.273406 5.54694C0.0911355 5.08092 0 4.63089 0 4.19683C0 2.94685 0.404309 1.93488 1.21293 1.16093C2.02164 0.386975 2.98016 0 4.0885 0C5.19684 0 6.15536 0.386975 6.96407 1.16093C7.77269 1.93488 8.177 2.94685 8.177 4.19683C8.177 4.63089 8.08587 5.08002 7.90359 5.54423C7.72132 6.00853 7.47464 6.47869 7.16354 6.95473C6.85235 7.43076 6.48497 7.90522 6.06139 8.37809C5.6378 8.85106 5.18294 9.31148 4.69679 9.75934C4.61265 9.83572 4.517 9.893 4.40984 9.93119C4.30277 9.96938 4.19566 9.98847 4.0885 9.98847ZM4.08945 5.07284C4.35893 5.07284 4.58932 4.97688 4.78061 4.78495C4.972 4.59302 5.0677 4.36231 5.0677 4.09283C5.0677 3.82335 4.97173 3.59292 4.7798 3.40153C4.58787 3.21023 4.35712 3.11458 4.08755 3.11458C3.81807 3.11458 3.58768 3.21055 3.39639 3.40248C3.205 3.59441 3.1093 3.82516 3.1093 4.09473C3.1093 4.36421 3.20527 4.5946 3.3972 4.7859C3.58913 4.97719 3.81988 5.07284 4.08945 5.07284Z'
                    fill='#3960FB'
                  />
                </svg>
              </span>
              {user?.location}
            </p>
          ) : (
            <p className='location-badge-design'>
              <span>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width={9}
                  height={11}
                  viewBox='0 0 9 11'
                  fill='none'
                >
                  <path
                    d='M4.403 9.92454C5.54419 8.90293 6.41749 7.92303 7.0229 6.98483C7.6283 6.04664 7.931 5.22492 7.931 4.51967C7.931 3.45625 7.59315 2.58203 6.91746 1.897C6.24176 1.21197 5.40361 0.869458 4.403 0.869458C3.40239 0.869458 2.56424 1.21197 1.88854 1.897C1.21285 2.58203 0.875 3.45625 0.875 4.51967C0.875 5.22492 1.1777 6.04664 1.7831 6.98483C2.38851 7.92303 3.26181 8.90293 4.403 9.92454ZM4.403 10.7568C4.28935 10.7568 4.17569 10.7372 4.06204 10.698C3.94829 10.6588 3.84543 10.598 3.75346 10.5158C3.23001 10.0333 2.74016 9.53653 2.2839 9.02533C1.82773 8.51424 1.43121 8.00329 1.09433 7.49248C0.757361 6.98167 0.490729 6.47539 0.294438 5.97363C0.0981459 5.47176 0 4.98711 0 4.51967C0 3.17353 0.43541 2.08372 1.30623 1.25023C2.17715 0.416743 3.2094 0 4.403 0C5.5966 0 6.62885 0.416743 7.49977 1.25023C8.37059 2.08372 8.806 3.17353 8.806 4.51967C8.806 4.98711 8.70785 5.47079 8.51156 5.97071C8.31527 6.47072 8.04961 6.97706 7.71458 7.48971C7.37946 8.00236 6.98381 8.51331 6.52765 9.02256C6.07148 9.53191 5.58162 10.0277 5.05808 10.5101C4.96747 10.5923 4.86447 10.654 4.74906 10.6951C4.63376 10.7363 4.5184 10.7568 4.403 10.7568ZM4.40402 5.46306C4.69423 5.46306 4.94234 5.35972 5.14835 5.15302C5.35446 4.94633 5.45752 4.69788 5.45752 4.40767C5.45752 4.11746 5.35417 3.8693 5.14748 3.66319C4.94078 3.45717 4.69228 3.35417 4.40198 3.35417C4.11177 3.35417 3.86366 3.45751 3.65765 3.66421C3.45153 3.8709 3.34848 4.1194 3.34848 4.40971C3.34848 4.69992 3.45183 4.94803 3.65852 5.15404C3.86522 5.36006 4.11372 5.46306 4.40402 5.46306Z'
                    fill='#A0AEC0'
                  />
                </svg>
              </span>
              {user?.location}
            </p>
          )}
        </div>
      </div>

      {user?.profile_image_url && (
        <ProfileImagePreview
          isOpen={isImagePreviewOpen}
          onClose={() => setIsImagePreviewOpen(false)}
          imageUrl={user.profile_image_url}
          firstName={user?.first_name}
          lastName={user?.last_name}
        />
      )}
    </div>
  )
}

export default ProfileCardsmall
