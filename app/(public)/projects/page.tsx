"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Search, 
  SlidersHorizontal, 
  Filter, 
  Grid, 
  List,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

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
    id: "PRJ-AMSS-2023-018",
    name: "Rice Processing Center and Milling Warehouse",
    program: "amss",
    sector: "Storage Infrastructures",
    province: "Leyte",
    municipality: "Abuyog",
    barangay: "Dingle",
    budget: 9600000,
    physicalProgress: 100,
    financialProgress: 100,
    status: "completed",
    contractor: "Leyte Infra Builders",
    year: "2023"
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
  },
  {
    id: "PRJ-INS-2025-055",
    name: "Multi-Purpose Irrigation Reservoir",
    program: "ins",
    sector: "Irrigation Systems",
    province: "Cebu",
    municipality: "Balamban",
    barangay: "Lias",
    budget: 8500000,
    physicalProgress: 50,
    financialProgress: 45,
    status: "ongoing",
    contractor: "Visayas Builders",
    year: "2025"
  }
];

export default function ProjectsCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProgram, setActiveProgram] = useState<"all" | "amss" | "ins">("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [budgetRange, setBudgetRange] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<Record<string, boolean>>({
    completed: true,
    ongoing: true,
    planned: true,
    suspended: true,
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    setSelectedProvince("all");
    setBudgetRange("all");
    setSelectedStatus({
      completed: true,
      ongoing: true,
      planned: true,
      suspended: true,
    });
  };

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((project) => {
      const matchesSearch = 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.contractor.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProgram = activeProgram === "all" || project.program === activeProgram;
      const matchesYear = selectedYear === "all" || project.year === selectedYear;
      const matchesProvince = selectedProvince === "all" || project.province === selectedProvince;
      const matchesStatus = selectedStatus[project.status];
      
      const matchesBudget = (() => {
        if (budgetRange === "all") return true;
        if (budgetRange === "under-2m") return project.budget < 2000000;
        if (budgetRange === "2m-10m") return project.budget >= 2000000 && project.budget <= 10000000;
        if (budgetRange === "over-10m") return project.budget > 10000000;
        return true;
      })();

      return matchesSearch && matchesProgram && matchesYear && matchesProvince && matchesStatus && matchesBudget;
    });
  }, [searchQuery, activeProgram, selectedYear, selectedProvince, selectedStatus, budgetRange]);

  const hasActiveFilters = searchQuery !== "" || 
    activeProgram !== "all" || 
    selectedYear !== "all" || 
    selectedProvince !== "all" || 
    budgetRange !== "all" ||
    !Object.values(selectedStatus).every(Boolean);

  const programs = [
    { id: "all", label: "All Projects" },
    { id: "ins", label: "INS (Irrigation)" },
    { id: "amss", label: "AMSS (Machineries)" },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16 min-h-screen font-sans">
      {/* Elegant Typographic Header */}
      <div className="mb-12">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Projects Catalog
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
          Showing {filteredProjects.length} infrastructure {filteredProjects.length === 1 ? 'project' : 'projects'} active in key agricultural programs.
        </p>
      </div>

      {/* Underlined Navigation Tabs */}
      <div className="flex border-b border-slate-200/80 dark:border-slate-800/80 mb-8 gap-8 relative overflow-x-auto scrollbar-none">
        {programs.map((prog) => {
          const isActive = activeProgram === prog.id;
          return (
            <button
              key={prog.id}
              onClick={() => setActiveProgram(prog.id)}
              className={`pb-3.5 text-sm font-bold transition-all relative outline-none cursor-pointer whitespace-nowrap ${
                isActive 
                  ? "text-primary font-extrabold" 
                  : "text-slate-450 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {prog.label}
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Minimalism Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
        {/* Borderless Search Input */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
          <Input 
            type="text" 
            placeholder="Search projects..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 rounded-lg pl-10 pr-8 py-2 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Toggle and View Switcher */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer border ${
              showAdvanced
                ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                : "bg-transparent border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-slate-855 dark:hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            Filters
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-slate-100 dark:bg-slate-800 text-primary"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-slate-100 dark:bg-slate-800 text-primary"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Collapsible Filter Row */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-slate-50/30 dark:bg-slate-900/20 rounded-xl border border-slate-200/50 dark:border-slate-800/60 mb-8 text-xs">
              {/* Province Select */}
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Province</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-750 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Provinces</option>
                  <option value="Leyte">Leyte</option>
                  <option value="Cebu">Cebu</option>
                  <option value="Samar">Samar</option>
                </select>
              </div>

              {/* Year Select */}
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Fiscal Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-755 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              {/* Budget Allocation Select */}
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Budget Size</label>
                <select
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-755 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Budgets</option>
                  <option value="under-2m">Under ₱2M</option>
                  <option value="2m-10m">₱2M - ₱10M</option>
                  <option value="over-10m">Over ₱10M</option>
                </select>
              </div>

              {/* Status checkboxes */}
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Status Option</label>
                <div className="flex flex-wrap gap-x-3 gap-y-2 mt-1.5">
                  {Object.keys(selectedStatus).map((status) => (
                    <label 
                      key={status} 
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer capitalize hover:text-primary transition-colors"
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedStatus[status]} 
                        onChange={() => toggleStatus(status)}
                        className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-3.5 h-3.5" 
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid/List Layout */}
      {viewMode === "grid" ? (
        <motion.div 
          layout 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="group"
              >
                <Card className="relative bg-slate-50/30 hover:bg-white dark:bg-slate-900/30 dark:hover:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-300/80 dark:hover:border-slate-700/80 transition-all rounded-2xl overflow-hidden flex flex-col justify-between h-[340px] cursor-pointer hover:shadow-sm">
                  <Link href={`/projects/${project.id}`} className="p-7 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Row: Meta & Status Dot */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider font-mono">
                          {project.program.toUpperCase()} • {project.id}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            project.status === "completed" ? "bg-emerald-500" :
                            project.status === "ongoing" ? "bg-amber-500" :
                            project.status === "planned" ? "bg-slate-400" : "bg-rose-500"
                          }`} />
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                            {project.status}
                          </span>
                        </div>
                      </div>

                      {/* Project Title */}
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {project.name}
                      </h3>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-850 mt-4">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Location</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold truncate block mt-0.5">{project.barangay}, {project.municipality}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Allocation</span>
                        <span className="text-slate-900 dark:text-white font-bold block mt-0.5">₱{project.budget.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Contractor</span>
                        <span className="text-slate-705 dark:text-slate-300 font-semibold truncate block mt-0.5">{project.contractor}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Progress</span>
                        <span className="text-slate-900 dark:text-white font-bold block mt-0.5 font-mono">{project.physicalProgress}%</span>
                      </div>
                    </div>
                  </Link>

                  {/* Bottom-accent Progress bar (Safety Orange) */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="bg-accent h-full transition-all duration-700 ease-out" 
                      style={{ width: `${project.physicalProgress}%` }} 
                    />
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* List Layout */
        <motion.div 
          layout 
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="relative bg-slate-50/30 hover:bg-white dark:bg-slate-900/30 dark:hover:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-300/80 dark:hover:border-slate-700/80 transition-all rounded-xl overflow-hidden cursor-pointer">
                  <Link href={`/projects/${project.id}`} className="block p-6">
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                      
                      {/* Left: Program, ID & Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                            {project.program.toUpperCase()} • {project.id}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono tracking-tight">• Year: {project.year}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                      </div>

                      {/* Middle: Details in Columns */}
                      <div className="flex flex-wrap items-center gap-8 shrink-0 text-xs">
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Location</span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold mt-0.5 block">{project.barangay}, {project.municipality}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Allocation</span>
                          <span className="text-slate-900 dark:text-white font-bold mt-0.5 block">₱{project.budget.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Progress</span>
                          <span className="text-slate-900 dark:text-white font-extrabold mt-0.5 block font-mono">{project.physicalProgress}%</span>
                        </div>
                      </div>

                      {/* Right: Status & Chevron */}
                      <div className="flex items-center justify-between lg:justify-end gap-5 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 pt-3 lg:pt-0 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            project.status === "completed" ? "bg-emerald-500" :
                            project.status === "ongoing" ? "bg-amber-500" :
                            project.status === "planned" ? "bg-slate-400" : "bg-rose-500"
                          }`} />
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                            {project.status}
                          </span>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>

                    </div>
                  </Link>

                  {/* Accent Progress Line on Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-850 overflow-hidden">
                    <div 
                      className="bg-accent h-full transition-all duration-700 ease-out" 
                      style={{ width: `${project.physicalProgress}%` }} 
                    />
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          <Card className="bg-slate-55/30 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/80 p-12 text-center flex flex-col items-center justify-center rounded-2xl">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 mb-3.5">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-slate-800 dark:text-white">No Results Found</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm">
              We couldn't find any projects matching your active search filters. Try resetting all inputs.
            </p>
            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="mt-5 text-xs font-bold border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              Reset Filters
            </Button>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
