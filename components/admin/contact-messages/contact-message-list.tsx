"use client";

import { useState } from "react";
import Link from "next/link";

import type { getContactMessages } from "@/actions/query/contact-messages.query";
import { TutorialModeNotice, useTutorialSandbox } from "@/components/admin/tour/tutorial-sandbox";
import { Button } from "@/components/ui/button";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ContactMessageStatusControl } from "@/components/admin/contact-messages/contact-message-status-control";
import { ContactEmailReply } from "@/components/admin/contact-messages/contact-email-reply";
import {
  CONTACT_MESSAGE_STATUSES,
  CONTACT_MESSAGE_STATUS_LABELS,
  isContactMessageStatus,
  type ContactMessageStatus,
} from "@/lib/contact-messages";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const statusBadgeClassName: Record<ContactMessageStatus, string> = {
  new: "border-blue-300 bg-blue-50 text-blue-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
  in_progress: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
  resolved: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
};

function buildHref(status: ContactMessageStatus | null, page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/contact-messages?${query}` : "/contact-messages";
}

const statusDotClassName: Record<ContactMessageStatus, string> = {
  new: "bg-blue-600 dark:bg-sky-400",
  in_progress: "bg-amber-500 dark:bg-amber-400",
  resolved: "bg-emerald-600 dark:bg-emerald-400",
};

const statusAccentClassName: Record<ContactMessageStatus, string> = {
  new: "before:bg-blue-600 dark:before:bg-sky-400",
  in_progress: "before:bg-amber-500 dark:before:bg-amber-400",
  resolved: "before:bg-emerald-600 dark:before:bg-emerald-400",
};

const filterLinkClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

type ContactResult = Awaited<ReturnType<typeof getContactMessages>>;

export function ContactMessageList({ initialResult }: { initialResult: ContactResult }) {
  const sandbox = useTutorialSandbox();
  return <ContactMessageListContent key={sandbox?.state.id ?? "live"} initialResult={initialResult} />;
}

function ContactMessageListContent({ initialResult }: { initialResult: ContactResult }) {
  const sandbox = useTutorialSandbox();
  const [emailOpen, setEmailOpen] = useState(false);
  const [reply, setReply] = useState("");
  const result: ContactResult = sandbox ? {
    ...initialResult, data: [sandbox.state.contact], status: null, page: 1, totalPages: 1, total: 1,
    counts: { new: Number(sandbox.state.contact.status === "new"), in_progress: Number(sandbox.state.contact.status === "in_progress"), resolved: Number(sandbox.state.contact.status === "resolved") },
  } : initialResult;
  const allCount = result.counts.new + result.counts.in_progress + result.counts.resolved;

  const filters: Array<{ label: string; status: ContactMessageStatus | null; total: number }> = [
    { label: "All", status: null, total: allCount },
    ...CONTACT_MESSAGE_STATUSES.map((status) => ({
      label: CONTACT_MESSAGE_STATUS_LABELS[status],
      status,
      total: result.counts[status],
    })),
  ];

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Contact Messages" }]}
      title="Contact Messages"
      description="Messages sent through the public Contact Us page. Reply from your own email, then update the status so other staff know it was handled."
    >
      <div className="space-y-6">
        {sandbox ? <TutorialModeNotice /> : null}
        <nav
          aria-label="Filter by status"
          className="flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-fit dark:border-slate-800 dark:bg-slate-900"
        >
          {filters.map((filter) => {
            const active = filter.status === result.status;
            return (
              <Link
                key={filter.label}
                href={buildHref(filter.status)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none",
                  active
                    ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                    : "text-slate-700 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white",
                )}
              >
                {filter.status ? (
                  <span aria-hidden="true" className={cn("size-2 rounded-full", statusDotClassName[filter.status])} />
                ) : null}
                {filter.label}
                <span
                  className={cn(
                    "min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
                  )}
                >
                  {filter.total.toLocaleString("en-PH")}
                </span>
              </Link>
            );
          })}
        </nav>

        {result.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {result.status
              ? `No ${CONTACT_MESSAGE_STATUS_LABELS[result.status].toLowerCase()} messages.`
              : "No messages have been sent through the Contact Us page yet."}
          </div>
        ) : (
          <ul className="space-y-4">
            {result.data.map((message) => {
              const status = isContactMessageStatus(message.status) ? message.status : "new";
              return (
                <li
                  key={message.id}
                  data-tour="contact-row" data-tour-record-id={message.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] sm:p-6 sm:pl-7 dark:border-slate-800 dark:bg-slate-900",
                    statusAccentClassName[status],
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold", statusBadgeClassName[status])}>
                            <span aria-hidden="true" className={cn("size-1.5 rounded-full", statusDotClassName[status])} />
                            {CONTACT_MESSAGE_STATUS_LABELS[status]}
                          </span>
                          <time dateTime={message.createdAt.toISOString()} className="text-sm text-slate-600 dark:text-slate-400">
                            {dateFormatter.format(message.createdAt)}
                          </time>
                        </div>
                        <h2 className="break-words text-xl font-semibold leading-snug text-slate-950 dark:text-white">{message.subject}</h2>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                        >
                          {initialsOf(message.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {message.name}
                            <span
                              className={cn(
                                "ml-2 rounded-md px-1.5 py-0.5 align-middle text-xs font-medium",
                                message.userId
                                  ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                              )}
                            >
                              {message.userId ? "Signed-in account" : "Not signed in"}
                            </span>
                          </p>
                          <a
                            data-tour="contact-email"
                            href={sandbox ? "#contact-email-preview" : `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                            onClick={sandbox ? (event) => { event.preventDefault(); setEmailOpen(true); } : undefined}
                            className="inline-flex min-h-11 items-center break-all rounded text-sm font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-sky-300"
                          >
                            {message.email}
                          </a>
                        </div>
                      </div>

                      <blockquote className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
                        {message.message}
                      </blockquote>

                      {status !== "new" && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Updated by {message.handledByName ?? "unknown staff account"}
                          {message.handledAt ? ` on ${dateFormatter.format(message.handledAt)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="w-full shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:w-52 dark:border-slate-800 dark:bg-slate-950/50">
                      <ContactMessageStatusControl key={`${message.id}:${status}`} id={message.id} status={status} />
                    </div>
                  </div>
                  {sandbox && emailOpen ? <section id="contact-email-preview" data-tour="contact-email-preview" data-tour-record-id={message.id} className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800" aria-label="Example email reply">
                    <h3 className="font-semibold">Example email reply</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">In normal use, the email link opens your own email app. This example stays here and sends nothing.</p>
                    <p className="mt-3 text-sm">To: {message.email}<br />Subject: Re: {message.subject}</p>
                    <label htmlFor="tutorial-contact-reply" className="mt-4 block text-sm font-semibold">Your reply</label>
                    <textarea id="tutorial-contact-reply" value={reply} onChange={(event) => setReply(event.target.value)} className="mt-2 min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                    <Button type="button" data-tour="contact-send" disabled={!reply.trim()} className="mt-3 min-h-11" onClick={() => sandbox.apply({ resource: "contact_messages", recordId: message.id, action: "reply", body: reply })}>Preview reply</Button>
                    {sandbox.state.contactReply ? <p role="status" data-tour="contact-email-sent" data-tour-record-id={message.id} className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">Example reply prepared. No email was sent. Update the message status to finish.</p> : null}
                  </section> : null}
                  {!sandbox ? <ContactEmailReply id={message.id} /> : null}
                  {!sandbox && message.responses?.length ? (
                    <section className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800" aria-label="Staff reply history">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Reply history</h3>
                      <ul className="space-y-3">
                        {message.responses.map((response) => (
                          <li key={response.id} className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/30">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {response.responderName || "Staff account"} · {response.status} · {dateFormatter.format(new Date(response.sentAt || response.createdAt))}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900 dark:text-slate-100">{response.body}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {result.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
            {result.page > 1 ? (
              <Link href={buildHref(result.status, result.page - 1)} className={cn(filterLinkClassName, "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900")}>
                Previous
              </Link>
            ) : (
              <span />
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Page {result.page} of {result.totalPages}
            </p>
            {result.page < result.totalPages ? (
              <Link href={buildHref(result.status, result.page + 1)} className={cn(filterLinkClassName, "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900")}>
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </AdminPageWrapper>
  );
}
