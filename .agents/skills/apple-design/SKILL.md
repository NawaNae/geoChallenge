---
name: apple-design
description: >-
  Use this skill when designing, building, or styling user interfaces that adhere to Apple's Human Interface Guidelines (HIG)
  and WWDC fluid motion principles. Enforces direct manipulation, interruptible spring physics, dynamic typography scales,
  translucency/vibrancy, accessibility, and platform ergonomics for web, iOS, and macOS applications.
---

# Apple Design & Fluid Motion Skill

This skill guides the creation of polished, responsive, and tactile interfaces inspired by Apple's Human Interface Guidelines (HIG) and WWDC interface design sessions (such as *Designing Fluid Interfaces*).

## When to Activate
- When creating or refining user interfaces, web apps, or mobile designs with Apple aesthetic standards.
- When implementing gestures, drag-to-dismiss, spring animations, or transition physics.
- When auditing spacing, typography scales, contrast, and touch targets.

## 1. Core Motion & Physics Principles

1. **Immediate Response (Low Latency)**:
   - Provide instantaneous visual feedback (<16ms) on user contact or click.
   - Active state feedback: gentle scale down (`transform: scale(0.97)`), subtle opacity shift, or haptic tap simulation.
2. **Direct Manipulation**:
   - The UI element should follow the cursor or finger 1:1 without lagging behind.
3. **Interruptibility**:
   - Every animation must be cancelable and redirectable at any millisecond. Never block input while an animation runs.
4. **Spring Physics Over Easing Curves**:
   - Prefer damped harmonic springs over fixed duration cubic-bezier transitions.
   - Typical spring parameters:
     - Responsive/Brisk: `stiffness: 400, damping: 30` (quick snaps, tooltips, buttons).
     - Smooth/Gentle: `stiffness: 250, damping: 25` (modals, sheets, page transitions).
     - Bouncy/Playful: `stiffness: 300, damping: 18` (badges, success icons).
5. **Velocity Handoff & Momentum**:
   - When a user releases a drag or swipe, preserve the gesture's velocity and project it into the deceleration curve.

## 2. Visual Hierarchy & Materials

- **Materials & Vibrancy**:
  - Use subtle frosted glass and backdrop blur: `backdrop-filter: blur(20px) saturate(180%)`.
  - Layer translucent surfaces (`rgba(255, 255, 255, 0.7)` in light mode, `rgba(30, 30, 30, 0.7)` in dark mode).
- **Typography (Dynamic Type Hierarchy)**:
  - Font family: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif`.
  - Large Title: 34pt, Bold
  - Title 1: 28pt, Bold
  - Title 2: 22pt, Bold
  - Title 3: 20pt, Semibold
  - Headline: 17pt, Semibold
  - Body: 17pt, Regular
  - Callout: 16pt, Regular
  - Subheadline: 15pt, Regular
  - Footnote: 13pt, Regular
  - Caption 1: 12pt, Regular
- **Corner Radii Rule**:
  - Nested container radii should maintain concentric proportions:
    `inner_radius = outer_radius - padding`.
  - Use continuous squircle curves (`smooth-corners` or standard Apple continuous curves) rather than harsh box corners.
- **Touch & Click Ergonomics**:
  - Minimum touch target: 44 × 44 pt (or 44px on web/mobile).

## 3. Dark Mode & Accessibility

- Use semantic color tokens:
  - Background: `systemBackground`, `secondarySystemBackground`, `tertiarySystemBackground`.
  - Text: `label` (primary), `secondaryLabel` (supporting), `tertiaryLabel` (placeholders).
- Always respect `prefers-reduced-motion`:
  - When reduced motion is enabled, replace sliding/spring transitions with gentle cross-fades (`opacity` transitions).
