import type { Metadata } from "next";
import { getContactMessages } from "@/actions/query/contact-messages.query";
import { ContactMessageList } from "@/components/admin/contact-messages/contact-message-list";
import { isContactMessageStatus } from "@/lib/contact-messages";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact Messages | INFRA Watch", description: "Review messages sent through the public Contact Us page." };

export default async function ContactMessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const page = Number.parseInt((Array.isArray(params.page) ? params.page[0] : params.page) ?? "1", 10);
  const result = await getContactMessages({ status: isContactMessageStatus(status) ? status : undefined, page: Number.isFinite(page) ? page : 1 });
  return <ContactMessageList initialResult={result} />;
}
