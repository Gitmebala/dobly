# Dobly UI Design System

## Overview
This document defines the UI structure system for Dobly's web and mobile interfaces. All pages should follow these patterns to ensure consistency across the application.

## Core Principles
1. **Mobile-first**: Design for mobile first, then enhance for desktop
2. **Information hierarchy**: Clear visual hierarchy with size, color, and spacing
3. **Dark mode default**: All interfaces use dark mode as the primary theme
4. **Purpose-driven**: Every element should have a clear purpose
5. **Consistent spacing**: Use the defined spacing scale throughout

## Color System

### Primary Colors
- **Primary**: `#6366f1` (Indigo) - Main actions, CTAs, active states
- **Success**: `#22c55e` (Green) - Success states, positive metrics
- **Warning**: `#f59e0b` (Amber) - Warnings, attention needed
- **Error**: `#ef4444` (Red) - Errors, critical issues

### Neutral Colors
- **Background**: `#161614` (Dark background)
- **Surface**: `#1e1e1c` (Card backgrounds)
- **Surface Elevated**: `#2a2a28` (Hover states, secondary cards)
- **Border**: `#333331` (Borders, dividers)
- **Text**: `#fafaf9` (Primary text)
- **Text Secondary**: `#a1a1aa` (Secondary text)
- **Text Muted**: `#71717a` (Muted text, placeholders)

## Typography Scale

### Font Sizes
- **xs**: 12px - Labels, badges, metadata
- **sm**: 14px - Secondary text, descriptions
- **base**: 16px - Body text, standard content
- **lg**: 18px - Section titles, subtitles
- **xl**: 20px - Card titles, important labels
- **2xl**: 24px - Page titles, large metrics
- **3xl**: 30px - Hero titles
- **4xl**: 34px - Main page headers

### Font Weights
- **400**: Regular - Body text
- **500**: Medium - Emphasized text
- **600**: Semibold - Section headers, buttons
- **700**: Bold - Page titles, important labels

### Letter Spacing
- **Uppercase labels**: 2.2em tracking
- **Headers**: -1.3em letter spacing for large titles

## Spacing Scale

### Padding/Margin
- **xs**: 8px - Tight spacing between related elements
- **sm**: 12px - Small gaps
- **md**: 16px - Standard spacing
- **lg**: 20px - Section spacing
- **xl**: 24px - Large section spacing
- **2xl**: 32px - Major section breaks

### Border Radius
- **sm**: 8px - Small elements, tags
- **md**: 12px - Buttons, inputs
- **lg**: 16px - Cards, modals
- **xl**: 20px - Large cards
- **2xl**: 24px - Hero cards, major containers
- **full**: 999px - Pills, badges

## Component Patterns

### Page Structure (Web)
```
┌─────────────────────────────────────┐
│ Header (logo, nav, user)           │
├─────────────────────────────────────┤
│                                     │
│ Hero Card                           │
│ - Kicker (uppercase label)          │
│ - Title (large, bold)               │
│ - Subtitle (context)                │
│ - Badge (status/indicator)          │
│                                     │
├─────────────────────────────────────┤
│ Metric Cards (3-column grid)        │
│ - Icon + Value + Label              │
│                                     │
├─────────────────────────────────────┤
│ Section                             │
│ - Section Title                     │
│ - Content (cards, list, table)      │
│                                     │
└─────────────────────────────────────┘
```

### Page Structure (Mobile)
```
┌─────────────────────────┐
│ Top Bar (back, title)  │
├─────────────────────────┤
│                         │
│ Hero Card               │
│ - Kicker               │
│ - Title                │
│ - Subtitle             │
│                         │
├─────────────────────────┤
│ Stat Row (3 items)     │
│ - Value + Label        │
│                         │
├─────────────────────────┤
│ Section                │
│ - Section Header       │
│   - Title + Link       │
│ - Content              │
│                         │
└─────────────────────────┘
```

### Card Structure
```
┌─────────────────────────┐
│ Header                 │
│ - Icon + Title + Meta  │
│                         │
│ Body                   │
│ - Primary content      │
│ - Secondary content    │
│                         │
│ Footer (optional)      │
│ - Actions, badges      │
└─────────────────────────┘
```

### Button Hierarchy
1. **Primary Button** - Main action, filled with primary color
2. **Secondary Button** - Alternative action, outlined or surface background
3. **Ghost Button** - Tertiary action, no background
4. **Destructive Button** - Dangerous actions, error color

### Form Structure
```
┌─────────────────────────┐
│ Label                  │
│ Input Field            │
│ - Placeholder          │
│ - Error message        │
│                         │
│ Label                  │
│ Input Field            │
│                         │
│ Action Button          │
└─────────────────────────┘
```

