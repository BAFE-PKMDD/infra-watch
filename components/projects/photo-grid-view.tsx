"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { ImageIcon, MapPin, ChevronLeft, ZoomIn, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getBlurDataURL } from "@/lib/image-utils";
import { GeoTag } from "@/types/photo.types";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const PHOTOS_PER_PAGE = 9;
const SLIDESHOW_INTERVAL = 2000;
const STAGGER_CHILDREN = 0.05;
const ITEM_INITIAL_SCALE = 0.9;
const ITEM_INITIAL_Y = 10;
const SPRING_STIFFNESS = 260;
const SPRING_DAMPING = 20;
const PHOTO_CARD_WIDTH = 600;
const PHOTO_CARD_HEIGHT = 450;
const ANIMATION_DURATION_LONG = 700;
const ANIMATION_DURATION_NORMAL = 500;
const ANIMATION_DURATION_FAST = 300;
const FOLDER_STIFFNESS = 300;
const FOLDER_DAMPING = 20;
const COVER_PHOTO_STALE_DURATION = 1.5;
const COVER_PHOTO_WIDTH = 400;
const COVER_PHOTO_HEIGHT = 300;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_CHILDREN
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: ITEM_INITIAL_SCALE, y: ITEM_INITIAL_Y },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: SPRING_STIFFNESS,
      damping: SPRING_DAMPING
    }
  }
};

interface PhotoGridViewProps {
  geotags: GeoTag[];
  onPhotoClick: (tag: GeoTag, index: number, filteredPhotos?: GeoTag[]) => void;
}

type CategoryKey = "validation" | "progress" | "completed" | "uncategorized";

