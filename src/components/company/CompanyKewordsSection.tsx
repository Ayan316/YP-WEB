import react from 'react'
import companystyles from '@/moduleCss/comapnyDetails.module.css'
import { useRouter } from 'next/navigation'

type Props = {
  companyDetails: any
}

const CompanyKewordsSection = (comanyDetails: Props) => {
  const router = useRouter()

  if (!comanyDetails) {
    return null
  }

  return (
    <>
      <div className='row'>
        <div className='col-lg-8'>
          <div className={companystyles.keywords_section_main}>
            <h4 className={companystyles.company_title}>Keywords</h4>
            <div className={companystyles.keywords_section_wrapper}>
              <div className={companystyles.keywords_section_wrapper_inner}>
                {(Array.isArray(comanyDetails?.companyDetails?.keywords)
                  ? comanyDetails.companyDetails.keywords
                  : JSON.parse(comanyDetails?.companyDetails?.keywords || '[]')
                ).map((keyword: string, index: number) => (
                  <span key={index} className={companystyles.keywords_item}>
                    {keyword}
                    
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className='col-lg-4'>
          <div className={companystyles.website_section_main}>
            <h4 className={companystyles.company_title}>Website</h4>
            <button className={` ${companystyles.companyInfo_website} cursor-pointer`}>
              {
                comanyDetails?.companyDetails?.website ? 
                (
                  <svg
                xmlns='http://www.w3.org/2000/svg'
                width={19}
                height={19}
                viewBox='0 0 19 19'
                fill='none'
              >
                <g clipPath='url(#clip0_2651_354)'>
                  <path
                    d='M1.1875 9.5C1.1875 11.7046 2.06328 13.8189 3.62218 15.3778C5.18107 16.9367 7.29539 17.8125 9.5 17.8125C11.7046 17.8125 13.8189 16.9367 15.3778 15.3778C16.9367 13.8189 17.8125 11.7046 17.8125 9.5C17.8125 7.29539 16.9367 5.18107 15.3778 3.62218C13.8189 2.06328 11.7046 1.1875 9.5 1.1875C7.29539 1.1875 5.18107 2.06328 3.62218 3.62218C2.06328 5.18107 1.1875 7.29539 1.1875 9.5Z'
                    stroke='#20bdff'
                    strokeWidth='1.1875'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M5.9375 9.5C5.9375 7.29539 6.31283 5.18107 6.98093 3.62218C7.64903 2.06328 8.55517 1.1875 9.5 1.1875C10.4448 1.1875 11.351 2.06328 12.0191 3.62218C12.6872 5.18107 13.0625 7.29539 13.0625 9.5C13.0625 11.7046 12.6872 13.8189 12.0191 15.3778C11.351 16.9367 10.4448 17.8125 9.5 17.8125C8.55517 17.8125 7.64903 16.9367 6.98093 15.3778C6.31283 13.8189 5.9375 11.7046 5.9375 9.5Z'
                    stroke='#20bdff'
                    strokeWidth='1.1875'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M1.78125 12.2708H17.2188M1.78125 6.72913H17.2188'
                    stroke='#20bdff'
                    strokeWidth='1.1875'
                    strokeLinecap='round'
                  />
                </g>
                <defs>
                  <clipPath id='clip0_2651_354'>
                    <rect width={19} height={19} fill='white' />
                  </clipPath>
                </defs>
              </svg>
                ) 
                :
                (
                  <svg
                xmlns='http://www.w3.org/2000/svg'
                width={19}
                height={19}
                viewBox='0 0 19 19'
                fill='none'
              >
                <g clipPath='url(#clip0_2651_354)'>
                  <path
                    d='M1.1875 9.5C1.1875 11.7046 2.06328 13.8189 3.62218 15.3778C5.18107 16.9367 7.29539 17.8125 9.5 17.8125C11.7046 17.8125 13.8189 16.9367 15.3778 15.3778C16.9367 13.8189 17.8125 11.7046 17.8125 9.5C17.8125 7.29539 16.9367 5.18107 15.3778 3.62218C13.8189 2.06328 11.7046 1.1875 9.5 1.1875C7.29539 1.1875 5.18107 2.06328 3.62218 3.62218C2.06328 5.18107 1.1875 7.29539 1.1875 9.5Z'
                    stroke='white'
                    strokeWidth='1.1875'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M5.9375 9.5C5.9375 7.29539 6.31283 5.18107 6.98093 3.62218C7.64903 2.06328 8.55517 1.1875 9.5 1.1875C10.4448 1.1875 11.351 2.06328 12.0191 3.62218C12.6872 5.18107 13.0625 7.29539 13.0625 9.5C13.0625 11.7046 12.6872 13.8189 12.0191 15.3778C11.351 16.9367 10.4448 17.8125 9.5 17.8125C8.55517 17.8125 7.64903 16.9367 6.98093 15.3778C6.31283 13.8189 5.9375 11.7046 5.9375 9.5Z'
                    stroke='white'
                    strokeWidth='1.1875'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M1.78125 12.2708H17.2188M1.78125 6.72913H17.2188'
                    stroke='white'
                    strokeWidth='1.1875'
                    strokeLinecap='round'
                  />
                </g>
                <defs>
                  <clipPath id='clip0_2651_354'>
                    <rect width={19} height={19} fill='white' />
                  </clipPath>
                </defs>
              </svg>
                )
              }
              

              <a href={comanyDetails?.companyDetails?.website} target="_blank" rel="noopener noreferrer" className={`${comanyDetails?.companyDetails?.website ? companystyles.companyInfo_website_link : ''}`}>
                {comanyDetails?.companyDetails?.website || '-'}
              </a>
              
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CompanyKewordsSection
