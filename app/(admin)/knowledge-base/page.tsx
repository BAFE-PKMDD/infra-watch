"use client";

import { useState } from "react";
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
} from "lucide-react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Button } from "@/components/ui/button";

type DocumentCategory = "all" | "faq" | "guidelines" | "technical" | "policy";
type StatusFilter = "all" | "embedded" | "indexing" | "pending";

interface KnowledgeDocument {
  id: string;
  title: string;
  category: "FAQ" | "Guidelines" | "Technical Spec" | "Policy";
  fileType: "PDF" | "TXT" | "FAQ Entry" | "Markdown";
  fileName?: string;
  fileSize?: string;
  chunkCount: number;
  status: "embedded" | "indexing" | "pending" | "failed";
  uploadedBy: string;
  updatedAt: string;
  contentPreview: string;
  faqAnswer?: string;
}

const INITIAL_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: "kb-001",
    title: "ABEMIS Offline Remarks & Sync Protocol Manual",
    category: "Technical Spec",
    fileType: "PDF",
    fileName: "abemis_sync_protocol_v2.pdf",
    fileSize: "2.4 MB",
    chunkCount: 28,
    status: "embedded",
    uploadedBy: "System Administrator",
    updatedAt: "2026-08-26 14:20",
    contentPreview: "Details manual sync retry policies, handling missing remarks, offline queue resolution, and PSGC location mapping fallbacks for regional offices.",
  },
  {
    id: "kb-002",
    title: "Why are project schedule updates missing or delayed?",
    category: "FAQ",
    fileType: "FAQ Entry",
    chunkCount: 2,
    status: "embedded",
    uploadedBy: "DA-BAFE Admin",
    updatedAt: "2026-08-25 09:15",
    contentPreview: "Q: Why are project schedule updates missing or delayed?",
    faqAnswer: "Schedule updates depend on field engineer submissions through the ABEMIS mobile app. Projects in remote areas without cellular connection sync automatically once connectivity is restored.",
  },
  {
    id: "kb-003",
    title: "DA-BAFE Infrastructure Quality Guidelines (2025 Revised Edition)",
    category: "Guidelines",
    fileType: "PDF",
    fileName: "bafe_infra_quality_standards_2025.pdf",
    fileSize: "5.8 MB",
    chunkCount: 64,
    status: "embedded",
    uploadedBy: "Regional Coordinator",
    updatedAt: "2026-08-24 16:45",
    contentPreview: "Standard technical specifications for Farm-to-Market Roads (FMR), Solar-Powered Irrigation Systems (SPIS), and Post-Harvest Warehouse Facilities.",
  },
  {
    id: "kb-004",
    title: "How to interpret Project Completion Rate vs Physical Progress?",
    category: "FAQ",
    fileType: "FAQ Entry",
    chunkCount: 3,
    status: "embedded",
    uploadedBy: "Analytics Officer",
    updatedAt: "2026-08-23 11:30",
    contentPreview: "Q: How to interpret Project Completion Rate vs Physical Progress?",
    faqAnswer: "Completion Rate represents the percentage of projects marked fully finished (100%), whereas Physical Progress measures the overall weighted work done across all active projects.",
  },
  {
    id: "kb-005",
    title: "National Agricultural Infrastructure Policy & Procurement Rules",
    category: "Policy",
    fileType: "Markdown",
    fileName: "national_agri_infra_procurement_policy.md",
    fileSize: "840 KB",
    chunkCount: 42,
    status: "embedded",
    uploadedBy: "Legal & Compliance Unit",
    updatedAt: "2026-08-20 10:00",
    contentPreview: "RA 9184 compliance guidelines for agricultural infrastructure projects, bid evaluation criteria, and liquidated damages formulas for delayed timelines.",
  },
  {
    id: "kb-006",
    title: "Region III & Region VI Delayed Project Emergency Resolution Circular",
    category: "Guidelines",
    fileType: "PDF",
    fileName: "circular_2026_delayed_projects_resolution.pdf",
    fileSize: "1.2 MB",
    chunkCount: 16,
    status: "indexing",
    uploadedBy: "Monitoring Bureau",
    updatedAt: "2026-08-27 06:10",
    contentPreview: "Directive requiring regional offices to issue formal progress warnings for infrastructure projects exceeding 15% schedule variance.",
  },
];

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(INITIAL_DOCUMENTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);

  // Form states
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [newFaqCategory] = useState<KnowledgeDocument["category"]>("FAQ");

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<KnowledgeDocument["category"]>("Guidelines");
  const [uploadFileName, setUploadFileName] = useState("");

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.contentPreview.toLowerCase().includes(search.toLowerCase()) ||
      (doc.fileName && doc.fileName.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "faq" && doc.category === "FAQ") ||
      (categoryFilter === "guidelines" && doc.category === "Guidelines") ||
      (categoryFilter === "technical" && doc.category === "Technical Spec") ||
      (categoryFilter === "policy" && doc.category === "Policy");

    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalChunks = documents.reduce((sum, d) => sum + d.chunkCount, 0);
  const embeddedCount = documents.filter((d) => d.status === "embedded").length;

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const newDoc: KnowledgeDocument = {
      id: `kb-${Date.now()}`,
      title: newFaqQuestion.trim(),
      category: newFaqCategory,
      fileType: "FAQ Entry",
      chunkCount: Math.ceil(newFaqAnswer.length / 300) || 1,
      status: "embedded",
      uploadedBy: "System Administrator",
      updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      contentPreview: `Q: ${newFaqQuestion.trim()}`,
      faqAnswer: newFaqAnswer.trim(),
    };

    setDocuments([newDoc, ...documents]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
    setFaqModalOpen(false);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    const newDoc: KnowledgeDocument = {
      id: `kb-${Date.now()}`,
      title: uploadTitle.trim(),
      category: uploadCategory,
      fileType: uploadFileName.endsWith(".pdf") ? "PDF" : uploadFileName.endsWith(".md") ? "Markdown" : "TXT",
      fileName: uploadFileName || "uploaded_document.pdf",
      fileSize: "1.5 MB",
      chunkCount: 12,
      status: "indexing",
      uploadedBy: "System Administrator",
      updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      contentPreview: `Reference document "${uploadTitle.trim()}" queued for pgvector text chunking and embedding.`,
    };

    setDocuments([newDoc, ...documents]);
    setUploadTitle("");
    setUploadFileName("");
    setUploadModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
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
          value={documents.length.toString()}
          subtext="Reference files & FAQs"
          icon={<BookOpen className="size-4" />}
          tone="blue"
        />
        <MetricCard
          label="Indexed Chunks"
          value={totalChunks.toLocaleString()}
          subtext="pgvector embeddings"
          icon={<BrainCircuit className="size-4" />}
          tone="emerald"
        />
        <MetricCard
          label="Embedding Health"
          value={`${Math.round((embeddedCount / (documents.length || 1)) * 100)}%`}
          subtext={`${embeddedCount} of ${documents.length} ready`}
          icon={<CheckCircle2 className="size-4" />}
          tone="indigo"
        />
        <MetricCard
          label="Active Categories"
          value="4"
          subtext="FAQs, Specs, Policies, Manuals"
          icon={<Layers className="size-4" />}
          tone="amber"
        />
      </section>

      {/* Main Controls Section */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="faq">FAQs Only</option>
            <option value="guidelines">Guidelines</option>
            <option value="technical">Technical Specs</option>
            <option value="policy">Policies</option>
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
          </select>
        </div>
      </section>

      {/* Documents Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Document Repository</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredDocs.length} of {documents.length} entries
            </p>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="mx-auto size-10 text-slate-400" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No knowledge base documents found</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try refining your search terms or add a new FAQ / upload a reference PDF.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredDocs.map((doc) => (
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
                      <StatusBadge status={doc.status} />
                    </div>

                    <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                      {doc.faqAnswer ? doc.faqAnswer : doc.contentPreview}
                    </p>

                    <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
                      <span>Format: {doc.fileType} {doc.fileSize ? `(${doc.fileSize})` : ""}</span>
                      <span>•</span>
                      <span>Chunks: <strong className="text-slate-700 dark:text-slate-300">{doc.chunkCount} vector blocks</strong></span>
                      <span>•</span>
                      <span>Uploaded: {doc.updatedAt} by {doc.uploadedBy}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDoc(doc)}
                    className="h-8 gap-1 text-xs font-bold"
                  >
                    <Layers className="size-3.5" />
                    Inspect Chunks
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="size-5 text-primary" />
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Upload Reference Document</h3>
              </div>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Document Title
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
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as KnowledgeDocument["category"])}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Guidelines">Guidelines</option>
                    <option value="Technical Spec">Technical Spec</option>
                    <option value="Policy">Policy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select File (.pdf, .txt, .md)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={(e) => setUploadFileName(e.target.files?.[0]?.name || "")}
                    className="mt-1 block w-full text-xs font-semibold text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300"
                  />
                </div>
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950/50">
                <FileUp className="mx-auto size-8 text-slate-400" />
                <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Drag and drop reference PDF or text manual here
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Document text will be extracted, split into vector chunks, and embedded into pgvector.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-white">
                  Start Vector Indexing
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFaqModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-white">
                  Save FAQ Entry
                </Button>
              </div>
            </form>
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

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sample Chunk #1 (Vector Dimension: 1536)</h5>
                <p className="mt-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                  &ldquo;{selectedDoc.faqAnswer || selectedDoc.contentPreview}&rdquo;
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sample Chunk #2</h5>
                <p className="mt-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                  &ldquo;Metadata: uploadedBy=&apos;{selectedDoc.uploadedBy}&apos;, category=&apos;{selectedDoc.category}&apos;, updatedAt=&apos;{selectedDoc.updatedAt}&apos;&rdquo;
                </p>
              </div>

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

function StatusBadge({ status }: { status: KnowledgeDocument["status"] }) {
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
