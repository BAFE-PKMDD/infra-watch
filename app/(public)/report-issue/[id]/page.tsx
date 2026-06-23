"use client";

import React, { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Building2, 
  Calendar,
  AlertCircle,
  ShieldCheck,
  Send,
  MessageSquare,
  XCircle,
  ExternalLink,
  Droplets,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Phone,
  Mail,
  User,
  Activity,
  FileImage,
  Info,
  Maximize2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getMockIssueDetails, addCommentToMockIssue, IssueReport } from "@/lib/issues-mock-store";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function IssueDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const [issue, setIssue] = useState<IssueReport | null>(null);
  const [mounted, setMounted] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [zoomImage, setZoomImage] = useState(false);

  useEffect(() => {
    const details = getMockIssueDetails(id);
    if (details) {
      setIssue(details);
    }
    setMounted(true);
  }, [id]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !issue) return;

    const added = addCommentToMockIssue(issue.id, newComment, "Public Citizen", "Contributor");
    if (added) {
      const updatedDetails = getMockIssueDetails(id);
      if (updatedDetails) {
        setIssue(updatedDetails);
      }
      setNewComment("");
      toast.success("Verification comment added to logs");
    } else {
      toast.error("Failed to post comment");
    }
  };

  // Mock exact coordinates matching selected projects
  const mockCoordinates = useMemo(() => {
    if (!issue) return { lat: 10.7241, lng: 124.7981, region: "Leyte" };
    if (issue.projectName.includes("Irrigation Pump")) {
      return { lat: 10.7241, lng: 124.7981, region: "Abuyog, Leyte" };
    }
    if (issue.projectName.includes("Diversion Dam")) {
      return { lat: 11.0118, lng: 122.6711, region: "Dingle, Iloilo" };
    }
    if (issue.projectName.includes("Grain Dryer")) {
      return { lat: 10.4201, lng: 123.8152, region: "Balamban, Cebu" };
    }
    if (issue.projectName.includes("Warehouse")) {
      return { lat: 11.2778, lng: 125.0689, region: "Basey, Samar" };
    }
    if (issue.projectName.includes("Canal")) {
      return { lat: 11.2355, lng: 125.0742, region: "Basey, Samar" };
    }
    return { lat: 11.2355, lng: 125.0742, region: "Basey, Samar" };
  }, [issue]);

  // Icon mapping for issue categories
  const CategoryIcon = useMemo(() => {
    if (!issue) return HelpCircle;
    const cat = issue.category.toLowerCase();
    if (cat.includes("water") || cat.includes("leak") || cat.includes("flooding")) return Droplets;
    if (cat.includes("damage") || cat.includes("broken")) return ShieldAlert;
    if (cat.includes("delay") || cat.includes("stoppage")) return AlertTriangle;
    return HelpCircle;
  }, [issue]);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-screen flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
          <p className="text-xs text-slate-400 mt-4 font-bold tracking-wider animate-pulse">Loading Ticket Details...</p>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-screen text-center font-sans">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Issue Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-sm font-medium">
          The issue tracking ticket ID #{id} does not exist or has been removed from the public database.
        </p>
        <Link href="/report-issue">
          <Button variant="outline" className="border-slate-200 dark:border-slate-800 text-xs font-bold px-5 h-9 rounded-lg">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 min-h-screen font-sans">
      {/* Lightbox Image Zoom Overlay */}
      {zoomImage && issue.photoUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setZoomImage(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={issue.photoUrl} 
              alt="Evidence Zoomed" 
              className="object-contain max-w-full max-h-full rounded-xl shadow-2xl border border-slate-800"
            />
            <Button 
              className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full h-9 w-9 p-0 text-sm"
              onClick={() => setZoomImage(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Navigation & Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-10"
      >
        <Link href="/report-issue" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Issues Feed
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-2xl lg:text-3.5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Ticket Details: #{issue.id}
              </span>
              
              {/* Status Badge */}
              {issue.status === "resolved" && (
                <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/30 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                </Badge>
              )}
              {issue.status === "in-progress" && (
                <Badge className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-250 dark:border-amber-900/30 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> In Progress
                </Badge>
              )}
              {issue.status === "pending" && (
                <Badge className="bg-slate-50 dark:bg-slate-850 text-slate-600 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Pending Review
                </Badge>
              )}
              {issue.status === "suspended" && (
                <Badge className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-250 dark:border-rose-900/30 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Suspended
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 font-semibold">
              Reported on {issue.date} by <span className="font-extrabold text-slate-700 dark:text-slate-350">{issue.reporter}</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Two-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column: Primary Details */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-7 space-y-8"
        >
          {/* Description Card */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Report Description</h3>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/5 dark:bg-primary/10 border border-primary/15 px-3 py-1 rounded flex items-center gap-1.5 w-fit">
                  <CategoryIcon className="w-3.5 h-3.5" />
                  {issue.category}
                </span>
              </div>
              <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                {issue.description}
              </p>
            </div>
          </Card>

          {/* Evidence Image Card */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Evidence Attachments</h3>
            
            {issue.photoUrl ? (
              <div 
                className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-zoom-in"
                onClick={() => setZoomImage(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={issue.photoUrl} 
                  alt="Evidence uploaded by citizen" 
                  className="w-full h-auto max-h-[420px] object-cover group-hover:scale-[1.005] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/15 transition-colors flex items-center justify-center">
                  <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute bottom-3 right-3.5 text-[9px] text-white font-mono bg-slate-955/70 px-2.5 py-0.75 rounded">
                  GPS Geotagged
                </div>
              </div>
            ) : (
              /* High fidelity vector visual indicator */
              <div className="relative rounded-xl overflow-hidden border border-slate-100 dark:border-slate-850 p-14 bg-slate-50/50 dark:bg-slate-955/10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/15">
                  <CategoryIcon className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">GPS Geotagged Verification</span>
                <p className="text-[10px] text-slate-450 mt-1.5 max-w-xs leading-relaxed font-medium">
                  Site metadata locked at coordinates: {mockCoordinates.lat}, {mockCoordinates.lng}. Image attachments omitted.
                </p>
              </div>
            )}
          </Card>

          {/* Location Address Details */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <div className="flex items-center gap-2 mb-5 text-primary">
              <MapPin className="w-4.5 h-4.5" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Location Address</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-5 gap-x-8 text-xs md:text-sm">
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Region</span>
                <span className="text-slate-900 dark:text-white font-bold block mt-1">{issue.region}</span>
              </div>
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Province</span>
                <span className="text-slate-900 dark:text-white font-bold block mt-1">{issue.province}</span>
              </div>
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">City / Municipality</span>
                <span className="text-slate-900 dark:text-white font-bold block mt-1">{issue.city}</span>
              </div>
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Barangay</span>
                <span className="text-slate-900 dark:text-white font-bold block mt-1">{issue.barangay}</span>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-100 dark:border-slate-850 mt-5">
              <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Street / Landmark</span>
              <span className="text-slate-900 dark:text-white font-bold block mt-1 text-xs md:text-sm">{issue.streetLandmark || "Not specified"}</span>
            </div>
          </Card>

          {/* GPS HUD Location Map */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">GPS Location HUD</h3>
              <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded">
                Verified Site Location
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs md:text-sm mb-5">
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Latitude</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold block mt-1">{mockCoordinates.lat}</span>
              </div>
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Longitude</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold block mt-1">{mockCoordinates.lng}</span>
              </div>
            </div>

            {/* Mock Vector Radar Grid representing location verification */}
            <div className="relative h-36 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-850 bg-slate-950 flex items-center justify-center">
              {/* Concentric rings */}
              <div className="absolute w-28 h-28 rounded-full border border-primary/20 animate-ping" />
              <div className="absolute w-18 h-18 rounded-full border border-primary/35" />
              <div className="absolute w-10 h-10 rounded-full border border-primary/50" />
              <div className="absolute w-2 h-2 rounded-full bg-accent animate-pulse" />
              
              <div className="absolute bottom-3 left-4 text-[9px] font-mono text-primary font-bold uppercase tracking-wider">
                GPS Lock: {mockCoordinates.region}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Right Column: Context & Timeline Logs */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-5 space-y-8"
        >
          
          {/* Associated Project context */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Affected Project</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">{issue.projectId}</span>
                <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-white mt-1 leading-snug">{issue.projectName}</h4>
              </div>

              <div className="space-y-2.5 text-xs md:text-sm border-t border-slate-100 dark:border-slate-850 pt-3.5">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{mockCoordinates.region}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Contractor: G Builders</span>
                </div>
              </div>

              <Link href={`/projects/${issue.projectId}`} className="block pt-2">
                <Button className="w-full text-xs md:text-sm font-bold bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5 h-10 rounded-lg shadow-sm">
                  View Project details <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Coordination status log timeline */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-6">Coordination Log</h3>
            
            <div className="space-y-6 relative pl-6 border-l border-slate-100 dark:border-slate-850">
              
              {/* Log Step 1 */}
              <div className="relative">
                {/* Node icon dot */}
                <div className="absolute -left-[30px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-primary bg-white dark:bg-slate-900 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div className="text-xs">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Issue Filed & Ticket Created</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{issue.date} • By {issue.reporter}</span>
                </div>
              </div>

              {/* Log Step 2 */}
              <div className="relative">
                <div className={`absolute -left-[30px] top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  issue.status !== "pending" ? "border-primary bg-white dark:bg-slate-900" : "border-slate-200 bg-white dark:bg-slate-900"
                }`}>
                  {issue.status !== "pending" && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <div className="text-xs">
                  <span className={`font-extrabold block ${issue.status !== "pending" ? "text-slate-800 dark:text-slate-200" : "text-slate-405"}`}>
                    Moderator Approved & Filed
                  </span>
                  <span className="text-[10px] text-slate-450 mt-0.5 block">Verified by Engineering Division</span>
                </div>
              </div>

              {/* Log Step 3 */}
              <div className="relative">
                <div className={`absolute -left-[30px] top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  issue.status === "in-progress" || issue.status === "resolved" ? "border-primary bg-white dark:bg-slate-900" : "border-slate-200 bg-white"
                }`}>
                  {(issue.status === "in-progress" || issue.status === "resolved") && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <div className="text-xs">
                  <span className={`font-extrabold block ${issue.status === "in-progress" || issue.status === "resolved" ? "text-slate-800 dark:text-slate-200" : "text-slate-405"}`}>
                    Maintenance Crew Dispatched
                  </span>
                  <span className="text-[10px] text-slate-450 mt-0.5 block">Repair coordinator active on-site</span>
                </div>
              </div>

              {/* Log Step 4 (If Resolved) */}
              <div className="relative">
                <div className={`absolute -left-[30px] top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  issue.status === "resolved" ? "border-emerald-500 bg-white dark:bg-slate-900" : "border-slate-200 bg-white"
                }`}>
                  {issue.status === "resolved" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </div>
                <div className="text-xs">
                  <span className={`font-extrabold block ${issue.status === "resolved" ? "text-slate-850 dark:text-slate-200" : "text-slate-405"}`}>
                    Repairs Resolved & Closed
                  </span>
                  <span className="text-[10px] text-slate-450 mt-0.5 block">Final coordinator sign-off</span>
                </div>
              </div>

            </div>
          </Card>

          {/* Timeline details */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" /> Timeline Details
            </h3>
            <div className="space-y-3.5 text-xs md:text-sm">
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Date Noticed</span>
                <span className="text-slate-900 dark:text-white font-bold block mt-1">{issue.dateNoticed}</span>
              </div>
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Reported On</span>
                <span className="text-slate-900 dark:text-white font-bold block mt-1">{issue.date}</span>
              </div>
              <div>
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Coordination Status</span>
                <span className="text-slate-900 dark:text-white font-bold block mt-1 capitalize">{issue.status}</span>
              </div>
            </div>
          </Card>

          {/* Reporter privacy info */}
          {!issue.isAnonymous ? (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" /> Reporter Information
              </h3>
              <div className="space-y-3.5 text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white">{issue.reporter}</span>
                </div>
                {issue.reporterPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{issue.reporterPhone}</span>
                  </div>
                )}
                {issue.reporterEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{issue.reporterEmail}</span>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="bg-amber-50/50 dark:bg-amber-955/10 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-7 lg:p-8">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Anonymous Report</h4>
                  <p className="text-[10px] md:text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed font-medium">
                    This issue was filed anonymously. Citizens are protected. Personal identification credentials are excluded from the public logs.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Citizen Verification comment feed */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-sm rounded-2xl p-8 lg:p-9">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400" /> Community Log Updates ({issue.comments?.length || 0})
            </h3>
            
            {/* Comments List */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin mb-4">
              {issue.comments && issue.comments.length > 0 ? (
                issue.comments.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>{c.author} <span className="text-primary font-medium">({c.role})</span></span>
                      <span>{c.date}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium">{c.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-[11px] font-semibold">
                  No verification comments on this ticket yet.
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input 
                type="text" 
                placeholder="Share a status update on this issue..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-50/50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-xs md:text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary font-medium"
              />
              <Button type="submit" className="bg-primary hover:bg-primary/95 text-white h-9 w-9 p-0 rounded-lg shrink-0 shadow-sm flex items-center justify-center">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
