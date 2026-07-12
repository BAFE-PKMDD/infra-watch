"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Activity,
  Banknote,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileImage,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Trash2,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectSearchInput, type SelectedProject } from "@/components/ui/project-search-input";
import { MediaViewer } from "@/components/ui/media-viewer";
import { dispatchClientNotification } from "@/lib/client-notifications";
import { useAuth } from "@/providers/auth-provider";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { getUploadErrorTitle } from "@/lib/upload-errors";
import { isAllowedClientUploadType, UPLOAD_ACCEPT, uploadKindFromType } from "@/lib/upload-policy";
import {
  getBarangays,
  getMunicipalities,
  getProvinces,
  getRegions,
  type LocationOption,
} from "@/actions/query/get-location-options";

type FlowPath = "knows-project" | "no-project" | null;
type StepId = "awareness" | "project-search" | "location" | "match" | "issue-details" | "contact";

type StepDefinition = {
  id: StepId;
  label: string;
  icon: LucideIcon;
};

type EvidenceItem = {
  type: "image" | "video";
  url: string;
  preview: string;
  name: string;
};

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
  metadata?: Record<string, any>;
};

const issueTypes = [
  { value: "infrastructure", label: "Infrastructure Issues" },
  { value: "damage", label: "Equipment Damage" },
  { value: "delay", label: "Construction Delay" },
  { value: "flooding", label: "Water Leak / Flooding" },
  { value: "safety", label: "Safety Hazard" },
  { value: "other", label: "Other" },
];

const stepsKnowsProject: StepDefinition[] = [
  { id: "awareness", label: "Start", icon: HelpCircle },
  { id: "project-search", label: "Project", icon: Search },
  { id: "issue-details", label: "Details", icon: FileText },
  { id: "contact", label: "Submit", icon: User },
];

const stepsNoProject: StepDefinition[] = [
  { id: "awareness", label: "Start", icon: HelpCircle },
  { id: "location", label: "Location", icon: MapPin },
  { id: "match", label: "Match", icon: Search },
  { id: "issue-details", label: "Details", icon: FileText },
  { id: "contact", label: "Submit", icon: User },
];

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