function PhotoCard({ tag, index, onPhotoClick, filteredPhotos }: {
  tag: GeoTag;
  index: number;
  onPhotoClick: PhotoGridViewProps["onPhotoClick"];
  filteredPhotos: GeoTag[];
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { t } = useTranslation();

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      layout
      className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm hover:shadow-2xl hover:shadow-green-900/10 dark:hover:shadow-black/50 transition-all duration-500 cursor-pointer isolate"
      onClick={() => tag.url && onPhotoClick(tag, index, filteredPhotos)}
    >
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}

      {tag.url ? (
        <>
          <Image
            width={PHOTO_CARD_WIDTH}
            height={PHOTO_CARD_HEIGHT}
            src={tag.url}
            alt={tag.photo_name || ""}
            className={cn(
              "w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-110",
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            )}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
            <div className="p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white">
              <ZoomIn className="w-4 h-4" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
            {tag.photo_name && <h4 className="text-white font-semibold text-base line-clamp-1 mb-1 drop-shadow-md">{tag.photo_name}</h4>}
            <div className="flex items-center justify-between text-white/80 text-xs font-medium">
              {tag.timestamp && (
                <span className="backdrop-blur-sm bg-black/20 px-2 py-1 rounded-md">
                  {new Date(tag.timestamp).toLocaleDateString()}
                </span>
              )}
              {tag.latitude && tag.longitude && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                  <MapPin className="w-3 h-3 text-green-400" />
                  <span className="font-mono">{tag.latitude.substring(0, 7)}, {tag.longitude.substring(0, 7)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <ImageIcon className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">No photo available</p>
        </div>
      )}
    </motion.div>
  );
}

export function PhotoGridView({ geotags, onPhotoClick }: PhotoGridViewProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});

  const groupedPhotos = useMemo(() => {
    const groups: Record<CategoryKey, GeoTag[]> = {
      validation: [],
      progress: [],
      completed: [],
      uncategorized: []
    };

    geotags.forEach(tag => {
      const cat = tag.category;
      if (cat === "Validation Photos") groups.validation.push(tag);
      else if (cat === "Progress Photos") groups.progress.push(tag);
      else if (cat === "Completed Photos") groups.completed.push(tag);
      else groups.uncategorized.push(tag);
    });

    return groups;
  }, [geotags]);

  // Staggered Slideshow effect - Pause when a category is selected
  useEffect(() => {
    if (selectedCategory) return;

    const keys: CategoryKey[] = ["validation", "progress", "completed", "uncategorized"];
    let currentKeyIndex = 0;

    const interval = setInterval(() => {
      const keyToUpdate = keys[currentKeyIndex];
      const photos = groupedPhotos[keyToUpdate];

      if (photos && photos.length > 1) {
        setCurrentImageIndices(prev => ({
          ...prev,
          [keyToUpdate]: ((prev[keyToUpdate] || 0) + 1) % photos.length
        }));
      }

      // Move to next category for the next tick
      currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    }, SLIDESHOW_INTERVAL);

    return () => clearInterval(interval);
  }, [groupedPhotos, selectedCategory]);

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(PHOTOS_PER_PAGE);

  // Reset visible count when category changes
  useEffect(() => {
    setVisibleCount(PHOTOS_PER_PAGE);
  }, [selectedCategory]);

  const categoryOrder: { key: CategoryKey, labelKey: string, color: string, gradient: string }[] = [
    { key: "validation", labelKey: "projectDetail.tabs.photos.categories.validation", color: "text-blue-500", gradient: "from-blue-500/20 to-blue-900/40" },
    { key: "progress", labelKey: "projectDetail.tabs.photos.categories.progress", color: "text-amber-500", gradient: "from-amber-500/20 to-amber-900/40" },
    { key: "completed", labelKey: "projectDetail.tabs.photos.categories.completed", color: "text-green-500", gradient: "from-green-500/20 to-green-900/40" },
    { key: "uncategorized", labelKey: "projectDetail.tabs.photos.categories.uncategorized", color: "text-slate-500", gradient: "from-slate-500/20 to-slate-900/40" },
  ];

  // Helper to get active category config
  const activeCategoryConfig = selectedCategory ? categoryOrder.find(c => c.key === selectedCategory) : null;
  const activePhotos = selectedCategory ? groupedPhotos[selectedCategory] : [];

  return (
    <div className="min-h-[400px]">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          /* ALBUMS VIEW */
          <motion.div
            key="albums"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-slate-500" />
              {t("projectDetail.tabs.photos.albums")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categoryOrder.map(({ key, labelKey, color, gradient }) => {
                const photos = groupedPhotos[key];
                if (photos.length === 0) return null;

                const currentIndex = currentImageIndices[key] || 0;
                const coverPhoto = photos[currentIndex];

                return (
                  <motion.div
                    key={key}
                    layoutId={`folder-${key}`}
                    onClick={() => setSelectedCategory(key)}
                    className="group relative cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: FOLDER_STIFFNESS, damping: FOLDER_DAMPING }}
                  >
                    {/* Folder Card */}
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm group-hover:shadow-xl transition-all duration-300 relative border border-slate-200 dark:border-slate-700/50">
                      <AnimatePresence mode="popLayout">
                        {coverPhoto?.url ? (
                          <motion.div
                            key={`${key}-${currentIndex}`}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: COVER_PHOTO_STALE_DURATION, ease: "easeInOut" }}
                            className="absolute inset-0 w-full h-full"
                          >
                            <Image
                              src={coverPhoto.url}
                              alt={t(labelKey)}
                              width={COVER_PHOTO_WIDTH}
                              height={COVER_PHOTO_HEIGHT}
                              className="w-full h-full object-cover"
                              placeholder="blur"
                              blurDataURL={getBlurDataURL(COVER_PHOTO_WIDTH, COVER_PHOTO_HEIGHT)}
                            />
                          </motion.div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 absolute inset-0">
                            <ImageIcon className="w-12 h-12 text-slate-300" />
                          </div>
                        )}
                      </AnimatePresence>

                      {/* Gradient Overlay */}
                      <div className={cn("absolute inset-0 bg-gradient-to-t transition-opacity duration-300 opacity-60 group-hover:opacity-80 z-10", gradient)} />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300 z-10" />

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                        <h4 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-md">
                          {t(labelKey)}
                        </h4>
                        <p className="text-white/90 text-sm font-medium flex items-center gap-1.5">
                          <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
                            {photos.length} photos
                          </span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* PHOTOS GRID VIEW */
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Navigation Header */}
            <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 pl-2 pr-3 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
                {t("projectDetail.tabs.photos.backToAlbums")}
              </Button>

              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />

              {activeCategoryConfig && (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t(activeCategoryConfig.labelKey)}
                  </h3>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800", activeCategoryConfig.color)}>
                    {activePhotos.length}
                  </span>
                </div>
              )}
            </div>

            {/* Photos Grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {activePhotos.slice(0, visibleCount).map((tag, index) => (
                  <PhotoCard
                    key={`${tag.id || 'id'}-${tag.url || 'url'}-${index}`}
                    tag={tag}
                    index={index}
                    onPhotoClick={onPhotoClick}
                    filteredPhotos={activePhotos}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Load More Button */}
            {activePhotos.length > PHOTOS_PER_PAGE && (
              <div className="flex justify-center pt-4 pb-8">
                {visibleCount < activePhotos.length ? (
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => prev + PHOTOS_PER_PAGE)}
                    className="group gap-2 rounded-full px-6 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Load more
                    <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setVisibleCount(PHOTOS_PER_PAGE)}
                    className="group gap-2 rounded-full px-6 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Show less
                    <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                  </Button>
                )}
              </div>
            )}

            {activePhotos.length === 0 && (
              <div className="py-20 text-center text-slate-500">
                <p>{t("projectDetail.tabs.photos.empty")}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
