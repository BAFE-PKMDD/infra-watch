"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import type { ProjectDetail } from "@/types";

// Rich Mock Database containing detailed metadata, geotags, S-Curves, and procurement logs
const mockProjectsDetails = {
  "PRJ-INS-2023-009": {
    id: "PRJ-INS-2023-009",
    name: "Dingle Diversion Dam Rehabilitation",
    program: "ins",
    sector: "Irrigation Systems",
    province: "Leyte",
    municipality: "Abuyog",
    barangay: "Dingle",
    budget: 14000000,
    physicalProgress: 100,
    financialProgress: 95,
    status: "completed",
    contractor: "G Builders",
    year: "2023",
    calendarDays: 120,
    agency: "BAFE-INS",
    lat: 10.645,
    lng: 125.012,
    metadata: {
      physicalProgress: 100,
      financialProgress: 95,
      calendarDays: 120,
      powRelation: [
        { id: "pow-1", date: "2023-01-10", target: "15", actual: "15", total_quantity: "100", contract_cost: "2000000" },
        { id: "pow-2", date: "2023-02-15", target: "30", actual: "32", total_quantity: "100", contract_cost: "4000000" },
        { id: "pow-3", date: "2023-03-20", target: "35", actual: "33", total_quantity: "100", contract_cost: "5000000" },
        { id: "pow-4", date: "2023-04-30", target: "20", actual: "20", total_quantity: "100", contract_cost: "3000000" },
      ],
      procurementRelation: [
        { id: "pr-1", milestone: "Pre-Bid Conference Conducted", target_date: "2022-10-15", actual_date: "2022-10-14", remarks: "All bidders present, terms aligned." },
        { id: "pr-2", milestone: "Bid Opening Conducted", target_date: "2022-11-01", actual_date: "2022-11-01", remarks: "Choice made on lowest complying bid." },
        { id: "pr-3", milestone: "Notice of Award Approved", target_date: "2022-11-20", actual_date: "2022-11-22", remarks: "Approved by regional BAFE committee." },
      ],
      geotags: [
        { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80", location: "Diversion Dam Intake Sluice Gates" },
        { url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80", location: "Downstream Irrigation Line Channel" }
      ]
    },
    feedbacks: [
      { id: "fb-1", rating: 5, comment: "The rehabilitation of the diversion dam has restored water flow to over 150 hectares of rice fields. Excellent work.", createdAt: "2026-05-10T10:00:00Z", status: "approved", user: { name: "Elias Torres", role: "Farmer Association President" }, comments: [] }
    ]
  },
  "PRJ-AMSS-2024-042": {
    id: "PRJ-AMSS-2024-042",
    name: "Post-Harvest Mechanical Grain Dryer Installation",
    program: "amss",
    sector: "Post-Harvest Facilities",
    province: "Cebu",
    municipality: "Balamban",
    barangay: "Lias",
    budget: 1800000,
    physicalProgress: 75,
    financialProgress: 60,
    status: "ongoing",
    contractor: "Visayas Agri-Tech",
    year: "2024",
    calendarDays: 90,
    agency: "BAFE-AMEFIP",
    lat: 10.495,
    lng: 123.722,
    metadata: {
      physicalProgress: 75,
      financialProgress: 60,
      calendarDays: 90,
      powRelation: [
        { id: "pow-1", date: "2024-05-10", target: "30", actual: "30" },
        { id: "pow-2", date: "2024-06-15", target: "25", actual: "27" },
        { id: "pow-3", date: "2024-07-30", target: "20", actual: "18" },
      ],
      procurementRelation: [
        { id: "pr-1", milestone: "Pre-Bid Conference Conducted", target_date: "2024-03-01", actual_date: "2024-03-01" },
        { id: "pr-2", milestone: "Bid Opening Conducted", target_date: "2024-03-20", actual_date: "2024-03-20" },
        { id: "pr-3", milestone: "Notice of Award Approved", target_date: "2024-04-10", actual_date: "2024-04-12" },
      ],
      geotags: [
        { url: "https://images.unsplash.com/photo-1581094288338-2314dddb7eed?auto=format&fit=crop&w=800&q=80", location: "Foundation Pad Frame Structure" }
      ]
    },
    feedbacks: [
      { id: "fb-1", rating: 4, comment: "Foundation is sturdy and steel structure is up. Looking forward to using the dryer this harvest season.", createdAt: "2026-06-15T14:30:00Z", status: "approved", user: { name: "Maria Clara", role: "Local Cooperative Member" }, comments: [] }
    ]
  },
  "PRJ-INS-2025-115": {
    id: "PRJ-INS-2025-115",
    name: "Solar Powered Irrigation Pump System",
    program: "ins",
    sector: "Irrigation Systems",
    province: "Leyte",
    municipality: "Abuyog",
    barangay: "Dingle",
    budget: 4200000,
    physicalProgress: 85,
    financialProgress: 70,
    status: "ongoing",
    contractor: "Cebu Agri-Builders Inc.",
    year: "2025",
    calendarDays: 180,
    agency: "BAFE-INS",
    lat: 10.650,
    lng: 125.010,
    metadata: {
      physicalProgress: 85,
      financialProgress: 70,
      calendarDays: 180,
      powRelation: [
        { id: "pow-1", date: "2025-01-15", target: "25", actual: "25" },
        { id: "pow-2", date: "2025-02-28", target: "30", actual: "32" },
        { id: "pow-3", date: "2025-04-30", target: "20", actual: "18" },
        { id: "pow-4", date: "2025-05-15", target: "10", actual: "10" },
      ],
      procurementRelation: [
        { id: "pr-1", milestone: "Pre-Bid Conference Conducted", target_date: "2024-10-10", actual_date: "2024-10-10" },
        { id: "pr-2", milestone: "Bid Opening Conducted", target_date: "2024-11-05", actual_date: "2024-11-05" },
        { id: "pr-3", milestone: "Notice of Award Approved", target_date: "2024-11-28", actual_date: "2024-11-28" },
      ],
      geotags: [
        { url: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=800&q=80", location: "Solar Array Mounting Frames" }
      ]
    },
    feedbacks: [
      { id: "fb-1", rating: 5, comment: "The solar panels are aligned nicely, and we tested the pump successfully. It will save our fuel costs.", createdAt: "2026-06-20T10:00:00Z", status: "approved", user: { name: "Juan Dela Cruz", role: "Cooperative Treasurer" }, comments: [] }
    ]
  },
  "PRJ-AMSS-2026-002": {
    id: "PRJ-AMSS-2026-002",
    name: "Agricultural Warehouse and Storage Facility",
    program: "amss",
    sector: "Storage Infrastructures",
    province: "Samar",
    municipality: "Basey",
    barangay: "Simeon",
    budget: 5200000,
    physicalProgress: 0,
    financialProgress: 0,
    status: "planned",
    contractor: "Eastern Builders Corp.",
    year: "2026",
    calendarDays: 150,
    agency: "BAFE-AMEFIP",
    lat: 11.282,
    lng: 125.068,
    metadata: {
      physicalProgress: 0,
      financialProgress: 0,
      calendarDays: 150,
      powRelation: [],
      procurementRelation: [
        { id: "pr-1", milestone: "Pre-Bid Conference Conducted", target_date: "2026-04-10", actual_date: "2026-04-12" },
      ],
      geotags: []
    },
    feedbacks: []
  },
  "PRJ-INS-2024-108": {
    id: "PRJ-INS-2024-108",
    name: "Concrete Drainage and Irrigation Canal",
    program: "ins",
    sector: "Irrigation Networks",
    province: "Samar",
    municipality: "Basey",
    barangay: "Lunas",
    budget: 3100000,
    physicalProgress: 40,
    financialProgress: 30,
    status: "suspended",
    contractor: "Samar Drainage Co.",
    year: "2024",
    calendarDays: 120,
    agency: "BAFE-INS",
    lat: 11.275,
    lng: 125.070,
    metadata: {
      physicalProgress: 40,
      financialProgress: 30,
      calendarDays: 120,
      powRelation: [
        { id: "pow-1", date: "2024-03-10", target: "20", actual: "20" },
        { id: "pow-2", date: "2024-04-25", target: "20", actual: "20" },
      ],
      procurementRelation: [
        { id: "pr-1", milestone: "Pre-Bid Conference Conducted", target_date: "2024-01-10", actual_date: "2024-01-10" },
        { id: "pr-2", milestone: "Bid Opening Conducted", target_date: "2024-01-25", actual_date: "2024-01-25" },
        { id: "pr-3", milestone: "Notice of Award Approved", target_date: "2024-02-10", actual_date: "2024-02-12" },
      ],
      geotags: [
        { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80", location: "Excavation Site Clearing Work" }
      ]
    },
    feedbacks: [
      { id: "fb-1", rating: 2, comment: "Construction stopped 3 weeks ago due to material delays. Water is starting to pool and breeds mosquitoes.", createdAt: "2026-06-09T10:00:00Z", status: "approved", user: { name: "Kardo Dalisay", role: "Resident Farmer" }, comments: [] }
    ]
  }
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const projectRaw = mockProjectsDetails[id as keyof typeof mockProjectsDetails];

  if (!projectRaw) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-extrabold mb-4 dark:text-white">Project Not Found</h2>
        <p className="text-slate-500 text-sm mb-6 dark:text-slate-400">The requested infrastructure project code ({id}) could not be found.</p>
        <Link 
          href="/projects" 
          className={cn(buttonVariants({ variant: "default" }), "bg-primary text-white hover:bg-primary/90 flex items-center justify-center")}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Catalog
        </Link>
      </div>
    );
  }

  // Transform raw mock project data to respect ProjectDetail TS schema
  const project: ProjectDetail = {
    id: projectRaw.id,
    name: projectRaw.name,
    code: projectRaw.id,
    location: `Brgy. ${projectRaw.barangay}, ${projectRaw.municipality}, ${projectRaw.province}`,
    implementingAgency: projectRaw.agency,
    budget: projectRaw.budget,
    startDate: projectRaw.year,
    duration: `${projectRaw.calendarDays} Days`,
    status: projectRaw.status,
    stage: projectRaw.status.toUpperCase(),
    yearFunded: projectRaw.year,
    contractor: projectRaw.contractor,
    scope: projectRaw.sector,
    projectLength: "N/A",
    description: `Monitoring physical milestones, contract procurement pipelines, S-Curve progress metrics, and public reviews for the ${projectRaw.name} under BAFE.`,
    updates: [],
    completionDate: `${projectRaw.calendarDays} Days`,
    feedbackCount: projectRaw.feedbacks.length,
    metadata: {
      ...projectRaw.metadata,
      coordinates: `${projectRaw.lat}, ${projectRaw.lng}`
    }
  };

  return <ProjectDetailClient project={project} />;
}
