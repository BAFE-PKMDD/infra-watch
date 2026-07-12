import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Notifications | INFRA Watch",
  description: "View and manage your INFRA Watch notifications.",
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
