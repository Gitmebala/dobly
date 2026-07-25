"use client";

import PageTransitionShell from "@/components/PageTransitionShell";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return <PageTransitionShell>{children}</PageTransitionShell>;
}
