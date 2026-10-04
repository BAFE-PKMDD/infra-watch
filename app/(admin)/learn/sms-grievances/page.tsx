import { SmsLessonPage } from "@/components/admin/tour/sms-lesson-page";

// The authenticated admin layout protects this lesson. It never loads the SMS feed.
export default function SmsResponseLesson() {
  return <SmsLessonPage />;
}
