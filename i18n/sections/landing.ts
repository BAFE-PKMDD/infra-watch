// Public-site strings for the "landing" area. English and everyday Tagalog side by side; see
// i18n/TAGALOG_STYLE.md for how the Tagalog is written. Keys here are read as t("landing.…").
export const landing = {
  en: {
    hero: {
      backgroundAlt: "Infrastructure project corridor",
      sealAlt: "Bagong Pilipinas Seal",
      bafeLogoAlt: "DA-BAFE Logo",
      subtitle: "Agricultural and Fisheries Infrastructure Projects",
      explore: "Explore Projects",
      eReports: "E-Reports",
    },
    stats: {
      totalInvestment: "Total Investment",
      totalProjects: "Total Projects",
      completedProjects: "Completed Projects",
      empty: "No synchronized infrastructure statistics are available yet.",
      unavailable: "Statistics temporarily unavailable. No estimated or reference figures are being shown.",
    },
    regionsMap: {
      title: "Regional Overview",
      description:
        "Hover or focus a region on the map to see its funded and completed agricultural and fisheries infrastructure projects for 2021–2026.",
      idle: "Hover a region to see its details",
      noData: "{region} has no funded projects on record for 2021–2026.",
      mapLabel: "Map of Philippine regions. Hover or tab through each region to see its project counts.",
      regionLabel: "{region}: {count} funded projects",
    },
    programs: {
      title: "Scope & Coverage",
      description:
        "INFRA Watch gives the public a direct way to track and verify agricultural and fisheries infrastructure projects under AMEFIP, from budget allocation to on-the-ground progress.",
      amefss: {
        description:
          "Provision of post-harvest facilities, grain dryers, storage warehouses, tractors, and sorting/processing equipment directly to farmer cooperatives to secure food supply chains.",
        cta: "View AMEFSS Projects",
      },
      ins: {
        description:
          "Rehabilitation and construction of diversion dams, concrete distribution canals, solar powered water pumps, and local irrigation systems supporting farmer fields.",
        cta: "View INS Projects",
      },
    },
    howItWorks: {
      title: "How It Works",
      description:
        "INFRA Watch connects citizens, site monitors, and government administrators in a closed feedback loop.",
      scroll: "Scroll",
      steps: {
        explore: {
          title: "Explore Database",
          description:
            "Browse agricultural and irrigation infrastructure projects. Filter by sub-program, budget, region, and status.",
        },
        inspect: {
          title: "Inspect Site Details",
          description: "Review coordinates, physical vs. financial progress, and the official program of works.",
        },
        report: {
          title: "Report or Give Feedback",
          description:
            "Three channels — Citizen Feed, Online E-Report, or SMS Grievance — each built for a different situation. See below to pick the one that fits.",
        },
        resolve: {
          title: "Resolve Reported Issues",
          description:
            "Government moderators investigate citizen feedback and coordinate actions to resolve problems.",
        },
      },
    },
    channels: {
      title: "How Each Reporting Channel Works",
      description:
        "Citizen Feed, Online E-Report, and SMS Grievance serve different purposes. Pick the one that fits what you need to say.",
      tablistLabel: "Reporting channel",
      citizenFeed: {
        purpose: "A public feed for quick, visible feedback that other citizens and moderators can see right away.",
        bestFor: "Best for a rating, a geotagged photo, or an observation on a project you're currently looking at.",
        cta: "Open Citizen Feed",
        steps: {
          find: {
            title: "Find the project",
            description: "Search or select the project you want to comment on.",
          },
          post: {
            title: "Post your observation",
            description: "Rate it, tag a category, and attach geotagged photos or video.",
          },
          public: {
            title: "Goes public",
            description: "Your post appears on the feed for other citizens and moderators to see.",
          },
        },
      },
      onlineReport: {
        purpose: "A structured form for a specific problem that needs a written record and a moderator response.",
        bestFor: "Best for delays, quality defects, safety hazards, or anything that needs formal follow-up.",
        cta: "Open Online E-Report",
        steps: {
          identify: {
            title: "Identify the project",
            description: "Search for it by name, or describe it if you don't know which one it is.",
          },
          describe: {
            title: "Describe the issue",
            description: "Select an issue type, add details, and upload evidence.",
          },
          submit: {
            title: "Add contact info & submit",
            description: "Confirm your details and review before submitting for a tracked ticket.",
          },
        },
      },
      smsGrievance: {
        purpose: "A text-message channel for reporting without data or an internet connection.",
        bestFor: "Best for areas with weak signal, or citizens without a smartphone or mobile data.",
        cta: "View SMS Instructions",
        steps: {
          send: {
            title: "Send the SMS",
            description:
              "Text the official number using the required format: project type, name (optional), age, gender, location, concern.",
          },
          ticket: {
            title: "Get a ticket number",
            description: "An automatic reply confirms your report and gives you a ticket number to track.",
          },
          review: {
            title: "Moderator review",
            description: "Government moderators review submitted grievances and follow up.",
          },
        },
      },
    },
    feedback: {
      title: "Reported by Citizens",
      description: "Comments submitted by citizens on monitored projects, pulled directly from the Citizen Feed.",
      viewFeed: "View Citizen Feed",
      anonymous: "Anonymous Citizen",
      citizen: "Citizen",
      verifiedContributor: "Verified Contributor",
      closeReport: "Close report view",
      viewDetails: "View details",
      time: {
        today: "Today",
        yesterday: "Yesterday",
        daysAgo: "{count}d ago",
        weeksAgo: "{count}w ago",
        monthsAgo: "{count}mo ago",
      },
    },
    live: {
      reopen: "Reopen live broadcast: {title}",
      watchLive: "Watch live",
      dialogLabel: "Live broadcast",
      dismiss: "Dismiss live broadcast",
      openPage: "Open Live page",
      notNow: "Not now",
    },
  },
  tl: {
    hero: {
      backgroundAlt: "Daanan ng isang infrastructure project",
      sealAlt: "Seal ng Bagong Pilipinas",
      bafeLogoAlt: "Logo ng DA-BAFE",
      subtitle: "Mga Infrastructure Project sa Agrikultura at Pangingisda",
      explore: "Tingnan ang mga Project",
      eReports: "E-Reports",
    },
    stats: {
      totalInvestment: "Kabuuang Pondo",
      totalProjects: "Kabuuang Project",
      completedProjects: "Tapos na Project",
      empty: "Wala pang naka-sync na statistics ng mga infrastructure project.",
      unavailable: "Hindi available ang statistics sa ngayon. Wala kaming ipinapakitang tantya o reference na numero.",
    },
    regionsMap: {
      title: "Mga Project sa Bawat Region",
      description:
        "I-hover o i-focus ang isang region sa map para makita kung ilang infrastructure project sa agrikultura at pangingisda ang may pondo at ilan ang tapos na, mula 2021–2026.",
      idle: "I-hover ang isang region para makita ang detalye",
      noData: "Walang naka-record na project na may pondo ang {region} para sa 2021–2026.",
      mapLabel: "Map ng mga region sa Pilipinas. I-hover o i-tab ang bawat region para makita kung ilan ang project nito.",
      regionLabel: "{region}: {count} project na may pondo",
    },
    programs: {
      title: "Mga Programang Sakop",
      description:
        "Sa INFRA Watch, puwede mong bantayan at i-check mismo ang mga infrastructure project sa agrikultura at pangingisda sa ilalim ng AMEFIP. Makikita mo ang lahat, mula sa budget hanggang sa aktwal na progress sa site.",
      amefss: {
        description:
          "Post-harvest facilities, grain dryer, bodega, traktora, at mga makinang pang-sort at pang-process na diretsong ibinibigay sa mga kooperatiba ng magsasaka. Para tuloy-tuloy ang supply ng pagkain.",
        cta: "Tingnan ang mga AMEFSS Project",
      },
      ins: {
        description:
          "Pag-aayos at pagpapagawa ng diversion dam, sementadong kanal, solar-powered na water pump, at mga lokal na irrigation system para sa bukid ng mga magsasaka.",
        cta: "Tingnan ang mga INS Project",
      },
    },
    howItWorks: {
      title: "Paano Ito Gumagana",
      description:
        "Sa INFRA Watch, konektado ang publiko, ang mga site monitor, at ang mga admin ng gobyerno. Bawat feedback, may sagot at aksyon.",
      scroll: "I-scroll",
      steps: {
        explore: {
          title: "Silipin ang Database",
          description:
            "Tingnan ang mga infrastructure project sa agrikultura at irigasyon. I-filter ayon sa sub-program, budget, region, at status.",
        },
        inspect: {
          title: "Tingnan ang Detalye ng Site",
          description: "Silipin ang coordinates, ang physical vs. financial progress, at ang opisyal na program of works.",
        },
        report: {
          title: "Mag-report o Mag-feedback",
          description:
            "May tatlong paraan — Citizen Feed, Online E-Report, o SMS Grievance — at iba-iba ang gamit ng bawat isa. Tingnan sa ibaba kung alin ang bagay sa iyo.",
        },
        resolve: {
          title: "Inaayos ang mga Nireport na Problema",
          description:
            "Tinitingnan ng mga moderator ng gobyerno ang feedback ng publiko at nakikipag-coordinate sila para maayos ang problema.",
        },
      },
    },
    channels: {
      title: "Paano Gumagana ang Bawat Paraan ng Pag-report",
      description:
        "Iba-iba ang gamit ng Citizen Feed, Online E-Report, at SMS Grievance. Piliin ang bagay sa gusto mong sabihin.",
      tablistLabel: "Paraan ng pag-report",
      citizenFeed: {
        purpose: "Public feed para sa mabilisang feedback na makikita agad ng ibang tao at ng mga moderator.",
        bestFor: "Bagay ito kung magbibigay ka ng rating, geotagged na photo, o obserbasyon sa project na tinitingnan mo ngayon.",
        cta: "Buksan ang Citizen Feed",
        steps: {
          find: {
            title: "Hanapin ang project",
            description: "Hanapin o piliin ang project na gusto mong komentuhan.",
          },
          post: {
            title: "I-post ang napansin mo",
            description: "Bigyan ng rating, pumili ng category, at mag-attach ng geotagged na photo o video.",
          },
          public: {
            title: "Makikita ng lahat",
            description: "Lalabas ang post mo sa feed para makita ng ibang tao at ng mga moderator.",
          },
        },
      },
      onlineReport: {
        purpose: "Form para sa isang specific na problema na kailangang may nakasulat na record at sagot mula sa moderator.",
        bestFor: "Bagay ito sa delay, palpak na gawa, delikadong kondisyon, o kahit anong kailangan ng pormal na follow-up.",
        cta: "Buksan ang Online E-Report",
        steps: {
          identify: {
            title: "Sabihin kung aling project",
            description: "Hanapin ito gamit ang pangalan, o i-describe kung hindi mo alam kung alin ito.",
          },
          describe: {
            title: "Ikuwento ang problema",
            description: "Pumili ng klase ng issue, dagdagan ng detalye, at mag-upload ng ebidensya.",
          },
          submit: {
            title: "Ilagay ang contact info at i-submit",
            description: "I-check ang details mo at i-review bago i-submit para makakuha ng ticket na puwedeng i-track.",
          },
        },
      },
      smsGrievance: {
        purpose: "Pag-report gamit ang text, kahit walang data o internet.",
        bestFor: "Bagay ito sa lugar na mahina ang signal, o kung wala kang smartphone o mobile data.",
        cta: "Tingnan kung paano mag-SMS",
        steps: {
          send: {
            title: "I-send ang SMS",
            description:
              "I-text ang opisyal na number gamit ang format na ito: project type, pangalan (optional), edad, kasarian, lokasyon, concern.",
          },
          ticket: {
            title: "Makakuha ng ticket number",
            description: "May automatic reply na magsasabing natanggap ang report mo, kasama ang ticket number na puwede mong i-track.",
          },
          review: {
            title: "Titingnan ng moderator",
            description: "Titingnan ng mga moderator ng gobyerno ang mga reklamong ipinadala at ifa-follow up nila ito.",
          },
        },
      },
    },
    feedback: {
      title: "Nireport ng Publiko",
      description: "Mga comment ng publiko sa mga binabantayang project. Kinuha mismo mula sa Citizen Feed.",
      viewFeed: "Tingnan ang Citizen Feed",
      anonymous: "Anonymous na Citizen",
      citizen: "Citizen",
      verifiedContributor: "Verified na Contributor",
      closeReport: "Isara ang report",
      viewDetails: "Tingnan ang detalye",
      time: {
        today: "Ngayon",
        yesterday: "Kahapon",
        daysAgo: "{count} araw na",
        weeksAgo: "{count} linggo na",
        monthsAgo: "{count} buwan na",
      },
    },
    live: {
      reopen: "Buksan ulit ang live broadcast: {title}",
      watchLive: "Manood ng live",
      dialogLabel: "Live broadcast",
      dismiss: "Isara ang live broadcast",
      openPage: "Pumunta sa Live",
      notNow: "Hindi muna",
    },
  },
} as const;
