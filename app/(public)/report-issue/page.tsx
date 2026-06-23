"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Camera, ArrowLeft, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

export default function ReportIssueWizard() {
  const router = useRouter();
  const [reportStep, setReportStep] = useState(1);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const mockProjects = [
    { id: "PRJ-INS-2025-115", name: "Solar Powered Irrigation Pump System", location: "Abuyog, Leyte" },
    { id: "PRJ-INS-2023-009", name: "Dingle Diversion Dam Rehabilitation", location: "Abuyog, Leyte" },
    { id: "PRJ-AMSS-2024-042", name: "Post-Harvest Mechanical Grain Dryer Installation", location: "Balamban, Cebu" },
    { id: "PRJ-AMSS-2026-002", name: "Agricultural Warehouse and Storage Facility", location: "Basey, Samar" },
    { id: "PRJ-INS-2024-108", name: "Concrete Drainage and Irrigation Canal", location: "Basey, Samar" },
  ];

  const handleProjectSelect = (projectName: string) => {
    setSelectedProject(projectName);
    setReportStep(2);
    toast.info(`Selected: ${projectName}`, {
      description: "Proceeding to Step 2: Upload Evidence & Details"
    });
  };

  const handleIssueSubmit = () => {
    if (reportStep === 3) {
      if (!isAnonymous && (!reporterName || !reporterPhone)) {
        toast.error("Please fill in contact details or select anonymous submission.");
        return;
      }
      toast.success("Issue report submitted successfully!", {
        description: "A tracking ticket ID has been generated for your record."
      });
      // Reset state and go back to homepage
      setReportStep(1);
      setSelectedProject("");
      setIssueType("");
      setDescription("");
      setReporterName("");
      setReporterPhone("");
      setIsAnonymous(false);
      
      setTimeout(() => {
        router.push("/");
      }, 1000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 min-h-screen flex flex-col justify-center">
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4">
          <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white">Report an Infrastructure Issue</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
            Help BAFE identify and coordinate repairs for machinery or irrigation network damages.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 md:p-8 pt-0 space-y-6">
          {/* Steps Indicator HUD */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className={reportStep >= 1 ? "text-primary" : ""}>1. Search Project</span>
            <ChevronRight className="w-4 h-4 text-slate-350" />
            <span className={reportStep >= 2 ? "text-primary" : ""}>2. Locate & Upload</span>
            <ChevronRight className="w-4 h-4 text-slate-350" />
            <span className={reportStep >= 3 ? "text-primary" : ""}>3. Contact Info</span>
          </div>

          {/* STEP 1: Search Project */}
          {reportStep === 1 && (
            <div className="space-y-4">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Select the project with issue:</Label>
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Search project database (e.g. Solar Pump)..." 
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs"
                />
              </div>
              <div className="space-y-2.5 mt-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Quick Suggestions:</span>
                {mockProjects.map((proj) => (
                  <div 
                    key={proj.id}
                    onClick={() => handleProjectSelect(proj.name)}
                    className="p-4 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-primary dark:hover:border-primary transition-all cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{proj.name}</span>
                    <p className="text-[10px] text-slate-400 mt-1">{proj.id} • {proj.location}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Locate & Upload */}
          {reportStep === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Upload Evidence & Photos</Label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-850/30 hover:bg-slate-100/50 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Upload photos or video files</span>
                  <p className="text-[10px] text-slate-500 mt-1">Exif GPS coordinates will be extracted automatically to verify location.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Issue Category</Label>
                <select 
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary"
                >
                  <option value="">Select Category...</option>
                  <option value="damage">Equipment Damage / Crack</option>
                  <option value="delay">Construction Stoppage / Delay</option>
                  <option value="flooding">Water Leaking / Flooding</option>
                  <option value="other">Other / Anomalies</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Describe the issue</Label>
                <textarea 
                  placeholder="Provide detail regarding what is broken, delayed, or missing..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-3 text-xs h-28 outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button 
                  variant="outline"
                  onClick={() => setReportStep(1)}
                  className="border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 text-xs font-bold"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => {
                    if (!issueType || !description) {
                      toast.error("Please fill in the category and description fields.");
                      return;
                    }
                    setReportStep(3);
                  }}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold h-9 rounded-lg"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Contact Info */}
          {reportStep === 3 && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-slate-850/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-slate-500">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 block mb-0.5">Privacy Protected Submission</span>
                  Your contact details are encrypted and only accessible by verified BAFE project moderators. They are never published on the public ledger.
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Full Name</Label>
                    <Input 
                      type="text" 
                      placeholder="Juan Dela Cruz" 
                      value={reporterName}
                      disabled={isAnonymous}
                      onChange={(e) => setReporterName(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs bg-slate-50 dark:bg-slate-850 disabled:opacity-50" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mobile Number</Label>
                    <Input 
                      type="text" 
                      placeholder="+639171234567" 
                      value={reporterPhone}
                      disabled={isAnonymous}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs bg-slate-50 dark:bg-slate-850 disabled:opacity-50" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <input 
                    type="checkbox" 
                    id="anon" 
                    checked={isAnonymous}
                    onChange={() => setIsAnonymous(!isAnonymous)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                  />
                  <label htmlFor="anon" className="text-xs text-slate-650 dark:text-slate-300 font-semibold cursor-pointer">
                    Submit report anonymously to the public timeline
                  </label>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button 
                  variant="outline"
                  onClick={() => setReportStep(2)}
                  className="border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 text-xs font-bold"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleIssueSubmit}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-6 h-9 rounded-lg"
                >
                  Submit Issue Report
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
