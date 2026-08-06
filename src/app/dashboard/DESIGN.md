# Dobly design system

This is the actual rulebook, not aspiration. Every dashboard page should be
checked against this before it ships. It exists because the app had no
system at all: every screen independently invented its own boxes, borders,
and spacing, and the result was 37 pages that all looked like a different
product glued together.

## Verdict: what shape is Dobly

Settled via council review (5 independent advisors, see conversation
history for the full transcript): Dobly's unit is **the coworker and its
work record**, not 37 flat destinations. Tasks, connections, memory,
billing, approvals are lenses on a coworker or account-level settings -
they are not peer-level nav items. The shell is closest to **Claude.ai's**:
a collapsible rail, one primary content pane, whitespace doing the
separation instead of borders on every micro-section. Not Obsidian's graph
(no network of static notes to browse - Dobly has ongoing processes, not a
knowledge graph). Not Odoo's app-switcher (Dobly's "modules" aren't
independent products the way Odoo's are).

## The one rule that matters most

**Nothing gets a border or a distinct background by default.** A container
earns a border only when it is a genuinely separate object floating in
space (a modal, a dropdown menu, a toast). Regions within a single page are
separated by whitespace and typography weight, not boxes. A flat
background-color block against the page background reads as a box just as
strongly as a drawn border - watch for that; it is the mistake this system
kept re-making.

Before adding a `border`, `box-shadow`, or a background color to a
container, ask: is this a physically separate surface (like a card in a
deck), or is it a *section of the same page*? Sections get spacing. Cards
get a border. Most things in Dobly are sections.

Maximum nesting: **two levels**. Page → one region. Region → one row/item.
If you need a third level, the content belongs in a drawer or a route, not
another nested container.

## Layout shape

- **Sidebar**: collapsible icon rail (already built - `DoblySidebar.tsx`,
  `data-sidebar-collapsed`). Navigation only, never content.
- **Top bar**: thin breadcrumb + search + account. It orients, it doesn't
  compete with content for weight. No heavy border, no shadow under it -
  a single hairline is enough.
- **Main canvas**: one primary pane per route. Two-pane views (a roster +
  a detail, like Coworkers) get exactly one hairline divider between them,
  nothing else. No outer card wrapping the whole thing.
- **Detail panels** (the coworker chat console, a task, a connection):
  header → content → composer/actions, each separated by a single hairline
  where a real state change occurs, generous padding everywhere else.

## Spacing scale

Use these, not arbitrary values: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64px`.
Page-level padding should be on the generous end (24-52px). Component
internals can use the tighter end. If something feels cramped, the fix is
almost always more padding on the container, not a smaller font.

## Typography scale

`11 · 12 · 13 · 14 · 15 · 16 · 19 · 24 · 32 · 40px`. Nothing below 12px for
real content (11px is for eyebrows/labels only). Display serif
(`--font-display`) for page titles and coworker names; sans (`--font-body`)
for everything else. This system had font sizes down at 8-9px in places -
that reads as broken, not dense.

## Color and surfaces

Warm charcoal/cream/rust palette (`--app-bg`, `--app-paper`, `--app-rust`).
One accent (rust). Borders, when used, are `var(--app-line)` - a hairline,
not a stroke. Reserve `var(--app-paper-2)` / distinct background tints for
things that are genuinely elevated above the page (a dropdown, a popover),
not for routine page sections.

## Component rules

- **Cards** (`.ref-card` / `.card`): only for things that are actually
  discrete objects in a list or grid (a connection, a report). Never wrap
  an entire page or a whole panel in one.
- **Buttons**: flat by default, hover/active via background tint, not new
  borders appearing on hover.
- **Composer/input areas**: one visible input, secondary fields (notes,
  attachments) collapsed behind a small toggle until needed - don't show
  every possible field at once.
- **Alerts / approval-needed items**: these are the exception that DOES
  get a border + tint, because it's communicating real elevation (this
  needs your decision). Don't dilute that signal by giving routine content
  the same treatment.

## Known debt (not yet fixed everywhere)

`reference-app.css` has had the same selectors redefined 2-3 times across
different editing passes (search any `.coworker-console-*` class name for
an example). When touching a page, check for duplicate blocks before
adding a new one - the cascade order between them is not obvious and is
exactly how the double-border bug happened. Consolidate into one block
when you find it, don't add a fourth.

Applied so far: the Coworkers page + coworker chat console (roster,
header, shift-tape controls, composer). The rest of the 37 dashboard
routes have not been individually audited against this system yet - that
is real, sizeable work still ahead, not a one-pass fix.
