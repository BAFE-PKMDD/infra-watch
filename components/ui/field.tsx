import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const fieldVariants = cva("space-y-2", {
  variants: {
    orientation: {
      vertical: "flex flex-col",
      horizontal: "flex flex-row items-start gap-4",
      responsive: "flex flex-col sm:flex-row sm:items-start sm:gap-4"
    }
  },
  defaultVariants: {
    orientation: "vertical"
  }
})

export interface FieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof fieldVariants> { }

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(fieldVariants({ orientation }), className)}
        {...props}
      />
    )
  }
)
Field.displayName = "Field"

const FieldContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 space-y-2", className)} {...props} />
))
FieldContent.displayName = "FieldContent"

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "space-y-4 [&[data-slot='checkbox-group']]:space-y-3",
      className
    )}
    {...props}
  />
))
FieldGroup.displayName = "FieldGroup"

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
FieldLabel.displayName = "FieldLabel"

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-500 dark:text-slate-400", className)}
    {...props}
  />
))
FieldDescription.displayName = "FieldDescription"

type FieldErrorInput = string | (string | undefined)[] | undefined

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  errors?: FieldErrorInput
}

const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, errors, ...props }, ref) => {
    const list =
      typeof errors === "string" ? [errors] : errors?.filter((item): item is string => Boolean(item))
    if (!list || list.length === 0) return null

    return (
      <p
        ref={ref}
        className={cn("text-sm font-medium text-red-500 dark:text-red-400", className)}
        {...props}
      >
        {list[0]}
      </p>
    )
  }
)
FieldError.displayName = "FieldError"

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>((({ className, ...props }, ref) => (
  <fieldset ref={ref} className={cn("space-y-4", className)} {...props} />
)))
FieldSet.displayName = "FieldSet"

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement> & {
    variant?: "default" | "label"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <legend
    ref={ref}
    className={cn(
      variant === "label"
        ? "text-sm font-medium leading-none"
        : "text-base font-semibold",
      className
    )}
    {...props}
  />
))
FieldLegend.displayName = "FieldLegend"

const FieldTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
))
FieldTitle.displayName = "FieldTitle"

export {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
  FieldTitle
}
