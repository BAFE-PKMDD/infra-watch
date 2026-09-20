"use client";

import { ContextMenu } from "@base-ui/react/context-menu";
import { ChevronDown, ChevronUp, Eye, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Right-click / long-press menu for a chart bar, matching the Power BI
 * pattern used elsewhere on this chart: left-click drills down in place,
 * this menu offers the same drill actions plus "See details" (the project
 * drill-through dialog). Built directly on Base UI's `context-menu` module
 * (the same primitive `components/ui/dropdown-menu.tsx` wraps for regular
 * menus) since it already handles right-click, long-press, cursor-anchored
 * positioning, and dismissal natively.
 */
export function ChartContextMenu({
  hasTarget,
  drillDownLabel,
  onDrillDown,
  drillUpLabel,
  onDrillUp,
  seeDetailsLabel,
  onSeeDetails,
  children,
}: {
  hasTarget: boolean;
  drillDownLabel?: string;
  onDrillDown?: () => void;
  drillUpLabel?: string;
  onDrillUp?: () => void;
  seeDetailsLabel: string;
  onSeeDetails: () => void;
  children: ReactNode;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="block">{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="isolate z-50 outline-none">
          <ContextMenu.Popup className="z-50 min-w-56 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {hasTarget ? (
              <>
                {onDrillDown && drillDownLabel ? (
                  <DropdownMenuItem onClick={onDrillDown}>
                    <ChevronDown className="size-4" aria-hidden="true" />
                    {drillDownLabel}
                  </DropdownMenuItem>
                ) : null}
                {onDrillUp && drillUpLabel ? (
                  <DropdownMenuItem onClick={onDrillUp}>
                    <ChevronUp className="size-4" aria-hidden="true" />
                    {drillUpLabel}
                  </DropdownMenuItem>
                ) : null}
                {(onDrillDown || onDrillUp) ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem onClick={onSeeDetails}>
                  <Eye className="size-4" aria-hidden="true" />
                  {seeDetailsLabel}
                </DropdownMenuItem>
              </>
            ) : (
              <p className="px-1.5 py-1.5 text-sm text-muted-foreground">Right-click a bar for options.</p>
            )}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export type ChartMenuTarget = { key: string; label: string };

/**
 * Keyboard- and screen-reader-operable equivalent of `ChartContextMenu`,
 * reached through one small button instead of a permanently visible row of
 * selects. Satisfies the same "keyboard-operable alternative" requirement
 * without staying on screen when nobody is using it.
 */
export function ChartOptionsMenu({
  drillTargets,
  onDrillInto,
  detailTargets,
  onSeeDetails,
}: {
  drillTargets?: ChartMenuTarget[];
  onDrillInto?: (key: string) => void;
  detailTargets: ChartMenuTarget[];
  onSeeDetails: (key: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Chart options"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-100 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800"
          />
        }
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {drillTargets && drillTargets.length > 0 && onDrillInto ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ChevronDown className="size-4" aria-hidden="true" />
              Drill into
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              {drillTargets.map((item) => (
                <DropdownMenuItem key={item.key} onClick={() => onDrillInto(item.key)}>{item.label}</DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Eye className="size-4" aria-hidden="true" />
            See details
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {detailTargets.map((item) => (
              <DropdownMenuItem key={item.key} onClick={() => onSeeDetails(item.key)}>{item.label}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
