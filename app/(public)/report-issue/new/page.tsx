"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronRight, 
  Camera, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle,
  Check,
  Lock,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Droplets,
  X,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { addMockIssue } from "@/lib/issues-mock-store";

const mockProjects = [
  { id: "PRJ-INS-2025-115", name: "Solar Powered Irrigation Pump System", location: "Abuyog, Leyte" },
  { id: "PRJ-INS-2023-009", name: "Dingle Diversion Dam Rehabilitation", location: "Abuyog, Leyte" },
  { id: "PRJ-AMSS-2024-042", name: "Post-Harvest Mechanical Grain Dryer Installation", location: "Balamban, Cebu" },
  { id: "PRJ-AMSS-2026-002", name: "Agricultural Warehouse and Storage Facility", location: "Basey, Samar" },
  { id: "PRJ-INS-2024-108", name: "Concrete Drainage and Irrigation Canal", location: "Basey, Samar" },
];

const categories = [
  { id: "damage", label: "Equipment Damage", desc: "Cracks, leaks, rust, mechanical breakdown", icon: ShieldAlert },
  { id: "delay", label: "Construction Delay", desc: "Stoppage, unworked site, abandoned materials", icon: AlertTriangle },
  { id: "flooding", label: "Water Leak / Flooding", desc: "Broken canals, pipeline bursts, overflow", icon: Droplets },
  { id: "other", label: "Other Anomalies", desc: "General issues, suspect reports, safety hazards", icon: HelpCircle },
] as const;

