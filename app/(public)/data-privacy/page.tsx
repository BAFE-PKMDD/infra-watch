import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/layout/public-information-page";

export const metadata: Metadata = {
  title: "Privacy Notice | InfraWatch",
  description: "How InfraWatch handles account, feedback, evidence, and service-security information.",
};

export default function DataPrivacyPage() {
  return (
    <PublicInformationPage
      eyebrow="Privacy"
      title="Privacy Notice"
      description="InfraWatch handles personal information only for platform operation, public participation, moderation, security, and authorized administration."
    >
      <h2>Information handled by InfraWatch</h2>
      <p>Depending on the feature used, InfraWatch may process account details, feedback content, uploaded media, device-provided coordinates and accuracy, project selections, moderation records, and limited security information needed to protect the service.</p>

      <h2>How information is used</h2>
      <p>Information is used to authenticate users, receive and moderate feedback, associate evidence with infrastructure projects, operate maps and analytics, prevent abuse, investigate technical problems, and meet applicable public-sector responsibilities.</p>

      <h2>Anonymous submissions</h2>
      <p>Selecting anonymous submission hides your identity from public display. It does not remove the submission from authorized moderation and security workflows.</p>

      <h2>Public content</h2>
      <p>Approved feedback and evidence may be displayed publicly. Avoid including faces, identification documents, private addresses, confidential records, or other unnecessary personal information in comments and attachments.</p>

      <h2>Access and retention</h2>
      <p>Access to non-public account, moderation, and history information is restricted by role. Information is retained only as needed for the platform&apos;s operational, security, accountability, and legal purposes.</p>

      <h2>Your choices</h2>
      <p>You may avoid optional uploads, choose anonymous public display where offered, and request review or deletion of eligible personal information through the Data Deletion page.</p>
    </PublicInformationPage>
  );
}
