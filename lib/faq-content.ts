import type { Language } from "@/i18n/translations";

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Single source of truth for the public FAQ - rendered on the /faq page and
 * inlined into ARIA's system prompt so the two never drift out of sync.
 * FAQ_ENTRIES_TL below is the everyday-Tagalog version, in the same order.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "What is InfraWatch?",
    answer:
      "InfraWatch is BAFE's public infrastructure transparency and citizen-feedback platform. It presents available project information, maps, progress details, and moderated community feedback.",
  },
  {
    question: "Which projects does InfraWatch cover?",
    answer:
      "InfraWatch covers AMEFIP projects under Agricultural Machinery, Equipment and Facilities Support Services and Irrigation Network Services, as recorded in ABEMIS for fiscal years 2021 to 2026. Projects outside that scope are not listed.",
  },
  {
    question: "Where does the project information come from?",
    answer:
      "Project records are synchronized from ABEMIS, the source system of record. InfraWatch does not edit source values. If a project detail looks wrong, report it so the responsible office can review and correct the source record.",
  },
  {
    question: "Why are some projects missing from the map?",
    answer:
      "The map shows only projects with usable, source-backed coordinates. InfraWatch does not invent locations for records with missing or invalid coordinates.",
  },
  {
    question: "Are project values guaranteed to be complete?",
    answer:
      "InfraWatch reflects available source records and clearly identifies unavailable information. Approved budget, supplier bid, progress, and location fields may be missing or awaiting source correction.",
  },
  {
    question: "Which reporting channel should I use?",
    answer:
      "Use the Citizen Feed for a public rating, photo, or observation on a project. Use an Online E-Report for a specific problem that needs a tracked ticket and a moderator response, such as a delay, defect, or safety hazard. Use SMS Grievance if you have no mobile data or internet connection.",
  },
  {
    question: "How do I report an issue with a project?",
    answer:
      "Use Report an Issue (in the E-Reports menu, or /report-issue/new). You can search for the related project first, or describe the farm operation and location if you don't know which project it is. After submitting, you receive a ticket number.",
  },
  {
    question: "Can I report an issue without internet access?",
    answer:
      "Yes. Send an SMS grievance to the official number using the format shown on the SMS instructions page (/report-issue/sms). An automatic reply confirms your report and gives you a ticket number.",
  },
  {
    question: "How do I check the status of my report?",
    answer:
      "Keep the ticket number you receive after submitting. If you were signed in when you reported, you can also follow status updates and moderator responses under My Issues (/my-issues).",
  },
  {
    question: "How do I give feedback on a project?",
    answer:
      "Open the project's page and use the feedback section, or post general feedback from the Citizen Feed (/citizen-feed). You can attach photos or videos and choose to post anonymously.",
  },
  {
    question: "Can I submit feedback anonymously?",
    answer:
      "Yes. When you select anonymous submission, your identity is hidden from public users. Authorized personnel may still process the submission for moderation, security, and accountability purposes.",
  },
  {
    question: "Why does submitted feedback not appear immediately?",
    answer:
      "Feedback and evidence may require moderation before public display. This helps protect personal information and prevent unsafe, unlawful, or unrelated content.",
  },
  {
    question: "What evidence can I upload?",
    answer:
      "You may attach supported images or videos relevant to the selected project. Geotagged evidence can include approximate coordinates and device-reported accuracy. Do not upload confidential information or content you do not have permission to share.",
  },
  {
    question: "Can I rely on ARIA's answers?",
    answer:
      "ARIA is an AI assistant that answers from InfraWatch records you are authorized to view. Its answers are AI-generated and can be incomplete or wrong, so verify them against the project page or dashboard before relying on them or making official decisions.",
  },
  {
    question: "How do I request deletion of my personal data?",
    answer:
      "Follow the steps on the Request Data Deletion page (/data-deletion). Identify the account or submission involved, but never send passwords or unnecessary identification documents. BAFE may verify your identity before changing records.",
  },
  {
    question: "How do I contact BAFE about InfraWatch?",
    answer:
      "Send a message through the Contact Us page (/contact), email bafe@da.gov.ph, or call the hotline at 0949-842-9485 or 0956-234-9888, Monday to Friday, 8 AM to 5 PM. BAFE staff reply to the email address you provide. To report a problem with a specific project, use an E-Report instead so it gets a tracked ticket.",
  },
];