export default function ReportIssuePage() {
  const router = useRouter();
  const { user, isLoading: isSessionLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<StepId>("awareness");
  const [flowPath, setFlowPath] = useState<FlowPath>(null);
  const [direction, setDirection] = useState(1);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [selectedBarangayCode, setSelectedBarangayCode] = useState("");

  const [form, setForm] = useState({
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
      router.push("/sign-in?redirect=/report-issue/new");
    }
  }, [isSessionLoading, router, user]);

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

  const { data: suggestedProjects = [], isFetching: isSuggestionsLoading } = useQuery({
    queryKey: ["issue-project-suggestions", form.province, form.city],
    queryFn: async (): Promise<SelectedProject[]> => {
      const searchTerm = form.city || form.province;
      if (!searchTerm) return [];
      const response = await fetch(`/api/projects?search=${encodeURIComponent(searchTerm)}&limit=5`);
      if (!response.ok) throw new Error("Failed to find nearby projects");
      const result = await response.json();
      return (result.data || []).map((project: any) => ({
        id: project.id,
        name: project.name,
        sourceId: project.sourceId,
        sourceProjectId: project.code,
        province: project.province,
        municipality: project.municipality,
      }));
    },
    enabled: currentStep === "match" && !!(form.city || form.province),
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
  };

  const handleEvidenceChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    if (evidence.length + files.length > 5) {
      toast.error("You can attach up to 5 evidence files.");
      return;
    }

    try {
      setIsUploading(true);
      const uploaded: EvidenceItem[] = [];

      for (const file of files) {
        const fileType = uploadKindFromType(file.type);
        if (!fileType || !isAllowedClientUploadType(file.type)) {
          toast.error(`"${file.name}" is not an allowed image or video type.`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload?folder=issues", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Failed to upload evidence");

        const path = data.path || data.url;
        uploaded.push({
          type: fileType,
          url: path,
          preview: getFullUrl(path) || URL.createObjectURL(file),
          name: file.name,
        });
      }

      setEvidence((prev) => [...prev, ...uploaded]);
      toast.success("Evidence uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload evidence";
      toast.error(getUploadErrorTitle(message), {
        description: message,
        duration: 6500,
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const validateIssueDetails = () => {
    if (!form.issueType) {
      toast.error("Please select an issue type.");
      return false;
    }
    if (form.issueDescription.trim().length < 20) {
      toast.error("Description must be at least 20 characters.");
      return false;
    }
    if (!form.dateNoticed) {
      toast.error("Please provide the date noticed.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!form.contactNumber.trim()) {
      toast.error("Contact number is required.");
      return;
    }
    if (!form.confirmAccuracy || !form.agreeToTerms) {
      toast.error("Please confirm accuracy and agree to the terms.");
      return;
    }

    try {
      setIsSubmitting(true);
      const photoUrls = evidence.filter((item) => item.type === "image").map((item) => item.url);
      const videoUrls = evidence.filter((item) => item.type === "video").map((item) => item.url);

      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject?.sourceId || selectedProject?.id || null,
          region: form.region || "N/A",
          province: form.province || "N/A",
          city: form.city || "N/A",
          barangay: form.barangay || "N/A",
          streetLandmark: form.streetLandmark || "N/A",
          issueType: form.issueType,
          issueDescription: form.issueDescription,
          dateNoticed: form.dateNoticed,
          reporterName: form.isAnonymous ? "Anonymous" : user?.name || "Citizen",
          reporterContact: form.contactNumber,
          reporterEmail: form.email || null,
          isAnonymous: form.isAnonymous,
          photoUrls,
          videoUrls,
          documentUrls: [],
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.details || "Failed to submit issue");

      toast.success("Issue reported successfully");
      dispatchClientNotification({
        type: "issue_created",
        title: "E-Report submitted",
        message: data.message || "Your issue report was submitted for review.",
        metadata: {
          issueId: data.data?.id,
          ticketNumber: data.data?.ticketNumber,
          projectId: selectedProject?.sourceId || selectedProject?.id || null,
        },
      });
      router.push(`/report-issue/${data.data?.id || ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit issue");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Back to Reported Issues
        </Link>

        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-slate-950 dark:text-white">Report an Issue</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Help us improve by reporting issues you&apos;ve noticed in your community</p>
        </div>

        {flowPath && <StepProgress steps={activeSteps} currentStepIndex={currentStepIndex} />}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
              {currentStep === "awareness" && (
                <div className="space-y-7 text-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white">Is this issue related to a specific project?</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">This helps us respond to your report faster</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChoiceCard
                      icon={<Search className="size-7" />}
                      title="Yes, I know the project"
                      body="I can search for the project by name or code"
                      onClick={() => {
                        setFlowPath("knows-project");
                        goToStep("project-search");
                      }}
                    />
                    <ChoiceCard
                      icon={<MapPin className="size-7" />}
                      title="No, I'm not sure"
                      body="I'll describe the location and we'll find nearby projects"
                      onClick={() => {
                        setFlowPath("no-project");
                        goToStep("location");
                      }}
                    />
                  </div>
                </div>
              )}

              {currentStep === "project-search" && (
                <div className="space-y-6">
                  <StepHeader title="Find the related project" body="Search by project name, code, municipality, or province." />
                  <ProjectSearchInput value={selectedProject} onSelect={handleProjectSelect} onClear={() => setSelectedProject(null)} autoFocus />
                  {selectedProject && (
                    <ProjectSuggestionCard
                      project={selectedProject}
                      selected
                      expanded
                      onToggle={() => undefined}
                      onSelect={() => goToStep("issue-details")}
                      actionLabel="Continue with this Project"
                    />
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => { setFlowPath(null); goToStep("awareness", -1); }}>Back</Button>
                    <Button type="button" onClick={() => goToStep("issue-details")} disabled={!selectedProject} className="bg-emerald-600 text-white hover:bg-emerald-700">Next</Button>
                  </div>
                </div>
              )}

              {currentStep === "location" && (
                <div className="space-y-5">
                  <StepHeader title="Where did you notice the issue?" body="Provide the best location details you know." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LocationSelect
                      label="Region"
                      required
                      value={selectedRegionCode}
                      placeholder="Select region"
                      options={regions}
                      onChange={handleRegionChange}
                    />
                    <LocationSelect
                      label="Province"
                      required
                      value={selectedProvinceCode}
                      placeholder={selectedRegionCode ? (isProvincesLoading ? "Loading provinces..." : "Select province") : "Select region first"}
                      options={provinces}
                      onChange={handleProvinceChange}
                      disabled={!selectedRegionCode || isProvincesLoading}
                    />
                    <LocationSelect
                      label="City / Municipality"
                      required
                      value={selectedCityCode}
                      placeholder={selectedProvinceCode ? (isCitiesLoading ? "Loading cities..." : "Select city") : "Select province first"}
                      options={municipalities}
                      onChange={handleCityChange}
                      disabled={!selectedProvinceCode || isCitiesLoading}
                    />
                    <LocationSelect
                      label="Barangay"
                      required
                      value={selectedBarangayCode}
                      placeholder={selectedCityCode ? (isBarangaysLoading ? "Loading barangays..." : "Select barangay") : "Select city first"}
                      options={barangays}
                      onChange={handleBarangayChange}
                      disabled={!selectedCityCode || isBarangaysLoading}
                    />
                  </div>
                  <Field label="Street / Landmark" value={form.streetLandmark} onChange={(value) => setValue("streetLandmark", value)} />
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => { setFlowPath(null); goToStep("awareness", -1); }}>Back</Button>
                    <Button type="button" onClick={() => goToStep("match")} disabled={!form.province || !form.city || !form.barangay || !form.streetLandmark} className="bg-emerald-600 text-white hover:bg-emerald-700">Next</Button>
                  </div>
                </div>
              )}

              {currentStep === "match" && (
                <div className="space-y-5">
                  <StepHeader title="Match a nearby project" body="Select the related project if it appears below, or continue without a project match." />
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Search area</p>
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
                      {suggestedProjects.map((project) => {
                        return (
                          <ProjectSuggestionCard
                            key={project.id}
                            project={project}
                            selected={selectedProject?.id === project.id}
                            expanded={expandedProjectId === project.id}
                            onToggle={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
                            onSelect={() => {
                              setSelectedProject(project);
                              goToStep("issue-details");
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                      <Search className="mx-auto mb-3 size-8 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No nearby project match found</p>
                      <p className="mt-1 text-xs text-slate-500">You can still continue and submit this report without linking it to a project.</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => goToStep("location", -1)}>Back</Button>
                    <div className="flex items-center gap-2">
                      {selectedProject && (
                        <Button type="button" variant="ghost" onClick={() => setSelectedProject(null)}>Clear Match</Button>
                      )}
                      <Button type="button" onClick={() => goToStep("issue-details")} className="bg-emerald-600 text-white hover:bg-emerald-700">
                        {selectedProject ? "Use Match" : "Continue"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "issue-details" && (
                <div className="space-y-5">
                  <StepHeader title="Issue details" body="Describe what happened and attach photos or videos when available." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Issue Type <span className="text-red-500 dark:text-red-400">*</span></Label>
                      <Select value={form.issueType} onValueChange={(value) => value && setValue("issueType", value)}>
                        <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                        <SelectContent>
                          {issueTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <DateField value={form.dateNoticed} onChange={(value) => setValue("dateNoticed", value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description <span className="text-red-500 dark:text-red-400">*</span></Label>
                      <span className={`text-[11px] font-medium ${form.issueDescription.trim().length >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-300"}`}>
                        {form.issueDescription.trim().length >= 20
                          ? "Minimum met"
                          : `${20 - form.issueDescription.trim().length} more character${20 - form.issueDescription.trim().length === 1 ? "" : "s"} required`}
                      </span>
                    </div>
                    <Textarea value={form.issueDescription} onChange={(event) => setValue("issueDescription", event.target.value)} placeholder="Provide clear details about the issue..." className="min-h-32 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                    <p className="text-right text-[11px] text-slate-500">{form.issueDescription.length}/1000</p>
                  </div>
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/70">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
                      <Upload className="size-7 text-emerald-400" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{isUploading ? "Uploading..." : "Upload photos or videos"}</span>
                      <span className="text-xs text-slate-500">PNG, JPG, WebP, GIF, MP4, MOV, WebM</span>
                      <input type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" onChange={handleEvidenceChange} disabled={isUploading} />
                    </label>
                  </div>
                  {evidence.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {evidence.map((item, index) => (
                        <div key={`${item.url}-${index}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                          <div className="relative aspect-video bg-slate-100 dark:bg-slate-900">
                            {item.type === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.preview} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <video src={item.preview} className="h-full w-full object-cover" controls preload="metadata" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeEvidence(index)}
                              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-slate-950/85 text-slate-300 transition-colors hover:bg-red-500 hover:text-white"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <FileImage className="size-4 shrink-0 text-emerald-400" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">{item.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => goToStep(flowPath === "knows-project" ? "project-search" : "match", -1)}>Back</Button>
                    <Button type="button" onClick={() => validateIssueDetails() && goToStep("contact")} className="bg-emerald-600 text-white hover:bg-emerald-700">Next</Button>
                  </div>
                </div>
              )}

              {currentStep === "contact" && (
                <div className="space-y-5">
                  <StepHeader title="Contact and consent" body="Your contact information helps moderators validate the report." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact Number" required value={form.contactNumber} onChange={(value) => setValue("contactNumber", value)} />
                    <Field label="Email Address (Optional)" type="email" value={form.email} onChange={(value) => setValue("email", value)} />
                  </div>
                  <CheckRow checked={form.isAnonymous} onChange={(value) => setValue("isAnonymous", value)} label="Submit as anonymous" />
                  <CheckRow checked={form.confirmAccuracy} onChange={(value) => setValue("confirmAccuracy", value)} label="I confirm that the information provided is accurate." />
                  <CheckRow checked={form.agreeToTerms} onChange={(value) => setValue("agreeToTerms", value)} label="I agree to the Terms of Service and Privacy Policy." />
                  <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
                    <Button type="button" variant="ghost" onClick={() => goToStep("issue-details", -1)}>Back</Button>
                    <Button type="button" size="lg" onClick={handleSubmit} disabled={isSubmitting} className="min-w-40 bg-emerald-600 text-white hover:bg-emerald-700">
                      {isSubmitting ? "Submitting..." : "Submit Issue"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepProgress({ steps, currentStepIndex }: { steps: StepDefinition[]; currentStepIndex: number }) {
  return (
    <div className="mb-8 w-full">
      <div className="relative hidden items-center justify-between md:flex">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
        <motion.div
          className="absolute left-0 top-5 h-0.5 bg-emerald-500"
          initial={false}
          animate={{ width: steps.length > 1 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : "0%" }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted || isCurrent ? "rgb(5 150 105)" : "rgb(241 245 249)",
                }}
                transition={{ duration: 0.25 }}
                className={`flex size-10 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-950 ${isCompleted || isCurrent ? "text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {isCompleted ? <Check className="size-4" /> : <StepIcon className="size-4" />}
              </motion.div>
              <span className={`max-w-20 text-center text-xs font-medium leading-tight ${isCurrent ? "text-emerald-600 dark:text-emerald-400" : isCompleted ? "text-slate-700 dark:text-slate-300" : "text-slate-500"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 md:hidden">
        <div className="flex items-center gap-2">
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
                transition={{ duration: 0.3 }}
                className="h-2 rounded-full"
              />
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{steps[currentStepIndex]?.label} ({currentStepIndex + 1}/{steps.length})</p>
      </div>
    </div>
  );
}

function formatBudget(value?: number) {
  if (!value || value <= 0) return "N/A";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function extractGeotagUrls(metadata?: Record<string, any>) {
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
    .map((tag: any) => typeof tag === "string" ? tag : tag?.url || tag?.photo_url || tag?.image_url || tag?.path)
    .filter(Boolean)
    .map((url: string) => getFullUrl(url))
    .filter(Boolean) as string[];
}

function ProjectSuggestionCard({
  project,
  selected,
  expanded,
  onToggle,
  onSelect,
  actionLabel = "Select this Project",
}: {
  project: SelectedProject;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  actionLabel?: string;
}) {
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
                        alt={`${project.name} geotagged photo`}
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
                    No geotagged photos available for this project
                  </div>
                )}

                <div className="space-y-4 p-4">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Project Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <ProjectDetailItem icon={<MapPin className="size-4" />} label="Location" value={details?.location || [project.municipality, project.province].filter(Boolean).join(", ") || "N/A"} />
                    <ProjectDetailItem icon={<Building2 className="size-4" />} label="Agency" value={details?.implementingAgency || "BAFE"} />
                    <ProjectDetailItem icon={<Banknote className="size-4" />} label="Budget" value={formatBudget(details?.budget)} />
                    <ProjectDetailItem icon={<Activity className="size-4" />} label="Status" value={details?.stage || details?.status || "N/A"} />
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
                  <Link
                    href={`/projects/${project.sourceId || project.id}?tab=feedback`}
                    target="_blank"
                    className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                  >
                    <MessageSquare className="size-4 shrink-0" />
                    <span className="flex-1">Click here! You might want to visit this project and leave feedback instead</span>
                    <ExternalLink className="size-3.5 shrink-0" />
                  </Link>
                  <Button type="button" onClick={onSelect} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <AlertTriangle className="mr-2 size-3.5" />
                    {actionLabel}
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

function ChoiceCard({ icon, title, body, onClick }: { icon: ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">{icon}</div>
      <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </button>
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
      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date Noticed <span className="text-red-500 dark:text-red-400">*</span></Label>
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
