# Dobly Navigation Architecture

## Overview
This document defines the complete navigation structure for Dobly's web and mobile applications, including button placement, screen flows, and user journeys.

## Mobile Navigation Structure

### Primary Navigation (Gesture-Based)
No bottom tab bar. Navigation is gesture-driven with a drawer for main access.

```
┌─────────────────────────────────┐
│ [≡]  Dashboard                 │
├─────────────────────────────────┤
│                                 │
│  [Swipe to navigate screens]    │
│                                 │
│           [+ New]               │
│                                 │
│           [Voice]               │
└─────────────────────────────────┘
```

### Drawer (Swipe from left)
```
┌─────────────────────────┐
│ [X]                     │
│                         │
│  Dobly                  │
│                         │
│  ─────────────────      │
│                         │
│  Dashboard              │
│  Feed                   │
│  Approvals (3)          │
│  Briefings              │
│  Coworkers              │
│  Simulate               │
│  Shadow Mode            │
│  Health                 │
│                         │
│  ─────────────────      │
│                         │
│  Settings               │
│  Profile                │
│  Help                   │
│  Sign Out               │
└─────────────────────────┘
```

**Drawer Items:**
- **Dashboard**: Morning briefing, overview
- **Feed**: Operation feed with signals, events
- **Approvals (3)**: Escalations (badge shows pending count)
- **Briefings**: Daily briefings
- **Coworkers**: List of all coworkers
- **Simulate**: Scenario lab
- **Shadow Mode**: Shadow mode inbox
- **Health**: System health overview
- **Settings**: Account, connections, preferences
- **Profile**: User profile
- **Help**: Documentation
- **Sign Out**: Log out

### Floating Action Buttons

**Primary FAB** (Bottom Right):
- **Icon**: add-circle
- **Action**: Opens QuickBuildScreen
- **Always visible**: On all screens except when in modal
- **Behavior**: Tap to create new coworker

**Secondary FAB** (Bottom Left):
- **Icon**: mic
- **Action**: Start voice recording
- **Always visible**: On all screens except when recording
- **Behavior**: 
  - Tap to start/stop recording
  - Opens modal for command input
  - Routes to appropriate screen based on command

### Gesture Navigation

**Swipe Left/Right**: Navigate between related screens
- Dashboard ↔ Feed
- Coworker list ↔ Coworker detail
- Simulate ↔ Shadow Mode

**Swipe Down**: Pull to refresh (on list screens)
- Feed
- Approvals
- Coworkers list
- Briefings

**Swipe Up**: On coworker cards to reveal quick actions
- Simulate
- Shadow Mode
- Health
- Edit

**Long Press**: On coworker cards to open context menu
- View details
- Edit
- Deploy/Pause
- Delete

### Screen Navigation Flows

#### Dashboard → Coworker Detail
```
DashboardScreen
  → Tap coworker card
  → CoworkerDetailScreen
```

#### Dashboard → Health
```
DashboardScreen
  → Tap health metric
  → CoworkerHealthScreen
```

#### Dashboard → Simulate
```
DashboardScreen
  → Tap "Simulate" button on coworker card
  → SimulateScreen (pre-selected coworker)
```

#### Dashboard → Shadow Mode
```
DashboardScreen
  → Tap "Shadow" button on coworker card
  → ShadowScreen (pre-selected coworker)
```

#### Feed → Coworker Detail
```
FeedScreen
  → Tap coworker mention
  → CoworkerDetailScreen
```

#### Feed → Signal Detail
```
FeedScreen
  → Tap signal card
  → SignalDetailScreen
```

#### Approvals → Coworker Detail
```
ApprovalsScreen
  → Tap coworker name
  → CoworkerDetailScreen
```

#### Quick Build → Coworker Detail
```
QuickBuildScreen
  → Complete 4 steps
  → Create coworker
  → CoworkerDetailScreen (new coworker)
```

#### Coworker Detail → Sub-screens
```
CoworkerDetailScreen
  → Tap "Health" button
  → CoworkerHealthScreen

CoworkerDetailScreen
  → Tap "Simulate" button
  → SimulateScreen

CoworkerDetailScreen
  → Tap "Shadow" button
  → ShadowScreen

CoworkerDetailScreen
  → Tap "Edit" button
  → CoworkerEditScreen
```

#### Simulate → Results
```
SimulateScreen
  → Run simulation
  → SimulationResultsScreen
```

#### Shadow Mode → Feedback
```
ShadowScreen
  → Tap shadow run
  → ShadowFeedbackScreen
```

### Button Placement by Screen

#### DashboardScreen
- **Top left**: Hamburger menu (opens drawer)
- **Top right**: Title "Dashboard"
- **Bottom right**: Primary FAB (+ New Coworker)
- **Bottom left**: Secondary FAB (Voice)
- **Coworker cards**: 
  - Right side: Health badge (tapable)
  - Swipe up: Reveal quick actions (Simulate, Shadow, Health)
  - Long press: Context menu
- **Briefing card**: 
  - Bottom: "View all briefings" link

