import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://dobly.io";
  return ["", "/pricing", "/security", "/privacy", "/terms"].map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency: path ? "monthly" as const : "weekly" as const,
    priority: path ? 0.7 : 1,
  }));
}
