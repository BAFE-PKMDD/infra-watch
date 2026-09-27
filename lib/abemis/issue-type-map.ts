import {
  AlertTriangle,
  Bug,
  Calendar,
  Clock,
  CloudRain,
  Compass,
  Construction,
  Droplets,
  FlaskConical,
  Hammer,
  HardHat,
  HelpCircle,
  Hourglass,
  Lightbulb,
  Mountain,
  PauseCircle,
  PowerOff,
  Shapes,
  ShieldAlert,
  Signpost,
  Thermometer,
  ThumbsUp,
  Trees,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type ReportCategory = "quality" | "progress" | "general" | "concerns";

/**
 * Issue types a citizen can report against an infrastructure item, informed by the
 * physical-status checklist categories in the DA-APSAM IMMAS operation and maintenance
 * assessment forms as well as category-specific feedback dimensions:
 * - Project Quality (materials, workmanship, construction standards)
 * - Project Progress (timeline, completion status, pacing)
 * - General Feedback (suggestions, community impact, commendation, inquiries)
 * - Concerns & Issues (safety, damage, theft, urgent operational hazards)
 *
 * `farmOperations` lists which Farm Operation categories (see project-type-map.ts,
 * sourced from infrastructure-categorization.json) this type is recommended for.
 * An empty array means the type applies to any infrastructure item.
 */
export interface IssueTypeOption {
  id: string;
  label: string;
  icon: LucideIcon;
  farmOperations: string[];
  categories: ReportCategory[];
}

export const ISSUE_TYPES: IssueTypeOption[] = [
  // Common across categories or specifically tagged
  {
    id: "safety_hazard",
    label: "Safety Hazard",
    icon: AlertTriangle,
    farmOperations: [],
    categories: ["concerns"],
  },
  {
    id: "not_operational",
    label: "Idle / Not Operational",
    icon: PowerOff,
    farmOperations: [],
    categories: ["concerns", "progress"],
  },
  {
    id: "vandalism_theft",
    label: "Vandalism or Theft",
    icon: ShieldAlert,
    farmOperations: [],
    categories: ["concerns"],
  },
  {
    id: "other",
    label: "Other",
    icon: HelpCircle,
    farmOperations: [],
    categories: ["quality", "progress", "general", "concerns"],
  },

  // Project Quality - Common standards, materials, and workmanship
  {
    id: "substandard_materials",
    label: "Substandard Materials",
    icon: Hammer,
    farmOperations: [],
    categories: ["quality"],
  },
  {
    id: "poor_workmanship",
    label: "Poor Workmanship",
    icon: Wrench,
    farmOperations: [],
    categories: ["quality"],
  },
  {
    id: "standards_non_compliance",
    label: "Construction Standards Non-Compliance",
    icon: Construction,
    farmOperations: [],
    categories: ["quality"],
  },

  // Project Progress - Timeline, completion status, and pacing
  {
    id: "construction_delay",
    label: "Construction Delay / Work Stoppage",
    icon: Clock,
    farmOperations: [],
    categories: ["progress", "concerns"],
  },
  {
    id: "slow_pacing",
    label: "Slow Progress / Behind Schedule",
    icon: Hourglass,
    farmOperations: [],
    categories: ["progress"],
  },
  {
    id: "abandoned_site",
    label: "Abandoned or Inactive Site",
    icon: PauseCircle,
    farmOperations: [],
    categories: ["progress", "concerns"],
  },
  {
    id: "unfinished_work",
    label: "Incomplete or Unfinished Work",
    icon: Construction,
    farmOperations: [],
    categories: ["progress"],
  },
  {
    id: "idle_machinery_labor",
    label: "Idle Machinery or Lack of Labor",
    icon: HardHat,
    farmOperations: [],
    categories: ["progress"],
  },
  {
    id: "schedule_inquiry",
    label: "Target Completion Date Inquiry",
    icon: Calendar,
    farmOperations: [],
    categories: ["progress"],
  },

  // General Feedback - Suggestions, inquiries, commendation, impact
  {
    id: "community_suggestion",
    label: "Community Suggestion or Request",
    icon: Lightbulb,
    farmOperations: [],
    categories: ["general"],
  },
  {
    id: "general_inquiry",
    label: "General Project Inquiry",
    icon: HelpCircle,
    farmOperations: [],
    categories: ["general"],
  },
  {
    id: "maintenance_request",
    label: "Maintenance or Repair Request",
    icon: Wrench,
    farmOperations: [],
    categories: ["general"],
  },
  {
    id: "environmental_impact",
    label: "Environmental or Community Impact",
    icon: Trees,
    farmOperations: [],
    categories: ["general"],
  },
  {
    id: "missing_billboard",
    label: "Missing Project Signboard / Billboard",
    icon: Signpost,
    farmOperations: [],
    categories: ["general"],
  },
  {
    id: "public_access_traffic",
    label: "Public Access or Traffic Concern",
    icon: Compass,
    farmOperations: [],
    categories: ["general"],
  },
  {
    id: "commendation",
    label: "Commendation or Positive Feedback",
    icon: ThumbsUp,
    farmOperations: [],
    categories: ["general"],
  },

  // Irrigation System (SPIS, diversion dams)
  {
    id: "irrigation_leak",
    label: "Water Leak or Seepage",
    icon: Droplets,
    farmOperations: ["Irrigation System"],
    categories: ["quality", "concerns"],
  },
  {
    id: "irrigation_siltation",
    label: "Canal Siltation or Blockage",
    icon: Shapes,
    farmOperations: ["Irrigation System"],
    categories: ["quality", "concerns"],
  },
  {
    id: "irrigation_gate_valve",
    label: "Gate, Valve, or Pump Malfunction",
    icon: Wrench,
    farmOperations: ["Irrigation System"],
    categories: ["quality", "concerns"],
  },

  // Agricultural Transport and Infrastructure (farm-to-market roads, tramlines, bridges)
  {
    id: "road_pavement",
    label: "Pavement Damage or Potholes",
    icon: Construction,
    farmOperations: ["Agricultural Transport and Infrastructure"],
    categories: ["quality", "concerns"],
  },
  {
    id: "road_drainage",
    label: "Drainage Blockage",
    icon: CloudRain,
    farmOperations: [
      "Agricultural Transport and Infrastructure",
      "Storage Facility",
      "Post Harvest Facility",
    ],
    categories: ["quality", "concerns"],
  },
  {
    id: "road_slope_erosion",
    label: "Slope Protection or Erosion",
    icon: Mountain,
    farmOperations: ["Agricultural Transport and Infrastructure", "Irrigation System"],
    categories: ["quality", "concerns"],
  },
  {
    id: "road_signage",
    label: "Missing or Damaged Signage",
    icon: Signpost,
    farmOperations: ["Agricultural Transport and Infrastructure"],
    categories: ["quality", "general"],
  },

  // Storage and Post Harvest Facilities (warehouses, trading centers, RPCs)
  {
    id: "facility_roof_leak",
    label: "Roof Damage or Leak",
    icon: CloudRain,
    farmOperations: ["Storage Facility", "Post Harvest Facility"],
    categories: ["quality", "concerns"],
  },
  {
    id: "facility_door_access",
    label: "Door or Access Malfunction",
    icon: Wrench,
    farmOperations: ["Storage Facility", "Post Harvest Facility"],
    categories: ["quality", "concerns"],
  },
  {
    id: "pest_infestation",
    label: "Pest Infestation",
    icon: Bug,
    farmOperations: ["Storage Facility", "Post Harvest Facility"],
    categories: ["concerns"],
  },

  // Structural damage - shared across most facility-type operations
  {
    id: "structural_damage",
    label: "Structural Damage or Cracks",
    icon: Construction,
    farmOperations: [
      "Storage Facility",
      "Post Harvest Facility",
      "Processing Facility",
      "Production Facility",
      "Laboratory",
      "Agricultural Support Services Facility",
      "Waste Management and Recovery",
    ],
    categories: ["quality", "concerns"],
  },

  // Electrical - shared across facility-type operations
  {
    id: "facility_electrical",
    label: "Electrical Fault",
    icon: Zap,
    farmOperations: [
      "Irrigation System",
      "Storage Facility",
      "Post Harvest Facility",
      "Processing Facility",
      "Production Facility",
      "Laboratory",
      "Agricultural Support Services Facility",
      "Waste Management and Recovery",
    ],
    categories: ["quality", "concerns"],
  },

  // Equipment malfunction - processing/milling/lab machinery
  {
    id: "equipment_malfunction",
    label: "Equipment or Machine Malfunction",
    icon: Wrench,
    farmOperations: [
      "Processing Facility",
      "Post Harvest Facility",
      "Laboratory",
      "Agricultural Support Services Facility",
    ],
    categories: ["quality", "concerns"],
  },

  // Production Facility (greenhouses, hatcheries)
  {
    id: "production_climate_control",
    label: "Climate Control or Covering Damage",
    icon: Thermometer,
    farmOperations: ["Production Facility"],
    categories: ["quality", "concerns"],
  },

  // Laboratory
  {
    id: "lab_contamination",
    label: "Contamination or Biosafety Concern",
    icon: FlaskConical,
    farmOperations: ["Laboratory"],
    categories: ["concerns"],
  },

  // Waste Management and Recovery
  {
    id: "waste_overflow",
    label: "Overflow or Leak",
    icon: Droplets,
    farmOperations: ["Waste Management and Recovery"],
    categories: ["quality", "concerns"],
  },
  {
    id: "waste_odor",
    label: "Odor or Contamination",
    icon: Wind,
    farmOperations: ["Waste Management and Recovery"],
    categories: ["concerns"],
  },
];

export function getCategoryDisplayName(category?: string | null): string {
  switch (category) {
    case "quality":
      return "Project Quality";
    case "progress":
      return "Project Progress";
    case "general":
      return "General Feedback";
    case "concerns":
      return "Concerns & Issues";
    default:
      return category || "";
  }
}

export interface SplitIssueTypesParams {
  category?: string | null;
  farmOperation?: string | null;
}

/**
 * Splits ISSUE_TYPES into the set recommended for the given category (and
 * optionally farm operation), with all other types gathered in `more` so
 * citizens can still browse and select any type from the complete catalog.
 */
export function splitIssueTypes(params: SplitIssueTypesParams = {}): {
  recommended: IssueTypeOption[];
  more: IssueTypeOption[];
} {
  const { category, farmOperation } = params;
  const recommended: IssueTypeOption[] = [];
  const more: IssueTypeOption[] = [];

  for (const type of ISSUE_TYPES) {
    const isCommonOperation = type.farmOperations.length === 0;
    const matchesOperation = farmOperation
      ? type.farmOperations.includes(farmOperation)
      : isCommonOperation;

    const matchesCategory = category
      ? type.categories.includes(category as ReportCategory)
      : true;

    if (matchesCategory && (isCommonOperation || (farmOperation && matchesOperation))) {
      recommended.push(type);
    } else {
      more.push(type);
    }
  }

  // Sort more alphabetically by label for clean, intuitive browsing
  more.sort((a, b) => a.label.localeCompare(b.label));

  return { recommended, more };
}

/**
 * Splits ISSUE_TYPES into the set recommended for the given Farm Operation
 * (common types first, then operation-specific ones) and the remainder.
 * Preserved for backwards compatibility with existing consumers.
 */
export function splitIssueTypesByFarmOperation(farmOperation: string): {
  recommended: IssueTypeOption[];
  more: IssueTypeOption[];
} {
  return splitIssueTypes({ farmOperation });
}

/**
 * A citizen can report more than one issue type against the same infrastructure item
 * (e.g. both "Pavement Damage or Potholes" and "Drainage Blockage"). Selections are
 * stored as a single free-text `category` column, so multiple picks are joined with
 * this separator - chosen because it cannot appear inside a label (some labels already
 * contain a comma, e.g. "Gate, Valve, or Pump Malfunction").
 */
const ISSUE_TYPE_VALUE_SEPARATOR = " | ";

export function parseIssueTypeValue(value: string): string[] {
  return value
    .split(ISSUE_TYPE_VALUE_SEPARATOR)
    .map((label) => label.trim())
    .filter(Boolean);
}

export function formatIssueTypeValue(labels: string[]): string {
  return labels.join(ISSUE_TYPE_VALUE_SEPARATOR);
}