#### FeedScreen
- **Top left**: Hamburger menu (opens drawer)
- **Top right**: Title "Feed"
- **Bottom right**: Primary FAB (+ New Coworker)
- **Bottom left**: Secondary FAB (Voice)
- **Filter bar**: Search, filter chips (below header)
- **Feed items**: Tap to navigate to related screens
- **Pull down**: Refresh

#### ApprovalsScreen
- **Top left**: Hamburger menu (opens drawer)
- **Top right**: Title "Approvals" with badge
- **Bottom right**: Primary FAB (+ New Coworker)
- **Bottom left**: Secondary FAB (Voice)
- **Escalation cards**:
  - Bottom: Approve, Modify, Reject buttons
  - Swipe left: Quick approve
  - Swipe right: Quick reject

#### CoworkerDetailScreen
- **Top left**: Back button (swipe right also goes back)
- **Top right**: Title, status badge
- **Bottom right**: Primary FAB (Edit/Deploy)
- **Bottom left**: Secondary FAB (Voice)
- **Action sheet** (swipe up from bottom):
  - Deploy/Pause/Resume
  - Health
  - Simulate
  - Shadow Mode
  - Edit
  - Delete

#### CoworkerHealthScreen
- **Top left**: Back button
- **Top right**: Title "Health"
- **Bottom right**: Primary FAB (hidden)
- **Bottom left**: Secondary FAB (Voice)
- **Bottom**: "View trends" button

#### SimulateScreen
- **Top left**: Back button
- **Top right**: Title "Simulate"
- **Bottom right**: Primary FAB (Run scenario)
- **Bottom left**: Secondary FAB (Voice)
- **Bottom**: "Run scenario suite" button

#### ShadowScreen
- **Top left**: Back button
- **Top right**: Title "Shadow Mode"
- **Bottom right**: Primary FAB (hidden)
- **Bottom left**: Secondary FAB (Voice)
- **Shadow run cards**: Tap to view details

#### QuickBuildScreen
- **Top left**: Back button (swipe right to cancel)
- **Top right**: Title "Quick Build"
- **Bottom right**: Primary FAB (Next/Create)
- **Bottom left**: Secondary FAB (hidden)
- **Progress dots**: Top of screen

## Web Navigation Structure

### Sidebar Navigation (Primary)
```
┌──────────────────┐
│ Dobly Logo       │
├──────────────────┤
│ Dashboard        │
│ Coworkers        │
│ Feed             │
│ Approvals        │
│ Briefings        │
│ Simulate         │
│ Shadow Mode      │
│ Health           │
├──────────────────┤
│ Settings         │
└──────────────────┘
```

**Navigation Items:**
1. **Dashboard** (`/dashboard`)
   - Icon: home
   - Purpose: Morning briefing, overview

2. **Coworkers** (`/dashboard/coworkers`)
   - Icon: users
   - Purpose: List all coworkers
   - Sub-navigation: Coworker detail pages

3. **Feed** (`/dashboard/feed`)
   - Icon: list
   - Purpose: Operation feed

4. **Approvals** (`/dashboard/approvals`)
   - Icon: checkmark-circle
   - Purpose: Escalations
   - Badge: Pending count

5. **Briefings** (`/dashboard/briefings`)
   - Icon: document-text
   - Purpose: Daily briefings

6. **Simulate** (`/dashboard/simulate`)
   - Icon: flask
   - Purpose: Scenario lab

7. **Shadow Mode** (`/dashboard/shadow`)
   - Icon: eye
   - Purpose: Shadow mode inbox

8. **Health** (`/dashboard/health`)
   - Icon: heart
   - Purpose: System health overview

9. **Settings** (`/dashboard/settings`)
   - Icon: settings
   - Purpose: Account, connections, preferences

### Top Bar (Secondary)
```
┌────────────────────────────────────────────┐
│ [Menu] Dobly  [Search]  [Notifications]  [User] │
└────────────────────────────────────────────┘
```

**Elements:**
- **Menu toggle**: Collapses/expands sidebar (mobile)
- **Search**: Global search across coworkers, signals, briefings
- **Notifications**: Bell icon with badge
- **User**: Avatar dropdown (profile, logout)

### Quick Actions (Top Right)
```
┌─────────────────────────────────┐
│ [+ New Coworker] [Voice] [?]   │
└─────────────────────────────────┘
```

**Buttons:**
- **+ New Coworker**: Opens QuickBuildScreen (modal)
- **Voice**: Opens voice command modal
- **?**: Help documentation

### Screen Navigation Flows

#### Dashboard → Coworker Detail
```
/dashboard
  → Click coworker card
  → /dashboard/coworkers/[id]
```

#### Dashboard → Health
```
/dashboard
  → Click health metric
  → /dashboard/coworkers/[id]/health
```

#### Coworkers List → Detail
```
/dashboard/coworkers
  → Click coworker row
  → /dashboard/coworkers/[id]
```

#### Coworker Detail → Sub-pages
```
/dashboard/coworkers/[id]
  → Click "Health" tab
  → /dashboard/coworkers/[id]/health

/dashboard/coworkers/[id]
  → Click "Simulate" tab
  → /dashboard/coworkers/[id]/simulate

/dashboard/coworkers/[id]
  → Click "Shadow" tab
  → /dashboard/coworkers/[id]/shadow
```

