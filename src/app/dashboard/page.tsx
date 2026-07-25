import DoblyDashboardPage from "./DoblyDashboardPage";

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ justOnboarded?: string }>;
}) {
  return <DoblyDashboardPage searchParams={searchParams} />;
}
