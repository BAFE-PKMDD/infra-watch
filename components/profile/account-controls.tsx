"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { updateMyNotificationPreferences } from "@/actions/mutation/profile.mutation";
import type { NotificationPreferences } from "@/lib/operations-models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountControls({
  preferences,
  hasPassword,
}: {
  preferences: NotificationPreferences;
  hasPassword: boolean;
}) {
  const [values, setValues] = useState(preferences);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function savePreferences(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await updateMyNotificationPreferences(values);
      if (!result.success) throw new Error(result.error);
      setValues(result.preferences);
      setNotice("Notification preferences saved.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Preferences could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("newPassword") || "");
    setError("");
    setNotice("");
    if (password.length < 8 || password !== data.get("confirmPassword")) {
      setError("Use at least eight characters and matching new passwords.");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword")),
        newPassword: password,
        revokeOtherSessions: true,
      });
      if (result.error)
        throw new Error(
          result.error.message || "Password could not be changed.",
        );
      form.reset();
      setNotice("Password changed. Other sessions have been signed out.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Password could not be changed.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Notification preferences</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose channels for project discussions and operational alerts.
          Verification codes and receipts for your submissions are sent
          separately.
        </p>
        <form onSubmit={savePreferences} className="space-y-4">
          <fieldset disabled={pending} className="space-y-2">
            {(
              [
                ["inApp", "In-app notifications"],
                ["email", "Email notifications"],
                ["sms", "SMS notifications"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={values[key]}
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <Button type="submit" className="min-h-11" disabled={pending}>
            Save notification preferences
          </Button>
        </form>
      </section>
      {hasPassword ? (
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <fieldset disabled={pending} className="space-y-4">
              {(
                [
                  ["currentPassword", "Current password", "current-password"],
                  ["newPassword", "New password", "new-password"],
                  ["confirmPassword", "Confirm new password", "new-password"],
                ] as const
              ).map(([name, label, autocomplete]) => (
                <label
                  key={name}
                  className="block space-y-2 text-sm font-medium"
                >
                  <span>{label}</span>
                  <Input
                    name={name}
                    type="password"
                    autoComplete={autocomplete}
                    required
                    minLength={name === "currentPassword" ? 1 : 8}
                    maxLength={128}
                    className="min-h-11"
                  />
                </label>
              ))}
            </fieldset>
            <Button
              type="submit"
              className="min-h-11 h-auto max-w-full whitespace-normal text-left"
              disabled={pending}
            >
              Change password and sign out other sessions
            </Button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          This account uses an external sign-in provider. Manage its password
          with that provider.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
