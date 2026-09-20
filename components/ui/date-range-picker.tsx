"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DateRangePickerProps {
  value?: DateRange
  onChange?: (date: DateRange | undefined) => void
  placeholder?: string
  className?: string
  align?: "start" | "center" | "end"
  numberOfMonths?: number
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  align = "end",
  numberOfMonths = 2,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "min-h-11 w-full justify-start border-slate-200 bg-transparent pr-9 text-left font-normal dark:border-slate-700",
                !value && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          {value && (
            <span
              role="button"
              aria-label="Clear date range"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onChange?.(undefined)
              }}
              className="absolute top-1/2 right-2 z-20 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={numberOfMonths}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
