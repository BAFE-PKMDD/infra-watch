"use client";
import { useCitizenGuide } from "@/components/citizen/tour/citizen-guide-context";
import { CITIZEN_PROJECT_ID, simulateCitizenSubmission } from "@/lib/tours/citizen";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ClipboardCheck,
  HardHat,
  Loader2,
  MessageCircle,
  MessageSquare,
  Pencil,
  ShieldCheck,
  Smile,
  Star,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Video as VideoIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
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
import type { FeedbackCategory, FeedbackMedia, FeedbackSentiment } from "@/types/feedback.types";
import {
  GeoEvidenceUpload,
  type GeoEvidenceReadyItem,
} from "@/components/shared/geo-evidence-upload";
import { SubmissionSurveyModal } from "@/components/shared/submission-survey-modal";
import { useSubmissionSurveyGate } from "@/hooks/use-submission-survey-gate";
import { IssueTypePicker } from "@/components/report-issue/issue-type-picker";
import { parseIssueTypeValue } from "@/lib/abemis/issue-type-map";

interface FeedbackSubmissionFormProps {
  projectId: string;
  /** The project's Farm Operation category (e.g. "Irrigation System"), used only to
   * promote the most relevant issue types to the top of the picker. Optional - an
   * empty value just falls back to the common, infrastructure-agnostic issue types. */
  farmOperation?: string | null;
  onSuccess?: (result?: { data?: { id?: string } }) => void;
  onBusyChange?: (busy: boolean) => void;

  editMode?: boolean;
  initialData?: {
    id: string;
    rating?: number | null;
    comment: string;
    category: FeedbackCategory;
    sentiment?: FeedbackSentiment | null;
    issueType?: string | null;
    isAnonymous: boolean;
    media?: FeedbackMedia[];
  };
}

type StepId = "sentiment" | "category" | "details" | "consent" | "review";

type StepDefinition = {
  id: StepId;
  label: string;
  icon: LucideIcon;
};

const steps: Array<Omit<StepDefinition, "label">> = [
  { id: "sentiment", icon: Smile },
  { id: "category", icon: Tag },
  { id: "details", icon: MessageSquare },
  { id: "consent", icon: ShieldCheck },
  { id: "review", icon: ClipboardCheck },
];

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

// A viewer who prefers reduced motion still gets a state change, just without the slide.
const reducedStepVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

type CategoryOption = { value: FeedbackCategory; label: string; icon: LucideIcon; description: string };

// Labels and descriptions live under projectDetail.feedbackForm.categories.<value>.
const categoryOptions: Array<Pick<CategoryOption, "value" | "icon">> = [
  { value: "quality", icon: HardHat },
  { value: "progress", icon: BarChart3 },
  { value: "concerns", icon: AlertTriangle },
  { value: "general", icon: MessageCircle },
];

// Sentiment never hides or blocks a category - it only decides which cards lead,
// the same way the e-report issue picker promotes types by farm operation.
function getCategoryOrder(sentiment: FeedbackSentiment | null): FeedbackCategory[] {
  if (sentiment === "negative") return ["concerns", "quality", "progress", "general"];
  if (sentiment === "positive") return ["quality", "progress", "general", "concerns"];
  return ["quality", "progress", "concerns", "general"];
}

function getRecommendedCategories(sentiment: FeedbackSentiment | null): Set<FeedbackCategory> {
  if (sentiment === "negative") return new Set<FeedbackCategory>(["concerns"]);
  if (sentiment === "positive") return new Set<FeedbackCategory>(["quality", "progress"]);
  return new Set<FeedbackCategory>();
}

interface FeedbackFormData {
  rating?: number;
  comment: string;
  category: FeedbackCategory;
  sentiment?: FeedbackSentiment | null;
  issueType?: string | null;
  isAnonymous: boolean;
  media?: FeedbackMedia[];
}

