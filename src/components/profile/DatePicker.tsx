"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!value) return undefined
    
    if (value instanceof Date) return value
    
    // Handle string format: DD-MM-YYYY
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = parse(value, "dd-MM-yyyy", new Date())
        // Validate the parsed date
        if (!isNaN(parsed.getTime())) {
          return parsed
        }
      } catch (e) {
        console.error("Error parsing date:", e)
      }
    }
    
    return undefined
  })

  React.useEffect(() => {
    if (value) {
      let parsedDate: Date | undefined
      
      if (value instanceof Date) {
        parsedDate = value
      } else if (typeof value === "string" && value.trim()) {
        try {
          parsedDate = parse(value, "dd-MM-yyyy", new Date())
          if (isNaN(parsedDate.getTime())) {
            parsedDate = undefined
          }
        } catch (e) {
          console.error("Error parsing date string:", value, e)
          parsedDate = undefined
        }
      }
      
      setDate(parsedDate)
    } else {
      setDate(undefined)
    }
  }, [value])

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate)
    onChange?.(newDate)
  }

  const isDateDisabled = (testDate: Date) => {
    if (minDate && testDate < minDate) return true
    if (maxDate && testDate > maxDate) return true
    return false
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-12 rounded-full px-6",
            "bg-[#f9fafb] border-[#d1d5db] dark:bg-[#ffffff0d] dark:border-[#ffffff3b]",
            "text-[#1a1a2e] dark:text-white",
            !date && "text-[#6b7280] dark:text-[#a0aec0]",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd-MM-yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto p-0",
          "bg-white border-gray-200 dark:bg-black dark:border-gray-700",
          "shadow-2xl"
        )}
        align="start"
      >
        <div className="bg-white dark:bg-black profile-navbar rounded-lg overflow-hidden">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={date}
            onSelect={handleDateChange}
            disabled={isDateDisabled}
            initialFocus
            defaultMonth={date ?? maxDate ?? new Date()}
            className="bg-white text-gray-900 dark:bg-black dark:text-white"
            classNames={{
              months: "bg-white dark:bg-black",
              month: "bg-white dark:bg-black",
              caption_label: "text-gray-900 dark:text-white",
              head_cell: "text-gray-500 dark:text-gray-400 font-semibold",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 dark:[&:has([aria-selected].day-outside)]:bg-gray-900/50 [&:has([aria-selected])]:bg-gray-100/50 dark:[&:has([aria-selected])]:bg-gray-900/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(
                "h-9 w-9 p-0 font-normal hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white rounded-md transition-colors",
                "aria-selected:opacity-100"
              ),
              day_selected: "bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-gray-700 dark:hover:bg-gray-200 font-bold",
              day_today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold ring-1 ring-gray-300 dark:ring-gray-600",
              day_outside: "text-gray-400 dark:text-gray-600 opacity-50",
              day_disabled: "text-gray-400 dark:text-gray-600 opacity-30 cursor-not-allowed",
              day_range_middle: "aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-gray-900 dark:aria-selected:text-white",
              day_hidden: "invisible",
              nav: "flex items-center justify-between",
              nav_button: cn(
                "h-9 w-9 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white rounded-md",
                "transition-colors p-0"
              ),
              nav_button_previous: "absolute left-1 top-0",
              nav_button_next: "absolute right-1 top-0",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              row: "flex w-full mt-2",
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}