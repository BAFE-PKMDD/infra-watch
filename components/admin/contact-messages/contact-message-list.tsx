"use client";

import { useState } from "react";
import Link from "next/link";

import type { getContactMessages } from "@/actions/query/contact-messages.query";
import { TutorialModeNotice, useTutorialSandbox } from "@/components/admin/tour/tutorial-sandbox";
import { Button } from "@/components/ui/button";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ContactMessageStatusControl } from "@/components/admin/contact-messages/contact-message-status-control";
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

const filterLinkClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

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
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = filter.status === result.status;
            return (
              <Link
                key={filter.label}
                href={buildHref(filter.status)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  filterLinkClassName,
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                )}
              >
                {filter.label}
                <span className="tabular-nums">{filter.total.toLocaleString("en-PH")}</span>
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
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-md border px-2 py-0.5 text-sm font-semibold", statusBadgeClassName[status])}>
                          {CONTACT_MESSAGE_STATUS_LABELS[status]}
                        </span>
                        <time dateTime={message.createdAt.toISOString()} className="text-sm text-slate-600 dark:text-slate-400">
                          {dateFormatter.format(message.createdAt)}
                        </time>
                      </div>
                      <h2 className="break-words text-lg font-semibold text-slate-950 dark:text-white">{message.subject}</h2>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {message.name}
                        {" · "}
                        <a
                          data-tour="contact-email"
                          href={sandbox ? "#contact-email-preview" : `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                          onClick={sandbox ? (event) => { event.preventDefault(); setEmailOpen(true); } : undefined}
                          className="inline-flex min-h-11 items-center font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded dark:text-sky-300"
                        >
                          {message.email}
                        </a>
                        {message.userId ? " · Signed-in account" : " · Not signed in"}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-200">{message.message}</p>
                      {status !== "new" && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Updated by {message.handledByName ?? "unknown staff account"}
                          {message.handledAt ? ` on ${dateFormatter.format(message.handledAt)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="w-full shrink-0 lg:w-48">
                      <ContactMessageStatusControl id={message.id} status={status} />
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
