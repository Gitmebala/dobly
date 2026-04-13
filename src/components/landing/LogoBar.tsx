const logos = [
  "Google",
  "Shopify",
  "WhatsApp",
  "Meta",
  "Slack",
  "Stripe",
  "Notion",
  "Microsoft",
  "Airtable",
  "Twilio",
  "Zoom",
];

export default function LogoBar() {
  const items = [...logos, ...logos];

  return (
    <section className="relative z-[1] py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-[rgba(255,255,255,0.05)]" />
        <div className="py-8 text-center font-mono text-[12px] uppercase tracking-[0.25em] text-[rgba(255,255,255,0.3)]">
          Works with the tools you already use
        </div>
        <div className="overflow-hidden">
          <div className="marquee-track flex min-w-max items-center gap-10">
            {items.map((logo, index) => (
              <div
                key={`${logo}-${index}`}
                className="font-mono text-[13px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.25)] transition-colors duration-200 hover:text-[rgba(255,255,255,0.6)]"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 h-px bg-[rgba(255,255,255,0.05)]" />
      </div>
    </section>
  );
}
