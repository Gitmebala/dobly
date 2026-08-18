import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  CircleHelp,
  Compass,
  FilePlus2,
  Files,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  Home,
  Inbox,
  LayoutGrid,
  Link2,
  ListPlus,
  ListTodo,
  Network,
  RadioTower,
  Settings,
  Sparkles,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react";
import type { ComponentType } from "react";

export type WorkspaceSearchItem = {
  id: string;
  label: string;
  description: string;
  category: "Go to" | "Create" | "Workspace";
  href: string;
  keywords: string;
  icon: ComponentType<{ className?: string }>;
};

export const WORKSPACE_SEARCH_INDEX: WorkspaceSearchItem[] = [
  { id: "home", label: "Home", description: "Workspace overview", category: "Go to", href: "/dashboard", keywords: "home overview today", icon: Home },
  { id: "tasks", label: "Tasks", description: "Shared work queue", category: "Go to", href: "/dashboard/tasks", keywords: "work tasks queue todo", icon: ListTodo },
  { id: "inbox", label: "Inbox", description: "Captured requests and messages", category: "Go to", href: "/dashboard/inbox", keywords: "inbox capture messages requests", icon: Inbox },
  { id: "notifications", label: "Notifications", description: "Updates that need your attention", category: "Go to", href: "/dashboard/notifications", keywords: "notifications alerts updates", icon: Activity },
  { id: "projects", label: "Projects", description: "Outcomes grouped into projects", category: "Go to", href: "/dashboard/projects", keywords: "projects outcomes work", icon: FolderKanban },
  { id: "documents", label: "Documents", description: "Files and generated work", category: "Go to", href: "/dashboard/documents", keywords: "documents files artifacts docs", icon: Files },
  { id: "activity", label: "Activity", description: "Workspace work history", category: "Go to", href: "/dashboard/activity", keywords: "activity history events runs", icon: Activity },
  { id: "coworkers", label: "Coworkers", description: "Your AI team and chats", category: "Go to", href: "/dashboard/coworkers", keywords: "coworkers operators agents chat team", icon: Bot },
  { id: "departments", label: "Departments", description: "Coworkers organized by function", category: "Go to", href: "/dashboard/departments", keywords: "departments rooms teams", icon: Building2 },
  { id: "approvals", label: "Approvals", description: "Actions waiting for review", category: "Go to", href: "/dashboard/approvals", keywords: "approvals review risk waiting", icon: CheckCircle2 },
  { id: "memory", label: "Memory", description: "Facts and rules Dobly remembers", category: "Go to", href: "/dashboard/memory", keywords: "memory facts rules policies knowledge", icon: BookOpenText },
  { id: "briefings", label: "Briefings", description: "Updates prepared by Dobly", category: "Go to", href: "/dashboard/briefings", keywords: "briefings updates summaries", icon: RadioTower },
  { id: "analytics", label: "Analytics", description: "Performance and trends", category: "Go to", href: "/dashboard/analytics", keywords: "analytics metrics performance trends", icon: BarChart3 },
  { id: "reports", label: "Reports", description: "Saved business reports", category: "Go to", href: "/dashboard/reports", keywords: "reports sheets analysis", icon: BarChart3 },
  { id: "workflows", label: "Loops", description: "Recurring work your coworkers run", category: "Go to", href: "/dashboard/workflows", keywords: "workflows loops systems runs recurring", icon: Workflow },
  { id: "groups", label: "Groups", description: "Rooms where coworkers talk to each other", category: "Go to", href: "/dashboard/groups", keywords: "groups rooms delegation multi-agent chat together", icon: Users },
  { id: "skills", label: "Skills", description: "Procedures your coworkers have learned", category: "Go to", href: "/dashboard/skills", keywords: "skills learned procedures teach browser computer", icon: GraduationCap },
  { id: "connections", label: "Connections", description: "Services coworkers can use", category: "Go to", href: "/dashboard/connections", keywords: "connections integrations apps services", icon: Link2 },
  { id: "custom-connections", label: "Custom connections", description: "Private APIs and MCP tools", category: "Go to", href: "/dashboard/connections/custom", keywords: "connections custom api mcp tools", icon: Link2 },
  { id: "channels", label: "Channels", description: "Phone, WhatsApp, and web", category: "Go to", href: "/dashboard/channels", keywords: "channels phone whatsapp web reception", icon: RadioTower },
  { id: "business", label: "Business context", description: "Company details and operating context", category: "Go to", href: "/dashboard/business", keywords: "business profile context company", icon: Building2 },
  { id: "onboarding", label: "Onboarding", description: "Complete your workspace foundation", category: "Go to", href: "/dashboard/onboarding", keywords: "onboarding setup start readiness providers launch", icon: Compass },
  { id: "health", label: "Workspace health", description: "Runtime and connection health", category: "Go to", href: "/dashboard/health", keywords: "health status runtime providers", icon: HeartPulse },
  { id: "usage", label: "Usage", description: "Workspace activity usage", category: "Go to", href: "/dashboard/usage", keywords: "usage limits activity", icon: Activity },
  { id: "billing", label: "Billing", description: "Plan and operating capacity", category: "Go to", href: "/dashboard/billing", keywords: "billing plan payments mpesa capacity", icon: WalletCards },
  { id: "settings", label: "Settings", description: "Profile, security, and preferences", category: "Go to", href: "/dashboard/settings", keywords: "settings profile security preferences", icon: Settings },
  { id: "help", label: "Help and support", description: "Get help with Dobly", category: "Go to", href: "/dashboard/help", keywords: "help support contact", icon: CircleHelp },
  { id: "create-work", label: "Create with Dobly", description: "Start from an outcome or request", category: "Go to", href: "/dashboard/create", keywords: "create build request prompt", icon: Sparkles },
  { id: "generate", label: "Generate", description: "Create a document or business artifact", category: "Go to", href: "/dashboard/generate", keywords: "generate document artifact content", icon: FilePlus2 },
  { id: "create-coworker", label: "Create coworker", description: "Build a specialist for a role", category: "Create", href: "/dashboard/coworkers?create=true", keywords: "new create coworker operator agent", icon: Bot },
  { id: "create-task", label: "Create task", description: "Add work to the queue", category: "Create", href: "/dashboard/tasks?create=true", keywords: "new create task todo", icon: ListPlus },
  { id: "create-document", label: "Create document", description: "Draft a new business artifact", category: "Create", href: "/dashboard/generate", keywords: "new create document generate", icon: FilePlus2 },
  { id: "add-connection", label: "Add connection", description: "Connect another service", category: "Create", href: "/dashboard/connections", keywords: "new add connect integration", icon: Link2 },
  { id: "create-loop", label: "Create a loop", description: "Set up recurring or event-triggered work", category: "Create", href: "/dashboard/workflows?create=true", keywords: "new create loop routine trigger webhook automation schedule event", icon: Workflow },
  { id: "create-group", label: "Create a group", description: "Put coworkers in a room together", category: "Create", href: "/dashboard/groups?create=true", keywords: "new create group room delegation multi-agent together", icon: Users },
  { id: "teach-skill", label: "Teach a skill", description: "Show Dobly how to do something", category: "Create", href: "/dashboard/skills/new", keywords: "new teach skill learn browser computer procedure", icon: GraduationCap },
];
