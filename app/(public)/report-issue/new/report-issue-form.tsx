"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Activity,
  Banknote,
  BarChart3,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  HardHat,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  Search,
  Sprout,
  Tag,
  User,
  Video as VideoIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectSearchInput, type SelectedProject } from "@/components/ui/project-search-input";
import { MediaViewer } from "@/components/ui/media-viewer";
import { GeoEvidenceUpload, type GeoEvidenceReadyItem } from "@/components/shared/geo-evidence-upload";
import { SubmissionSurveyModal } from "@/components/shared/submission-survey-modal";
import type { IssueEvidenceItem } from "@/types/geo-evidence.types";

import { dispatchClientNotification } from "@/lib/client-notifications";
import { useAuth } from "@/providers/auth-provider";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import {
  INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE,
  MALICIOUS_FILE_UPLOAD_MESSAGE,
  STORAGE_UNAVAILABLE_UPLOAD_MESSAGE,
  getUploadErrorTitle,
} from "@/lib/upload-errors";
import { safePublicSourceMediaUrl } from "@/lib/public-source-media";
import { buildReportIssuePath, projectPreviewToSelectedProject } from "@/lib/report-issue-project-link";
import {
  getBarangays,
  getMunicipalities,
  getProvinces,
  getRegions,
  type LocationOption,
} from "@/actions/query/get-location-options";
import { FARM_OPERATIONS, getProjectTypesForFarmOperation } from "@/lib/abemis/project-type-map";
import { parseIssueTypeValue } from "@/lib/abemis/issue-type-map";
import { IssueTypePicker, issueTypeText, type Translate } from "@/components/report-issue/issue-type-picker";
import { useSubmissionSurveyGate } from "@/hooks/use-submission-survey-gate";
import { useTranslation } from "@/i18n";

type FlowPath = "knows-project" | "no-project" | null;
type StepId =
  | "project-search"
  | "farm-operation"
  | "project-type"
  | "location"
  | "match"
  | "category"
  | "issue-details"
  | "contact"
  | "review";

type StepDefinition = {
  id: StepId;
  /** Read as t(`eReport.form.steps.${labelKey}`). */
  labelKey: string;
  icon: LucideIcon;
};

export type ReportCategory = "quality" | "progress" | "general" | "concerns";

// `label` is the English name sent to the API as the stored category; what the visitor reads
// comes from t("eReport.categories.<value>.label" / ".description").
export const categoryOptions: Array<{ value: ReportCategory; label: string; icon: LucideIcon; description: string }> = [
  { value: "quality", label: "Project Quality", icon: HardHat, description: "Materials, workmanship, and construction standards" },
  { value: "progress", label: "Project Progress", icon: BarChart3, description: "Timeline, completion status, and pacing" },
  { value: "general", label: "General Feedback", icon: MessageCircle, description: "Anything else about this project" },
  { value: "concerns", label: "Concerns & Issues", icon: AlertTriangle, description: "A problem, delay, or something that needs attention" },
];

export function getCategoryLabel(value?: string | null): string {
  if (!value) return "Not selected";
  const matched = categoryOptions.find((c) => c.value === value);
  return matched ? matched.label : value;
}

type ProjectDetails = {
  id: string;
  name: string;
  code?: string;
  location?: string;
  province?: string;
  city?: string;
  implementingAgency?: string;
  budget?: number;
  status?: string;
  stage?: string;
  metadata?: Record<string, unknown>;
};

const stepsKnowsProject: StepDefinition[] = [
  { id: "project-search", labelKey: "project", icon: Search },
  { id: "category", labelKey: "category", icon: LayoutGrid },
  { id: "issue-details", labelKey: "details", icon: FileText },
  { id: "contact", labelKey: "contact", icon: User },
  { id: "review", labelKey: "review", icon: ClipboardCheck },
];

const stepsNoProject: StepDefinition[] = [
  { id: "farm-operation", labelKey: "farmOperation", icon: Sprout },
  { id: "project-type", labelKey: "projectType", icon: Tag },
  { id: "location", labelKey: "location", icon: MapPin },
  { id: "match", labelKey: "match", icon: Search },
  { id: "category", labelKey: "category", icon: LayoutGrid },
  { id: "issue-details", labelKey: "details", icon: FileText },
  { id: "contact", labelKey: "contact", icon: User },
  { id: "review", labelKey: "review", icon: ClipboardCheck },
];

const MATCH_PAGE_SIZE = 5;

// Upload errors arrive in English from lib/upload-errors.ts; show the known ones in the
// visitor's language and anything else (server details) as sent.
function uploadErrorToast(message: string, t: Translate) {
  const titleKeys: Record<string, string> = {
    "Storage temporarily unavailable": "storageTitle",
    "Inappropriate image blocked": "inappropriateTitle",
    "Invalid file blocked": "invalidFileTitle",
    "Upload blocked": "blockedTitle",
  };
  const messageKeys: Record<string, string> = {
    [STORAGE_UNAVAILABLE_UPLOAD_MESSAGE]: "storageMessage",
    [INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE]: "inappropriateMessage",
    [MALICIOUS_FILE_UPLOAD_MESSAGE]: "invalidFileMessage",
  };
  const title = getUploadErrorTitle(message);
  return {
    title: titleKeys[title] ? t(`eReport.form.uploadErrors.${titleKeys[title]}`) : title,
    description: messageKeys[message] ? t(`eReport.form.uploadErrors.${messageKeys[message]}`) : message,
  };
}

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

