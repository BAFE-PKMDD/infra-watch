"use client";

import Link from "next/link";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { CITIZEN_PROJECT_ID } from "@/lib/tours/citizen";
import type { ProjectDetail } from "@/types";
import { CitizenGuideNotice, CitizenGuideReceipt, useCitizenGuide } from "./citizen-guide-context";

export const exampleProject: ProjectDetail = {
  id: CITIZEN_PROJECT_ID, name: "Example irrigation canal", code: "EXAMPLE-001", location: "Example municipality, Example province",
  implementingAgency: "Example agency", budget: null, startDate: "Unavailable", duration: "Unavailable", status: "On going",
  completionDate: "Unavailable", contractor: "Unavailable", projectLength: "Unavailable", farmOperation: "Irrigation System",
  description: "An example project for the citizen feedback guide. This is not an actual infrastructure record.", updates: [], feedbackCount: 0,
};

export default function CitizenProjectExample() {
  const guide = useCitizenGuide();
  if (guide?.session?.guide !== "citizen-feedback") return <div className="mx-auto max-w-3xl px-4 py-12">
    <h1 className="font-heading text-2xl font-semibold">This example is no longer active</h1>
    <p className="mt-2 text-sm">Open the feedback guide from Citizen guides to begin again.</p>
    <Link href="/projects" className="mt-4 inline-flex min-h-11 items-center text-primary underline">Return to Projects</Link>
  </div>;
  return <>
    <div className="mx-auto max-w-7xl px-4 pt-4"><CitizenGuideNotice /></div>
    {guide.session.submitted ? <div className="mx-auto max-w-3xl p-6"><CitizenGuideReceipt /></div> : <ProjectDetailClient key={guide.session.id} project={exampleProject} />}
  </>;
}
