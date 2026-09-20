type IssueResponseRecordInput = {
  message: string;
  internalNotes: string;
  nextStatus: string | null;
  isInternalOnly: boolean;
  hasAttachments?: boolean;
};

type PlannedIssueResponseRecord = {
  message: string;
  internalNotes: string | null;
  isInternalOnly: boolean;
};

export function planIssueResponseRecord(input: IssueResponseRecordInput): PlannedIssueResponseRecord | null {
  const message = input.message.trim();
  const internalNotes = input.internalNotes.trim();

  if (!message && !internalNotes && !input.nextStatus && !input.hasAttachments) return null;

  return {
    message: message || internalNotes || (input.hasAttachments ? "Attachment added" : "Status changed"),
    internalNotes: internalNotes || null,
    isInternalOnly: input.isInternalOnly || !message,
  };
}