/**
 * Everyday Tagalog (see i18n/TAGALOG_STYLE.md) for the /faq page, one entry per English
 * entry in the same order. ARIA's prompt keeps using the English FAQ_ENTRIES.
 */
export const FAQ_ENTRIES_TL: FaqEntry[] = [
  {
    question: "Ano ang InfraWatch?",
    answer:
      "Ang InfraWatch ay platform ng BAFE para makita ng publiko ang mga infrastructure project at makapagbigay ng feedback ang mga tao. Dito mo makikita ang available na info ng mga project, mga mapa, progreso, at feedback ng komunidad na na-review ng moderator.",
  },
  {
    question: "Anong mga project ang sakop ng InfraWatch?",
    answer:
      "Sakop ng InfraWatch ang mga AMEFIP project sa ilalim ng Agricultural Machinery, Equipment and Facilities Support Services at Irrigation Network Services, ayon sa record sa ABEMIS para sa fiscal year 2021 hanggang 2026. Hindi nakalista ang mga project na labas dito.",
  },
  {
    question: "Saan galing ang info ng mga project?",
    answer:
      "Naka-sync mula sa ABEMIS ang mga record ng project. Ang ABEMIS ang opisyal na pinagkukunan ng mga record. Hindi binabago ng InfraWatch ang mga value mula sa source. Kung may mukhang mali sa detalye ng project, i-report ito para ma-check at maitama ng opisinang in-charge ang record sa source.",
  },
  {
    question: "Bakit wala sa mapa ang ilang project?",
    answer:
      "Lumalabas lang sa mapa ang mga project na may magagamit na coordinates na galing mismo sa source. Hindi gumagawa ang InfraWatch ng sariling lokasyon para sa mga record na kulang o mali ang coordinates.",
  },
  {
    question: "Sigurado bang kumpleto ang mga detalye ng project?",
    answer:
      "Ipinapakita ng InfraWatch ang mga record na available sa source, at malinaw nitong sinasabi kung aling info ang wala. Puwedeng kulang ang approved budget, supplier bid, progreso, at lokasyon, o hinihintay pang maitama sa source.",
  },
  {
    question: "Aling paraan ng pag-report ang dapat kong gamitin?",
    answer:
      "Gamitin ang Citizen Feed para sa public na rating, photo, o obserbasyon tungkol sa isang project. Gamitin ang Online E-Report para sa isang partikular na problema na kailangan ng ticket na puwedeng i-track at sagot mula sa moderator, gaya ng delay, sira, o panganib sa kaligtasan. Gamitin ang SMS Grievance kung wala kang mobile data o internet.",
  },
  {
    question: "Paano ako magre-report ng problema sa isang project?",
    answer:
      "Gamitin ang Mag-report ng Problema (nasa E-Reports menu, o sa /report-issue/new). Puwede mong hanapin muna ang project, o ilarawan ang farm operation at lokasyon kung hindi mo alam kung aling project ito. Pagka-submit, bibigyan ka ng ticket number.",
  },
  {
    question: "Puwede ba akong mag-report kahit walang internet?",
    answer:
      "Oo. Mag-text ng SMS grievance sa opisyal na number gamit ang format na nasa page ng SMS instructions (/report-issue/sms). May automatic na reply na magkukumpirma ng report mo at magbibigay ng ticket number.",
  },
  {
    question: "Paano ko makikita ang status ng report ko?",
    answer:
      "Itabi ang ticket number na matatanggap mo pagka-submit. Kung naka-sign in ka noong nag-report ka, puwede mo ring sundan ang mga update sa status at sagot ng moderator sa Mga Ini-report Ko (/my-issues).",
  },
  {
    question: "Paano ako magbibigay ng feedback sa isang project?",
    answer:
      "Buksan ang page ng project at gamitin ang feedback section, o mag-post ng general na feedback sa Citizen Feed (/citizen-feed). Puwede kang mag-attach ng photo o video, at puwede kang mag-post nang anonymous.",
  },
  {
    question: "Puwede ba akong mag-submit ng feedback nang anonymous?",
    answer:
      "Oo. Kapag pinili mo ang anonymous, hindi makikita ng publiko kung sino ka. Pero puwede pa ring i-proseso ng mga awtorisadong staff ang submission mo para sa moderation, seguridad, at accountability.",
  },
  {
    question: "Bakit hindi agad lumalabas ang feedback na na-submit ko?",
    answer:
      "Puwedeng kailangan munang i-review ng moderator ang feedback at ebidensya bago ito ipakita sa publiko. Nakakatulong ito para maprotektahan ang personal na info at para hindi lumabas ang content na delikado, labag sa batas, o walang kinalaman.",
  },
  {
    question: "Anong ebidensya ang puwede kong i-upload?",
    answer:
      "Puwede kang mag-attach ng photo o video, sa format na tinatanggap ng site, na may kinalaman sa napiling project. Ang ebidensyang may geotag ay puwedeng may kasamang tantyang coordinates at accuracy na galing sa device mo. Huwag mag-upload ng confidential na info o content na wala kang permisong i-share.",
  },
  {
    question: "Maaasahan ba ang mga sagot ng ARIA?",
    answer:
      "Ang ARIA ay AI assistant na sumasagot gamit ang mga record sa InfraWatch na may access kang makita. AI ang gumawa ng mga sagot nito at puwedeng kulang o mali, kaya i-check muna sa page ng project o sa dashboard bago ka umasa rito o gumawa ng opisyal na desisyon.",
  },
  {
    question: "Paano ko ipapabura ang personal data ko?",
    answer:
      "Sundin ang mga hakbang sa Request Data Deletion page (/data-deletion). Sabihin kung aling account o submission ang tinutukoy mo, pero huwag kailanman magpadala ng password o ID na hindi kailangan. Puwedeng i-verify muna ng BAFE kung ikaw talaga iyan bago nila baguhin ang mga record.",
  },
  {
    question: "Paano ko makokontak ang BAFE tungkol sa InfraWatch?",
    answer:
      "Magpadala ng message sa Contact Us page (/contact), mag-email sa bafe@da.gov.ph, o tumawag sa hotline na 0949-842-9485 o 0956-234-9888, Lunes hanggang Biyernes, 8 AM hanggang 5 PM. Sasagot ang BAFE staff sa email address na ibibigay mo. Kung problema sa isang partikular na project ang ire-report mo, gumamit na lang ng E-Report para magkaroon ito ng ticket na puwedeng i-track.",
  },
];

