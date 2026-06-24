import "server-only";

import { cookies } from "next/headers";
import { listAccessibleWorkspaces, type WorkspaceRecord } from "@/lib/workspaces";

export const ACTIVE_WORKSPACE_COOKIE = "dobly-active-workspace";

export async function resolveActiveWorkspace(userId: string) {
  const workspaces = await listAccessibleWorkspaces(userId);
  const requestedId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === requestedId) ?? workspaces[0] ?? null;
  return { workspaces, activeWorkspace: activeWorkspace as WorkspaceRecord | null };
}
