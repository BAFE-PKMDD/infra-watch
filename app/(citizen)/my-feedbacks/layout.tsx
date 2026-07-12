import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Feedbacks | INFRA Watch",
  description: "View and manage your submitted feedback on INFRA Watch.",
};

export default function FeedbacksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
