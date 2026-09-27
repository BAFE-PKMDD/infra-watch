import { account } from "./sections/account";
import { community } from "./sections/community";
import { directory } from "./sections/directory";
import { eReport } from "./sections/eReport";
import { landing } from "./sections/landing";
import { site } from "./sections/site";

export type Language = "en" | "tl";

export const translations = {
  en: {
    nav: {
      home: "Home",
      projects: "Projects",
      map: "Map",
      evidenceMap: "Citizen Reports Map",
      faq: "FAQ",
      contact: "Contact Us",
      report: "E-Reports",
      signIn: "Sign In",
      signOut: "Sign Out",
      dashboard: "Dashboard",
      myFeedback: "My Feedbacks",
      myReports: "My Issues",
      myNotifications: "Notifications",
      myProfile: "My Profile",
      about: "About",
      more: "More",
      live: "Live",
      citizenFeed: "Citizen Feed",
      infraAnalytics: "Infra Analytics",
      tagline: "Public Transparency and Monitoring Portal",
      logoAlt: "INFRA Watch logo",
      toggleTheme: "Toggle theme",
      toggleThemeTitle: "Toggle light/dark mode",
      openMenu: "Open navigation",
      closeMenu: "Close navigation",
      userMenu: "User menu",
    },
    languageDialog: {
      title: "Choose Your Language",
      subtitle: "Select your preferred language for the platform",
      english: "English",
      filipino: "Filipino (Tagalog)",
      confirm: "Continue",
      toggle: "Change Language",
    },
    about: {
      title: "About Us",
      subtitle: "Building Trust Through Transparency",
      description: "INFRA Watch is the official transparency portal for agricultural infrastructure projects in the Philippines, led by the Department of Agriculture – Bureau of Agricultural and Fisheries Engineering (DA-BAFE). We empower citizens to monitor, report, and engage with infrastructure developments in their communities.",
      heroImageAlt: "About Infra Watch",
      sealAlt: "BAFE Seal",
      mission: {
        title: "Our Mission",
        desc: "To provide efficient and effective engineering services for the development and maintenance of agricultural and fisheries infrastructure that improve rural connectivity, enhance food production, and uplift the quality of life of Filipino farmers and fisherfolk."
      },
      vision: {
        title: "Our Vision",
        desc: "A modernized agricultural and fisheries sector supported by world-class, resilient infrastructure, connecting every farm to market, ensuring every community has access to irrigation and post-harvest facilities, and sustaining national food security."
      },
      mandate: {
        title: "Mandate & Functions",
        legalBasis: "Republic Act No. 10601 (AFMech Law), Section 24",
        desc: "Pursuant to Section 24 of Republic Act No. 10601 (Agricultural and Fisheries Mechanization Law), the Bureau of Agricultural and Fisheries Engineering (BAFE) is the regular staff bureau of the Department of Agriculture mandated to coordinate, oversee, and monitor the national planning, implementation, and regulation of agricultural and fisheries engineering projects, farm-to-market road (FMR) networks, and mechanization programs across the country.",
        functionsTitle: "Core Functions & Responsibilities",
        functions: [
          {
            title: "Infrastructure Planning & Oversight",
            desc: "Coordinate, oversee, and monitor the national planning and implementation of agri-fisheries engineering, farm-to-market road (FMR) networks, and agricultural infrastructure projects."
          },
          {
            title: "Mechanization Programs",
            desc: "Assist in the national planning, coordination, and execution of the country's comprehensive agri-fisheries mechanization and modernization programs."
          },
          {
            title: "Engineering Plans, Designs & Standards",
            desc: "Prepare, evaluate, validate, and recommend engineering plans, designs, and technical specifications for agri-fisheries infrastructure and machinery in adherence to Philippine Agricultural and Biosystems Engineering Standards (PABES)."
          },
          {
            title: "Testing, Accreditation & Regulation",
            desc: "Promulgate and implement accreditation guidelines for testing centers, validate permits to operate (PTO), and enforce machinery quality and safety standards."
          },
          {
            title: "Capacity Building & LGU Support",
            desc: "Strengthen and support Agricultural and Biosystems Engineering (ABE) groups in Local Government Units (LGUs) and DA Regional Field Offices for decentralized engineering service delivery."
          }
        ]
      },
      history: {
        eyebrow: "Institutional History",
        agencyName: "Bureau of Agricultural and Fisheries Engineering",
        acronym: "BAFE",
        est: "2013",
        legal: "Republic Act No. 10601 (AFMech Law)",
        estLabel: "Est.",
        legalLabel: "Legal:",
        intro: [
          "The Bureau of Agricultural and Fisheries Engineering (BAFE) is the national engineering arm of the Department of Agriculture, responsible for the development, coordination, regulation, and implementation of agricultural and fisheries engineering, mechanization, and infrastructure programs.",
          "BAFE was formally established as a regular bureau of the Department through Republic Act No. 10601, the Agricultural and Fisheries Mechanization (AFMech) Law of 2013. Its institutional roots, however, reach further back — to the agricultural engineering structures and mandates that existed within the Department before the bureau's creation.",
          "The bureau's history traces a single continuous line: from the agricultural engineering foundations laid by earlier legislation, through the Central Agri-Fishery Engineering Division (CAFED), to the creation of BAFE under the AFMech Law, its institutionalization and the strengthening of the national Regional Agricultural Engineering Division (RAED) network, its expanding mechanization and regulatory functions, and — most recently — its leadership of nationwide farm-to-market road implementation and the launch of public monitoring platforms such as this one."
        ],
        milestonesLabel: "Milestones",
        milestones: [
          {
            year: "1997",
            title: "Agriculture and Fisheries Modernization Act",
            desc: "Republic Act No. 8435, the Agriculture and Fisheries Modernization Act of 1997 (AFMA), provided the framework for modernizing Philippine agriculture and fisheries and recognized the importance of infrastructure and engineering support in raising productivity and improving services for farmers and fisherfolk. AFMA directed the Department of Agriculture and local government units to strengthen their agricultural engineering support, laying an important foundation for the dedicated engineering structures that followed."
          },
          {
            year: "1998",
            title: "Professionalization of Agricultural Engineering",
            desc: "Republic Act No. 8559, the Philippine Agricultural Engineering Act of 1998, established the professional and regulatory framework for agricultural engineering in the Philippines, covering agricultural machinery, irrigation and water management, agricultural structures, farm electrification, post-harvest systems, and other engineering applications related to agriculture and fisheries. The law provided the technical and professional foundation for the engineering functions later consolidated under BAFE."
          },
          {
            year: "Before 2013",
            title: "The Central Agri-Fishery Engineering Division",
            desc: "Before BAFE was established as a bureau, the Department carried out its central agricultural and fisheries engineering functions through the Central Agri-Fishery Engineering Division (CAFED) under the Department's Project Development Service. CAFED was the focal unit ensuring that the planning, construction, and delivery of agri-fishery infrastructure met the Department's technical and financial requirements — an important part of BAFE's institutional history, though organizationally distinct from the bureau later created by law."
          },
          {
            year: "2013",
            title: "The Establishment of BAFE",
            desc: "Republic Act No. 10601, the Agricultural and Fisheries Mechanization (AFMech) Law of 2013, established BAFE as a regular bureau of the Department of Agriculture, consolidating agricultural engineering functions — engineering plans and designs, technical standards, regulatory enforcement, project management, mechanization, and infrastructure — into a strengthened national framework. The law also strengthened the Regional Agricultural Engineering Divisions (RAEDs) in the DA Regional Field Offices, together forming a national-regional engineering structure."
          },
          {
            year: "2013–2017",
            title: "Building the New Bureau",
            desc: "Following RA 10601, the Department undertook the organizational work of establishing BAFE — developing its structure, staffing, systems, programs, and coordination mechanisms with the Regional Field Offices. During this transition, BAFE was already performing national mechanization functions, including Luzon-wide consultations in 2015 for the draft National Agricultural and Fisheries Mechanization Program (NAFMP)."
          },
          {
            year: "2018",
            title: "BAFE Becomes Operational",
            desc: "By January 2018, BAFE was operating as a newly formed bureau, described by DA Region 10 as the central engineering arm of the entire Department of Agriculture and its attached agencies. Its responsibilities included coordinating, overseeing, and monitoring the national planning and implementation of agricultural and fisheries engineering projects — including farm-to-market roads — and supporting mechanization programs through the RAEDs. The bureau also began capability-building for RAED personnel and developing its regulatory systems for agricultural and fisheries machinery."
          },
          {
            year: "2019",
            title: "Strengthening the BAFE–RAED Partnership",
            desc: "Department Order No. 12, Series of 2019, formally strengthened the institutional linkage between BAFE and the Regional Agricultural Engineering Divisions, recognizing their respective responsibility for agricultural and fisheries engineering, mechanization, and infrastructure at the national and regional levels — synchronizing engineering plans, standards, monitoring, and implementation nationwide."
          },
          {
            year: "2020–2022",
            title: "Expanding Engineering and Mechanization Services",
            desc: "BAFE's responsibilities continued to expand across agricultural mechanization programs, machinery regulation, engineering standards, infrastructure development, and technical assistance — including the registration of agricultural and fisheries machinery and equipment and the issuance of Certificates of Conformity, functions that remain part of the Department's current regulatory framework."
          },
          {
            year: "2023",
            title: "The National Agricultural and Fisheries Mechanization Program",
            desc: "BAFE took a central role in implementing the National Agricultural and Fisheries Mechanization Program (NAFMP) 2023–2028, covering the local assembly and manufacture of agricultural machinery, research and development, standards and regulation, support services, institutional development, and human resource development."
          },
          {
            year: "2024",
            title: "Strengthening National Engineering Coordination",
            desc: "A 2024 Joint Memorandum Circular on functional complementation and delineation set guidelines for coordinating BAFE, the RAEDs, and LGU agricultural and biosystems engineering offices in planning, implementing, and monitoring agri-fisheries engineering, infrastructure, and mechanization programs — extending the governance structure begun under the AFMech Law over a decade earlier."
          },
          {
            year: "2025",
            title: "Twelve Years of Advancing Agricultural and Fisheries Engineering",
            desc: "In June 2025, DA-BAFE marked its 12th founding anniversary, highlighting its continuing contributions to engineering designs, plans, and standards for farm-to-market roads, irrigation facilities, post-harvest facilities, and other agricultural infrastructure."
          },
          {
            year: "2026",
            title: "A New Era in Agricultural Infrastructure",
            desc: "The Department of Agriculture designated BAFE to lead the nationwide implementation of farm-to-market road projects, placing the bureau at the center of national efforts to strengthen the engineering quality, implementation, monitoring, and coordination of agricultural road projects. BAFE also developed FMR Watch, a public monitoring platform for farm-to-market roads that, as of January 2026, was tracking 4,810 projects implemented from 2021 to 2025 — representing approximately ₱76.52 billion in investment and nearly 2,400 kilometers of roads nationwide. INFRA Watch extends that same public-monitoring approach across BAFE's broader agricultural and fisheries infrastructure programs."
          }
        ],
        closing: "From the agricultural engineering structures that existed before its creation to its present role leading national farm-to-market road implementation and public infrastructure monitoring, BAFE's history reflects the Department of Agriculture's continuing effort to place engineering and technology at the center of agricultural modernization."
      },
      bafeSite: {
        title: "Do you want to know more about BAFE?",
        desc: "Please check our official website for agency announcements, program updates, and engineering standards.",
        cta: "Visit BAFE Website",
      },
      publications: {
        title: "Official Publications & Reference Guidelines",
        desc: "Access statutory frameworks, network plans, and implementation guidebooks issued by DA-BAFE.",
        open: "Open",
        download: "Download PDF",
        openInNewTab: "Open {title} in a new tab",
        bluecopy: {
          title: "National FMR Plan",
          descBefore: "Access the official ",
          descStrong: "Farm-to-Market Road Network Plan Bluecopy",
          descAfter: ". This comprehensive document outlines the strategic framework, standards, and targets for rural infrastructure development across the Philippines.",
          coverAlt: "FMRNP Bluecopy Cover",
          backgroundAlt: "FMR Background",
        },
        ao4: {
          title: "FMR Implementation Guidelines",
          descBefore: "The official ",
          descStrong: "General Guidelines on the Implementation of the Department of Agriculture's Farm-to-Market Road Projects",
          descAfter: " for FY 2026 and onwards. This document outlines procedures, requirements, and standards for all FMR project stakeholders.",
          read: "Read Guidelines",
          backgroundAlt: "FMR Project Groundbreaking",
        },
        lgu: {
          desc: "The official reference manual for Local Government Units (LGUs) issued by the Department of Agriculture through BAFE. This guidebook assists provinces, cities, and municipalities in operationalizing Agricultural and Biosystems Engineering (ABE) offices, managing devolved agricultural and biosystems infrastructure functions, and adhering to national standards in compliance with Republic Act No. 10601.",
          open: "Open Guidebook",
          coverAlt: "LGU Guidebook Cover",
          backgroundAlt: "Agricultural Infrastructure Background",
        },
      },
      cta: {
        title: "Ready to report?",
        desc: "Join other citizens in monitoring infrastructure in your area.",
        report: "Start Reporting",
        projects: "View Projects",
      },
    },
    contact: {
      hero: {
        subtitle: "Get in touch",
        title: "Contact BAFE",
        description: "We value your feedback and inquiries. Reach out to the Bureau of Agricultural and Fisheries Engineering for support, partnerships, or project updates.",
      },
      cards: {
        headOffice: { title: "Head Office" },
        hotline: { title: "Hotline" },
        email: { title: "Email" },
        hours: "Monday to Friday, 8 AM to 5 PM",
        report: {
          title: "Problem with a project?",
          desc: "Use an Online E-Report or SMS grievance so the concern gets a ticket number and a moderator response.",
          cta: "Report an issue",
        },
      },
      form: {
        title: "Send us a message",
        labels: {
          name: "Name",
          email: "Email",
          subject: "Subject",
          message: "Message",
        },
        placeholders: {
          name: "Your name",
          email: "you@example.com",
          subject: "How can we help?",
          message: "Share your questions, feedback, or requests.",
        },
        validation: {
          nameRequired: "Name is required",
          emailRequired: "Email is required",
          emailInvalid: "Enter a valid email address",
          subjectRequired: "Subject is required",
          messageRequired: "Message is required",
          messageMin: "Please provide at least 10 characters",
        },
        submit: "Send message",
        sending: "Sending...",
        responseInfo: "BAFE staff review messages Monday to Friday and reply to the email you provide.",
        error: "Your message could not be sent. Please try again, or email bafe@da.gov.ph directly.",
        success: {
          title: "Message received",
          desc: "BAFE staff will review it and reply to the email address you provided. For a problem with a specific project, file an E-Report so it gets a ticket number.",
          cta: "Send another message",
        },
      },
      office: {
        title: "Visit our office",
        mapTitle: "BAFE Office Location",
      },
    },
    projects: {
      filters: {
        status: "All Status",
      },
      stats: {
        loading: "Loading Projects...",
      },
    },
    projectDetail: {
      feedback: {
        title: "Community Feedback",
        share: "Share Your Feedback",
        edit: "Edit Feedback",
        shareDesc: "Help improve this project by sharing your thoughts and observations.",
        editDesc: "Update your feedback about this project.",
        signIn: "Sign In to Share Feedback",
        deleteTitle: "Delete Feedback",
        deleteDesc: "Are you sure you want to delete this feedback? This action cannot be undone.",
        confirmDelete: "Delete",
        deleting: "Deleting...",
        cancel: "Cancel",
      },
      feedbackForm: {
        progressLabel: "Feedback progress",
        next: "Next",
        back: "Back",
        steps: {
          sentiment: "Experience",
          category: "Category",
          details: "Details",
          consent: "Consent",
          review: "Review",
        },
        categories: {
          quality: { label: "Project Quality", description: "Materials, workmanship, and construction standards" },
          progress: { label: "Project Progress", description: "Timeline, completion status, and pacing" },
          concerns: { label: "Concerns & Issues", description: "A problem, delay, or something that needs attention" },
          general: { label: "General Feedback", description: "Anything else about this project" },
        },
        sentiment: {
          title: "How was your experience?",
          body: "This helps route your feedback correctly. You can skip this.",
          positive: "Positive",
          positiveDesc: "Things are going well",
          negative: "Negative",
          negativeDesc: "Something needs attention",
          skip: "Prefer not to say",
        },
        category: {
          title: "What's this about?",
          body: "Choose the category that best fits your feedback.",
          recommended: "Suggested",
        },
        details: {
          title: "Tell us more",
          body: "Share the details, add evidence, and rate your experience if you'd like.",
          commentLabel: "Your Feedback",
          commentPlaceholder: "Share your thoughts about this project...",
          evidenceLabel: "Evidence attachments (Optional)",
          evidenceHint: "Upload existing media or capture a new geotagged photo or GeoVideo.",
          removeMedia: "Remove media",
          uploading: "Uploading evidence securely…",
        },
        rating: {
          label: "Rating (Optional)",
          rateOne: "Rate 1 star",
          rateMany: "Rate {count} stars",
          starsOne: "1 star",
          starsMany: "{count} stars",
        },
        consent: {
          body: "Confirm how you'd like to submit this feedback.",
          agreePrefix: "I agree to the ",
          agreeAnd: " and ",
          agreeSuffix: " when submitting this feedback",
          anonymousLabel: "Submit as Anonymous",
          anonymousHint: "Your identity will be hidden from other users",
        },
        review: {
          title: "Review your feedback",
          body: "Check everything below, then confirm to submit.",
          edit: "Edit",
          experience: "Your experience",
          feedback: "Feedback",
          sentiment: "Sentiment",
          notSpecified: "Not specified",
          issueType: "Issue Type",
          rating: "Rating",
          notRated: "Not rated",
          attachments: "Attachments",
          noAttachments: "None",
          filesOne: "1 file",
          filesMany: "{count} files",
          submittingAs: "Submitting as",
          anonymous: "Anonymous",
          yourAccount: "Your account",
          saving: "Saving Feedback...",
          submit: "Confirm & Submit",
        },
        errors: {
          commentRequired: "Please provide your feedback",
          mediaProcessing: "Please wait while the location metadata is being processed.",
          mediaMax: "Maximum {max} media files allowed.",
          agreementRequired: "You must agree to the Terms of Service and Privacy Policy",
          uploadBlocked: "Upload blocked. Please choose a valid image or video.",
          uploadFailed: "Upload failed ({status})",
          uploadNoPath: "The upload completed without a file path.",
          submitFailed: "Failed to submit feedback",
          updateFailed: "Failed to update feedback",
        },
        toast: {
          updated: "Feedback updated successfully!",
          submitted: "Feedback submitted for review",
          submittedDesc: "Your feedback and attachments were saved and will appear once approved.",
        },
        notification: {
          title: "Feedback submitted",
          message: "Your feedback was submitted for moderator review.",
        },
      },
    },
    footer: {
      links: {
        quick: {
          title: "Quick Links",
          projects: "Projects",
          faq: "FAQ",
          contact: "Contact Us",
        },
        gov: {
          title: "Government",
        },
      },
      govLinks: "Government Links",
      phones: "{first} or {second}",
      rights: "© 2026 Bureau of Agricultural and Fisheries Engineering. All rights reserved.",
      privacy: "Privacy Policy",
      deletion: "Data Deletion",
      terms: "Terms of Service",
      seal: {
        title: "Republic of the Philippines",
        desc: "All content is in the public domain unless otherwise stated.",
        alt: "Seal of the Republic of the Philippines",
      },
      govph: {
        title: "About GOVPH",
        desc: "Learn more about the Philippine government, its structure, how government works and the people behind it.",
      },
    },
    landing: landing.en,
    directory: directory.en,
    eReport: eReport.en,
    community: community.en,
    site: site.en,
    account: account.en,
  },
  tl: {
    nav: {
      home: "Home",
      projects: "Proyekto",
      map: "Mapa",
      evidenceMap: "Mapa ng mga Citizen Report",
      faq: "FAQ",
      contact: "Kontakin Kami",
      report: "E-Reports",
      signIn: "Mag-login",
      signOut: "Mag-logout",
      dashboard: "Dashboard",
      myFeedback: "Mga Feedback Ko",
      myReports: "Mga Isyu Ko",
      myNotifications: "Mga Notification",
      myProfile: "Profile Ko",
      about: "Tungkol",
      more: "Iba Pa",
      live: "Live",
      citizenFeed: "Citizen Feed",
      infraAnalytics: "Infra Analytics",
      tagline: "Portal ng Transparency at Monitoring",
      logoAlt: "Logo ng INFRA Watch",
      toggleTheme: "Palitan ang theme",
      toggleThemeTitle: "Palitan ang light/dark mode",
      openMenu: "Buksan ang menu",
      closeMenu: "Isara ang menu",
      userMenu: "Menu ng account",
    },
    languageDialog: {
      title: "Piliin ang Wika Mo",
      subtitle: "Piliin ang wikang gusto mong gamitin sa site",
      english: "English",
      filipino: "Filipino (Tagalog)",
      confirm: "Tuloy",
      toggle: "Palitan ang Wika",
    },
    about: {
      title: "Tungkol sa Amin",
      subtitle: "Tiwala sa Pamamagitan ng Transparency",
      description: "Ang INFRA Watch ang opisyal na transparency portal ng mga infrastructure project para sa agrikultura sa Pilipinas. Pinapatakbo ito ng Department of Agriculture – Bureau of Agricultural and Fisheries Engineering (DA-BAFE). Dito, puwede mong bantayan, i-report, at alamin ang mga project sa lugar mo.",
      heroImageAlt: "Tungkol sa INFRA Watch",
      sealAlt: "Seal ng BAFE",
      mission: {
        title: "Misyon Namin",
        desc: "Magbigay ng maayos at epektibong engineering services sa paggawa at pag-maintain ng mga imprastraktura para sa agrikultura at pangisdaan — para mas konektado ang mga baryo at probinsya, dumami ang ani, at gumanda ang buhay ng mga magsasaka at mangingisdang Pilipino."
      },
      vision: {
        title: "Bisyon Namin",
        desc: "Isang modernong sektor ng agrikultura at pangisdaan na may world-class at matibay na imprastraktura — konektado ang bawat bukid sa merkado, may irigasyon at post-harvest facility ang bawat komunidad, at sapat ang pagkain para sa buong bansa."
      },
      mandate: {
        title: "Mandato at mga Tungkulin",
        legalBasis: "Republic Act No. 10601 (AFMech Law), Section 24",
        desc: "Ayon sa Section 24 ng Republic Act No. 10601 (Agricultural and Fisheries Mechanization Law), ang Bureau of Agricultural and Fisheries Engineering (BAFE) ang regular na staff bureau ng Department of Agriculture na inatasang mag-coordinate, mamahala, at magbantay sa pagpaplano, pagpapatupad, at regulasyon ng mga engineering project sa agrikultura at pangisdaan, ng mga farm-to-market road (FMR), at ng mga programa sa mekanisasyon sa buong bansa.",
        functionsTitle: "Mga Pangunahing Tungkulin",
        functions: [
          {
            title: "Pagpaplano at Pagbabantay ng Imprastraktura",
            desc: "Mag-coordinate, mamahala, at magbantay sa pagpaplano at pagpapatupad ng agri-fisheries engineering, ng mga farm-to-market road (FMR), at ng mga infrastructure project para sa agrikultura sa buong bansa."
          },
          {
            title: "Mga Programa sa Mekanisasyon",
            desc: "Tumulong sa pagpaplano, coordination, at pagpapatupad ng mga programa ng bansa para gawing moderno at gumamit ng makina ang agrikultura at pangisdaan."
          },
          {
            title: "Mga Plano, Disenyo, at Standard sa Engineering",
            desc: "Gumawa, sumuri, mag-validate, at magrekomenda ng mga engineering plan, disenyo, at technical specification para sa imprastraktura at makinarya sa agrikultura at pangisdaan, ayon sa Philippine Agricultural and Biosystems Engineering Standards (PABES)."
          },
          {
            title: "Testing, Accreditation, at Regulasyon",
            desc: "Maglabas at magpatupad ng mga patakaran sa accreditation ng mga testing center, mag-validate ng permit to operate (PTO), at ipatupad ang mga standard sa kalidad at kaligtasan ng makinarya."
          },
          {
            title: "Pagsasanay at Suporta sa mga LGU",
            desc: "Palakasin at suportahan ang mga Agricultural and Biosystems Engineering (ABE) group sa mga Local Government Unit (LGU) at DA Regional Field Office, para sila mismo ang makapagbigay ng engineering services sa kanilang lugar."
          }
        ]
      },
      history: {
        eyebrow: "Kasaysayan ng Ahensya",
        agencyName: "Bureau of Agricultural and Fisheries Engineering",
        acronym: "BAFE",
        est: "2013",
        legal: "Republic Act No. 10601 (AFMech Law)",
        estLabel: "Itinatag noong",
        legalLabel: "Batas:",
        intro: [
          "Ang Bureau of Agricultural and Fisheries Engineering (BAFE) ang engineering arm ng Department of Agriculture sa buong bansa. Ito ang humahawak sa pagbuo, coordination, regulasyon, at pagpapatupad ng mga programa sa engineering, mekanisasyon, at imprastraktura para sa agrikultura at pangisdaan.",
          "Opisyal na itinatag ang BAFE bilang regular na bureau ng Department sa ilalim ng Republic Act No. 10601, ang Agricultural and Fisheries Mechanization (AFMech) Law of 2013. Pero mas maaga pa rito nagsimula ang kuwento nito — sa mga opisina at tungkulin sa agricultural engineering na nasa loob na ng Department bago pa itinatag ang bureau.",
          "Tuloy-tuloy ang kasaysayan ng bureau: mula sa pundasyon ng agricultural engineering na inilatag ng mga naunang batas, sa Central Agri-Fishery Engineering Division (CAFED), hanggang sa pagbuo ng BAFE sa ilalim ng AFMech Law. Sumunod ang pagpapatibay nito at ng network ng mga Regional Agricultural Engineering Division (RAED), ang paglawak ng trabaho nito sa mekanisasyon at regulasyon, at — kamakailan lang — ang pangunguna nito sa mga farm-to-market road sa buong bansa at ang paglulunsad ng mga public monitoring platform tulad nito."
        ],
        milestonesLabel: "Mahahalagang Pangyayari",
        milestones: [
          {
            year: "1997",
            title: "Agriculture and Fisheries Modernization Act",
            desc: "Ang Republic Act No. 8435, o Agriculture and Fisheries Modernization Act of 1997 (AFMA), ang naglatag ng framework para gawing moderno ang agrikultura at pangisdaan sa Pilipinas. Kinilala nito na mahalaga ang imprastraktura at engineering support para tumaas ang ani at gumanda ang serbisyo sa mga magsasaka at mangingisda. Inutusan ng AFMA ang Department of Agriculture at ang mga local government unit na palakasin ang kanilang agricultural engineering support — isang mahalagang pundasyon ng mga engineering office na sumunod."
          },
          {
            year: "1998",
            title: "Agricultural Engineering Bilang Propesyon",
            desc: "Ang Republic Act No. 8559, o Philippine Agricultural Engineering Act of 1998, ang nagtakda ng mga patakaran para sa agricultural engineering bilang propesyon sa Pilipinas. Saklaw nito ang makinarya sa bukid, irigasyon at paggamit ng tubig, mga istruktura sa bukid, kuryente sa bukid, post-harvest system, at iba pang engineering work para sa agrikultura at pangisdaan. Ito ang naging teknikal at propesyonal na pundasyon ng mga trabahong pinagsama-sama kalaunan sa ilalim ng BAFE."
          },
          {
            year: "Bago ang 2013",
            title: "Ang Central Agri-Fishery Engineering Division",
            desc: "Bago naging bureau ang BAFE, ang Central Agri-Fishery Engineering Division (CAFED) sa ilalim ng Project Development Service ng Department ang humahawak sa engineering para sa agrikultura at pangisdaan. Ang CAFED ang nagsisiguro na pasado sa teknikal at pinansyal na requirements ng Department ang pagpaplano, paggawa, at pag-turnover ng mga agri-fishery infrastructure. Mahalagang bahagi ito ng kasaysayan ng BAFE, pero hiwalay na opisina ito sa bureau na binuo kalaunan ng batas."
          },
          {
            year: "2013",
            title: "Itinatag ang BAFE",
            desc: "Sa ilalim ng Republic Act No. 10601, o Agricultural and Fisheries Mechanization (AFMech) Law of 2013, itinatag ang BAFE bilang regular na bureau ng Department of Agriculture. Pinagsama-sama rito ang mga trabaho sa agricultural engineering — engineering plan at disenyo, technical standard, pagpapatupad ng regulasyon, project management, mekanisasyon, at imprastraktura — sa iisang mas matibay na national framework. Pinalakas din ng batas ang mga Regional Agricultural Engineering Division (RAED) sa mga DA Regional Field Office, kaya nabuo ang engineering network mula national hanggang regional."
          },
          {
            year: "2013–2017",
            title: "Pagbuo ng Bagong Bureau",
            desc: "Pagkatapos ng RA 10601, sinimulan ng Department ang pagbuo ng BAFE — ang istruktura, mga tauhan, sistema, programa, at paraan ng coordination nito sa mga Regional Field Office. Habang binubuo pa ito, ginagawa na ng BAFE ang mga trabaho sa mekanisasyon sa buong bansa, kasama ang mga konsultasyon sa buong Luzon noong 2015 para sa draft ng National Agricultural and Fisheries Mechanization Program (NAFMP)."
          },
          {
            year: "2018",
            title: "Tumatakbo na ang BAFE",
            desc: "Pagsapit ng Enero 2018, tumatakbo na ang BAFE bilang bagong bureau. Tinawag ito ng DA Region 10 na central engineering arm ng buong Department of Agriculture at ng mga attached agency nito. Kasama sa trabaho nito ang pag-coordinate, pamamahala, at pagbabantay sa pagpaplano at pagpapatupad ng mga engineering project sa agrikultura at pangisdaan — kasama ang mga farm-to-market road — at ang pagsuporta sa mga programa sa mekanisasyon sa pamamagitan ng mga RAED. Sinimulan din ng bureau ang pagsasanay ng mga tauhan ng RAED at ang pagbuo ng sistema ng regulasyon para sa makinarya sa agrikultura at pangisdaan."
          },
          {
            year: "2019",
            title: "Mas Matibay na Ugnayan ng BAFE at RAED",
            desc: "Opisyal na pinatibay ng Department Order No. 12, Series of 2019, ang ugnayan ng BAFE at ng mga Regional Agricultural Engineering Division. Nilinaw nito ang trabaho ng bawat isa sa engineering, mekanisasyon, at imprastraktura para sa agrikultura at pangisdaan, sa national at regional level — para magkakatugma ang mga engineering plan, standard, monitoring, at pagpapatupad sa buong bansa."
          },
          {
            year: "2020–2022",
            title: "Mas Maraming Serbisyo sa Engineering at Mekanisasyon",
            desc: "Patuloy na lumawak ang trabaho ng BAFE: mga programa sa mekanisasyon, regulasyon ng makinarya, engineering standard, pagpapaunlad ng imprastraktura, at technical assistance. Kasama rito ang pagpaparehistro ng makinarya at kagamitan sa agrikultura at pangisdaan at ang pag-isyu ng Certificate of Conformity — mga trabahong bahagi pa rin ng regulasyon ng Department ngayon."
          },
          {
            year: "2023",
            title: "Ang National Agricultural and Fisheries Mechanization Program",
            desc: "Malaki ang papel ng BAFE sa pagpapatupad ng National Agricultural and Fisheries Mechanization Program (NAFMP) 2023–2028. Saklaw nito ang pag-assemble at paggawa ng makinarya sa bukid dito sa bansa, research and development, mga standard at regulasyon, support services, pagpapalakas ng mga institusyon, at pagsasanay ng mga tao."
          },
          {
            year: "2024",
            title: "Mas Maayos na Coordination sa Engineering sa Buong Bansa",
            desc: "Ang 2024 Joint Memorandum Circular tungkol sa functional complementation and delineation ang nagtakda kung paano magtutulungan ang BAFE, ang mga RAED, at ang mga agricultural and biosystems engineering office ng LGU sa pagpaplano, pagpapatupad, at monitoring ng mga programa sa engineering, imprastraktura, at mekanisasyon para sa agrikultura at pangisdaan. Karugtong ito ng sistemang sinimulan ng AFMech Law mahigit isang dekada na ang nakaraan."
          },
          {
            year: "2025",
            title: "12 Taon ng Agricultural and Fisheries Engineering",
            desc: "Noong Hunyo 2025, ipinagdiwang ng DA-BAFE ang ika-12 anibersaryo nito. Binigyang-diin dito ang ambag nito sa mga engineering design, plano, at standard para sa mga farm-to-market road, irigasyon, post-harvest facility, at iba pang imprastraktura para sa agrikultura."
          },
          {
            year: "2026",
            title: "Bagong Yugto ng Imprastraktura sa Agrikultura",
            desc: "Itinalaga ng Department of Agriculture ang BAFE para pangunahan ang mga farm-to-market road project sa buong bansa. Dahil dito, nasa gitna na ang bureau ng pagsisikap na pagandahin ang engineering quality, pagpapatupad, monitoring, at coordination ng mga kalsada para sa agrikultura. Binuo rin ng BAFE ang FMR Watch, isang public monitoring platform para sa mga farm-to-market road. Noong Enero 2026, sinusubaybayan nito ang 4,810 project na ginawa mula 2021 hanggang 2025 — mga ₱76.52 bilyon na pondo at halos 2,400 kilometro ng kalsada sa buong bansa. Dinadala ng INFRA Watch ang parehong public monitoring sa mas marami pang infrastructure program ng BAFE para sa agrikultura at pangisdaan."
          }
        ],
        closing: "Mula sa mga agricultural engineering office na nauna pa rito, hanggang sa pangunguna nito ngayon sa mga farm-to-market road at sa public monitoring ng imprastraktura, makikita sa kasaysayan ng BAFE ang tuloy-tuloy na pagsisikap ng Department of Agriculture na gawing sentro ng modernong agrikultura ang engineering at teknolohiya."
      },
      bafeSite: {
        title: "Gusto mo pang makilala ang BAFE?",
        desc: "Tingnan ang official website namin para sa mga anunsyo, update sa mga programa, at engineering standard.",
        cta: "Buksan ang Website ng BAFE",
      },
      publications: {
        title: "Mga Opisyal na Dokumento at Gabay",
        desc: "Basahin ang mga batas, network plan, at guidebook sa pagpapatupad na inilabas ng DA-BAFE.",
        open: "Buksan",
        download: "I-download ang PDF",
        openInNewTab: "Buksan ang {title} sa bagong tab",
        bluecopy: {
          title: "Pambansang FMR Plan",
          descBefore: "Basahin ang opisyal na ",
          descStrong: "Farm-to-Market Road Network Plan Bluecopy",
          descAfter: ". Nakasulat dito ang plano, mga standard, at mga target para sa mga kalsada at imprastraktura sa mga probinsya sa buong Pilipinas.",
          coverAlt: "Cover ng FMRNP Bluecopy",
          backgroundAlt: "Background ng FMR",
        },
        ao4: {
          title: "Guidelines sa Pagpapatupad ng FMR",
          descBefore: "Ang opisyal na ",
          descStrong: "General Guidelines on the Implementation of the Department of Agriculture's Farm-to-Market Road Projects",
          descAfter: " para sa FY 2026 pataas. Nakasulat dito ang mga proseso, requirements, at standard para sa lahat ng may kinalaman sa mga FMR project.",
          read: "Basahin ang Guidelines",
          backgroundAlt: "Groundbreaking ng isang FMR project",
        },
        lgu: {
          desc: "Ang opisyal na reference manual para sa mga Local Government Unit (LGU), mula sa Department of Agriculture sa pamamagitan ng BAFE. Tinutulungan nito ang mga probinsya, lungsod, at bayan na patakbuhin ang kanilang Agricultural and Biosystems Engineering (ABE) office, hawakan ang mga devolved na trabaho sa agricultural at biosystems infrastructure, at sumunod sa mga national standard ayon sa Republic Act No. 10601.",
          open: "Buksan ang Guidebook",
          coverAlt: "Cover ng LGU Guidebook",
          backgroundAlt: "Background ng imprastraktura sa agrikultura",
        },
      },
      cta: {
        title: "Handa ka nang mag-report?",
        desc: "Makisali sa pagbabantay ng mga imprastraktura sa lugar mo.",
        report: "Mag-report Ngayon",
        projects: "Tingnan ang mga Project",
      },
    },
    contact: {
      hero: {
        subtitle: "Kontakin kami",
        title: "Kontakin ang BAFE",
        description: "Mahalaga sa amin ang feedback at mga tanong mo. Kontakin ang Bureau of Agricultural and Fisheries Engineering para sa tulong, partnership, o update tungkol sa mga project.",
      },
      cards: {
        headOffice: { title: "Main Office" },
        hotline: { title: "Hotline" },
        email: { title: "Email" },
        hours: "Lunes hanggang Biyernes, 8 AM hanggang 5 PM",
        report: {
          title: "May problema sa isang project?",
          desc: "Gumamit ng Online E-Report o SMS grievance para magkaroon ng ticket number ang concern mo at masagot ito ng moderator.",
          cta: "Mag-report ng problema",
        },
      },
      form: {
        title: "Magpadala ng mensahe sa amin",
        labels: {
          name: "Pangalan",
          email: "Email",
          subject: "Subject",
          message: "Mensahe",
        },
        placeholders: {
          name: "Pangalan mo",
          email: "ikaw@example.com",
          subject: "Ano'ng maitutulong namin?",
          message: "Isulat dito ang tanong, feedback, o request mo.",
        },
        validation: {
          nameRequired: "Ilagay ang pangalan mo",
          emailRequired: "Ilagay ang email mo",
          emailInvalid: "Maglagay ng tamang email address",
          subjectRequired: "Ilagay ang subject",
          messageRequired: "Ilagay ang mensahe mo",
          messageMin: "Maglagay ng kahit 10 character",
        },
        submit: "Ipadala ang mensahe",
        sending: "Pinapadala...",
        responseInfo: "Binabasa ng BAFE staff ang mga mensahe mula Lunes hanggang Biyernes, at sasagot sila sa email na ibinigay mo.",
        error: "Hindi naipadala ang mensahe mo. Subukan ulit, o mag-email diretso sa bafe@da.gov.ph.",
        success: {
          title: "Natanggap na ang mensahe mo",
          desc: "Babasahin ito ng BAFE staff at sasagot sila sa email na ibinigay mo. Kung may problema sa isang project, mag-file ng E-Report para magkaroon ito ng ticket number.",
          cta: "Magpadala ulit ng mensahe",
        },
      },
      office: {
        title: "Bisitahin ang opisina namin",
        mapTitle: "Lokasyon ng opisina ng BAFE",
      },
    },
    projects: {
      filters: {
        status: "Lahat ng Status",
      },
      stats: {
        loading: "Naglo-load ng mga project...",
      },
    },
    projectDetail: {
      feedback: {
        title: "Feedback ng Komunidad",
        share: "Magbigay ng Feedback",
        edit: "I-edit ang Feedback",
        shareDesc: "Tumulong na gumanda ang project na ito. Sabihin ang napansin at opinyon mo.",
        editDesc: "I-update ang feedback mo tungkol sa project na ito.",
        signIn: "Mag-login para Magbigay ng Feedback",
        deleteTitle: "I-delete ang Feedback",
        deleteDesc: "Sigurado ka bang ide-delete mo ang feedback na ito? Hindi na ito maibabalik.",
        confirmDelete: "I-delete",
        deleting: "Dine-delete...",
        cancel: "Cancel",
      },
      feedbackForm: {
        progressLabel: "Progress ng feedback",
        next: "Susunod",
        back: "Bumalik",
        steps: {
          sentiment: "Karanasan",
          category: "Kategorya",
          details: "Detalye",
          consent: "Pahintulot",
          review: "I-review",
        },
        categories: {
          quality: { label: "Kalidad ng Project", description: "Materyales, pagkakagawa, at standard ng construction" },
          progress: { label: "Progress ng Project", description: "Schedule, gaano na katapos, at bilis ng trabaho" },
          concerns: { label: "Mga Concern at Problema", description: "Problema, delay, o bagay na kailangang tingnan" },
          general: { label: "Iba pang Feedback", description: "Kahit ano pa tungkol sa project na ito" },
        },
        sentiment: {
          title: "Kumusta ang karanasan mo?",
          body: "Makakatulong ito para mapunta ang feedback mo sa tamang tao. Puwede mo itong i-skip.",
          positive: "Maganda",
          positiveDesc: "Maayos ang takbo",
          negative: "Hindi maganda",
          negativeDesc: "May kailangang ayusin",
          skip: "Ayokong sabihin",
        },
        category: {
          title: "Tungkol saan ito?",
          body: "Piliin ang kategoryang pinakabagay sa feedback mo.",
          recommended: "Rekomendado",
        },
        details: {
          title: "Ikuwento pa",
          body: "Ilagay ang mga detalye, mag-attach ng ebidensya, at mag-rate kung gusto mo.",
          commentLabel: "Feedback Mo",
          commentPlaceholder: "Ano'ng masasabi mo tungkol sa project na ito...",
          evidenceLabel: "Mga ebidensya (Opsyonal)",
          evidenceHint: "Mag-upload ng photo o video na meron ka na, o kumuha ng bagong geotagged photo o GeoVideo.",
          removeMedia: "Alisin ang file",
          uploading: "Ina-upload ang ebidensya…",
        },
        rating: {
          label: "Rating (Opsyonal)",
          rateOne: "Bigyan ng 1 star",
          rateMany: "Bigyan ng {count} star",
          starsOne: "1 star",
          starsMany: "{count} star",
        },
        consent: {
          body: "Piliin kung paano mo gustong i-submit ang feedback na ito.",
          agreePrefix: "Pumapayag ako sa ",
          agreeAnd: " at ",
          agreeSuffix: " sa pag-submit ng feedback na ito",
          anonymousLabel: "I-submit nang anonymous",
          anonymousHint: "Hindi makikita ng ibang user kung sino ka",
        },
        review: {
          title: "I-review ang feedback mo",
          body: "Tingnan ang lahat sa ibaba, tapos i-confirm para i-submit.",
          edit: "I-edit",
          experience: "Karanasan Mo",
          feedback: "Feedback",
          sentiment: "Karanasan",
          notSpecified: "Walang pinili",
          issueType: "Uri ng Problema",
          rating: "Rating",
          notRated: "Walang rating",
          attachments: "Mga Attachment",
          noAttachments: "Wala",
          filesOne: "1 file",
          filesMany: "{count} file",
          submittingAs: "Isu-submit bilang",
          anonymous: "Anonymous",
          yourAccount: "Account mo",
          saving: "Sine-save ang feedback...",
          submit: "I-confirm at I-submit",
        },
        errors: {
          commentRequired: "Ilagay ang feedback mo",
          mediaProcessing: "Sandali lang, pinoproseso pa ang location ng mga file.",
          mediaMax: "Hanggang {max} file lang ang puwede.",
          agreementRequired: "Kailangan mong pumayag sa Terms of Service at Privacy Policy",
          uploadBlocked: "Hindi na-upload. Pumili ng tamang photo o video.",
          uploadFailed: "Hindi na-upload ({status})",
          uploadNoPath: "Natapos ang upload pero walang file path.",
          submitFailed: "Hindi na-submit ang feedback",
          updateFailed: "Hindi na-update ang feedback",
        },
        toast: {
          updated: "Na-update na ang feedback mo!",
          submitted: "Na-submit na ang feedback mo para i-review",
          submittedDesc: "Na-save na ang feedback at mga attachment mo. Lalabas ito kapag na-approve na.",
        },
        notification: {
          title: "Na-submit ang feedback",
          message: "Na-submit na ang feedback mo para i-review ng moderator.",
        },
      },
    },
    footer: {
      links: {
        quick: {
          title: "Mga Link",
          projects: "Mga Proyekto",
          faq: "FAQ",
          contact: "Kontakin Kami",
        },
        gov: {
          title: "Gobyerno",
        },
      },
      govLinks: "Mga Link ng Gobyerno",
      phones: "{first} o {second}",
      rights: "© 2026 Bureau of Agricultural and Fisheries Engineering. Nakalaan ang lahat ng karapatan.",
      privacy: "Privacy Policy",
      deletion: "Pag-delete ng Data",
      terms: "Terms of Service",
      seal: {
        title: "Republika ng Pilipinas",
        desc: "Public domain ang lahat ng content dito maliban kung may ibang nakasaad.",
        alt: "Seal ng Republika ng Pilipinas",
      },
      govph: {
        title: "Tungkol sa GOVPH",
        desc: "Alamin ang tungkol sa gobyerno ng Pilipinas, kung paano ito nakaayos at gumagana, at ang mga taong nasa likod nito.",
      },
    },
    landing: landing.tl,
    directory: directory.tl,
    eReport: eReport.tl,
    community: community.tl,
    site: site.tl,
    account: account.tl,
  },
} as const;

export type TranslationKeys = typeof translations.en;
