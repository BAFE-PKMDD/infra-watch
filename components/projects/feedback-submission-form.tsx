"use client";

import { useState, useRef } from "react";
import { Star, Loader2, Upload, X, Video as VideoIcon } from "lucide-react";
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
import { isAllowedClientUploadType, UPLOAD_ACCEPT, uploadKindFromType } from "@/lib/upload-policy";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import type { FeedbackCategory, FeedbackMedia } from "@/types/feedback.types";

interface FeedbackSubmissionFormProps {
  projectId: string;
  onSuccess?: () => void;
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
  editMode = false,
  initialData,
}: FeedbackSubmissionFormProps) {
  const [rating, setRating] = useState<number>(initialData?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>(initialData?.category || "general");
  const [comment, setComment] = useState(initialData?.comment || "");
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous || false);
  const [media, setMedia] = useState<FeedbackMedia[]>(initialData?.media || []);
  const [agreeToTerms, setAgreeToTerms] = useState(editMode); // Auto-agree in edit mode
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      return response.json();
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editMode ? 'update' : 'submit'} feedback`);
      }

      return response.json();
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (media.length + files.length > 5) {
      setValidationErrors({ media: `Maximum 5 media files allowed. You can add ${5 - media.length} more.` });
      return;
    }

    const uploadedMedia: FeedbackMedia[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = uploadKindFromType(file.type);

      if (!fileType || !isAllowedClientUploadType(file.type)) {
        setValidationErrors({ media: `File "${file.name}" is not an image or video` });
        continue;
      }

      // Validate file size (5MB for images, 50MB for videos)
      const maxSize = fileType === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeMB = fileType === 'video' ? '50MB' : '5MB';
        setValidationErrors({ media: `${fileType === 'video' ? 'Video' : 'Image'} "${file.name}" exceeds ${maxSizeMB} limit` });
        continue;
      }

      try {
        const result = await uploadMutation.mutateAsync(file);
        uploadedMedia.push({
          type: fileType,
          url: result.path,
        });
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : "Upload blocked. Please choose a valid image or video.";
        setValidationErrors({ media: message });
        toast.error(getUploadErrorTitle(message), {
          description: message,
          duration: 6500,
        });
        break;
      }
    }

    if (uploadedMedia.length > 0) {
      setMedia((current) => [...current, ...uploadedMedia]);
      const { media: _, ...rest } = validationErrors;
      setValidationErrors(rest);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Submit feedback
    submitMutation.mutate({
      rating: rating || undefined,
      comment,
      category,
      isAnonymous,
      media,
    });
  };

  const isSubmitting = submitMutation.isPending;
  const isUploading = uploadMutation.isPending;
  const characterCount = comment.length;
  const maxCharacters = 1000;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category */}
      <Field>
        <FieldLabel htmlFor="category">Category *</FieldLabel>
        <Select value={category} onValueChange={(value) => setCategory(value as FeedbackCategory)}>
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
              const { comment: _, ...rest } = validationErrors;
              setValidationErrors(rest);
            }
          }}
          placeholder="Share your thoughts about this project..."
          rows={5}
          maxLength={maxCharacters}
          className="resize-none"
          disabled={isSubmitting}
        />
        <FieldError errors={validationErrors.comment} />
      </Field>

      {/* Media Upload */}
      <Field>
        <FieldLabel>Attach Images or Videos (Optional)</FieldLabel>

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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
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
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                  aria-label="Remove media"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
            isUploading
              ? "border-green-300 bg-green-50 dark:bg-green-950/20 cursor-not-allowed"
              : "border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-1">
                <Upload className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload images or videos</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PNG, JPG, WebP, GIF (max 5MB) • MP4, MOV, WebM (max 50MB)
              </p>
            </div>
          )}
        </div>
        <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
        disabled={isUploading}
      />
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
              className="transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded"
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
            onCheckedChange={(checked) => {
              setAgreeToTerms(checked as boolean);
              if (checked && validationErrors.agreement) {
                const { agreement: _, ...rest } = validationErrors;
                setValidationErrors(rest);
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
        disabled={isSubmitting || isUploading || !comment.trim() || !agreeToTerms || characterCount > maxCharacters}
        className="w-full h-11 text-base font-medium"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Submitting Feedback...
          </>
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </form>
  );
}
