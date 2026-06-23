"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { useTranslation } from "@/i18n";

export function AppFooter() {
  const { t } = useTranslation();

  const subtitle = t("footer.subtitle")?.replace("FMR", "INFRA") || "Project Monitoring and Citizen Feedback Portal";

  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-600 flex items-center justify-center text-white font-bold rounded">
                IW
              </div>
              <div>
                <h3 className="font-bold text-lg">INFRA WATCH</h3>
                <p className="text-xs text-slate-400">{subtitle}</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                <span className="text-slate-300">DA-BAFE, Two Cyberpod Centris, EDSA Quezon Avenue, QC</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <a href="tel:+639498429485" className="text-slate-300 hover:text-white transition-colors">
                  0949-842-9485 or 0956-234-9888
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <a href="mailto:infrawatch@bafe.da.gov.ph" className="text-slate-300 hover:text-white transition-colors">
                  infrawatch@bafe.da.gov.ph
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-slate-100">{t("footer.links.quick.title")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/projects" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  {t("footer.links.quick.projects")}
                </Link>
              </li>
              <li>
                <Link href="/statistics" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  {t("footer.links.quick.statistics")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  {t("footer.links.quick.faq")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  {t("footer.links.quick.contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Government Links */}
          <div>
            <h4 className="font-semibold mb-4 text-slate-100">{t("footer.links.gov.title")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Official Gazette
                </a>
              </li>
              <li>
                <a
                  href="https://www.foi.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Freedom of Information
                </a>
              </li>
              <li>
                <a
                  href="https://www.da.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Department of Agriculture
                </a>
              </li>
              <li>
                <a
                  href="https://www.bafe.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Bureau of Agricultural and Fisheries Engineering
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-slate-400">
            {t("footer.rights")?.replace("FMR", "INFRA") || "© 2026 INFRA Watch. All Rights Reserved."}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/data-privacy" className="text-slate-400 hover:text-emerald-400 transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/data-deletion" className="text-slate-400 hover:text-emerald-400 transition-colors">
              {t("footer.deletion")}
            </Link>
            <Link href="/terms-of-service" className="text-slate-400 hover:text-emerald-400 transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>

      {/* Government Seal Section */}
      <div
        className="bg-white text-slate-900 border-t border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
            <div className="flex items-center gap-4">
              <div className="w-20 h-24 relative flex-shrink-0 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                PH SEAL
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">{t("footer.seal.title")}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t("footer.seal.desc")}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide mb-2">{t("footer.govph.title")}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">
                {t("footer.govph.desc")}
              </p>
              <div className="flex flex-col gap-1 text-sm">
                <a href="https://www.gov.ph" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  GOV.PH
                </a>
                <a href="https://data.gov.ph" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Open Data Portal
                </a>
                <a href="https://www.officialgazette.gov.ph" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Official Gazette
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide mb-2">Government Links</p>
              <div className="flex flex-col gap-1 text-sm">
                <a href="https://op-proper.gov.ph/" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Office of the President
                </a>
                <a href="https://ovp.gov.ph/" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Office of the Vice President
                </a>
                <a href="https://www.senate.gov.ph/" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Senate of the Philippines
                </a>
                <a href="https://www.congress.gov.ph/" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  House of the Representatives
                </a>
                <a href="https://sc.judiciary.gov.ph/" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Supreme Court
                </a>
                <a href="https://ca.judiciary.gov.ph/" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Court of Appeals
                </a>
                <a href="https://sb.judiciary.gov.ph/" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" target="_blank" rel="noreferrer noopener">
                  Sandiganbayan
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
