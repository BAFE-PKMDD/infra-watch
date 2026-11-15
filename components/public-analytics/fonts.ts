import { Geist_Mono } from "next/font/google";

// Poppins (body and controls) and Outfit (headings) are already loaded app-wide in
// app/layout.tsx as --font-poppins and --font-outfit. Only Geist Mono is added here, for
// project codes and other identifiers on the public analytics and project pages.
// Geist Mono is a variable font, so no `weight` list is passed: asking for specific weights
// makes Turbopack request several font files and fail with "queries have exactly one entry".
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const publicAnalyticsFontClassName = geistMono.variable;
