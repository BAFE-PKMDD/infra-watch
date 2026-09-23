"use client";

import { useState, useTransition } from "react";
import { Phone, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateMyPhoneNumber } from "@/actions/mutation/profile.mutation";

const ROLE_LABELS: Record<string, string> = {
  citizen: "Citizen",
  moderator: "Moderator",
  admin: "Administrator",
};

export function MyProfileClient({
  user,
}: {
  user: { name: string; email: string; role: string; phoneNumber: string | null };
}) {
  const [phoneInput, setPhoneInput] = useState(user.phoneNumber ?? "");
  const [savedPhoneNumber, setSavedPhoneNumber] = useState(user.phoneNumber);
  const [isPending, startTransition] = useTransition();

  const isDirty = phoneInput.trim() !== (savedPhoneNumber ?? "");

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await updateMyPhoneNumber(phoneInput.trim() || null);
        setSavedPhoneNumber(result.phoneNumber);
        setPhoneInput(result.phoneNumber ?? "");
        toast.success(result.phoneNumber ? "Phone number saved" : "Phone number cleared");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save phone number");
      }
    });
  }

  const showsSmsNote = user.role === "moderator" || user.role === "regional_admin" || user.role === "admin";

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">My profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your account contact details.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <UserIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>

          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Mobile number
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input
                id="phone"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                placeholder="09171234567"
                className="min-h-11 pl-9"
                disabled={isPending}
              />
            </div>
            <Button onClick={handleSave} disabled={isPending || !isDirty} className="min-h-11 sm:w-28">
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {showsSmsNote
              ? "Used to send you SMS alerts for pending feedback and issue follow-ups. Leave blank to opt out of SMS."
              : "Format: 09171234567 or +639171234567."}
          </p>
        </div>
      </main>
    </>
  );
}
