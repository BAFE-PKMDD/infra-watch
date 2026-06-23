"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import type { FeedbackCategory } from "@/types/feedback.types";

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
  };
}

const categories: { value: FeedbackCategory; label: string }[] = [
  { value: "quality", label: "Project Quality" },
  { value: "progress", label: "Project Progress" },
  { value: "concerns", label: "Concerns & Issues" },
  { value: "general", label: "General Feedback" },
];

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
  const [agreeToTerms, setAgreeToTerms] = useState(editMode);
  const [isPending, setIsPending] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!comment.trim()) {
      errors.comment = "Comment is required";
    } else if (comment.trim().length < 10) {
      errors.comment = "Comment must be at least 10 characters";
    }
    if (!agreeToTerms) {
      errors.terms = "You must agree to the guidelines";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsPending(true);
    // Simulate API call
    setTimeout(() => {
      setIsPending(false);
      toast.success(editMode ? "Feedback updated successfully!" : "Feedback submitted successfully!");
      if (onSuccess) {
        onSuccess();
      }
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4 text-slate-900 dark:text-slate-100">
      {/* Star Rating */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wider text-slate-500">
          Rating (Optional)
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              type-button-wrapper="true"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 hover:scale-110 transition-transform focus:outline-none bg-transparent border-none"
            >
              <Star
                className={`w-8 h-8 ${
                  (hoverRating || rating) >= star
                    ? "fill-amber-400 stroke-amber-500"
                    : "fill-transparent stroke-slate-300 dark:stroke-slate-700"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wider text-slate-500">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700 font-medium cursor-pointer bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Comment Input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wider text-slate-500">
          Your Comments
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience, issues, or thoughts about this infrastructure project..."
          rows={5}
          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700 font-medium bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
        />
        {validationErrors.comment && (
          <p className="text-xs text-rose-500 font-medium">{validationErrors.comment}</p>
        )}
      </div>

      {/* Anonymous Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="anonymous"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label htmlFor="anonymous" className="text-sm text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
          Post feedback anonymously
        </label>
      </div>

      {/* Guidelines Agreement Checkbox */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="agree"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="w-4 h-4 mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="agree" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            I certify that this feedback is based on my first-hand observation and conforms to our community posting guidelines.
          </label>
        </div>
        {validationErrors.terms && (
          <p className="text-xs text-rose-500 font-medium">{validationErrors.terms}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            editMode ? "Save Changes" : "Submit Feedback"
          )}
        </Button>
      </div>
    </form>
  );
}
