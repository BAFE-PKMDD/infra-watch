"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { getFullUrl } from "@/lib/minio-url";
import {
  OperationError,
  operationControl,
  operationDate,
  operationRequest,
} from "./shared";
type Comment = {
  id: string;
  comment: string;
  status: string;
  rejectionReason: string | null;
  autoRejected: boolean;
  revision: number;
  createdAt: string;
  projectName: string;
  projectId: string;
  media: { type: string; url: string }[] | null;
};
export function CommentModeration() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: [
      "comment-moderation",
      user?.id,
      user?.region,
      user?.assignedAgency,
      status,
      search,
      page,
    ],
    enabled: Boolean(user?.id),
    queryFn: () =>
      operationRequest<{ data: Comment[]; total: number }>(
        `/api/admin/comments?${new URLSearchParams({ status, search, page: String(page) })}`,
      ),
  });
  const mutation = useMutation({
    mutationFn: (input: { id: string; revision: number; action: string }) =>
      operationRequest("/api/admin/comments", "PATCH", { ...input, reason }),
    onSuccess: async () => {
      setSelected(null);
      setReason("");
      await client.invalidateQueries({ queryKey: ["comment-moderation"] });
      await client.invalidateQueries({ queryKey: ["feedback-comments"] });
    },
  });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          <span>Review status</span>
          <select
            className={operationControl}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="pending">Awaiting review</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="all">All comments</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Search comment or project</span>
          <input
            type="search"
            className={operationControl}
            value={search}
            maxLength={200}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <OperationError error={query.error || mutation.error} />
      {query.isPending && <p role="status">Loading comments…</p>}
      {query.data?.data.length === 0 && (
        <p className="text-sm">No comments match this review queue.</p>
      )}
      <ul className="divide-y divide-border">
        {query.data?.data.map((comment) => (
          <li key={comment.id} className="space-y-3 py-5">
            <Link
              href={`/projects/${encodeURIComponent(comment.projectId)}`}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline"
            >
              {comment.projectName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {comment.status} · {operationDate(comment.createdAt)}{" "}
              (Asia/Manila)
              {comment.autoRejected ? " · Automated rejection" : ""}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {comment.comment}
            </p>
            {comment.rejectionReason && (
              <p className="text-sm">Review note: {comment.rejectionReason}</p>
            )}
            <div className="flex flex-wrap gap-3">
              {comment.media?.map((media, index) => (
                <a
                  key={index}
                  href={getFullUrl(media.url) || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline"
                >
                  Open {media.type} {index + 1}
                </a>
              ))}
            </div>
            {selected === comment.id ? (
              <div className="space-y-3">
                <label className="block space-y-2 text-sm">
                  <span>Reason for this decision</span>
                  <textarea
                    className={operationControl}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={5}
                    maxLength={1000}
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="min-h-11"
                    disabled={reason.trim().length < 5 || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        id: comment.id,
                        revision: comment.revision,
                        action: "publish",
                      })
                    }
                  >
                    Publish comment
                  </Button>
                  <Button
                    className="min-h-11"
                    variant="destructive"
                    disabled={reason.trim().length < 5 || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        id: comment.id,
                        revision: comment.revision,
                        action: "reject",
                      })
                    }
                  >
                    Reject comment
                  </Button>
                  <Button
                    className="min-h-11"
                    variant="outline"
                    onClick={() => setSelected(null)}
                  >
                    Cancel review
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setSelected(comment.id);
                  setReason("");
                }}
              >
                Review comment
              </Button>
            )}
          </li>
        ))}
      </ul>
      {query.data && (
        <nav
          aria-label="Comment review pages"
          className="flex items-center justify-between gap-4"
        >
          <Button
            variant="outline"
            className="min-h-11"
            disabled={page === 1 || query.isFetching}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} · {query.data.total} comments
          </span>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={page * 20 >= query.data.total || query.isFetching}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
