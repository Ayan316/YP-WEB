"use client";
import React from 'react'
import companystyles from '@/moduleCss/comapnyDetails.module.css'
import CompanyCoverImage from './CompanyCoverImage'
import { fetchCompanyDetails } from '@/services/company.services'
import { useQuery } from '@tanstack/react-query'
import CompanyInfo from './CompanyInfo';
import CompanyKewordsSection from './CompanyKewordsSection';
import AboutCompany from './AboutCompany';
import BottomTabSection from './BottomTabSection';
import { GlobalSpinner } from '../commonUI/loaders/spinners/GlobalSpinner';
import CompanyCoverImageSkeleton from '../commonUI/loaders/skeletons/CompanyCoverImageSkeleton';
import { CompanyInfoSkeleton } from '../commonUI/loaders/skeletons/CompanyInfoSkeleton';
import CompanyKeywordsSkeleton from '../commonUI/loaders/skeletons/CompanyKeywordsSkeleton';
import AboutCompanySkeleton from '../commonUI/loaders/skeletons/AboutCompanySkeleton';
import BottomTabSectionSkeleton from '../commonUI/loaders/skeletons/BottomTabSectionSkeleton';
type Props = {
  companyId: string
}

const CompanyDetailsLayout = ({ companyId }: Props) => {

  const {
    data: companyDetails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["company-details", companyId],
    queryFn: () => fetchCompanyDetails({ id: companyId }),
    enabled: !!companyId,
  });

  // console.log("Company details!!!!!!!!!!!!!!!!:", companyDetails);
  // console.log("Company details data!!!!!!!!!!!!!!!!:", companyDetails?.data);
  

  if (isLoading) {
    return (<div className='container mx-auto  px-4'>
        <CompanyCoverImageSkeleton />
        <CompanyInfoSkeleton  />
        {/* <CompanyKeywordsSkeleton     /> */}
        <AboutCompanySkeleton />
        <BottomTabSectionSkeleton />
      </div>
    );
  }


  return (
    <>

      <div className='container mx-auto  px-4'>
        <CompanyCoverImage companyDetails={companyDetails?.data} />
        <CompanyInfo companyDetails={companyDetails?.data} />
        {/* <CompanyKewordsSection companyDetails={companyDetails?.data}    /> */}
        <AboutCompany companyDetails={companyDetails?.data} />
        <BottomTabSection companyId={companyId} companyName={companyDetails?.data?.name}/>
      </div>
    </>
  )
}

export default CompanyDetailsLayout  
