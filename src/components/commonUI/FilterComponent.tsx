'use client'

import React from 'react'
import {
  MapPin,
  Building2,
  Briefcase,
  LayoutGrid,
  Calendar,
  Tag,
} from 'lucide-react'
import FilterDropdown from './FilterDropdown'

export interface FilterOption {
  label: string
  value: string
}

interface FilterComponentProps {
  title: string
  options?: FilterOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  hideCount?: boolean
}

function getDefaultIcon(title: string): React.ReactNode {
  const t = title.toLowerCase()
  if (t.includes('location') || t.includes('city')) return <MapPin size={14} />
  if (t.includes('company')) return <Building2 size={14} />
  if (t.includes('employment')) return <Briefcase size={14} />
  if (t.includes('event type')) return <Calendar size={14} />
  if (t.includes('price') || t.includes('pricing')) return <Tag size={14} />
  if (t.includes('industry') || t.includes('sector')) return <LayoutGrid size={14} />
  return <LayoutGrid size={14} />
}

export default function FilterComponent({
  title,
  options = [],
  selectedValues,
  onChange,
  disabled = false,
  hideCount = false,
}: FilterComponentProps) {
  return (
    <FilterDropdown
      title={title}
      options={options}
      selectedValues={selectedValues}
      onChange={onChange}
      disabled={disabled}
      hideCount={hideCount}
      icon={getDefaultIcon(title)}
    />
  )
}
