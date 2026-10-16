import type { Metadata } from "next";
import { SuggestionsView } from "./suggestions-view";

export const metadata: Metadata = {
  title: "Suggestions | INFRA Watch",
  description: "Share suggestions, website problems, and comments about the INFRA Watch system.",
};

export default function SuggestionsPage() {
  return <SuggestionsView />;
}
