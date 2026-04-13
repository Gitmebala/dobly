import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const footerColumns = [
  {
    title: "Explore",
    links: [
      { href: "#command", label: "Command Surface" },
      { href: "#motion-map", label: "Automation Map" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Product",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/generate", label: "Generate" },
      { href: "/dashboard/settings", label: "Settings" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/cookies", label: "Cookies" },
      { href: "/security", label: "Security" },
      { href: "/subprocessors", label: "Subprocessors" },
    ],
  },
  {
    title: "Contact",
    links: [
      { href: "mailto:hello@dobly.io", label: "hello@dobly.io" },
      { href: "https://x.com/doblyhq", label: "X / doblyhq" },
      { href: "https://dobly.io", label: "dobly.io" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="pb-14 pt-8">
      <div className="container-main">
        <div className="clay-panel overflow-hidden px-6 py-8 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-xl" />
              <p className="mt-5 max-w-xl text-base leading-7 text-text-muted">
                Dobly turns repeat work into something you can direct, trust, and refine.
                Built for people who want systems that keep moving without constant manual work.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-4">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <div className="text-xs uppercase tracking-[0.24em] text-text-dim">
                    {column.title}
                  </div>
                  <div className="mt-4 space-y-3">
                    {column.links.map((link) =>
                      link.href.startsWith("/") || link.href.startsWith("#") ? (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block text-sm text-text-muted transition-colors hover:text-text"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-text-muted transition-colors hover:text-text"
                        >
                          {link.label}
                        </a>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-5 text-sm text-text-dim">
            © {new Date().getFullYear()} Dobly. What needs to happen, happens.
          </div>
        </div>
      </div>
    </footer>
  );
}
