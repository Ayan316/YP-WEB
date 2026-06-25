'use client'

import React from 'react'
import { Clock, ArrowDown, ArrowUp } from 'lucide-react'
import SortDropdown from './SortDropdown'

export interface SortPillOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface SortPillGroup {
  /** Subgroup heading shown above the pills (e.g. "RELEVANCE", "TITLE"). */
  label: string
  options: SortPillOption[]
}

interface SortByPillsProps {
  /** Heading shown above all groups. Defaults to "Sort". */
  title?: string
  groups: SortPillGroup[]
  value: string
  onChange: (next: string) => void
}

const SortByPills: React.FC<SortByPillsProps> = ({
  title = 'Sort',
  groups,
  value,
  onChange,
}) => {
  return (
    <SortDropdown groups={groups} value={value} onChange={onChange} title={title} />
  )
}

/**
 * Default Recently-Added / A-to-Z / Z-to-A grouping used by Companies, Jobs,
 * and Events listings.
 */
export const DEFAULT_SORT_GROUPS: SortPillGroup[] = [
  {
    label: 'Relevance',
    options: [
      {
        value: 'recently_added',
        label: 'Recently Added',
        icon: <Clock size={14} />,
      },
    ],
  },
  {
    label: 'Title',
    options: [
      { value: 'a_to_z', label: 'A to Z', icon: <ArrowDown size={14} /> },
      { value: 'z_to_a', label: 'Z to A', icon: <ArrowUp size={14} /> },
    ],
  },
]

export default SortByPills
