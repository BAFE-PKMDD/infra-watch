import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/layout/public-information-page";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | InfraWatch",
  description: "Answers to common questions about InfraWatch projects, maps, feedback, evidence, and accounts.",
};

export default function FaqPage() {
  return (
    <PublicInformationPage
      eyebrow="Help center"
      title="Frequently Asked Questions"
      description="Learn how InfraWatch presents infrastructure information and how citizens can participate responsibly."
    >
      <h2>What is InfraWatch?</h2>
      <p>InfraWatch is BAFE&apos;s public infrastructure transparency and citizen-feedback platform. It presents available project information, maps, progress details, and moderated community feedback.</p>

      <h2>Why are some projects missing from the map?</h2>
      <p>The map shows only projects with usable, source-backed coordinates. InfraWatch does not invent locations for records with missing or invalid coordinates.</p>

      <h2>Can I submit feedback anonymously?</h2>
      <p>Yes. When you select anonymous submission, your identity is hidden from public users. Authorized personnel may still process the submission for moderation, security, and accountability purposes.</p>

      <h2>Why does submitted feedback not appear immediately?</h2>
      <p>Feedback and evidence may require moderation before public display. This helps protect personal information and prevent unsafe, unlawful, or unrelated content.</p>

      <h2>What evidence can I upload?</h2>
      <p>You may attach supported images or videos relevant to the selected project. Geotagged evidence can include approximate coordinates and device-reported accuracy. Do not upload confidential information or content you do not have permission to share.</p>

      <h2>Are project values guaranteed to be complete?</h2>
      <p>InfraWatch reflects available source records and clearly identifies unavailable information. Approved budget, supplier bid, progress, and location fields may be missing or awaiting source correction.</p>
    </PublicInformationPage>
  );
}
