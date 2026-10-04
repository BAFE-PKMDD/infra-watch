"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeedbackComments } from "@/actions/query/feedback-comments.query";
import { FeedbackCommentForm } from "@/components/projects/feedback-comment-form";
import { useTutorialSandbox } from "@/components/admin/tour/tutorial-sandbox";
import { isTutorialRecord } from "@/lib/tours/sandbox";
import { getFullUrl } from "@/lib/minio-url";

export function FeedbackResponses({ feedbackId }: { feedbackId: string }) {
  const sandbox = useTutorialSandbox();
  const expired = !sandbox && isTutorialRecord(feedbackId);
  const replies = useQuery({
    queryKey: ["admin-feedback-responses", feedbackId],
    queryFn: () => getFeedbackComments(feedbackId),
    enabled: !sandbox && !expired,
  });
  const comments = sandbox ? sandbox.state.feedbackComments : replies.data?.data ?? [];
  if (expired) return <p className="text-sm">This guide has ended. Open it again from Response guides.</p>;

  return <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800" aria-labelledby="feedback-responses-heading">
    <h3 id="feedback-responses-heading" className="font-heading text-lg font-semibold">Respond to feedback</h3>
    <p className="text-sm text-slate-600 dark:text-slate-300">{sandbox ? "Practice a reply using the comment form. Attachments are skipped and no comment or notification will be sent." : "Reply in the feedback conversation. Your comment appears on the public feedback and may notify its subscribers."}</p>
    <FeedbackCommentForm key={`${sandbox?.state.id ?? "live"}:${feedbackId}`} feedbackId={feedbackId} adminReply onCommentAdded={() => { void replies.refetch(); }} />
    <div data-tour="feedback-reply-history" aria-live="polite" className="space-y-3">
      <h4 className="text-sm font-semibold">Conversation ({comments.length})</h4>
      {!sandbox && replies.isPending ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading replies…</p> : null}
      {!sandbox && replies.isError ? <div className="text-sm"><p>Replies are unavailable.</p><button type="button" className="min-h-11 rounded-md px-2 font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { void replies.refetch(); }}>Retry</button></div> : null}
      {(sandbox || replies.isSuccess) && comments.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">No replies yet.</p> : null}
      {comments.map((comment) => <article key={comment.id} className="border-l-2 border-slate-200 pl-3 dark:border-slate-700">
        <p className="text-sm font-semibold">{comment.user.name || "Citizen"}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{comment.comment}</p>
        {comment.media?.map((item, index) => {
          const href = getFullUrl(item.url);
          return href && /^https?:\/\//i.test(href) ? <a key={`${item.url}:${index}`} href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center pr-3 text-sm font-semibold text-primary underline">View {item.type === "video" ? "video" : "image"} {index + 1}</a> : null;
        })}
      </article>)}
    </div>
  </section>;
}
