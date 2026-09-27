import { Geist_Mono } from "next/font/google";

// Poppins (body and controls) and Outfit (headings) are already loaded app-wide in
// app/layout.tsx as --font-poppins and --font-outfit. Only Geist Mono is added here, for
// project codes and other identifiers on the public analytics and project pages.
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono", display: "swap" });

export const publicAnalyticsFontClassName = geistMono.variable;
