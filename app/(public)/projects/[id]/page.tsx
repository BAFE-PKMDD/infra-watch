import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { getPublicProjectById } from "@/actions/query/public-projects.query";

// In Next.js App Router, dynamic params are available via the params prop.
export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getPublicProjectById(id);

  if (!project) {
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

  return <ProjectDetailClient project={project as any} />;
}
