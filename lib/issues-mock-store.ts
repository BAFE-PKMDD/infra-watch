"use client";

export interface IssueComment {
  id: string;
  author: string;
  role: string;
  text: string;
  date: string;
}

export interface IssueReport {
  id: string;
  projectName: string;
  projectId: string;
  category: string;
  description: string;
  status: "pending" | "in-progress" | "resolved" | "suspended";
  date: string;
  reporter: string;
  // Expanded fields mirroring FMR Watch
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  reporterPhone?: string;
  reporterEmail?: string;
  isAnonymous: boolean;
  dateNoticed: string;
  photoUrl?: string; // stores base64 uploaded image or placeholder
  comments: IssueComment[];
}

const initialIssues: IssueReport[] = [
  {
    id: "TKT-2026-981",
    projectName: "Dingle Diversion Dam Rehabilitation",
    projectId: "PRJ-INS-2023-009",
    category: "Water Leak / Flooding",
    description: "Main diversion gates leaking water under high pressure, causing minor erosion along the side slopes.",
    status: "in-progress",
    date: "June 20, 2026",
    reporter: "Juan D. (Verified)",
    region: "Western Visayas (Region VI)",
    province: "Iloilo",
    city: "Dingle",
    barangay: "San Matias",
    streetLandmark: "Beside the access road near the reservoir entrance",
    reporterPhone: "+63 917 123 4567",
    reporterEmail: "juan.d@gmail.com",
    isAnonymous: false,
    dateNoticed: "June 19, 2026",
    comments: [
      {
        id: "1",
        author: "Engr. Rafael Santos",
        role: "BAFE Inspector",
        text: "Initial inspection scheduled. The local coordinator has been notified to inspect the physical site.",
        date: "June 21, 2026"
      },
      {
        id: "2",
        author: "Engr. Rafael Santos",
        role: "BAFE Inspector",
        text: "Repair crew dispatched with sealing gaskets. Onsite inspection confirms erosion is minor.",
        date: "June 22, 2026"
      }
    ]
  },
  {
    id: "TKT-2026-712",
    projectName: "Post-Harvest Mechanical Grain Dryer Installation",
    projectId: "PRJ-AMSS-2024-042",
    category: "Equipment Damage",
    description: "Mechanical dryer gear grinding noise occurred, system was shut down to prevent motor burn.",
    status: "resolved",
    date: "June 18, 2026",
    reporter: "Anonymous",
    region: "Central Visayas (Region VII)",
    province: "Cebu",
    city: "Balamban",
    barangay: "Nangka",
    streetLandmark: "Main building, processing floor 2",
    isAnonymous: true,
    dateNoticed: "June 18, 2026",
    comments: [
      {
        id: "1",
        author: "BAFE Support",
        role: "Coordinator",
        text: "Dryer shut down confirmed. Inspector deployed to diagnose gear alignment.",
        date: "June 19, 2026"
      },
      {
        id: "2",
        author: "Engr. Rafael Santos",
        role: "BAFE Inspector",
        text: "Gears realigned and lubricated. System was tested for 2 hours with no noise. Resolved.",
        date: "June 20, 2026"
      }
    ]
  },
  {
    id: "TKT-2026-443",
    projectName: "Concrete Drainage and Irrigation Canal",
    projectId: "PRJ-INS-2024-108",
    category: "Equipment Damage",
    description: "Concrete canal lining shows cracking along sector 4, resulting in water seepage into nearby agricultural fields.",
    status: "pending",
    date: "June 22, 2026",
    reporter: "Pedro S. (Verified)",
    region: "Eastern Visayas (Region VIII)",
    province: "Samar",
    city: "Basey",
    barangay: "Simeon",
    streetLandmark: "Irrigation canal sector 4, near the rice fields boundary",
    reporterPhone: "+63 928 765 4321",
    isAnonymous: false,
    dateNoticed: "June 22, 2026",
    comments: []
  }
];

export function getMockIssues(): IssueReport[] {
  if (typeof window === "undefined") return initialIssues;
  const stored = localStorage.getItem("infra_watch_issues");
  if (!stored) {
    localStorage.setItem("infra_watch_issues", JSON.stringify(initialIssues));
    return initialIssues;
  }
  try {
    return JSON.parse(stored) as IssueReport[];
  } catch {
    return initialIssues;
  }
}

export function getMockIssueDetails(id: string): IssueReport | undefined {
  const issues = getMockIssues();
  return issues.find((issue) => issue.id === id);
}

export function addMockIssue(issue: Omit<IssueReport, "id" | "date" | "status" | "comments">): IssueReport {
  const ticketId = `TKT-2026-${Math.floor(100 + Math.random() * 900)}`;
  const newReport: IssueReport = {
    ...issue,
    id: ticketId,
    status: "pending",
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    comments: []
  };

  if (typeof window !== "undefined") {
    const issues = getMockIssues();
    const updated = [newReport, ...issues];
    localStorage.setItem("infra_watch_issues", JSON.stringify(updated));
  }
  
  return newReport;
}

export function addCommentToMockIssue(id: string, text: string, author: string, role: string): IssueComment | null {
  if (typeof window === "undefined") return null;
  const issues = getMockIssues();
  const issueIndex = issues.findIndex((i) => i.id === id);
  if (issueIndex === -1) return null;

  const issue = issues[issueIndex];
  const newComment: IssueComment = {
    id: String((issue.comments?.length || 0) + 1),
    author,
    role,
    text,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  };

  issue.comments = [...(issue.comments || []), newComment];
  issues[issueIndex] = issue;
  localStorage.setItem("infra_watch_issues", JSON.stringify(issues));

  return newComment;
}
