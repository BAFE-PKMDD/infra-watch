"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Radio, Search, Star, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

import { deleteLiveVideo, toggleLiveVideoActive, toggleLiveVideoLive } from "@/actions/mutation/live-videos.mutation";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LiveVideo } from "@/lib/db/schema";

interface LiveVideoTableProps {
  videos: LiveVideo[];
}

export function LiveVideoTable({ videos }: LiveVideoTableProps) {
  const [items, setItems] = useState(videos);
  const [loading, setLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || item.videoType === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive) ||
        (statusFilter === "live" && item.isLive);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, search, typeFilter, statusFilter]);

  const handleToggleActive = async (id: string) => {
    const targetItem = items.find((item) => item.id === id);
    if (!targetItem) return;

    const newIsActive = !targetItem.isActive;
    setLoading(id);

    setItems(
      items.map((item) => {
        if (item.id === id) return { ...item, isActive: newIsActive, isLive: newIsActive ? item.isLive : false };
        return item;
      })
    );

    const result = await toggleLiveVideoActive(id);

    if (!result.success) {
      setItems(videos);
      toast.error(result.error || "Failed to update status");
    } else {
      toast.success(newIsActive ? "Video activated" : "Video deactivated");
    }
    setLoading(null);
  };

  const handleToggleLive = async (id: string) => {
    const targetItem = items.find((item) => item.id === id);
    if (!targetItem) return;

    if (!targetItem.isActive) {
      toast.error("Cannot set inactive video as live");
      return;
    }

    const newIsLive = !targetItem.isLive;
    setLoading(id);

    setItems(
      items.map((item) => {
        if (item.id === id) return { ...item, isLive: newIsLive };
        if (newIsLive) return { ...item, isLive: false };
        return item;
      })
    );

    const result = await toggleLiveVideoLive(id);

    if (!result.success) {
      setItems(videos);
      toast.error(result.error || "Failed to update live status");
    } else {
      toast.success(newIsLive ? "Video is now live" : "Video is no longer live");
    }
    setLoading(null);
  };

  const handleDelete = async (id: string) => {
    setLoading(id);
    const result = await deleteLiveVideo(id);
    if (result.success) {
      setItems(items.filter((item) => item.id !== id));
      toast.success("Video deleted");
    } else {
      toast.error("Failed to delete video");
    }
    setLoading(null);
  };

  const renderEmptyState = () => (
    <Card className="flex flex-col items-center justify-center border-dashed bg-white p-12 text-center dark:bg-slate-900">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Video className="h-6 w-6" />
      </div>
      <p className="font-medium text-slate-900 dark:text-white">No videos found</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        {search || typeFilter !== "all" || statusFilter !== "all"
          ? "Try adjusting your filters to find what you're looking for."
          : "Create your first live video to start broadcasting."}
      </p>
    </Card>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search videos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white pl-9 dark:bg-slate-900"
            />
          </div>
          <Select value={typeFilter} onValueChange={(val: string | null) => setTypeFilter(val ?? "all")}>
            <SelectTrigger className="w-[150px] bg-white dark:bg-slate-900">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="facebook_live">Facebook Live</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="recorded">Recorded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter(val ?? "all")}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="live">🔴 Live</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link href="/live-videos/new">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10 font-semibold px-4">
            <Plus className="h-4 w-4" />
            Add Video
          </Button>
        </Link>
      </div>

      {filteredItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">Live Videos</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Title</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Live</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((video) => (
                  <TableRow key={video.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="max-w-[300px] py-4 font-medium whitespace-normal">
                      <div className="flex items-center gap-2">
                        {video.isFeatured && (
                          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                        <span>{video.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          video.videoType === "facebook_live"
                            ? "border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : video.videoType === "youtube"
                              ? "border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "border-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        }
                      >
                        {video.videoType === "facebook_live" ? "Facebook" : video.videoType === "youtube" ? "YouTube" : "Recorded"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {video.isLive && (
                          <Badge className="animate-pulse gap-1 border-0 bg-red-500 text-white">
                            <Radio className="h-3 w-3" />
                            LIVE
                          </Badge>
                        )}
                        <Badge
                          variant={video.isActive ? "default" : "secondary"}
                          className={
                            video.isActive
                              ? "border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "border-0 bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
                          }
                        >
                          {video.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {video.videoType !== "recorded" ? (
                        <Switch
                          checked={video.isLive}
                          onCheckedChange={() => handleToggleLive(video.id)}
                          disabled={loading === video.id || !video.isActive}
                          className="data-[state=checked]:bg-red-600"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={video.isActive}
                        onCheckedChange={() => handleToggleActive(video.id)}
                        disabled={loading === video.id}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/live-videos/${video.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20">
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="dark:bg-slate-900">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Video</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong className="text-slate-900 dark:text-white">&quot;{video.title}&quot;</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-200">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(video.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
