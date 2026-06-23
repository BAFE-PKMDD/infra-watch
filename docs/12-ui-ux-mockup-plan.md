# UI/UX Mockup & Wireframe Plan

> High-fidelity layout and wireframe specifications for the public-facing pages of INFRA Watch, enabling early stakeholder review and approval.

---

## 1. Landing Page (Home Page)

The home page serves as the entry node for citizens, providing high-level transparency indicators, fast navigation triggers, and guides.

### 1.1 Wireframe Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo] INFRA Watch            Projects  GIS Map  Report Issue  [Sign In]│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                      TRANS-NATIONAL TRANSPARENCY PORTAL                │
│             Track Machinery, Facilities, & Irrigation Projects          │
│                                                                        │
│          ┌──────────────────────────────────────────────────┐          │
│          │ Search by project title, ID, or contractor...    │          │
│          └──────────────────────────────────────────────────┘          │
│                                                                        │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│    │ ₱24.5 Billion │  │ 1,931 total  │  │ 87.4% completion│  │ 12,042 km │ │
│    │ total budget │  │   projects   │  │    ratio     │  │ roads/sys │ │
│    └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ Interactive Program Comparison Selector ]                            │
│  ┌───────────────────────────────┐ ┌────────────────────────────────┐  │
│  │ AMEFIP Program                │ │ INS Program                    │  │
│  │ (Machinery, Dryer, Warehouse) │ │ (Dams, Canal, Pump Systems)    │  │
│  └───────────────────────────────┘ └────────────────────────────────┘  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   BEFORE / AFTER COMPARISON SLIDER                                     │
│   ┌──────────────────────────────────┬──────────────────────────────┐  │
│   │                                  │                              │  │
│   │   [Pre-construction Canal]       │    [Completed INS Project]   │  │
│   │   (Dry soil / cracked earth)     │    (Active concrete flow)    │  │
│   │                                  ◄►                             │  │
│   │                                  │                              │  │
│   └──────────────────────────────────┴──────────────────────────────┘  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   HOW IT WORKS                                                         │
│   1. Sync data    ──►   2. Public monitor ──► 3. Send feedback ──► 4. Resolve │
│   (ABEMIS cache)        (GIS map / cards)     (Photos / rating)    (Action)   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Interactive Micro-animations
- **Budget Counter**: The budget card values animate upwards sequentially on load.
- **Program Cards**: Hovering on the program selectors triggers a clean translate-up effect and shadow lift, highlighting their individual focus areas.
- **Slider Handler**: Double-ended drag transition for seamless "before" and "after" image comparisons.

---

## 2. Project Directory (Discovery Catalogue)

A search board for listing and sorting all AMEFIP & INS projects.

### 2.1 Wireframe Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Filter Panel                    Project List Catalog (Page 1 of 193)    │
│ ┌───────────────────────────┐   ┌────────────────────────────────────┐ │
│ │ Program:                  │   │ Solar Irrigation Pump System       │ │
│ │ [x] AMEFIP   [x] INS      │   │ INS • Leyte • ₱4.2 Million • 85%   │ │
│ │                           │   │ [=== Progress Bar 85% ===]         │ │
│ │ Fiscal Year:              │   └────────────────────────────────────┘ │
│ │ [2021] [2022] [2023] [x]  │   ┌────────────────────────────────────┐ │
│ │                           │   │ Post-harvest Flatbed Dryer         │ │
│ │ Province:                 │   │ AMEFIP • Cebu • ₱1.8 Million • 100%│ │
│ │ [Select Province    v]    │   │ [======= Progress Bar 100% ======] │ │
│ │                           │   └────────────────────────────────────┘ │
│ │ Status:                   │   ┌────────────────────────────────────┐ │
│ │ [ ] Planned               │   │ Open Concrete Canal Rehabilitation │ │
│ │ [x] Ongoing               │   │ INS • Samar • ₱3.1 Million • 40%   │ │
│ │ [ ] Completed             │   │ [== Progress Bar 40% ==]           │ │
│ │                           │   └────────────────────────────────────┘ │
│ └───────────────────────────┘   [Prev] [1] [2] [3] ... [193] [Next]    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Interactive Components
- **Sticky Filters**: The filter sidebar remains locked on scroll for ease of access.
- **Query Debounce**: Typing in the search bar triggers updates automatically with a 300ms debounce to prevent API server overload.

