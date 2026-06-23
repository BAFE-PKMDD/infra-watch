# UI/UX Design System & Layouts

> User Interface and Experience design system, layouts, color palette, typography guidelines, and micro-animations for INFRA Watch.

---

## 1. Design Principles

INFRA Watch is built on three core design pillars:
1. **Utility & Clarity**: Dashboards and data tables must present high-density data clearly without causing cognitive fatigue.
2. **Professional & Trustworthy**: Avoid flashy trends. The design should convey institutional transparency, accountability, and accuracy.
3. **No Gradients (Rule Constraint)**: UI styling utilizes solid colors, clean borders, crisp contrast, and subtle shadows for depth.

---

## 2. Color Palette (Solid Colors Only)

The interface employs a premium Slate & Emerald theme to symbolize structural development and clean sanitation infrastructure.

### Light Mode Variables
- **Background**: White (`#ffffff`)
- **Card Background**: Slate 50 (`#f8fafc`)
- **Primary / Action**: Emerald 600 (`#059669`)
- **Primary Foreground**: White (`#ffffff`)
- **Secondary**: Slate 600 (`#475569`)
- **Muted / Border**: Slate 200 (`#e2e8f0`)
- **Text (Default)**: Slate 900 (`#0f172a`)
- **Text (Muted)**: Slate 500 (`#64748b`)
- **Destructive**: Rose 600 (`#e11d48`)

### Dark Mode Variables
- **Background**: Slate 950 (`#020617`)
- **Card Background**: Slate 900 (`#0f172a`)
- **Primary / Action**: Emerald 500 (`#10b981`)
- **Primary Foreground**: Slate 950 (`#020617`)
- **Secondary**: Slate 400 (`#94a3b8`)
- **Muted / Border**: Slate 800 (`#1e293b`)
- **Text (Default)**: Slate 50 (`#f8fafc`)
- **Text (Muted)**: Slate 400 (`#94a3b8`)
- **Destructive**: Rose 500 (`#f43f5e`)

---

## 3. Typography

- **Primary Font Family**: `Inter`, Sans-Serif (imported via Next.js Google Fonts wrapper).
- **Secondary Font Family (Numbers & Code)**: `Outfit` or `JetBrains Mono` for tabular metrics and financial indicators.

### Type Scale
- **H1 (Page Titles)**: `text-3xl font-extrabold tracking-tight` (30px)
- **H2 (Section Headers)**: `text-2xl font-bold tracking-tight` (24px)
- **H3 (Card Titles)**: `text-lg font-semibold` (18px)
- **Body**: `text-sm font-normal text-muted-foreground` (14px)
- **Small / Caps**: `text-xs font-semibold uppercase tracking-wider` (12px)

---

## 4. Key UI Components & Shadcn Integrations

We utilize **shadcn/ui** components built on top of **Base UI** (unstyled primitives) for accessible and customizable components.

All components are installed via shadcn/ui:
```bash
bunx shadcn@latest add button card dialog sheet table tabs toast skeleton dropdown-menu input label badge
```

### 4.1 Global Sidebar Navigation (Dashboard)
A collapsible sidebar featuring solid color highlights.
- Collapsed state: Shows only icons with clean tooltip guides.
- Active item indicator: Solid emerald left border + light emerald background (light mode) or deep slate background (dark mode).

### 4.2 Project Status Badge
Strict color matching for quick visual scanning:
- `planned`: Solid Slate Badge (`bg-slate-100 text-slate-800` / `bg-slate-800 text-slate-100`)
- `ongoing`: Solid Yellow Badge (`bg-amber-100 text-amber-800` / `bg-amber-900/30 text-amber-400`)
- `completed`: Solid Emerald Badge (`bg-emerald-100 text-emerald-800` / `bg-emerald-900/30 text-emerald-400`)
- `suspended`: Solid Rose Badge (`bg-rose-100 text-rose-800` / `bg-rose-900/30 text-rose-400`)

### 4.3 Data Table Layouts
- Solid borders with header backgrounds colored in subtle Slate tones.
- Alternating row styling (zebra pattern) for scanning heavy budget logs.
- Interactive hover transitions highlighting selected rows.

---

## 5. Micro-Animations & Transitions

We use **Framer Motion** to deliver fluid, professional interface transitions:

### 5.1 Page Transitions
All route changes perform a clean vertical fade:
```typescript
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: "easeInOut" }
};
```

### 5.2 Hover Effects
- **Buttons / Actions**: Subtle scale-down click reactions (`whileTap={{ scale: 0.98 }}`) and smooth background color transitions.
- **Project Cards**: Subtle shadow lifts (`shadow-sm` transitions to `shadow-md` on hover) with crisp border highlighting.

### 5.3 Loading States
Use skeleton layouts that pulse smoothly:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}
.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## 6. Internationalization (i18n)

To accommodate all citizens, the UI operates in three languages using `next-intl`:
- **Tetum (tet)**: Default national language
- **English (en)**: Secondary translation
- **Portuguese (pt)**: Legal/official translation

The language switcher is a clean dropdown menu accessible in the header. All labels, placeholder inputs, metadata fields, and system notifications are translated dynamically.
