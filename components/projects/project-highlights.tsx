"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Eye, X, Share2, HelpCircle, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import type { ProjectDetail } from "@/types";

interface ProjectHighlightsProps {
  project: ProjectDetail;
}

interface HighlightFieldProps {
  label: string;
  value: React.ReactNode;
  tooltip: string;
  className?: string;
  isMono?: boolean;
}

function HighlightField({ label, value, tooltip, className = "", isMono = false }: HighlightFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1 mb-0.5">
        <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">{label}</p>
        <span title={tooltip} className="cursor-help inline-flex text-slate-400 hover:text-slate-600 transition-colors">
          <HelpCircle className="w-3 h-3" />
        </span>
      </div>
      <p className={`text-sm font-extrabold text-slate-900 dark:text-white truncate ${isMono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function ProjectHighlights({ project }: ProjectHighlightsProps) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [showQRZoom, setShowQRZoom] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const projectUrl = typeof window !== "undefined" ? window.location.href : `http://localhost:3000/projects/${project.id}`;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const qrSize = 512;
    const padding = 48;
    const totalWidth = qrSize + padding * 2;
    const totalHeight = qrSize + padding * 2 + 80;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalWidth, totalHeight);
      ctx.drawImage(qrImg, padding, padding, qrSize, qrSize);

      ctx.fillStyle = "#1e293b"; // slate-800
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scan to View Project Details", totalWidth / 2, padding + qrSize + 36);

      ctx.fillStyle = "#64748b"; // slate-500
      ctx.font = "14px monospace";
      ctx.fillText(project.id, totalWidth / 2, padding + qrSize + 60);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `qr-${project.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }, "image/png");

      URL.revokeObjectURL(url);
    };
    qrImg.src = url;
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: project.name,
          text: `INFRA Watch project: ${project.name}`,
          url: projectUrl,
        });
      } else {
        await navigator.clipboard.writeText(projectUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Failed to share");
    }
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
        <div className="flex-1 w-full">
          <h2 className="text-sm font-bold text-slate-900 mb-4 dark:text-white uppercase tracking-wider">
            {t("projectDetail.overview.highlights") || "Project Highlights"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
            <HighlightField
              label="Approved Budget"
              tooltip="The approved budget for this infrastructure contract."
              value={formatCurrency(project.budget)}
            />
            <HighlightField
              label="Physical Progress"
              tooltip="Percentage of physical work accomplished."
              value={`${project.metadata?.physicalProgress ?? 0}%`}
            />
            <HighlightField
              label="Financial Progress"
              tooltip="Percentage of funds disbursed out of the total budget."
              value={`${project.metadata?.financialProgress ?? 0}%`}
            />
            <HighlightField
              label="Contract Duration"
              tooltip="Total duration allowed under the contract."
              value={`${project.metadata?.calendarDays || project.duration || "N/A"} Days`}
            />
            <HighlightField
              label="Contractor"
              tooltip="The construction firm partner executing the project."
              value={project.contractor || "N/A"}
            />
            <HighlightField
              label="Implementing Agency"
              tooltip="The government agency responsible for this project."
              value={project.implementingAgency || "N/A"}
            />
            <HighlightField
              label="Funding Year"
              tooltip="The fiscal year in which the budget was allocated."
              value={project.yearFunded || "N/A"}
            />
            <HighlightField
              label="Sector Type"
              tooltip="The infrastructure domain category."
              value={project.scope || "N/A"}
            />
          </div>
        </div>

        {/* QR Code section */}
        <div className="flex flex-col items-center gap-2 w-full lg:w-auto shrink-0 bg-slate-50 dark:bg-slate-850/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
          <div
            ref={qrRef}
            className="relative bg-white p-2.5 rounded-lg shadow-sm border border-slate-200/60 group cursor-pointer"
            onClick={() => setShowQRZoom(true)}
          >
            {isMounted ? (
              <>
                <QRCodeSVG value={projectUrl} size={110} level="M" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
              </>
            ) : (
              <div className="w-[110px] h-[110px] bg-slate-150 animate-pulse rounded" />
            )}
          </div>
          {isMounted && (
            <button
              onClick={handleDownloadQR}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-md border border-slate-200 transition-colors dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700"
            >
              <Download className="w-3 h-3" /> QR Code
            </button>
          )}
        </div>
      </div>

      {/* QR ZOOM MODAL */}
      <AnimatePresence>
        {showQRZoom && isMounted && (
          <motion.div
            className="fixed z-[2000] inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRZoom(false)}
          >
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadQR();
                }}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowQRZoom(false)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <motion.div
              className="relative bg-white p-8 rounded-2xl flex flex-col items-center justify-center max-w-sm w-full"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <QRCodeSVG value={projectUrl} size={280} level="M" />
              <div className="mt-6 text-center">
                <h3 className="text-sm font-bold text-slate-800">Scan to View Public Page</h3>
                <p className="text-xs text-slate-450 mt-1 font-mono">{project.id}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