export function FeedbackSubmissionForm({
  projectId,
  farmOperation,
  onSuccess,
  onBusyChange,
  editMode = false,
  initialData,
}: FeedbackSubmissionFormProps) {
  const citizenGuide = useCitizenGuide();
  const example = projectId === CITIZEN_PROJECT_ID;
  const [currentStep, setCurrentStep] = useState<StepId>(editMode ? "review" : "sentiment");
  const [direction, setDirection] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  const [rating, setRating] = useState<number>(initialData?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>(initialData?.category || "general");
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(initialData?.sentiment ?? null);
  const [issueType, setIssueType] = useState<string>(initialData?.issueType ?? "");
  const [comment, setComment] = useState(initialData?.comment || "");
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous || false);
  const [media, setMedia] = useState<FeedbackMedia[]>(initialData?.media || []);
  const [pendingEvidence, setPendingEvidence] = useState<GeoEvidenceReadyItem[]>([]);
  const [evidenceInputKey, setEvidenceInputKey] = useState(0);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(editMode); // Auto-agree in edit mode
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPreSubmitSurvey, setShowPreSubmitSurvey] = useState(false);
  const commitRef = useRef(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Editing existing feedback never re-asks the survey - it's not a first submission.
  const { needsSurvey } = useSubmissionSurveyGate(!editMode && !example);

  const localizedSteps: StepDefinition[] = steps.map((step) => ({ ...step, label: t(`projectDetail.feedbackForm.steps.${step.id}`) }));
  const categoryLabel = (value: FeedbackCategory) => t(`projectDetail.feedbackForm.categories.${value}.label`);
  const orderedCategories: CategoryOption[] = getCategoryOrder(sentiment)
    .map((value) => categoryOptions.find((option) => option.value === value))
    .filter((option): option is NonNullable<typeof option> => Boolean(option))
    .map((option) => ({
      ...option,
      label: categoryLabel(option.value),
      description: t(`projectDetail.feedbackForm.categories.${option.value}.description`),
    }));
  const recommendedCategories = useMemo(() => getRecommendedCategories(sentiment), [sentiment]);

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (example) throw new Error("Uploads are disabled in this guide.");
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload?folder=feedback', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include authentication cookies
      });

      const result = await response.json().catch(() => null) as { error?: string; path?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || t("projectDetail.feedbackForm.errors.uploadFailed", { status: response.status }));
      }
      if (!result?.path) throw new Error(t("projectDetail.feedbackForm.errors.uploadNoPath"));

      return result as { path: string };
    },
  });

  // Feedback submission mutation
  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      if (example) throw new Error("Example feedback cannot be submitted.");
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
          sentiment: data.sentiment || null,
          issueType: data.issueType || null,
          isAnonymous: data.isAnonymous,
          media: data.media || [],
        }),
      });

      const result = await response.json().catch(() => null) as { error?: string; data?: { id?: string } } | null;
      if (!response.ok) {
        throw new Error(result?.error || t(editMode ? "projectDetail.feedbackForm.errors.updateFailed" : "projectDetail.feedbackForm.errors.submitFailed"));
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate and refetch feedback
      queryClient.invalidateQueries({ queryKey: ["project-feedback", projectId] });

      // Show success message with approval notice
      if (editMode) {
        toast.success(t("projectDetail.feedbackForm.toast.updated"));
      } else {
        toast.success(t("projectDetail.feedbackForm.toast.submitted"), {
          description: t("projectDetail.feedbackForm.toast.submittedDesc"),
        });
        dispatchClientNotification({
          type: "feedback_submitted",
          title: t("projectDetail.feedbackForm.notification.title"),
          message: t("projectDetail.feedbackForm.notification.message"),
          metadata: {
            feedbackId: result?.data?.id,
            projectId,
          },
        });
      }

      // Reset form
      setCurrentStep("sentiment");
      setDirection(1);
      setRating(0);
      setComment("");
      setCategory("general");
      setSentiment(null);
      setIssueType("");
      setIsAnonymous(false);
      setMedia([]);
      setPendingEvidence([]);
      setEvidenceInputKey((key) => key + 1);
      setAgreeToTerms(false);
      setValidationErrors({});

      // Call success callback
      if (onSuccess) {
        onSuccess(result ?? undefined);
      }
    },
    onError: (error: Error) => {
      // Send them back to the review step so the error is visible next to the confirm button.
      setCurrentStep("review");
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

  const goToStep = useCallback((step: StepId, dir = 1) => {
    setDirection(dir);
    setCurrentStep(step);
  }, []);

  const validateDetailsStep = () => {
    const errors: Record<string, string> = {};

    if (!comment.trim()) {
      errors.comment = t("projectDetail.feedbackForm.errors.commentRequired");
    }
    if (isProcessingMedia) {
      errors.media = t("projectDetail.feedbackForm.errors.mediaProcessing");
    }
    if (media.length + pendingEvidence.length > 5) {
      errors.media = t("projectDetail.feedbackForm.errors.mediaMax", { max: 5 });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateConsentStep = () => {
    if (!agreeToTerms) {
      setValidationErrors({ agreement: t("projectDetail.feedbackForm.errors.agreementRequired") });
      return false;
    }
    setValidationErrors({});
    return true;
  };

  const handleConfirmSubmit = async () => {
    if (example) { await performSubmit(); return; }
    if (needsSurvey) {
      setShowPreSubmitSurvey(true);
      return;
    }
    await performSubmit();
  };

  const performSubmit = async () => {
    if (example) {
      if (citizenGuide?.session?.guide !== "citizen-feedback") return;
      simulateCitizenSubmission("citizen-feedback", { comment });
      citizenGuide.submitted("citizen-feedback");
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
            : t("projectDetail.feedbackForm.errors.uploadBlocked");
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
          sentiment,
          issueType: category === "concerns" ? issueType : null,
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
  const formBusy = isSubmitting || isUploading || showPreSubmitSurvey;
  const characterCount = comment.length;
  const maxCharacters = 1000;
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const attachmentCount = media.length + pendingEvidence.length;
  const starsText = (count: number) => t(count === 1 ? "projectDetail.feedbackForm.rating.starsOne" : "projectDetail.feedbackForm.rating.starsMany", { count });

  return (
    <div className={example ? "pb-72" : undefined}>
      <StepProgress steps={localizedSteps} currentStepIndex={currentStepIndex} label={t("projectDetail.feedbackForm.progressLabel")} />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          data-citizen-step={`feedback-${currentStep}`}
          key={currentStep}
          custom={direction}
          variants={prefersReducedMotion ? reducedStepVariants : stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: prefersReducedMotion ? 0.15 : 0.25, ease: "easeInOut" }}
        >
          {currentStep === "sentiment" && (
            <div className="space-y-5">
              <StepHeader title={t("projectDetail.feedbackForm.sentiment.title")} body={t("projectDetail.feedbackForm.sentiment.body")} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SentimentCard
                  icon={ThumbsUp}
                  label={t("projectDetail.feedbackForm.sentiment.positive")}
                  description={t("projectDetail.feedbackForm.sentiment.positiveDesc")}
                  tone="positive"
                  isSelected={sentiment === "positive"}
                  disabled={formBusy}
                  onClick={() => setSentiment((current) => (current === "positive" ? null : "positive"))}
                />
                <SentimentCard
                  icon={ThumbsDown}
                  label={t("projectDetail.feedbackForm.sentiment.negative")}
                  description={t("projectDetail.feedbackForm.sentiment.negativeDesc")}
                  tone="negative"
                  isSelected={sentiment === "negative"}
                  disabled={formBusy}
                  onClick={() => setSentiment((current) => (current === "negative" ? null : "negative"))}
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSentiment(null);
                    goToStep("category");
                  }}
                  disabled={formBusy}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {t("projectDetail.feedbackForm.sentiment.skip")}
                </button>
                <Button data-citizen="form-next" type="button" onClick={() => goToStep("category")} disabled={formBusy}>
                  {t("projectDetail.feedbackForm.next")}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "category" && (
            <div className="space-y-5">
              <StepHeader title={t("projectDetail.feedbackForm.category.title")} body={t("projectDetail.feedbackForm.category.body")} />
              <div role="radiogroup" aria-label={t("projectDetail.feedbackForm.steps.category")} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {orderedCategories.map((option) => (
                  <CategoryCard
                    key={option.value}
                    option={option}
                    isSelected={category === option.value}
                    isRecommended={recommendedCategories.has(option.value)}
                    recommendedLabel={t("projectDetail.feedbackForm.category.recommended")}
                    disabled={formBusy}
                    onSelect={() => setCategory(option.value)}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => goToStep("sentiment", -1)} disabled={formBusy}>
                  {t("projectDetail.feedbackForm.back")}
                </Button>
                <Button data-citizen="form-next" type="button" onClick={() => goToStep("details")} disabled={formBusy}>
                  {t("projectDetail.feedbackForm.next")}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "details" && (
            <div className="space-y-6">
              <StepHeader title={t("projectDetail.feedbackForm.details.title")} body={t("projectDetail.feedbackForm.details.body")} />

              {/* Comment */}
              <Field>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel htmlFor="comment">{t("projectDetail.feedbackForm.details.commentLabel")} *</FieldLabel>
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
                  placeholder={t("projectDetail.feedbackForm.details.commentPlaceholder")}
                  rows={5}
                  maxLength={maxCharacters}
                  className="resize-none"
                  disabled={formBusy}
                  autoFocus
                />
                <FieldError errors={validationErrors.comment} />
              </Field>

              {/* Issue Type - only relevant once "Concerns & Issues" is the category */}
              {category === "concerns" && (
                <IssueTypePicker
                  value={issueType}
                  farmOperation={farmOperation || ""}
                  onChange={setIssueType}
                  required={false}
                />
              )}

              {/* Media Upload */}
              <Field>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <FieldLabel>{t("projectDetail.feedbackForm.details.evidenceLabel")}</FieldLabel>
                    <FieldDescription className="mt-1">
                      {t("projectDetail.feedbackForm.details.evidenceHint")}
                    </FieldDescription>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-500">
                    {attachmentCount}/5
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
                          aria-label={t("projectDetail.feedbackForm.details.removeMedia")}
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
                  disabled={formBusy || example}
                  onEvidenceReady={handleEvidenceReady}
                  onProcessingChange={handleEvidenceProcessingChange}
                />
                {uploadMutation.isPending ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("projectDetail.feedbackForm.details.uploading")}
                  </div>
                ) : null}
                <FieldError errors={validationErrors.media} />
              </Field>

              {/* Rating */}
              <Field>
                <FieldLabel>{t("projectDetail.feedbackForm.rating.label")}</FieldLabel>
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
                      aria-label={t(star === 1 ? "projectDetail.feedbackForm.rating.rateOne" : "projectDetail.feedbackForm.rating.rateMany", { count: star })}
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
                      {starsText(rating)}
                    </span>
                  )}
                </div>
              </Field>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => goToStep("category", -1)} disabled={formBusy}>
                  {t("projectDetail.feedbackForm.back")}
                </Button>
                <Button
                  data-citizen="form-next"
                  type="button"
                  disabled={formBusy || (example && !comment.trim())}
                  onClick={() => {
                    if (validateDetailsStep()) goToStep("consent");
                  }}
                >
                  {t("projectDetail.feedbackForm.next")}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "consent" && (
            <div className="space-y-5">
              <StepHeader title={t("projectDetail.feedbackForm.steps.consent")} body={t("projectDetail.feedbackForm.consent.body")} />

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
                      {t("projectDetail.feedbackForm.consent.agreePrefix")}
                      <Link
                        href="/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("footer.terms")}
                      </Link>
                      {t("projectDetail.feedbackForm.consent.agreeAnd")}
                      <Link
                        href="/data-privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("footer.privacy")}
                      </Link>
                      {t("projectDetail.feedbackForm.consent.agreeSuffix")}
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
                      {t("projectDetail.feedbackForm.consent.anonymousLabel")}
                    </FieldLabel>
                    <FieldDescription className="mt-1">
                      {t("projectDetail.feedbackForm.consent.anonymousHint")}
                    </FieldDescription>
                  </div>
                </div>
              </Field>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => goToStep("details", -1)} disabled={formBusy}>
                  {t("projectDetail.feedbackForm.back")}
                </Button>
                <Button
                  data-citizen="form-next"
                  type="button"
                  disabled={formBusy || (example && !agreeToTerms)}
                  onClick={() => {
                    if (validateConsentStep()) goToStep("review");
                  }}
                >
                  {t("projectDetail.feedbackForm.next")}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <StepHeader title={t("projectDetail.feedbackForm.review.title")} body={t("projectDetail.feedbackForm.review.body")} />

              <ReviewSection title={t("projectDetail.feedbackForm.review.experience")} editLabel={t("projectDetail.feedbackForm.review.edit")} onEdit={() => goToStep("sentiment", -1)}>
                <ReviewRow
                  label={t("projectDetail.feedbackForm.review.sentiment")}
                  value={sentiment === "positive" ? t("projectDetail.feedbackForm.sentiment.positive") : sentiment === "negative" ? t("projectDetail.feedbackForm.sentiment.negative") : t("projectDetail.feedbackForm.review.notSpecified")}
                />
                <ReviewRow
                  label={t("projectDetail.feedbackForm.steps.category")}
                  value={categoryLabel(category)}
                />
              </ReviewSection>

              <ReviewSection title={t("projectDetail.feedbackForm.review.feedback")} editLabel={t("projectDetail.feedbackForm.review.edit")} onEdit={() => goToStep("details", -1)}>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("projectDetail.feedbackForm.details.commentLabel")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{comment}</p>
                </div>
                {category === "concerns" && (
                  <ReviewRow
                    label={t("projectDetail.feedbackForm.review.issueType")}
                    value={parseIssueTypeValue(issueType).join(", ") || t("projectDetail.feedbackForm.review.notSpecified")}
                  />
                )}
                <ReviewRow label={t("projectDetail.feedbackForm.review.rating")} value={rating > 0 ? starsText(rating) : t("projectDetail.feedbackForm.review.notRated")} />
                <ReviewRow
                  label={t("projectDetail.feedbackForm.review.attachments")}
                  value={
                    attachmentCount === 0
                      ? t("projectDetail.feedbackForm.review.noAttachments")
                      : t(attachmentCount === 1 ? "projectDetail.feedbackForm.review.filesOne" : "projectDetail.feedbackForm.review.filesMany", { count: attachmentCount })
                  }
                />
              </ReviewSection>

              <ReviewSection title={t("projectDetail.feedbackForm.steps.consent")} editLabel={t("projectDetail.feedbackForm.review.edit")} onEdit={() => goToStep("consent", -1)}>
                <ReviewRow label={t("projectDetail.feedbackForm.review.submittingAs")} value={isAnonymous ? t("projectDetail.feedbackForm.review.anonymous") : t("projectDetail.feedbackForm.review.yourAccount")} />
              </ReviewSection>

              {validationErrors.submit && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 flex-1">{validationErrors.submit}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button type="button" variant="ghost" onClick={() => goToStep("consent", -1)} disabled={formBusy}>
                  {t("projectDetail.feedbackForm.back")}
                </Button>
                <Button
                  data-citizen="form-next"
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={formBusy}
                  className="h-11 flex-1 text-base font-medium"
                  size="lg"
                >
                  {formBusy ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("projectDetail.feedbackForm.review.saving")}
                    </>
                  ) : (
                    t("projectDetail.feedbackForm.review.submit")
                  )}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <SubmissionSurveyModal
        isOpen={showPreSubmitSurvey}
        onClose={() => setShowPreSubmitSurvey(false)}
        onComplete={() => {
          setShowPreSubmitSurvey(false);
          performSubmit();
        }}
        sourceType="feedback"
        sourceId={null}
      />
    </div>
  );
}

function StepProgress({ steps, currentStepIndex, label }: { steps: StepDefinition[]; currentStepIndex: number; label: string }) {
  const prefersReducedMotion = useReducedMotion();
  const lineDuration = prefersReducedMotion ? 0 : 0.4;
  const nodeDuration = prefersReducedMotion ? 0 : 0.25;
  const dotDuration = prefersReducedMotion ? 0 : 0.3;

  return (
    <nav aria-label={label} className="mb-6 w-full">
      <ol className="relative hidden items-center justify-between sm:flex">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
        <motion.div
          className="absolute left-0 top-5 h-0.5 bg-emerald-500"
          initial={false}
          animate={{ width: steps.length > 1 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : "0%" }}
          transition={{ duration: lineDuration, ease: "easeInOut" }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted || isCurrent ? "rgb(5 150 105)" : "rgb(241 245 249)",
                }}
                transition={{ duration: nodeDuration }}
                className={`flex size-10 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-950 ${isCompleted || isCurrent ? "text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {isCompleted ? <Check className="size-4" aria-hidden="true" /> : <StepIcon className="size-4" aria-hidden="true" />}
              </motion.div>
              <span className={`max-w-20 text-center text-xs font-medium leading-tight ${isCurrent ? "text-emerald-600 dark:text-emerald-400" : isCompleted ? "text-slate-700 dark:text-slate-300" : "text-slate-500"}`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col items-center gap-2 sm:hidden" role="status" aria-live="polite">
        <div className="flex items-center gap-2" aria-hidden="true">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <motion.div
                key={step.id}
                initial={false}
                animate={{
                  width: isCurrent ? 24 : 8,
                  backgroundColor: isCompleted || isCurrent ? "rgb(5 150 105)" : "rgb(203 213 225)",
                }}
                transition={{ duration: dotDuration }}
                className="h-2 rounded-full"
              />
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{steps[currentStepIndex]?.label} ({currentStepIndex + 1}/{steps.length})</p>
      </div>
    </nav>
  );
}

function StepHeader({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

function SentimentCard({
  icon: Icon,
  label,
  description,
  tone,
  isSelected,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  tone: "positive" | "negative";
  isSelected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const selectedClass = tone === "positive"
    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-red-500 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300";

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950",
        isSelected
          ? selectedClass
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-0.5 text-xs font-medium opacity-80">{description}</p>
      </div>
    </button>
  );
}

function CategoryCard({
  option,
  isSelected,
  isRecommended,
  recommendedLabel,
  disabled,
  onSelect,
}: {
  option: CategoryOption;
  isSelected: boolean;
  isRecommended: boolean;
  recommendedLabel: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950",
        isSelected
          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-700",
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-bold">{option.label}</span>
          {isRecommended && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              {recommendedLabel}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium opacity-80">{option.description}</p>
      </div>
    </button>
  );
}

function ReviewSection({ title, editLabel, onEdit, children }: { title: string; editLabel: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {editLabel}
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-white sm:text-right">{value}</span>
    </div>
  );
}
