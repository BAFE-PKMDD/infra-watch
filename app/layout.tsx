import type { Metadata } from "next";
import { Poppins, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { QueryProvider } from "@/providers/query-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { LanguageDialog } from "@/components/language/language-dialog";
import { CookieConsentBanner } from "@/components/cookie-consent/cookie-consent-banner";
import { Toaster } from "@/components/ui/sonner";
import { CitizenTourProvider } from "@/components/citizen/tour/citizen-tour-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "INFRA Watch - Public Transparency Portal",
  description: "Public transparency and monitoring portal for agricultural and fisheries infrastructure projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <QueryProvider>
          <AuthProvider>
            <LanguageProvider>
              {/* Outside NotificationProvider so its toasts can use the visitor's language. */}
              <NotificationProvider>
              <LanguageDialog />
              <CitizenTourProvider>{children}</CitizenTourProvider>
              <CookieConsentBanner />
              <Toaster />
              </NotificationProvider>
            </LanguageProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
