import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/layout/public-information-page";
import { FAQ_ENTRIES } from "@/lib/faq-content";

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
      {FAQ_ENTRIES.map((entry) => (
        <div key={entry.question}>
          <h2>{entry.question}</h2>
          <p>{entry.answer}</p>
        </div>
      ))}
    </PublicInformationPage>
  );
}
