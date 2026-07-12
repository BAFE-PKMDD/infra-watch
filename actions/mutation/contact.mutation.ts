"use server";

export async function createContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  console.log("Contact message stub called with:", data);
  return {
    success: true,
    message: "Message sent! We'll get back to you soon.",
  };
}
