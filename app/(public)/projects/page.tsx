"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Filter, CheckCircle2, Clock, XCircle, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Mock Projects Data
const mockProjects = [
  {
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
    year: "2023"
  },
  {
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
    year: "2024"
  },
  {
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
    year: "2025"
  },
  {
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
    year: "2026"
  },
  {
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
    year: "2024"
  }
];

export default function ProjectsCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProgram, setActiveProgram] = useState<"all" | "amss" | "ins">("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<Record<string, boolean>>({
    completed: true,
    ongoing: true,
    planned: true,
    suspended: true,
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setActiveProgram("all");
    setSelectedYear("all");
    setSelectedStatus({
      completed: true,
      ongoing: true,
      planned: true,
      suspended: true,
    });
  };

  const filteredProjects = mockProjects.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.contractor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProgram = activeProgram === "all" || project.program === activeProgram;
    const matchesYear = selectedYear === "all" || project.year === selectedYear;
    const matchesStatus = selectedStatus[project.status];

    return matchesSearch && matchesProgram && matchesYear && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 min-h-screen">
      {/* Sidebar Filter Panel */}
      <aside className="w-full lg:w-64 shrink-0">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm sticky top-24">
          <CardHeader className="p-5 flex flex-row justify-between items-center border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Filter className="w-4 h-4 text-primary" /> Filters
            </CardTitle>
            <button 
              onClick={resetFilters} 
              className="text-xs text-slate-500 hover:text-primary transition-colors font-semibold"
            >
              Reset All
            </button>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            {/* Program selection */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">Program Category</span>
              <div className="space-y-1">
                <Button 
                  variant={activeProgram === "all" ? "default" : "outline"}
                  onClick={() => setActiveProgram("all")}
                  className={`w-full justify-start text-xs font-semibold h-8 ${
                    activeProgram === "all" ? "bg-primary text-primary-foreground" : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-350"
                  }`}
                >
                  All Programs
                </Button>
                <Button 
                  variant={activeProgram === "amss" ? "default" : "outline"}
                  onClick={() => setActiveProgram("amss")}
                  className={`w-full justify-start text-xs font-semibold h-8 ${
                    activeProgram === "amss" ? "bg-primary text-primary-foreground" : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-350"
                  }`}
                >
                  AMSS (Machinery & Warehouses)
                </Button>
                <Button 
                  variant={activeProgram === "ins" ? "default" : "outline"}
                  onClick={() => setActiveProgram("ins")}
                  className={`w-full justify-start text-xs font-semibold h-8 ${
                    activeProgram === "ins" ? "bg-primary text-primary-foreground" : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-350"
                  }`}
                >
                  INS (Irrigation Services)
                </Button>
              </div>
            </div>

            {/* Status Checkboxes */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">Project Status</span>
              <div className="space-y-2">
                {Object.keys(selectedStatus).map((status) => (
                  <label key={status} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer capitalize">
                    <input 
                      type="checkbox" 
                      checked={selectedStatus[status]} 
                      onChange={() => toggleStatus(status)}
                      className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4" 
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

            {/* Year Selector */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">Fiscal Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary"
              >
                <option value="all">All Years (2021-2026)</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Main Catalog View */}
      <div className="flex-1 space-y-6">
        {/* Search Bar & View Mode Toggle */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                placeholder="Search by project name, ID, or contractor..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setViewMode("list")}
                className={`h-9 px-3 border-slate-200 dark:border-slate-800 ${viewMode === "list" ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setViewMode("grid")}
                className={`h-9 px-3 border-slate-200 dark:border-slate-800 ${viewMode === "grid" ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Catalog Items */}
        {viewMode === "list" ? (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-all rounded-xl overflow-hidden cursor-pointer"
              >
                <Link href={`/projects/${project.id}`} className="block p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          project.program === "ins" 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}>
                          {project.program === "ins" ? "INS Program" : "AMSS Program"}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tight">{project.id}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{project.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
                        {project.barangay}, {project.municipality}, {project.province} • Budget: ₱{project.budget.toLocaleString()} • Funded: {project.year}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 self-start md:self-center shrink-0">
                      {/* Physical Progress */}
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Progress</span>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">{project.physicalProgress}%</p>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${project.physicalProgress}%` }} />
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {project.status === "completed" && (
                          <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </Badge>
                        )}
                        {project.status === "ongoing" && (
                          <Badge className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-250 dark:border-amber-900/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Ongoing
                          </Badge>
                        )}
                        {project.status === "planned" && (
                          <Badge className="bg-slate-50 dark:bg-slate-850 text-slate-600 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Planned
                          </Badge>
                        )}
                        {project.status === "suspended" && (
                          <Badge className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-250 dark:border-rose-900/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Suspended
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-all rounded-xl overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                <Link href={`/projects/${project.id}`} className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                        project.program === "ins" 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}>
                        {project.program === "ins" ? "INS" : "AMSS"}
                      </Badge>
                      
                      <div>
                        {project.status === "completed" && (
                          <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </Badge>
                        )}
                        {project.status === "ongoing" && (
                          <Badge className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-250 dark:border-amber-900/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Ongoing
                          </Badge>
                        )}
                        {project.status === "planned" && (
                          <Badge className="bg-slate-50 dark:bg-slate-850 text-slate-600 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Planned
                          </Badge>
                        )}
                        {project.status === "suspended" && (
                          <Badge className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-250 dark:border-rose-900/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" /> Suspended
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2 leading-snug">{project.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
                      {project.barangay}, {project.municipality}, {project.province}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Budget:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">₱{project.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Progress:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-750 dark:text-slate-250 font-mono">{project.physicalProgress}%</span>
                        <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-150 dark:border-slate-750">
                          <div className="bg-primary h-full" style={{ width: `${project.physicalProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No projects found matching the selected filters.
          </Card>
        )}
      </div>
    </div>
  );
}
