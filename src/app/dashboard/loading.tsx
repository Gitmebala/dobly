export default function DashboardLoading() {
  return (
    <div className="workspace-loading" role="status" aria-label="Loading workspace">
      <header>
        <span className="workspace-loading-kicker" />
        <span className="workspace-loading-title" />
        <span className="workspace-loading-copy" />
      </header>
      <section className="workspace-loading-summary">
        <i /><i /><i />
      </section>
      <section className="workspace-loading-body">
        <div className="workspace-loading-list"><i /><i /><i /><i /></div>
        <div className="workspace-loading-rail"><i /><i /></div>
      </section>
      <span className="sr-only">Dobly is preparing your workspace.</span>
    </div>
  );
}