---

## 3. Project Detail Interface

Displays all metadata, construction timelines, and citizen feedback.

### 3.1 Wireframe Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Project: Solar Irrigation Pump System (Leyte)              [Share QR]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ Physical Progress: 85% ]           [ Financial Progress: 70% ]      │
│  [========================    ]       [======================      ]   │
│                                                                        │
│  ┌────────────────────────────────┐   ┌──────────────────────────────┐ │
│  │ Project Details                │   │ Site Location                │ │
│  │ - Agency: BAFE-INS             │   │ - Municipality: Abuyog       │ │
│  │ - Contractor: G Builders       │   │ - Barangay: Dingle           │ │
│  │ - Budget: ₱4,200,000.00        │   │ - Coordinates: 10.65, 125.01 │ │
│  │ - Calendar Days: 180           │   │                              │ │
│  │ - Year Funded: 2023            │   │ [ Mini-map preview card ]    │ │
│  └────────────────────────────────┘   └──────────────────────────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  PROGRAM OF WORKS CHECKLIST                                            │
│  | Task Item                 | Target Date  | Status     | Actual |   │
│  |---------------------------|--------------|------------|--------|   │
│  | 1. Site Excavation        | Jan 15, 2023 | Completed  | Jan 14 |   │
│  | 2. Pump Foundation       | Feb 28, 2023 | Completed  | Mar 02 |   │
│  | 3. Solar Panel Install    | Apr 30, 2023 | Completed  | Apr 28 |   │
│  | 4. Main Line Connection   | Jun 15, 2023 | Ongoing    | -      |   │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CITIZEN FEEDBACK & PHOTOS                                             │
│  [ Rate Project: (1) (2) (3) (4) (5) ] [ Write Comment...            ] │
│                                                                        │
│  ★★★★★ (5/5) "Pump is operating, farmers have water supply."          │
│  - Citizen (Anonymous) • 2 days ago • [25 Helpful Votes]               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Interactive GIS Map Interface

Pinpoints project coordinates with GeoServer map layers.

### 4.1 Wireframe Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ ┌───┐ ┌──────────────┐                                                │
│ │   │ │ Search       │   (🟢 Pin: Completed)                           │
│ └───┘ └──────────────┘                                                │
│ ┌──────────────────┐                                                  │
│ │ Layer Toggles    │                    (🟡 Pin: Ongoing)             │
│ │ [x] INS Projects │                                                  │
│ │ [x] AMEFIP       │                                                  │
│ │ [ ] Watersheds   │         (🔵 Pin: Planned)                         │
│ │ [ ] Soil Zones   │                                                  │
│ └──────────────────┘                                                  │
│                                                                        │
│                                                                        │
│                                           ┌──────────────────────────┐ │
│                                           │ Hover Card:              │ │
│                                           │ Solar Irrigation Pump    │ │
│                                           │ Status: Ongoing (85%)    │ │
│                                           │ Budget: ₱4.2M            │ │
│                                           └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Mockup Validation Strategy

Before writing code:
1. **Interactive Figma Prototypes**: Export wireframe designs to an interactive Figma canvas for review.
2. **First-run Static Templates**: Build the main public views (`landing`, `projects`, `detail`) inside the `/app/(public)` directory using static mock data. This lets BAFE executives load, click, and navigate the application directly in their browsers.
3. **Approval Loop**: The execution path transitions to DB schema coding and ABEMIS integration only after stakeholders approve these static visual mockups.
