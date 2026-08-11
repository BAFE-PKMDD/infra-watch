import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/layout/public-information-page";

export const metadata: Metadata = {
  title: "Terms of Service | InfraWatch",
  description: "Terms governing access to and use of the InfraWatch platform.",
};

export default function TermsOfServicePage() {
  return (
    <PublicInformationPage
      eyebrow="Public information"
      title="Terms of Service"
      description="These terms describe responsible use of InfraWatch and its public participation features."
    >
      <h2>Acceptable use</h2>
      <p>Use InfraWatch only for lawful access to infrastructure information and good-faith public participation. Do not interfere with the service, evade security controls, impersonate another person, or submit knowingly false or misleading material.</p>

      <h2>User submissions</h2>
      <p>You remain responsible for feedback, photographs, videos, descriptions, and other evidence you submit. Only submit material you are authorized to share and that is relevant to the selected infrastructure project.</p>

      <h2>Moderation</h2>
      <p>InfraWatch may review, withhold, or reject submissions that are unsafe, unlawful, unrelated, deceptive, abusive, privacy-invasive, or otherwise inconsistent with these terms. Anonymous submissions remain subject to moderation.</p>

      <h2>Information limitations</h2>
      <p>Project information may originate from external systems and can be incomplete, delayed, or under review. InfraWatch provides transparency and analytical support but does not replace official procurement records, engineering inspection, or a formal government certification.</p>

      <h2>Service availability</h2>
      <p>The platform may be updated, interrupted, or temporarily unavailable for maintenance, security, or operational reasons.</p>

      <h2>Changes and questions</h2>
      <p>These terms may be updated as the service evolves. Continued use after an update is subject to the revised terms. Contact InfraWatch if you have questions about their application.</p>
    </PublicInformationPage>
  );
}