export default function ReportIssueNew() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Wizard states
  const [reportStep, setReportStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Detailed location states
  const [region, setRegion] = useState("Eastern Visayas (Region VIII)");
  const [province, setProvince] = useState("Leyte");
  const [city, setCity] = useState("Abuyog");
  const [barangay, setBarangay] = useState("Bito");
  const [streetLandmark, setStreetLandmark] = useState("");
  const [dateNoticed, setDateNoticed] = useState("2026-06-23");
  const [base64Image, setBase64Image] = useState<string>("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Project search filtering
  const filteredProjects = mockProjects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.location.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const projectLocationDetails: Record<string, { region: string; province: string; city: string; barangay: string; landmark: string }> = {
    "Solar Powered Irrigation Pump System": {
      region: "Eastern Visayas (Region VIII)",
      province: "Leyte",
      city: "Abuyog",
      barangay: "Bito",
      landmark: "Near the irrigation canal inlet sector A"
    },
    "Dingle Diversion Dam Rehabilitation": {
      region: "Western Visayas (Region VI)",
      province: "Iloilo",
      city: "Dingle",
      barangay: "San Matias",
      landmark: "Beside the access road near the reservoir entrance"
    },
    "Post-Harvest Mechanical Grain Dryer Installation": {
      region: "Central Visayas (Region VII)",
      province: "Cebu",
      city: "Balamban",
      barangay: "Nangka",
      landmark: "Main building, processing floor 2"
    },
    "Agricultural Warehouse and Storage Facility": {
      region: "Eastern Visayas (Region VIII)",
      province: "Samar",
      city: "Basey",
      barangay: "Lihid",
      landmark: "Behind the solar drying pavement"
    },
    "Concrete Drainage and Irrigation Canal": {
      region: "Eastern Visayas (Region VIII)",
      province: "Samar",
      city: "Basey",
      barangay: "Simeon",
      landmark: "Irrigation canal sector 4, near the rice fields boundary"
    }
  };

  const handleProjectSelect = (projectName: string) => {
    setSelectedProject(projectName);
    const loc = projectLocationDetails[projectName] || {
      region: "Eastern Visayas (Region VIII)",
      province: "Leyte",
      city: "Abuyog",
      barangay: "Bito",
      landmark: ""
    };
    setRegion(loc.region);
    setProvince(loc.province);
    setCity(loc.city);
    setBarangay(loc.barangay);
    setStreetLandmark(loc.landmark);
    goToStep(2);
    toast.success(`Selected: ${projectName}`, {
      description: "Proceed to Step 2 to locate & upload evidence."
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.info("Image attached successfully", {
        description: "GPS location metadata will be parsed upon submission."
      });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setBase64Image("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const goToStep = (nextStep: number) => {
    setDirection(nextStep > reportStep ? 1 : -1);
    setReportStep(nextStep);
  };

  const handleIssueSubmit = () => {
    if (reportStep === 3) {
      if (!isAnonymous && (!reporterName || !reporterPhone)) {
        toast.error("Please fill in contact details or select anonymous submission.");
        return;
      }
      
      const selectedProjObj = mockProjects.find(p => p.name === selectedProject);
      const selectedCatObj = categories.find(c => c.id === issueType);

      // Add to mock store
      const added = addMockIssue({
        projectName: selectedProject,
        projectId: selectedProjObj?.id || "PRJ-INS-XX",
        category: selectedCatObj?.label || "General Issue",
        description: description,
        reporter: isAnonymous ? "Anonymous" : `${reporterName} (Verified)`,
        region,
        province,
        city,
        barangay,
        streetLandmark,
        reporterPhone: isAnonymous ? undefined : reporterPhone,
        reporterEmail: isAnonymous ? undefined : reporterEmail,
        isAnonymous,
        dateNoticed: new Date(dateNoticed).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        photoUrl: base64Image || undefined
      });

      toast.success("Issue report submitted successfully!", {
        description: `Tracking ticket ID ${added.id} has been registered.`
      });

      // Redirect back to feed landing
      router.push("/report-issue");
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" as const }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      transition: { duration: 0.18, ease: "easeIn" as const }
    })
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 lg:py-20 min-h-screen flex flex-col justify-center font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 w-full">
        
        {/* Left Column: Guides (FAQ) */}
        <div className="lg:col-span-5 hidden lg:flex flex-col justify-between py-2 border-r border-slate-100 dark:border-slate-850/80 pr-10 lg:pr-14">
          <div>
            {/* Back Link */}
            <button
              onClick={() => router.push("/report-issue")}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-8 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
            </button>

            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Report an Issue
            </h1>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-3 leading-relaxed">
              Help BAFE identify and coordinate repairs for machinery or irrigation network damages. File a quick report to alert engineering moderators.
            </p>

            <div className="space-y-6 mt-10">
              <div className="flex gap-4">
                <div className="p-2.5 bg-primary/5 dark:bg-primary/10 text-primary rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Exif Location Extraction</h4>
                  <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                    Upload photos taken on-site. Our coordination system automatically extracts GPS coordinates to verify the exact location of the damage.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-2.5 bg-accent/5 dark:bg-accent/10 text-accent rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Secure Privacy Controls</h4>
                  <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                    Submit anonymously to the public timeline. Your personal identity is encrypted and only visible to authorized BAFE administrators.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Rapid Response & Moderation</h4>
                  <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                    Once submitted, our coordination team reviews and updates the project status, alerting the assigned engineering division.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-450 font-bold flex items-center gap-1.5 mt-8">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Need assistance? Contact support at support@infra.gov.ph
          </div>
        </div>

        {/* Right Column: Wizard Form */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Mobile Back Link and Title */}
          <div className="lg:hidden mb-6 flex flex-col gap-3">
            <button
              onClick={() => router.push("/report-issue")}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Report an Issue</h1>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                Help BAFE identify and coordinate repairs for machinery or irrigation network damages.
              </p>
            </div>
          </div>

          {/* Stepper HUD */}
          <div className="relative flex items-center justify-between w-full mb-8 pt-4">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800" />
            <div 
              className="absolute top-1/2 -translate-y-1/2 left-0 h-0.5 bg-primary transition-all duration-300"
              style={{ width: `${((reportStep - 1) / 2) * 100}%` }}
            />
            
            {/* Steps nodes */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                reportStep >= 1 ? "bg-primary border-primary text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-450"
              }`}>
                {reportStep > 1 ? <Check className="w-4.5 h-4.5" /> : 1}
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider mt-2 ${reportStep >= 1 ? "text-slate-800 dark:text-white" : "text-slate-450"}`}>Select Project</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                reportStep >= 2 ? "bg-primary border-primary text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-450"
              }`}>
                {reportStep > 2 ? <Check className="w-4.5 h-4.5" /> : 2}
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider mt-2 ${reportStep >= 2 ? "text-slate-800 dark:text-white" : "text-slate-455"}`}>Details</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                reportStep >= 3 ? "bg-primary border-primary text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-450"
              }`}>
                3
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider mt-2 ${reportStep >= 3 ? "text-slate-800 dark:text-white" : "text-slate-455"}`}>Submit</span>
            </div>
          </div>

          {/* Wizard Content Card */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200/85 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 overflow-hidden min-h-[380px] flex flex-col justify-between">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={reportStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full flex-1 flex flex-col justify-between"
                >
                  {/* STEP 1: Select Project */}
                  {reportStep === 1 && (
                    <div className="space-y-5 flex-1">
                      <div>
                        <Label className="text-xs font-bold text-slate-705 dark:text-slate-300 block mb-2">
                          1. Select the project with the active issue:
                        </Label>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
                          <Input 
                            type="text" 
                            placeholder="Type project name, ID, or location..." 
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 flex-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                          Project Suggestions:
                        </span>
                        
                        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                          {filteredProjects.map((proj) => (
                            <div 
                              key={proj.id}
                              onClick={() => handleProjectSelect(proj.name)}
                              className="p-4 bg-slate-50/50 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900/90 border border-slate-200/60 dark:border-slate-808/80 hover:border-primary/40 dark:hover:border-primary/40 rounded-2xl transition-all cursor-pointer flex justify-between items-center group hover:shadow-sm"
                            >
                              <div className="min-w-0 flex-1 pr-4">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-primary transition-colors truncate">
                                  {proj.name}
                                </span>
                                <p className="text-[10px] text-slate-400 font-medium mt-1 font-mono">{proj.id} • {proj.location}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-350 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                            </div>
                          ))}
                          
                          {filteredProjects.length === 0 && (
                            <div className="text-center py-8 text-xs text-slate-450">
                              No projects found matching &quot;{projectSearch}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Details & Evidence */}
                  {reportStep === 2 && (
                    <div className="space-y-5 flex-1">
                      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/15 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider block">Selected Project</span>
                          <span className="text-xs font-bold text-slate-909 dark:text-white truncate block mt-0.5">{selectedProject}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => goToStep(1)}
                          className="h-7 text-[10px] font-bold px-2 rounded-lg border-slate-200 dark:border-slate-800"
                        >
                          Change
                        </Button>
                      </div>

                      {/* Visual Category Grid Select */}
                      <div>
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Issue Category</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {categories.map((cat) => {
                            const isSelected = issueType === cat.id;
                            const Icon = cat.icon;
                            return (
                              <div
                                key={cat.id}
                                onClick={() => setIssueType(cat.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-24 relative overflow-hidden group ${
                                  isSelected 
                                    ? "border-primary bg-primary/5 text-primary" 
                                    : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 hover:bg-white dark:hover:bg-slate-900/50 hover:border-slate-350 dark:hover:border-slate-700"
                                }`}
                              >
                                <div className="flex items-start justify-between w-full">
                                  <div className={`p-1.5 rounded-lg transition-colors ${
                                    isSelected ? "bg-primary/10 text-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-650 dark:group-hover:text-slate-200"
                                  }`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  {isSelected && (
                                    <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                                  )}
                                </div>
                                <div>
                                  <span className={`text-[11px] font-bold block ${isSelected ? "text-primary" : "text-slate-800 dark:text-slate-200"}`}>{cat.label}</span>
                                  <span className="text-[9px] text-slate-400 block line-clamp-1 mt-0.5">{cat.desc}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Photo upload */}
                      <div>
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Upload Evidence & Photo</Label>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden" 
                        />
                        
                        {!previewUrl ? (
                          <div 
                            onClick={triggerFileSelect}
                            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-55 hover:border-primary/40 dark:hover:bg-slate-900/30 transition-all cursor-pointer group"
                          >
                            <Camera className="w-7 h-7 mx-auto mb-2 text-slate-450 group-hover:text-primary transition-colors" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-primary transition-colors">
                              Click to upload photo evidence
                            </span>
                            <p className="text-[10px] text-slate-450 mt-1 max-w-xs mx-auto leading-relaxed">
                              Exif GPS coordinates will be extracted automatically to verify coordinates on-site.
                            </p>
                          </div>
                        ) : (
                          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-cover bg-center border border-slate-200/80 shrink-0" style={{ backgroundImage: `url(${previewUrl})` }} />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 dark:text-white truncate block">{selectedFile?.name}</span>
                                <span className="text-[9px] text-slate-400 block font-mono">{(selectedFile!.size / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleRemoveFile}
                              className="h-8 w-8 p-0 text-red-500 border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Location details (Barangay and Landmark) */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-705 dark:text-slate-350">Barangay</Label>
                          <Input 
                            type="text" 
                            value={barangay}
                            onChange={(e) => setBarangay(e.target.value)}
                            className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary font-medium"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-705 dark:text-slate-350">Date Noticed</Label>
                          <Input 
                            type="date" 
                            value={dateNoticed}
                            onChange={(e) => setDateNoticed(e.target.value)}
                            className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-705 dark:text-slate-355">Street / Landmark</Label>
                        <Input 
                          type="text" 
                          placeholder="E.g., Near water gate sector 4, close to main highway" 
                          value={streetLandmark}
                          onChange={(e) => setStreetLandmark(e.target.value)}
                          className="w-full bg-slate-50/50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary font-medium"
                        />
                      </div>

                      {/* Describe details textarea */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Describe the issue</Label>
                        <textarea 
                          placeholder="Provide details regarding what is broken, delayed, or missing..." 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs h-24 outline-none focus:border-primary text-slate-850 dark:text-slate-100"
                        />
                      </div>

                      {/* Wizard step navigation footer */}
                      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-850 mt-2">
                        <Button 
                          variant="outline"
                          onClick={() => router.push("/report-issue")}
                          className="border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-405 text-xs font-bold px-4 h-9 rounded-lg"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            if (!issueType || !description) {
                              toast.error("Please select a category and fill in the description.");
                              return;
                            }
                            goToStep(3);
                          }}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-4 h-9 rounded-lg"
                        >
                          Continue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Contact Info */}
                  {reportStep === 3 && (
                    <div className="space-y-5 flex-1">
                      <div className="bg-slate-50 dark:bg-slate-850/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed text-slate-505">
                          <span className="font-extrabold text-slate-700 dark:text-slate-350 block mb-0.5">Privacy Protected Submission</span>
                          Your contact details are encrypted and only accessible by authorized engineering division moderators. They are never published publicly.
                        </div>
                      </div>

                      {/* Privacy Toggles */}
                      <div>
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-305 block mb-2">Privacy Method</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div
                            onClick={() => setIsAnonymous(true)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-28 relative overflow-hidden group ${
                              isAnonymous
                                ? "border-accent bg-accent/5 text-accent"
                                : "border-slate-200 dark:border-slate-800 bg-slate-50/20 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-bold block ${isAnonymous ? "text-accent" : "text-slate-800 dark:text-slate-200"}`}>Anonymous</span>
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isAnonymous ? "border-accent bg-accent text-white" : "border-slate-300"}`}>
                                {isAnonymous && <span className="w-1 h-1 bg-white rounded-full" />}
                              </div>
                            </div>
                            <p className="text-[9.5px] text-slate-455 leading-normal">
                              Personal contact details are omitted. Report is pushed to the public ledger anonymously.
                            </p>
                          </div>

                          <div
                            onClick={() => setIsAnonymous(false)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-28 relative overflow-hidden group ${
                              !isAnonymous
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-slate-200 dark:border-slate-800 bg-slate-50/20 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-bold block ${!isAnonymous ? "text-primary" : "text-slate-800 dark:text-slate-200"}`}>Verified Identity</span>
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${!isAnonymous ? "border-primary bg-primary text-white" : "border-slate-300"}`}>
                                {!isAnonymous && <span className="w-1 h-1 bg-white rounded-full" />}
                              </div>
                            </div>
                            <p className="text-[9.5px] text-slate-455 leading-normal">
                              File contact info. Verified submissions undergo faster review pipelines and moderation feedback.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contact fields inputs */}
                      <AnimatePresence mode="wait">
                        {!isAnonymous && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4 pt-1 overflow-hidden"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Full Name</Label>
                                <Input 
                                  type="text" 
                                  placeholder="Juan Dela Cruz" 
                                  value={reporterName}
                                  onChange={(e) => setReporterName(e.target.value)}
                                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs bg-slate-50/30 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" 
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mobile Number</Label>
                                <Input 
                                  type="text" 
                                  placeholder="+63 917 123 4567" 
                                  value={reporterPhone}
                                  onChange={(e) => setReporterPhone(e.target.value)}
                                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs bg-slate-50/30 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" 
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5 mt-3.5">
                              <Label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Email Address (Optional)</Label>
                              <Input 
                                type="email" 
                                placeholder="juan.delacruz@example.com" 
                                value={reporterEmail}
                                onChange={(e) => setReporterEmail(e.target.value)}
                                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs bg-slate-50/30 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" 
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Wizard step navigation footer */}
                      <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-850 mt-4">
                        <Button 
                          variant="outline"
                          onClick={() => goToStep(2)}
                          className="border border-slate-200 dark:border-slate-805 text-slate-600 dark:text-slate-400 text-xs font-bold h-9 rounded-lg"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={handleIssueSubmit}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-5 h-9 rounded-lg"
                        >
                          Submit Issue Report
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
