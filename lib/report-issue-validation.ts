export function reportIssueDetailsError(values: { issueType: string; issueDescription: string; dateNoticed: string }): "selectIssueType" | "descriptionMin" | "dateNoticed" | null {
  if (!values.issueType) return "selectIssueType";
  if (values.issueDescription.trim().length < 20) return "descriptionMin";
  if (!values.dateNoticed) return "dateNoticed";
  return null;
}
