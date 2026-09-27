import pkg from "../package.json";

export type Language = "en" | "tl";

export const translations = {
  en: {
    nav: {
      home: "Home",
      projects: "Projects",
      checklists: "Checklists",
      map: "Map",
      evidenceMap: "Citizen Reports Map",
      statistics: "Statistics",
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
      articlesAndUpdates: "Articles & Updates",
      infraAnalytics: "Infra Analytics",
    },
    languageDialog: {
      title: "Choose Your Language",
      subtitle: "Select your preferred language for the platform",
      english: "English",
      filipino: "Filipino (Tagalog)",
      confirm: "Continue",
    },
    announcement: {
      dialog: {
        dontShowToday: "Don't show this again today",
        close: "Close",
      },
    },
    hero: {
      title: "INFRA WATCH",
      subtitle: "Agricultural Infrastructure Transparency Portal",
      version: pkg.version || "Beta",
      mainTitle: "TRANSPARENCY PORTAL",
      mainSubtitle: "Agricultural Infrastructure Projects",
      departmentLabel: "Department of Agriculture - Bureau of Agricultural and Fisheries Engineering",
      ctaPrimary: "Explore Projects",
      ctaSecondary: "Learn More",
      ctaReport: "E-Reports",
    },
    gallery: {
      title: "Agricultural Infrastructure Projects",
      subtitle: "Discover our agricultural infrastructure projects, documented with geotagged photos randomly selected from the database.",
      clickToExpand: "Click to expand",
      projectPhoto: "Project Photo",
      photo: "Photo",
    },
    stats: {
      totalInvestment: "Total Investment",
      totalProjects: "Total Projects",
      completedProjects: "Completed Projects",
      totalLength: "Total Length (KM)",
    },
    impact: {
      title: "Transforming Communities",
      subtitle: "Across the Philippines",
      description: "Every kilometer of road built creates lasting impact for farmers, families, and entire communities",
      farmers: {
        label: "Farmers Reached",
        desc: "Benefiting from improved infrastructure",
      },
      communities: {
        label: "Communities Connected",
        desc: "Across the Philippines",
      },
      hours: {
        label: "Hours Saved",
        desc: "In transportation time",
      },
      transport: {
        label: "Tons Transported",
        desc: "Agricultural products moved",
      },
    },
    impactSlider: {
      title: "Transforming Communities",
      before: "Before",
      after: "After",
      description: "Slide to reveal the transformation of farm-to-market roads. From impassable dirt tracks to modern concrete road, bringing communities closer to progress.",
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "A straightforward process to engage with infrastructure monitoring and contribute to community development",
      steps: [
        {
          title: "Explore Projects",
          desc: "Browse our comprehensive database of Farm-to-Market Road projects. Search by location, view project details, timelines, and budget allocations.",
        },
        {
          title: "Share Feedback",
          desc: "Provide ratings, comments, and upload photos of project sites. Your feedback contributes to transparency and accountability in infrastructure development.",
        },
        {
          title: "Report Issues",
          desc: "Submit detailed reports about road conditions, construction delays, or quality concerns. Include photographic evidence and precise location data.",
        },
        {
          title: "Track Progress",
          desc: "Monitor project completion rates, budget utilization, and real-time updates. Stay informed about infrastructure developments in your community.",
        },
      ],
      ctaTitle: "Ready to Get Started?",
      ctaDesc: "Help improve your community by monitoring farm-to-market road projects",
      ctaBtn: "Start Contributing Today",
    },
    updates: {
      label: "Latest Updates",
      title: "Community News & Insights",
      subtitle: "Stay informed with recent articles and community insights",
      noContent: "No featured content available at this time",
      articlesTitle: "Featured Articles",
      articlesSubtitle: "Latest news and updates",
      feedbackTitle: "Community Feedback",
      feedbackSubtitle: "Top-rated contributions from citizens",
      anonymous: "Anonymous",
      viewMore: "View More Feedbacks",
      viewLess: "View Less",
    },
    info: {
      title: "Transparency",
      subtitle: "in Action",
      desc: "Comprehensive access to farm-to-market road infrastructure projects across the Philippines",
      features: [
        "Near Real-time project monitoring and updates",
        "Detailed financial information and budgets",
        "Community feedback and engagement tools",
        "Geotagged photos and progress documentation",
      ],
      active: "Active Now",
      completed: "Completed",
      feedback: "Published Feedback",
      reports: "E-Reports",
    },
    cta: {
      title: "Monitor Farm-to-Market",
      subtitle: "Road Projects",
      desc: "Access project details, budgets, and progress reports for your region",
      browse: "Browse Projects",
      statistics: "View Statistics",
    },
    status: {
      pending: "Pending Review",
      reviewing: "Under Review",
      resolved: "Resolved",
      closed: "Closed"
    },
    fmrStatistics: {
      title: "Farm-to-Market Road Information",
      description: "Hover on the map to view the farm-to-market road projects and accomplishments for 2021-2026.",
      seeMore: "See More",
      nationalStats: "National Statistics",
      fundedProjects: "Funded Projects",
      totalAllocation: "Total Allocation",
      completedProjects: "Completed Projects",
      lengthCompleted: "Length Completed",
      nationalSummary: "National Summary"
    },
    infraAnalytics: {
      title: "Status of infrastructure projects",
      asOf: "As of",
      target: "Target",
      preImplementation: "Under Pre-implementation",
      procurement: "Under Procurement",
      construction: "Under Construction",
      completed: "Completed",
      turnedOver: "Turned-over",
      viewBreakdown: "View Breakdown",
      charts: {
        regionalTitle: "Regional target and turned-over projects",
        bannerTitle: "Turned-over projects per banner program",
        yAxisLabel: "Operating Unit (RFOs)",
        xAxisLabel: "Banner Program",
        targetLegend: "Target",
        turnedOverLegend: "Turned-over"
      },
      performancePanel: {
        title: "Schedule performance",
        description: "Tracks in-progress projects against their recorded target completion date."
      },
      schedulePerformance: {
        title: "Overdue rate",
        overdueLabel: "overdue",
        detail: "{overdueCount} of {total} in-progress projects with a recorded target date are overdue.",
        median: "Median {days} days overdue among overdue projects.",
        medianUnavailable: "No overdue projects in this data set.",
        unknown: "{count} in-progress projects have no recorded target completion date.",
        unavailable: "Not currently available",
        unavailableDetail: "No in-progress projects in this data set have a recorded target completion date."
      }
    },
    about: {
      title: "About Us",
      subtitle: "Building Trust Through Transparency",
      description: "INFRA Watch is the official transparency portal for agricultural infrastructure projects in the Philippines, led by the Department of Agriculture – Bureau of Agricultural and Fisheries Engineering (DA-BAFE). We empower citizens to monitor, report, and engage with infrastructure developments in their communities.",
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
      values: [
        { title: "Transparency", desc: "Open access to project data" },
        { title: "Participation", desc: "Citizen engagement" }
      ],
      featuresTitle: "Key Features",
      features: [
        { title: "Near Real-time Project Tracking", desc: "Monitor ongoing infrastructure developments as they happen." },
        { title: "Citizen Reporting Mechanism", desc: "Directly report issues and feedback to government agencies." },
        { title: "Data-Driven Insights", desc: "Access comprehensive analytics on project progress and funding." },
        { title: "Geotagged Infrastructure", desc: "View precise locations and visual evidence of all projects." }
      ]
    },
    reportIssue: {
      landing: {
        badge: "Community Reporting",
        title: "Reported Issues",
        description: "Track and monitor issues reported by citizens across infrastructure projects",
        cta: "Report New Issue",
        searchPlaceholder: "Search by description or location...",
        loading: "Loading issues...",
        filters: {
          statusPlaceholder: "Filter by status",
          datePlaceholder: "Filter by date range",
          allStatuses: "All Statuses",
        },
        empty: {
          title: "No issues found",
          description: "Try adjusting your filters or search query"
        },
        item: {
          priority: "{label} Priority",
          location: "Location:",
          reported: "Reported",
          viewDetails: "View Details",
          by: "By: {name}"
        }
      },
      detail: {
        back: "Back to Issues",
        title: "Issue Details",
        reportedOnFormatted: "Reported on {date}",
        description: "Issue Description",
        location: "Location",
        labels: {
          region: "Region",
          province: "Province",
          city: "City/Municipality",
          barangay: "Barangay",
          landmark: "Landmark"
        },
        evidence: {
          title: "Evidence",
          empty: "No photos or videos uploaded yet.",
          remove: "Remove evidence"
        },
        relatedProject: {
          label: "Related Project",
          id: "Project #{id}",
          view: "View Project"
        },
        timeline: {
          title: "Timeline",
          dateNoticed: "Date Noticed",
          reportedOn: "Reported On",
          lastUpdated: "Last Updated",
          resolvedOn: "Resolved On"
        },
        reporter: {
          title: "Reporter",
          anonymous: {
            title: "Anonymous Report",
            description: "This issue was reported anonymously. Reporter details are not available."
          }
        },
        responses: {
          title: "Official Responses",
        },
        notFound: {
          title: "Issue Not Found",
          description: "The issue you're looking for doesn't exist or has been removed."
        }
      },
      form: {
        title: "Report an Issue",
        subtitle: "Help us improve by reporting issues you've noticed in your community",
        back: "Back to Reported Issues",
        sections: {
          project: {
            title: "Project Information",
            description: "Optional - Is this issue related to a specific project?"
          },
          location: {
            title: "Location Information",
            description: "Required - Where is the issue located?"
          },
          details: {
            title: "Issue Details",
            description: "Required - Describe the issue you want to report"
          },
          evidence: {
            title: "Evidence",
            description: "Optional - Photos and videos help us understand better"
          },
          contact: {
            title: "Contact Information",
            description: "Required - How can we reach you for updates?"
          },
          consent: {
            title: "Terms and Consent",
            description: "Please review and agree to continue"
          }
        },
        fields: {
          searchProject: "Search by ID or project name...",
          searching: "Searching...",
          noProjects: "No projects found",
          skipProject: "I don't know which project / Skip this part",
          skipDescription: "You can still report the issue without linking it to a specific project",
          region: "Region",
          province: "Province",
          city: "City/Municipality",
          barangay: "Barangay",
          landmark: "Street/Landmark",
          issueType: "Issue Type",
          issueDescription: "Tell us more",
          dateNoticed: "Date Noticed",
          dateNoticedOptional: "Date Noticed (Optional)",
          contactNumber: "Contact Number",
          email: "Email Address",
          emailOptional: "Email Address (Optional)",
          isAnonymous: "Report anonymously (your name will not be public)",
          isAnonymousDescription: "Your identity will be hidden from public view, but we can still contact you for updates",
          confirmAccuracy: "I confirm that the information provided is accurate to the best of my knowledge",
          agreeToTermsPrefix: "I agree to the ",
          andConnector: " and ",
          agreeToTerms: "I agree to the Terms of Service and Privacy Policy",
          charCount: "{count}/1000 characters",
        },
        placeholders: {
          region: "Select region",
          province: "Select province",
          provinceFirst: "Select region first",
          city: "Select city/municipality",
          cityFirst: "Select province first",
          barangay: "Select barangay",
          barangayFirst: "Select city first",
          landmark: "e.g., Barangay Hall, Main Street",
          issueType: "Select issue type",
          issueDescription: "Please provide a detailed description of the issue...",
          contactNumber: "e.g., 09123456789",
          email: "your.email@example.com",
          description: "Please provide a detailed description of the issue...",
        },
        evidence: {
          uploadLabel: "Upload Evidence ({current}/{max})",
          dropzone: "Click to upload photos or videos",
          limit: "Images (PNG, JPG) or Videos (MP4, MOV) up to {size}MB each (Max {max} files)",
          maxReached: "Maximum files reached"
        },
        validation: {
          required: "{field} is required",
          descriptionMin: "Description must be at least 20 characters",
          descriptionMax: "Description must be at most 1000 characters",
          contactMin: "Contact number must be at least 10 digits",
          contactFormat: "Invalid contact number format",
          emailFormat: "Invalid email address",
          confirmAccuracy: "You must confirm the accuracy of the information",
          agreeToTerms: "You must agree to the terms and privacy policy"
        },
        messages: {
          successTitle: "Issue Reported Successfully!",
          successDescription: "Thank you for reporting this issue. We will review it and take appropriate action.",
          viewReports: "View My Reports",
          submitError: "Failed to submit issue",
          fixErrors: "Please fix the errors in the form",
          uploadSuccess: "Successfully uploaded {count} file(s)",
          uploadFailed: "Failed to upload {name}",
          maxFilesError: "Maximum {max} files allowed. You can add {remaining} more.",
          invalidType: "File \"{name}\" is not an image or video"
        },
        actions: {
          submit: "Submit Report",
          submitting: "Submitting...",
          cancel: "Cancel"
        }
      },
      types: {
        infrastructure: "Infrastructure Issues",
        safety: "Safety Concerns",
        environmental: "Environmental Issues",
        administrative: "Administrative Concerns",
        damage: "Road Damage / Potholes",
        stopped: "Construction Stopped / Delayed",
        flooding: "Flooding / Drainage Issues",
        blocked: "Blocked Road / Materials",
        quality: "Poor Construction Quality",
        other: "Other"
      },
      actions: {
        submit: "Submit Report",
        cancel: "Cancel"
      },
      wizard: {
        back: "Back",
        next: "Next",
        steps: {
          awareness: "Start",
          awarenessDesc: "Tell us about the project",
          project: "Project",
          projectDesc: "Search for the project",
          location: "Location",
          locationDesc: "Where is the issue?",
          suggestions: "Match",
          suggestionsDesc: "Find matching projects",
          details: "Details",
          detailsDesc: "Describe the issue",
          contact: "Submit",
          contactDesc: "Contact info and consent",
        },
        awareness: {
          title: "Is this issue related to a specific project?",
          subtitle: "This helps us respond to your report faster",
          yesTitle: "Yes, I know the project",
          yesDescription: "I can search for the project by name or code",
          searchProject: "Search project",
          noTitle: "No, I'm not sure",
          noDescription: "I'll describe the location and we'll find nearby projects",
          selectLocation: "Select location",
        },
        search: {
          title: "Find the Project",
          subtitle: "Search by project name, code, or ID",
          projectDetails: "Project Details",
          location: "Location",
          agency: "Agency",
          budget: "Budget",
          status: "Status",
          leaveFeedback: "Leave Feedback",
          visitFeedback: "Click here! You might want to visit this project and leave a feedback instead",
          selectProject: "Select this Project",
          reportIssue: "Report an Issue",
        },
        suggestions: {
          title: "Projects in Your Area",
          subtitle: "We found the following projects near your location. Select one if it matches.",
          searching: "Looking for projects in your area...",
          info: "Selecting a project helps us respond faster. If none match, you can skip this step.",
          skip: "None of these (skip)",
          noResults: "No projects found in this area",
          noResultsHint: "You can continue without selecting a project.",
        },
      }
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
        submit: "Send message",
        sending: "Sending...",
        responseInfo: "Response within one business day",
        success: {
          title: "Message Sent!",
          desc: "Thank you for reaching out. We'll get back to you within one business day.",
          cta: "Send Another Message",
        },
      },
      office: {
        title: "Visit our office",
      },
    },
    projects: {
      hero: {
        subtitle: "Transparency for Rural Development",
        title: "INFRA WATCH",
        description: "Monitor and validate agricultural infrastructure projects across the Philippines",
      },
      search: {
        title: "Search for a project",
        description: "Quickly search a project by name or code.",
        placeholder: "Search for project name or code",
        clear: "Clear search",
      },
      filters: {
        label: "Filters",
        clear: "Clear",
        region: "All Regions",
        province: "All Provinces",
        city: "All Cities/Municipalities",
        barangay: "All Barangays",
        status: "All Status",
      },
      stats: {
        loading: "Loading Projects...",
        error: "Error loading projects",
        found: "{total} Projects Found",
        none: "No projects found",
        adjust: "Try adjusting your filters or search query",
      },
      export: {
        title: "Export Projects",
        description: "Download the full list of projects matching your current filters.",
        csv: "Export as CSV",
        pdf: "Export as PDF",
        generating: "Generating export file...",
      },
      view: {
        label: "Select a view:",
        grid: "Grid View",
        table: "Table View",
        map: "Maps View",
      },
      pagination: {
        showing: "Showing {start} to {end} of {total} results",
        perPage: "Per page",
        prev: "Previous",
        next: "Next",
        page: "Page {current} of {total}",
      },
    },
    projectDetail: {
      backToProjects: "Back to Projects",
      monitoringFallback: "Monitoring the construction and development of {name} in {location}.",
      title: "Project Detail",
      overview: {
        title: "Project Overview",
        highlights: "Project Highlights",
        projectType: "Project Type",
        projectTypeTooltip: "Standardized infrastructure category for this project",
        projectCode: "Project Code",
        projectCodeTooltip: "Unique identification code for the project",
        location: "Project Location",
        locationTooltip: "Physical location where the project is situated",
        implementingAgency: "Implementing Agency",
        implementingAgencyTooltip: "Organization responsible for the project execution",
        coordinates: "Project Latitude and Longitude",
        coordinatesTooltip: "Geographic coordinates of the project site",
        contractor: "Contractor",
        contractorTooltip: "Company awarded with the project contract",
        budget: "Total Budget",
        budgetTooltip: "Total allocated funds for the project",
        abc: "Bidded Amount",
        abcTooltip: "The total bidded amount for the procurement process",
        startDate: "Start Date",
        startDateTooltip: "Official commencement date of the project",
        targetCompletion: "Target Completion",
        targetCompletionTooltip: "Estimated date when the project should be finished",
        actualCompletion: "Actual Completion Date",
        actualCompletionTooltip: "The date when the project was officially completed",
        turnOverDate: "Turn Over Date",
        turnOverDateTooltip: "Date when the project was officially handed over to the beneficiary",
        duration: "Duration",
        durationTooltip: "Total time elapsed for the project construction",
        contractDuration: "Contract Duration",
        contractDurationTooltip: "Specified time frame in the project contract",
        calendarDays: "{days} calendar days",
        targetLength: "Target Length",
        targetLengthTooltip: "Proposed total distance or length of the project",
        postGeotaggedLength: "Actual Length",
        postGeotaggedLengthTooltip: "The actual length of the road as verified through geotagging",
        roadClass: "Road Class",
        roadClassTooltip: "Classification of the road (e.g., Barangay, Municipal)",
        roadType: "Road Type",
        roadTypeTooltip: "Type of pavement used (e.g., Concrete, Asphalt)",
        farmOperation: "Farm Operation",
        farmOperationTooltip: "Category of agricultural activity this facility supports (e.g., Production, Post Harvest, Storage)",
        commodities: "Commodities Supported",
        commoditiesTooltip: "Agricultural products that will benefit from this project",
        bannerProgram: "Banner Program",
        bannerProgramTooltip: "The main government program funding the project",
        yearFunded: "Year Funded",
        yearFundedTooltip: "The fiscal year the budget was allocated for this project",
        status: "Status",
        statusTooltip: "Current progress state of the project",
        description: "Project Description",
        descriptionTooltip: "Additional details about the project objectives and background",
        notAvailable: "Not available",
        notCompleted: "Not yet completed",
        scanToView: "Scan to view project",
        downloadQR: "Download QR",
      },
      sidebar: {
        details: "Project Details",
        articles: "Articles & Publications",
        photos: "Photos",
        videos: "Videos",
        documents: "Documents",
        pow: "Program of Works",
        procurement: "Procurement",
        feedback: "Feedback",
      },
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
      tabs: {
        videos: {
          title: "Project Videos",
          empty: "Videos will be displayed here once uploaded.",
        },
        photos: {
          title: "Project Photos",
          geotagged: "Geotagged Photos ({count})",
          empty: "No Photos Yet",
          emptyDesc: "Geotagged photos will appear here once uploaded.",
          grid: "Grid",
          map: "Maps",
          loadingMap: "Loading map...",
          preparingSatellite: "Preparing satellite view",
          categories: {
            validation: "Validation Photos",
            progress: "Progress Photos",
            completed: "Completed Photos",
            uncategorized: "Uncategorized Photos",
            other: "Other Photos",
          },
          viewMore: "Show More",
          viewLess: "Show Less",
          albums: "Photo Albums",
          backToAlbums: "Back to Albums",
        },
        articles: {
          title: "Project Articles",
          empty: "No Articles Yet",
          emptyDesc: "Articles and publications will appear here once published.",
        },
        documents: {
          title: "Project Documents",
          empty: "No Documents Yet",
          emptyDesc: "Project documents will be listed here once available.",
          item: "Document {index}",
        },
        pow: {
          title: "Program of Works",
          empty: "No POW Data",
          emptyDesc: "Program of Works details will appear here once available.",
          quantity: "Total Quantity",
          cost: "Contract Cost",
          date: "Date",
          targetProgress: "Target Progress",
          actualProgress: "Actual Progress",
          viewAttachment: "View Attachment",
          sCurveTitle: "Physical Progress (S-Curve)",
          insufficientData: "Insufficient data for S-curve visualization",
        },
        procurement: {
          title: "Procurement",
          empty: "No Procurement Data",
          emptyDesc: "Procurement records will be listed here once available.",
          stage: "Procurement Stage",
          date: "Date",
          status: "Status",
          remarks: "Remarks",
          targetDate: "Target Date",
          actualDate: "Actual Date",
          factors: "Factors Affecting Progress",
          measures: "Measures Undertaken",
          item: "Milestone {index}",
          milestone: "Milestone",
        },
      },
      common: {
        noContent: "No content available",
      },
    },
    live: {
      title: "Live Broadcasts",
      subtitle: "Stay updated with real-time progress reports and project highlights from across the country.",
      noBroadcasts: "No active broadcasts",
      noBroadcastsDesc: "There are no live or recorded broadcasts available at the moment. Please check back later.",
      moreBroadcasts: "More Broadcasts",
      videosCount: "{count} videos",
      liveNow: "Live Now",
      recorded: "Recorded",
      broadcastingLive: "Broadcasting Live",
      searchPlaceholder: "Search by title or description...",
      noResults: "No results found for \"{search}\"",
      clearSearch: "Clear search",
      playingNow: "Playing Now",
    },
    footer: {
      subtitle: "DA-FMR Transparency Portal",
      links: {
        quick: {
          title: "Quick Links",
          projects: "Projects",
      checklists: "Checklists",
          statistics: "Statistics",
          faq: "FAQ",
          contact: "Contact Us",
        },
        gov: {
          title: "Government",
        },
      },
      rights: "© 2026 Bureau of Agricultural and Fisheries Engineering. All rights reserved.",
      privacy: "Privacy Policy",
      deletion: "Data Deletion",
      terms: "Terms of Service",
      seal: {
        title: "Republic of the Philippines",
        desc: "All content is in the public domain unless otherwise stated.",
      },
      govph: {
        title: "About GOVPH",
        desc: "Learn more about the Philippine government, its structure, how government works and the people behind it.",
      },
    },
  },
  tl: {
    nav: {
      home: "Tahanan",
      projects: "Proyekto",
      checklists: "Mga Checklist",
      map: "Mapa",
      evidenceMap: "Mapa ng mga Ulat ng Mamamayan",
      statistics: "Istatistika",
      faq: "FAQ",
      contact: "Kontak",
      report: "E-Ulat",
      signIn: "Mag-sign In",
      signOut: "Mag-sign Out",
      dashboard: "Dashboard",
      myFeedback: "Aking mga Feedback",
      myReports: "Aking mga Isyu",
      myNotifications: "Mga Abiso",
      myProfile: "Aking Profile",
      about: "Tungkol",
      more: "Higit Pa",
      live: "Live",
      citizenFeed: "Citizen Feed",
      articlesAndUpdates: "Mga Artikulo at Update",
      infraAnalytics: "Analitika ng Infra",
    },
    languageDialog: {
      title: "Piliin ang Iyong Wika",
      subtitle: "Piliin ang iyong gustong wika para sa platform",
      english: "English",
      filipino: "Filipino (Tagalog)",
      confirm: "Magpatuloy",
    },
    announcement: {
      dialog: {
        dontShowToday: "Huwag ipakita muli ngayong araw",
        close: "Isara",
      },
    },
    hero: {
      title: "INFRA WATCH",
      subtitle: "Transparency Portal para sa Imprastraktura",
      version: pkg.version || "Beta",
      mainTitle: "TRANSPARENCY PORTAL",
      mainSubtitle: "Mga Proyekto ng Imprastraktura ng Agrikultura",
      departmentLabel: "Department of Agriculture - Bureau of Agricultural and Fisheries Engineering",
      ctaPrimary: "Galugarin ang mga Proyekto",
      ctaSecondary: "Matuto Pa",
      ctaReport: "E-Ulat",
    },
    gallery: {
      title: "Mga Proyekto ng Imprastrakturang Pang-agrikultura",
      subtitle: "Tuklasin ang aming mga proyekto ng imprastrakturang pang-agrikultura, na dokumentado ng mga geotagged na larawan.",
      clickToExpand: "I-click para palakihin",
      projectPhoto: "Larawan ng Proyekto",
      photo: "Larawan",
    },
    stats: {
      totalInvestment: "Kabuuang Pamumuhunan",
      totalProjects: "Kabuuang Proyekto",
      completedProjects: "Tapos na Proyekto",
      totalLength: "Kabuuang Haba (KM)",
    },
    impact: {
      title: "Pagbabago sa mga Komunidad",
      subtitle: "Sa Buong Pilipinas",
      description: "Bawat kilometro ng kalsadang itinayo ay lumilikha ng pangmatagalang epekto para sa mga magsasaka, pamilya, at buong komunidad",
      farmers: {
        label: "Magsasakang Naabot",
        desc: "Nakikinabang sa pinahusay na imprastraktura",
      },
      communities: {
        label: "Komunidad na Konektado",
        desc: "Sa buong Pilipinas",
      },
      hours: {
        label: "Oras na Natipid",
        desc: "Sa oras ng transportasyon",
      },
      transport: {
        label: "Tons na Nadala",
        desc: "Mga produktong agrikultural na nailipat",
      },
    },
    impactSlider: {
      title: "Pagbabago sa mga Komunidad",
      before: "Bago",
      after: "Pagkatapos",
      description: "I-slide para makita ang transpormasyon ng mga farm-to-market road. Mula sa mga hindi madaanang baku-bakong lupa tungo sa modernong konkretong kalsada, inilalapit ang mga komunidad sa kaunlaran.",
    },
    howItWorks: {
      title: "Paano Ito Gumagana",
      subtitle: "Isang simpleng proseso para lumahok sa pagsubaybay ng imprastraktura at makatulong sa pag-unlad ng komunidad",
      steps: [
        {
          title: "Galugarin ang mga Proyekto",
          desc: "I-browse ang aming komprehensibong database ng mga proyekto ng Farm-to-Market Road. Maghanap ayon sa lokasyon, tingnan ang mga detalye ng proyekto, timeline, at alokasyon ng badyet.",
        },
        {
          title: "Ibahagi ang Feedback",
          desc: "Magbigay ng mga rating, komento, at mag-upload ng mga larawan ng mga site ng proyekto. Ang iyong feedback ay nakakatulong sa transparency at pananagutan sa pagpapaunlad ng imprastraktura.",
        },
        {
          title: "Iulat ang mga Isyu",
          desc: "Magsumite ng detalyadong ulat tungkol sa kondisyon ng kalsada, pagkaantala sa konstruksyon, o mga problema sa kalidad. Isama ang mga larawan bilang ebidensya at tumpak na lokasyon.",
        },
        {
          title: "Subaybayan ang Pag-unlad",
          desc: "Subaybayan ang rate ng pagtatapos ng proyekto, paggamit ng badyet, at real-time na mga update. Manatiling may alam tungkol sa mga imprastraktura sa iyong komunidad.",
        },
      ],
      ctaTitle: "Handa ka na bang Magsimula?",
      ctaDesc: "Tulungan ang iyong komunidad sa pamamagitan ng pagsubaybay sa mga proyekto ng farm-to-market road",
      ctaBtn: "Magsimulang Tumulong Ngayon",
    },
    updates: {
      label: "Pinakabagong Update",
      title: "Balita at Kaalaman sa Komunidad",
      subtitle: "Manatiling may alam sa mga kamakailang artikulo at kaalaman mula sa komunidad",
      noContent: "Walang tampok na nilalaman sa kasalukuyan",
      articlesTitle: "Mga Tampok na Artikulo",
      articlesSubtitle: "Pinakabagong balita at mga update",
      feedbackTitle: "Feedback mula sa Komunidad",
      feedbackSubtitle: "Pinakamataas na rating na kontribusyon mula sa mga mamamayan",
      anonymous: "Hindi Kilala",
      viewMore: "Tingnan ang Higit Pang Feedback",
      viewLess: "Tingnan ang Mas Kaunti",
    },
    info: {
      title: "Transparency",
      subtitle: "sa Aksyon",
      desc: "Komprehensibong pag-access sa mga proyekto ng imprastraktura ng farm-to-market road sa buong Pilipinas",
      features: [
        "Near Real-time na pagsubaybay at mga update sa proyekto",
        "Detalyadong impormasyon sa pananalapi at badyet",
        "Feedback ng komunidad at mga tool sa pakikilahok",
        "Mga geotagged na larawan at dokumentasyon ng pag-unlad",
      ],
      active: "Aktibo Ngayon",
      completed: "Tapos Na",
      feedback: "Nailathalang Feedback",
      reports: "Mga E-Ulat",
    },
    cta: {
      title: "Subaybayan ang mga Proyekto ng",
      subtitle: "Farm-to-Market Road",
      desc: "I-access ang mga detalye ng proyekto, badyet, at ulat ng pag-unlad para sa iyong rehiyon",
      browse: "Mag-browse ng Proyekto",
      statistics: "Tingnan ang Istatistika",
    },
    status: {
      pending: "Nakabinbing Pagsusuri",
      reviewing: "Sinusuri na",
      resolved: "Nalutas na",
      closed: "Isinara na"
    },
    fmrStatistics: {
      title: "Impormasyon ng Farm-to-Market Road",
      description: "I-hover ang mapa upang makita ang mga proyekto at tagumpay ng farm-to-market road para sa 2021-2026.",
      seeMore: "Tingnan Pa",
      nationalStats: "Pambansang Istatistika",
      fundedProjects: "Mga Pondong Proyekto",
      totalAllocation: "Kabuuang Alokasyon",
      completedProjects: "Mga Tapos na Proyekto",
      lengthCompleted: "Haba na Natapos",
      nationalSummary: "Pambansang Buod"
    },
    infraAnalytics: {
      title: "Katayuan ng mga Proyekto ng Imprastraktura",
      asOf: "Kasalukuyan noong",
      target: "Target",
      preImplementation: "Nasa Pre-implementasyon",
      procurement: "Nasa Pagkuha (Procurement)",
      construction: "Kasalukuyang Itinatayo",
      completed: "Tapos na",
      turnedOver: "Nai-turn over",
      viewBreakdown: "Tingnan ang Detalye",
      charts: {
        regionalTitle: "Target at Nai-turn over na mga Proyekto kada Rehiyon",
        bannerTitle: "Nai-turn over na mga Proyekto kada Banner Program",
        yAxisLabel: "Operating Unit (RFOs)",
        xAxisLabel: "Banner Program",
        targetLegend: "Target",
        turnedOverLegend: "Nai-turn over"
      },
      performancePanel: {
        title: "Pagganap sa Iskedyul",
        description: "Sinusubaybayan ang mga proyektong isinasagawa laban sa naitalang target na petsa ng pagkumpleto."
      },
      schedulePerformance: {
        title: "Rate ng Lampas sa Target",
        overdueLabel: "lampas sa target",
        detail: "{overdueCount} sa {total} proyektong isinasagawa na may naitalang target na petsa ang lampas na sa deadline.",
        median: "Median na {days} araw na lampas sa target sa mga lampas-na-sa-deadline na proyekto.",
        medianUnavailable: "Walang lampas-sa-deadline na proyekto sa data set na ito.",
        unknown: "{count} proyektong isinasagawa ang walang naitalang target na petsa ng pagkumpleto.",
        unavailable: "Kasalukuyang Hindi Available",
        unavailableDetail: "Walang proyektong isinasagawa sa data set na ito ang may naitalang target na petsa ng pagkumpleto."
      }
    },
    about: {
      title: "Tungkol sa Amin",
      subtitle: "Pagtataguyod ng Tiwala sa Pamamagitan ng Transparency",
      description: "Ang INFRA Watch ay ang opisyal na transparency portal para sa mga proyekto ng imprastrakturang pang-agrikultura sa Pilipinas sa pamumuno ng Department of Agriculture – Bureau of Agricultural and Fisheries Engineering (DA-BAFE). Binibigyang-kapangyarihan namin ang mga mamamayan na magmonitor, mag-ulat, at makilahok sa mga pagpapaunlad ng imprastraktura sa kanilang mga komunidad.",
      mission: {
        title: "Ang Aming Misyon",
        desc: "Magbigay ng mahusay at epektibong serbisyong pang-inhenyeriya para sa pagpapaunlad at pagpapanatili ng imprastraktura ng agrikultura at pangisdaan na nagpapabuti sa koneksyon sa kanayunan, nagpapataas ng produksyon ng pagkain, at nag-aangat sa kalidad ng buhay ng mga magsasaka at mangingisdang Pilipino."
      },
      vision: {
        title: "Ang Aming Bisyon",
        desc: "Isang modernisadong sektor ng agrikultura at pangisdaan na sinusuportahan ng de-kalidad at matatag na imprastraktura, nag-uugnay sa bawat bukid sa merkado, tumitiyak na bawat komunidad ay may access sa irigasyon at mga pasilidad pagkatapos ng ani, at nagpapatibay sa pundasyon ng pambansang seguridad sa pagkain."
      },
      mandate: {
        title: "Mandato at mga Tungkulin",
        legalBasis: "Batas Republika Blg. 10601 (AFMech Law), Seksyon 24",
        desc: "Alinsunod sa Seksyon 24 ng Batas Republika Blg. 10601 (Agricultural and Fisheries Mechanization Law), ang Bureau of Agricultural and Fisheries Engineering (BAFE) ay ang regular na kawanihan ng Kagawaran ng Pagsasaka na inatasang mag-ugnay, mangasiwa, at magsubaybay sa pambansang pagpaplano, pagpapatupad, at regulasyon ng mga proyektong pang-inhenyeriya sa agrikultura at pangisdaan, mga farm-to-market road (FMR), at mga programa sa mekanisasyon sa buong bansa.",
        functionsTitle: "Mga Pangunahing Tungkulin",
        functions: [
          {
            title: "Pagpaplano at Pagsubaybay sa Imprastraktura",
            desc: "Mag-ugnay, mangasiwa, at magsubaybay sa pambansang pagpaplano at pagpapatupad ng inhenyeriyang pang-agrikultura at pangisdaan, mga network ng farm-to-market road (FMR), at mga proyektong imprastraktura."
          },
          {
            title: "Mga Programa sa Mekanisasyon",
            desc: "Tumulong sa pambansang pagpaplano, koordinasyon, at pagpapatupad ng mga komprehensibong programa sa mekanisasyon at modernisasyon ng agrikultura at pangisdaan."
          },
          {
            title: "Mga Plano, Disenyo, at Pamantayang Pang-inhenyeriya",
            desc: "Maghanda, magsuri, magpatunay, at magrekomenda ng mga plano, disenyo, at teknikal na espisipikasyon ayon sa Philippine Agricultural and Biosystems Engineering Standards (PABES)."
          },
          {
            title: "Pagsusuri, Akreditasyon, at Regulasyon",
            desc: "Magpatupad ng mga alituntunin sa akreditasyon ng mga testing center, magpatunay ng mga permit to operate (PTO), at magpatupad ng mga pamantayan sa kalidad at kaligtasan ng makinarya."
          },
          {
            title: "Pagpapalakas ng Kakayahan ng mga LGU",
            desc: "Palakasin at suportahan ang mga grupo ng Agricultural and Biosystems Engineering (ABE) sa mga Lokal na Pamahalaan (LGU) at DA Regional Field Offices para sa maayos na serbisyo sa komunidad."
          }
        ]
      },
      history: {
        eyebrow: "Kasaysayan ng Institusyon",
        agencyName: "Bureau of Agricultural and Fisheries Engineering",
        acronym: "BAFE",
        est: "2013",
        legal: "Batas Republika Blg. 10601 (AFMech Law)",
        intro: [
          "Ang Bureau of Agricultural and Fisheries Engineering (BAFE) ang pambansang sangay pang-inhenyeriya ng Kagawaran ng Pagsasaka, na responsable sa pagpapaunlad, koordinasyon, regulasyon, at pagpapatupad ng mga programa sa inhenyeriyang pang-agrikultura at pangisdaan, mekanisasyon, at imprastraktura.",
          "Opisyal na itinatag ang BAFE bilang regular na kawanihan ng Kagawaran sa pamamagitan ng Batas Republika Blg. 10601, ang Agricultural and Fisheries Mechanization (AFMech) Law of 2013. Gayunpaman, mas malalim ang ugat ng institusyong ito — hanggang sa mga istrukturang pang-inhenyeriya at mandato ng agrikultura na umiral na sa loob ng Kagawaran bago pa itatag ang kawanihan.",
          "Isang tuloy-tuloy na kasaysayan ang sinusundan ng BAFE: mula sa pundasyong itinakda ng naunang batas, tungo sa Central Agri-Fishery Engineering Division (CAFED), hanggang sa paglikha ng BAFE sa ilalim ng AFMech Law, ang institusyonalisasyon nito at ang pagpapalakas ng pambansang network ng Regional Agricultural Engineering Division (RAED), ang lumalawak nitong tungkulin sa mekanisasyon at regulasyon, at — sa kasalukuyan — ang pamumuno nito sa pambansang pagpapatupad ng farm-to-market road at ang paglulunsad ng mga plataporma para sa pagsubaybay ng publiko tulad nito."
        ],
        milestonesLabel: "Mga Mahalagang Pangyayari",
        milestones: [
          {
            year: "1997",
            title: "Agriculture and Fisheries Modernization Act",
            desc: "Nagbigay ang Batas Republika Blg. 8435, ang Agriculture and Fisheries Modernization Act of 1997 (AFMA), ng balangkas para sa modernisasyon ng agrikultura at pangisdaan sa Pilipinas at kinilala ang kahalagahan ng imprastraktura at suportang pang-inhenyeriya sa pagpapataas ng produktibidad at pagpapabuti ng serbisyo para sa mga magsasaka at mangingisda. Inatasan ng AFMA ang Kagawaran ng Pagsasaka at mga lokal na pamahalaan na palakasin ang kanilang suportang pang-inhenyeriya sa agrikultura, na naging mahalagang pundasyon para sa mga dedikadong istrukturang pang-inhenyeriya na sumunod."
          },
          {
            year: "1998",
            title: "Propesyonalisasyon ng Agricultural Engineering",
            desc: "Itinatag ng Batas Republika Blg. 8559, ang Philippine Agricultural Engineering Act of 1998, ang propesyonal at regulatoryong balangkas para sa agricultural engineering sa Pilipinas, saklaw ang makinaryang pang-agrikultura, irigasyon at pamamahala ng tubig, mga istrukturang pang-agrikultura, elektripikasyon ng bukid, sistema pagkatapos ng ani, at iba pang aplikasyong pang-inhenyeriya na may kaugnayan sa agrikultura at pangisdaan. Nagbigay ang batas ng teknikal at propesyonal na pundasyon para sa mga tungkuling pang-inhenyeriya na kalaunan ay pinagsama-sama sa ilalim ng BAFE."
          },
          {
            year: "Bago 2013",
            title: "Ang Central Agri-Fishery Engineering Division",
            desc: "Bago pa itatag ang BAFE bilang kawanihan, isinagawa ng Kagawaran ang mga sentral na tungkuling pang-inhenyeriya sa agrikultura at pangisdaan sa pamamagitan ng Central Agri-Fishery Engineering Division (CAFED) sa ilalim ng Project Development Service ng Kagawaran. Ang CAFED ang naging pangunahing yunit na tumitiyak na ang pagpaplano, konstruksyon, at paghahatid ng imprastrakturang agri-pangisdaan ay sumusunod sa teknikal at pinansyal na kahilingan ng Kagawaran — mahalagang bahagi ng kasaysayan ng institusyon ng BAFE, bagama't naiiba sa organisasyon mula sa kawanihang itinatag mamaya ng batas."
          },
          {
            year: "2013",
            title: "Ang Pagtatatag ng BAFE",
            desc: "Itinatag ng Batas Republika Blg. 10601, ang Agricultural and Fisheries Mechanization (AFMech) Law of 2013, ang BAFE bilang regular na kawanihan ng Kagawaran ng Pagsasaka, pinagsasama ang mga tungkuling pang-inhenyeriya sa agrikultura — mga plano at disenyong pang-inhenyeriya, teknikal na pamantayan, pagpapatupad ng regulasyon, pamamahala ng proyekto, mekanisasyon, at imprastraktura — sa isang pinalakas na pambansang balangkas. Pinalakas din ng batas ang mga Regional Agricultural Engineering Division (RAED) sa mga DA Regional Field Office, na sama-samang bumuo ng isang pambansa-rehiyonal na istrukturang pang-inhenyeriya."
          },
          {
            year: "2013–2017",
            title: "Pagbubuo ng Bagong Kawanihan",
            desc: "Kasunod ng RA 10601, isinagawa ng Kagawaran ang gawaing pang-organisasyon sa pagtatatag ng BAFE — pagbuo ng istruktura, tauhan, sistema, programa, at mekanismo ng koordinasyon nito sa mga Regional Field Office. Sa panahong ito ng transisyon, gumagampan na ang BAFE ng mga pambansang tungkulin sa mekanisasyon, kabilang ang mga konsultasyon sa buong Luzon noong 2015 para sa draft na National Agricultural and Fisheries Mechanization Program (NAFMP)."
          },
          {
            year: "2018",
            title: "Naging Ganap na Operasyonal ang BAFE",
            desc: "Sa Enero 2018, ang BAFE ay gumagana na bilang bagong-tatag na kawanihan, inilarawan ng DA Region 10 bilang sentral na sangay pang-inhenyeriya ng buong Kagawaran ng Pagsasaka at mga kaakibat nitong ahensya. Kasama sa mga tungkulin nito ang pag-uugnay, pangangasiwa, at pagsubaybay sa pambansang pagpaplano at pagpapatupad ng mga proyektong pang-inhenyeriya sa agrikultura at pangisdaan — kabilang ang farm-to-market road — at ang pagsuporta sa mga programa sa mekanisasyon sa pamamagitan ng mga RAED. Nagsimula rin ang kawanihan ng capability-building para sa mga tauhan ng RAED at pagbuo ng sistema ng regulasyon para sa makinaryang pang-agrikultura at pangisdaan."
          },
          {
            year: "2019",
            title: "Pagpapalakas ng Ugnayan ng BAFE–RAED",
            desc: "Opisyal na pinalakas ng Department Order No. 12, Series of 2019, ang ugnayang institusyonal sa pagitan ng BAFE at ng mga Regional Agricultural Engineering Division, kinikilala ang kani-kanilang responsibilidad sa inhenyeriyang pang-agrikultura at pangisdaan, mekanisasyon, at imprastraktura sa pambansa at rehiyonal na antas — nagpapasinkronisa ng mga plano, pamantayan, pagsubaybay, at pagpapatupad sa buong bansa."
          },
          {
            year: "2020–2022",
            title: "Paglawak ng Serbisyo sa Inhenyeriya at Mekanisasyon",
            desc: "Patuloy na lumawak ang mga tungkulin ng BAFE sa mga programa sa mekanisasyon ng agrikultura, regulasyon ng makinarya, pamantayang pang-inhenyeriya, pagpapaunlad ng imprastraktura, at teknikal na tulong — kabilang ang pagpaparehistro ng makinarya at kagamitang pang-agrikultura at pangisdaan at ang pagbibigay ng Certificate of Conformity, mga tungkuling bahagi pa rin ng kasalukuyang balangkas ng regulasyon ng Kagawaran."
          },
          {
            year: "2023",
            title: "Ang National Agricultural and Fisheries Mechanization Program",
            desc: "Gumampan ang BAFE ng sentral na tungkulin sa pagpapatupad ng National Agricultural and Fisheries Mechanization Program (NAFMP) 2023–2028, saklaw ang lokal na pagbuo at paggawa ng makinaryang pang-agrikultura, pananaliksik at pagpapaunlad, mga pamantayan at regulasyon, mga suportang serbisyo, pagpapaunlad ng institusyon, at pagpapaunlad ng human resource."
          },
          {
            year: "2024",
            title: "Pagpapalakas ng Pambansang Koordinasyon sa Inhenyeriya",
            desc: "Itinakda ng 2024 Joint Memorandum Circular hinggil sa functional complementation and delineation ang mga alituntunin sa koordinasyon ng BAFE, ng mga RAED, at ng mga opisina ng agricultural at biosystems engineering ng LGU sa pagpaplano, pagpapatupad, at pagsubaybay ng mga programang pang-inhenyeriya, imprastraktura, at mekanisasyon sa agrikultura at pangisdaan — pagpapalawig sa istrukturang pamamahala na nagsimula sa ilalim ng AFMech Law higit isang dekada na ang nakalipas."
          },
          {
            year: "2025",
            title: "Labindalawang Taon ng Pagsulong sa Agricultural and Fisheries Engineering",
            desc: "Noong Hunyo 2025, ipinagdiwang ng DA-BAFE ang ika-12 anibersaryo nito, binibigyang-diin ang patuloy nitong ambag sa mga disenyong pang-inhenyeriya, plano, at pamantayan para sa farm-to-market road, mga pasilidad sa irigasyon, mga pasilidad pagkatapos ng ani, at iba pang imprastrakturang pang-agrikultura."
          },
          {
            year: "2026",
            title: "Isang Bagong Panahon sa Imprastrakturang Pang-agrikultura",
            desc: "Itinalaga ng Kagawaran ng Pagsasaka ang BAFE na mamuno sa pambansang pagpapatupad ng mga proyektong farm-to-market road, na naglagay sa kawanihan sa sentro ng pambansang pagsisikap na palakasin ang kalidad, pagpapatupad, pagsubaybay, at koordinasyon ng mga proyektong daan pang-agrikultura. Binuo rin ng BAFE ang FMR Watch, isang plataporma ng pagsubaybay ng publiko para sa farm-to-market road na, hanggang Enero 2026, sinusubaybayan ang 4,810 proyektong ipinatupad mula 2021 hanggang 2025 — humigit-kumulang ₱76.52 bilyon sa investment at halos 2,400 kilometro ng kalsada sa buong bansa. Pinalalawig ng INFRA Watch ang parehong diskarte sa pagsubaybay ng publiko sa mas malawak na mga programang imprastraktura pang-agrikultura at pangisdaan ng BAFE."
          }
        ],
        closing: "Mula sa mga istrukturang pang-inhenyeriya ng agrikultura na umiral bago pa ito itatag, hanggang sa kasalukuyang tungkulin nito sa pamumuno ng pambansang pagpapatupad ng farm-to-market road at pagsubaybay ng imprastrakturang publiko, ang kasaysayan ng BAFE ay sumasalamin sa patuloy na pagsisikap ng Kagawaran ng Pagsasaka na ilagay ang inhenyeriya at teknolohiya sa sentro ng modernisasyon ng agrikultura."
      },
      values: [
        { title: "Transparency", desc: "Bukas na access sa data" },
        { title: "Pananagutan", desc: "Malinaw na pagsubaybay" },
        { title: "Pakikilahok", desc: "Pakikipag-ugnayan sa mamamayan" }
      ],
      featuresTitle: "Mga Pangunahing Tampok",
      features: [
        { title: "Halos Real-time na Pagsubaybay", desc: "Subaybayan ang mga kaganapan sa imprastraktura habang nangyayari." },
        { title: "Mekaniismo ng Pag-uulat", desc: "Direktang mag-ulat ng isyu at feedback sa gobyerno." },
        { title: "Mga Insight mula sa Data", desc: "Access sa analytics ng progreso at pondo." },
        { title: "Geotagged na Imprastraktura", desc: "Makita ang tiyak na lokasyon at ebidensya ng proyekto." }
      ]
    },
    reportIssue: {
      landing: {
        badge: "Pag-uulat ng Komunidad",
        title: "Mga Iniulat na Isyu",
        description: "Subaybayan at i-monitor ang mga isyung iniulat ng mga mamamayan sa mga proyektong pang-imprastraktura",
        cta: "Mag-ulat ng Bagong Isyu",
        searchPlaceholder: "Maghanap gamit ang paglalarawan o lokasyon...",
        loading: "Kinakarga ang mga isyu...",
        filters: {
          statusPlaceholder: "I-filter ayon sa katayuan",
          datePlaceholder: "I-filter ayon sa petsa",
          allStatuses: "Lahat ng Katayuan",
        },
        empty: {
          title: "Walang nahanap na isyu",
          description: "Subukang baguhin ang iyong mga filter o query sa paghahanap"
        },
        item: {
          priority: "{label} na Priority",
          location: "Lokasyon:",
          reported: "Iniulat",
          viewDetails: "Tingnan ang Detalye",
          by: "Ni: {name}"
        }
      },
      detail: {
        back: "Bumalik sa mga Isyu",
        title: "Mga Detalye ng Isyu",
        reportedOnFormatted: "Iniulat noong {date}",
        description: "Paglalarawan ng Isyu",
        location: "Lokasyon",
        labels: {
          region: "Rehiyon",
          province: "Probinsya",
          city: "Lungsod/Munisipyo",
          barangay: "Barangay",
          landmark: "Landmark"
        },
        evidence: {
          title: "Ebidensya",
          empty: "Wala pang na-upload na larawan o video.",
          remove: "Tanggalin ang ebidensya"
        },
        relatedProject: {
          label: "Kaugnay na Proyekto",
          id: "Proyekto #{id}",
          view: "Tingnan ang Proyekto"
        },
        timeline: {
          title: "Timeline",
          dateNoticed: "Petsang Napansin",
          reportedOn: "Iniulat Noong",
          lastUpdated: "Huling Update",
          resolvedOn: "Nalutas Noong"
        },
        reporter: {
          title: "Nag-ulat",
          anonymous: {
            title: "Hingdi Kilalang Pag-ulat",
            description: "Ang isyung ito ay iniulat nang hindi nagpakilala. Hindi available ang mga detalye ng nag-ulat."
          }
        },
        responses: {
          title: "Mga Opisyal na Tugon",
        },
        notFound: {
          title: "Hindi Nahanap ang Isyu",
          description: "Ang isyung hinahanap mo ay hindi umiiral o tinanggal na."
        }
      },
      form: {
        title: "Mag-ulat ng Isyu",
        subtitle: "Tulungan kaming mapabuti sa pamamagitan ng pag-uulat ng mga isyung napansin mo sa iyong komunidad",
        back: "Bumalik sa mga Iniulat na Isyu",
        sections: {
          project: {
            title: "Impormasyon ng Proyekto",
            description: "Opsyonal - May kaugnayan ba ang isyung ito sa isang partikular na proyekto?"
          },
          location: {
            title: "Impormasyon ng Lokasyon",
            description: "Kinakailangan - Saan matatagpuan ang isyu?"
          },
          details: {
            title: "Mga Detalye ng Isyu",
            description: "Kinakailangan - Ilarawan ang isyu na nais mong iulat"
          },
          evidence: {
            title: "Ebidensya",
            description: "Opsyonal - Ang mga larawan at video ay makakatulong sa amin na mas maktulad"
          },
          contact: {
            title: "Impormasyon sa Pakikipag-ugnay",
            description: "Kinakailangan - Paano ka namin makokontak para sa mga update?"
          },
          consent: {
            title: "Kasunduan at Pahintulot",
            description: "Mangyaring suriin at sumang-ayon upang magpatuloy"
          }
        },
        fields: {
          searchProject: "Maghanap gamit ang ID o pangalan ng proyekto...",
          searching: "Naghahanap...",
          noProjects: "Walang nahanap na proyekto",
          skipProject: "Hindi ko alam kung aling proyekto / Laktawan ang bahaging ito",
          skipDescription: "Maaari mo pa ring iulat ang isyu nang hindi ito iniuugnay sa isang partikular na proyekto",
          region: "Rehiyon",
          province: "Probinsya",
          city: "Lungsod/Munisipyo",
          barangay: "Barangay",
          landmark: "Kalye/Landmark",
          issueType: "Uri ng Isyu",
          issueDescription: "Sabihin sa amin ang higit pa",
          dateNoticed: "Petsang Napansin",
          dateNoticedOptional: "Petsang Napansin (Opsyonal)",
          contactNumber: "Numero ng Kontak",
          email: "Email Address",
          emailOptional: "Email Address (Opsyonal)",
          isAnonymous: "Mag-ulat nang hindi nagpapakilala (hindi magiging publiko ang iyong pangalan)",
          isAnonymousDescription: "Ang iyong pagkakakilanlan ay itatago mula sa pampublikong pananaw, ngunit maaari ka pa rin naming makontak para sa mga update",
          confirmAccuracy: "Kinukumpirma ko na ang impormasyong ibinigay ay tumpak sa abot ng aking kaalaman",
          agreeToTermsPrefix: "Sumasang-ayon ako sa ",
          andConnector: " at ",
          agreeToTerms: "Mga Tuntunin ng Serbisyo at Patakaran sa Privacy",
          charCount: "{count}/1000 (na) character"
        },
        placeholders: {
          region: "Pumili ng rehiyon",
          province: "Pumili ng probinsya",
          provinceFirst: "Pumili muna ng rehiyon",
          city: "Pumili ng lungsod/munisipyo",
          cityFirst: "Pumili muna ng probinsya",
          barangay: "Pumili ng barangay",
          barangayFirst: "Pumili muna ng lungsod",
          landmark: "hal., Barangay Hall, Pangunahing Kalye",
          issueType: "Pumili ng uri ng isyu",
          issueDescription: "Mangyaring magbigay ng detalyadong paglalarawan ng isyu...",
          contactNumber: "hal., 09123456789",
          email: "iyong.email@halimbawa.com",
          description: "Mangyaring magbigay ng detalyadong paglalarawan ng isyu...",
        },
        evidence: {
          uploadLabel: "I-upload ang Ebidensya ({current}/{max})",
          dropzone: "I-click upang mag-upload ng mga larawan o video",
          limit: "Mga Larawan (PNG, JPG) o Video (MP4, MOV) hanggang {size}MB bawat isa (Max {max} na file)",
          maxReached: "Naabot na ang maximum na bilang ng file"
        },
        validation: {
          required: "Ang {field} ay kinakailangan",
          descriptionMin: "Ang paglalarawan ay dapat na hindi bababa sa 20 character",
          descriptionMax: "Ang paglalarawan ay dapat na hindi hihigit sa 1000 character",
          contactMin: "Ang numero ng kontak ay dapat na hindi bababa sa 10 digit",
          contactFormat: "Invalid na format ng numero ng kontak",
          emailFormat: "Invalid na email address",
          confirmAccuracy: "Dapat mong kumpirmahin ang kawastuhan ng impormasyon",
          agreeToTerms: "Dapat kang sumang-ayon sa mga tuntunin at patakaran sa privacy"
        },
        messages: {
          successTitle: "Matagumpay na Naisumite ang Pag-ulat!",
          successDescription: "Salamat sa pag-uulat ng isyung ito. Susuriin namin ito at gagawa ng naaangkop na aksyon.",
          viewReports: "Tingnan ang Aking mga Ulat",
          submitError: "Nabigong isumite ang isyu",
          fixErrors: "Mangyaring ayusin ang mga error sa form",
          uploadSuccess: "Matagumpay na nai-upload ang {count} (na) file",
          uploadFailed: "Nabigong i-upload ang {name}",
          maxFilesError: "Maximum na {max} na file ang pinapayagan. Maaari ka pang magdagdag ng {remaining}.",
          invalidType: "Ang file na \"{name}\" ay hindi isang larawan o video"
        },
        actions: {
          submit: "Isumite ang Ulat",
          submitting: "Isinusumite...",
          cancel: "Kanselahin"
        }
      },
      types: {
        infrastructure: "Mga Isyu sa Imprastraktura",
        safety: "Alalahanin sa Kaligtasan",
        environmental: "Mga Isyung Pangkapaligiran",
        administrative: "Alalahaning Administratibo",
        damage: "Sira sa Daan / Lubak",
        stopped: "Konstruksyon Huminto / Naantala",
        flooding: "Pagbaha / Problema sa Drainage",
        blocked: "Naka-block na Daan / Mga Materyales",
        quality: "Mababang Kalidad ng Konstruksyon",
        other: "Iba pa"
      },
      actions: {
        submit: "Isumite ang Ulat",
        cancel: "Kanselahin"
      },
      wizard: {
        back: "Bumalik",
        next: "Susunod",
        steps: {
          awareness: "Simula",
          awarenessDesc: "Sabihin sa amin tungkol sa proyekto",
          project: "Proyekto",
          projectDesc: "Hanapin ang proyekto",
          location: "Lokasyon",
          locationDesc: "Saan ang isyu?",
          suggestions: "Tugma",
          suggestionsDesc: "Hanapin ang mga tugmang proyekto",
          details: "Detalye",
          detailsDesc: "Ilarawan ang isyu",
          contact: "Isumite",
          contactDesc: "Impormasyon sa kontak at pahintulot",
        },
        awareness: {
          title: "May kaugnayan ba ang isyung ito sa isang partikular na proyekto?",
          subtitle: "Makakatulong ito upang mas mabilis na matugunan ang iyong ulat",
          yesTitle: "Oo, alam ko ang proyekto",
          yesDescription: "Maaari akong maghanap ng proyekto gamit ang pangalan o code",
          searchProject: "Maghanap ng proyekto",
          noTitle: "Hindi, hindi ako sigurado",
          noDescription: "Ilalarawan ko ang lokasyon at maghahanap kami ng mga kalapit na proyekto",
          selectLocation: "Pumili ng lokasyon",
        },
        search: {
          title: "Hanapin ang Proyekto",
          subtitle: "Maghanap gamit ang pangalan ng proyekto, code, o ID",
          projectDetails: "Mga Detalye ng Proyekto",
          location: "Lokasyon",
          agency: "Ahensya",
          budget: "Badyet",
          status: "Katayuan",
          leaveFeedback: "Mag-iwan ng Feedback",
          visitFeedback: "Pindutin dito! Maaari mong bisitahin ang proyektong ito at mag-iwan ng feedback sa halip",
          selectProject: "Piliin ang Proyektong Ito",
          reportIssue: "Mag-ulat ng Isyu",
        },
        suggestions: {
          title: "Mga Proyekto sa Iyong Lugar",
          subtitle: "Nakakita kami ng mga proyekto malapit sa iyong lokasyon. Pumili kung may katugma.",
          searching: "Naghahanap ng mga proyekto sa iyong lugar...",
          info: "Ang pagpili ng proyekto ay makakatulong sa amin na mas mabilis na tumugon. Kung walang katugma, maaari mong laktawan.",
          skip: "Wala sa mga ito (laktawan)",
          noResults: "Walang nahanap na mga proyekto sa lugar na ito",
          noResultsHint: "Maaari kang magpatuloy kahit walang napiling proyekto.",
        },
      }
    },
    contact: {
      hero: {
        subtitle: "Mag-atubiling makipag-ugnay",
        title: "Kontakin ang BAFE",
        description: "Pinahahalagahan namin ang inyong feedback at mga katanungan. Makipag-ugnay sa Bureau of Agricultural and Fisheries Engineering para sa suporta, pakikipagtulungan, o mga update sa proyekto.",
      },
      cards: {
        headOffice: { title: "Pangunahing Tanggapan" },
        hotline: { title: "Hotline" },
        email: { title: "Email" },
      },
      form: {
        title: "Magpadala sa amin ng mensahe",
        labels: {
          name: "Pangalan",
          email: "Email",
          subject: "Paksa",
          message: "Mensahe",
        },
        placeholders: {
          name: "Inyong pangalan",
          email: "ikaw@halimbawa.com",
          subject: "Paano kami makakatulong?",
          message: "Ibahagi ang inyong mga katanungan, feedback, o kahilingan.",
        },
        submit: "Ipadala ang mensahe",
        sending: "Ipinapadala...",
        responseInfo: "Tugon sa loob ng isang araw ng trabaho",
        success: {
          title: "Naipadala na ang Mensahe!",
          desc: "Salamat sa pakikipag-ugnay. Babalik kami sa iyo sa loob ng isang araw ng trabaho.",
          cta: "Magpadala ng Iba Pang Mensahe",
        },
      },
      office: {
        title: "Bisitahin ang aming opisina",
      },
    },
    projects: {
      hero: {
        subtitle: "Transparensiya para sa Pag-unlad ng Kanayunan",
        title: "INFRA WATCH",
        description: "Subaybayan at i-validate ang mga proyekto ng imprastrakturang pang-agrikultura sa buong Pilipinas",
      },
      search: {
        title: "Maghanap ng proyekto",
        description: "Mabilis na maghanap ng proyekto sa pamamagitan ng pangalan o code.",
        placeholder: "Maghanap ng pangalan o code ng proyekto",
        clear: "Linisin ang paghahanap",
      },
      filters: {
        label: "Mga Filter",
        clear: "Linisin",
        region: "Lahat ng Rehiyon",
        province: "Lahat ng Probinsya",
        city: "Lahat ng Lungsod/Munisipyo",
        barangay: "Lahat ng Barangay",
        status: "Lahat ng Status",
      },
      stats: {
        loading: "Naglo-load ng mga Proyekto...",
        error: "Error sa pag-load ng mga proyekto",
        found: "{total} Proyektong Nahanap",
        none: "Walang nahanap na proyekto",
        adjust: "Subukang i-adjust ang iyong mga filter o paghahanap",
      },
      export: {
        title: "I-export ang mga Proyekto",
        description: "I-download ang buong listahan ng mga proyektong tumutugma sa iyong mga filter.",
        csv: "I-export bilang CSV",
        pdf: "I-export bilang PDF",
        generating: "Bino-buo ang export file...",
      },
      view: {
        label: "Pumili ng view:",
        grid: "Grid View",
        table: "Table View",
        map: "Maps View",
      },
      pagination: {
        showing: "Ipinapakita ang {start} hanggang {end} ng {total} na resulta",
        perPage: "Bawat pahina",
        prev: "Nakaraan",
        next: "Susunod",
        page: "Pahina {current} ng {total}",
      },
    },
    projectDetail: {
      backToProjects: "Bumalik sa mga Proyekto",
      monitoringFallback: "Sinusubaybayan ang konstruksyon at pag-unlad ng {name} sa {location}.",
      title: "Detalye ng Proyekto",
      overview: {
        title: "Pangkalahatang-ideya ng Proyekto",
        highlights: "Mga Tampok ng Proyekto",
        projectType: "Uri ng Proyekto",
        projectTypeTooltip: "Standardisadong kategorya ng imprastraktura para sa proyektong ito",
        projectCode: "Code ng Proyekto",
        projectCodeTooltip: "Natatanging identification code para sa proyekto",
        location: "Lokasyon ng Proyekto",
        locationTooltip: "Pisikal na lokasyon kung saan matatagpuan ang proyekto",
        implementingAgency: "Ahensyang Nagpapatupad",
        implementingAgencyTooltip: "Organisasyong responsable sa pagpapatupad ng proyekto",
        coordinates: "Latitude at Longitude ng Proyekto",
        coordinatesTooltip: "Geographic coordinates ng lugar ng proyekto",
        contractor: "Kontratista",
        contractorTooltip: "Kompanya na binigyan ng kontrata para sa proyekto",
        budget: "Kabuuang Badyet",
        budgetTooltip: "Kabuuang pondong nakalaan para sa proyekto",
        abc: "Bidded Amount",
        abcTooltip: "Kabuuang halaga ng bidded amount para sa proseso ng procurement",
        startDate: "Petsa ng Pagsisimula",
        startDateTooltip: "Opisyal na petsa ng pagsisimula ng proyekto",
        targetCompletion: "Target na Pagkumpleto",
        targetCompletionTooltip: "Inaasahang petsa kung kailan dapat matapos ang proyekto",
        actualCompletion: "Aktwal na Petsa ng Pagkumpleto",
        actualCompletionTooltip: "Ang petsa kung kailan opisyal na natapos ang proyekto",
        turnOverDate: "Petsa ng Turnover",
        turnOverDateTooltip: "Petsa kung kailan opisyal na ibinigay ang proyekto sa benepisyaryo",
        duration: "Tagal",
        durationTooltip: "Kabuuang oras na lumipas para sa konstruksyon ng proyekto",
        contractDuration: "Tagal ng Kontrata",
        contractDurationTooltip: "Tinukoy na yugto ng panahon sa kontrata ng proyekto",
        calendarDays: "{days} calendar days",
        targetLength: "Target na Haba",
        targetLengthTooltip: "Iminungkahing kabuuang distansya o haba ng proyekto",
        postGeotaggedLength: "Aktwal na Haba",
        postGeotaggedLengthTooltip: "Ang aktwal na haba ng kalsada na napatunayan sa pamamagitan ng geotagging",
        roadClass: "Uri ng Daan",
        roadClassTooltip: "Klasipikasyon ng daan (hal. Barangay, Municipal)",
        roadType: "Klase ng Daan",
        roadTypeTooltip: "Uri ng materyales na ginamit sa daan (hal. Semento, Aspalto)",
        farmOperation: "Operasyong Pansakahan",
        farmOperationTooltip: "Kategorya ng gawaing pang-agrikultura na sinusuportahan ng pasilidad na ito (hal. Produksyon, Post Harvest, Imbakan)",
        commodities: "Mgaproduktong Sinusuportahan",
        commoditiesTooltip: "Mga produktong agrikultural na makikinabang sa proyektong ito",
        bannerProgram: "Banner Program",
        bannerProgramTooltip: "Ang pangunahing programa ng gobyerno na nagpopondo sa proyekto",
        yearFunded: "Taon na Pinondohan",
        yearFundedTooltip: "Ang taon ng pananalapi kung kailan inilaan ang badyet para sa proyektong ito",
        status: "Katayuan",
        statusTooltip: "Kasalukuyang yugto ng pag-unlad ng proyekto",
        description: "Paglalarawan ng Proyekto",
        descriptionTooltip: "Karagdagdagang detalye tungkol sa mga layunin at background ng proyekto",
        notAvailable: "Hindi available",
        notCompleted: "Hindi pa tapos",
        scanToView: "I-scan para makita ang proyekto",
        downloadQR: "I-download ang QR",
      },
      sidebar: {
        details: "Mga Detalye ng Proyekto",
        articles: "Mga Artikulo at Publikasyon",
        photos: "Mga Larawan",
        videos: "Mga Video",
        documents: "Mga Dokumento",
        pow: "Program of Works",
        procurement: "Procurement",
        feedback: "Feedback",
      },
      feedback: {
        title: "Feedback ng Komunidad",
        share: "Ibahagi ang Iyong Feedback",
        edit: "I-edit ang Feedback",
        shareDesc: "Tumulong na mapabuti ang proyektong ito sa pamamagitan ng pagbabahagi ng iyong mga kaisipan at obserbasyon.",
        editDesc: "I-update ang iyong feedback tungkol sa proyektong ito.",
        signIn: "Mag-sign In para Magbahagi ng Feedback",
        deleteTitle: "I-delete ang Feedback",
        deleteDesc: "Sigurado ka bang gusto mong i-delete ang feedback na ito? Ang aksyong ito ay hindi na mababawi.",
        confirmDelete: "I-delete",
        deleting: "Dini-delete...",
        cancel: "Kanselahin",
      },
      tabs: {
        videos: {
          title: "Mga Video ng Proyekto",
          empty: "Ang mga video ay ipapakita rito kapag na-upload na.",
        },
        photos: {
          title: "Mga Larawan ng Proyekto",
          geotagged: "Mga Geotagged na Larawan ({count})",
          empty: "Wala Pang Larawan",
          emptyDesc: "Ang mga geotagged na larawan ay lalabas dito kapag na-upload na.",
          grid: "Grid",
          map: "Mga Mapa",
          loadingMap: "Naglo-load ng mapa...",
          preparingSatellite: "Inihahanda ang satellite view",
        },
        articles: {
          title: "Mga Artikulo ng Proyekto",
          empty: "Wala Pang Artikulo",
          emptyDesc: "Ang mga artikulo at publikasyon ay lalabas dito kapag nailathala na.",
        },
        documents: {
          title: "Mga Dokumento ng Proyekto",
          empty: "Wala Pang Dokumento",
          emptyDesc: "Ang mga dokumento ng proyekto ay ililista rito kapag available na.",
          item: "Dokumento {index}",
        },
        pow: {
          title: "Program of Works",
          empty: "Walang Data ng POW",
          emptyDesc: "Ang mga detalye ng Program of Works ay lalabas dito kapag available na.",
          quantity: "Kabuuang Dami",
          cost: "Halaga ng Kontrata",
          date: "Petsa",
          targetProgress: "Target na Pag-unlad",
          actualProgress: "Aktwal na Pag-unlad",
          viewAttachment: "Tingnan ang Attachment",
          sCurveTitle: "Pisikal na Pag-unlad (S-Curve)",
          insufficientData: "Kulang ang data para sa S-curve visualization",
        },
        procurement: {
          title: "Procurement",
          empty: "Walang Data ng Procurement",
          emptyDesc: "Ang mga rekord ng procurement ay ililista rito kapag available na.",
          stage: "Yugto ng Procurement",
          date: "Petsa",
          status: "Katayuan",
          remarks: "Mga Tala",
          targetDate: "Target na Petsa",
          actualDate: "Aktwal na Petsa",
          factors: "Mga Salik na Nakaaapekto sa Pag-unlad",
          measures: "Mga Hakbang na Isinagawa",
          item: "Milestone {index}",
          milestone: "Milestone",
        },
      },
      common: {
        noContent: "Walang available na nilalaman",
      },
    },
    live: {
      title: "Mga Live na Broadcast",
      subtitle: "Manatiling updated sa mga real-time na ulat at mga highlight ng proyekto mula sa buong bansa.",
      noBroadcasts: "Walang aktibong broadcast",
      noBroadcastsDesc: "Sa kasalukuyan ay walang mga live o recorded na broadcast. Mangyari lamang na bumalik mamaya.",
      moreBroadcasts: "Higit pang mga Broadcast",
      videosCount: "{count} na video",
      liveNow: "Live Ngayon",
      recorded: "Recorded",
      broadcastingLive: "Kasalukuyang Live",
      searchPlaceholder: "Maghanap sa pamamagitan ng pamagat o paglalarawan...",
      noResults: "Walang nahanap na resulta para sa \"{search}\"",
      clearSearch: "I-clear ang paghahanap",
      playingNow: "Pinapatugtog Ngayon",
    },
    footer: {
      subtitle: "Transparency Portal ng DA-BAFE",
      links: {
        quick: {
          title: "Mabilis na Links",
          projects: "Mga Proyekto",
      checklists: "Mga Checklist",
          statistics: "Istatistika",
          faq: "FAQ",
          contact: "Kontak",
        },
        gov: {
          title: "Gobyerno",
        },
      },
      rights: "© 2026 Bureau of Agricultural and Fisheries Engineering. Nakalaan ang lahat ng karapatan.",
      privacy: "Patakaran sa Privacy",
      deletion: "Pagbura ng Data",
      terms: "Mga Tuntunin ng Serbisyo",
      seal: {
        title: "Republika ng Pilipinas",
        desc: "Ang lahat ng nilalaman ay nasa public domain maliban kung iba ang nakasaad.",
      },
      govph: {
        title: "Tungkol sa GOVPH",
        desc: "Alamin ang higit pa tungkol sa gobyerno ng Pilipinas, ang istraktura nito, kung paano gumagana ang gobyerno at ang mga tao sa likod nito.",
      },
    },
  },
} as const;

export type TranslationKeys = typeof translations.en;
