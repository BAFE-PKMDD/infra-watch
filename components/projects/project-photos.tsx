import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, MapPin, X, Download, Share2, ChevronLeft, ChevronRight, Grid3x3, Map } from "lucide-react";
import Image from "next/image";
import { isLocalMinIO } from "@/lib/minio-url";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PhotoGridView } from "./photo-grid-view";
import { GeoTag } from "@/types/photo.types";
import { useTranslation } from "@/i18n";
import type { PhotoViewMode } from "@/types";

function PhotoMapViewLoading() {
  return (
    <div className="relative w-full h-[600px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-transparent overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center px-6 py-4 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
          <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-white">Loading Map...</p>
          <p className="text-xs text-white/80 mt-1">Preparing satellite imagery</p>
        </div>
      </div>
    </div>
  );
}

const PhotoMapView = dynamic(() => import("./photo-map-view").then(mod => ({ default: mod.PhotoMapView })), {
  ssr: false,
  loading: () => <PhotoMapViewLoading />,
});

interface ProjectPhotosProps {
  projectId: string;
  geotags: GeoTag[];
  projectCoordinates?: string;
  kmlLink?: string;
}

// Local type removed in favor of Shared type

export function ProjectPhotos({ projectId, geotags, projectCoordinates, kmlLink }: ProjectPhotosProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPhoto, setSelectedPhoto] = useState<GeoTag | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [currentPhotos, setCurrentPhotos] = useState<GeoTag[]>(geotags);
  const [viewMode, setViewMode] = useState<PhotoViewMode>("grid");

  // Adjust state during render when geotags prop changes (React recommended pattern)
  const prevGeotagsRef = useRef(geotags);
  if (prevGeotagsRef.current !== geotags) {
    prevGeotagsRef.current = geotags;
    setCurrentPhotos(geotags);
  }

  // Read view mode from URL parameter
  useEffect(() => {
    const viewFromUrl = searchParams.get("photoView");
    if (viewFromUrl === "maps" || viewFromUrl === "grid") {
      setViewMode(viewFromUrl as PhotoViewMode);
    }
  }, [searchParams]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Use proxy endpoint to bypass CORS
      const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'photo.jpg';

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab if fetch fails
      window.open(url, '_blank');
    }
  };

  const handleShare = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Project Photo',
          url: url,
        });
      } catch (error) {
        // Ignore AbortError (user canceled the share)
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert(t("projectDetail.tabs.photos.grid") === "Grid" ? 'Link copied to clipboard!' : 'Ang link ay nakopya sa clipboard!');
    }
  };

  const handlePhotoClick = useCallback((tag: GeoTag, index: number, filteredPhotos?: GeoTag[]) => {
    setSelectedIndex(index);
    setSelectedPhoto(tag);
    if (filteredPhotos) {
      setCurrentPhotos(filteredPhotos);
    } else {
      // Logic for MapView or other view if they don't filter
      setCurrentPhotos(geotags);
    }
  }, [geotags]);

  const navigatePhoto = useCallback((direction: 'prev' | 'next') => {
    if (!currentPhotos.length) return;

    let newIndex = selectedIndex;
    if (direction === 'prev') {
      newIndex = selectedIndex > 0 ? selectedIndex - 1 : currentPhotos.length - 1;
    } else {
      newIndex = selectedIndex < currentPhotos.length - 1 ? selectedIndex + 1 : 0;
    }

    setSelectedIndex(newIndex);
    setSelectedPhoto(currentPhotos[newIndex]);
  }, [selectedIndex, currentPhotos]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null);
        setSelectedIndex(-1);
      } else if (e.key === 'ArrowLeft') {
        navigatePhoto('prev');
      } else if (e.key === 'ArrowRight') {
        navigatePhoto('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, navigatePhoto]);

  if (!geotags || geotags.length === 0) {
    return (
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold">{t("projectDetail.tabs.photos.title")}</h2>
        </div>
        <div className="p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {t("projectDetail.tabs.photos.empty")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("projectDetail.tabs.photos.emptyDesc")}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header with View Toggle */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("projectDetail.tabs.photos.geotagged").replace("{count}", String(geotags.length))}</h2>

            {/* Premium View Toggle */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => {
                  setViewMode("grid");
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("photoView", "grid");
                  router.push(`?${params.toString()}`, { scroll: false });
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "grid"
                  ? "bg-white text-green-600 shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="hidden sm:inline">{t("projectDetail.tabs.photos.grid")}</span>
              </button>
              <button
                onClick={() => {
                  setViewMode("maps");
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("photoView", "maps");
                  router.push(`?${params.toString()}`, { scroll: false });
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "maps"
                  ? "bg-white text-green-600 shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                <Map className="w-4 h-4" />
                <span className="hidden sm:inline">{t("projectDetail.tabs.photos.map")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {viewMode === "grid" ? (
              <motion.div
                key="grid-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <PhotoGridView geotags={geotags} onPhotoClick={handlePhotoClick} />
              </motion.div>
            ) : (
              <motion.div
                key="map-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <PhotoMapView
                  projectId={projectId}
                  geotags={geotags}
                  projectCoordinates={projectCoordinates}
                  selectedIndex={selectedIndex}
                  onPhotoClick={handlePhotoClick}
                  kmlLink={kmlLink}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 z-[2000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedPhoto(null);
              setSelectedIndex(-1);
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedPhoto(null);
                setSelectedIndex(-1);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              aria-label={t("projectDetail.feedback.cancel")}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Arrows */}
            {currentPhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto('prev');
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                  aria-label={t("projects.pagination.prev")}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto('next');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                  aria-label={t("projects.pagination.next")}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Action Buttons */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedPhoto.url) {
                    handleDownload(selectedPhoto.url, selectedPhoto.photo_name || 'photo.jpg');
                  }
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label={t("projectDetail.overview.downloadQR")}
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedPhoto.url) {
                    handleShare(selectedPhoto.url, selectedPhoto.photo_name || t("projectDetail.tabs.photos.title"));
                  }
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Image Container */}
            <motion.div
              className="relative max-w-7xl max-h-[90vh] w-full"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedPhoto.url && (
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.photo_name || t("projectDetail.backToProjects")}
                  width={1920}
                  height={1080}
                  className="w-full h-full object-contain"
                  style={{ filter: 'none' }}
                  priority
                  unoptimized={isLocalMinIO(selectedPhoto.url)}
                />
              )}

              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                {selectedPhoto.photo_name && (
                  <h3 className="text-white text-sm md:text-lg font-semibold mb-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 w-fit">
                    {selectedPhoto.photo_name}
                  </h3>
                )}
                <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-white/90 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 w-fit">
                  {selectedPhoto.latitude && selectedPhoto.longitude && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="font-mono text-xs md:text-sm">
                        {selectedPhoto.latitude}, {selectedPhoto.longitude}
                      </span>
                    </div>
                  )}
                  {selectedPhoto.timestamp && (
                    <div className="text-xs md:text-sm">
                      {new Date(selectedPhoto.timestamp).toLocaleString(t("projectDetail.tabs.photos.grid") === "Grid" ? "en-PH" : "en-US")}
                    </div>
                  )}
                  {selectedPhoto.category && (
                    <div className="text-xs md:text-sm font-semibold text-green-400">
                      • {selectedPhoto.category}
                    </div>
                  )}
                </div>
                {currentPhotos.length > 1 && (
                  <div className="mt-2 text-xs text-white/70 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 w-fit">
                    {selectedIndex + 1} / {currentPhotos.length}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
