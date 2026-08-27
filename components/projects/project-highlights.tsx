"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import { Download, Eye, X, Share2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { formatCurrency } from "@/lib/format";
import { getProjectLengthDisplay } from "@/lib/project-length-display";
import type { ProjectDetail } from "@/types";
import { useTranslation } from "@/i18n";
import { getAgencyLogo } from "@/constants/agencies";

interface ProjectHighlightsProps {
  project: ProjectDetail;
}

const subscribeToHydration = () => () => {};

interface HighlightFieldProps {
  label: string;
  value: React.ReactNode;
  tooltip: string;
  className?: string;
  isMono?: boolean;
}

function HighlightField({ label, value, tooltip, className = "", isMono = false }: HighlightFieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1.5 flex items-center gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help transition-colors" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className={`break-words text-sm font-bold leading-5 text-slate-950 dark:text-white ${isMono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function ProjectHighlights({ project }: ProjectHighlightsProps) {
  const { t } = useTranslation();

  // Resolve agency logo for QR code
  const agencyLogo = getAgencyLogo(project.sourceAgency);
  const projectLength = getProjectLengthDisplay(project);

  // Use a consistent URL for both server and client
  const projectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/projects/${project.id}`;

  // Track if component is mounted to avoid hydration mismatch
  const isMounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [showQRZoom, setShowQRZoom] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);


  const handleDownloadQR = async () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    // Clone the SVG to avoid modifying the original
    const svgClone = svg.cloneNode(true) as SVGElement;

    // Find all image elements in the SVG
    const images = svgClone.querySelectorAll("image");

    // Convert external images to base64 data URLs
    for (const img of Array.from(images)) {
      const href = img.getAttribute("href") || img.getAttribute("xlink:href");
      if (href && !href.startsWith("data:")) {
        try {
          const response = await fetch(href);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.setAttribute("href", dataUrl);
          if (img.hasAttribute("xlink:href")) {
            img.setAttribute("xlink:href", dataUrl);
          }
        } catch (error) {
          console.error("Failed to convert image to base64:", error);
        }
      }
    }

    // Layout constants
    const qrSize = 512;
    const padding = 48;
    const textGap = 24;
    const labelFontSize = 20;
    const codeFontSize = 16;
    const totalWidth = qrSize + padding * 2;
    const textBlockHeight = labelFontSize + codeFontSize + textGap + 8;
    const totalHeight = qrSize + padding * 2 + textBlockHeight;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Create SVG image first, then draw everything
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const qrImg = new Image();
    qrImg.onload = () => {
      // White card background with rounded corners
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Draw the QR code centered with padding
      ctx.drawImage(qrImg, padding, padding, qrSize, qrSize);

      // "Scan to view project" label
      ctx.fillStyle = "#475569"; // slate-600
      ctx.font = `500 ${labelFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Scan to view project", totalWidth / 2, padding + qrSize + textGap + labelFontSize);

      // Project code
      ctx.fillStyle = "#94a3b8"; // slate-400
      ctx.font = `400 ${codeFontSize}px "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace`;
      ctx.fillText(project.code, totalWidth / 2, padding + qrSize + textGap + labelFontSize + codeFontSize + 8);

      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `qr-${project.code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }, "image/png");

      URL.revokeObjectURL(url);
    };

    qrImg.src = url;
  };

  const handleShareQR = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: project.name,
          text: `Check out this project: ${project.name}`,
          url: projectUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(projectUrl);
        alert("Project link copied to clipboard!");
      }
    } catch (error) {
      // Ignore AbortError (user canceled the share)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      // Log other errors
      console.error("Error sharing:", error);
    }
  };

  return (
    <TooltipProvider>
      <motion.div
        className="relative z-0 mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_22px_55px_-30px_rgba(15,23,42,0.55)] sm:p-6 dark:border-slate-800 dark:bg-slate-900"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row">
          <div className="flex-1 w-full">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <span aria-hidden="true" className="h-7 w-1 rounded-full bg-blue-600" />
              <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">{t("projectDetail.title")}</h2>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              <HighlightField
                label={t("projectDetail.overview.projectCode")}
                tooltip={t("projectDetail.overview.projectCodeTooltip")}
                value={project.code}
                isMono
              />
              <HighlightField
                label={t("projectDetail.overview.startDate")}
                tooltip={t("projectDetail.overview.startDateTooltip")}
                value={project.startDate}
              />
              <HighlightField
                label={t("projectDetail.overview.actualCompletion")}
                tooltip={t("projectDetail.overview.actualCompletionTooltip")}
                value={project.actualCompletionDate || t("projectDetail.overview.notCompleted")}
              />
              <HighlightField
                label={t("projectDetail.overview.duration")}
                tooltip={t("projectDetail.overview.durationTooltip")}
                value={project.duration}
              />
              <HighlightField
                label={t("projectDetail.overview.budget")}
                tooltip={t("projectDetail.overview.budgetTooltip")}
                value={project.budget === null ? "Unavailable" : formatCurrency(project.budget)}
              />
              <HighlightField
                label={projectLength.source === "post-geotagged" ? t("projectDetail.overview.postGeotaggedLength") : t("projectDetail.overview.targetLength")}
                tooltip={projectLength.source === "post-geotagged" ? t("projectDetail.overview.postGeotaggedLengthTooltip") : t("projectDetail.overview.targetLengthTooltip")}
                value={projectLength.value}
              />
              <HighlightField
                label={t("projectDetail.overview.contractor")}
                tooltip={t("projectDetail.overview.contractorTooltip")}
                value={project.contractor}
              />
              <HighlightField
                label={t("projectDetail.overview.status")}
                tooltip={t("projectDetail.overview.statusTooltip")}
                value={project.stage}
              />
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
              <HighlightField
                label={t("projectDetail.overview.implementingAgency")}
                tooltip={t("projectDetail.overview.implementingAgencyTooltip")}
                value={project.implementingAgency}
              />
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex w-full flex-col items-center gap-2 border-t border-slate-100 pt-5 lg:mr-20 lg:w-auto lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 dark:border-slate-800">
            <div
              ref={qrRef}
              className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => setShowQRZoom(true)}
              role="button"
              tabIndex={0}
              aria-label={t("projectDetail.overview.scanToView")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setShowQRZoom(true);
                }
              }}
            >
              {isMounted ? (
                <>
                  <QRCodeSVG
                    value={projectUrl}
                    size={112}
                    level="H"
                    imageSettings={{
                      src: agencyLogo,
                      x: undefined,
                      y: undefined,
                      height: 34,
                      width: 39,
                      excavate: true,
                    }}
                  />
                  {/* Hover Overlay with Eye Icon */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="h-28 w-28 animate-pulse rounded bg-slate-100" />
              )}
            </div>
            {isMounted && (
              <button
                onClick={handleDownloadQR}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                {t("projectDetail.overview.downloadQR")}
              </button>
            )}
          </div>
        </div>
      </motion.div>
      <QRZoomModal
        show={showQRZoom}
        isMounted={isMounted}
        onClose={() => setShowQRZoom(false)}
        projectUrl={projectUrl}
        projectCode={project.code}
        t={t}
        handleDownloadQR={handleDownloadQR}
        handleShareQR={handleShareQR}
        agencyLogo={agencyLogo}
      />
    </TooltipProvider>
  );
}

// Separate component for the Zoom Modal to avoid nesting issues or use it inside but cleaner
function QRZoomModal({
  show,
  isMounted,
  onClose,
  projectUrl,
  projectCode,
  t,
  handleDownloadQR,
  handleShareQR,
  agencyLogo
}: {
  show: boolean;
  isMounted: boolean;
  onClose: () => void;
  projectUrl: string;
  projectCode: string;
  t: (path: string, variables?: Record<string, string | number>) => string;
  handleDownloadQR: () => void;
  handleShareQR: () => void;
  agencyLogo: string;
}) {
  return (
    <AnimatePresence>
      {show && isMounted && (
        <motion.div
          className="fixed z-[2000] inset-0 flex items-center justify-center bg-black/90 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Action Buttons - Top Left */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            {/* Share Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShareQR();
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Download Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadQR();
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
              aria-label="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* Close Button - Top Right */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QR Code Container */}
          <motion.div
            className="relative bg-white p-8 rounded-lg flex flex-col items-center justify-center max-w-md w-full"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* QR Code */}
            <QRCodeSVG
              value={projectUrl}
              size={400}
              level="H"
              imageSettings={{
                src: agencyLogo,
                x: undefined,
                y: undefined,
                height: 120,
                width: 140,
                excavate: true,
              }}
            />

            {/* Project Info */}
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-600 font-medium">{t("projectDetail.overview.scanToView")}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">{projectCode}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