export function getFaqEntries(language: Language): FaqEntry[] {
  return language === "tl" ? FAQ_ENTRIES_TL : FAQ_ENTRIES;
}

/** Heading, intro and browser-tab text for the /faq page. */
export const FAQ_PAGE_COPY: Record<Language, { metaTitle: string; metaDescription: string; eyebrow: string; title: string; description: string }> = {
  en: {
    metaTitle: "Frequently Asked Questions | InfraWatch",
    metaDescription: "Answers to common questions about InfraWatch projects, maps, feedback, evidence, and accounts.",
    eyebrow: "Help center",
    title: "Frequently Asked Questions",
    description: "Learn how InfraWatch presents infrastructure information and how citizens can participate responsibly.",
  },
  tl: {
    metaTitle: "Mga Madalas Itanong | InfraWatch",
    metaDescription: "Mga sagot sa mga karaniwang tanong tungkol sa mga project, mapa, feedback, ebidensya, at account sa InfraWatch.",
    eyebrow: "Tulong",
    title: "Mga Madalas Itanong",
    description: "Alamin kung paano ipinapakita ng InfraWatch ang info tungkol sa mga infrastructure project, at kung paano ka makakasali nang responsable.",
  },
};

export function formatFaqForPrompt(entries: FaqEntry[] = FAQ_ENTRIES): string {
  return entries.map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`).join("\n\n");
}
