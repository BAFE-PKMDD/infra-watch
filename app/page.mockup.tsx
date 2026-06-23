"use client";

import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  Layers, 
  MessageSquare, 
  Share2, 
  FileText, 
  Camera, 
  ChevronRight, 
  Globe, 
  Activity, 
  TrendingUp, 
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Menu,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Import real shadcn/ui Base UI components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Types
type Tab = "overview" | "projects" | "details" | "map" | "report";
type Program = "all" | "amss" | "ins";

export default function MockupPortal() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeProgram, setActiveProgram] = useState<Program>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [beforeAfterPosition, setBeforeAfterPosition] = useState(50);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "tet" | "pt">("en");
  const [reportedIssueType, setReportedIssueType] = useState("damage");
  const [reportStep, setReportStep] = useState(1);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);

  // Mock Data
  const stats = {
    totalAllocated: 24500000000,
    totalProjects: 19319,
    completionRate: 87.4,
    totalLength: 12042
  };

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

  // Filters
  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.contractor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProgram = activeProgram === "all" || project.program === activeProgram;
    
    return matchesSearch && matchesProgram;
  });

  const handleFeedbackSubmit = () => {
    if (!feedbackRating) {
      toast.error("Please select a rating before submitting.");
      return;
    }
    toast.success("Feedback submitted successfully!", {
      description: "It will be published following moderator review."
    });
  };

  const handleIssueSubmit = () => {
    toast.success("Issue report submitted successfully!", {
      description: "A tracking ID has been sent to your mobile number."
    });
    setReportStep(1);
    setActiveTab("overview");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Sonner Toast Handler */}
      <Toaster position="top-right" />

      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 flex justify-between items-center border-b border-slate-800">
        <span className="font-semibold tracking-wider uppercase">BAFE transparency portal</span>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="xs" variant="ghost" className="text-white hover:text-emerald-400 font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="uppercase">{selectedLanguage}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="bg-slate-800 text-white border border-slate-700 text-xs">
              <DropdownMenuItem onClick={() => setSelectedLanguage("en")} className="hover:bg-slate-700 px-3 py-1">English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLanguage("tet")} className="hover:bg-slate-700 px-3 py-1">Tetum</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLanguage("pt")} className="hover:bg-slate-700 px-3 py-1">Português</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-slate-500">|</span>
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]">
            SHADCN + BASE UI
          </Badge>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 flex items-center justify-center text-white font-bold rounded">
              IW
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">INFRA WATCH</span>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest -mt-1 font-semibold">Fair Reporting & Accountability</p>
            </div>
          </div>

          <nav className="hidden md:flex gap-1">
            <Button 
              variant={activeTab === "overview" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("overview")}
              className="text-sm font-semibold"
            >
              Home
            </Button>
            <Button 
              variant={activeTab === "projects" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("projects")}
              className="text-sm font-semibold"
            >
              Projects
            </Button>
            <Button 
              variant={activeTab === "details" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("details")}
              className="text-sm font-semibold"
            >
              Project Details
            </Button>
            <Button 
              variant={activeTab === "map" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("map")}
              className="text-sm font-semibold"
            >
              GIS Map
            </Button>
            <Button 
              variant={activeTab === "report" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("report")}
              className="text-sm font-semibold"
            >
              Report Issue
            </Button>
          </nav>

          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
            Access CMS
          </Button>
        </div>
      </header>

      {/* Mobile Selector */}
      <div className="bg-slate-100 py-2 border-b border-slate-200 px-4 md:hidden">
        <label className="text-xs font-semibold text-slate-500 block mb-1">NAVIGATE WIREFRAME:</label>
        <select 
          value={activeTab} 
          onChange={(e) => setActiveTab(e.target.value as Tab)}
          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-semibold"
        >
          <option value="overview">1. Landing Page</option>
          <option value="projects">2. Project Catalog</option>
          <option value="details">3. Project Details</option>
          <option value="map">4. GIS Map</option>
          <option value="report">5. Report Issue Wizard</option>
        </select>
      </div>

      {/* Main Viewport */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Hero Section */}
              <section className="bg-slate-900 text-white py-16 px-4 border-b border-slate-800">
                <div className="max-w-5xl mx-auto text-center">
                  <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest block mb-3">accountability through transparency</span>
                  <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
                    Infrastructure Network for Fair Reporting and Accountability
                  </h1>
                  <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto mb-10">
                    Monitor, evaluate, and provide feedback on AMEFIP Agricultural Machinery and Irrigation Network Services (INS) projects across municipalities from 2021 to 2026.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-12">
                    <Button 
                      size="lg"
                      onClick={() => setActiveTab("projects")} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Browse Projects
                    </Button>
                    <Button 
                      size="lg"
                      variant="outline"
                      onClick={() => setActiveTab("report")}
                      className="border-slate-700 text-white hover:bg-slate-800"
                    >
                      Report an Issue
                    </Button>
                  </div>

                  {/* Dashboard Metrics with Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                    <Card className="bg-slate-800 border-slate-700 text-center">
                      <CardHeader className="p-4 pb-0">
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Investment</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        <p className="text-2xl md:text-3xl font-extrabold text-white">₱{(stats.totalAllocated / 1e9).toFixed(1)}B</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700 text-center">
                      <CardHeader className="p-4 pb-0">
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Projects Monitored</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        <p className="text-2xl md:text-3xl font-extrabold text-white">{stats.totalProjects.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700 text-center">
                      <CardHeader className="p-4 pb-0">
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Completion Rate</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        <p className="text-2xl md:text-3xl font-extrabold text-emerald-400">{stats.completionRate}%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700 text-center">
                      <CardHeader className="p-4 pb-0">
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total System Length</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        <p className="text-2xl md:text-3xl font-extrabold text-white">{stats.totalLength.toLocaleString()} km</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </section>

              {/* Program Selector Showcase */}
              <section className="py-16 px-4 max-w-7xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900">Coverage & Scope</h2>
                  <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">Explore the primary sub-programs under the BAFE AMEFIP umbrella.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
                    <CardHeader className="p-6 pb-2">
                      <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded mb-4 text-slate-800 font-bold">
                        AMSS
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900">Agricultural Machinery, Equipment and Facilities Support Services</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-slate-500 text-sm">
                        Provision of post-harvest facilities, grain dryers, storage warehouses, tractors, and processing equipment to farmer cooperatives.
                      </p>
                    </CardContent>
                    <CardFooter className="p-6 border-t bg-slate-50/50">
                      <Button 
                        onClick={() => { setActiveProgram("amss"); setActiveTab("projects"); }}
                        className="w-full bg-slate-900 text-white text-sm font-bold"
                      >
                        View AMSS Projects
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
                    <CardHeader className="p-6 pb-2">
                      <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center rounded mb-4 text-emerald-800 font-bold">
                        INS
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900">Irrigation Network Services</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-slate-500 text-sm">
                        Rehabilitation and construction of diversion dams, distribution canals, solar powered water pumps, and local irrigation structures.
                      </p>
                    </CardContent>
                    <CardFooter className="p-6 border-t bg-slate-50/50">
                      <Button 
                        onClick={() => { setActiveProgram("ins"); setActiveTab("projects"); }}
                        className="w-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                      >
                        View INS Projects
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </section>

              {/* Before/After Visual Slider */}
              <section className="bg-white py-16 px-4 border-t border-b border-slate-200">
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Before & After Project Monitoring</h2>
                    <p className="text-slate-500 text-sm mt-2">Use the slider below to preview pre-construction state versus completed irrigation installations.</p>
                  </div>

                  <div className="relative w-full h-[400px] overflow-hidden rounded-lg border border-slate-300 shadow-inner select-none">
                    {/* Before Image Placeholder */}
                    <div className="absolute inset-0 bg-slate-300 flex items-center justify-center text-center p-8">
                      <div className="text-slate-600">
                        <span className="font-bold text-lg uppercase tracking-wide">Pre-Construction Site</span>
                        <p className="text-sm mt-1 max-w-xs">Dry, cracked agricultural soil and inefficient earth canal systems before INS intervention.</p>
                      </div>
                    </div>

                    {/* After Image Placeholder */}
                    <div 
                      className="absolute inset-0 bg-emerald-800 flex items-center justify-center text-center p-8 transition-all"
                      style={{ clipPath: `polygon(0 0, ${beforeAfterPosition}% 0, ${beforeAfterPosition}% 100%, 0 100%)` }}
                    >
                      <div className="text-white">
                        <span className="font-bold text-lg uppercase tracking-wide">Completed INS Project</span>
                        <p className="text-emerald-200 text-sm mt-1 max-w-xs">Reinforced concrete canal flowing with water powered by clean solar pump stations.</p>
                      </div>
                    </div>

                    {/* Slider Control Line */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20"
                      style={{ left: `${beforeAfterPosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs shadow">
                        ◄►
                      </div>
                    </div>

                    {/* Slider Range Controller */}
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={beforeAfterPosition} 
                      onChange={(e) => setBeforeAfterPosition(Number(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full"
                    />
                  </div>
                </div>
              </section>

              {/* How it works */}
              <section className="py-16 px-4 max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900">How INFRA Watch Ensures Accountability</h2>
                </div>

                <div className="grid md:grid-cols-4 gap-6 text-center">
                  <div className="p-4">
                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full mx-auto mb-4 font-bold text-slate-900">1</div>
                    <h3 className="font-bold text-sm mb-1">Data Sync</h3>
                    <p className="text-slate-500 text-xs">ABEMIS API automatically feeds AMEFIP & INS data into local cache.</p>
                  </div>
                  <div className="p-4">
                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full mx-auto mb-4 font-bold text-slate-900">2</div>
                    <h3 className="font-bold text-sm mb-1">Citizen Monitoring</h3>
                    <p className="text-slate-500 text-xs">Public browse maps and catalogs, validating local construction.</p>
                  </div>
                  <div className="p-4">
                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full mx-auto mb-4 font-bold text-slate-900">3</div>
                    <h3 className="font-bold text-sm mb-1">Report Issues</h3>
                    <p className="text-slate-500 text-xs">Upload pictures with EXIF GPS coordinates to flag anomalies.</p>
                  </div>
                  <div className="p-4">
                    <div className="w-10 h-10 bg-emerald-100 flex items-center justify-center rounded-full mx-auto mb-4 font-bold text-emerald-800">✓</div>
                    <h3 className="font-bold text-sm mb-1">Official Action</h3>
                    <p className="text-slate-500 text-xs">Scoped moderators investigate, reply, and update project status.</p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "projects" && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8"
            >
              {/* Sidebar Filter with Cards */}
              <aside className="w-full lg:w-64 sticky top-20 h-fit">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="p-6 flex flex-row justify-between items-center border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Filter className="w-4 h-4" /> Filters</CardTitle>
                    <button 
                      onClick={() => { setActiveProgram("all"); setSearchQuery(""); }} 
                      className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
                    >
                      Reset All
                    </button>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Program Category</label>
                      <div className="space-y-2">
                        <Button 
                          size="xs"
                          variant={activeProgram === "all" ? "default" : "outline"}
                          onClick={() => setActiveProgram("all")}
                          className="w-full justify-start text-xs font-bold"
                        >
                          All Projects
                        </Button>
                        <Button 
                          size="xs"
                          variant={activeProgram === "amss" ? "default" : "outline"}
                          onClick={() => setActiveProgram("amss")}
                          className="w-full justify-start text-xs font-bold"
                        >
                          AMSS Program
                        </Button>
                        <Button 
                          size="xs"
                          variant={activeProgram === "ins" ? "default" : "outline"}
                          onClick={() => setActiveProgram("ins")}
                          className="w-full justify-start text-xs font-bold"
                        >
                          INS Program
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Status</label>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" /> Completed
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" /> Ongoing
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" /> Planned
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" /> Suspended
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Fiscal Year</label>
                      <Select>
                        <SelectTrigger className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-semibold">
                          <SelectValue placeholder="All Years (2021-2026)" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 text-xs">
                          <SelectItem value="all">All Years (2021-2026)</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2021">2021</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </aside>

              {/* Project Catalogue */}
              <div className="flex-1">
                {/* Search Bar */}
                <Card className="bg-white border-slate-200 shadow-sm mb-6">
                  <CardContent className="p-4 flex gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        type="text" 
                        placeholder="Search by project name, code, or contractor..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-10 py-2 text-sm"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="text-xs font-bold flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Sort
                    </Button>
                  </CardContent>
                </Card>

                {/* Catalog Listing */}
                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <Card 
                      key={project.id}
                      onClick={() => setActiveTab("details")}
                      className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardContent className="p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={project.program === "ins" ? "default" : "secondary"} className={project.program === "ins" ? "bg-emerald-100 text-emerald-800" : ""}>
                              {project.program === "ins" ? "INS" : "AMSS"}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{project.id}</span>
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900 hover:text-emerald-600 transition-colors">{project.name}</h3>
                          <p className="text-slate-500 text-xs mt-1">
                            {project.barangay}, {project.municipality}, {project.province} • Budget: ₱{project.budget.toLocaleString()} • Year: {project.year}
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* Progress */}
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Progress</span>
                            <p className="text-sm font-extrabold mt-0.5">{project.physicalProgress}%</p>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden border border-slate-200">
                              <div className="bg-emerald-600 h-full" style={{ width: `${project.physicalProgress}%` }} />
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {project.status === "completed" && (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Completed
                              </Badge>
                            )}
                            {project.status === "ongoing" && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Ongoing
                              </Badge>
                            )}
                            {project.status === "planned" && (
                              <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Planned
                              </Badge>
                            )}
                            {project.status === "suspended" && (
                              <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Suspended
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredProjects.length === 0 && (
                    <div className="bg-white p-12 text-center border border-slate-200 rounded-lg text-slate-500 text-sm">
                      No projects found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto px-4 py-8 space-y-8"
            >
              {/* Project Hero Header */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">INS PROGRAM</Badge>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">PRJ-INS-2025-115</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Solar Powered Irrigation Pump System</h1>
                    <p className="text-slate-500 text-xs mt-1">Brgy. Dingle, Abuyog, Leyte • Eastern Visayas (Region VIII)</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 md:flex-none border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded flex items-center justify-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5" /> Share QR
                    </Button>
                    <Button size="sm" className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded flex items-center justify-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Rate Project
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Summary Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="p-6 pb-0">
                    <CardDescription className="text-[10px] font-bold uppercase text-slate-500">Physical Progress</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-1">
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-extrabold text-slate-900">85%</p>
                      <span className="text-xs text-slate-500">Completed</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden border border-slate-200">
                      <div className="bg-emerald-600 h-full" style={{ width: "85%" }} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="p-6 pb-0">
                    <CardDescription className="text-[10px] font-bold uppercase text-slate-500">Financial Disbursement</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-1">
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-extrabold text-slate-900">70%</p>
                      <span className="text-xs text-slate-500">Disbursed</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden border border-slate-200">
                      <div className="bg-slate-800 h-full" style={{ width: "70%" }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Technical Specifications */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
                  <CardHeader className="p-6 border-b">
                    <CardTitle className="font-bold text-sm">Project Specifications</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Contractor Name</span>
                      <p className="font-bold text-slate-900 mt-0.5">Cebu Agri-Builders Inc.</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Allocated Budget</span>
                      <p className="font-bold text-slate-900 mt-0.5">₱4,200,000.00</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Approved Budget (ABC)</span>
                      <p className="font-bold text-slate-900 mt-0.5">₱4,200,000.00</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Calendar Days</span>
                      <p className="font-bold text-slate-900 mt-0.5">180 days</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Fiscal Year</span>
                      <p className="font-bold text-slate-900 mt-0.5">2025</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Implementing Unit</span>
                      <p className="font-bold text-slate-900 mt-0.5">BAFE Division II</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
                  <CardHeader className="p-6 pb-2 border-b">
                    <CardTitle className="font-bold text-sm">Location Map</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-4 flex-1">
                    <div className="h-32 bg-slate-200 rounded flex items-center justify-center text-slate-500 text-xs font-semibold relative overflow-hidden">
                      <span className="z-10 bg-white px-2 py-1 rounded shadow">Lat: 10.65, Lng: 125.01</span>
                      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button 
                      onClick={() => setActiveTab("map")}
                      className="w-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      View in GIS Map
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Program of Works CheckList */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-6 border-b">
                  <CardTitle className="font-bold text-sm">Program of Works (POW) Checklist</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="p-3">Task / Milestone</TableHead>
                        <TableHead className="p-3">Target Date</TableHead>
                        <TableHead className="p-3">Status</TableHead>
                        <TableHead className="p-3">Verification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-200">
                      <TableRow>
                        <TableCell className="p-3 font-semibold text-slate-900">1. Site Clearance & Digging</TableCell>
                        <TableCell className="p-3 text-slate-500">Jan 15, 2025</TableCell>
                        <TableCell className="p-3"><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold text-[10px]">Completed</Badge></TableCell>
                        <TableCell className="p-3 text-slate-400">Verified Jan 14</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="p-3 font-semibold text-slate-900">2. Solar Mounting Installations</TableCell>
                        <TableCell className="p-3 text-slate-500">Feb 28, 2025</TableCell>
                        <TableCell className="p-3"><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold text-[10px]">Completed</Badge></TableCell>
                        <TableCell className="p-3 text-slate-400">Verified Feb 27</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="p-3 font-semibold text-slate-900">3. Pump Installation & Test</TableCell>
                        <TableCell className="p-3 text-slate-500">Apr 30, 2025</TableCell>
                        <TableCell className="p-3"><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold text-[10px]">Completed</Badge></TableCell>
                        <TableCell className="p-3 text-slate-400">Verified May 02</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="p-3 font-semibold text-slate-900">4. Final Water Pipe Connections</TableCell>
                        <TableCell className="p-3 text-slate-500">Jun 15, 2025</TableCell>
                        <TableCell className="p-3"><Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-bold text-[10px]">Ongoing</Badge></TableCell>
                        <TableCell className="p-3 text-slate-400">—</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Citizen Rating Drawer */}
              <Card className="bg-white border-slate-200 shadow-sm space-y-4">
                <CardHeader className="p-6 pb-0">
                  <CardTitle className="font-bold text-sm">Citizen Feedback & Ratings</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Submit Form */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <span className="text-xs font-bold text-slate-700 block">Submit Feedback for this Project</span>
                    
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button 
                          key={star} 
                          size="xs"
                          variant={feedbackRating === star ? "default" : "outline"}
                          onClick={() => setFeedbackRating(star)}
                          className="w-8 h-8 rounded font-bold text-sm"
                        >
                          {star}
                        </Button>
                      ))}
                    </div>

                    <textarea 
                      placeholder="Provide comments regarding project execution quality, speed, or local issues..." 
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs h-20 outline-none"
                    />

                    <div className="flex justify-between items-center">
                      <Button variant="outline" size="sm" className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Attach Photo
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleFeedbackSubmit}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Submit Rating
                      </Button>
                    </div>
                  </div>

                  {/* Feedback List */}
                  <div className="space-y-4 pt-4">
                    <div className="border-b border-slate-100 pb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-900">Juan Dela Cruz <span className="text-[10px] text-slate-400 font-normal">(Verified Local Resident)</span></span>
                        <span className="text-xs text-amber-500 font-bold">★★★★☆ (4/5)</span>
                      </div>
                      <p className="text-slate-600 text-xs">The panels are set up and pump works well during sunny hours. Excellent facility addition for our rice coop.</p>
                      <span className="text-[10px] text-slate-400 mt-2 block">Submitted 3 days ago • [12 citizens marked this helpful]</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100vh-4rem)] flex flex-col md:flex-row relative overflow-hidden"
            >
              {/* Map sidebar controls */}
              <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col justify-between z-10 shadow-lg">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">GIS Mapping Console</h2>
                    <p className="text-slate-500 text-xs mt-1">Overlay AMEFIP program projects with administrative boundaries.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Program Layers</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" /> INS Projects (Irrigation)
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" /> AMSS Projects (Machinery)
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">WMS Shapefile Overlays</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" className="rounded border-slate-300 text-emerald-600" /> Watersheds Boundary (GeoServer)
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" className="rounded border-slate-300 text-emerald-600" /> Agricultural Zone Map
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded border border-slate-200 text-[10px] space-y-1.5 text-slate-500 mt-6">
                  <span className="font-bold text-slate-700 uppercase block">Legend:</span>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block" /> Completed</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> Ongoing</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 block" /> Planned</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" /> Suspended</div>
                </div>
              </aside>

              {/* Map Area Mock */}
              <div className="flex-1 bg-slate-300 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-50" />
                
                {/* Mock Map Markers */}
                <div 
                  onClick={() => setActiveTab("details")}
                  className="absolute top-1/4 left-1/3 bg-white p-2 rounded shadow border border-slate-300 cursor-pointer hover:border-emerald-600 transition-colors z-20"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Dam Rehab (Leyte)
                  </div>
                </div>

                <div 
                  onClick={() => setActiveTab("details")}
                  className="absolute top-1/2 left-2/3 bg-white p-2 rounded shadow border border-slate-300 cursor-pointer hover:border-amber-500 transition-colors z-20"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Solar Pump (Abuyog)
                  </div>
                </div>

                <div 
                  onClick={() => setActiveTab("details")}
                  className="absolute top-2/3 left-1/4 bg-white p-2 rounded shadow border border-slate-300 cursor-pointer hover:border-rose-500 transition-colors z-20"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Drainage Canal (Samar)
                  </div>
                </div>

                {/* Map Control HUD */}
                <div className="absolute right-4 bottom-4 bg-white p-2 rounded shadow border border-slate-300 flex flex-col gap-1 text-slate-700 z-20 font-bold text-sm">
                  <Button variant="outline" size="icon" className="w-8 h-8 flex items-center justify-center border border-slate-200">+</Button>
                  <Button variant="outline" size="icon" className="w-8 h-8 flex items-center justify-center border border-slate-200">-</Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl mx-auto px-4 py-12"
            >
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-2xl font-extrabold text-slate-900">Report an Infrastructure Issue</CardTitle>
                  <CardDescription className="text-slate-500 text-xs">Identify and document issues regarding AMEFIP machinery or INS irrigation facilities.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  {/* Steps indicator */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-4">
                    <span className={reportStep >= 1 ? "text-emerald-600" : ""}>1. Search Project</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={reportStep >= 2 ? "text-emerald-600" : ""}>2. Locate & Upload</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={reportStep >= 3 ? "text-emerald-600" : ""}>3. Contact Info</span>
                  </div>

                  {reportStep === 1 && (
                    <div className="space-y-4">
                      <Label className="text-xs font-bold text-slate-700 block">Select the project you are reporting:</Label>
                      <Input 
                        type="text" 
                        placeholder="Search active project database (e.g. Solar Pump)..." 
                        className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs"
                      />
                      <div 
                        onClick={() => setReportStep(2)}
                        className="p-4 bg-slate-50 border border-slate-200 rounded hover:border-emerald-600 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-900 block">Solar Powered Irrigation Pump System</span>
                        <p className="text-[10px] text-slate-400">PRJ-INS-2025-115 • Abuyog, Leyte</p>
                      </div>
                    </div>
                  )}

                  {reportStep === 2 && (
                    <div className="space-y-4">
                      <Label className="text-xs font-bold text-slate-700 block">Upload Evidence & Geo-tag</Label>
                      
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <span className="text-xs font-bold text-slate-900 block">Upload photos or video files</span>
                        <p className="text-[10px] text-slate-400 mt-1">GPS metadata will be extracted automatically to verify coordinates.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700 block">Issue Category</Label>
                        <Select onValueChange={(val) => setReportedIssueType(val as string)}>
                          <SelectTrigger className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-semibold">
                            <SelectValue placeholder="Equipment Damage / Canal Crack" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-200 text-xs">
                            <SelectItem value="damage">Equipment Damage / Crack</SelectItem>
                            <SelectItem value="delay">Construction Stoppage / Delay</SelectItem>
                            <SelectItem value="flooding">Water Leaking / Flooding</SelectItem>
                            <SelectItem value="other">Other / Anomalies</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700 block">Describe the issue</Label>
                        <textarea 
                          placeholder="Detail what is broken, delayed, or missing..." 
                          className="w-full bg-white border border-slate-300 rounded p-2 text-xs h-24 outline-none"
                        />
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button 
                          variant="outline"
                          onClick={() => setReportStep(1)}
                          className="border border-slate-300 text-slate-700 text-xs font-bold"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={() => setReportStep(3)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {reportStep === 3 && (
                    <div className="space-y-4">
                      <Label className="text-xs font-bold text-slate-700 block">Contact Information</Label>
                      <p className="text-slate-400 text-[10px]">Your information remains encrypted and is only used to send resolution updates.</p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</Label>
                          <Input type="text" placeholder="Juan Dela Cruz" className="w-full border border-slate-300 rounded p-2 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Mobile Number</Label>
                          <Input type="text" placeholder="+639171234567" className="w-full border border-slate-300 rounded p-2 text-xs" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" id="anon" className="rounded text-emerald-600 border-slate-300" />
                        <label htmlFor="anon" className="text-xs text-slate-600 font-semibold">Submit report anonymously to the public</label>
                      </div>

                      <div className="flex justify-between pt-6">
                        <Button 
                          variant="outline"
                          onClick={() => setReportStep(2)}
                          className="border border-slate-300 text-slate-700 text-xs font-bold"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={handleIssueSubmit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6"
                        >
                          Submit Report
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <span className="font-extrabold text-white text-sm tracking-tight">INFRA WATCH</span>
            <p className="text-slate-500">Government agricultural infrastructure transparency and accountability portal under BAFE.</p>
          </div>
          <div>
            <span className="font-bold text-white text-xs uppercase block mb-3">Programs</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">AMEFIP Machinery Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Irrigation Network Services</a></li>
              <li><a href="#" className="hover:text-white transition-colors">ABEMIS API Sync</a></li>
            </ul>
          </div>
          <div>
            <span className="font-bold text-white text-xs uppercase block mb-3">Legal & Privacy</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Data Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GDPR Cookie Management</a></li>
            </ul>
          </div>
          <div>
            <span className="font-bold text-white text-xs uppercase block mb-3">Contact Support</span>
            <p className="text-slate-500">Bureau of Agricultural and Fisheries Engineering (BAFE)</p>
            <p className="text-slate-500 mt-1">Email: mis_support@bafe.da.gov.ph</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600">
          <span>© 2026 INFRA Watch transparency portal. All rights reserved.</span>
          <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px]">v1.0.0-mockup</span>
        </div>
      </footer>
    </div>
  );
}
