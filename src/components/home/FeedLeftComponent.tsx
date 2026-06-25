import React, { useMemo } from 'react'
import jobstyles from '@/moduleCss/jobs.module.css'
import mainstyles from '@/_assets/style/style.module.css'
import Image from 'next/image'
import UserDefaultImg from '../../../public/profile/default_user_icon.png'
import DefaultJobProfile from '../../../public/images/DefaultJobImage.svg'
import { useQuery } from '@tanstack/react-query'
import { useUserProfile } from '@/app/hooks/useUserProfile'
import { fetchRecomendedJobs } from '@/services/jobs.services'
import RecomendedJob from '../ui/RecomendedJob'
import Avatar from '../commonUI/Avatar'
import ProfileCardsmall from '../commonUI/ProfileCardsmall'
import { useAuthGate } from '@/app/hooks/useAuthGate'


const FeedLeftComponent = () => {
  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile()
  const { isAuthenticated, isResolving } = useAuthGate()

  const user = userProfile?.data

  // Recommendations are a soft-auth (public) read — fetch for everyone,
  // including definitively anonymous visitors (they get generic picks).
  const { data: topPicksData, isLoading: topPicksLoading } = useQuery({
    queryKey: ['recommended-jobs-top', { limit: 3, page: 1 }],
    queryFn: () => fetchRecomendedJobs({ limit: 3, page: 1 }),
    staleTime: 1000 * 60 * 5,
    enabled: true
  })
  // fetchRecomendedJobs unwraps one level (`res.data.data`), so topPicksData is
  // already `{ result, total_count }`. Read tolerant to BOTH nestings so the
  // Home "Recommended Jobs" widget renders regardless of the exact envelope.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTopPicksJobs =
    (topPicksData as any)?.data?.result ?? (topPicksData as any)?.result ?? []

  const filteredTopPicksJobs = useMemo(() => {
    return allTopPicksJobs
  }, [allTopPicksJobs])
  return (
    <>
      <ProfileCardsmall />
      <RecomendedJob
        filteredTopPicksJobs={filteredTopPicksJobs}
        isLoading={topPicksLoading}
        // Real-auth signal: only used to gate the saved-jobs lookup (anonymous
        // users have none). The recommended list itself now shows for everyone.
        isAnonymous={!isAuthenticated && !isResolving}
      />
    </>
  )
}

export default FeedLeftComponent