## Page Templates

### List Page (e.g., Coworkers, Signals)
**Web:**
- Hero card with page title and description
- Filter bar (search, filters, sort)
- Grid/list of items
- Pagination

**Mobile:**
- Header with title
- Filter chips (horizontal scroll)
- List of items
- Pull-to-refresh

### Detail Page (e.g., Coworker Detail)
**Web:**
- Breadcrumb navigation
- Header with title, status badge, actions
- Key metrics row
- Tabbed content (Overview, Health, Settings, etc.)
- Related items section

**Mobile:**
- Back button + title
- Status badge
- Key metrics (horizontal scroll)
- Tab bar or section list
- Action buttons (fixed bottom)

### Form Page (e.g., Quick Build)
**Web:**
- Progress indicator
- Form sections with clear headers
- Validation feedback
- Submit/Cancel actions

**Mobile:**
- Back button + progress dots
- Step-by-step form
- Next/Back navigation
- Fixed bottom action bar

### Dashboard Page
**Web:**
- Hero card with daily briefing
- Metric cards (3-4 key metrics)
- Two-column layout: main content + sidebar
- Quick actions panel

**Mobile:**
- Hero card with briefing
- Stat row (3 metrics)
- "What matters" section
- "Needs decision" section
- Coworker grid (2-column)

## Responsive Breakpoints

### Web
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile
- **Small**: < 375px
- **Medium**: 375px - 414px
- **Large**: > 414px

## Icon Usage

### Icon Categories
- **Navigation**: chevron-back, chevron-forward, menu, close
- **Actions**: add, create, edit, delete, checkmark, close
- **Status**: checkmark-circle, alert-circle, warning, information-circle
- **Coworker**: person-circle, person, users
- **Operations**: pulse, flask, eye, shield-checkmark
- **Data**: trending-up, trending-down, bar-chart, pie-chart

### Icon Sizes
- **xs**: 16px - Inline icons, badges
- **sm**: 18px - Button icons
- **md**: 20px - Card icons
- **lg**: 24px - Section icons
- **xl**: 32px - Hero icons
- **2xl**: 48px - Empty states

## Animation Patterns

### Transitions
- **Page transitions**: Fade in/out (300ms)
- **Modal transitions**: Scale up/down (200ms)
- **Button presses**: Scale down (100ms)
- **Loading states**: Pulse animation

### Loading States
- **Skeleton screens**: For content loading
- **Spinners**: For button actions
- **Progress bars**: For multi-step processes

## Accessibility

### Focus States
- All interactive elements must have visible focus states
- Focus rings should use primary color with 2px border

### Contrast
- Text on background: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Minimum 3:1 contrast ratio

### Touch Targets
- Minimum touch target size: 44x44px (mobile)
- Spacing between touch targets: 8px minimum

## Page-Specific Guidelines

### Dashboard
- **Purpose**: Quick overview of business state
- **Key elements**: Briefing, metrics, urgent items
- **Layout**: Hero + metrics + feed + coworker grid

### Coworker Detail
- **Purpose**: Full coworker management
- **Key elements**: Status, health, configuration, actions
- **Layout**: Header + metrics + tabs + actions

### Simulate
- **Purpose**: Test coworker behavior
- **Key elements**: Scenario selection, run button, results
- **Layout**: Scenario grid + run controls + results list

### Shadow Mode
- **Purpose**: Review coworker proposals
- **Key elements**: Proposal list, feedback input, stats
- **Layout**: Proposal cards + feedback form + stats

### Health
- **Purpose**: Monitor coworker performance
- **Key elements**: Scores, metrics, trends, issues
- **Layout**: Score cards + metric grid + issues list

### Briefings
- **Purpose**: Daily operational summary
- **Key elements**: Business status, what happened, what matters
- **Layout**: Hero card + sections for each category

### Approvals/Escalations
- **Purpose**: Review and act on escalations
- **Key elements**: Escalation cards, approve/reject actions
- **Layout**: List of cards with action buttons

## Implementation Notes

### Web (Next.js)
- Use Tailwind CSS classes following the design tokens
- Components in `src/components/` directory
- Pages in `src/app/dashboard/` directory
- Use shadcn/ui components as base, customize with design tokens

### Mobile (React Native)
- Use the theme constants in `src/theme/`
- Components in `src/components/` directory
- Screens in `src/screens/dashboard/` directory
- Follow the same spacing, color, and typography scales

### Shared
- Design tokens defined in theme files
- Component library for reusable patterns
- Consistent naming conventions
- Type-safe props with TypeScript
