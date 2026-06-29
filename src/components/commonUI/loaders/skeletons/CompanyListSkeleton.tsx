import React from 'react'

import styleSheet from '@/_assets/style/style.module.css'
import mainstyles from '@/moduleCss/jobDetails.module.css'
import Jobstyle from '@/moduleCss/jobs.module.css'
import ProfileCardSmallSkeleton from './ProfileCardSmallSkeleton'
import JobCardSkeleton from './JobCardSkeleton'

const CompanyListSkeleton = () => {
  return (
    <>
      <div className='flex flex-wrap -mx-2 mt-6'>
        <div className='full-width-midium col-lg-4'>
          <aside className={Jobstyle.sidebar_main_section}>

            <ProfileCardSmallSkeleton/>
          </aside>
        </div>
        <div className='full-width-midium col-lg-8'>
            <main className={Jobstyle.jobListing_main_section}>
              <JobCardSkeleton />
            </main>
        </div>
      </div>
    </>
  )
}

export default CompanyListSkeleton
