import type { Metadata } from "next";
import Link from "next/link";

import { PublicInformationPage } from "@/components/layout/public-information-page";

export const metadata: Metadata = {
  title: "Request Data Deletion | InfraWatch",
  description: "How to request review and deletion of eligible personal information held by InfraWatch.",
};

export default function DataDeletionPage() {
  return (
    <PublicInformationPage
      eyebrow="Privacy request"
      title="Request Data Deletion"
      description="You may request review and deletion of eligible personal information associated with your InfraWatch account or submission."
    >
      <h2>How to submit a request</h2>
      <ol>
        <li>Open the <Link href="/contact">InfraWatch contact page</Link>.</li>
        <li>State that the message is a data-deletion request.</li>
        <li>Identify the account or submission involved without sending passwords, authentication secrets, or unnecessary identification documents.</li>
        <li>Provide a safe way for the authorized team to contact you for verification.</li>
      </ol>

      <h2>Verification</h2>
      <p>InfraWatch may need to verify that you are the account holder or authorized requester before changing non-public records. Verification protects users from fraudulent deletion requests.</p>

      <h2>What may be deleted</h2>
      <p>Eligible account information, optional profile details, and user-submitted personal content may be deleted or de-identified after review.</p>

      <h2>Information that may need to be retained</h2>
      <p>Some records may be retained when required for public accountability, security investigations, legal obligations, audit integrity, or the protection of other users. Where full deletion is not appropriate, personal information may be restricted or de-identified when possible.</p>

      <h2>Processing result</h2>
      <p>The authorized team will review the request, may ask for limited verification, and will communicate the outcome through the contact method you provide.</p>
    </PublicInformationPage>
  );
}
