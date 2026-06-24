"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowUpRight,
  Bot,
  FilePlus2,
  Link2,
  ListPlus,
  Plus,
  Sparkles,
} from "lucide-react";

const createActions = [
  {
    label: "Coworker",
    detail: "Build a specialist for a role",
    href: "/dashboard/coworkers?create=true",
    icon: Bot,
    tone: "coral",
  },
  {
    label: "Task",
    detail: "Add work to the shared queue",
    href: "/dashboard/tasks?create=true",
    icon: ListPlus,
    tone: "sage",
  },
  {
    label: "Document",
    detail: "Draft a useful business artifact",
    href: "/dashboard/generate",
    icon: FilePlus2,
    tone: "blue",
  },
  {
    label: "Connection",
    detail: "Give coworkers another service",
    href: "/dashboard/connections",
    icon: Link2,
    tone: "gold",
  },
] as const;

export function WorkspaceCreateMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="workspace-create-button" aria-label="Create new">
          <Plus />
          <span>Create</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="workspace-create-menu" side="bottom" align="end" sideOffset={10}>
          <div className="workspace-create-heading">
            <span><Sparkles /> Start something</span>
            <small>New work in Dobly</small>
          </div>
          <div className="workspace-create-actions">
            {createActions.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenu.Item asChild key={action.href}>
                  <Link href={action.href} data-tone={action.tone}>
                    <i><Icon /></i>
                    <span>
                      <strong>{action.label}</strong>
                      <small>{action.detail}</small>
                    </span>
                    <ArrowUpRight />
                  </Link>
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
