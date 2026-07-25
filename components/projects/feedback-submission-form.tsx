"use client";

import { useCallback, useRef, useState } from "react";
import { Star, Loader2, X, Video as VideoIcon } from "lucide-react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { dispatchClientNotification } from "@/lib/client-notifications";
import { cn } from "@/lib/utils";
import { getFileUrl } from "@/lib/minio-url";
import { getUploadErrorTitle } from "@/lib/upload-errors";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import type { FeedbackCategory, FeedbackMedia } from "@/types/feedback.types";
import {
  GeoEvidenceUpload,
  type GeoEvidenceReadyItem,
} from "@/components/shared/geo-evidence-upload";

interface FeedbackSubmissionFormProps {
  projectId: string;
  onSuccess?: () => void;
  onBusyChange?: (busy: boolean) => void;
  editMode?: boolean;
  initialData?: {
    id: string;
    rating?: number | null;
    comment: string;
    category: FeedbackCategory;
    isAnonymous: boolean;
    media?: FeedbackMedia[];
  };
}

const categories: { value: FeedbackCategory; label: string }[] = [
  { value: "quality", label: "Project Quality" },
  { value: "progress", label: "Project Progress" },
  { value: "concerns", label: "Concerns & Issues" },
  { value: "general", label: "General Feedback" },
];

interface FeedbackFormData {
  rating?: number;
  comment: string;
  category: FeedbackCategory;
  isAnonymous: boolean;
  media?: FeedbackMedia[];
}

