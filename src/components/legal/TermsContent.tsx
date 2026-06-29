/* eslint-disable react/no-unescaped-entities */
'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'
import LegalPageShell, { LegalSection, LegalGroup } from './LegalPageShell'
import { AddressLink, EmailLink, Label, WebsiteLink } from './LegalLinks'

function buildSections(): LegalSection[] {
  return [
    {
      id: 'intro',
      title: '',
      content: (
        <>
          These Terms of Use govern your access to and use of the Young Pro App, any
          related mobile application services, and any related web pages or features linked
          to the <WebsiteLink text='Young Professionals global website' />.{'\n\n'}
          By creating an account, accessing, or using the Young Pro App, you agree to these
          Terms of Use. If you do not agree, you must not use the app.
        </>
      ),
    },
    {
      id: 'who-we-are',
      title: '1. Who we are',
      content: (
        <>
          The Young Pro App is operated by Young Professionals – Inspiring a New Generation
          Ltd under the Young Professionals account and is linked to the{' '}
          <WebsiteLink text='Young Professionals global website' />.{'\n\n'}
          <Label text='Legal entity:' />{'\n'}
          Young Professionals – Inspiring a New Generation Ltd{'\n\n'}
          <Label text='Registered address:' />{'\n'}
          <AddressLink text='15th Floor (Cs) 6 Bevis Marks, London, England, EC3A 7BA' />
          {'\n\n'}
          <Label text='Company number:' />{'\n'}
          09719565{'\n\n'}
          <Label text='General contact email:' />{'\n'}
          <EmailLink addr='info@young-professionals.uk' />{'\n\n'}
          For content reports, blocking issues, safeguarding concerns, or conduct complaints,
          the designated administrator is:{'\n\n'}
          <Label text='Dan Miller mail:' />{'\n'}
          <EmailLink addr='dan.miller@young-professionals.uk' />
        </>
      ),
    },
    {
      id: 'about-the-app',
      title: '2. About the app',
      content: (
        <>
          The Young Pro App is a careers, opportunities, networking, and engagement platform
          designed to help young people explore career pathways, connect with employers,
          access opportunities, and participate in relevant career development content and
          community features.{'\n\n'}
          Features may include, without limitation:{'\n'}
          • Student profiles{'\n'}
          • Employer profiles or pages{'\n'}
          • Event listings{'\n'}
          • Job, work experience, event, or opportunity listings{'\n'}
          • Comments, posts, messages, or other interactive features{'\n'}
          • App notifications, emails, and linked website content{'\n\n'}
          Some features may change, be updated, be removed, or be introduced over time.
        </>
      ),
    },
    {
      id: 'eligibility',
      title: '3. Eligibility and minimum age',
      content: (
        <>
          You must be at least 14 years old to create an account or use the app.{'\n\n'}
          By using the app, you confirm that:{'\n'}
          • You are at least 14 years old{'\n'}
          • The information you provide is true and accurate{'\n'}
          • You are legally able to agree to these Terms of Use{'\n'}
          • If you are under 18, you have any parental or guardian consent required by
          applicable law{'\n\n'}
          The app is not intended for children under 14. If we become aware that a user under
          14 has created an account, we may suspend or delete that account.
        </>
      ),
    },
    {
      id: 'your-account',
      title: '4. Your account',
      content: (
        <>
          You are responsible for keeping your login details secure and for all activity
          carried out through your account.{'\n\n'}
          You agree that you will:{'\n'}
          • Provide accurate, complete, and current information{'\n'}
          • Keep your profile details up to date{'\n'}
          • Not impersonate any other person, employer, school, or organisation{'\n'}
          • Not create multiple misleading or duplicate accounts{'\n'}
          • Not share your account with anyone else{'\n\n'}
          We may suspend, restrict, or remove accounts that are false, misleading, inactive
          for long periods, unsafe, or in breach of these Terms.
        </>
      ),
    },
    {
      id: 'acceptable-use',
      title: '5. Acceptable use',
      content: (
        <>
          You must use the app lawfully, respectfully, and only for its intended purpose.
          {'\n\n'}
          You must not:{'\n'}
          • Post, upload, send, or share content that is abusive, threatening, defamatory,
          hateful, discriminatory, harassing, sexually explicit, violent, or otherwise
          objectionable{'\n'}
          • Bully, intimidate, target, shame, or exploit any other user{'\n'}
          • Share content that is unlawful, misleading, fraudulent, or infringes another
          person's rights{'\n'}
          • Upload viruses, malicious code, or attempt to disrupt or interfere with the
          platform{'\n'}
          • Scrape, harvest, copy, or extract data from the app without permission{'\n'}
          • Use the app to spam, advertise unrelated products or services, or solicit users
          inappropriately{'\n'}
          • Pretend to be affiliated with Young Professionals when you are not{'\n'}
          • Share private, confidential, or personal information about another person
          without permission{'\n'}
          • Circumvent blocks, suspensions, reporting tools, or moderation controls
        </>
      ),
    },
    {
      id: 'ugc',
      title: '6. User-generated content',
      content: (
        <>
          If the app allows you to create a profile, post content, comment, message, or
          otherwise contribute material, you remain responsible for the content you submit.
          {'\n\n'}
          You confirm that:{'\n'}
          • You own your content, or you have the right to post it{'\n'}
          • Your content is accurate to the best of your knowledge{'\n'}
          • Your content does not infringe the intellectual property, privacy, data
          protection, or other rights of any third party{'\n'}
          • Your content complies with these Terms{'\n\n'}
          We may review, moderate, restrict, hide, remove, or disable access to any content at
          our discretion where we believe it may breach these Terms, create risk, or harm
          users, Young Professionals, or third parties.
        </>
      ),
    },
    {
      id: 'reporting',
      title: '7. Reporting content, users, and concerns',
      content: (
        <>
          Users must be able to report content, comments, posts, messages, profiles, and
          other user activity, including content created by an administrator or official
          account if they believe it is inappropriate, inaccurate, unsafe, or in breach of
          these Terms.{'\n\n'}
          Reports may be made through:{'\n'}
          • The in-app reporting mechanism, if available{'\n'}
          • Email to <EmailLink addr='dan.miller@young-professionals.uk' />{'\n'}
          • Any additional support route listed in the app or on the website{'\n\n'}
          Young Professionals aims to review reported content and respond to blocking, safety,
          moderation, or reporting concerns within 24 hours of receipt, although complex cases
          may take longer to investigate fully.{'\n\n'}
          Where appropriate, we may:{'\n'}
          • Remove content{'\n'}
          • Warn a user{'\n'}
          • Restrict features{'\n'}
          • Block interaction between users{'\n'}
          • Suspend or terminate an account{'\n'}
          • Escalate safeguarding or legal concerns where necessary
        </>
      ),
    },
    {
      id: 'blocking',
      title: '8. Blocking users',
      content: (
        <>
          If blocking functionality is available, users may block other users to prevent
          unwanted interaction.{'\n\n'}
          Young Professionals may also block, restrict, suspend, or ban users where there is
          evidence of abuse, harassment, impersonation, repeated misconduct, or risk to
          others.{'\n\n'}
          Attempts to evade a block or suspension may result in permanent removal from the
          app.
        </>
      ),
    },
    {
      id: 'moderation',
      title: '9. Moderation and response times',
      content: (
        <>
          Young Professionals uses moderation controls, which may include a combination of
          manual review, keyword or rule-based filtering, and administrative enforcement, to
          help prevent objectionable material from appearing on the app.{'\n\n'}
          We do not guarantee that all objectionable content will be prevented or removed
          immediately, but we will take reasonable steps to review and act on reports
          promptly.{'\n\n'}
          Our current moderation contact is:{'\n\n'}
          <Label text='Dan Miller:' />{'\n'}
          <EmailLink addr='dan.miller@young-professionals.uk' />{'\n\n'}
          Young Professionals aims to acknowledge or act on urgent moderation and safety
          concerns within 24 hours.
        </>
      ),
    },
    {
      id: 'community-standards',
      title: '10. Community standards',
      content: (
        <>
          To keep the app safe and useful, all users must behave professionally and
          respectfully.{'\n\n'}
          You must not use the app to:{'\n'}
          • Target or exploit younger users{'\n'}
          • Seek personal relationships inappropriately{'\n'}
          • Post offensive jokes, hate speech, or sexualised content{'\n'}
          • Encourage self-harm, illegal activity, or unsafe behaviour{'\n'}
          • Shame or publicly attack students, employers, schools, staff, or other users
          {'\n\n'}
          We may take action without notice where content or conduct presents immediate
          safety, safeguarding, or reputational concerns.
        </>
      ),
    },
    {
      id: 'opportunities',
      title: '11. Opportunities, employer content, and third-party content',
      content: (
        <>
          The app may contain employer pages, career content, listings, opportunities, links,
          events, or third-party materials.{'\n\n'}
          Young Professionals does not guarantee:{'\n'}
          • That any opportunity will remain open{'\n'}
          • That any employer will contact or recruit a user{'\n'}
          • That any listing is error-free at all times{'\n'}
          • That third-party websites or services linked from the app are safe, accurate, or
          available{'\n\n'}
          Users should use their own judgment before applying, contacting third parties, or
          relying on external content.
        </>
      ),
    },
    {
      id: 'intellectual-property',
      title: '12. Intellectual property',
      content: (
        <>
          The app, its design, branding, software, text, graphics, logos, layout, and content
          owned by Young Professionals are protected by intellectual property laws.{'\n\n'}
          Except where expressly permitted, you must not copy, distribute, modify, reverse
          engineer, republish, sell, or commercially exploit any part of the app.{'\n\n'}
          By posting content to the app, you grant Young Professionals a non-exclusive,
          worldwide, royalty-free licence to host, store, reproduce, display, and use that
          content for the purpose of operating, improving, promoting, securing, and
          moderating the app and related services.
        </>
      ),
    },
    {
      id: 'privacy',
      title: '13. Privacy and data protection',
      content: (
        <>
          Your use of the app is also subject to our Privacy Policy, which explains how
          personal data is collected, used, stored, and shared.{'\n\n'}
          Young Professionals should publish a separate Privacy Policy and ensure its App
          Store privacy disclosures match actual data handling, including any third-party
          SDKs, analytics, or tracking permissions.{'\n\n'}
          <Label text='Privacy policy link:' />{'\n'}
          Terms & Conditions – Young Professionals
        </>
      ),
    },
    {
      id: 'notifications',
      title: '14. Notifications and communications',
      content: (
        <>
          By creating an account, you agree that Young Professionals may send service-related
          communications, including account notices, security messages, moderation notices,
          opportunity alerts, and app-related updates.{'\n\n'}
          Where required by law, marketing communications will be subject to your consent
          choices and communication preferences.
        </>
      ),
    },
    {
      id: 'termination',
      title: '15. Account suspension and termination',
      content: (
        <>
          We may suspend, restrict, or terminate your account immediately if:{'\n'}
          • You breach these Terms{'\n'}
          • Your content or conduct creates risk for another person{'\n'}
          • You misuse the app or attempt to interfere with its operation{'\n'}
          • Your account appears false, misleading, or fraudulent{'\n'}
          • We are required to do so by law or to protect the platform, users, or reputation
          of Young Professionals{'\n\n'}
          You may also request deletion of your account by contacting:{'\n'}
          <EmailLink addr='info@young-professionals.uk' />
        </>
      ),
    },
    {
      id: 'disclaimers',
      title: '16. Disclaimers',
      content: (
        <>
          The app is provided on an "as is" and "as available" basis.{'\n\n'}
          To the extent permitted by law, Young Professionals does not guarantee that:{'\n'}
          • The app will always be uninterrupted, secure, or error-free{'\n'}
          • Content will always be accurate, complete, or current{'\n'}
          • Use of the app will result in interviews, job offers, placements, or other
          outcomes{'\n\n'}
          Nothing in these Terms excludes liability that cannot lawfully be excluded.
        </>
      ),
    },
    {
      id: 'changes',
      title: '17. Changes to the app or these Terms',
      content: (
        <>
          We may update the app, its features, these Terms, or related policies from time to
          time.{'\n\n'}
          Where changes are material, we will take reasonable steps to notify users through
          the app, website, or email.{'\n\n'}
          Continued use of the app after changes take effect means you accept the updated
          Terms.
        </>
      ),
    },
    {
      id: 'governing-law',
      title: '18. Governing law',
      content: (
        <>
          These Terms are governed by the laws of England and Wales, and the courts of
          England and Wales shall have exclusive jurisdiction, unless mandatory local
          consumer law says otherwise.
        </>
      ),
    },
    {
      id: 'contact',
      title: '19. Contact us',
      content: (
        <>
          For legal notices, moderation concerns, reporting issues, or questions about these
          Terms, contact:{'\n\n'}
          <Label text='Dan Miller:' />{'\n'}
          <EmailLink addr='dan.miller@young-professionals.uk' />{'\n\n'}
          <Label text='General contact:' />{'\n'}
          <EmailLink addr='info@young-professionals.uk' />
        </>
      ),
    },
    {
      id: 'refund-policy',
      title: '',
      content: (
        <>
          <Label text='Company name:' />{'\n'}
          YOUNG PROFESSIONALS UK - INSPIRING A NEW GENERATION LTD.{'\n\n'}
          <Label text='Company number:' />{'\n'}
          09719565{'\n\n'}
          <Label text='Registered office:' />{'\n'}
          <AddressLink text='15th Floor (Cs), 6 Bevis Marks, London, England, EC3A 7BA' />
          {'\n\n'}
          <Label text='Contact for exceptional refund requests:' />{'\n'}
          <EmailLink addr='dan.miller@young-professionals.uk' />
        </>
      ),
    },
    {
      id: 'refund-scope',
      title: '1. Scope',
      content:
        'This Refund Policy applies to payments made through the Young Pro App and any related booking journey operated by Young Professionals. Paid transactions are rare and are usually limited to selected event bookings or an associated administration fee.',
    },
    {
      id: 'refund-general',
      title: '2. General position on refunds',
      content: (
        <>
          Young Professionals does not generally offer refunds for payments made through the
          app or for event-related charges.{'\n\n'}
          By completing a payment, the student or customer acknowledges that places for
          events may be limited, administrative work may begin immediately after booking, and
          fees may relate to reservation, processing, or administration rather than a
          cancellable subscription service.
        </>
      ),
    },
    {
      id: 'refund-exceptional',
      title: '3. Exceptional refund requests',
      content: (
        <>
          Although refunds are not ordinarily available, Young Professionals reserves the
          right, in its absolute discretion, to review and approve a refund in exceptional
          cases.{'\n\n'}
          A refund request may be considered where the student emails within 14 days of the
          relevant event booking and provides a valid reason, including unforeseen
          circumstances. Any decision to issue a refund is entirely at the discretion of
          Young Professionals.{'\n\n'}
          • Requests must be sent to{' '}
          <EmailLink addr='dan.miller@young-professionals.uk' />.{'\n'}
          • The request should include the student's full name, booking details, date of
          payment, event name, and the reason for the request.{'\n'}
          • Providing information does not guarantee that a refund will be approved.{'\n'}
          • Young Professionals may ask for reasonable supporting information before
          deciding the request.
        </>
      ),
    },
    {
      id: 'refund-approved',
      title: '4. When refunds are approved',
      content: (
        <>
          Where Young Professionals agrees to issue a refund, the refund will usually be
          returned to the original payment method used at checkout, unless a different method
          is required by law or by the payment processor.{'\n\n'}
          Payments linked to Young Professionals' Stripe account are processed using Stripe.
          Once a refund is successfully issued, the time it takes for the funds to appear on
          the customer's statement depends on the card network and the issuing bank. Fully
          refunded card charges are generally not open to disputes or chargebacks through the
          card networks.
        </>
      ),
    },
    {
      id: 'refund-limits',
      title: '5. Non-refundable items and limits',
      content: (
        <>
          • Administration fees are normally non-refundable.{'\n'}
          • Missed events, change of mind, timetable clashes, or failure to attend will not
          usually qualify for a refund.{'\n'}
          • Young Professionals may decline any request that is incomplete, submitted late,
          unsupported, abusive, or inconsistent with this policy.
        </>
      ),
    },
    {
      id: 'refund-chargebacks',
      title: '6. Chargebacks and payment disputes',
      content:
        'Customers should contact Young Professionals first before starting a chargeback or payment dispute with their bank or card provider. Where a chargeback is raised, Young Professionals may provide booking records, event details, communications, and this policy to Stripe, the acquiring bank, or the relevant card scheme as evidence in response to the dispute.',
    },
    {
      id: 'refund-contact',
      title: '7. Contact details',
      content: (
        <>
          Questions about this policy or exceptional refund requests should be sent to{' '}
          <EmailLink addr='dan.miller@young-professionals.uk' />.
        </>
      ),
    },
    {
      id: 'refund-company',
      title: '8. Company details',
      content: (
        <>
          This policy is issued by YOUNG PROFESSIONALS UK - INSPIRING A NEW GENERATION LTD.
          (company number 09719565), whose registered office is{' '}
          <AddressLink text='15th Floor (Cs), 6 Bevis Marks, London, England, EC3A 7BA' />.
        </>
      ),
    },
    {
      id: 'refund-changes',
      title: '9. Changes to this policy',
      content:
        'Young Professionals may update this Refund Policy from time to time to reflect operational, legal, or payment-processing changes. The version published in the Young Professionals App or on the relevant booking page at the time of payment will apply unless the law requires otherwise.',
    },
  ]
}

export default function TermsContent() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const mutedColor = isLight ? '#718096' : '#94a3b8'
  const sections = React.useMemo(() => buildSections(), [])

  const groups = React.useMemo<LegalGroup[]>(() => {
    const refundStartIdx = sections.findIndex((s) => s.id === 'refund-policy')
    if (refundStartIdx === -1) {
      return [{ id: 'terms', sections }]
    }
    const termsSections = sections.slice(0, refundStartIdx)
    const refundSections = sections.slice(refundStartIdx)
    return [
      { id: 'terms', sections: termsSections },
      { id: 'refund', heading: 'Refund Policy', sections: refundSections },
    ]
  }, [sections])

  return (
    <LegalPageShell
      title='Terms of Use'
      subtitle=''
      groups={groups}
      footer={
        <p
          style={{
            textAlign: 'center',
            color: mutedColor,
            fontSize: 12,
            marginTop: 8,
          }}
        >
          Last updated: April 2026 | Version 1.0
        </p>
      }
    />
  )
}
