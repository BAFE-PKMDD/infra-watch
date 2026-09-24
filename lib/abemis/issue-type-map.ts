import {
  AlertTriangle,
  Bug,
  CloudRain,
  Construction,
  Droplets,
  FlaskConical,
  Mountain,
  PowerOff,
  Shapes,
  ShieldAlert,
  Signpost,
  Thermometer,
  Wind,
  Wrench,
  HelpCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Issue types a citizen can report against an infrastructure item, informed by the
 * physical-status checklist categories in the DA-APSAM IMMAS operation and maintenance
 * assessment forms (road shoulders/roadway/drainage for FMR, canal/gate/pump for
 * irrigation, roof/structural frame/electrical for storage and processing facilities).
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
}

export const ISSUE_TYPES: IssueTypeOption[] = [
  // Common - relevant to any infrastructure item
  { id: "safety_hazard", label: "Safety Hazard", icon: AlertTriangle, farmOperations: [] },
  { id: "not_operational", label: "Idle / Not Operational", icon: PowerOff, farmOperations: [] },
  { id: "vandalism_theft", label: "Vandalism or Theft", icon: ShieldAlert, farmOperations: [] },
  { id: "other", label: "Other", icon: HelpCircle, farmOperations: [] },

  // Irrigation System (SPIS, diversion dams)
  {
    id: "irrigation_leak",
    label: "Water Leak or Seepage",
    icon: Droplets,
    farmOperations: ["Irrigation System"],
  },
  {
    id: "irrigation_siltation",
    label: "Canal Siltation or Blockage",
    icon: Shapes,
    farmOperations: ["Irrigation System"],
  },
  {
    id: "irrigation_gate_valve",
    label: "Gate, Valve, or Pump Malfunction",
    icon: Wrench,
    farmOperations: ["Irrigation System"],
  },

  // Agricultural Transport and Infrastructure (farm-to-market roads, tramlines, bridges)
  {
    id: "road_pavement",
    label: "Pavement Damage or Potholes",
    icon: Construction,
    farmOperations: ["Agricultural Transport and Infrastructure"],
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
  },
  {
    id: "road_slope_erosion",
    label: "Slope Protection or Erosion",
    icon: Mountain,
    farmOperations: ["Agricultural Transport and Infrastructure", "Irrigation System"],
  },
  {
    id: "road_signage",
    label: "Missing or Damaged Signage",
    icon: Signpost,
    farmOperations: ["Agricultural Transport and Infrastructure"],
  },

  // Storage and Post Harvest Facilities (warehouses, trading centers, RPCs)
  {
    id: "facility_roof_leak",
    label: "Roof Damage or Leak",
    icon: CloudRain,
    farmOperations: ["Storage Facility", "Post Harvest Facility"],
  },
  {
    id: "facility_door_access",
    label: "Door or Access Malfunction",
    icon: Wrench,
    farmOperations: ["Storage Facility", "Post Harvest Facility"],
  },
  {
    id: "pest_infestation",
    label: "Pest Infestation",
    icon: Bug,
    farmOperations: ["Storage Facility", "Post Harvest Facility"],
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
  },

  // Production Facility (greenhouses, hatcheries)
  {
    id: "production_climate_control",
    label: "Climate Control or Covering Damage",
    icon: Thermometer,
    farmOperations: ["Production Facility"],
  },

  // Laboratory
  {
    id: "lab_contamination",
    label: "Contamination or Biosafety Concern",
    icon: FlaskConical,
    farmOperations: ["Laboratory"],
  },

  // Waste Management and Recovery
  {
    id: "waste_overflow",
    label: "Overflow or Leak",
    icon: Droplets,
    farmOperations: ["Waste Management and Recovery"],
  },
  {
    id: "waste_odor",
    label: "Odor or Contamination",
    icon: Wind,
    farmOperations: ["Waste Management and Recovery"],
  },
];

/**
 * Splits ISSUE_TYPES into the set recommended for the given Farm Operation
 * (common types first, then operation-specific ones) and the remainder, so a
 * picker can lead with relevant options and keep the full list one step away.
 */
export function splitIssueTypesByFarmOperation(farmOperation: string): {
  recommended: IssueTypeOption[];
  more: IssueTypeOption[];
} {
  const recommended: IssueTypeOption[] = [];
  const more: IssueTypeOption[] = [];

  for (const type of ISSUE_TYPES) {
    const isCommon = type.farmOperations.length === 0;
    const matchesOperation = farmOperation && type.farmOperations.includes(farmOperation);
    if (isCommon || matchesOperation) {
      recommended.push(type);
    } else {
      more.push(type);
    }
  }

  return { recommended, more };
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
