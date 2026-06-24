import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://dobly.io";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/admin/", "/api/"] },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