#### Approvals → Detail
```
/dashboard/approvals
  → Click escalation
  → /dashboard/approvals/[id]
```

#### Briefings → Detail
```
/dashboard/briefings
  → Click briefing
  → /dashboard/briefings/[id]
```

### Button Placement by Screen

#### Dashboard
- **Top right**: "+ New Coworker", Voice button
- **Briefing card**: "View all briefings" link
- **Coworker cards**: 
  - Right: Health badge (clickable)
  - Bottom: "View details", "Simulate", "Shadow" buttons

#### Coworkers List
- **Top right**: "+ New Coworker", Voice button
- **Filter bar**: Search, status filter, sort
- **Coworker rows**: Click to view detail

#### Coworker Detail
- **Top right**: Edit, Delete, Voice button
- **Tabs**: Overview, Health, Simulate, Shadow, Settings
- **Action bar** (top): Deploy/Pause/Resume, Clone
- **Bottom**: Related coworkers, recent activity

#### Approvals
- **Top right**: Voice button
- **Escalation cards**: Approve, Modify, Reject buttons

#### Briefings
- **Top right**: "Generate new briefing", Voice button
- **Briefing cards**: Click to view full briefing

#### Simulate
- **Top right**: Voice button
- **Scenario cards**: "Run scenario" button
- **Bottom**: "Run scenario suite" button

#### Shadow Mode
- **Top right**: Voice button
- **Shadow run cards**: "View details", "Provide feedback" buttons

#### Health
- **Top right**: Voice button
- **Health cards**: Click to view coworker health detail

## User Journeys

### Journey 1: Create and Deploy a Coworker
```
1. User taps "+ New Coworker" (mobile) or button (web)
2. QuickBuildScreen opens
3. User selects role (step 1)
4. User selects autonomy level (step 2)
5. User enters name and mission (step 3)
6. User reviews configuration (step 4)
7. User taps "Create"
8. CoworkerDetailScreen opens (new coworker)
9. User configures standards
10. User taps "Deploy"
11. Coworker is now active
```

### Journey 2: Review and Approve Escalation
```
1. User navigates to Approvals (tab or sidebar)
2. ApprovalsScreen shows pending escalations
3. User taps escalation card
4. User reviews context and proposed action
5. User taps "Approve", "Modify", or "Reject"
6. If Modify: User edits action, then submits
7. Escalation is resolved
8. User returns to ApprovalsScreen
```

### Journey 3: Run Simulation
```
1. User navigates to Simulate (from CoworkerDetail or sidebar)
2. SimulateScreen shows available scenarios
3. User selects scenario or enters custom scenario
4. User taps "Run simulation"
5. Simulation starts, results appear
6. User reviews outcome, confidence, risk level
7. User can run additional scenarios or view trends
```

### Journey 4: Review Shadow Mode Proposals
```
1. User navigates to Shadow Mode (from CoworkerDetail or sidebar)
2. ShadowScreen shows recent shadow runs
3. User taps shadow run card
4. User reviews proposed action and context
5. User provides feedback (approve, modify, reject)
6. Feedback is submitted for learning
7. User returns to ShadowScreen
```

### Journey 5: Check Coworker Health
```
1. User navigates to Dashboard
2. User sees health badges on coworker cards
3. User taps health badge
4. CoworkerHealthScreen opens
5. User reviews scores, metrics, trends
6. User views recent issues and improvements
7. User can adjust configuration if needed
```

### Journey 6: Voice Command
```
1. User taps Voice button (floating)
2. Recording starts (mic turns red)
3. User speaks command
4. User taps to stop recording
5. Modal opens with transcript
6. User edits if needed
7. User taps "Send"
8. Command is processed
9. User is navigated to appropriate screen
```

## Responsive Behavior

### Mobile
- Sidebar becomes bottom tab bar
- Top bar simplifies to show current page title
- Modals use full screen
- Tables become lists/cards
- Multi-column layouts become single column

### Tablet
- Sidebar becomes collapsible
- Bottom tab bar on mobile, sidebar on tablet
- 2-column layouts instead of 3-column
- Touch targets remain 44px minimum

### Desktop
- Full sidebar navigation
- 3-column layouts for dashboards
- Hover states on all interactive elements
- Keyboard navigation support

## Global Navigation Rules

1. **Back button**: Always goes to previous screen in stack
2. **Cancel button**: Closes modal or discards changes
3. **Save button**: Persists changes and closes modal
4. **External links**: Open in new tab (web) or in-app browser (mobile)
5. **Deep links**: Navigate directly to specific screens
6. **Error states**: Provide "Retry" and "Go back" options
7. **Empty states**: Provide "Create new" or "Learn more" actions

## Accessibility

- All navigation elements have keyboard shortcuts
- Focus indicators are visible
- Screen reader labels are provided
- Touch targets meet minimum size requirements
- Color contrast meets WCAG AA standards
