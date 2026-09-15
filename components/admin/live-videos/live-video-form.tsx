"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ExternalLink, Eye, Play, Radio, Save, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";

import { createLiveVideo, updateLiveVideo } from "@/actions/mutation/live-videos.mutation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { LiveVideo } from "@/lib/db/schema";
import { getFullUrl } from "@/lib/minio-url";
import { cn } from "@/lib/utils";
import { uploadLiveVideoAsset } from "@/lib/live-video-upload";
import { getVideoEmbedUrl } from "@/lib/video-utils";

interface LiveVideoFormProps {
  initialData?: LiveVideo | null;
}

export function LiveVideoForm({ initialData }: LiveVideoFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [videoType, setVideoType] = useState<"facebook_live" | "youtube" | "recorded">(
    (initialData?.videoType as "facebook_live" | "youtube" | "recorded") || "facebook_live"
  );
  const [facebookVideoUrl, setFacebookVideoUrl] = useState(initialData?.facebookVideoUrl || "");
  const [videoPath, setVideoPath] = useState(initialData?.videoPath || "");
  const [thumbnailPath, setThumbnailPath] = useState(initialData?.thumbnailPath || "");
  const [isActive, setIsActive] = useState(initialData?.isActive || false);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [isLive, setIsLive] = useState(initialData?.isLive || false);
  const [displayOrder, setDisplayOrder] = useState(initialData?.displayOrder || 0);
  const [publishedAt, setPublishedAt] = useState(
    initialData?.publishedAt ? new Date(initialData.publishedAt).toISOString().split("T")[0] : ""
  );
  const [expiresAt, setExpiresAt] = useState(
    initialData?.expiresAt ? new Date(initialData.expiresAt).toISOString().split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const embedUrl = videoType === "recorded"
    ? null
    : getVideoEmbedUrl(videoType, facebookVideoUrl);

  const handleRemoveVideo = () => {
    setVideoPath("");
    toast.success("Video path removed");
  };

  const handleRemoveThumbnail = () => {
    setThumbnailPath("");
    toast.success("Thumbnail removed");
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const path = await uploadLiveVideoAsset(file);
      setVideoPath(path);
      toast.success("Video uploaded successfully");
    } catch (error) {
      console.error("Video upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const path = await uploadLiveVideoAsset(file);
      setThumbnailPath(path);
      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      console.error("Thumbnail upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload thumbnail");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (videoType !== "recorded" && !embedUrl) {
      toast.error(`Please enter a valid HTTPS ${videoType === "youtube" ? "YouTube" : "Facebook"} video URL`);
      return;
    }

    if (videoType === "recorded" && !videoPath) {
      toast.error("Please upload a video file");
      return;
    }

    setLoading(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      videoType,
      facebookVideoUrl: videoType !== "recorded" ? facebookVideoUrl.trim() : null,
      videoPath: videoType === "recorded" ? videoPath : null,
      thumbnailPath: thumbnailPath || null,
      isActive,
      isFeatured,
      isLive: videoType !== "recorded" ? isLive : false,
      displayOrder,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    };

    let result;
    if (isEditing && initialData?.id) {
      result = await updateLiveVideo(initialData.id, payload);
    } else {
      result = await createLiveVideo(payload);
    }

    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Video updated successfully" : "Video created successfully");
      router.push("/live-videos");
      router.refresh();
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <Card className="w-full overflow-hidden border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="p-6 md:p-8 space-y-8">
              <div className="w-full">
                {/* Video Type Tabs */}
                <div className="grid w-full grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setVideoType("facebook_live")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all cursor-pointer",
                      videoType === "facebook_live"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Facebook Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoType("youtube")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                      videoType === "youtube"
                        ? "bg-white font-bold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoType("recorded")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all cursor-pointer",
                      videoType === "recorded"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    Recorded Video
                  </button>
                </div>

                {/* Common Fields */}
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                    <Video className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Video Details
                    </h3>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Title
                      </label>
                      <span className="text-xs italic text-slate-400">Required</span>
                    </div>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., INFRA Watch Live Update - 2026"
                      className="border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Description (Optional)
                    </label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of the video content..."
                      rows={3}
                      className="border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Thumbnail (Optional)
                    </label>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
                      {thumbnailPath ? (
                        <div className="group relative">
                          <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                            <Image
                              src={getFullUrl(thumbnailPath) || ""}
                              alt="Thumbnail"
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete thumbnail?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRemoveThumbnail} className="bg-red-600">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleThumbnailUpload}
                            disabled={uploading}
                            className="hidden"
                            id="thumbnail-upload"
                          />
                          <label htmlFor="thumbnail-upload">
                            <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer">
                              <span>{uploading ? "Uploading..." : "Upload Thumbnail"}</span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab Contents */}
                <div className="mt-6">
                  {videoType !== "recorded" ? (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label htmlFor="externalVideoUrl" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {videoType === "youtube" ? "YouTube Video URL" : "Facebook Video URL"}
                          </label>
                          <span className="text-xs italic text-slate-400">Required</span>
                        </div>
                        <Input
                          id="externalVideoUrl"
                          value={facebookVideoUrl}
                          onChange={(e) => setFacebookVideoUrl(e.target.value)}
                          placeholder={videoType === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://www.facebook.com/watch/?v=..."}
                          className="border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Paste the full {videoType === "youtube" ? "YouTube" : "Facebook"} video URL from the share button
                        </p>
                      </div>

                      {/* Preview */}
                      {embedUrl && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Preview</label>
                          <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                            <iframe
                              {...({ credentialless: "" } as Record<string, string>)}
                              src={embedUrl ?? undefined}
                              title={`${videoType === "youtube" ? "YouTube" : "Facebook"} video preview`}
                              className="h-full w-full border-0"
                              allowFullScreen
                              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            />
                          </div>
                        </div>
                      )}

                      {/* Live Toggle */}
                      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800/50 dark:bg-red-900/10">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                            <label htmlFor="isLive" className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white">
                              Currently Live
                            </label>
                          </div>
                          <p className="ml-6 text-xs text-slate-500 dark:text-slate-400">
                            Show popup notification on landing page
                          </p>
                        </div>
                        <Switch
                          id="isLive"
                          checked={isLive}
                          onCheckedChange={(checked: boolean) => {
                            setIsLive(checked);
                            if (checked) setIsActive(true);
                          }}
                          className="data-[state=checked]:bg-red-600"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Upload Video
                        </label>
                        <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                          {videoPath ? (
                            <div className="space-y-3">
                              <p className="text-xs text-slate-500 truncate">{videoPath}</p>
                              <Button type="button" variant="destructive" size="sm" onClick={handleRemoveVideo}>
                                Remove Video
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="mx-auto h-8 w-8 text-slate-400" />
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Drag and drop or click to upload
                              </p>
                              <p className="text-xs text-slate-500">MP4, MOV, WebM, or MKV</p>
                              <input
                                type="file"
                                accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mkv"
                                onChange={handleVideoUpload}
                                disabled={uploading}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              />
                              {uploading ? (
                                <p className="text-xs text-emerald-600 font-semibold">Uploading...</p>
                              ) : (
                                <Button type="button" variant="outline" size="sm">
                                  Select File
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800/50" />

              {/* Settings Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Display Settings
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {/* Visibility */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                      <div className="space-y-0.5">
                        <label htmlFor="isActive" className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white">
                          Active
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Show on public /live page
                        </p>
                      </div>
                      <Switch
                        id="isActive"
                        checked={isActive}
                        onCheckedChange={(checked: boolean) => {
                          setIsActive(checked);
                          if (!checked) setIsLive(false);
                        }}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                      <div className="space-y-0.5">
                        <label htmlFor="isFeatured" className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white">
                          Featured
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Show as main video
                        </p>
                      </div>
                      <Switch
                        id="isFeatured"
                        checked={isFeatured}
                        onCheckedChange={(checked: boolean) => setIsFeatured(checked)}
                        className="data-[state=checked]:bg-yellow-600"
                      />
                    </div>
                  </div>

                  {/* Order & Schedule */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="displayOrder" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Display Order
                      </label>
                      <Input
                        id="displayOrder"
                        type="number"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                        min={0}
                        className="border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Scheduling (Optional)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="publishedAt" className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          Publish Date
                        </label>
                        <Input
                          id="publishedAt"
                          type="date"
                          value={publishedAt}
                          onChange={(e) => setPublishedAt(e.target.value)}
                          className="h-9 border-slate-200 bg-slate-50/50 text-sm dark:border-slate-800 dark:bg-slate-900/50"
                        />
                      </div>
                      <div>
                        <label htmlFor="expiresAt" className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          Expiry Date
                        </label>
                        <Input
                          id="expiresAt"
                          type="date"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="h-9 border-slate-200 bg-slate-50/50 text-sm dark:border-slate-800 dark:bg-slate-900/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/50 dark:bg-slate-900/50">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="gap-2 bg-emerald-600 px-8 py-6 text-base font-bold shadow-lg shadow-emerald-600/10 hover:bg-emerald-700"
              >
                <Save className="h-5 w-5" />
                {loading ? "Saving..." : isEditing ? "Update Video" : "Create Video"}
              </Button>
              <Link href="/live-videos">
                <Button type="button" variant="ghost" className="px-6 py-6 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
