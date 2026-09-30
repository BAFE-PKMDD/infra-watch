import {
  cleanBudget,
  cleanContractor,
  cleanDate,
  cleanStartAndFinish,
  getPublicStage,
} from "@/lib/public-analytics/rules";
import { getPublicAnalyticsStrings } from "@/lib/public-analytics/strings";

type PublicProjectFacts = {
  status: string | null;
  stage: string | null;
  budget: number | string | null;
  abc: number | null;
  contractorName: string | null;
  startDate: Date | null;
  actualCompletionDate: Date | null;
  targetCompletionDate: Date | null;
  dateTurnOver: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});

export function normalizePublicProjectFacts(row: PublicProjectFacts, now = new Date()) {
  const publicStage = getPublicStage(row.status, row.stage);
  if (!publicStage) return null;

  const { start, finish } = cleanStartAndFinish(row.startDate, row.actualCompletionDate, now);
  const target = cleanDate(row.targetCompletionDate, now);
  const turnover = cleanDate(row.dateTurnOver, now);

  return {
    publicStage,
    stage: getPublicAnalyticsStrings("en").stages[publicStage],
    budget: cleanBudget(row.budget, row.abc),
    abc: row.abc !== null && Number.isFinite(row.abc) && row.abc > 0 ? row.abc : null,
    contractor: cleanContractor(row.contractorName) ?? "Unavailable",
    startDate: start ? dateFormatter.format(start) : "Unavailable",
    completionDate: target ? dateFormatter.format(target) : "Unavailable",
    actualCompletionDate: finish ? dateFormatter.format(finish) : undefined,
    dateTurnOver: turnover ? dateFormatter.format(turnover) : undefined,
  };
}
