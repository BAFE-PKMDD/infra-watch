import type { Metadata } from "next";

import { SystemEvidenceMapClient } from "@/components/shared/system-evidence-map-client";

export const metadata: Metadata = {
  title: "Citizen Reports Map | INFRA Watch",
  description: "Explore geotagged photo and video evidence from infrastructure issue reports across the Philippines.",
};

export default function EvidenceMapPage() {
  return <SystemEvidenceMapClient />;
}
