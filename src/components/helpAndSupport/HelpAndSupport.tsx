'use client'

import { useTheme } from '@/context/ThemeContext'

const sections = [
  {
    id: 'conditions-of-use',
    title: 'Conditions of Use',
    content:
      'We will provide their services to you, which are subject to the conditions stated below in this document. Every time you visit this website, use its services or make a purchase, you accept the following conditions. This is why we urge you to read them carefully.',
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    content:
      'Before you continue using our website we advise you to read our privacy policy regarding our user data collection. It will help you better understand our practices.',
  },
  {
    id: 'copyright',
    title: 'Copyright',
    content:
      'Content published on this website (digital downloads, images, texts, graphics, logos) is the property of Young Pro and/or its content creators and protected by international copyright laws. The entire compilation of the content found on this website is the exclusive property of Young Pro, with copyright authorship for this compilation by Young Pro.',
  },
  {
    id: 'communications',
    title: 'Communications',
    paragraphs: [
      'The entire communication with us is electronic. Every time you send us an email or visit our website, you are going to be communicating with us. You hereby consent to receive communications from us. If you subscribe to the news on our website, you are going to receive regular emails from us. We will continue to communicate with you by posting news and notices on our website and by sending you emails.',
      'You also agree that all notices, disclosures, agreements and other communications we provide to you electronically meet the legal requirements that such communications be in writing.',
    ],
  },
  {
    id: 'applicable-law',
    title: 'Applicable Law',
    content:
      'By visiting this website, you agree that the laws of the applicable jurisdiction, without regard to principles of conflict laws, will govern these terms of service, or any dispute of any sort that might come between Young Pro and you, or its business partners and associates.',
  },
  {
    id: 'disputes',
    title: 'Disputes',
    content:
      'Any dispute related in any way to your visit to this website or to products you purchase from us shall be arbitrated by state or federal court and you consent to exclusive jurisdiction and venue of such courts.',
  },
  {
    id: 'comments-reviews-emails',
    title: 'Comments, Reviews, and Emails',
    paragraphs: [
      'Visitors may post content as long as it is not obscene, illegal, defamatory, threatening, infringing of intellectual property rights, invasive of privacy or injurious in any other way to third parties. Content has to be free of software viruses, political campaign, and commercial solicitation.',
      'We reserve all rights (but not the obligation) to remove and/or edit such content. When you post your content, you grant Young Pro non-exclusive, royalty-free and irrevocable right to use, reproduce, publish, modify such content throughout the world in any media.',
    ],
  },
  {
    id: 'license-and-site-access',
    title: 'License and Site Access',
    content:
      'We grant you a limited license to access and make personal use of this website. You are not allowed to download or modify it. This may be done only with written consent from us.',
  },
  {
    id: 'user-account',
    title: 'User Account',
    paragraphs: [
      'If you are an owner of an account on this website, you are solely responsible for maintaining the confidentiality of your private user details (username and password). You are responsible for all activities that occur under your account or password.',
      'We reserve all rights to terminate accounts, edit or remove content and cancel orders in their sole discretion.',
    ],
  },
]

export default function HelpAndSupport() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  return (
    <div className="w-full max-w-[1200px] mx-auto py-6 px-4 md:px-0">
      {/* Page Header */}
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-semibold"
          style={{ fontFamily: 'var(--font-plus-jakarta)' }}
        >
          Help & Support
        </h1>
        <p
          className={`mt-2 text-sm ${isLight ? 'text-[#888888]' : 'text-gray-400'}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          We provide all help and support possible to our clients
        </p>
      </div>

      <div
        className={`card_custom ${isLight ? '' : 'bg-[#020c1954]'}`}
      >
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <div key={section.id}>
              <h2
                className={`text-lg font-semibold mb-3 ${isLight ? 'text-[#222]' : 'text-white'}`}
                style={{ fontFamily: 'var(--font-plus-jakarta)' }}
              >
                {section.title}
              </h2>

              {section.content && (
                <p
                  className={`text-sm leading-relaxed ${isLight ? 'text-[#555]' : 'text-gray-300'}`}
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {section.content}
                </p>
              )}

              {'paragraphs' in section && section.paragraphs && (
                <div className="flex flex-col gap-3">
                  {section.paragraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      className={`text-sm leading-relaxed ${isLight ? 'text-[#555]' : 'text-gray-300'}`}
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {/* Divider */}
              {section.id !== 'user-account' && (
                <div
                  className={`mt-8 border-t ${isLight ? 'border-[#E0E4F0]' : 'border-white/10'}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
