"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Video, X, Loader2 } from "lucide-react";
import { createFeedbackComment } from "@/actions/mutation/feedback-comment.mutation";
import { useAuth } from "@/providers/auth-provider";
import Image from "next/image";
import { toast } from "sonner";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { getUploadErrorText } from "@/lib/upload-errors";
import { isAllowedClientUploadType } from "@/lib/upload-policy";
import { getAnonymousUser } from "@/lib/anonymous-identifier";
import { AnonymousIcon } from "@/components/shared/anonymous-avatar";
import { useTranslation } from "@/i18n";

interface FeedbackCommentFormProps {
  feedbackId: string;
  onCommentAdded?: () => void;
  replyToName?: string;
  isReply?: boolean;
  onCancelReply?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FeedbackCommentForm({
  feedbackId,
  onCommentAdded,
  replyToName,
  isReply = false,
  onCancelReply,
  placeholder,
  autoFocus = false,
}: FeedbackCommentFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [media, setMedia] = useState<Array<{ type: "image" | "video"; url: string; caption?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleFileUpload = async (files: FileList | null, type: "image" | "video") => {
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!isAllowedClientUploadType(file.type) || !file.type.startsWith(`${type}/`)) {
          throw new Error(t("site.comments.notAllowedFile", {
            name: file.name,
            type: t(`site.comments.fileKind.${type}`),
          }));
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload?folder=feedback-comment", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || t("site.comments.uploadFailed"));
        }

        const data = await response.json();
        return {
          type,
          url: data.path,
        };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setMedia((prev) => [...prev, ...uploadedMedia]);
    } catch (error) {
      console.error("Error uploading files:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("site.comments.uploadBlocked");
      const { title, description } = getUploadErrorText(message, t);
      toast.error(title, {
        description,
        duration: 6500,
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setComment(target.value);
    requestAnimationFrame(() => {
      target.style.height = "auto";
      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t("site.comments.signInToComment"));
      return;
    }

    const trimmedComment = comment.trim();
    if (!trimmedComment && media.length === 0) {
      return;
    }

    // If this is a reply to someone and the text doesn't already start with @, mention them
    const finalComment =
      isReply && replyToName && !trimmedComment.startsWith("@")
        ? `@${replyToName} ${trimmedComment}`
        : trimmedComment;

    setIsSubmitting(true);
    try {
      const result = await createFeedbackComment({
        feedbackId,
        comment: finalComment,
        media,
      });

      if (!result.success) {
        toast.error(t("site.comments.blocked"), {
          description: result.message,
          duration: 6500,
        });
        return;
      }

      setComment("");
      setMedia([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      onCommentAdded?.();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(t("site.comments.postFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-[#f0f2f5] dark:bg-[#242526] rounded-xl p-3 text-center border border-slate-200/80 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("site.comments.signInToJoin")}
        </p>
      </div>
    );
  }

  // Determine avatar representation
  const isAnonymous = !user.name || user.name === "Citizen" || user.name === "Anonymous";
  const anonUser = isAnonymous ? getAnonymousUser(user.id || "current-user") : null;
  const avatarSize = isReply ? 28 : 32;

  return (
    <div className={`flex items-start gap-2.5 ${isReply ? "w-full" : ""}`}>
      {/* User Avatar */}
      <div
        className={`${
          isReply ? "w-7 h-7" : "w-8 h-8"
        } rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${
          anonUser
            ? `${anonUser.gradient} ring-2 ${anonUser.ringColor}`
            : "bg-gradient-to-br from-blue-600 to-indigo-700"
        } text-white font-bold text-[10px] shadow-2xs`}
      >
        {user.image && getFullUrl(user.image) ? (
          <Image
            src={getFullUrl(user.image)!}
            alt={user.name || t("site.comments.you")}
            width={avatarSize}
            height={avatarSize}
            className="w-full h-full object-cover rounded-full"
            unoptimized={isLocalMinIO(getFullUrl(user.image)!)}
          />
        ) : anonUser ? (
          <AnonymousIcon
            name={anonUser.iconName}
            className={`${isReply ? "w-3.5 h-3.5" : "w-4 h-4"} text-white drop-shadow-xs`}
          />
        ) : (
          <span>{getInitials(user.name || t("site.comments.you"))}</span>
        )}
      </div>

      {/* Main Comment Input Pill Form */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0">
        {/* Reply To Banner */}
        {isReply && replyToName && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1 px-1 font-medium">
            <span>
              {t("site.comments.replyingTo")} <span className="text-[#1877F2] dark:text-[#2d88ff] font-semibold">@{replyToName}</span>
            </span>
            {onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {t("site.comments.cancel")}
              </button>
            )}
          </div>
        )}

        <div className="bg-[#f0f2f5] dark:bg-[#242526] hover:bg-[#eaecee] dark:hover:bg-[#2a2b2c] focus-within:bg-white dark:focus-within:bg-[#1c1d1e] focus-within:ring-2 focus-within:ring-[#1877F2]/40 rounded-[20px] px-3.5 py-2 transition-all border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={handleTextChange}
            placeholder={
              placeholder ||
              (isReply ? t("site.comments.writeReply") : t("site.comments.writeComment"))
            }
            rows={1}
            className="w-full bg-transparent border-0 text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed min-h-[22px] max-h-[120px]"
            disabled={isSubmitting || uploadingFiles}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if ((comment.trim() || media.length > 0) && !isSubmitting && !uploadingFiles) {
                  handleSubmit(e);
                }
              }
            }}
          />

          {/* Media Previews */}
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 my-2">
              {media.map((item, index) => {
                const mediaUrl = getFullUrl(item.url);
                return (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    {item.type === "image" && mediaUrl ? (
                      <Image
                        src={mediaUrl}
                        alt={t("site.comments.attachmentAlt", { number: index + 1 })}
                        fill
                        sizes="100px"
                        className="object-cover"
                        unoptimized={isLocalMinIO(mediaUrl)}
                      />
                    ) : item.type === "video" && mediaUrl ? (
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                      aria-label={t("site.comments.removeMedia")}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pill Action Bar: Media Attachments & Send */}
          <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-0.5">
              {/* Image Upload */}
              <label
                className="cursor-pointer p-1.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-[#1877F2] dark:hover:text-[#2d88ff] transition-colors"
                title={t("site.comments.attachPhoto")}
              >
                <ImageIcon className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files, "image")}
                  className="hidden"
                  disabled={isSubmitting || uploadingFiles}
                />
              </label>

              {/* Video Upload */}
              <label
                className="cursor-pointer p-1.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-[#1877F2] dark:hover:text-[#2d88ff] transition-colors"
                title={t("site.comments.attachVideo")}
              >
                <Video className="w-4 h-4" />
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files, "video")}
                  className="hidden"
                  disabled={isSubmitting || uploadingFiles}
                />
              </label>

              {uploadingFiles && (
                <span className="text-[10px] text-slate-400 animate-pulse ml-1">
                  {t("site.comments.uploading")}
                </span>
              )}
            </div>

            {/* Circular Facebook-blue Send Button */}
            <div className="flex items-center gap-1.5">
              {isReply && onCancelReply && (
                <button
                  type="button"
                  onClick={onCancelReply}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded cursor-pointer"
                >
                  {t("site.comments.cancel")}
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || uploadingFiles || (!comment.trim() && media.length === 0)}
                className="w-7 h-7 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xs active:scale-95 cursor-pointer"
                title={t("site.comments.post")}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
