'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'

export interface LegalSection {
  id: string
  title: string
  content?: React.ReactNode
  paragraphs?: React.ReactNode[]
}

export interface LegalGroup {
  id: string
  heading?: string
  sections: LegalSection[]
}

interface LegalPageShellProps {
  title: string
  subtitle: string
  sections?: LegalSection[]
  groups?: LegalGroup[]
  footer?: React.ReactNode
}

export default function LegalPageShell({
  title,
  subtitle,
  sections,
  groups,
  footer,
}: LegalPageShellProps) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  // Normalize: if `groups` is provided, use it. Otherwise wrap `sections` in a single group.
  const renderGroups: LegalGroup[] =
    groups && groups.length > 0
      ? groups
      : [{ id: 'default', sections: sections ?? [] }]

  const renderSectionList = (groupSections: LegalSection[]) => (
    <div className='flex flex-col gap-5'>
      {groupSections.map((section, idx) => {
        const isLast = idx === groupSections.length - 1
        return (
          <div key={section.id}>
            <h2
              className={`text-lg font-semibold mb-3 ${
                isLight ? 'text-[#222]' : 'text-white'
              }`}
              style={{ fontFamily: 'var(--font-plus-jakarta)' }}
            >
              {section.title}
            </h2>

            {section.content !== undefined && (
              <p
                className={`text-sm leading-relaxed ${
                  isLight ? 'text-[#555]' : 'text-gray-300'
                }`}
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {section.content}
              </p>
            )}

            {section.paragraphs && section.paragraphs.length > 0 && (
              <div className='flex flex-col gap-3'>
                {section.paragraphs.map((paragraph, i) => (
                  <p
                    key={i}
                    className={`text-sm leading-relaxed ${
                      isLight ? 'text-[#555]' : 'text-gray-300'
                    }`}
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {!isLast && (
              <div
                className={`mt-8 border-t ${
                  isLight ? 'border-[#E0E4F0]' : 'border-white/10'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isLight ? '#F4F6FF' : '#040F1F',
      }}
    >
      <div className='w-full max-w-[1200px] mx-auto py-6 px-4 md:px-0'>
        {/* Page Header */}
        <div className='mb-6'>
          <h1
            className={`text-2xl md:text-3xl font-semibold ${
              isLight ? 'text-[#040F1F]' : 'text-white'
            }`}
            style={{ fontFamily: 'var(--font-plus-jakarta)' }}
          >
            {title}
          </h1>
          <p
            className={`mt-2 text-sm ${
              isLight ? 'text-[#888888]' : 'text-gray-400'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {subtitle}
          </p>
        </div>

        <div className='flex flex-col gap-6'>
          {renderGroups.map((group, gIdx) => (
            <React.Fragment key={group.id}>
              {group.heading && (
                <h2
                  className={`text-xl md:text-2xl font-semibold ${
                    isLight ? 'text-[#040F1F]' : 'text-white'
                  } ${gIdx === 0 ? '' : 'mt-2'}`}
                  style={{ fontFamily: 'var(--font-plus-jakarta)' }}
                >
                  {group.heading}
                </h2>
              )}
              <div className={`card_custom ${isLight ? '' : 'bg-[#020c1954]'}`}>
                {renderSectionList(group.sections)}
              </div>
            </React.Fragment>
          ))}

          {footer && <div>{footer}</div>}
        </div>
      </div>
    </div>
  )
}
