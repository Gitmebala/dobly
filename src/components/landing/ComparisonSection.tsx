const rows = [
  ["Setup experience", "Build step by step", "Describe in plain English"],
  ["Mental model required", "Triggers, actions, APIs", "Just the outcome"],
  ["Failure handling", "You debug it", "Plain-English explanation"],
  ["AI involvement", "You configure AI steps", "Built into interpretation"],
  ["Pricing transparency", "Per task, unclear", "Standard vs Intelligence, clear split"],
  ["Learning curve", "Hours to days", "Minutes"],
];

export default function ComparisonSection() {
  return (
    <section id="compare" className="relative z-[1] py-28">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-[760px]">
          <h2 className="font-display text-[48px] font-bold tracking-[-0.04em] text-white">
            Not another workflow builder.
          </h2>
          <p className="mt-4 text-[16px] leading-8 text-[var(--text-secondary)]">
            Dobly is what happens after you get tired of building.
          </p>
        </div>

        <div className="comparison-table mt-12 overflow-hidden rounded-[1.5rem] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
          <div className="grid grid-cols-[1.1fr_0.95fr_0.95fr] bg-[rgba(255,255,255,0.05)] px-6 py-4 font-mono text-[12px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.4)]">
            <div>Feature</div>
            <div>Traditional tools</div>
            <div className="rounded-lg bg-[rgba(0,255,135,0.1)] px-3 py-2 text-[var(--green)]">
              Dobly <span className="ml-1 inline-block h-2 w-2 rounded-full bg-[var(--green)] align-middle" />
            </div>
          </div>
          {rows.map(([feature, oldWay, dobly]) => (
            <div
              key={feature}
              className="grid grid-cols-[1.1fr_0.95fr_0.95fr] border-t border-[rgba(255,255,255,0.04)] px-6 py-5 text-sm"
            >
              <div className="text-white">{feature}</div>
              <div className="text-[rgba(255,255,255,0.3)]">No: {oldWay}</div>
              <div className="font-medium text-[var(--green)]">Yes: {dobly}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
