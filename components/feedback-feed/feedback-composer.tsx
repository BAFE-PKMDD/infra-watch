"use client";

import { useState, useRef } from "react";
import {
  Star,
  ImagePlus,
  Loader2,
  X,
  Send,
  EyeOff,
  Video as VideoIcon,
  LogIn,
  MessageCircle,
  HardHat,
  BarChart3,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { dispatchClientNotification } from "@/lib/client-notifications";
import { getFileUrl } from "@/lib/minio-url";
import { getUploadErrorTitle } from "@/lib/upload-errors";
import { isAllowedClientUploadType, UPLOAD_ACCEPT, uploadKindFromType } from "@/lib/upload-policy";
import { ProjectSearchInput, type SelectedProject } from "@/components/ui/project-search-input";
import type { FeedbackCategory, FeedbackMedia } from "@/types/feedback.types";

const CATEGORIES: { value: FeedbackCategory; label: string; icon: LucideIcon }[] = [
  { value: "general", label: "General", icon: MessageCircle },
  { value: "quality", label: "Quality", icon: HardHat },
  { value: "progress", label: "Progress", icon: BarChart3 },
  { value: "concerns", label: "Concerns", icon: AlertTriangle },
];

const MAX_MEDIA = 5;
const MAX_CHARACTERS = 2000;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FeedbackComposer() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();


  const composerRef = useRef<HTMLDivElement>(null);

  // Project selection
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);

  // Form fields
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [media, setMedia] = useState<FeedbackMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload?folder=feedback", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
  });

  // Feedback submit mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: {
      projectId: string;
      comment: string;
      category: FeedbackCategory;
      rating?: number;
      isAnonymous: boolean;
      media: FeedbackMedia[];
    }) => {
      const res = await fetch(`/api/projects/${payload.projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: payload.rating || null,
          comment: payload.comment.trim(),
          category: payload.category,
          isAnonymous: payload.isAnonymous,
          media: payload.media,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit feedback");
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success("Feedback submitted!", {
        description: "Your feedback is pending review and will appear once approved.",
      });
      dispatchClientNotification({
        type: "feedback_submitted",
        title: "Feedback submitted",
        message: "Your feedback was submitted for moderator review.",
        metadata: {
          feedbackId: result?.data?.id,
          projectId: selectedProject?.sourceId || selectedProject?.id,
        },
      });
      // Reset form
      resetForm();
      // Refresh the feed
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
    onError: (error: Error) => {
      toast.error("Submission failed", { description: error.message });
    },
  });

  const resetForm = () => {
    setComment("");
    setCategory("general");
    setRating(0);
    setIsAnonymous(false);
    setMedia([]);
    setSelectedProject(null);
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (media.length + files.length > MAX_MEDIA) {
      toast.error(`Maximum ${MAX_MEDIA} files allowed`);
      return;
    }

    const uploaded: FeedbackMedia[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = uploadKindFromType(file.type);

      if (!fileType || !isAllowedClientUploadType(file.type)) {
        toast.error(`"${file.name}" is not a supported file type`);
        continue;
      }

      const maxSize = fileType === "video" ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`"${file.name}" exceeds ${fileType === "video" ? "50MB" : "5MB"} limit`);
        continue;
      }

      try {
        const result = await uploadMutation.mutateAsync(file);
        uploaded.push({ type: fileType, url: result.path });
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Upload blocked. Please choose a valid image or video.";
        toast.error(getUploadErrorTitle(message), {
          description: message,
          duration: 6500,
        });
        break;
      }
    }

    if (uploaded.length > 0) {
      setMedia((prev) => [...prev, ...uploaded]);
    }
  };

  // Submit handler
  const handleSubmit = () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please write your feedback");
      return;
    }

    submitMutation.mutate({
      projectId: selectedProject.sourceId || selectedProject.id,
      comment,
      category,
      rating: rating || undefined,
      isAnonymous,
      media,
    });
  };

  const isSubmitting = submitMutation.isPending;
  const isUploading = uploadMutation.isPending;
  const canSubmit = !!selectedProject && comment.trim().length > 0 && !isSubmitting && !isUploading;

  // Non-authenticated prompt
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 p-4 sm:p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#13233c]/60 flex items-center justify-center flex-shrink-0">
            <LogIn className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <Link
            href="/sign-in"
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 dark:bg-[#13233c]/60 text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-[#13233c]/80 transition-colors cursor-pointer"
          >
            Sign in to share your feedback on a project...
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (authLoading) return null;

  return (
    <div
      ref={composerRef}
      className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 overflow-hidden mb-6 transition-shadow hover:shadow-md"
    >
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name || "You"}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-[10px] font-bold">
                {getInitials(user?.name || "U")}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {isAnonymous ? "Anonymous" : user?.name || "You"}
            </p>
            <p className="text-[11px] text-slate-400">Sharing feedback</p>
          </div>
        </div>

        {/* Project Search */}
        <div className="mb-3">
          <ProjectSearchInput
            value={selectedProject}
            onSelect={setSelectedProject}
            onClear={() => setSelectedProject(null)}
            placeholder="Search for a project..."
            variant="compact"
          />
        </div>

        {/* Textarea */}
        <div className="relative mb-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What would you like to share about this project?"
            rows={2}
            maxLength={MAX_CHARACTERS}
            className="w-full px-0 py-2 bg-transparent text-sm sm:text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed border-0"
            disabled={isSubmitting}
          />
          {comment.length > 0 && (
            <span className={`absolute bottom-1 right-0 text-[11px] ${comment.length > MAX_CHARACTERS * 0.9 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}`}>
              {comment.length}/{MAX_CHARACTERS}
            </span>
          )}
        </div>

        {/* Media previews */}
        {media.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {media.map((item, index) => (
              <div key={index} className="relative group aspect-square">
                <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200 dark:border-[#1e3a5f]/30 bg-slate-50 dark:bg-[#13233c]/40">
                  {item.type === "image" ? (
                    <Image
                      src={getFileUrl(item.url)}
                      alt=""
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                      <VideoIcon className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMedia((prev) => prev.filter((_, i) => i !== index))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-[#1e3a5f]/20 pt-3" />

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left actions */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {/* Category pills */}
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${category === cat.value
                  ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 ring-1 ring-sky-300 dark:ring-sky-700"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#13233c]/60"
                  }`}
              >
                <cat.icon className="w-3.5 h-3.5 mr-1 inline" /> {cat.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="flex items-center gap-1.5">
              {/* Star rating (compact) */}
              <div className="flex items-center mr-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0 focus:outline-none transition-transform hover:scale-110"
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`w-4 h-4 transition-colors ${star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                        }`}
                    />
                  </button>
                ))}
              </div>

              {/* Media upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || media.length >= MAX_MEDIA}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Attach media (${media.length}/${MAX_MEDIA})`}
              >
                {isUploading ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-4.5 h-4.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={UPLOAD_ACCEPT}
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={isUploading}
              />

              {/* Anonymous toggle */}
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`p-1.5 rounded-lg transition-colors ${isAnonymous
                  ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#13233c]/60"
                  }`}
                title={isAnonymous ? "Posting anonymously" : "Post as yourself"}
              >
                <EyeOff className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-600 shadow-sm hover:shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
