import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SmsGrievanceGuide } from "@/components/report-issue/sms-grievance-guide";

export const metadata: Metadata = {
  title: "SMS Grievance Guide | INFRA Watch",
  description: "Prototype instructions for submitting an infrastructure grievance by SMS.",
};

export default function SmsGrievancePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SmsGrievanceGuide />;
}
