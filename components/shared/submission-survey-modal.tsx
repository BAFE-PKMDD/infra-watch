"use client";

import { useState } from "react";
import { Loader2, Globe, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export type ReferralSourceOption = "facebook" | "website" | "instagram" | "other";

export interface SubmissionSurveyFormProps {
  sourceType: "feedback" | "e_report";
  sourceId?: string | null;
  defaultName?: string;
  onSuccess?: () => void;
  onSkip?: () => void;
  submitSurveyFn?: (payload: {
    sourceType: "feedback" | "e_report";
    sourceId: string | null;
    name: string | null;
    age: number | null;
    gender: string | null;
    referralSource: ReferralSourceOption;
  }) => Promise<void>;
}

export interface SubmissionSurveyModalProps extends Omit<SubmissionSurveyFormProps, "onSuccess" | "onSkip"> {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const GENDER_OPTIONS = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

export const REFERRAL_OPTIONS: {
  value: ReferralSourceOption;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [

  {
    value: "facebook",
    label: "a. Facebook",
    sublabel: "Official DA / BAFE Facebook Page",
    icon: FacebookIcon,
  },
  {
    value: "website",
    label: "b. Website",
    sublabel: "Official BAFE or DA Web Portal",
    icon: Globe,
  },
  {
    value: "instagram",
    label: "c. Instagram",
    sublabel: "Social Media / Instagram Posts",
    icon: InstagramIcon,
  },
];

export function SubmissionSurveyForm({
  sourceType,
  sourceId,
  defaultName = "",
  onSuccess,
  onSkip,
  submitSurveyFn,
}: SubmissionSurveyFormProps) {
  const [name, setName] = useState(defaultName);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [referralSource, setReferralSource] = useState<ReferralSourceOption | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setName(defaultName);
    setAge("");
    setGender("");
    setReferralSource("");
    setError(null);
  };

  const handleSkip = () => {
    resetState();
    onSkip?.();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // Validation
    if (!referralSource) {
      setError("Please let us know how you found out about us.");
      return;
    }

    const parsedAge = age.trim() ? Number(age.trim()) : null;
    if (parsedAge !== null && (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
      setError("Please enter a valid age between 1 and 120.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (submitSurveyFn) {
        await submitSurveyFn({
          sourceType,
          sourceId: sourceId || null,
          name: name.trim() || null,
          age: parsedAge,
          gender: gender || null,
          referralSource,
        });
      } else {
        const response = await fetch("/api/submission-survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType,
            sourceId: sourceId || null,
            name: name.trim() || null,
            age: parsedAge,
            gender: gender || null,
            referralSource,
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to submit survey");
        }
      }

      toast.success("Thank you for helping us improve InfraWatch!");
      resetState();
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit survey.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEreport = sourceType === "e_report";

  return (
    <div className="flex flex-col gap-4">
      <div className="text-left space-y-1.5 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary font-medium text-xs tracking-wider uppercase">
          <Sparkles className="size-3.5 text-primary" />
          <span>{isEreport ? "E-Report Submitted" : "Feedback Submitted"}</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Help Us Serve You Better
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Your {isEreport ? "E-report" : "feedback"} was received! Help BAFE understand who uses InfraWatch by completing these quick questions. Your answers are optional.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 py-1">

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        {/* 1. Name (optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="survey-name" className="text-xs font-semibold text-foreground">
              1. Name <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
          </div>
          <Input
            id="survey-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Juan dela Cruz (leave blank for anonymous)"
            className="h-9 text-sm"
            disabled={isSubmitting}
          />
        </div>

        {/* 2. Age & 3. Gender */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* 2. Age */}
          <div className="space-y-1.5">
            <Label htmlFor="survey-age" className="text-xs font-semibold text-foreground">
              2. Age
            </Label>
            <Input
              id="survey-age"
              type="number"
              min="1"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 28"
              className="h-9 text-sm"
              disabled={isSubmitting}
            />
          </div>

          {/* 3. Gender */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              3. Gender
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(option.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "h-8 rounded-md border text-xs font-medium transition-all text-center px-2 cursor-pointer",
                    gender === option.value
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40 shadow-xs"
                      : "border-input bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. How did you find out about us? */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-semibold text-foreground block">
            4. How did you find out about us? <span className="text-primary font-bold">*</span>
          </Label>
          <div className="grid grid-cols-1 gap-2">
            {REFERRAL_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = referralSource === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReferralSource(option.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "flex items-center justify-between w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-xs"
                      : "border-border/70 bg-card hover:bg-accent/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "size-8 rounded-md flex items-center justify-center shrink-0 border transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border/60",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {option.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {option.sublabel}
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "size-4 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-transparent",
                    )}
                  >
                    {isSelected && <Check className="size-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
          >
            Skip
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="text-xs font-medium shadow-xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Submitting...
              </>
            ) : (
              "Submit Survey"
            )}
          </Button>
        </div>

      </form>
    </div>
  );
}

export function SubmissionSurveyModal({
  isOpen,
  onClose,
  onComplete,
  sourceType,
  sourceId,
  defaultName = "",
  submitSurveyFn,
}: SubmissionSurveyModalProps) {
  const handleClose = () => {
    onClose();
    onComplete?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-lg"
        showCloseButton={true}
      >
        <SubmissionSurveyForm
          sourceType={sourceType}
          sourceId={sourceId}
          defaultName={defaultName}
          onSuccess={handleClose}
          onSkip={handleClose}
          submitSurveyFn={submitSurveyFn}
        />
      </DialogContent>
    </Dialog>
  );
}
