'use client'

import React, { useState } from 'react'
import Image from 'next/image'

const PALETTES: Array<readonly [string, string, string]> = [
  ['#5433FF', '#356FEE', '#20BCFF'],
  ['#F72585', '#B5179E', '#7209B7'],
  ['#F8961E', '#F3722C', '#F94144'],
  ['#06D6A0', '#118AB2', '#073B4C'],
  ['#FF6B6B', '#FF8E53', '#FFB627'],
  ['#7B2CBF', '#9D4EDD', '#C77DFF'],
  ['#0077B6', '#00B4D8', '#48CAE4'],
  ['#2A9D8F', '#E9C46A', '#F4A261'],
]

const paletteFor = (name: string): readonly [string, string, string] => {
  if (!name) return PALETTES[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return PALETTES[Math.abs(hash) % PALETTES.length]
}

const initialOf = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.charAt(0).toUpperCase() || '?'
}

interface InitialAvatarProps {
  name: string
  size: number
  borderRadius?: number
  textScale?: number
  className?: string
  style?: React.CSSProperties
}

export const InitialAvatar: React.FC<InitialAvatarProps> = ({
  name,
  size,
  borderRadius,
  textScale = 0.42,
  className,
  style,
}) => {
  const [c1, c2, c3] = paletteFor(name)
  const initial = initialOf(name)
  const fontSize = Math.round(size * textScale)
  const blobSize = Math.round(size * 0.65)
  const radius = borderRadius ?? size / 2

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`,
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -blobSize * 0.35,
          left: -blobSize * 0.35,
          width: blobSize,
          height: blobSize,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.18)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: -blobSize * 0.3,
          right: -blobSize * 0.3,
          width: blobSize * 0.8,
          height: blobSize * 0.8,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.18)',
        }}
      />
      <span
        style={{
          position: 'relative',
          color: '#FFFFFF',
          fontSize,
          fontWeight: 800,
          letterSpacing: 0.5,
          lineHeight: 1,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {initial}
      </span>
    </div>
  )
}

interface LogoWithFallbackProps {
  src?: string | null
  name: string
  size: number
  borderRadius?: number
  alt?: string
  className?: string
  style?: React.CSSProperties
  imgClassName?: string
}

/**
 * Renders next/image when `src` is present and valid; on missing or failed
 * load falls back to a gradient + initials placeholder derived from `name`.
 */
export const LogoWithFallback: React.FC<LogoWithFallbackProps> = ({
  src,
  name,
  size,
  borderRadius,
  alt,
  className,
  style,
  imgClassName,
}) => {
  const [failed, setFailed] = useState(false)
  const radius = borderRadius ?? size / 2

  const isValid = (() => {
    if (!src || failed) return false
    if (src.startsWith('/')) return true
    try {
      new URL(src)
      return true
    } catch {
      return false
    }
  })()

  if (!isValid) {
    return (
      <InitialAvatar
        name={name}
        size={size}
        borderRadius={radius}
        className={className}
        style={style}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        position: 'relative',
        display: 'inline-block',
        flexShrink: 0,
        ...style,
      }}
    >
      <Image
        src={src as string}
        alt={alt || name}
        width={size}
        height={size}
        unoptimized
        onError={() => setFailed(true)}
        className={imgClassName}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

export default InitialAvatar
