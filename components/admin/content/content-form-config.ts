import type { ContentKind } from "@/lib/content-models";

export type ContentField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "url"
    | "textarea"
    | "date"
    | "datetime-local"
    | "number"
    | "checkbox"
    | "color"
    | "project";
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue?: string | number | boolean;
  hint?: string;
};
export const CONTENT_CONFIG: Record<
  ContentKind,
  {
    title: string;
    singular: string;
    description: string;
    fields: ContentField[];
  }
> = {
  articles: {
    title: "Articles & Publications",
    singular: "article",
    description:
      "Manage external news, publication, and research links. Added links appear in Articles & Updates and on their related public project.",
    fields: [
      { name: "title", label: "Title", required: true, maxLength: 300 },
      {
        name: "url",
        label: "Article URL",
        type: "url",
        required: true,
        maxLength: 2048,
      },
      {
        name: "source",
        label: "Source or publisher",
        required: true,
        maxLength: 160,
      },
      {
        name: "category",
        label: "Category",
        options: ["news", "publication", "research", "announcement", "report"],
        defaultValue: "news",
      },
      {
        name: "projectId",
        label: "Related project",
        type: "project",
        hint: "Search by name or INFRA Watch project code. Leave blank for a general article.",
      },
      { name: "excerpt", label: "Summary", type: "textarea", maxLength: 3000 },
      {
        name: "thumbnail",
        label: "Thumbnail URL",
        type: "url",
        maxLength: 2048,
      },
      { name: "thumbnailAlt", label: "Thumbnail description", maxLength: 300 },
      { name: "author", label: "Author", maxLength: 160 },
      { name: "publishedDate", label: "Source publication date", type: "date" },
      {
        name: "tags",
        label: "Tags",
        maxLength: 1200,
        hint: "Separate tags with commas. Up to 20 tags.",
      },
    ],
  },
  announcements: {
    title: "Announcements",
    singular: "announcement",
    description:
      "Publish a portal announcement immediately or schedule its display period. Activating a notice replaces the previously active notice.",
    fields: [
      { name: "title", label: "Title", required: true, maxLength: 300 },
      {
        name: "content",
        label: "Announcement content",
        type: "textarea",
        required: true,
        maxLength: 20000,
        hint: "Supports Markdown: **bold**, *italic*, headings, lists, and links. Preview below.",
      },
      {
        name: "startDate",
        label: "Display from",
        type: "datetime-local",
        hint: "Optional. Blank means display immediately when active.",
      },
      {
        name: "endDate",
        label: "Display until",
        type: "datetime-local",
        hint: "Optional. Blank means no end date.",
      },
      {
        name: "isActive",
        label: "Activate this announcement",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },
  "map-layers": {
    title: "Map Layers",
    singular: "map layer",
    description:
      "Manage GeoServer WMS overlays, their order, opacity, and legend. Active layers are available on the public infrastructure map.",
    fields: [
      { name: "name", label: "Display name", required: true, maxLength: 255 },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        maxLength: 1000,
      },
      {
        name: "geoserverUrl",
        label: "GeoServer URL",
        type: "url",
        required: true,
        maxLength: 2048,
        hint: "Enter the GeoServer base URL or its complete WMS endpoint.",
      },
      { name: "workspace", label: "Workspace", required: true, maxLength: 160 },
      {
        name: "layerName",
        label: "Layer name",
        required: true,
        maxLength: 255,
      },
      {
        name: "styleName",
        label: "Style name",
        maxLength: 160,
        hint: "Optional. Blank uses the layer's default style.",
      },
      {
        name: "opacity",
        label: "Opacity (0 to 1)",
        type: "number",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.7,
      },
      {
        name: "displayOrder",
        label: "Display order",
        type: "number",
        min: 0,
        max: 10000,
        step: 1,
        defaultValue: 0,
      },
      {
        name: "legendShape",
        label: "Legend shape",
        options: ["circle", "square", "line", "triangle", "diamond", "polygon"],
        defaultValue: "circle",
      },
      {
        name: "legendColor",
        label: "Legend color",
        type: "color",
        defaultValue: "#10b981",
      },
      {
        name: "isActive",
        label: "Make available on the public map",
        type: "checkbox",
        defaultValue: true,
      },
    ],
  },
};
