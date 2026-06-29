/* eslint-disable react/no-unescaped-entities */
'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'
import LegalPageShell, { LegalSection } from './LegalPageShell'
import { AddressLink, EmailLink, Label } from './LegalLinks'

function buildSections(): LegalSection[] {
  return [
    {
      id: 'intro',
      title: '',
      content: (
        <>
          Young Professionals Global – Inspiring a New Generation Ltd trading as Young Professionals Global take your
          data rights very seriously. The company is compliant with the Data Protection
          Legislation which includes the Data Protection Act 2018 and the UK General Data
          Protection Regulation (GDPR) that now binds all UK companies and organisations to a
          standard of performance with respect to any processing of personal data including
          storage, usage and sharing/transmission.
        </>
      ),
    },
    {
      id: 'scope',
      title: 'Scope of Policy',
      content: (
        <>
          This Privacy Policy forms part of our Terms of Use and applies to your use of
          our app and mobile application (the App) which is hosted on our private servers.
          These policies come into effect as soon as you provide your personal data on our
          app and / or once you have downloaded and accessed a copy of the App onto your
          mobile device (Device) or accessed any of the digital services available through
          the App.{'\n\n'}
          The purpose of this policy is to establish the purpose and policies relating to the
          use of any personal data which we collect from you, or that you provide to us in
          the course of your usage.{'\n\n'}
          Young Professionals Global data policies are created to be fully compliant with the Data
          Protection Act 2018 and the EU General Data Protection Regulation 2016/679 – "GDPR"
          ("Your Data Protection").{'\n\n'}
          The Data Controller is Young Professionals Global – Inspiring a New Generation Ltd (trading as
          Young Professionals Global), registered in the United Kingdom.{'\n\n'}
          <Label text='Registered address:' />{'\n'}
          <AddressLink text='15th Floor, 6 Bevis Marks, London EC3A 7BA' />{'\n\n'}
          <Label text='Company number: 09719565' />{'\n\n'}
          Any employers accessing our services, that we provide your data to, may also be
          considered data controllers for the purpose of the Data Protection Legislation. In
          this situation, the use of your personal data will be subject to the privacy policy
          of that employer.
        </>
      ),
    },
    {
      id: 'info-we-collect',
      title: 'Information We May Collect From You Includes',
      content: (
        <>
          All personal data you provided us on our app or in the course of use of the App
          (Submitted information): you may provide us with information about you by
          completing forms on the app or the App, or via other communications (for example,
          by email or chat).
          {'\n\n'}
          • Register to use our App{'\n'}
          • Download our App{'\n'}
          • Subscribe to or use our interactive services{'\n'}
          • Conduct an in-App purchase{'\n'}
          • Share or transmit data through the App's social media links{'\n'}
          • Participate in competitions, surveys or promotions{'\n'}
          • Reporting user issues within the App
        </>
      ),
    },
    {
      id: 'info-you-give',
      title: 'The information you give us may include:',
      content: (
        <>
          • Your name{'\n'}
          • Date of birth{'\n'}
          • Ethnicity, Gender, your Socio Economic or Social Mobility status{'\n'}
          • Your address or postcode{'\n'}
          • Phone number{'\n'}
          • Your email{'\n'}
          • Your contact telephone number{'\n'}
          • Your nationality{'\n'}
          • Your preferred work location{'\n'}
          • Your education{'\n'}
          • Disabilities (if any){'\n'}
          • Previous addresses and postcodes{'\n'}
          • Your interests and extra-curricular activities{'\n'}
          • Any other skills{'\n'}
          • Schools attended{'\n'}
          • University attended{'\n'}
          • Education stage and timing{'\n'}
          • First and acquired languages spoken{'\n'}
          • Work visa requirements{'\n'}
          • Your prior work experience{'\n'}
          • Your high school qualification and results{'\n'}
          • Degree subjects studied{'\n'}
          • Degree results{'\n'}
          • Your interests{'\n'}
          • Results of any psychometric testing{'\n'}
          • Selected username and password for the App{'\n\n'}
          We will keep records of any communications with you.
        </>
      ),
    },
    {
      id: 'special-category',
      title: 'Special Category Personal Data',
      content: 'Special Category personal data is collected for monitoring purposes.',
    },
    {
      id: 'device-info',
      title: 'Information We May Store About You and Your Device',
      content:
        "Each time you use the App our system automatically collects important information about your device which will include the type of mobile device you use, your mobile network, your mobile device's operating system, which mobile browser is being used and your time zone setting as well as your unique device identifier such as your IMEI number, MAC address of the Device's wireless network interface, or mobile phone number (Device Information). We may also store details of your usage of the App including traffic and location data (Log Information).",
    },
    {
      id: 'how-we-use',
      title: 'How We Use the Information',
      content: (
        <>
          <Label text='Submitted Information:' />{'\n'}
          Your information may be shared with third party employers to filter and select
          potential candidates that they wish to contact regarding potential employment or to
          contact you. Prospective employers may send you push notification messages through
          the App.
          {'\n\n'}
          <Label text='Device Information and Log Information:' />{'\n'}
          Helps us to learn how you use the App, so that we can optimise it for your use.
          {'\n\n'}
          We may combine or associate categories of your information with any other category
          but still treat the information as personal data in accordance with this policy for
          as long as it is combined. We do not release or share your personal information
          with anyone other than employers using the App or our services. We may analyse
          group information about our users to better understand usage trends. We may use
          your data to target an audience that fits your data characteristics.
          {'\n\n'}
          Your personal data is collated and stored to ensure your efficient use of our App
          and the associated services. In using our App you will be required to provide your
          explicit consent to the following use of your personal data:
          {'\n\n'}
          • Contact by us for the administration of the services provided by our App, to
          invite you to events and to provide you with information regarding the service and
          its associated services.{'\n'}
          • The provision of your personal data to interested third party employers who are
          advertising job roles via our App.{'\n'}
          • In response to Talent Spots and other tools associated with using our App.
          {'\n'}
          • To aggregate your personal data with others' personal data into a
          non-identifiable form in order to carry out analysis of our users for internal
          business purposes.
        </>
      ),
    },
    {
      id: 'disclosure',
      title: 'Disclosure of Your Information',
      content: (
        <>
          We may disclose all the Submitted Information we collect from you when you register
          or use our App to the third-party employers but also to other third parties in the
          event of a sale, merger or other transfer of ownership of Young Professionals Global or to
          comply with any statutory demands, obligations or legal requests.{'\n\n'}
          We may have to disclose your information to enforce or reasonably apply our Terms
          of Services and other agreements or to protect the rights, property or safety of
          our company and customers such as for the purposes of fraud protection and credit
          risk prevention or where we have legal grounds to do so.
        </>
      ),
    },
    {
      id: 'where-stored',
      title: 'Where We Store Your Personal Data',
      content:
        'The data that we collect from you is transferred to, and stored at, a destination within the cloud server services provided by Amazon AWS. It is processed by staff employed by and managed by Amazon as our data processors. By using our App and services and providing us with your personal data, you agree to the transfer, storage and analysis of your personal data.',
    },
    {
      id: 'security',
      title: 'Security',
      content: (
        <>
          Young Professionals Global make every effort to comply fully with the Data Protection
          Legislation and to ensure that your personal data is managed in accordance with
          this privacy policy.{'\n\n'}
          The transfer of any information via the internet is not completely secure. Young
          Pro Web cannot guarantee the security of your data transmitted to the App or app.
          During the actual transfer of the data, data loss or theft is at your own risk.
          Once Young Professionals Global receive your information, we follow strict protocols and
          security measures to prevent unauthorised access.{'\n\n'}
          We will collect and store your personal data on your Device using various
          technologies such as application data caches and browser web storage.{'\n\n'}
          If you are using a password that enables you to access certain parts of our App,
          you are responsible for the security of the password.
        </>
      ),
    },
    {
      id: 'rights',
      title: 'Accessing, Correcting and Restricting Your Data',
      content: (
        <>
          The Data Protection Legislation clearly provide you with the right to access your
          personal data, amend, erase or update it or request that we restrict our processing
          activities of your data. Should you wish to exercise these rights or have any
          concerns about how your data is being used please make any request to:{'\n'}
          <EmailLink addr='info@young-professionals.uk' />{'\n\n'}
          When collecting your data, we state if we intend to use your data for any external
          purposes or if we intend to disclose your information to any third party for such
          purposes. You will be required to provide your consent to the processing of your
          Submitted Data by checking certain options in our App.{'\n\n'}
          If you follow a link from our app or app to any partner, affiliated or advertiser
          related apps, please note that these apps and services that you may access through
          them operate under their own privacy policies. Please check all policies before you
          submit your personal information to these apps or use their services and this
          includes contact information, permissions and location information.
        </>
      ),
    },
    {
      id: 'access',
      title: 'Access to Information',
      content: (
        <>
          The Data Protection Legislation gives you the right to access information held
          about you and Young Professionals Global will comply with all data requests within the regulated
          one calendar month.{'\n\n'}
          <Label text='Please make requests to:' />{'\n'}
          <EmailLink addr='info@young-professionals.uk' />
        </>
      ),
    },
    {
      id: 'amendments',
      title: 'Amendments to the Young Professionals Global Policy',
      content:
        'Amendments will first be updated here in our Privacy Terms. If required, we will update our users by email or when you next start our App, of significant changes or any impact to your privacy interests and rights including requirements to obtain revised or additional consent from you regarding collection, transfer and processing of your personal data. You may be required to read and approve them to continue your use of our App or the Services.',
    },
    {
      id: 'contact',
      title: 'Contact',
      content: (
        <>
          All questions, suggestions and requests concerning the Young Professionals Global Privacy
          Policy are very welcome.{'\n\n'}
          <Label text='General contact:' />{'\n'}
          <EmailLink addr='info@young-professionals.uk' />
        </>
      ),
    },
  ]
}

export default function PrivacyPolicyContent() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const mutedColor = isLight ? '#718096' : '#94a3b8'
  const sections = React.useMemo(() => buildSections(), [])

  return (
    <LegalPageShell
      title='Privacy Policy'
      subtitle=''
      sections={sections}
      footer={
        <p
          style={{
            textAlign: 'center',
            color: mutedColor,
            fontSize: 12,
            marginTop: 8,
          }}
        >
          Young Professionals Global: Updated December 2025
        </p>
      }
    />
  )
}
