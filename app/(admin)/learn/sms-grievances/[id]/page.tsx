import { SmsLessonPage } from "@/components/admin/tour/sms-lesson-page";

export default async function SmsResponseLessonDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SmsLessonPage id={id} />;
}
