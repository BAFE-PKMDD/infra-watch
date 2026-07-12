import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Issues | INFRA Watch",
  description: "Track and manage your reported issues on INFRA Watch.",
};

export default function IssuesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
