import { getInfraAnalyticsData } from "@/actions/query/analytics.query";
import { InfraAnalyticsClient } from "./infra-analytics-client";

export const revalidate = 300; // Cache and revalidate statistics every 5 minutes

export default async function InfraAnalyticsPage() {
  const data = await getInfraAnalyticsData();

  return <InfraAnalyticsClient initialData={data} />;
}
