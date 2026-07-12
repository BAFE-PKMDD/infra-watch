"use client";

import { X, ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

interface MediaViewerProps {
  media: MediaItem[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function MediaViewer({ media, initialIndex = 0, open, onClose }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      // Lock scroll when open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, media, onClose]);

  const goToNext = () => {
    if (media.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const goToPrevious = () => {
    if (media.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentMedia = media[currentIndex];
    if (!currentMedia.url) return;

    setIsDownloading(true);
    try {
      // Use our proxy download route to avoid CORS issues
      const downloadUrl = `/api/download?path=${encodeURIComponent(currentMedia.url)}`;

      // Simple and robust way to trigger download when server sends attachment headers
      const a = document.createElement('a');
      a.href = downloadUrl;
      const filename = currentMedia.url.split('/').pop() || `media-${currentIndex + 1}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Download started");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download media");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentMedia = media[currentIndex];
    const fullUrl = getFullUrl(currentMedia.url);
    if (!fullUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Evidence Media',
          text: 'Check out this evidence media from INFRA Watch',
          url: fullUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Sharing failed:", error);
          toast.error("Failed to share");
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Link copied to clipboard");
      } catch (error) {
        console.error("Copy failed:", error);
        toast.error("Failed to copy link");
      }
    }
  };

  const currentMedia = media.length > 0 ? media[currentIndex] : null;
  const fullUrl = currentMedia ? getFullUrl(currentMedia.url) : null;

  if (!mounted || !open || media.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 md:p-10 select-none pointer-events-auto"
          onClick={onClose}
        >
          {/* Action Buttons Top Right */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-[10001]">
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Share"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
              aria-label="Download"
              title="Download"
            >
              <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media Counter */}
          {media.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium z-[10001] backdrop-blur-md">
              {currentIndex + 1} / {media.length}
            </div>
          )}

          {/* Navigation - only show if more than 1 item */}
          {media.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[10001] cursor-pointer outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Previous media"
              >
                <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[10001] cursor-pointer outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Next media"
              >
                <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
              </button>
            </>
          )}

          {/* Media Content */}
          <motion.div
            key={currentIndex}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full h-full flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {currentMedia && currentMedia.type === 'image' ? (
              <div className="relative w-full h-full shadow-2xl">
                <Image
                  src={fullUrl || '/placeholder-image.jpg'}
                  alt={`Media ${currentIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-contain"
                  priority
                  unoptimized={isLocalMinIO(fullUrl)}
                />
              </div>
            ) : currentMedia && currentMedia.type === 'video' ? (
              <div className="w-full h-full flex items-center justify-center">
                <video
                  src={fullUrl || ''}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                />
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
