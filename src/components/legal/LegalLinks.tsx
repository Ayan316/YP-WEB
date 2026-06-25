'use client'

import React from 'react'

const LINK_COLOR = '#06c1fa'

const linkStyle: React.CSSProperties = {
  color: LINK_COLOR,
  textDecoration: 'underline',
}

export const GLOBAL_WEBSITE_URL = 'https://youngprofessionals.global'

export function EmailLink({ addr }: { addr: string }) {
  return (
    <a href={`mailto:${addr}`} style={linkStyle}>
      {addr}
    </a>
  )
}

export function AddressLink({ text }: { text: string }) {
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`
  return (
    <a href={href} target='_blank' rel='noopener noreferrer' style={linkStyle}>
      {text}
    </a>
  )
}

export function WebsiteLink({
  text,
  href = GLOBAL_WEBSITE_URL,
}: {
  text: string
  href?: string
}) {
  return (
    <a href={href} target='_blank' rel='noopener noreferrer' style={linkStyle}>
      {text}
    </a>
  )
}

export function Label({ text }: { text: string }) {
  return <strong style={{ fontWeight: 600 }}>{text}</strong>
}
