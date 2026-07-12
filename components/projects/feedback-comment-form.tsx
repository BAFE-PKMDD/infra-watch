"use client";

import { useState } from "react";
import { Send, Image as ImageIcon, Video, X } from "lucide-react";
import { createFeedbackComment } from "@/actions/mutation/feedback-comment.mutation";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { toast } from "sonner";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { getUploadErrorTitle } from "@/lib/upload-errors";
import { isAllowedClientUploadType } from "@/lib/upload-policy";

interface FeedbackCommentFormProps {
  feedbackId: string;
  onCommentAdded?: () => void;
}

export function FeedbackCommentForm({ feedbackId, onCommentAdded }: FeedbackCommentFormProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [media, setMedia] = useState<Array<{ type: 'image' | 'video'; url: string; caption?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleFileUpload = async (files: FileList | null, type: 'image' | 'video') => {
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!isAllowedClientUploadType(file.type) || !file.type.startsWith(`${type}/`)) {
          throw new Error(`"${file.name}" is not an allowed ${type} file.`);
        }

        const formData = new FormData();
        formData.append("file", file);

        // Upload to feedback-comment folder
        const response = await fetch("/api/upload?folder=feedback-comment", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to upload file");
        }

        const data = await response.json();
        return {
          type,
          url: data.path, // API returns 'path', not 'url'
        };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setMedia((prev) => [...prev, ...uploadedMedia]);
    } catch (error) {
      console.error("Error uploading files:", error);
      const message = error instanceof Error
        ? error.message
        : "Upload blocked. Please choose a valid image or video.";
      toast.error(getUploadErrorTitle(message), {
        description: message,
        duration: 6500,
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("You must be logged in to comment");
      return;
    }

    if (!comment.trim()) {
      alert("Please enter a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createFeedbackComment({
        feedbackId,
        comment,
        media,
      });

      if (!result.success) {
        toast.error("Comment blocked", {
          description: result.message,
          duration: 6500,
        });
        return;
      }

      // Reset form
      setComment("");
      setMedia([]);

      // Notify parent component
      onCommentAdded?.();
    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-center border border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Please log in to post a comment
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
      {/* Comment Input */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a comment..."
        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
        rows={2}
        disabled={isSubmitting || uploadingFiles}
      />

      {/* Media Preview */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {media.map((item, index) => {
            const mediaUrl = getFullUrl(item.url);
            return (
              <div key={index} className="relative aspect-square rounded overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {item.type === 'image' && mediaUrl ? (
                  <Image
                    src={mediaUrl}
                    alt={`Upload ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized={isLocalMinIO(mediaUrl)}
                  />
                ) : item.type === 'video' && mediaUrl ? (
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                  aria-label="Remove media"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          {/* Image Upload */}
          <label className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ImageIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => handleFileUpload(e.target.files, 'image')}
              className="hidden"
              disabled={isSubmitting || uploadingFiles}
            />
          </label>

          {/* Video Upload */}
          <label className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Video className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              multiple
              onChange={(e) => handleFileUpload(e.target.files, 'video')}
              className="hidden"
              disabled={isSubmitting || uploadingFiles}
            />
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || uploadingFiles || !comment.trim()}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed h-7 px-3 text-xs"
        >
          <Send className="w-3 h-3" />
          <span>{isSubmitting ? "Posting..." : "Comment"}</span>
        </Button>
      </div>

      {uploadingFiles && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
          Uploading files...
        </p>
      )}
    </form>
  );
}
