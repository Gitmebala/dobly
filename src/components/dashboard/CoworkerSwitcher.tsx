"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { OperatorWithLoops } from "@/lib/dobly-operators";
import CoworkerRosterPanel from "@/components/dashboard/CoworkerRosterPanel";

// Replaces what used to be a permanent ~240px roster column sitting
// beside every coworker's chat, all the time, whether anyone needed
// to switch coworkers or not - "the biggest mistake," per the
// founder's own architecture note: a coworker's chat is a workspace
// you enter, not a dashboard section with a permanent directory
// bolted to its side. Switching coworkers is occasional; the trigger
// here costs almost nothing when closed (one compact pill), and the
// full roster (status filters, search, hire CTA - unchanged content,
// just relocated) is one click away in a popover instead of always
// on screen.
export default function CoworkerSwitcher({
  operators,
  activeOperator,
}: {
  operators: OperatorWithLoops[];
  activeOperator: OperatorWithLoops | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="coworker-switcher-trigger" aria-label="Switch coworker">
          <span className="coworker-switcher-avatar" data-status={activeOperator?.status ?? "draft"} aria-hidden="true">
            {activeOperator?.name.slice(0, 1).toUpperCase() ?? "+"}
          </span>
          <span className="coworker-switcher-name">{activeOperator?.name ?? "Choose a coworker"}</span>
          <ChevronDown aria-hidden="true" className="coworker-switcher-chevron" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="coworker-switcher-menu" side="bottom" align="start" sideOffset={8}>
          <CoworkerRosterPanel operators={operators} activeOperatorId={activeOperator?.id ?? null} onNavigate={() => setOpen(false)} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
