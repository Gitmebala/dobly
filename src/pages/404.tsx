import Link from "next/link";

export default function LegacyNotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080810",
        color: "#E6E4F8",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "Syne, system-ui, sans-serif",
      }}
    >
      <div>
        <div style={{ color: "#4F46E5", letterSpacing: "0.2em", fontSize: "0.75rem", textTransform: "uppercase" }}>
          404
        </div>
        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", margin: "1rem 0 0.75rem" }}>
          That page is not here.
        </h1>
        <p style={{ maxWidth: "40rem", margin: "0 auto", color: "#6E6C90", lineHeight: 1.7 }}>
          The workflow, connection, or route you asked for could not be found.
        </p>
        <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              padding: "0.85rem 1.4rem",
              borderRadius: "999px",
              background: "#4F46E5",
              color: "#F5F4FF",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            style={{
              padding: "0.85rem 1.4rem",
              borderRadius: "999px",
              border: "1px solid rgba(79,70,229,0.26)",
              color: "#E6E4F8",
              textDecoration: "none",
            }}
          >
            Open landing page
          </Link>
        </div>
      </div>
    </div>
  );
}
