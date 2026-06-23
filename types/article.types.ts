/**
 * Article-related types
 */

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  thumbnail?: string | null;
  thumbnailAlt?: string | null;
  excerpt?: string | null;
  category: string;
  tags?: string[];
  author?: string | null;
  publishedDate?: string | null;
  projectId?: string | null; // Foreign key to projects table
  addedBy: string;
  createdAt: string;
  updatedAt: string;
  projectDetails?: {
    id: string;
    name: string;
    sourceProjectId: string | null;
    sourceId: string | null;
  } | null;
}

export interface ArticleFormData {
  title: string;
  url: string;
  source: string;
  thumbnail?: string;
  thumbnailAlt?: string;
  excerpt?: string;
  category: string;
  tags: string[];
  author?: string;
  publishedDate?: string;
  projectId?: string; // Foreign key to projects table
}

export type ArticleCategory = "news" | "publication" | "research" | "announcement" | "report";

export interface ArticleCategoryOption {
  value: ArticleCategory;
  label: string;
}

export const ARTICLE_CATEGORIES: ArticleCategoryOption[] = [
  { value: "news", label: "News" },
  { value: "publication", label: "Publication" },
  { value: "research", label: "Research" },
  { value: "announcement", label: "Announcement" },
  { value: "report", label: "Report" },
];
