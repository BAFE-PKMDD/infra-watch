"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileCode2,
  FileText,
  FileUp,
  HelpCircle,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ExternalLink,
} from "lucide-react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Button } from "@/components/ui/button";
import { addFaqEntry, archiveKbDocument, deleteKbDocument, reindexDocument, restoreKbDocument, setKbDocumentVisibility } from "@/actions/mutation/knowledge-base.mutation";
import { getKbCategories, getKbDocuments, getKbStats, getKbDocumentWithChunks } from "@/actions/query/knowledge-base.query";
import { processKnowledgeBaseDocument } from "@/lib/knowledge-base-processing-client";

type StatusFilter = "all" | "embedded" | "indexing" | "pending" | "failed";
type RepositoryView = "active" | "archived";

interface KbDocument {
  id: string;
  title: string;
  category: string;
  visibility: string;
  fileType: string;
  fileName: string | null;
  fileSize: number | null;
  chunkCount: number;
  status: string;
  faqQuestion: string | null;
  faqAnswer: string | null;
  contentPreview: string | null;
  errorMessage: string | null;
  uploadedByName: string;
  archivedAt: Date | null;
  archivedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface KbStats {
  totalDocuments: number;
  totalChunks: number;
  embeddedCount: number;
  archivedDocuments: number;
  embeddingHealth: number;
  activeCategories: number;
}

interface ChunkData {
  id: string;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  createdAt: Date;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [stats, setStats] = useState<KbStats>({
    totalDocuments: 0,
    totalChunks: 0,
    embeddedCount: 0,
    archivedDocuments: 0,
    embeddingHealth: 0,
    activeCategories: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [repositoryView, setRepositoryView] = useState<RepositoryView>("active");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<(KbDocument & { chunks?: ChunkData[] }) | null>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<KbDocument | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<KbDocument | null>(null);

  // Form states
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [newFaqVisibility, setNewFaqVisibility] = useState<"public" | "admin_only">("public");
  const [faqSubmitting, setFaqSubmitting] = useState(false);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Guidelines");
  const [uploadVisibility, setUploadVisibility] = useState<"public" | "admin_only">("public");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  const [changingArchiveId, setChangingArchiveId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [changingVisibilityId, setChangingVisibilityId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [docs, statsData, categoryData] = await Promise.all([
        getKbDocuments({
          search: search || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          archived: repositoryView === "archived",
        }),
        getKbStats(),
        getKbCategories(),
      ]);
      setDocuments(docs as KbDocument[]);
      setStats(statsData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Failed to fetch KB data:", error);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, repositoryView]);

  useEffect(() => {
    const timeout = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchData]);

  // Poll for indexing documents
  useEffect(() => {
    const hasIndexing = documents.some((d) => d.status === "indexing" || d.status === "pending");
    if (!hasIndexing) return;

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchData]);

  const handleInspectChunks = async (doc: KbDocument) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const result = await getKbDocumentWithChunks(doc.id);
      if (result) {
        setSelectedDoc({ ...doc, chunks: result.chunks as ChunkData[] });
      }
    } catch (error) {
      console.error("Failed to load chunks:", error);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    setFaqSubmitting(true);
    try {
      const result = await addFaqEntry({
        question: newFaqQuestion.trim(),
        answer: newFaqAnswer.trim(),
        visibility: newFaqVisibility,
      });
      if (result.success) {
        setNewFaqQuestion("");
        setNewFaqAnswer("");
        setNewFaqVisibility("public");
        setFaqModalOpen(false);
        await fetchData();
      } else {
        alert(result.error || "Failed to add FAQ entry");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add FAQ entry");
    } finally {
      setFaqSubmitting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadCategory.trim() || !uploadFile) return;

    setUploadSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle.trim());
      formData.append("category", uploadCategory);
      formData.append("visibility", uploadVisibility);

      const response = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        if (typeof result.document?.id !== "string") {
          throw new Error("Upload completed without a valid document identifier.");
        }
        const documentId = result.document.id;
        setUploadTitle("");
        setUploadFile(null);
        setUploadVisibility("public");
        setUploadModalOpen(false);
        void processKnowledgeBaseDocument(documentId)
          .then(() => fetchData())
          .catch((error) => {
            alert(error instanceof Error ? error.message : "Document indexing failed");
            void fetchData();
          });
        await fetchData();
      } else {
        alert(result.error || "Upload failed");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleArchiveChange = async (id: string, restore: boolean) => {
    setChangingArchiveId(id);
    try {
      const result = restore ? await restoreKbDocument(id) : await archiveKbDocument(id);
      if (result.success) {
        if (selectedDoc?.id === id) setSelectedDoc(null);
        setPendingArchive(null);
        await fetchData();
      } else {
        alert(result.error || `Failed to ${restore ? "restore" : "archive"} document`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to ${restore ? "restore" : "archive"} document`);
    } finally {
      setChangingArchiveId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteKbDocument(id);
      if (result.success) {
        setPendingDeletion(null);
        if (selectedDoc?.id === id) setSelectedDoc(null);
        await fetchData();
      } else {
        alert(result.error || "Failed to delete document");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleVisibilityChange = async (id: string, visibility: "public" | "admin_only") => {
    setChangingVisibilityId(id);
    try {
      const result = await setKbDocumentVisibility(id, visibility);
      if (result.success) {
        await fetchData();
      } else {
        alert(result.error || "Failed to update visibility");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update visibility");
    } finally {
      setChangingVisibilityId(null);
    }
  };

  const handleReindex = async (id: string) => {
    try {
      const result = await reindexDocument(id);
      if (result.success) {
        void processKnowledgeBaseDocument(id)
          .then(() => fetchData())
          .catch((error) => {
            alert(error instanceof Error ? error.message : "Document reindexing failed");
            void fetchData();
          });
        await fetchData();
      } else {
        alert(result.error || "Failed to reindex");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to reindex");
    }
  };

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "System" }, { label: "Knowledge Base" }]}
      title="Knowledge Base & Reference Documents"
      description="Upload guidelines, FAQs, manuals, and policies to power ANIA's pgvector AI knowledge retrieval."
    >
      {/* Top Metrics Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Documents"
          value={stats.totalDocuments.toString()}
          subtext="Reference files & FAQs"
          icon={<BookOpen className="size-4" />}
          tone="blue"
        />
        <MetricCard
          label="Indexed Chunks"
          value={stats.totalChunks.toLocaleString()}
          subtext="pgvector embeddings"
          icon={<BrainCircuit className="size-4" />}
          tone="emerald"
        />
        <MetricCard
          label="Embedding Health"
          value={`${stats.embeddingHealth}%`}
          subtext={`${stats.embeddedCount} of ${stats.totalDocuments} ready`}
          icon={<CheckCircle2 className="size-4" />}
          tone="indigo"
        />
        <MetricCard
          label="Active Categories"
          value={stats.activeCategories.toString()}
          subtext="FAQs, Specs, Policies, Manuals"
          icon={<Layers className="size-4" />}
          tone="amber"
        />
      </section>

      {/* Main Controls Section */}
      <section data-tour="knowledge-controls" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary font-bold text-white hover:bg-primary/90"
            >
              <Upload className="size-4" />
              Upload Document
            </Button>
            <Button
              variant="outline"
              onClick={() => setFaqModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border-slate-200 font-bold dark:border-slate-800"
            >
              <Plus className="size-4" />
              Add FAQ Entry
            </Button>
            <Button
              variant="outline"
              onClick={() => setRepositoryView("archived")}
              className="inline-flex items-center gap-2 rounded-lg border-slate-200 font-bold dark:border-slate-800"
            >
              <Archive className="size-4" />
              Open Archive ({stats.archivedDocuments})
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Sparkles className="size-4 text-amber-500" />
            <span>Target Vector Store: <strong className="text-slate-900 dark:text-white">pgvector (PostgreSQL)</strong></span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid gap-3 md:grid-cols-[1fr_200px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents, FAQs, keywords..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All Index Statuses</option>
            <option value="embedded">Embedded (Ready)</option>
            <option value="indexing">Indexing in progress</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </section>

      {/* Documents Table */}
      <section data-tour="knowledge-repository" className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Document Repository</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {documents.length} entries
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setRepositoryView("active")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${repositoryView === "active" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setRepositoryView("archived")}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold ${repositoryView === "archived" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              <Archive className="size-3.5" /> Archive ({stats.archivedDocuments})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="mx-auto size-10 animate-spin text-slate-400" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Loading knowledge base...</h3>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="mx-auto size-10 text-slate-400" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No knowledge base documents found</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {repositoryView === "archived"
                ? "No archived documents match the current filters."
                : "Try refining your search terms or add a new FAQ / upload a reference file."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between dark:hover:bg-slate-950/50"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                    {doc.fileType === "FAQ Entry" ? (
                      <HelpCircle className="size-4" />
                    ) : doc.fileType === "PDF" ? (
                      <FileText className="size-4" />
                    ) : (
                      <FileCode2 className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white truncate">
                        {doc.title}
                      </h3>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {doc.category}
                      </span>
                      <select
                        value={doc.visibility}
                        disabled={changingVisibilityId === doc.id}
                        onChange={(e) =>
                          handleVisibilityChange(doc.id, e.target.value === "admin_only" ? "admin_only" : "public")
                        }
                        aria-label={`Visibility for ${doc.title}`}
                        className={`h-6 rounded-md border-0 px-1.5 text-[11px] font-extrabold outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 ${
                          doc.visibility === "admin_only"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <option value="public">Public</option>
                        <option value="admin_only">Admin only</option>
                      </select>
                      <StatusBadge status={doc.status} />
                    </div>

                    <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                      {doc.faqAnswer ? doc.faqAnswer : doc.contentPreview}
                    </p>

                    {doc.status === "failed" && doc.errorMessage && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        <AlertTriangle className="size-3" />
                        {doc.errorMessage}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
                      <span>Format: {doc.fileType} {doc.fileSize ? `(${formatFileSize(doc.fileSize)})` : ""}</span>
                      <span>•</span>
                      <span>Chunks: <strong className="text-slate-700 dark:text-slate-300">{doc.chunkCount} vector blocks</strong></span>
                      <span>•</span>
                      <span>Uploaded: {formatDate(doc.createdAt)} by {doc.uploadedByName}</span>
                      {doc.archivedAt && (
                        <>
                          <span>•</span>
                          <span>Archived: {formatDate(doc.archivedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {doc.fileName && (
                    <Button variant="outline" size="sm" asChild className="h-8 gap-1 text-xs font-bold">
                      <a
                        href={`/api/knowledge-base/files/${encodeURIComponent(doc.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        View File
                      </a>
                    </Button>
                  )}
                  {repositoryView === "active" && doc.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReindex(doc.id)}
                      className="h-8 gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                    >
                      <RefreshCw className="size-3.5" />
                      Retry
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInspectChunks(doc)}
                    className="h-8 gap-1 text-xs font-bold"
                    disabled={doc.chunkCount === 0}
                  >
                    <Layers className="size-3.5" />
                    Inspect Chunks
                  </Button>
                  {repositoryView === "archived" ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveChange(doc.id, true)}
                        disabled={changingArchiveId === doc.id}
                        className="h-8 gap-1 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {changingArchiveId === doc.id ? <RefreshCw className="size-3.5 animate-spin" /> : <ArchiveRestore className="size-3.5" />}
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDeletion(doc)}
                        className="h-8 gap-1 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingArchive(doc)}
                      className="h-8 gap-1 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Archive className="size-3.5" /> Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="size-5 text-primary" />
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Upload Document</h3>
              </div>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., DA-BAFE Guidelines 2026 Revision"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Category
                  </label>
                  <input
                    type="text"
                    list="knowledge-base-categories"
                    required
                    maxLength={80}
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    placeholder="Select or create"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <datalist id="knowledge-base-categories">
                    {categories.map((category) => <option key={category} value={category} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    File (.pdf, .txt, .md)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    required
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-xs font-semibold text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Visibility
                </label>
                <select
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value === "admin_only" ? "admin_only" : "public")}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="public">Public</option>
                  <option value="admin_only">Admin only</option>
                </select>
              </div>

              {uploadFile && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex items-center gap-2">
                    <FileUp className="size-4 text-slate-400 shrink-0" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{uploadFile.name}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-white" disabled={uploadSubmitting}>
                  {uploadSubmitting ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add FAQ Entry Modal */}
      {faqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-5 text-primary" />
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Add Knowledge Base FAQ Entry</h3>
              </div>
              <button onClick={() => setFaqModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddFaq} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  FAQ Question
                </label>
                <input
                  type="text"
                  required
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  placeholder="e.g., Why do solar irrigation projects show 0% progress in dry season?"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Official Detailed Answer (Used by ANIA AI)
                </label>
                <textarea
                  required
                  rows={4}
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="Provide the exact, detailed explanation that ANIA should use when users ask about this topic..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Visibility to ARIA
                </label>
                <select
                  value={newFaqVisibility}
                  onChange={(e) => setNewFaqVisibility(e.target.value === "admin_only" ? "admin_only" : "public")}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="public">Public - searchable from the citizen and admin surfaces</option>
                  <option value="admin_only">Admin only - searchable from the admin surface only</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  This is enforced when ARIA searches the knowledge base, not just a display label.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFaqModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-white" disabled={faqSubmitting}>
                  {faqSubmitting ? "Embedding..." : "Save FAQ Entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {pendingArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="archive-document-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <Archive className="size-5" />
              </span>
              <div>
                <h3 id="archive-document-title" className="text-base font-extrabold text-slate-950 dark:text-white">Archive this document?</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  <strong>{pendingArchive.title}</strong> will be removed from ANIA&apos;s active knowledge retrieval but its file and vector chunks will be retained.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPendingArchive(null)} disabled={changingArchiveId === pendingArchive.id}>Cancel</Button>
              <Button type="button" onClick={() => handleArchiveChange(pendingArchive.id, false)} disabled={changingArchiveId === pendingArchive.id} className="bg-amber-600 text-white hover:bg-amber-700">
                {changingArchiveId === pendingArchive.id ? <RefreshCw className="size-4 animate-spin" /> : <Archive className="size-4" />}
                Confirm Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {pendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-document-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                <Trash2 className="size-5" />
              </span>
              <div>
                <h3 id="delete-document-title" className="text-base font-extrabold text-slate-950 dark:text-white">Delete permanently?</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  This permanently deletes <strong>{pendingDeletion.title}</strong>, its uploaded file, and all vector chunks. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPendingDeletion(null)} disabled={deletingId === pendingDeletion.id}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => handleDelete(pendingDeletion.id)} disabled={deletingId === pendingDeletion.id}>
                {deletingId === pendingDeletion.id ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Chunks Drawer / Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BrainCircuit className="size-5 text-primary" />
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Vector Chunk Inspector</h3>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {selectedDoc.category}
                </span>
                <h4 className="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  {selectedDoc.title}
                </h4>
                <p className="mt-1 text-xs text-slate-500">ID: {selectedDoc.id} • {selectedDoc.chunkCount} generated chunks</p>
              </div>

              {loadingChunks ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="size-6 animate-spin text-slate-400" />
                </div>
              ) : selectedDoc.chunks && selectedDoc.chunks.length > 0 ? (
                selectedDoc.chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Chunk #{chunk.chunkIndex + 1} {chunk.tokenCount ? `(~${chunk.tokenCount} tokens)` : ""}
                    </h5>
                    <p className="mt-2 font-mono text-xs text-slate-700 dark:text-slate-300 line-clamp-6">
                      &ldquo;{chunk.content}&rdquo;
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="text-xs text-slate-500">No chunks available for this document.</p>
                </div>
              )}

              <div className="pt-4">
                <Button variant="outline" className="w-full gap-2" onClick={() => setSelectedDoc(null)}>
                  Close Inspector
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "embedded") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 className="size-3" /> Embedded
      </span>
    );
  }
  if (status === "indexing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
        <RefreshCw className="size-3 animate-spin" /> Indexing...
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-950/60 dark:text-red-300">
        <AlertTriangle className="size-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
      Pending
    </span>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "indigo" | "amber";
}) {
  const toneClass = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className={`inline-flex size-7 items-center justify-center rounded-lg ${toneClass}`}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
  );
}
