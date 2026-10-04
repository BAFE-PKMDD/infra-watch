"use client";

import { useContext, useState } from "react";
import Link from "next/link";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SmsGrievanceTable } from "@/components/admin/issues/sms-grievance-table";
import { SmsGrievanceDetailView } from "@/components/admin/issues/sms-grievance-detail-view";
import { createTutorialSms, TUTORIAL_SMS_ID } from "@/lib/tours/sms-sandbox";
import { useTutorialSandbox } from "./tutorial-sandbox";
import { TourContext } from "./tour-launcher";

export function SmsLessonPage({ id }: { id?: string }) {
  const sandbox = useTutorialSandbox();
  const homePath = useContext(TourContext)?.learning?.homePath ?? "/dashboard";
  return <AdminPageWrapper breadcrumbs={[{ label: "Admin" }, { label: "SMS Grievances" }]} title={id ? "Review SMS grievance" : "SMS Grievances"} description="Practice replying to an example SMS grievance.">
    {sandbox && (!id || id === TUTORIAL_SMS_ID) ? <SmsLessonContent key={`${sandbox.state.id}:${id ?? "list"}`} id={id} /> : <div className="space-y-3 rounded-lg border border-border bg-background p-5"><p>This guide has ended. Open the SMS guide again from Response guides.</p><Link href={homePath} className="inline-flex min-h-11 items-center font-semibold text-primary underline">Return to Response guides</Link></div>}
  </AdminPageWrapper>;
}

function SmsLessonContent({ id }: { id?: string }) {
  const [records] = useState(() => [createTutorialSms()]);
  return id ? <SmsGrievanceDetailView id={id} initialRecords={records} tutorial /> : <SmsGrievanceTable initialRecords={records} tutorial />;
}
