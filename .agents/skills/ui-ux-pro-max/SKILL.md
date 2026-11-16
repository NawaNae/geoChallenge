---
name: ui-ux-pro-max
description: >-
  Use this skill whenever designing, building, or styling user interfaces, websites, dashboards, or components.
  Provides structured design intelligence across UI style archetypes (Bento Grid, Glassmorphism, Brutalism, Minimalist Luxury, Dark Cyber),
  color palettes (60-30-10 rule), typography pairings, micro-interactions, responsive layouts, and UX anti-pattern prevention.
---

# UI/UX Pro Max: Design Intelligence Skill

Transform generic, cookie-cutter frontend code into polished, production-ready interfaces with deliberate visual identity.

## When to Activate
- When creating web applications, dashboards, landing pages, mobile screens, or design systems.
- When selecting color palettes, typography pairings, and layout structures.
- When refining spacing scales, animations, dark mode, and responsive ergonomics.

## 3-Step Design System Workflow

### Step 1: Context & Stack Discovery
Inspect the project files to detect:
- **Framework**: React, Next.js, Vue, Svelte, Tailwind CSS, styled-components, SwiftUI, Flutter, etc.
- **Theme**: Dark, light, or auto-detect with system preference.
- **Domain**: Fintech, Developer Tool, E-commerce, Healthcare, Creative Portfolio, SaaS.

### Step 2: Choose UI Style Archetype

Select the appropriate visual archetype for the target domain:

| Archetype | Key Characteristics | Best Fit |
| :--- | :--- | :--- |
| **Bento Grid** | High-density modular cards, varied spans (`col-span-2`, `row-span-2`), micro-stats | SaaS Dashboards, Feature Overviews |
| **Glassmorphism** | Translucent frosted glass, subtle borders (`border-white/10`), ambient blur | Modern Tech, Web3, Creative Apps |
| **Minimalist Luxury** | Generous whitespace, refined serif/sans mix, monochrome with gold/champagne accents | E-commerce, High-end Editorial |
| **Neo-Brutalism** | High contrast black outlines (2-3px), solid drop shadows (`shadow-[4px_4px_0px_#000]`), bold pastels | Developer tools, Gen-Z / Indie hacker apps |
| **Clean SaaS Modern** | Slate/Zinc palette, crisp border radii (8-12px), subtle hover glows, clear call-to-actions | B2B Software, Productivity tools |

### Step 3: Color Harmony (The 60-30-10 Rule)
- **60% Dominant Neutral**: Background and large surface areas (`bg-slate-900` or `bg-slate-50`).
- **30% Structural Secondary**: Cards, sidebars, borders, muted text (`text-slate-400`, `bg-slate-800`).
- **10% High-Intent Accent**: Primary buttons, badges, key data callouts, active indicators (e.g. Electric Indigo `#6366f1`, Emerald `#10b981`, Cyber Cyan `#06b6d4`).
- **Contrast Check**: Ensure minimum 4.5:1 WCAG AA contrast ratio for normal text.

### Step 4: Spacing, Typography & Rhythm
- **Consistent Spacing Scale**: Use a strict 4px/8px baseline grid (`gap-2`, `gap-4`, `gap-6`, `p-6`).
- **Typography Pairings**:
  - *Modern Tech*: Inter / Geist / SF Pro (headings) + Inter / Geist (body).
  - *Editorial Elegance*: Playfair Display / Fraunces (headings) + Plus Jakarta Sans (body).
  - *Developer-Centric*: JetBrains Mono / Fira Code (monospaced accents) + Inter.
- **Border Radius Nesting**:
  `inner_radius = outer_radius - padding` (e.g., card padding 16px with outer radius 24px -> inner button radius 8px).

### Step 5: Essential UX Polish & Anti-Patterns
- **Avoid Dead Clicks**: Every interactive element must provide hover, active, and focus-visible states.
- **Loading & Empty States**: Never leave raw blank screens; provide skeleton loaders or illustrative empty states.
- **Responsive Layout**: Mobile-first design; tables must either scroll horizontally or collapse into stacked cards on mobile viewports.
- **Micro-animations**: Subtle transitions (150ms-250ms) on hover/state changes.