export default function ReportIssuePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("projectId")?.trim() || "";
  const { user, isLoading: isSessionLoading } = useAuth();
  const { needsSurvey } = useSubmissionSurveyGate(Boolean(user));
  const prefersReducedMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState<StepId>("farm-operation");
  const [flowPath, setFlowPath] = useState<FlowPath>("no-project");
  const [direction, setDirection] = useState(1);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [visibleMatchCount, setVisibleMatchCount] = useState(MATCH_PAGE_SIZE);
  const [visibleTypeMatchCount, setVisibleTypeMatchCount] = useState(MATCH_PAGE_SIZE);
  const [evidence, setEvidence] = useState<GeoEvidenceReadyItem[]>([]);
  const [isEvidenceProcessing, setIsEvidenceProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreSubmitSurvey, setShowPreSubmitSurvey] = useState(false);
  const [selectedRegionCode, setSelectedRegionCode] = useState("");

  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [selectedBarangayCode, setSelectedBarangayCode] = useState("");
  const linkedProjectInitialized = useRef(false);
  // Survives across a failed submit's retry so re-submitting doesn't
  // re-upload (and orphan a duplicate copy of) files already stored.
  const uploadedEvidenceCacheRef = useRef(new Map<File, IssueEvidenceItem>());

  const [form, setForm] = useState({
    farmOperation: "",
    category: "concerns" as ReportCategory,
    projectType: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    streetLandmark: "",
    issueType: "",
    issueDescription: "",
    dateNoticed: "",
    contactNumber: "",
    email: "",
    isAnonymous: false,
    confirmAccuracy: false,
    agreeToTerms: false,
  });

  useEffect(() => {
    if (!isSessionLoading && !user) {
      const redirectTarget = requestedProjectId ? buildReportIssuePath(requestedProjectId) : "/report-issue/new";
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [isSessionLoading, requestedProjectId, router, user]);

  const { data: linkedProject } = useQuery({
    queryKey: ["report-issue-linked-project", requestedProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${encodeURIComponent(requestedProjectId)}`);
      if (!response.ok) return null;
      const result = await response.json() as {
        data?: { id: string; name: string; code?: string; province?: string; city?: string; farmOperation?: string };
      };
      return result.data || null;
    },
    enabled: Boolean(requestedProjectId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!linkedProject || linkedProjectInitialized.current) return;
    linkedProjectInitialized.current = true;
    const selected = projectPreviewToSelectedProject(linkedProject);
    setSelectedProject(selected);
    setForm((previous) => ({
      ...previous,
      province: selected.province || "",
      city: selected.municipality || "",
      farmOperation: selected.farmOperation || previous.farmOperation,
    }));
    setFlowPath("knows-project");
    setCurrentStep("project-search");
  }, [linkedProject]);

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: () => getRegions(),
    staleTime: Infinity,
  });

  const { data: provinces = [], isFetching: isProvincesLoading } = useQuery({
    queryKey: ["provinces", selectedRegionCode],
    queryFn: () => getProvinces(selectedRegionCode),
    enabled: !!selectedRegionCode,
    staleTime: Infinity,
  });

  const { data: municipalities = [], isFetching: isCitiesLoading } = useQuery({
    queryKey: ["municipalities", selectedProvinceCode],
    queryFn: () => getMunicipalities(selectedProvinceCode),
    enabled: !!selectedProvinceCode,
    staleTime: Infinity,
  });

  const { data: barangays = [], isFetching: isBarangaysLoading } = useQuery({
    queryKey: ["barangays", selectedCityCode],
    queryFn: () => getBarangays(selectedCityCode),
    enabled: !!selectedCityCode,
    staleTime: Infinity,
  });

  // Reset the "see more" reveal count when the underlying match criteria
  // changes, following React's render-time state-adjustment pattern instead
  // of an effect (which would cause an extra cascading render).
  const matchCriteriaKey = `${form.province}|${form.city}`;
  const [lastMatchCriteriaKey, setLastMatchCriteriaKey] = useState(matchCriteriaKey);
  if (matchCriteriaKey !== lastMatchCriteriaKey) {
    setLastMatchCriteriaKey(matchCriteriaKey);
    setVisibleMatchCount(MATCH_PAGE_SIZE);
  }

  const typeMatchCriteriaKey = `${form.projectType}|${form.province}`;
  const [lastTypeMatchCriteriaKey, setLastTypeMatchCriteriaKey] = useState(typeMatchCriteriaKey);
  if (typeMatchCriteriaKey !== lastTypeMatchCriteriaKey) {
    setLastTypeMatchCriteriaKey(typeMatchCriteriaKey);
    setVisibleTypeMatchCount(MATCH_PAGE_SIZE);
  }

  const { data: suggestedProjects = [], isFetching: isSuggestionsLoading } = useQuery({
    queryKey: ["issue-project-suggestions", form.province, form.city],
    queryFn: async (): Promise<SelectedProject[]> => {
      const searchTerm = form.city || form.province;
      if (!searchTerm) return [];
      const response = await fetch(`/api/projects?search=${encodeURIComponent(searchTerm)}&limit=20`);
      if (!response.ok) throw new Error("Failed to find nearby projects");
      const result = await response.json();
      return ((result.data || []) as Array<{ id: string; name: string; sourceId?: string; code?: string; province?: string; municipality?: string; farmOperation?: string }>).map((project) => ({
        id: project.id,
        name: project.name,
        sourceId: project.sourceId,
        sourceProjectId: project.code,
        province: project.province,
        municipality: project.municipality,
        farmOperation: project.farmOperation,
      }));
    },
    enabled: currentStep === "match" && !!(form.city || form.province),
    staleTime: 30000,
  });

  const { data: typeSuggestedProjects = [], isFetching: isTypeSuggestionsLoading } = useQuery({
    queryKey: ["issue-project-type-suggestions", form.projectType, form.province],
    queryFn: async (): Promise<SelectedProject[]> => {
      const params = new URLSearchParams({ type: form.projectType, limit: "20" });
      if (form.province) params.set("province", form.province);
      const response = await fetch(`/api/projects?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to find similar projects");
      const result = await response.json();
      return ((result.data || []) as Array<{ id: string; name: string; sourceId?: string; code?: string; province?: string; municipality?: string; farmOperation?: string }>).map((project) => ({
        id: project.id,
        name: project.name,
        sourceId: project.sourceId,
        sourceProjectId: project.code,
        province: project.province,
        municipality: project.municipality,
        farmOperation: project.farmOperation,
      }));
    },
    enabled: currentStep === "match" && !isSuggestionsLoading && suggestedProjects.length === 0 && !!form.projectType,
    staleTime: 30000,
  });

  const activeSteps = useMemo(() => {
    if (flowPath === "knows-project") return stepsKnowsProject;
    if (flowPath === "no-project") return stepsNoProject;
    return [stepsKnowsProject[0]];
  }, [flowPath]);

  const currentStepIndex = activeSteps.findIndex((step) => step.id === currentStep);

  const setValue = (name: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFarmOperationChange = (value: string) => {
    setForm((prev) => ({ ...prev, farmOperation: value, projectType: "" }));
  };

  const projectTypeOptions = useMemo(
    () => getProjectTypesForFarmOperation(form.farmOperation),
    [form.farmOperation],
  );

  const findLabel = (options: LocationOption[], value: string) => options.find((option) => option.value === value)?.label || "";

  const handleRegionChange = (value: string) => {
    const label = findLabel(regions, value);
    setSelectedRegionCode(value);
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setSelectedBarangayCode("");
    setForm((prev) => ({
      ...prev,
      region: label,
      province: "",
      city: "",
      barangay: "",
    }));
  };

  const handleProvinceChange = (value: string) => {
    const label = findLabel(provinces, value);
    setSelectedProvinceCode(value);
    setSelectedCityCode("");
    setSelectedBarangayCode("");
    setForm((prev) => ({
      ...prev,
      province: label,
      city: "",
      barangay: "",
    }));
  };

  const handleCityChange = (value: string) => {
    const label = findLabel(municipalities, value);
    setSelectedCityCode(value);
    setSelectedBarangayCode("");
    setForm((prev) => ({
      ...prev,
      city: label,
      barangay: "",
    }));
  };

  const handleBarangayChange = (value: string) => {
    setSelectedBarangayCode(value);
    setValue("barangay", findLabel(barangays, value));
  };

  const goToStep = useCallback((step: StepId, dir = 1) => {
    setDirection(dir);
    setCurrentStep(step);
  }, []);

  const handleProjectSelect = async (project: SelectedProject) => {
    setSelectedProject(project);
    setValue("province", project.province || "");
    setValue("city", project.municipality || "");
    if (project.farmOperation) {
      setValue("farmOperation", project.farmOperation);
    }
  };

  const handleEvidenceReady = useCallback((items: GeoEvidenceReadyItem[]) => setEvidence(items), []);

  const handleEvidenceProcessingChange = useCallback(
    (processing: boolean) => setIsEvidenceProcessing(processing),
    [],
  );

  const validateIssueDetails = () => {
    if (!form.issueType) {
      toast.error(t("eReport.form.toasts.selectIssueType"));
      return false;
    }
    if (form.issueDescription.trim().length < 20) {
      toast.error(t("eReport.form.toasts.descriptionMin"));
      return false;
    }
    if (!form.dateNoticed) {
      toast.error(t("eReport.form.toasts.dateNoticed"));
      return false;
    }
    return true;
  };

  const validateContactStep = () => {
    if (!form.contactNumber.trim()) {
      toast.error(t("eReport.form.toasts.contactRequired"));
      return false;
    }
    if (!form.confirmAccuracy || !form.agreeToTerms) {
      toast.error(t("eReport.form.toasts.confirmTerms"));
      return false;
    }
    if (isEvidenceProcessing) {
      toast.error(t("eReport.form.toasts.waitEvidence"));
      return false;
    }
    return true;
  };

  const handleGoToReview = () => {
    if (!validateContactStep()) return;
    goToStep("review");
  };

  const handleSubmitClick = () => {
    if (!validateContactStep()) return;
    if (needsSurvey) {
      setShowPreSubmitSurvey(true);
      return;
    }
    submitIssueReport();
  };

  const submitIssueReport = async () => {
    try {
      setIsSubmitting(true);
      const uploadedEvidence: IssueEvidenceItem[] = [];

      // Upload sequentially to avoid buffering several large videos at once on the server.
      for (const item of evidence) {
        const cached = uploadedEvidenceCacheRef.current.get(item.file);
        if (cached) {
          uploadedEvidence.push(cached);
          continue;
        }

        const uploadData = new FormData();
        uploadData.append("file", item.file);
        const uploadResponse = await fetch("/api/upload?folder=issue-evidence", {
          method: "POST",
          body: uploadData,
          credentials: "include",
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.success) {
          throw new Error(uploadResult.error || t("eReport.form.toasts.uploadFailed", { name: item.file.name }));
        }

        const uploadedItem: IssueEvidenceItem = {
          type: item.type,
          url: uploadResult.path || uploadResult.url,
          name: item.file.name,
        };
        if (typeof item.lat === "number" && typeof item.lon === "number") {
          uploadedItem.lat = item.lat;
          uploadedItem.lon = item.lon;
        }
        if (typeof item.accuracy === "number") uploadedItem.accuracy = item.accuracy;
        if (item.track && item.track.length > 0) uploadedItem.track = item.track;
        uploadedEvidenceCacheRef.current.set(item.file, uploadedItem);
        uploadedEvidence.push(uploadedItem);
      }

      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject?.sourceId || selectedProject?.id || null,
          category: getCategoryLabel(form.category),
          farmOperation: form.farmOperation || selectedProject?.farmOperation || null,
          projectType: form.projectType || null,
          region: form.region || null,
          province: form.province || null,
          city: form.city || null,
          barangay: form.barangay || null,
          streetLandmark: form.streetLandmark || null,
          issueType: form.issueType,
          issueDescription: form.issueDescription,
          dateNoticed: form.dateNoticed,
          reporterName: form.isAnonymous ? "Anonymous" : user?.name || "Citizen",
          reporterContact: form.contactNumber,
          reporterEmail: form.email || null,
          isAnonymous: form.isAnonymous,
          evidence: uploadedEvidence,
          documentUrls: [],
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.details || t("eReport.form.toasts.submitFailed"));

      toast.success(t("eReport.form.toasts.success"));
      dispatchClientNotification({
        type: "issue_created",
        title: t("eReport.form.notification.title"),
        message: data.message || t("eReport.form.notification.message"),
        metadata: {
          issueId: data.data?.id,
          ticketNumber: data.data?.ticketNumber,
          projectId: selectedProject?.sourceId || selectedProject?.id || null,
        },
      });
      router.push("/report-issue/" + (data.data?.id || ""));
    } catch (error) {

      const message = error instanceof Error ? error.message : t("eReport.form.toasts.submitFailed");
      const { title, description } = uploadErrorToast(message, t);
      toast.error(title, { description, duration: 6500 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryDisplay = form.category ? t(`eReport.categories.${form.category}.label`) : t("eReport.form.values.notSelected");

  if (isSessionLoading || !user) {
    return (
      <div className="min-h-screen bg-white px-4 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl animate-pulse space-y-5">
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-64 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 text-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/report-issue" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="size-4" />
          {t("eReport.common.backToList")}
        </Link>

        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-slate-950 dark:text-white">{t("eReport.form.title")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("eReport.form.subtitle")}</p>
        </div>

        {flowPath && <StepProgress steps={activeSteps} currentStepIndex={currentStepIndex} />}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={prefersReducedMotion ? reducedStepVariants : stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: prefersReducedMotion ? 0.15 : 0.25, ease: "easeInOut" }}
            >
              {currentStep === "project-search" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.projectSearch.title")} body={t("eReport.form.projectSearch.body")} />
                  <ProjectSearchInput value={selectedProject} onSelect={handleProjectSelect} onClear={() => setSelectedProject(null)} autoFocus />
                  {selectedProject && (
                    <ProjectSuggestionCard
                      project={selectedProject}
                      selected
                      expanded
                      onToggle={() => undefined}
                      onSelect={() => goToStep("category")}
                      actionLabel={t("eReport.form.projectSearch.continue")}
                    />
                  )}
                  <div className="flex items-center justify-end pt-2">
                    <Button type="button" onClick={() => goToStep("category")} disabled={!selectedProject} className="bg-emerald-600 text-white hover:bg-emerald-700">{t("eReport.form.next")}</Button>
                  </div>
                </div>
              )}

              {currentStep === "farm-operation" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.farmOperation.title")} body={t("eReport.form.farmOperation.body")} />
                  <LocationSelect
                    label={t("eReport.form.fields.farmOperation")}
                    required
                    value={form.farmOperation}
                    placeholder={t("eReport.form.placeholders.farmOperation")}
                    options={FARM_OPERATIONS.map((value) => ({ value, label: value }))}
                    onChange={handleFarmOperationChange}
                  />
                  <div className="flex items-center justify-end pt-2">
                    <Button type="button" onClick={() => goToStep("project-type")} disabled={!form.farmOperation} className="bg-emerald-600 text-white hover:bg-emerald-700">{t("eReport.form.next")}</Button>
                  </div>
                </div>
              )}

              {currentStep === "project-type" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.projectType.title")} body={t("eReport.form.projectType.body")} />
                  <LocationSelect
                    label={t("eReport.form.fields.projectType")}
                    required
                    value={form.projectType}
                    placeholder={t("eReport.form.placeholders.projectType")}
                    options={projectTypeOptions.map((value) => ({ value, label: value }))}
                    onChange={(value) => setValue("projectType", value)}
                  />
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => goToStep("farm-operation", -1)}>{t("eReport.form.back")}</Button>
                    <Button type="button" onClick={() => goToStep("location")} disabled={!form.projectType} className="bg-emerald-600 text-white hover:bg-emerald-700">{t("eReport.form.next")}</Button>
                  </div>
                </div>
              )}

              {currentStep === "location" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.location.title")} body={t("eReport.form.location.body")} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LocationSelect
                      label={t("eReport.form.fields.region")}
                      required
                      value={selectedRegionCode}
                      placeholder={t("eReport.form.placeholders.region")}
                      options={regions}
                      onChange={handleRegionChange}
                    />
                    <LocationSelect
                      label={t("eReport.form.fields.province")}
                      required
                      value={selectedProvinceCode}
                      placeholder={selectedRegionCode ? (isProvincesLoading ? t("eReport.form.placeholders.provinceLoading") : t("eReport.form.placeholders.province")) : t("eReport.form.placeholders.provinceFirst")}
                      options={provinces}
                      onChange={handleProvinceChange}
                      disabled={!selectedRegionCode || isProvincesLoading}
                    />
                    <LocationSelect
                      label={t("eReport.form.fields.city")}
                      required
                      value={selectedCityCode}
                      placeholder={selectedProvinceCode ? (isCitiesLoading ? t("eReport.form.placeholders.cityLoading") : t("eReport.form.placeholders.city")) : t("eReport.form.placeholders.cityFirst")}
                      options={municipalities}
                      onChange={handleCityChange}
                      disabled={!selectedProvinceCode || isCitiesLoading}
                    />
                    <LocationSelect
                      label={t("eReport.form.fields.barangay")}
                      required
                      value={selectedBarangayCode}
                      placeholder={selectedCityCode ? (isBarangaysLoading ? t("eReport.form.placeholders.barangayLoading") : t("eReport.form.placeholders.barangay")) : t("eReport.form.placeholders.barangayFirst")}
                      options={barangays}
                      onChange={handleBarangayChange}
                      disabled={!selectedCityCode || isBarangaysLoading}
                    />
                  </div>
                  <Field label={t("eReport.form.fields.streetLandmark")} value={form.streetLandmark} onChange={(value) => setValue("streetLandmark", value)} />
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => goToStep("project-type", -1)}>{t("eReport.form.back")}</Button>
                    <Button type="button" onClick={() => goToStep("match")} disabled={!form.province || !form.city || !form.barangay || !form.streetLandmark} className="bg-emerald-600 text-white hover:bg-emerald-700">{t("eReport.form.next")}</Button>
                  </div>
                </div>
              )}

              {currentStep === "match" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.match.title")} body={t("eReport.form.match.body")} />
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("eReport.form.match.searchArea")}</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{[form.barangay, form.city, form.province].filter(Boolean).join(", ")}</p>
                  </div>

                  {isSuggestionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950" />
                      ))}
                    </div>
                  ) : suggestedProjects.length > 0 ? (
                    <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                      {suggestedProjects.slice(0, visibleMatchCount).map((project) => {
                        return (
                          <ProjectSuggestionCard
                            key={project.id}
                            project={project}
                            selected={selectedProject?.id === project.id}
                            expanded={expandedProjectId === project.id}
                            onToggle={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
                            onSelect={() => {
                              setSelectedProject(project);
                              goToStep("category");
                            }}
                          />
                        );
                      })}
                      {visibleMatchCount < suggestedProjects.length && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setVisibleMatchCount((count) => count + MATCH_PAGE_SIZE)}
                          className="group w-full gap-2 rounded-full border-slate-300 dark:border-slate-700"
                        >
                          {t("eReport.form.match.seeMore")}
                          <ChevronDown className="size-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                        <Search className="mx-auto mb-3 size-8 text-slate-500" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("eReport.form.match.noMatchTitle")}</p>
                        <p className="mt-1 text-xs text-slate-500">{t("eReport.form.match.noMatchBody")}</p>
                      </div>

                      {isTypeSuggestionsLoading ? (
                        <div className="space-y-3">
                          {[1, 2].map((item) => (
                            <div key={item} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950" />
                          ))}
                        </div>
                      ) : typeSuggestedProjects.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                            <p>{t("eReport.form.match.typeNoticeIntro", { projectType: form.projectType })} <strong>{t("eReport.form.match.typeNoticeStrong")}</strong> {t("eReport.form.match.typeNoticeOutro")}</p>
                          </div>
                          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                            {typeSuggestedProjects.slice(0, visibleTypeMatchCount).map((project) => (
                              <ProjectSuggestionCard
                                key={project.id}
                                project={project}
                                selected={selectedProject?.id === project.id}
                                expanded={expandedProjectId === project.id}
                                onToggle={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
                                onSelect={() => {
                                  setSelectedProject(project);
                                  goToStep("category");
                                }}
                              />
                            ))}
                            {visibleTypeMatchCount < typeSuggestedProjects.length && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setVisibleTypeMatchCount((count) => count + MATCH_PAGE_SIZE)}
                                className="group w-full gap-2 rounded-full border-slate-300 dark:border-slate-700"
                              >
                                {t("eReport.form.match.seeMore")}
                                <ChevronDown className="size-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => goToStep("location", -1)}>{t("eReport.form.back")}</Button>
                    <div className="flex items-center gap-2">
                      {selectedProject && (
                        <Button type="button" variant="ghost" onClick={() => setSelectedProject(null)}>{t("eReport.form.match.clear")}</Button>
                      )}
                      <Button type="button" onClick={() => goToStep("category")} className="bg-emerald-600 text-white hover:bg-emerald-700">
                        {selectedProject ? t("eReport.form.match.use") : t("eReport.form.match.none")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "category" && (
                <div className="space-y-5">
                  <StepHeader
                    title={t("eReport.form.category.title")}
                    body={t("eReport.form.category.body")}
                  />
                  <div
                    role="radiogroup"
                    aria-label={t("eReport.form.category.groupLabel")}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {categoryOptions.map((option) => (
                      <CategoryCard
                        key={option.value}
                        option={option}
                        isSelected={form.category === option.value}
                        isRecommended={option.value === "concerns"}
                        onSelect={() => {
                          if (form.category !== option.value) {
                            setForm((prev) => ({
                              ...prev,
                              category: option.value,
                              issueType: "",
                            }));
                          }
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => goToStep(flowPath === "knows-project" ? "project-search" : "match", -1)}
                    >
                      {t("eReport.form.back")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => goToStep("issue-details")}
                      disabled={!form.category}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {t("eReport.form.next")}
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === "issue-details" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.details.title")} body={t("eReport.form.details.body")} />
                  <IssueTypePicker
                    value={form.issueType}
                    category={form.category}
                    farmOperation={form.farmOperation}
                    onChange={(value) => setValue("issueType", value)}
                  />
                  <div className="sm:max-w-xs">
                    <DateField value={form.dateNoticed} onChange={(value) => setValue("dateNoticed", value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("eReport.form.fields.description")} <span className="text-red-500 dark:text-red-400">*</span></Label>
                      <span className={`text-xs font-medium ${form.issueDescription.trim().length >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-300"}`}>
                        {form.issueDescription.trim().length >= 20
                          ? t("eReport.form.details.minimumMet")
                          : t(
                            20 - form.issueDescription.trim().length === 1
                              ? "eReport.form.details.charsNeededOne"
                              : "eReport.form.details.charsNeededOther",
                            { count: 20 - form.issueDescription.trim().length },
                          )}
                      </span>
                    </div>
                    <Textarea value={form.issueDescription} onChange={(event) => setValue("issueDescription", event.target.value)} placeholder={t("eReport.form.placeholders.description")} className="min-h-32 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                    <p className="text-right text-xs text-slate-500">{form.issueDescription.length}/1000</p>
                  </div>
                  <GeoEvidenceUpload
                    maxFiles={5}
                    disabled={isSubmitting}
                    initialItems={evidence}
                    onEvidenceReady={handleEvidenceReady}
                    onProcessingChange={handleEvidenceProcessingChange}
                  />
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => goToStep("category", -1)}>{t("eReport.form.back")}</Button>
                    <Button type="button" disabled={isEvidenceProcessing} onClick={() => validateIssueDetails() && goToStep("contact")} className="bg-emerald-600 text-white hover:bg-emerald-700">{t("eReport.form.next")}</Button>
                  </div>
                </div>
              )}

              {currentStep === "contact" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.contact.title")} body={t("eReport.form.contact.body")} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("eReport.form.fields.contactNumber")} required value={form.contactNumber} onChange={(value) => setValue("contactNumber", value)} />
                    <Field label={t("eReport.form.fields.emailOptional")} type="email" value={form.email} onChange={(value) => setValue("email", value)} />
                  </div>
                  <CheckRow checked={form.isAnonymous} onChange={(value) => setValue("isAnonymous", value)} label={t("eReport.form.contact.anonymous")} />
                  <CheckRow checked={form.confirmAccuracy} onChange={(value) => setValue("confirmAccuracy", value)} label={t("eReport.form.contact.confirmAccuracy")} />
                  <CheckRow checked={form.agreeToTerms} onChange={(value) => setValue("agreeToTerms", value)} label={t("eReport.form.contact.agreeToTerms")} />
                  <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
                    <Button type="button" variant="ghost" onClick={() => goToStep("issue-details", -1)}>{t("eReport.form.back")}</Button>
                    <Button type="button" size="lg" onClick={handleGoToReview} disabled={isEvidenceProcessing} className="min-w-40 bg-emerald-600 text-white hover:bg-emerald-700">
                      {t("eReport.form.contact.review")}
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === "review" && (
                <div className="space-y-5">
                  <StepHeader title={t("eReport.form.review.title")} body={t("eReport.form.review.body")} />

                  {flowPath === "knows-project" ? (
                    <>
                      <ReviewSection title={t("eReport.form.review.sections.project")} onEdit={() => goToStep("project-search", -1)}>
                        <ReviewRow label={t("eReport.form.review.project")} value={selectedProject?.name || t("eReport.form.values.notSelected")} />
                        <ReviewRow label={t("eReport.form.fields.farmOperation")} value={form.farmOperation || selectedProject?.farmOperation || t("eReport.form.values.notSpecified")} />
                      </ReviewSection>
                      <ReviewSection title={t("eReport.form.review.sections.category")} onEdit={() => goToStep("category", -1)}>
                        <ReviewRow label={t("eReport.form.review.category")} value={categoryDisplay} />
                      </ReviewSection>
                    </>
                  ) : (
                    <>
                      <ReviewSection title={t("eReport.form.review.sections.farmOperation")} onEdit={() => goToStep("farm-operation", -1)}>
                        <ReviewRow label={t("eReport.form.fields.farmOperation")} value={form.farmOperation || t("eReport.form.values.notSelected")} />
                        <ReviewRow label={t("eReport.form.fields.projectType")} value={form.projectType || t("eReport.form.values.notSelected")} />
                      </ReviewSection>
                      <ReviewSection title={t("eReport.form.review.sections.location")} onEdit={() => goToStep("location", -1)}>
                        <ReviewRow label={t("eReport.form.fields.region")} value={form.region || t("eReport.form.values.notProvided")} />
                        <ReviewRow label={t("eReport.form.fields.province")} value={form.province || t("eReport.form.values.notProvided")} />
                        <ReviewRow label={t("eReport.form.fields.city")} value={form.city || t("eReport.form.values.notProvided")} />
                        <ReviewRow label={t("eReport.form.fields.barangay")} value={form.barangay || t("eReport.form.values.notProvided")} />
                        <ReviewRow label={t("eReport.form.fields.streetLandmark")} value={form.streetLandmark || t("eReport.form.values.notProvided")} />
                        <ReviewRow label={t("eReport.form.review.matchedProject")} value={selectedProject?.name || t("eReport.form.review.noMatch")} />
                      </ReviewSection>
                      <ReviewSection title={t("eReport.form.review.sections.category")} onEdit={() => goToStep("category", -1)}>
                        <ReviewRow label={t("eReport.form.review.category")} value={categoryDisplay} />
                      </ReviewSection>
                    </>
                  )}

                  <ReviewSection title={t("eReport.form.review.sections.details")} onEdit={() => goToStep("issue-details", -1)}>
                    <ReviewRow label={t("eReport.form.review.issueType")} value={parseIssueTypeValue(form.issueType).map((label) => issueTypeText(label, t)).join(", ") || t("eReport.form.values.notSelected")} />
                    <ReviewRow label={t("eReport.form.fields.dateNoticed")} value={form.dateNoticed || t("eReport.form.values.notProvided")} />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("eReport.form.fields.description")}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{form.issueDescription || t("eReport.form.values.notProvided")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("eReport.form.review.evidence", { count: evidence.length })}</p>
                      {evidence.length === 0 ? (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("eReport.form.review.noEvidence")}</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {evidence.map((item, index) => {
                            const EvidenceIcon = item.type === "image" ? ImageIcon : VideoIcon;
                            return (
                              <li key={index} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <EvidenceIcon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                                <span className="truncate">{item.file.name}</span>
                                {item.lat !== null && item.lon !== null && (
                                  <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("eReport.form.review.geotagged")}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </ReviewSection>

                  <ReviewSection title={t("eReport.form.review.sections.contact")} onEdit={() => goToStep("contact", -1)}>
                    <ReviewRow label={t("eReport.form.fields.contactNumber")} value={form.contactNumber || t("eReport.form.values.notProvided")} />
                    <ReviewRow label={t("eReport.form.fields.email")} value={form.email || t("eReport.form.values.notProvided")} />
                    <ReviewRow label={t("eReport.form.review.submittingAs")} value={form.isAnonymous ? t("eReport.form.review.anonymous") : user?.name || t("eReport.form.review.signedInCitizen")} />
                  </ReviewSection>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
                    <Button type="button" variant="ghost" onClick={() => goToStep("contact", -1)}>{t("eReport.form.back")}</Button>
                    <Button type="button" size="lg" onClick={handleSubmitClick} disabled={isSubmitting || isEvidenceProcessing || showPreSubmitSurvey} className="min-w-40 bg-emerald-600 text-white hover:bg-emerald-700">
                      {isSubmitting ? t("eReport.form.review.submitting") : t("eReport.form.review.submit")}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SubmissionSurveyModal
        isOpen={showPreSubmitSurvey}
        onClose={() => setShowPreSubmitSurvey(false)}
        onComplete={() => {
          setShowPreSubmitSurvey(false);
          submitIssueReport();
        }}
        sourceType="e_report"
        sourceId={null}
        defaultName={form.isAnonymous ? "" : user?.name || ""}
      />
    </div>
  );
}


function StepProgress({ steps, currentStepIndex }: { steps: StepDefinition[]; currentStepIndex: number }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const lineDuration = prefersReducedMotion ? 0 : 0.4;
  const nodeDuration = prefersReducedMotion ? 0 : 0.25;
  const dotDuration = prefersReducedMotion ? 0 : 0.3;

  return (
    <nav aria-label={t("eReport.form.progressLabel")} className="mb-8 w-full">
      <ol className="relative hidden items-center justify-between md:flex">
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
                {t(`eReport.form.steps.${step.labelKey}`)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col items-center gap-2 md:hidden" role="status" aria-live="polite">
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
        <p className="text-xs text-slate-500 dark:text-slate-400">{steps[currentStepIndex] ? t(`eReport.form.steps.${steps[currentStepIndex].labelKey}`) : null} ({currentStepIndex + 1}/{steps.length})</p>
      </div>
    </nav>
  );
}

function formatBudget(value: number | undefined, unavailable: string) {
  if (!value || value <= 0) return unavailable;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function extractGeotagUrls(metadata?: Record<string, unknown>) {
  const buckets = [
    metadata?.geotag,
    metadata?.geotags,
    metadata?.photos,
    metadata?.photoUrls,
    metadata?.validationPhotos,
    metadata?.completedPhotos,
    metadata?.validation_photos,
    metadata?.completed_photos,
  ];
  const geotags = buckets.flatMap((bucket) => Array.isArray(bucket) ? bucket : []);

  return geotags
    .map((tag): string | null => {
      if (typeof tag === "string") return safePublicSourceMediaUrl(getFullUrl(tag));
      if (!tag || typeof tag !== "object") return null;
      const record = tag as Record<string, unknown>;
      const candidate = record.url ?? record.photo_url ?? record.image_url ?? record.path;
      return typeof candidate === "string"
        ? safePublicSourceMediaUrl(getFullUrl(candidate))
        : null;
    })
    .filter((url): url is string => Boolean(url));
}

function ProjectSuggestionCard({
  project,
  selected,
  expanded,
  onToggle,
  onSelect,
  actionLabel,
}: {
  project: SelectedProject;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  actionLabel?: string;
}) {
  const { t } = useTranslation();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const { data: details, isFetching } = useQuery<ProjectDetails | null>({
    queryKey: ["issue-project-detail", project.sourceId || project.id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.sourceId || project.id)}`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    },
    enabled: expanded,
    staleTime: 60000,
  });

  const photoUrls = extractGeotagUrls(details?.metadata);
  const currentPhoto = photoUrls[carouselIndex];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`overflow-hidden rounded-xl border bg-white transition-colors dark:bg-slate-950 ${selected ? "border-emerald-500" : "border-slate-200 dark:border-slate-700"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3.5 text-left">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
          {selected ? <Check className="size-4" /> : <Building2 className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{project.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {project.sourceProjectId && <span className="font-mono text-xs text-slate-500">{project.sourceProjectId}</span>}
            {(details?.stage || details?.status) && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{details.stage || details.status}</span>}
          </div>
        </div>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 1 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-800">
            {isFetching ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-emerald-500" />
              </div>
            ) : (
              <>
                {currentPhoto ? (
                  <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        setViewerIndex(carouselIndex);
                        setViewerOpen(true);
                      }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={currentPhoto}
                        alt={t("eReport.form.projectCard.photoAlt", { name: project.name })}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 672px"
                        unoptimized={isLocalMinIO(currentPhoto)}
                      />
                    </button>

                    {photoUrls.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCarouselIndex((previous) => (previous - 1 + photoUrls.length) % photoUrls.length);
                          }}
                          className="absolute left-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCarouselIndex((previous) => (previous + 1) % photoUrls.length);
                          }}
                          className="absolute right-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1">
                          {photoUrls.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setCarouselIndex(index);
                              }}
                              className={`size-1.5 rounded-full transition-all ${index === carouselIndex ? "scale-125 bg-white" : "bg-white/50"}`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    <MediaViewer
                      media={photoUrls.map((url) => ({ type: "image" as const, url }))}
                      initialIndex={viewerIndex}
                      open={viewerOpen}
                      onClose={() => setViewerOpen(false)}
                    />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center bg-slate-100 text-xs text-slate-500 dark:bg-slate-900">
                    {t("eReport.form.projectCard.noPhotos")}
                  </div>
                )}

                <div className="space-y-4 p-4">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">{t("eReport.form.projectCard.details")}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <ProjectDetailItem icon={<MapPin className="size-4" />} label={t("eReport.form.projectCard.location")} value={details?.location || [project.municipality, project.province].filter(Boolean).join(", ") || t("eReport.form.values.unavailable")} />
                    <ProjectDetailItem icon={<Building2 className="size-4" />} label={t("eReport.form.projectCard.agency")} value={details?.implementingAgency || "BAFE"} />
                    <ProjectDetailItem icon={<Banknote className="size-4" />} label={t("eReport.form.projectCard.budget")} value={formatBudget(details?.budget, t("eReport.form.values.unavailable"))} />
                    <ProjectDetailItem icon={<Activity className="size-4" />} label={t("eReport.form.projectCard.status")} value={details?.stage || details?.status || t("eReport.form.values.unavailable")} />
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
                  <Link
                    href={`/projects/${project.sourceId || project.id}?tab=feedback`}
                    target="_blank"
                    className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                  >
                    <MessageSquare className="size-4 shrink-0" />
                    <span className="flex-1">{t("eReport.form.projectCard.leaveFeedback")}</span>
                    <ExternalLink className="size-3.5 shrink-0" />
                  </Link>
                  <Button type="button" onClick={onSelect} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <AlertTriangle className="mr-2 size-3.5" />
                    {actionLabel ?? t("eReport.form.projectCard.select")}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectDetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-words text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}


function StepHeader({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {t("eReport.form.review.edit")}
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

function Field({ label, value, onChange, type = "text", icon, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; icon?: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
      </Label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
        <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`h-10 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${icon ? "pl-9" : ""}`} />
      </div>
    </div>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("eReport.form.fields.dateNoticed")} <span className="text-red-500 dark:text-red-400">*</span></Label>
      <button type="button" onClick={openPicker} className="relative block w-full text-left">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className="h-10 border-slate-200 bg-white pl-9 text-slate-900 [color-scheme:light] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
        />
      </button>
    </div>
  );
}

function LocationSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: LocationOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
      </Label>
      <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)} disabled={disabled}>
        <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-slate-900 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          <span className={selectedLabel ? "truncate text-slate-900 dark:text-slate-100" : "truncate text-slate-500"}>
            {selectedLabel || placeholder}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}

function CategoryCard({
  option,
  isSelected,
  isRecommended,
  disabled,
  onSelect,
}: {
  option: { value: ReportCategory; label: string; icon: LucideIcon; description: string };
  isSelected: boolean;
  isRecommended?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const Icon = option.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950",
        isSelected
          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-700",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-bold">{t(`eReport.categories.${option.value}.label`)}</span>
          {isRecommended && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              {t("eReport.form.category.suggested")}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium opacity-80">{t(`eReport.categories.${option.value}.description`)}</p>
      </div>
      {isSelected && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500">
          <Check className="size-3 stroke-[3]" aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
