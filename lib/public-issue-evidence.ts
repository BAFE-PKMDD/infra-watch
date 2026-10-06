import type { StoredIssueEvidenceItem } from "@/types/geo-evidence.types";

const ISSUE_EVIDENCE_IMAGE_PATH = /issue-evidence\/\d+-[a-f0-9]{32}\.(?:jpe?g|png|webp|gif)$/i;

type PublicEvidenceIssue = {
  publicApprovedAt: Date | null;
  publicDescription: string | null;
  evidence: StoredIssueEvidenceItem[] | null;
};

/**
 * Resolves the private storage path of an evidence image, but only when the
 * issue is publicly approved and staff approved that specific image.
 */
export function resolveApprovedPublicImagePath(
  issue: PublicEvidenceIssue,
  evidenceIndex: number,
): string | null {
  if (!issue.publicApprovedAt || !issue.publicDescription) return null;
  if (!Number.isInteger(evidenceIndex) || evidenceIndex < 0) return null;

  const item = Array.isArray(issue.evidence) ? issue.evidence[evidenceIndex] : undefined;
  if (!item || item.type !== "image" || !item.publicApprovedAt) return null;

  let pathname = item.url;
  try {
    pathname = decodeURIComponent(new URL(item.url, "http://placeholder.invalid").pathname);
  } catch {
    return null;
  }

  const match = ISSUE_EVIDENCE_IMAGE_PATH.exec(pathname);
  return match ? match[0] : null;
}
