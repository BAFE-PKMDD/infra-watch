import { motion } from "motion/react";
import { FileText, Download } from "lucide-react";
import { ProposalDocument } from "@/types/project.types";
import { useTranslation } from "@/i18n";

interface ProjectDocumentsProps {
  documents: ProposalDocument[];
}

export function ProjectDocuments({ documents }: ProjectDocumentsProps) {
  const { t, language } = useTranslation();

  if (!documents || documents.length === 0) {
    return (
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold">{t("projectDetail.sidebar.documents")}</h2>
        </div>
        <div className="p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {t("projectDetail.tabs.documents.empty")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("projectDetail.tabs.documents.emptyDesc")}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">{t("projectDetail.sidebar.documents")} ({documents.length})</h2>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {documents.map((doc, index) => (
            <div
              key={doc.id || index}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {doc.file_name || t("projectDetail.tabs.documents.item").replace("{index}", String(index + 1))}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.category && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {doc.category}
                      </span>
                    )}
                    {doc.uploaded_at && (
                      <>
                        {doc.category && (
                          <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(doc.uploaded_at).toLocaleDateString(language === 'tl' ? "en-PH" : "en-US")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title={t("projectDetail.overview.downloadQR")}
                >
                  <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
