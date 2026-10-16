"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { replyToContactMessage } from "@/actions/mutation/contact.mutation";
import { Button } from "@/components/ui/button";
import {
  contentButtonClass,
  contentControlClass,
} from "@/components/admin/content/content-controls";

export function ContactEmailReply({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const response = String(new FormData(form).get("response") || "");
    setPending(true);
    setResult(null);
    try {
      const sent = await replyToContactMessage(id, response);
      setResult(sent);
      if (sent.success) {
        form.reset();
        router.refresh();
      }
    } catch {
      setResult({
        success: false,
        error: "Email could not be sent. Your response is still here.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="mt-5 border-t border-slate-300 pt-3 dark:border-slate-700">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">
        Reply through INFRA Watch
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label htmlFor={`reply-${id}`} className="block text-sm font-semibold">
          Staff response
        </label>
        <textarea
          id={`reply-${id}`}
          name="response"
          required
          minLength={10}
          maxLength={10000}
          rows={5}
          disabled={pending}
          className={contentControlClass}
        />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sends an email using the Contact Response template. A successful reply
          marks the message in progress.
        </p>
        {result ? (
          <p role={result.success ? "status" : "alert"} className="text-sm">
            {result.success ? "Email response sent." : result.error}
          </p>
        ) : null}
        <Button type="submit" className={contentButtonClass} disabled={pending}>
          {pending ? "Sending…" : "Send email response"}
        </Button>
      </form>
    </details>
  );
}
