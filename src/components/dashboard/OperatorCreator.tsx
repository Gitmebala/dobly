"use client";

import OperatorHandleBar from "@/components/dashboard/OperatorHandleBar";

export default function OperatorCreator({ initialPrompt }: { initialPrompt?: string }) {
  return <OperatorHandleBar compact initialPrompt={initialPrompt} />;
}
