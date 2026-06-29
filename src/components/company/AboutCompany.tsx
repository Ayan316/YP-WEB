import react from 'react'
import companystyles from '@/moduleCss/comapnyDetails.module.css'
import { useRouter } from 'next/navigation'
import { RenderHtmlContent } from '../commonUI/RenderHTMLContent'
import { useTheme } from '@/context/ThemeContext'

type Props = {
  companyDetails: any
}

const CompanyAboutSection = (comanyDetails: Props) => {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const description = comanyDetails?.companyDetails?.description

  // Hide the section entirely when there is no meaningful about copy.
  // Strip HTML tags + whitespace before checking so empty <p></p>, <br>,
  // and stray &nbsp; from a rich-text editor don't render a hollow card.
  const hasDescription =
    typeof description === 'string' &&
    description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim().length > 0

  if (!hasDescription) {
    return null
  }

  return (
    <>
     <div className={companystyles.company_about_section}>
        <h4 className={companystyles.company_title}>About the company</h4>
        <RenderHtmlContent
          html={description}
          className={isLight ? 'text-[#888888]' : 'text-white'}
        />
     </div>
    </>
  )
}

export default CompanyAboutSection;