export function FeedbackSubmissionForm({
  projectId,
  onSuccess,
  onBusyChange,
  editMode = false,
  initialData,
}: FeedbackSubmissionFormProps) {
  const [rating, setRating] = useState<number>(initialData?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>(initialData?.category || "general");
  const [comment, setComment] = useState(initialData?.comment || "");
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous || false);
  const [media, setMedia] = useState<FeedbackMedia[]>(initialData?.media || []);
  const [pendingEvidence, setPendingEvidence] = useState<GeoEvidenceReadyItem[]>([]);
  const [evidenceInputKey, setEvidenceInputKey] = useState(0);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(editMode); // Auto-agree in edit mode
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const commitRef = useRef(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload?folder=feedback', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include authentication cookies
      });

      const result = await response.json().catch(() => null) as { error?: string; path?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || `Upload failed (${response.status})`);
      }
      if (!result?.path) throw new Error("The upload completed without a file path.");

      return result as { path: string };
    },
  });

  // Feedback submission mutation
  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const url = editMode && initialData
        ? `/api/projects/${projectId}/feedback/${initialData.id}`
        : `/api/projects/${projectId}/feedback`;

      const method = editMode ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: data.rating || null,
          comment: data.comment.trim(),
          category: data.category,
          isAnonymous: data.isAnonymous,
          media: data.media || [],
        }),
      });

      const result = await response.json().catch(() => null) as { error?: string; data?: { id?: string } } | null;
      if (!response.ok) {
        throw new Error(result?.error || `Failed to ${editMode ? 'update' : 'submit'} feedback`);
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate and refetch feedback
      queryClient.invalidateQueries({ queryKey: ["project-feedback", projectId] });

      // Show success message with approval notice
      if (editMode) {
        toast.success("Feedback updated successfully!");
      } else {
        toast.success("Feedback submitted for review", {
          description: "Your feedback and attachments were saved and will appear once approved.",
        });
        dispatchClientNotification({
          type: "feedback_submitted",
          title: "Feedback submitted",
          message: "Your feedback was submitted for moderator review.",
          metadata: {
            feedbackId: result?.data?.id,
            projectId,
          },
        });
      }

      // Reset form
      setRating(0);
      setComment("");
      setCategory("general");
      setIsAnonymous(false);
      setMedia([]);
      setPendingEvidence([]);
      setEvidenceInputKey((key) => key + 1);
      setAgreeToTerms(false);
      setValidationErrors({});

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      setValidationErrors({ submit: error.message });
    },
  });

  const handleEvidenceReady = useCallback((items: GeoEvidenceReadyItem[]) => {
    setPendingEvidence(items);
  }, []);

  const handleEvidenceProcessingChange = useCallback((processing: boolean) => {
    setIsProcessingMedia(processing);
  }, []);

  const removeMedia = (index: number) => {
    setMedia((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commitRef.current) return;

    // Clear previous errors
    setValidationErrors({});

    // Validation
    const errors: Record<string, string> = {};

    if (!comment.trim()) {
      errors.comment = "Please provide your feedback";
    }

    if (!agreeToTerms) {
      errors.agreement = "You must agree to the Terms of Service and Privacy Policy";
    }

    if (isProcessingMedia) {
      errors.media = "Please wait while the location metadata is being processed.";
    }

    if (media.length + pendingEvidence.length > 5) {
      errors.media = "Maximum 5 media files allowed.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    commitRef.current = true;
    setIsCommitting(true);
    onBusyChange?.(true);

    try {
      let uploadedMedia = media;
      for (const [index, item] of pendingEvidence.entries()) {
        try {
          const result = await uploadMutation.mutateAsync(item.file);
          uploadedMedia = [...uploadedMedia, {
            type: item.type,
            url: result.path,
            ...(typeof item.lat === "number" && typeof item.lon === "number"
              ? { lat: item.lat, lon: item.lon }
              : {}),
            ...(typeof item.accuracy === "number" ? { accuracy: item.accuracy } : {}),
            ...(item.type === "video" && item.track && item.track.length > 0
              ? { track: item.track }
              : {}),
          }];
        } catch (error) {
          const message = error instanceof Error
            ? error.message
            : "Upload blocked. Please choose a valid image or video.";
          setMedia(uploadedMedia);
          setPendingEvidence(pendingEvidence.slice(index));
          setEvidenceInputKey((key) => key + 1);
          setValidationErrors({ media: message });
          toast.error(getUploadErrorTitle(message), {
            description: message,
            duration: 6500,
          });
          return;
        }
      }

      if (pendingEvidence.length > 0) {
        setMedia(uploadedMedia);
        setPendingEvidence([]);
        setEvidenceInputKey((key) => key + 1);
      }

      // Submit feedback after every local capture has a durable object URL.
      try {
        await submitMutation.mutateAsync({
          rating: rating || undefined,
          comment,
          category,
          isAnonymous,
          media: uploadedMedia,
        });
      } catch {
        // The mutation's onError callback renders the server message in the form.
      }
    } finally {
      commitRef.current = false;
      setIsCommitting(false);
      onBusyChange?.(false);
    }
  };

  const isSubmitting = isCommitting || submitMutation.isPending;
  const isUploading = uploadMutation.isPending || isProcessingMedia;
  const formBusy = isSubmitting || isUploading;
  const characterCount = comment.length;
  const maxCharacters = 1000;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category */}
      <Field>
        <FieldLabel htmlFor="category">Category *</FieldLabel>
        <Select
          value={category}
          disabled={formBusy}
          onValueChange={(value) => setCategory(value as FeedbackCategory)}
        >
          <SelectTrigger id="category" className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Comment */}
      <Field>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel htmlFor="comment">Your Feedback *</FieldLabel>
          <span className={cn(
            "text-xs transition-colors",
            characterCount > maxCharacters
              ? "text-red-500 dark:text-red-400 font-medium"
              : "text-slate-400 dark:text-slate-500"
          )}>
            {characterCount}/{maxCharacters}
          </span>
        </div>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (validationErrors.comment) {
              setValidationErrors((current) => {
                const next = { ...current };
                delete next.comment;
                return next;
              });
            }
          }}
          placeholder="Share your thoughts about this project..."
          rows={5}
          maxLength={maxCharacters}
          className="resize-none"
          disabled={formBusy}
        />
        <FieldError errors={validationErrors.comment} />
      </Field>

      {/* Media Upload */}
      <Field>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <FieldLabel>Evidence attachments (Optional)</FieldLabel>
            <FieldDescription className="mt-1">
              Upload existing media or capture a new geotagged photo or GeoVideo.
            </FieldDescription>
          </div>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-500">
            {media.length + pendingEvidence.length}/5
          </span>
        </div>

        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
            {media.map((item, index) => (
              <div key={index} className="relative group">
                <div className="relative w-full aspect-square border-2 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 hover:border-green-500 dark:hover:border-green-500 transition-colors">
                  {item.type === 'image' ? (
                    <Image
                      src={getFileUrl(item.url)}
                      alt=""
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={getFileUrl(item.url)}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        controls
                        muted
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <VideoIcon className="w-6 h-6 text-slate-700" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  disabled={formBusy}
                  className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Remove media"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <GeoEvidenceUpload
          key={evidenceInputKey}
          compact
          initialItems={pendingEvidence}
          maxFiles={Math.max(5 - media.length, 0)}
          disabled={formBusy}
          onEvidenceReady={handleEvidenceReady}
          onProcessingChange={handleEvidenceProcessingChange}
        />
        {uploadMutation.isPending ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Uploading evidence securely&hellip;
          </div>
        ) : null}
        <FieldError errors={validationErrors.media} />
      </Field>

      {/* Rating */}
      <Field>
        <FieldLabel>Rating (Optional)</FieldLabel>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star === rating ? 0 : star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={formBusy}
              className="rounded transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  "w-8 h-8 transition-colors",
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-300 dark:text-slate-600 hover:text-slate-400"
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
              {rating} star{rating > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </Field>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700" />

      {/* Agreement Checkbox */}
      <Field>
        <div className="flex items-start gap-3">
          <Checkbox
            id="agreement"
            checked={agreeToTerms}
            disabled={formBusy}
            onCheckedChange={(checked) => {
              setAgreeToTerms(checked as boolean);
              if (checked && validationErrors.agreement) {
                setValidationErrors((current) => {
                  const next = { ...current };
                  delete next.agreement;
                  return next;
                });
              }
            }}
            className="mt-0.5"
          />
          <div className="flex-1">
            <FieldLabel
              htmlFor="agreement"
              className="cursor-pointer font-normal text-sm"
            >
              {t("reportIssue.form.fields.agreeToTermsPrefix")}
              <Link
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t("footer.terms")}
              </Link>
              {t("reportIssue.form.fields.andConnector")}
              <Link
                href="/data-privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t("footer.privacy")}
              </Link>
              {" "}when submitting this feedback
            </FieldLabel>
          </div>
        </div>
        <FieldError errors={validationErrors.agreement} />
      </Field>

      {/* Anonymous Checkbox */}
      <Field>
        <div className="flex items-start gap-3">
          <Checkbox
            id="anonymous"
            checked={isAnonymous}
            disabled={formBusy}
            onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <FieldLabel
              htmlFor="anonymous"
              className="cursor-pointer font-normal text-sm"
            >
              Submit as Anonymous
            </FieldLabel>
            <FieldDescription className="mt-1">
              Your identity will be hidden from other users
            </FieldDescription>
          </div>
        </div>
      </Field>

      {/* General Error */}
      {validationErrors.submit && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <X className="w-3 h-3 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{validationErrors.submit}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={formBusy || !comment.trim() || !agreeToTerms || characterCount > maxCharacters}
        className="w-full h-11 text-base font-medium"
        size="lg"
      >
        {formBusy ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving Feedback...
          </>
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </form>
  );
}
